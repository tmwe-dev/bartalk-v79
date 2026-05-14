/**
 * Tests for src/lib/streaming.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({ supabase: null }));

import { readStream, startStream } from '../../src/lib/streaming';
import type { StreamCallbacks } from '../../src/lib/streaming';

// Helper to create a ReadableStream from text
function createMockResponse(lines: string[], ok = true): Response {
  const text = lines.join('\n') + '\n';
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    body: stream,
    headers: new Headers(),
  } as unknown as Response;
}

describe('streaming', () => {
  let callbacks: StreamCallbacks;
  let chunks: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    chunks = [];
    callbacks = {
      onChunk: vi.fn((text: string) => chunks.push(text)),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };
  });

  describe('readStream', () => {
    it('parses OpenAI-format SSE data lines', async () => {
      const response = createMockResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"choices":[{"delta":{"content":" world"}}]}',
        'data: [DONE]',
      ]);

      await readStream(response, 'openai', callbacks);

      expect(callbacks.onChunk).toHaveBeenCalledTimes(2);
      expect(chunks).toEqual(['Hello', ' world']);
      expect(callbacks.onComplete).toHaveBeenCalledWith('Hello world', expect.objectContaining({
        provider: 'openai',
      }));
    });

    it('parses Anthropic-format SSE data lines', async () => {
      const response = createMockResponse([
        'data: {"type":"content_block_delta","delta":{"text":"Bonjour"}}',
        'data: [DONE]',
      ]);

      await readStream(response, 'anthropic', callbacks);

      expect(chunks).toEqual(['Bonjour']);
      expect(callbacks.onComplete).toHaveBeenCalledWith('Bonjour', expect.objectContaining({
        provider: 'anthropic',
      }));
    });

    it('ignores non-data lines', async () => {
      const response = createMockResponse([
        'event: message',
        'data: {"choices":[{"delta":{"content":"OK"}}]}',
        ': comment',
        'data: [DONE]',
      ]);

      await readStream(response, 'openai', callbacks);
      expect(chunks).toEqual(['OK']);
    });

    it('calls onError when body is null', async () => {
      const response = { body: null } as unknown as Response;
      await readStream(response, 'openai', callbacks);
      expect(callbacks.onError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Response body is null',
      }));
    });

    it('handles malformed JSON gracefully', async () => {
      const response = createMockResponse([
        'data: not-json',
        'data: {"choices":[{"delta":{"content":"OK"}}]}',
        'data: [DONE]',
      ]);

      await readStream(response, 'openai', callbacks);
      expect(chunks).toEqual(['OK']);
    });

    it('includes duration in meta', async () => {
      const response = createMockResponse([
        'data: {"choices":[{"delta":{"content":"Hi"}}]}',
        'data: [DONE]',
      ]);

      await readStream(response, 'openai', callbacks);
      expect(callbacks.onComplete).toHaveBeenCalledWith('Hi', expect.objectContaining({
        duration: expect.any(Number),
      }));
    });

    it('estimates tokens in meta', async () => {
      const response = createMockResponse([
        'data: {"choices":[{"delta":{"content":"Hello world test"}}]}',
        'data: [DONE]',
      ]);

      await readStream(response, 'openai', callbacks);
      const meta = (callbacks.onComplete as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(meta.tokensOut).toBeGreaterThan(0);
    });

    it('respects abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      const response = createMockResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      ]);

      await readStream(response, 'openai', callbacks, controller.signal);
      // Should not report error for abort
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('handles empty delta content', async () => {
      const response = createMockResponse([
        'data: {"choices":[{"delta":{}}]}',
        'data: {"choices":[{"delta":{"content":"OK"}}]}',
        'data: [DONE]',
      ]);

      await readStream(response, 'openai', callbacks);
      expect(chunks).toEqual(['OK']);
    });
  });

  describe('startStream', () => {
    it('returns an AbortController', () => {
      // Mock fetch globally
      globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse([
        'data: {"choices":[{"delta":{"content":"Hi"}}]}',
        'data: [DONE]',
      ]));

      const controller = startStream({
        provider: 'openai',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'Be helpful',
      }, callbacks);

      expect(controller).toBeInstanceOf(AbortController);
    });

    it('calls fetch with correct URL', () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse(['data: [DONE]']));

      startStream({
        provider: 'openai',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'Be helpful',
      }, callbacks);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/ai-proxy',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('uses custom proxy URL', () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse(['data: [DONE]']));

      startStream({
        provider: 'openai',
        model: 'gpt-4o',
        messages: [],
        systemPrompt: '',
      }, callbacks, '/custom/proxy');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/custom/proxy',
        expect.anything()
      );
    });

    it('includes auth token in headers', () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse(['data: [DONE]']));

      startStream({
        provider: 'openai',
        model: 'gpt-4o',
        messages: [],
        systemPrompt: '',
        authToken: 'my-token',
      }, callbacks);

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['Authorization']).toBe('Bearer my-token');
    });

    it('sets skip-auth header when no token', () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse(['data: [DONE]']));

      startStream({
        provider: 'openai',
        model: 'gpt-4o',
        messages: [],
        systemPrompt: '',
      }, callbacks);

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['X-BT-Skip-Auth']).toBe('true');
    });
  });
});
