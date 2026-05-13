/**
 * BarTalk v8.2.5 — Proxy Client Tests
 * Tests: callProxy retry logic, error handling, response parsing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before import
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('../../src/lib/providerHealth', () => ({
  recordSuccess: vi.fn(),
  recordFailure: vi.fn(),
}));

vi.mock('../../src/lib/errorTracker', () => ({
  captureAPIError: vi.fn(),
}));

vi.mock('../../src/lib/constants', () => ({
  PROXY_URL: 'https://test.vercel.app/api/ai-proxy',
  ORCHESTRATOR: {
    defaultTemperature: 0.7,
    maxTokens: 2048,
  },
}));

import { callProxy } from '../../src/lib/proxy';
import type { ProxyRequest } from '../../src/lib/proxy';
import { recordSuccess, recordFailure } from '../../src/lib/providerHealth';

const mockRequest: ProxyRequest = {
  provider: 'openai',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'ciao' }],
  systemPrompt: 'Sei un assistente.',
  apiKey: 'sk-test-key-1234567890',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('callProxy — success', () => {
  it('returns parsed response on HTTP 200', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        content: 'Ciao! Come posso aiutarti?',
        tokensIn: 10,
        tokensOut: 15,
        duration: 500,
      })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const result = await callProxy(mockRequest);

    expect(result.content).toBe('Ciao! Come posso aiutarti?');
    expect(result.tokensIn).toBe(10);
    expect(result.tokensOut).toBe(15);
    expect(result.error).toBeUndefined();
    expect(recordSuccess).toHaveBeenCalledWith('openai', expect.any(Number));
  });

  it('omits apiKey from body when vault placeholder', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ content: 'ok', tokensIn: 1, tokensOut: 1 })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    await callProxy({ ...mockRequest, apiKey: '••••••••' });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.apiKey).toBeUndefined();
  });
});

describe('callProxy — errors', () => {
  it('returns error for HTTP 400', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Bad request', detail: 'missing provider' })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const result = await callProxy(mockRequest);
    expect(result.error).toBe('Bad request');
    expect(result.content).toBe('');
  });

  it('returns error for non-JSON response', async () => {
    const mockResponse = {
      ok: false,
      status: 502,
      text: vi.fn().mockResolvedValue('Bad Gateway'),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    // 502 is retryable, so it'll be called 3 times (initial + 2 retries)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const result = await callProxy(mockRequest);
    expect(result.error).toContain('Proxy HTTP 502');
  });

  it('returns error after all retries exhausted on 500', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Internal error' })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const result = await callProxy(mockRequest);
    expect(result.error).toBeTruthy();
    expect(result.content).toBe('');
  });

  it('handles network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await callProxy(mockRequest);
    expect(result.error).toBe('Errore di rete');
    expect(recordFailure).toHaveBeenCalled();
  });
});

describe('callProxy — retry logic', () => {
  it('retries on 429 status', async () => {
    const failResponse = {
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Rate limited' })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    const successResponse = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ content: 'ok', tokensIn: 1, tokensOut: 1 })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(failResponse as any)
      .mockResolvedValueOnce(successResponse as any);

    const result = await callProxy(mockRequest);
    expect(result.content).toBe('ok');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 401 status', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Unauthorized' })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    await callProxy(mockRequest);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries on network errors', async () => {
    const successResponse = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ content: 'recovered', tokensIn: 1, tokensOut: 1 })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Connection reset'))
      .mockResolvedValueOnce(successResponse as any);

    const result = await callProxy(mockRequest);
    expect(result.content).toBe('recovered');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe('callProxy — auth', () => {
  it('sends X-BT-Skip-Auth when no session', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ content: 'ok', tokensIn: 1, tokensOut: 1 })),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    await callProxy(mockRequest);

    const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers['X-BT-Skip-Auth']).toBe('true');
  });
});
