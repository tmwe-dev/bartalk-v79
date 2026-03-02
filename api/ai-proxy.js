// Vercel Serverless Function: AI Proxy for BarTalk v7.9
// Proxies requests to Anthropic, OpenAI, Gemini, and Groq APIs
// Node 20 required for native fetch

// --- SECURITY: Allowed origins ---
const ALLOWED_ORIGINS = [
  /^https:\/\/bartalk-v79.*\.vercel\.app$/,
  /^https:\/\/bartalk.*\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/
];

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || req.headers?.referer || '';
  const clean = origin.replace(/\/$/, '');
  for (const pat of ALLOWED_ORIGINS) {
    if (pat.test(clean)) return clean;
  }
  return null;
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-BT-Session');

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
      version: '7.9.2',
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
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 requests/min.' });
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
        const geminiContents = [];
        for (const m of (messages || [])) {
          if (m.role === 'system') continue;
          geminiContents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content || '') }]
          });
        }
        if (geminiContents.length === 0) geminiContents.push({ role: 'user', parts: [{ text: 'Ciao' }] });
        if (geminiContents[0].role !== 'user') geminiContents.unshift({ role: 'user', parts: [{ text: 'Ciao' }] });

        // Merge consecutive same-role
        const mergedGemini = [];
        for (const msg of geminiContents) {
          if (mergedGemini.length > 0 && mergedGemini[mergedGemini.length - 1].role === msg.role) {
            mergedGemini[mergedGemini.length - 1].parts[0].text += '\n' + msg.parts[0].text;
          } else {
            mergedGemini.push(JSON.parse(JSON.stringify(msg)));
          }
        }

        const geminiModel = model || 'gemini-2.0-flash';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            contents: mergedGemini,
            generationConfig: {
              maxOutputTokens: maxTokens || 2048,
              temperature: temperature != null ? temperature : 0.7
            }
          })
        });

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          console.error('[ai-proxy] Gemini error:', geminiRes.status, errText.substring(0, 200));
          return res.status(mapUpstreamStatus(geminiRes.status)).json({
            error: `Gemini ${geminiRes.status}`,
            detail: errText.substring(0, 300),
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
