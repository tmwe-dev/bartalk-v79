/**
 * @module streaming
 * SSE (Server-Sent Events) streaming response handler.
 * Provides utilities for reading SSE streams from AI providers,
 * with callbacks for tokens, completion, and errors.
 */

import type { ProviderType } from '../types/agents';

// ── Types ──────────────────────────────────────────────────────────────

export interface StreamCallbacks {
  /** Called for each text chunk received */
  onChunk: (text: string) => void;
  /** Called when streaming completes with full content */
  onComplete: (fullContent: string, meta: StreamMeta) => void;
  /** Called on error */
  onError: (error: Error) => void;
}

export interface StreamMeta {
  tokensIn: number;
  tokensOut: number;
  duration: number;
  provider: ProviderType;
}

export interface StreamRequest {
  provider: ProviderType;
  model: string;
  messages: { role: string; content: string }[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  authToken?: string;
}

// ── SSE Line Parser ────────────────────────────────────────────────────

/**
 * Parses an SSE event line.
 * Returns the data field content, or null if not a data line.
 */
function parseSSELine(line: string): string | null {
  if (line.startsWith('data: ')) {
    const data = line.slice(6).trim();
    if (data === '[DONE]') return null;
    return data;
  }
  return null;
}

/**
 * Extract text content from a streaming chunk (OpenAI-compatible format).
 */
function extractChunkText(json: string): string {
  try {
    const parsed = JSON.parse(json);
    // OpenAI / Groq / xAI format
    const delta = parsed.choices?.[0]?.delta;
    if (delta?.content) return delta.content;
    // Anthropic format
    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
      return parsed.delta.text;
    }
    return '';
  } catch {
    return '';
  }
}

// ── Stream Reader ──────────────────────────────────────────────────────

/**
 * Reads a streaming response and calls callbacks for each chunk.
 * Works with any ReadableStream<Uint8Array>.
 * Can be aborted via AbortController.
 */
export async function readStream(
  response: Response,
  provider: ProviderType,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const startTime = Date.now();
  let fullContent = '';

  if (!response.body) {
    callbacks.onError(new Error('Response body is null'));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const data = parseSSELine(trimmed);
        if (data === null) continue; // [DONE] or non-data line

        const text = extractChunkText(data);
        if (text) {
          fullContent += text;
          callbacks.onChunk(text);
        }
      }
    }

    callbacks.onComplete(fullContent, {
      tokensIn: 0,  // Not available in streaming mode
      tokensOut: Math.ceil(fullContent.length / 4), // Rough estimate
      duration: Date.now() - startTime,
      provider,
    });
  } catch (err) {
    if (signal?.aborted) return; // Don't report abort as error
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Initiates a streaming request to the AI proxy.
 * Returns an AbortController to cancel the stream.
 */
export function startStream(
  req: StreamRequest,
  callbacks: StreamCallbacks,
  proxyUrl = '/api/ai-proxy'
): AbortController {
  const controller = new AbortController();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (req.authToken) {
    headers['Authorization'] = `Bearer ${req.authToken}`;
  } else {
    headers['X-BT-Skip-Auth'] = 'true';
  }

  const body = JSON.stringify({
    provider: req.provider,
    model: req.model,
    messages: req.messages,
    systemPrompt: req.systemPrompt,
    temperature: req.temperature ?? 0.7,
    maxTokens: req.maxTokens ?? 2048,
    stream: true,
    ...(req.apiKey && req.apiKey !== '••••••••' ? { apiKey: req.apiKey } : {}),
  });

  fetch(proxyUrl, {
    method: 'POST',
    headers,
    body,
    signal: controller.signal,
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return readStream(response, req.provider, callbacks, controller.signal);
    })
    .catch(err => {
      if (!controller.signal.aborted) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });

  return controller;
}
