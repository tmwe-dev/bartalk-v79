import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the storage module
vi.mock('../../src/lib/storage', () => ({
  loadAPIKeys: vi.fn(() => []),
}));

import { resolveApiKey, resolveApiKeyOrThrow, PRIORITY_ORDERS } from '../../src/lib/apiKeyResolver';
import { loadAPIKeys } from '../../src/lib/storage';

const mockLoadAPIKeys = vi.mocked(loadAPIKeys);

describe('apiKeyResolver', () => {
  beforeEach(() => {
    mockLoadAPIKeys.mockReset();
  });

  describe('PRIORITY_ORDERS', () => {
    it('has default, fast, and pronunciation orders', () => {
      expect(PRIORITY_ORDERS.default).toBeDefined();
      expect(PRIORITY_ORDERS.fast).toBeDefined();
      expect(PRIORITY_ORDERS.pronunciation).toBeDefined();
    });

    it('default starts with anthropic', () => {
      expect(PRIORITY_ORDERS.default[0]).toBe('anthropic');
    });

    it('fast starts with gemini', () => {
      expect(PRIORITY_ORDERS.fast[0]).toBe('gemini');
    });
  });

  describe('resolveApiKey', () => {
    it('returns null when no keys configured', () => {
      mockLoadAPIKeys.mockReturnValue([]);
      expect(resolveApiKey()).toBeNull();
    });

    it('returns null when keys is empty array', () => {
      mockLoadAPIKeys.mockReturnValue([]);
      expect(resolveApiKey()).toBeNull();
    });

    it('resolves preferred provider first', () => {
      mockLoadAPIKeys.mockReturnValue([
        { provider: 'openai', apiKey: 'sk-openai', model: 'gpt-4o' },
        { provider: 'anthropic', apiKey: 'sk-ant', model: 'claude-sonnet' },
      ] as any);
      const result = resolveApiKey('anthropic');
      expect(result?.provider).toBe('anthropic');
      expect(result?.apiKey).toBe('sk-ant');
    });

    it('falls back to priority order if preferred not available', () => {
      mockLoadAPIKeys.mockReturnValue([
        { provider: 'openai', apiKey: 'sk-openai', model: 'gpt-4o' },
      ] as any);
      const result = resolveApiKey('anthropic');
      // anthropic not found, falls back to priority order: anthropic, openai, ...
      expect(result?.provider).toBe('openai');
    });

    it('skips keys with masked value', () => {
      mockLoadAPIKeys.mockReturnValue([
        { provider: 'anthropic', apiKey: '••••••••', model: 'claude' },
        { provider: 'openai', apiKey: 'sk-real', model: 'gpt-4o' },
      ] as any);
      const result = resolveApiKey();
      expect(result?.provider).toBe('openai');
    });

    it('skips keys with empty apiKey', () => {
      mockLoadAPIKeys.mockReturnValue([
        { provider: 'anthropic', apiKey: '', model: 'claude' },
        { provider: 'gemini', apiKey: 'gem-key', model: 'gemini-pro' },
      ] as any);
      const result = resolveApiKey();
      expect(result?.provider).toBe('gemini');
    });

    it('uses custom priority order', () => {
      mockLoadAPIKeys.mockReturnValue([
        { provider: 'anthropic', apiKey: 'sk-ant', model: 'claude' },
        { provider: 'gemini', apiKey: 'gem-key', model: 'gemini' },
      ] as any);
      const result = resolveApiKey(undefined, undefined, ['gemini', 'anthropic']);
      expect(result?.provider).toBe('gemini');
    });

    it('uses preferredModel when provider matches', () => {
      mockLoadAPIKeys.mockReturnValue([
        { provider: 'anthropic', apiKey: 'sk-ant', model: '' },
      ] as any);
      const result = resolveApiKey('anthropic', 'claude-opus');
      expect(result?.model).toBe('claude-opus');
    });
  });

  describe('resolveApiKeyOrThrow', () => {
    it('throws when no keys available', () => {
      mockLoadAPIKeys.mockReturnValue([]);
      expect(() => resolveApiKeyOrThrow()).toThrow('Nessuna chiave API configurata');
    });

    it('returns resolved key when available', () => {
      mockLoadAPIKeys.mockReturnValue([
        { provider: 'anthropic', apiKey: 'sk-ant', model: 'claude' },
      ] as any);
      const result = resolveApiKeyOrThrow();
      expect(result.provider).toBe('anthropic');
      expect(result.apiKey).toBe('sk-ant');
    });
  });
});
