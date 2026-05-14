/**
 * @module apiService
 * Type-safe fetch wrapper with structured error handling for API calls.
 * Provides generic request/response types, AI provider calling,
 * and health check functionality with automatic auth header injection.
 */

import {
  AppError,
  NetworkError,
  ProviderError,
  ValidationError,
  AuthError,
  getUserMessage,
} from './errors';
import type { ProviderType } from '../types/agents';

// ── Types ──────────────────────────────────────────────────────────────

export interface APIRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

/** APIResponse interface. */
export interface APIResponse<T = unknown> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

/** APIErrorResponse interface. */
export interface APIErrorResponse {
  ok: false;
  error: AppError;
  userMessage: string;
}

/** APIResult type alias. */
export type APIResult<T = unknown> = APIResponse<T> | APIErrorResponse;

// ── Configuration ──────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 30_000; // 30s

// ── Core fetch wrapper ─────────────────────────────────────────────────

/**
 * Type-safe fetch wrapper that returns structured results instead of throwing.
 * All errors are converted to typed AppError subclasses.
 */
export async function apiRequest<T = unknown>(
  config: APIRequestConfig
): Promise<APIResult<T>> {
  const { url, method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT, signal } = config;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine external signal with timeout
  const combinedSignal = signal
    ? combineAbortSignals(signal, controller.signal)
    : controller.signal;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: combinedSignal,
    };

    if (body !== undefined && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // Parse response body
    const contentType = response.headers.get('content-type') || '';
    let data: T;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text as unknown as T;
    }

    if (!response.ok) {
      const error = classifyHTTPError(response.status, data, url);
      return {
        ok: false,
        error,
        userMessage: getUserMessage(error),
      };
    }

    return {
      ok: true,
      data,
      status: response.status,
      headers: response.headers,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof AppError) {
      return { ok: false, error: err, userMessage: getUserMessage(err) };
    }

    // Abort / timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      const networkErr = new NetworkError('Richiesta interrotta o timeout', {
        url,
        timeout,
      });
      return { ok: false, error: networkErr, userMessage: getUserMessage(networkErr) };
    }

    // Network errors (DNS, refused, offline)
    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
      const networkErr = new NetworkError('Errore di connessione', {
        url,
        originalMessage: err.message,
      });
      return { ok: false, error: networkErr, userMessage: getUserMessage(networkErr) };
    }

    // Unknown errors
    const genericErr = new NetworkError(
      err instanceof Error ? err.message : 'Errore sconosciuto',
      { url }
    );
    return { ok: false, error: genericErr, userMessage: getUserMessage(genericErr) };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── AI Provider request ────────────────────────────────────────────────

/** AIProviderRequest interface. */
export interface AIProviderRequest {
  provider: ProviderType;
  model: string;
  messages: { role: string; content: string }[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  authToken?: string;
}

/** AIProviderResponse interface. */
export interface AIProviderResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  duration: number;
}

/**
 * Calls the AI proxy endpoint with provider-specific error handling.
 * Returns a typed result with either the AI response or a classified error.
 */
export async function callAIProvider(
  req: AIProviderRequest,
  proxyUrl = '/api/ai-proxy'
): Promise<APIResult<AIProviderResponse>> {
  const headers: Record<string, string> = {};

  if (req.authToken) {
    headers['Authorization'] = `Bearer ${req.authToken}`;
  } else {
    headers['X-BT-Skip-Auth'] = 'true';
  }

  const isVaultPlaceholder = !req.apiKey || req.apiKey === '••••••••' || req.apiKey.trim() === '';
  const body: Record<string, unknown> = {
    provider: req.provider,
    model: req.model,
    messages: req.messages,
    systemPrompt: req.systemPrompt,
    temperature: req.temperature ?? 0.7,
    maxTokens: req.maxTokens ?? 2048,
  };

  if (!isVaultPlaceholder) {
    body.apiKey = req.apiKey;
  }

  const result = await apiRequest<AIProviderResponse>({
    url: proxyUrl,
    method: 'POST',
    headers,
    body,
    timeout: 60_000, // AI calls can take longer
  });

  // Reclassify errors as ProviderError when possible
  if (!result.ok && !(result.error instanceof ProviderError)) {
    const status = result.error instanceof AppError ? result.error.statusCode : 500;
    const providerErr = new ProviderError(req.provider, status, result.error.message);
    return { ok: false, error: providerErr, userMessage: getUserMessage(providerErr) };
  }

  return result;
}

// ── Health check ───────────────────────────────────────────────────────

/** HealthResponse interface. */
export interface HealthResponse {
  status: string;
  version: string;
  providers: string[];
  timestamp: string;
}

/**
 * Checks the API health endpoint.
 */
export async function checkAPIHealth(
  proxyUrl = '/api/ai-proxy'
): Promise<APIResult<HealthResponse>> {
  return apiRequest<HealthResponse>({
    url: `${proxyUrl}?health=true`,
    method: 'GET',
    timeout: 10_000,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Classifies HTTP status codes into typed errors.
 */
function classifyHTTPError(status: number, body: unknown, url: string): AppError {
  const message = extractErrorMessage(body) || `HTTP ${status}`;

  switch (true) {
    case status === 400:
      return new ValidationError(message);
    case status === 401:
      return new AuthError(message || 'Autenticazione richiesta');
    case status === 403:
      return new AuthError(message || 'Accesso negato');
    case status === 429:
      return new NetworkError('Troppe richieste. Riprova tra qualche secondo.', {
        url,
        retryAfter: extractRetryAfter(body),
      });
    case status >= 500:
      return new NetworkError(message || 'Errore del server', { url, status });
    default:
      return new AppError(message, 'HTTP_ERROR', status, { url });
  }
}

/**
 * Extracts error message from various response body formats.
 */
function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const obj = body as Record<string, unknown>;
  if (typeof obj.error === 'string') return obj.error;
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.detail === 'string') return obj.detail;
  if (obj.error && typeof obj.error === 'object') {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.message === 'string') return nested.message;
  }
  return '';
}

/**
 * Extracts retry-after value from response body.
 */
function extractRetryAfter(body: unknown): number | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj.retryAfter === 'number') return obj.retryAfter;
  return undefined;
}

/**
 * Combines two AbortSignals — aborts when either fires.
 */
function combineAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([a, b]);
  }
  // Fallback for older browsers
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });
  return controller.signal;
}
