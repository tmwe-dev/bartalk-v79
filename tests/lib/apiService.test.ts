/**
 * Tests for src/lib/apiService.ts — API request layer
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest, callAIProvider, checkAPIHealth } from '../../src/lib/apiService';

beforeEach(() => {
  vi.restoreAllMocks();
});

// ── apiRequest ────────────────────────────────────────────────────────

describe('apiRequest', () => {
  it('returns success for OK JSON response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ data: 'hello' }),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ data: 'hello' });
      expect(result.status).toBe(200);
    }
  });

  it('returns success for OK text response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('plain text'),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('plain text');
    }
  });

  it('returns error for 400 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ error: 'Bad input' }),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns auth error for 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('AUTH_ERROR');
    }
  });

  it('returns auth error for 403', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ error: 'Forbidden' }),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('AUTH_ERROR');
    }
  });

  it('returns rate limit error for 429', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ error: 'Rate limited', retryAfter: 30 }),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK_ERROR');
      // getUserMessage for NetworkError returns generic connection message
      expect(result.userMessage).toBeTruthy();
    }
  });

  it('returns server error for 500', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'Internal error' }),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK_ERROR');
    }
  });

  it('sends POST body as JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ ok: true }),
    });

    await apiRequest({ url: '/api/test', method: 'POST', body: { key: 'value' } });
    const callArgs = (fetch as any).mock.calls[0][1];
    expect(callArgs.method).toBe('POST');
    expect(callArgs.body).toBe(JSON.stringify({ key: 'value' }));
  });

  it('does not include body for GET requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    });

    await apiRequest({ url: '/api/test', method: 'GET', body: { unused: true } });
    const callArgs = (fetch as any).mock.calls[0][1];
    expect(callArgs.body).toBeUndefined();
  });

  it('handles network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK_ERROR');
    }
  });

  it('handles abort errors', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    global.fetch = vi.fn().mockRejectedValue(abortErr);

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK_ERROR');
      // getUserMessage for NetworkError returns generic connection message
      expect(result.userMessage).toBeTruthy();
    }
  });

  it('handles unknown errors', async () => {
    global.fetch = vi.fn().mockRejectedValue('string error');

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
  });

  it('extracts error message from nested error object', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ error: { message: 'nested msg' } }),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('nested msg');
    }
  });

  it('extracts error from detail field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ detail: 'detail msg' }),
    });

    const result = await apiRequest({ url: '/api/test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('detail msg');
    }
  });

  it('passes string body as-is for POST', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    });

    await apiRequest({ url: '/api/test', method: 'POST', body: 'raw string' });
    const callArgs = (fetch as any).mock.calls[0][1];
    expect(callArgs.body).toBe('raw string');
  });
});

// ── callAIProvider ────────────────────────────────────────────────────

describe('callAIProvider', () => {
  const baseReq = {
    provider: 'openai' as const,
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
    systemPrompt: 'You are helpful',
  };

  it('calls proxy with auth token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ content: 'Hi', tokensIn: 5, tokensOut: 2, duration: 100 }),
    });

    const result = await callAIProvider({ ...baseReq, authToken: 'tok-123' });
    expect(result.ok).toBe(true);
    const callHeaders = (fetch as any).mock.calls[0][1].headers;
    expect(callHeaders['Authorization']).toBe('Bearer tok-123');
  });

  it('uses skip-auth header when no authToken', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ content: 'Hi', tokensIn: 5, tokensOut: 2, duration: 100 }),
    });

    await callAIProvider(baseReq);
    const callHeaders = (fetch as any).mock.calls[0][1].headers;
    expect(callHeaders['X-BT-Skip-Auth']).toBe('true');
  });

  it('omits apiKey when it is a vault placeholder', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ content: 'Hi', tokensIn: 5, tokensOut: 2, duration: 100 }),
    });

    await callAIProvider({ ...baseReq, apiKey: '••••••••' });
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.apiKey).toBeUndefined();
  });

  it('includes apiKey when it is a real key', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ content: 'Hi', tokensIn: 5, tokensOut: 2, duration: 100 }),
    });

    await callAIProvider({ ...baseReq, apiKey: 'sk-real-key-123' });
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.apiKey).toBe('sk-real-key-123');
  });

  it('reclassifies errors as ProviderError', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    const result = await callAIProvider(baseReq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PROVIDER_ERROR');
    }
  });
});

// ── checkAPIHealth ────────────────────────────────────────────────────

describe('checkAPIHealth', () => {
  it('calls health endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ status: 'ok', version: '1.0', providers: [], timestamp: '' }),
    });

    const result = await checkAPIHealth('/api/proxy');
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/proxy?health=true',
      expect.any(Object),
    );
  });
});
