// Vercel Serverless Function: Health Check for BarTalk v8.0
// GET /api/health — verifica stato sistema, DB, provider AI

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    keyEnv: 'OPENAI_API_KEY',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    // HEAD check — 405 means server is reachable
    expectStatus: [200, 405],
  },
  gemini: {
    keyEnv: 'GOOGLE_API_KEY',
    urlFn: (key) => `https://generativelanguage.googleapis.com/v1/models?key=${key}`,
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/models',
    keyEnv: 'GROQ_API_KEY',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
};

async function checkDB() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { status: 'skip', message: 'No DB credentials configured' };
  }
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const start = Date.now();
    const { error } = await sb.from('workspaces').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) return { status: 'error', message: error.message, latency };
    return { status: 'ok', latency };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function checkProvider(name) {
  const cfg = PROVIDERS[name];
  const key = process.env[cfg.keyEnv];
  if (!key) return { status: 'no_key', message: `${cfg.keyEnv} not configured` };

  try {
    const start = Date.now();
    const url = cfg.urlFn ? cfg.urlFn(key) : cfg.url;
    const headers = cfg.authHeader ? cfg.authHeader(key) : {};
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: cfg.url ? 'GET' : 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;
    const expectedStatuses = cfg.expectStatus || [200];
    const ok = expectedStatuses.includes(res.status) || res.ok;

    return {
      status: ok ? 'ok' : 'degraded',
      httpStatus: res.status,
      latency,
    };
  } catch (e) {
    return {
      status: 'error',
      message: e.name === 'AbortError' ? 'Timeout (8s)' : e.message,
    };
  }
}

export default async function handler(req, res) {
  // CORS open per monitoring
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const startTime = Date.now();

  // Esegui check in parallelo
  const [db, openai, anthropic, gemini, groq] = await Promise.all([
    checkDB(),
    checkProvider('openai'),
    checkProvider('anthropic'),
    checkProvider('gemini'),
    checkProvider('groq'),
  ]);

  const checks = { db, openai, anthropic, gemini, groq };

  // Determina stato globale
  const allStatuses = Object.values(checks).map(c => c.status);
  const hasError = allStatuses.includes('error');
  const hasDegraded = allStatuses.includes('degraded');
  const allOk = allStatuses.every(s => s === 'ok' || s === 'skip' || s === 'no_key');

  let overallStatus = 'healthy';
  let httpCode = 200;
  if (hasError) { overallStatus = 'unhealthy'; httpCode = 503; }
  else if (hasDegraded) { overallStatus = 'degraded'; httpCode = 200; }

  // Conta provider funzionanti
  const workingProviders = ['openai', 'anthropic', 'gemini', 'groq']
    .filter(p => checks[p].status === 'ok').length;

  return res.status(httpCode).json({
    status: overallStatus,
    version: '8.1.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.round(process.uptime())}s`,
    node: process.version,
    totalLatency: Date.now() - startTime,
    providers: {
      total: 4,
      working: workingProviders,
      details: { openai, anthropic, gemini, groq },
    },
    database: db,
    envVars: {
      SUPABASE_URL: !!SUPABASE_URL,
      ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
    },
  });
}
