/**
 * BarTalk v8 — Tests for src/lib/commands.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCommand } from '../../src/lib/commands';

// Mock storage functions
vi.mock('../../src/lib/storage', () => ({
  loadAPIKeys: vi.fn(() => [
    { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' },
    { provider: 'anthropic', apiKey: '', model: '' },
    { provider: 'elevenlabs', apiKey: 'el-key', model: '' },
  ]),
  loadCustomVoices: vi.fn(() => ({})),
  loadExcludedAgents: vi.fn(() => []),
  saveCustomVoices: vi.fn(),
}));

vi.mock('../../src/lib/constants', () => ({
  DEFAULT_MODELS: {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash',
    groq: 'llama-3.3-70b-versatile',
    xai: 'grok-3-mini',
  },
}));

describe('handleCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns handled=false for non-commands', () => {
    expect(handleCommand('hello').handled).toBe(false);
  });

  it('returns handled=false for unknown commands', () => {
    expect(handleCommand('/unknown').handled).toBe(false);
  });

  describe('/help', () => {
    it('handles /help', () => {
      const result = handleCommand('/help');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('Comandi disponibili');
    });
    it('handles /aiuto', () => {
      const result = handleCommand('/aiuto');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('Comandi disponibili');
    });
  });

  describe('/voci', () => {
    it('handles /voci', () => {
      const result = handleCommand('/voci');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('Voci agenti');
    });
    it('handles /voices', () => {
      const result = handleCommand('/voices');
      expect(result.handled).toBe(true);
    });
  });

  describe('/keys', () => {
    it('shows API key status', () => {
      const result = handleCommand('/keys');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('Stato chiavi API');
      expect(result.systemMessage).toContain('openai');
    });
  });

  describe('/stato', () => {
    it('handles /stato', () => {
      const result = handleCommand('/stato');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('Stato sistema');
    });
    it('handles /status', () => {
      const result = handleCommand('/status');
      expect(result.handled).toBe(true);
    });
  });

  describe('/voce', () => {
    it('returns unhandled for bare /voce without space', () => {
      // /voce without args doesn't match startsWith('/voce ')
      const result = handleCommand('/voce');
      expect(result.handled).toBe(false);
    });
    it('shows usage for /voce with bad format', () => {
      const result = handleCommand('/voce badformat');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('Uso:');
    });
    it('handles /voce with valid agent', () => {
      const result = handleCommand('/voce albert=newVoiceId123');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('cambiata');
    });
    it('handles unknown agent', () => {
      const result = handleCommand('/voce unknownagent=voice');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('non trovato');
    });
    it('handles /voce reset', () => {
      const result = handleCommand('/voce albert=reset');
      expect(result.handled).toBe(true);
      expect(result.systemMessage).toContain('ripristinata');
    });
  });

  it('is case-insensitive', () => {
    expect(handleCommand('/HELP').handled).toBe(true);
    expect(handleCommand('/Help').handled).toBe(true);
  });

  it('trims whitespace', () => {
    expect(handleCommand('  /help  ').handled).toBe(true);
  });
});
