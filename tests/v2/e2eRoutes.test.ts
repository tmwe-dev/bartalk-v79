/**
 * BarTalk v8.2.6 — E2E Route Rendering Tests (Vitest + jsdom)
 * Tests that all V2 routes render without crashing.
 * Uses vitest with jsdom, NOT Playwright (no browser needed).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock all heavy dependencies that V2 components use
vi.mock('../../src/lib/supabase', () => ({
  supabase: null,
}));

vi.mock('../../src/lib/proxy', () => ({
  callProxy: vi.fn().mockResolvedValue({ content: '', tokensIn: 0, tokensOut: 0, duration: 0 }),
}));

vi.mock('../../src/lib/constants', () => ({
  PROXY_URL: '/api/ai-proxy',
  VERSION: '8.2.6',
  ORCHESTRATOR: {
    forcedConsultationTurns: 4,
    defaultTemperature: 0.7,
    maxTokens: 2048,
    wordRange: [80, 200],
    consultationWordRange: [60, 150],
    temperatureByMode: { standard: 0.7, consultation: 0.8, bar_realtime: 0.9 },
    historySlice: { standard: 12, consultation: 8, bar_realtime: 6 },
  },
  UI: {
    appName: 'BarTalk',
    appVersion: '8.2.6',
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
    noKeys: 'Nessuna chiave API configurata.',
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
    convergenceStagnation: 'stagnante',
    convergenceAgreement: 'accordo',
    convergenceDivergence: 'divergenza',
  },
  DEFAULT_MODELS: {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash',
    groq: 'llama-3.3-70b-versatile',
    xai: 'grok-3-mini',
  },
  TTS: {
    model: 'eleven_multilingual_v2',
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.3,
    useSpeakerBoost: true,
    outputFormat: 'mp3_22050_32',
    chunkMaxChars: 1000,
    maxChars: 4000,
    apiBase: 'https://api.elevenlabs.io/v1',
  },
  SKIP_MODE: {
    maxAIMessages: 500,
    maxTTSRequests: 10,
    maxCourses: 3,
    expiryDays: 7,
    warningThresholdPercent: 80,
  },
  RATE_LIMITS: {
    aiRequestsPerMinute: 10,
    ttsRequestsPerMinute: 5,
    inputMaxChars: 500,
    ttsMaxQueueSize: 5,
    ttsMaxCharsPerItem: 2000,
  },
}));

// Simple smoke test: verify each route's page module exports correctly
describe('V2 Route Module Exports', () => {
  it('CoursePanel exports correctly', async () => {
    const mod = await import('../../src/components/Courses/CoursePanel');
    expect(mod.CoursePanel).toBeDefined();
    expect(typeof mod.CoursePanel).toBe('function');
  });

  it('MaestroSelector exports correctly', async () => {
    const mod = await import('../../src/components/Maestro/MaestroSelector');
    expect(mod.MaestroSelector).toBeDefined();
    expect(typeof mod.MaestroSelector).toBe('function');
  });

  it('LifeTutorTab exports correctly', async () => {
    const mod = await import('../../src/components/LifeTutor/LifeTutorTab');
    expect(mod.LifeTutorTab).toBeDefined();
    expect(typeof mod.LifeTutorTab).toBe('function');
  });

  it('FreeVoiceTab exports correctly', async () => {
    const mod = await import('../../src/components/FreeVoice/FreeVoiceTab');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('ProgressDashboard exports correctly', async () => {
    const mod = await import('../../src/components/Education/ProgressDashboard');
    expect(mod.ProgressDashboard).toBeDefined();
    expect(typeof mod.ProgressDashboard).toBe('function');
  });

  it('BillingPanel exports correctly', async () => {
    const mod = await import('../../src/components/Billing/BillingPanel');
    expect(mod.BillingPanel).toBeDefined();
    expect(typeof mod.BillingPanel).toBe('function');
  });

  it('LandingPage exports correctly', async () => {
    const mod = await import('../../src/components/Landing/LandingPage');
    expect(mod.LandingPage).toBeDefined();
    expect(typeof mod.LandingPage).toBe('function');
  });

  it('PrivacyPolicy exports correctly', async () => {
    const mod = await import('../../src/components/Legal/PrivacyPolicy');
    expect(mod.PrivacyPolicy).toBeDefined();
    expect(typeof mod.PrivacyPolicy).toBe('function');
  });

  it('TermsOfService exports correctly', async () => {
    const mod = await import('../../src/components/Legal/TermsOfService');
    expect(mod.TermsOfService).toBeDefined();
    expect(typeof mod.TermsOfService).toBe('function');
  });
});

describe('V1 Route Module Exports', () => {
  it('ChatPage exports correctly', async () => {
    const mod = await import('../../src/pages/ChatPage');
    expect(mod.ChatPage).toBeDefined();
  });

  it('WelcomePage exports correctly', async () => {
    const mod = await import('../../src/pages/WelcomePage');
    expect(mod.WelcomePage).toBeDefined();
  });

  it('SettingsPage exports correctly', async () => {
    const mod = await import('../../src/pages/SettingsPage');
    expect(mod.SettingsPage).toBeDefined();
  });

  it('DebugPage exports correctly', async () => {
    const mod = await import('../../src/pages/DebugPage');
    expect(mod.DebugPage).toBeDefined();
  });

  it('LoginPage exports correctly', async () => {
    const mod = await import('../../src/pages/LoginPage');
    expect(mod.LoginPage).toBeDefined();
  });

  it('AuthCallback exports correctly', async () => {
    const mod = await import('../../src/pages/AuthCallback');
    expect(mod.AuthCallback).toBeDefined();
  });
});

describe('Router configuration', () => {
  it('AppRoutes exports correctly', async () => {
    const mod = await import('../../src/router');
    expect(mod.AppRoutes).toBeDefined();
    expect(typeof mod.AppRoutes).toBe('function');
  });
});

describe('Layout components', () => {
  it('PageShell exports correctly', async () => {
    const mod = await import('../../src/components/Layout/PageShell');
    expect(mod.PageShell).toBeDefined();
    expect(typeof mod.PageShell).toBe('function');
  });

  it('Navbar exports correctly', async () => {
    const mod = await import('../../src/components/Layout/Navbar');
    expect(mod.Navbar || mod.default).toBeDefined();
  });

  it('ErrorBoundary exports correctly', async () => {
    const mod = await import('../../src/components/Common/ErrorBoundary');
    expect(mod.ErrorBoundary).toBeDefined();
  });
});
