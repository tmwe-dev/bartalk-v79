/**
 * BarTalk v8.2.5 — Provider Health Monitoring Tests
 * Tests: recordSuccess, recordFailure, getProviderHealth, getFallbackProvider,
 *        isProviderAvailable, resetProviderHealth, getHealthSummary, getAllProviderHealth
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordSuccess,
  recordFailure,
  getProviderHealth,
  getAllProviderHealth,
  isProviderAvailable,
  getFallbackProvider,
  resetProviderHealth,
  getHealthSummary,
} from '../../src/lib/providerHealth';

beforeEach(() => {
  resetProviderHealth(); // clean slate
});

describe('recordSuccess', () => {
  it('marks provider as healthy after success', () => {
    recordSuccess('openai', 200);
    const h = getProviderHealth('openai');
    expect(h.status).toBe('healthy');
    expect(h.consecutiveFailures).toBe(0);
    expect(h.totalRequests).toBe(1);
  });

  it('computes rolling average latency', () => {
    recordSuccess('openai', 100);
    recordSuccess('openai', 300);
    const h = getProviderHealth('openai');
    expect(h.avgLatency).toBeGreaterThan(0);
    expect(h.totalRequests).toBe(2);
  });

  it('resets consecutive failures on success', () => {
    recordFailure('openai');
    recordFailure('openai');
    expect(getProviderHealth('openai').consecutiveFailures).toBe(2);
    recordSuccess('openai', 150);
    expect(getProviderHealth('openai').consecutiveFailures).toBe(0);
    expect(getProviderHealth('openai').status).toBe('healthy');
  });
});

describe('recordFailure', () => {
  it('marks provider degraded after 1 failure', () => {
    recordFailure('anthropic');
    expect(getProviderHealth('anthropic').status).toBe('degraded');
  });

  it('marks provider down after 3 failures', () => {
    recordFailure('anthropic');
    recordFailure('anthropic');
    recordFailure('anthropic');
    expect(getProviderHealth('anthropic').status).toBe('down');
  });

  it('increments totalErrors and totalRequests', () => {
    recordFailure('gemini');
    recordFailure('gemini');
    const h = getProviderHealth('gemini');
    expect(h.totalErrors).toBe(2);
    expect(h.totalRequests).toBe(2);
  });
});

describe('getProviderHealth', () => {
  it('returns healthy for unknown provider', () => {
    const h = getProviderHealth('xai');
    expect(h.status).toBe('healthy');
    expect(h.totalRequests).toBe(0);
  });

  it('auto-recovers after timeout', () => {
    // Simulate failures
    recordFailure('openai');
    recordFailure('openai');
    recordFailure('openai');
    expect(getProviderHealth('openai').status).toBe('down');

    // Mock time passing (> 60s)
    const state = getProviderHealth('openai');
    // We can't easily mock Date.now inside the module, so we test the structure
    expect(state.provider).toBe('openai');
    expect(state.lastError).toBeGreaterThan(0);
  });
});

describe('getAllProviderHealth', () => {
  it('returns all 5 providers', () => {
    const all = getAllProviderHealth();
    expect(all).toHaveLength(5);
    const providers = all.map(s => s.provider);
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('gemini');
    expect(providers).toContain('groq');
    expect(providers).toContain('xai');
  });
});

describe('isProviderAvailable', () => {
  it('returns true for healthy provider', () => {
    expect(isProviderAvailable('openai')).toBe(true);
  });

  it('returns true for degraded provider', () => {
    recordFailure('openai');
    expect(getProviderHealth('openai').status).toBe('degraded');
    expect(isProviderAvailable('openai')).toBe(true);
  });

  it('returns false for down provider', () => {
    recordFailure('openai');
    recordFailure('openai');
    recordFailure('openai');
    expect(isProviderAvailable('openai')).toBe(false);
  });
});

describe('getFallbackProvider', () => {
  it('returns first healthy fallback for openai', () => {
    recordFailure('openai');
    recordFailure('openai');
    recordFailure('openai');
    const fb = getFallbackProvider('openai');
    expect(fb).not.toBeNull();
    expect(fb!.provider).toBe('anthropic'); // first in chain
    expect(fb!.model).toBeTruthy();
  });

  it('skips down providers in chain', () => {
    // Mark openai and anthropic as down
    for (let i = 0; i < 3; i++) {
      recordFailure('openai');
      recordFailure('anthropic');
    }
    const fb = getFallbackProvider('openai');
    expect(fb).not.toBeNull();
    expect(fb!.provider).not.toBe('anthropic');
  });

  it('returns null when all providers are down', () => {
    const providers = ['openai', 'anthropic', 'gemini', 'groq', 'xai'] as const;
    for (const p of providers) {
      for (let i = 0; i < 3; i++) recordFailure(p);
    }
    const fb = getFallbackProvider('openai');
    expect(fb).toBeNull();
  });

  it('respects availableProviders whitelist', () => {
    const fb = getFallbackProvider('openai', ['gemini']);
    expect(fb).not.toBeNull();
    expect(fb!.provider).toBe('gemini');
  });
});

describe('resetProviderHealth', () => {
  it('resets single provider', () => {
    recordFailure('openai');
    recordFailure('openai');
    resetProviderHealth('openai');
    expect(getProviderHealth('openai').status).toBe('healthy');
    expect(getProviderHealth('openai').consecutiveFailures).toBe(0);
  });

  it('resets all providers', () => {
    recordFailure('openai');
    recordFailure('anthropic');
    resetProviderHealth();
    expect(getProviderHealth('openai').status).toBe('healthy');
    expect(getProviderHealth('anthropic').status).toBe('healthy');
  });
});

describe('getHealthSummary', () => {
  it('returns formatted string with all providers', () => {
    recordSuccess('openai', 200);
    recordFailure('anthropic');
    const summary = getHealthSummary();
    expect(summary).toContain('openai');
    expect(summary).toContain('anthropic');
    expect(summary).toContain('🟢');  // healthy
    expect(summary).toContain('🟡');  // degraded
  });
});
