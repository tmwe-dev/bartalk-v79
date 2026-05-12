// Vercel Serverless Function: AI Proxy for BarTalk v8.0
// Proxies requests to Anthropic, OpenAI, Gemini, and Groq APIs
// Node 20 required for native fetch

import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'node:crypto';

// --- Server-side key decryption ---
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function decryptAPIKey(ciphertext) {
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length < 64) return null;
  try {
    const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return decipher.update(Buffer.from(encryptedHex, 'hex')) + decipher.final('utf8');
  } catch (e) {
    console.error('[ai-proxy] Decrypt error:', e.message);
    return null;
  }
}

/** Recupera la chiave API dal vault DB per un utente autenticato */
async function getKeyFromVault(userId, provider) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    // Trova workspace dell'utente
    const { data: ws } = await sb.from('workspaces')
      .select('id').eq('user_id', userId)
      .order('created_at', { ascending: true }).limit(1).single();
    if (!ws) return null;
    // Trova chiave per provider
    const { data: keyRow } = await sb.from('api_keys_vault')
      .select('encrypted_key, model')
      .eq('workspace_id', ws.id).eq('provider', provider).single();
    if (!keyRow) return null;
    const decrypted = decryptAPIKey(keyRow.encrypted_key);
    return decrypted ? { apiKey: decrypted, model: keyRow.model } : null;
  } catch (e) {
    console.warn('[ai-proxy] Vault lookup error:', e.message);
    return null;
  }
}

// --- SECURITY: Allowed origins (stringhe esatte + localhost dev) ---
const ALLOWED_ORIGINS_EXACT = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Fallback: domini noti se env var non configurata
if (ALLOWED_ORIGINS_EXACT.length === 0) {
  ALLOWED_ORIGINS_EXACT.push(
    'https://bartalk-v79-tmweapps-projects.vercel.app',
    'https://bartalk-v79-git-main-tmweapps-projects.vercel.app',
  );
}

const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
// Pattern per preview deploys di Vercel (bartalk-v79-*-tmweapps-projects.vercel.app)
const VERCEL_PREVIEW_PATTERN = /^https:\/\/bartalk-v79-[a-z0-9-]+-tmweapps-projects\.vercel\.app$/;

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || '';
  const clean = origin.replace(/\/$/, '');
  if (!clean) return null;
  // Controlla domini esatti
  if (ALLOWED_ORIGINS_EXACT.includes(clean)) return clean;
  // Controlla preview deploys Vercel
  if (VERCEL_PREVIEW_PATTERN.test(clean)) return clean;
  // Controlla localhost (solo sviluppo)
  if (LOCALHOST_PATTERN.test(clean)) return clean;
  return null;
}

// --- SECURITY: Body size limit (256KB max) ---
const MAX_BODY_SIZE = 256 * 1024;

// --- SECURITY: JWT verification per Supabase auth ---
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

function verifyJWT(token) {
  // Verifica base64url JWT senza libreria esterna (HS256)
  // Per produzione: usare jose o jsonwebtoken
  if (!SUPABASE_JWT_SECRET || !token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    // Controlla scadenza
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload.sub || null; // user ID
  } catch {
    return null;
  }
}

// --- SECURITY: Rate limiting (in-memory, per Vercel instance) ---
// Doppio livello: globale per IP + specifico per provider
const rateMap = new Map();
const RATE_WINDOW = 60 * 1000; // 1 min
const RATE_LIMIT = 60;         // max 60 requests/min per IP (abbassato da 100)
const RATE_LIMIT_PER_PROVIDER = 20; // max 20 req/min per IP per singolo provider
const RATE_BURST_LIMIT = 10;   // max 10 request in 5 secondi (anti-burst)
const BURST_WINDOW = 5 * 1000;

// Cleanup automatico per evitare memory leak su cold-start lunghi
let lastCleanup = Date.now();
function cleanupRateMap() {
  const now = Date.now();
  if (now - lastCleanup < RATE_WINDOW * 2) return;
  lastCleanup = now;
  for (const [key, entry] of rateMap) {
    if (now - entry.windowStart > RATE_WINDOW * 2) rateMap.delete(key);
  }
}

function checkRate(ip, provider) {
  cleanupRateMap();
  const now = Date.now();

  // 1. Rate limit globale per IP
  const globalKey = `ip:${ip}`;
  const globalEntry = rateMap.get(globalKey);
  if (!globalEntry || now - globalEntry.windowStart > RATE_WINDOW) {
    rateMap.set(globalKey, { windowStart: now, count: 1 });
  } else {
    globalEntry.count++;
    if (globalEntry.count > RATE_LIMIT) return { ok: false, reason: 'ip_limit' };
  }

  // 2. Rate limit per IP+provider
  if (provider) {
    const providerKey = `ip:${ip}:${provider}`;
    const provEntry = rateMap.get(providerKey);
    if (!provEntry || now - provEntry.windowStart > RATE_WINDOW) {
      rateMap.set(providerKey, { windowStart: now, count: 1 });
    } else {
      provEntry.count++;
      if (provEntry.count > RATE_LIMIT_PER_PROVIDER) return { ok: false, reason: 'provider_limit' };
    }
  }

  // 3. Burst protection (anti-spam rapido)
  const burstKey = `burst:${ip}`;
  const burstEntry = rateMap.get(burstKey);
  if (!burstEntry || now - burstEntry.windowStart > BURST_WINDOW) {
    rateMap.set(burstKey, { windowStart: now, count: 1 });
  } else {
    burstEntry.count++;
    if (burstEntry.count > RATE_BURST_LIMIT) return { ok: false, reason: 'burst_limit' };
  }

  return { ok: true };
}

// --- Upstream error → proper HTTP status mapping ---
function mapUpstreamStatus(upstreamStatus) {
  if (upstreamStatus === 401 || upstreamStatus === 403) return 401;
  if (upstreamStatus === 429) return 429;
  if (upstreamStatus >= 500) return 502;
  if (upstreamStatus >= 400) return 400;
  return 502;
}

export default async function handler(req, res) {
  // CORS: only allowed origins
  const origin = getAllowedOrigin(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-BT-Session, X-BT-Skip-Auth');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      version: '8.2.5',
      node: process.version,
      providers: ['anthropic', 'openai', 'gemini', 'groq', 'xai'],
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS block for POST
  if (!origin) {
    console.warn('[ai-proxy] CORS blocked:', req.headers?.origin || 'no origin');
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Rate limit (pre-validation, senza provider)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  // Per-user rate limit (authenticated users: stricter, by userId instead of IP)
  if (userId) {
    const userRate = checkRate(`user:${userId}`, null);
    if (!userRate.ok) {
      return res.status(429).json({ error: 'Rate limit exceeded (user)', retryAfter: 60 });
    }
  }

  // --- Body size check ---
  const bodySize = JSON.stringify(req.body || {}).length;
  if (bodySize > MAX_BODY_SIZE) {
    return res.status(413).json({ error: `Request body too large (${Math.round(bodySize/1024)}KB). Max ${MAX_BODY_SIZE/1024}KB.` });
  }

  // --- Auth check: JWT token o skip mode ---
  const authHeader = req.headers.authorization || '';
  const skipAuth = req.headers['x-bt-skip-auth'] === 'true';
  let userId = null;

  if (authHeader.startsWith('Bearer ')) {
    userId = verifyJWT(authHeader.slice(7));
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired auth token' });
    }
  } else if (!skipAuth) {
    if (SUPABASE_JWT_SECRET) {
      return res.status(401).json({ error: 'Authentication required. Use login or skip mode.' });
    }
  }

  try {
    const { provider, model: requestModel, messages, systemPrompt, temperature, maxTokens, apiKey: clientApiKey, tools } = req.body;

    // ── INPUT VALIDATION ──────────────────────────────────────────────

    // Provider: deve essere uno dei 4 supportati
    const VALID_PROVIDERS = ['openai', 'anthropic', 'gemini', 'groq', 'xai'];
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
      });
    }

    // Rate limit (con provider per granularità)
    const rateCheck = checkRate(clientIp, provider);
    if (!rateCheck.ok) {
      const retryAfter = rateCheck.reason === 'burst_limit' ? '5' : '60';
      res.setHeader('Retry-After', retryAfter);
      const messages_map = {
        ip_limit: `Rate limit exceeded. Max ${RATE_LIMIT} requests/min.`,
        provider_limit: `Too many requests to ${provider}. Max ${RATE_LIMIT_PER_PROVIDER}/min per provider.`,
        burst_limit: 'Too many requests in a short time. Please wait a few seconds.',
      };
      return res.status(429).json({ error: messages_map[rateCheck.reason] || 'Rate limit exceeded.' });
    }

    // Messages: deve essere un array non vuoto
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages must be a non-empty array.' });
    }

    // Messages: max 100 messaggi per richiesta
    if (messages.length > 100) {
      return res.status(400).json({ error: `Too many messages (${messages.length}). Max 100 per request.` });
    }

    // Messages: valida struttura di ogni messaggio
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || typeof msg !== 'object') {
        return res.status(400).json({ error: `Invalid message at index ${i}: must be an object.` });
      }
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        return res.status(400).json({ error: `Invalid role at index ${i}: must be user, assistant, or system.` });
      }
      if (typeof msg.content !== 'string') {
        return res.status(400).json({ error: `Invalid content at index ${i}: must be a string.` });
      }
      // Singolo messaggio max 32KB (previene abuse con payload enormi)
      if (msg.content.length > 32768) {
        return res.status(400).json({ error: `Message at index ${i} too long (${Math.round(msg.content.length/1024)}KB). Max 32KB per message.` });
      }
    }

    // Temperature: deve essere tra 0 e 2
    if (temperature !== undefined && temperature !== null) {
      const temp = Number(temperature);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        return res.status(400).json({ error: 'Temperature must be between 0 and 2.' });
      }
    }

    // MaxTokens: deve essere tra 1 e 16384
    if (maxTokens !== undefined && maxTokens !== null) {
      const mt = Number(maxTokens);
      if (isNaN(mt) || mt < 1 || mt > 16384) {
        return res.status(400).json({ error: 'maxTokens must be between 1 and 16384.' });
      }
    }

    // Model: se specificato, deve essere una stringa ragionevole
    if (requestModel && (typeof requestModel !== 'string' || requestModel.length > 100)) {
      return res.status(400).json({ error: 'Invalid model name.' });
    }

    // SystemPrompt: max 16KB
    if (systemPrompt && (typeof systemPrompt !== 'string' || systemPrompt.length > 16384)) {
      return res.status(400).json({ error: 'System prompt too long. Max 16KB.' });
    }

    // ── Risolvi API key: vault DB → client → server-side env fallback ──
    let apiKey = clientApiKey;
    let model = requestModel;

    if (userId && !clientApiKey) {
      // Utente autenticato senza chiave nel body → cerca nel vault
      const vaultEntry = await getKeyFromVault(userId, provider);
      if (vaultEntry) {
        apiKey = vaultEntry.apiKey;
        if (!model && vaultEntry.model) model = vaultEntry.model;
      }
    }

    // Fallback: chiavi server-side da Vercel Environment Variables
    if (!apiKey) {
      const SERVER_KEYS = {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        gemini: process.env.GOOGLE_API_KEY,
        groq: process.env.GROQ_API_KEY,
        xai: process.env.XAI_API_KEY,
      };
      apiKey = SERVER_KEYS[provider];
      if (apiKey) {
        console.log(`[ai-proxy] Using server-side key for ${provider}`);
      }
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'Missing apiKey. Save your key in Settings or provide it in the request.' });
    }

    // Validate API key format (basic sanity check)
    if (typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 256) {
      return res.status(400).json({ error: 'Invalid API key format' });
    }

    const startTime = Date.now();
    let result;

    switch (provider) {
      case 'anthropic': {
        const anthropicMessages = (messages || [])
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }));

        // Merge consecutive same-role messages
        const merged = [];
        for (const msg of anthropicMessages) {
          if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
            merged[merged.length - 1].content += '\n' + msg.content;
          } else {
            merged.push({ ...msg });
          }
        }
        if (merged.length === 0 || merged[0].role !== 'user') {
          merged.unshift({ role: 'user', content: 'Ciao' });
        }

        const body = {
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: maxTokens || 2048,
          temperature: temperature != null ? temperature : 0.7,
          messages: merged,
          system: systemPrompt || 'Sei un assistente AI.'
        };
        if (tools && tools.length > 0) body.tools = tools;

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body)
        });

        if (!anthropicRes.ok) {
          const errText = await anthropicRes.text();
          console.error('[ai-proxy] Anthropic error:', anthropicRes.status, errText.substring(0, 200));
          return res.status(mapUpstreamStatus(anthropicRes.status)).json({
            error: `Anthropic ${anthropicRes.status}`,
            detail: errText.substring(0, 300),
            provider: 'anthropic'
          });
        }

        const anthropicData = await anthropicRes.json();
        const textBlocks = (anthropicData.content || []).filter(b => b.type === 'text');
        const toolBlocks = (anthropicData.content || []).filter(b => b.type === 'tool_use');

        result = {
          content: textBlocks.map(b => b.text).join('\n'),
          tokensIn: anthropicData.usage?.input_tokens || 0,
          tokensOut: anthropicData.usage?.output_tokens || 0,
          duration: Date.now() - startTime,
          stopReason: anthropicData.stop_reason,
          toolUseBlocks: toolBlocks.length > 0 ? toolBlocks : undefined
        };
        break;
      }

      case 'openai': {
        const openaiMessages = [];
        if (systemPrompt) openaiMessages.push({ role: 'system', content: systemPrompt });
        for (const m of (messages || [])) {
          if (m.role !== 'system') openaiMessages.push({ role: m.role, content: String(m.content || '') });
        }
        if (openaiMessages.length === 0) openaiMessages.push({ role: 'user', content: 'Ciao' });

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
          },
          body: JSON.stringify({
            model: model || 'gpt-4o',
            max_tokens: maxTokens || 2048,
            temperature: temperature != null ? temperature : 0.7,
            messages: openaiMessages
          })
        });

        if (!openaiRes.ok) {
          const errText = await openaiRes.text();
          console.error('[ai-proxy] OpenAI error:', openaiRes.status, errText.substring(0, 200));
          return res.status(mapUpstreamStatus(openaiRes.status)).json({
            error: `OpenAI ${openaiRes.status}`,
            detail: errText.substring(0, 300),
            provider: 'openai'
          });
        }

        const openaiData = await openaiRes.json();
        result = {
          content: openaiData.choices?.[0]?.message?.content || '',
          tokensIn: openaiData.usage?.prompt_tokens || 0,
          tokensOut: openaiData.usage?.completion_tokens || 0,
          duration: Date.now() - startTime
        };
        break;
      }

      case 'gemini': {
        // Build contents array: filter empty, ensure non-empty parts
        const geminiContents = [];
        for (const m of (messages || [])) {
          if (m.role === 'system') continue;
          const text = String(m.content || '').trim();
          if (!text) continue; // Skip empty messages (Gemini rejects empty parts)
          geminiContents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text }]
          });
        }
        // Ensure at least one user message
        if (geminiContents.length === 0) {
          geminiContents.push({ role: 'user', parts: [{ text: 'Ciao' }] });
        }
        // Gemini requires first message to be user
        if (geminiContents[0].role !== 'user') {
          geminiContents.unshift({ role: 'user', parts: [{ text: '.' }] });
        }

        // Merge consecutive same-role (Gemini requires strict alternation)
        const mergedGemini = [];
        for (const msg of geminiContents) {
          if (mergedGemini.length > 0 && mergedGemini[mergedGemini.length - 1].role === msg.role) {
            mergedGemini[mergedGemini.length - 1].parts[0].text += '\n' + msg.parts[0].text;
          } else {
            mergedGemini.push(JSON.parse(JSON.stringify(msg)));
          }
        }

        // Ensure strict user/model alternation (fill gaps with placeholder)
        const alternated = [];
        for (let i = 0; i < mergedGemini.length; i++) {
          const expected = i % 2 === 0 ? 'user' : 'model';
          if (mergedGemini[i].role !== expected) {
            alternated.push({ role: expected, parts: [{ text: '...' }] });
          }
          alternated.push(mergedGemini[i]);
        }

        const geminiModel = model || 'gemini-2.0-flash';

        // Try v1beta first, fallback to v1 on 400
        let geminiRes;
        let geminiUrl;
        for (const apiVersion of ['v1beta', 'v1']) {
          geminiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${geminiModel}:generateContent?key=${apiKey}`;

          const body = {
            contents: alternated,
            generationConfig: {
              maxOutputTokens: maxTokens || 2048,
              temperature: temperature != null ? temperature : 0.7
            }
          };
          // Add system instruction only if present (some Gemini versions don't support it)
          if (systemPrompt) {
            body.system_instruction = { parts: [{ text: systemPrompt }] };
          }

          geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          if (geminiRes.ok || geminiRes.status !== 400) break;

          // If 400 on v1beta, try v1 (might be an API version issue)
          console.warn(`[ai-proxy] Gemini ${apiVersion} returned 400, trying next version...`);

          // If system_instruction caused the 400, retry without it
          if (apiVersion === 'v1beta' && systemPrompt) {
            const bodyNoSys = { ...body };
            delete bodyNoSys.system_instruction;
            // Prepend system prompt as first user message instead
            const sysAsUser = [
              { role: 'user', parts: [{ text: `[Istruzioni di sistema]\n${systemPrompt}` }] },
              { role: 'model', parts: [{ text: 'Ricevuto. Seguo le istruzioni.' }] },
              ...alternated
            ];
            bodyNoSys.contents = sysAsUser;

            geminiRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyNoSys)
            });

            if (geminiRes.ok) {
              console.log('[ai-proxy] Gemini: system_instruction fallback worked');
              break;
            }
          }
        }

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          let detail = errText.substring(0, 500);
          try {
            const errJson = JSON.parse(errText);
            detail = errJson.error?.message || errJson.error?.status || detail;
          } catch {}
          console.error('[ai-proxy] Gemini error:', geminiRes.status, detail);
          return res.status(mapUpstreamStatus(geminiRes.status)).json({
            error: `Gemini ${geminiRes.status}: ${detail.substring(0, 150)}`,
            detail: detail,
            provider: 'gemini'
          });
        }

        const geminiData = await geminiRes.json();
        let geminiText = '';
        if (geminiData.candidates?.[0]?.content) {
          geminiText = geminiData.candidates[0].content.parts.map(p => p.text).join('');
        }
        result = {
          content: geminiText,
          tokensIn: geminiData.usageMetadata?.promptTokenCount || 0,
          tokensOut: geminiData.usageMetadata?.candidatesTokenCount || 0,
          duration: Date.now() - startTime,
          groundingMetadata: geminiData.candidates?.[0]?.groundingMetadata || undefined
        };
        break;
      }

      case 'groq':
      case 'xai': {
        // Groq e xAI usano entrambi il formato OpenAI-compatible
        const groqMessages = [];
        if (systemPrompt) groqMessages.push({ role: 'system', content: systemPrompt });
        for (const m of (messages || [])) {
          if (m.role !== 'system') groqMessages.push({ role: m.role, content: String(m.content || '') });
        }
        if (groqMessages.length === 0) groqMessages.push({ role: 'user', content: 'Ciao' });

        const isXAI = provider === 'xai';
        const apiBaseUrl = isXAI
          ? 'https://api.x.ai/v1/chat/completions'
          : 'https://api.groq.com/openai/v1/chat/completions';
        const defaultModel = isXAI ? 'grok-3-mini' : 'llama-3.3-70b-versatile';

        const groqRes = await fetch(apiBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
          },
          body: JSON.stringify({
            model: model || defaultModel,
            max_tokens: maxTokens || 2048,
            temperature: temperature != null ? temperature : 0.7,
            messages: groqMessages
          })
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          const providerName = isXAI ? 'xAI' : 'Groq';
          console.error(`[ai-proxy] ${providerName} error:`, groqRes.status, errText.substring(0, 200));
          return res.status(mapUpstreamStatus(groqRes.status)).json({
            error: `${providerName} ${groqRes.status}`,
            detail: errText.substring(0, 300),
            provider
          });
        }

        const groqData = await groqRes.json();
        result = {
          content: groqData.choices?.[0]?.message?.content || '',
          tokensIn: groqData.usage?.prompt_tokens || 0,
          tokensOut: groqData.usage?.completion_tokens || 0,
          duration: Date.now() - startTime
        };
        break;
      }

      default:
        return res.status(400).json({ error: 'Unknown provider: ' + provider });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[ai-proxy] Fatal error:', error.message);
    return res.status(500).json({
      error: 'Internal proxy error',
      detail: error.message
    });
  }
};
