/**
 * BarTalk v8.2.5 — TTS Proxy (ElevenLabs)
 * POST /api/tts-proxy — proxy text-to-speech requests to ElevenLabs API
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

function extractToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Require auth (any valid Bearer token)
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'TTS service not configured' });
  }

  try {
    const {
      text,
      voice_id = '21m00Tcm4TlvDq8ikWAM',
      model_id = 'eleven_multilingual_v2',
      voice_settings,
    } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid text field' });
    }

    const response = await fetch(
      `${ELEVENLABS_BASE}/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings: voice_settings || {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[tts-proxy] ElevenLabs error:', response.status, errText);
      return res.status(response.status).json({ error: 'TTS provider error' });
    }

    // Stream audio back
    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await response.arrayBuffer());
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[tts-proxy] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
