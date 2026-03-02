// ── Testi UI (italiano) ──────────────────────────────────────────────
export const UI = {
  appName: 'BarTalk',
  appVersion: '8.0',
  send: 'Invia',
  placeholder: 'Scrivi un messaggio...',
  settings: 'Impostazioni',
  apiKeys: 'Chiavi API',
  voices: 'Voci',
  preferences: 'Preferenze',
  save: 'Salva',
  cancel: 'Annulla',
  reset: 'Ripristina',
  test: 'Testa',
  close: 'Chiudi',
  enabled: 'Attivo',
  disabled: 'Disattivo',
  thinking: 'sta pensando...',
  noKeys: 'Nessuna chiave API configurata. Premi Ctrl+K per configurare.',
  demo: '[Demo]',
  studio: 'Studio Tecnico',
  agents: 'Agenti',
  modStandard: 'Standard',
  modConsultation: 'Consultazione',
  modBarRealtime: 'Bar Realtime',
  turnRoundRobin: 'A turno',
  turnRandom: 'Casuale',
  turnSmart: 'Intelligente',
  ttsOn: 'Voci attive',
  ttsOff: 'Voci disattive',
  copyOk: 'Copiato!',
  errorPrefix: 'Errore',
  convergenceStagnation: '⚠️ LA CONVERSAZIONE È STAGNANTE. Porta un punto di vista NUOVO.',
  convergenceAgreement: 'Gli agenti sono in accordo.',
  convergenceDivergence: 'Gli agenti hanno opinioni diverse.',
} as const;

// ── Modelli predefiniti ──────────────────────────────────────────────
export const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
} as const;

// ── TTS ──────────────────────────────────────────────────────────────
export const TTS = {
  model: 'eleven_multilingual_v2',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.3,
  maxChars: 4000,
  apiBase: 'https://api.elevenlabs.io/v1',
} as const;

// ── Orchestrator ─────────────────────────────────────────────────────
export const ORCHESTRATOR = {
  forcedConsultationTurns: 4, // primi N turni = consultation forzata
  defaultTemperature: 0.7,
  maxTokens: 2048,
  wordRange: [80, 200] as [number, number],
  consultationWordRange: [60, 150] as [number, number],
} as const;

// ── Proxy ────────────────────────────────────────────────────────────
export const PROXY_URL = '/api/ai-proxy';
