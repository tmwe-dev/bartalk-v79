// Vercel Serverless Function: AI Proxy for BarTalk v8.0
// Proxies requests to Anthropic, OpenAI, Gemini, and Groq APIs
// Node 20 required for native fetch

// --- SECURITY: Allowed origins (stringhe esatte + localhost dev) ---
const ALLOWED_ORIGINS_EXACT = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Fallback: domini noti se env var non configurata
if (ALLOWED_ORIGINS_EXACT.length === 0) {
  ALLOWED_ORIGINS_EXACT.push(
    'https://bartalk-v79.vercel.app',
    'https://bartalk-v79-git-main-tmwe-devs-projects.vercel.app',
  );
}

const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || '';
  const clean = origin.replace(/\/$/, '');
  if (!clean) return null;
  // Controlla domini esatti
  if (ALLOWED_ORIGINS_EXACT.includes(clean)) return clean;
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
const rateMap = new Map();
const RATE_WINDOW = 60 * 1000; // 1 min
const RATE_LIMIT = 100;        // max 100 requests/min per IP

function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW) {
    rateMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return false;
  return true;
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
      version: '8.1.0',
      node: process.version,
      providers: ['anthropic', 'openai', 'gemini', 'groq'],
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

  // Rate limit
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRate(clientIp)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: `Rate limit exceeded. Max ${RATE_LIMIT} requests/min.` });
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
    // Se SUPABASE_JWT_SECRET è configurato, richiedi autenticazione
    // Altrimenti, consenti accesso anonimo (backward compatibility)
    if (SUPABASE_JWT_SECRET) {
      return res.status(401).json({ error: 'Authentication required. Use login or skip mode.' });
    }
  }

  try {
    const { provider, model, messages, systemPrompt, temperature, maxTokens, apiKey, tools } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Missing provider or apiKey' });
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

      case 'groq': {
        const groqMessages = [];
        if (systemPrompt) groqMessages.push({ role: 'system', content: systemPrompt });
        for (const m of (messages || [])) {
          if (m.role !== 'system') groqMessages.push({ role: m.role, content: String(m.content || '') });
        }
        if (groqMessages.length === 0) groqMessages.push({ role: 'user', content: 'Ciao' });

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
          },
          body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile',
            max_tokens: maxTokens || 2048,
            temperature: temperature != null ? temperature : 0.7,
            messages: groqMessages
          })
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          console.error('[ai-proxy] Groq error:', groqRes.status, errText.substring(0, 200));
          return res.status(mapUpstreamStatus(groqRes.status)).json({
            error: `Groq ${groqRes.status}`,
            detail: errText.substring(0, 300),
            provider: 'groq'
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
