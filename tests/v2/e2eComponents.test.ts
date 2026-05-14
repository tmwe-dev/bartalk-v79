/**
 * BarTalk v8 — E2E Component Export & Structure Tests
 * Tests all major component modules export correctly and have proper structure.
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

describe('Chat Components Exports', () => {
  it('ChatContainer exports correctly', async () => {
    const mod = await import('../../src/components/Chat/ChatContainer');
    expect(mod.ChatContainer || mod.default).toBeDefined();
  });
  it('MessageBubble exports correctly', async () => {
    const mod = await import('../../src/components/Chat/MessageBubble');
    expect(mod.MessageBubble || mod.default).toBeDefined();
  });
  it('MessageList exports correctly', async () => {
    const mod = await import('../../src/components/Chat/MessageList');
    expect(mod.MessageList || mod.default).toBeDefined();
  });
  it('InputBox exports correctly', async () => {
    const mod = await import('../../src/components/Chat/InputBox');
    expect(mod.InputBox || mod.default).toBeDefined();
  });
  it('TypingIndicator exports correctly', async () => {
    const mod = await import('../../src/components/Chat/TypingIndicator');
    expect(mod.TypingIndicator || mod.default).toBeDefined();
  });
  it('AgentStrip exports correctly', async () => {
    const mod = await import('../../src/components/Chat/AgentStrip');
    expect(mod.AgentStrip || mod.default).toBeDefined();
  });
  it('ConversationSidebar exports correctly', async () => {
    const mod = await import('../../src/components/Chat/ConversationSidebar');
    expect(mod.ConversationSidebar || mod.default).toBeDefined();
  });
  it('FileUpload exports correctly', async () => {
    const mod = await import('../../src/components/Chat/FileUpload');
    expect(mod.FileUpload || mod.default).toBeDefined();
  });
  it('AudioControlBar exports correctly', async () => {
    const mod = await import('../../src/components/Chat/AudioControlBar');
    expect(mod.AudioControlBar || mod.default).toBeDefined();
  });
});

describe('Auth Components Exports', () => {
  it('AuthGate exports correctly', async () => {
    const mod = await import('../../src/components/Auth/AuthGate');
    expect(mod.AuthGate || mod.default).toBeDefined();
  });
  it('SkipModeBanner exports correctly', async () => {
    const mod = await import('../../src/components/Auth/SkipModeBanner');
    expect(mod.SkipModeBanner || mod.default).toBeDefined();
  });
  it('PasswordReset exports correctly', async () => {
    const mod = await import('../../src/components/Auth/PasswordReset');
    expect(mod.PasswordReset || mod.default).toBeDefined();
  });
  it('UpdatePassword exports correctly', async () => {
    const mod = await import('../../src/components/Auth/UpdatePassword');
    expect(mod.UpdatePassword || mod.default).toBeDefined();
  });
});

describe('Settings Components Exports', () => {
  it('SettingsModal exports correctly', async () => {
    const mod = await import('../../src/components/Settings/SettingsModal');
    expect(mod.SettingsModal || mod.default).toBeDefined();
  });
  it('APIKeysTab exports correctly', async () => {
    const mod = await import('../../src/components/Settings/APIKeysTab');
    expect(mod.APIKeysTab || mod.default).toBeDefined();
  });
  it('VoicesTab exports correctly', async () => {
    const mod = await import('../../src/components/Settings/VoicesTab');
    expect(mod.VoicesTab || mod.default).toBeDefined();
  });
  it('PreferencesTab exports correctly', async () => {
    const mod = await import('../../src/components/Settings/PreferencesTab');
    expect(mod.PreferencesTab || mod.default).toBeDefined();
  });
  it('MemoryTab exports correctly', async () => {
    const mod = await import('../../src/components/Settings/MemoryTab');
    expect(mod.MemoryTab || mod.default).toBeDefined();
  });
  it('PromptTab exports correctly', async () => {
    const mod = await import('../../src/components/Settings/PromptTab');
    expect(mod.PromptTab || mod.default).toBeDefined();
  });
  it('MonitorTab exports correctly', async () => {
    const mod = await import('../../src/components/Settings/MonitorTab');
    expect(mod.MonitorTab || mod.default).toBeDefined();
  });
  it('AuditLogTab exports correctly', async () => {
    const mod = await import('../../src/components/Settings/AuditLogTab');
    expect(mod.AuditLogTab || mod.default).toBeDefined();
  });
});

describe('Course Components Exports', () => {
  it('CourseActive exports correctly', async () => {
    const mod = await import('../../src/components/Courses/CourseActive');
    expect(mod.CourseActive || mod.default).toBeDefined();
  });
  it('CourseBrowse exports correctly', async () => {
    const mod = await import('../../src/components/Courses/CourseBrowse');
    expect(mod.CourseBrowse || mod.default).toBeDefined();
  });
  it('CourseCatalog exports correctly', async () => {
    const mod = await import('../../src/components/Courses/CourseCatalog');
    expect(mod.CourseCatalog || mod.default).toBeDefined();
  });
  it('CourseAssessment exports correctly', async () => {
    const mod = await import('../../src/components/Courses/CourseAssessment');
    expect(mod.CourseAssessment || mod.default).toBeDefined();
  });
  it('CourseWizard exports correctly', async () => {
    const mod = await import('../../src/components/Courses/CourseWizard');
    expect(mod.CourseWizard || mod.default).toBeDefined();
  });
  it('CourseMaestro exports correctly', async () => {
    const mod = await import('../../src/components/Courses/CourseMaestro');
    expect(mod.CourseMaestro || mod.default).toBeDefined();
  });
});

describe('Maestro Components Exports', () => {
  it('MaestroChat exports correctly', async () => {
    const mod = await import('../../src/components/Maestro/MaestroChat');
    expect(mod.MaestroChat || mod.default).toBeDefined();
  });
  it('MaestroAvatar exports correctly', async () => {
    const mod = await import('../../src/components/Maestro/MaestroAvatar');
    expect(mod.MaestroAvatar || mod.default).toBeDefined();
  });
  it('MaestroToolbar exports correctly', async () => {
    const mod = await import('../../src/components/Maestro/MaestroToolbar');
    expect(mod.MaestroToolbar || mod.default).toBeDefined();
  });
  it('StudentOnboarding exports correctly', async () => {
    const mod = await import('../../src/components/Maestro/StudentOnboarding');
    expect(mod.StudentOnboarding || mod.default).toBeDefined();
  });
});

describe('LifeTutor Components Exports', () => {
  it('LifeTutorTab exports correctly', async () => {
    const mod = await import('../../src/components/LifeTutor/LifeTutorTab');
    expect(mod.LifeTutorTab).toBeDefined();
  });
  it('FreeChatPanel exports correctly', async () => {
    const mod = await import('../../src/components/LifeTutor/FreeChatPanel');
    expect(mod.FreeChatPanel || mod.default).toBeDefined();
  });
  it('ObjectivesPanel exports correctly', async () => {
    const mod = await import('../../src/components/LifeTutor/ObjectivesPanel');
    expect(mod.ObjectivesPanel || mod.default).toBeDefined();
  });
  it('SuggestionsWidget exports correctly', async () => {
    const mod = await import('../../src/components/LifeTutor/SuggestionsWidget');
    expect(mod.SuggestionsWidget || mod.default).toBeDefined();
  });
});

describe('Common Components Exports', () => {
  it('Modal exports correctly', async () => {
    const mod = await import('../../src/components/Common/Modal');
    expect(mod.Modal || mod.default).toBeDefined();
  });
  it('ToastContainer exports correctly', async () => {
    const mod = await import('../../src/components/Common/Toast');
    expect(mod.ToastContainer || mod.default).toBeDefined();
  });
  it('Skeleton exports correctly', async () => {
    const mod = await import('../../src/components/Common/Skeleton');
    expect(mod.Skeleton || mod.default).toBeDefined();
  });
  it('LazyImage exports correctly', async () => {
    const mod = await import('../../src/components/Common/LazyImage');
    expect(mod.LazyImage || mod.default).toBeDefined();
  });
});

describe('Billing Components Exports', () => {
  it('PricingCards exports correctly', async () => {
    const mod = await import('../../src/components/Billing/PricingCards');
    expect(mod.PricingCards || mod.default).toBeDefined();
  });
  it('UpgradeModal exports correctly', async () => {
    const mod = await import('../../src/components/Billing/UpgradeModal');
    expect(mod.UpgradeModal || mod.default).toBeDefined();
  });
});

describe('Legal Components Exports', () => {
  it('CookieBanner exports correctly', async () => {
    const mod = await import('../../src/components/Legal/CookieBanner');
    expect(mod.CookieBanner || mod.default).toBeDefined();
  });
});

describe('Other Component Exports', () => {
  it('StudioPage exports correctly', async () => {
    const mod = await import('../../src/components/Studio/StudioPage');
    expect(mod.StudioPage || mod.default).toBeDefined();
  });
  it('PodcastMode exports correctly', async () => {
    const mod = await import('../../src/components/Podcast/PodcastMode');
    expect(mod.PodcastMode || mod.default).toBeDefined();
  });
  it('TaskPanel exports correctly', async () => {
    const mod = await import('../../src/components/Tasks/TaskPanel');
    expect(mod.TaskPanel || mod.default).toBeDefined();
  });
  it('AgentSelector exports correctly', async () => {
    const mod = await import('../../src/components/Agents/AgentSelector');
    expect(mod.AgentSelector || mod.default).toBeDefined();
  });
  it('AgentCard exports correctly', async () => {
    const mod = await import('../../src/components/Agents/AgentCard');
    expect(mod.AgentCard || mod.default).toBeDefined();
  });
});
