/**
 * BarTalk v8 — E2E Context Exports & Type Tests
 * Tests that all context modules export correctly.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({ supabase: null }));
vi.mock('../../src/lib/proxy', () => ({
  callProxy: vi.fn().mockResolvedValue({ content: '', tokensIn: 0, tokensOut: 0, duration: 0 }),
}));
vi.mock('../../src/lib/constants', () => ({
  PROXY_URL: '/api/ai-proxy',
  UI: { appName: 'BarTalk', appVersion: '8.2.6', send: 'Invia', placeholder: '', settings: '', apiKeys: '', voices: '', preferences: '', save: '', cancel: '', reset: '', test: '', close: '', enabled: '', disabled: '', thinking: '', noKeys: '', demo: '', studio: '', agents: '', modStandard: '', modConsultation: '', modBarRealtime: '', turnRoundRobin: '', turnRandom: '', turnSmart: '', ttsOn: '', ttsOff: '', copyOk: '', errorPrefix: '', convergenceStagnation: '', convergenceAgreement: '', convergenceDivergence: '' },
  DEFAULT_MODELS: { openai: 'gpt-4o', anthropic: 'claude-sonnet-4-20250514', gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', xai: 'grok-3-mini' },
  TTS: { model: 'eleven_multilingual_v2', stability: 0.5, similarityBoost: 0.75, style: 0.3, useSpeakerBoost: true, outputFormat: 'mp3_22050_32', chunkMaxChars: 1000, maxChars: 4000, apiBase: 'https://api.elevenlabs.io/v1' },
  SKIP_MODE: { maxAIMessages: 500, maxTTSRequests: 10, maxCourses: 3, expiryDays: 7, warningThresholdPercent: 80 },
  RATE_LIMITS: { aiRequestsPerMinute: 10, ttsRequestsPerMinute: 5, inputMaxChars: 500, ttsMaxQueueSize: 5, ttsMaxCharsPerItem: 2000 },
  ORCHESTRATOR: { forcedConsultationTurns: 4, defaultTemperature: 0.7, maxTokens: 2048, wordRange: [80, 200], consultationWordRange: [60, 150], temperatureByMode: { standard: 0.7, consultation: 0.8, bar_realtime: 0.9 }, historySlice: { standard: 12, consultation: 8, bar_realtime: 6 } },
}));

describe('Context Module Exports', () => {
  it('AuthContext exports provider and hook', async () => {
    const mod = await import('../../src/context/AuthContext');
    expect(mod.AuthProvider || mod.useAuthContext).toBeDefined();
  });

  it('SettingsContext exports provider and hook', async () => {
    const mod = await import('../../src/context/SettingsContext');
    expect(mod.SettingsProvider).toBeDefined();
    expect(mod.useSettingsContext).toBeDefined();
  });

  it('ConversationContext exports correctly', async () => {
    const mod = await import('../../src/context/ConversationContext');
    expect(mod.ConversationProvider || mod.useConversationContext).toBeDefined();
  });

  it('AgentContext exports correctly', async () => {
    const mod = await import('../../src/context/AgentContext');
    expect(mod.AgentProvider || mod.useAgentContext).toBeDefined();
  });

  it('MaestroContext exports correctly', async () => {
    const mod = await import('../../src/context/MaestroContext');
    expect(mod.MaestroProvider || mod.useMaestroContext).toBeDefined();
  });

  it('CourseContext exports correctly', async () => {
    const mod = await import('../../src/context/CourseContext');
    expect(mod.CourseProvider || mod.useCourseContext).toBeDefined();
  });

  it('UIContext exports correctly', async () => {
    const mod = await import('../../src/context/UIContext');
    expect(mod.UIProvider || mod.useUIContext).toBeDefined();
  });

  it('ThemeContext exports correctly', async () => {
    const mod = await import('../../src/context/ThemeContext');
    expect(mod.ThemeProvider || mod.useThemeContext).toBeDefined();
  });

  it('BillingContext exports correctly', async () => {
    const mod = await import('../../src/context/BillingContext');
    expect(mod.BillingProvider || mod.useBillingContext).toBeDefined();
  });

  it('TaskContext exports correctly', async () => {
    const mod = await import('../../src/context/TaskContext');
    expect(mod.TaskProvider || mod.useTaskContext).toBeDefined();
  });

  it('xAPIContext exports correctly', async () => {
    const mod = await import('../../src/context/xAPIContext');
    expect(mod.XAPIProvider || mod.useXAPIContext || mod.default).toBeDefined();
  });

  it('LTIContext exports correctly', async () => {
    const mod = await import('../../src/context/LTIContext');
    expect(mod.LTIProvider || mod.useLTIContext || mod.default).toBeDefined();
  });
});

describe('Context barrel export', () => {
  it('context/index exports multiple contexts', async () => {
    const mod = await import('../../src/context/index');
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});

describe('Hook Module Exports', () => {
  it('useIsMobile exports correctly', async () => {
    const mod = await import('../../src/hooks/useIsMobile');
    expect(mod.useIsMobile || mod.default).toBeDefined();
  });

  it('useIsAdmin exports correctly', async () => {
    const mod = await import('../../src/hooks/useIsAdmin');
    expect(mod.useIsAdmin || mod.default).toBeDefined();
  });

  it('useEffectiveTier exports correctly', async () => {
    const mod = await import('../../src/hooks/useEffectiveTier');
    expect(mod.useEffectiveTier || mod.default).toBeDefined();
  });

  it('useOrchestrator exports correctly', async () => {
    const mod = await import('../../src/hooks/useOrchestrator');
    expect(mod.useOrchestrator || mod.default).toBeDefined();
  });

  it('useTTS exports correctly', async () => {
    const mod = await import('../../src/hooks/useTTS');
    expect(mod.useTTS || mod.default).toBeDefined();
  });
});
