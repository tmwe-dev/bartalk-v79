/**
 * BarTalk v8.2.5 — Library barrel exports
 * Centralizza tutte le esportazioni dei moduli lib.
 */

// ── Error types ────────────────────────────────────────────────────────
export {
  AppError,
  NetworkError,
  ProviderError,
  ValidationError,
  AuthError,
  StorageError,
  isAppError,
  getUserMessage,
} from './errors';

// ── API Service ────────────────────────────────────────────────────────
export {
  apiRequest,
  callAIProvider,
  checkAPIHealth,
} from './apiService';
export type {
  APIRequestConfig,
  APIResponse,
  APIErrorResponse,
  APIResult,
  AIProviderRequest,
  AIProviderResponse,
  HealthResponse,
} from './apiService';

// ── Agents ─────────────────────────────────────────────────────────────
export { AGENTS } from './agents';

// ── Constants ──────────────────────────────────────────────────────────
export { UI, DEFAULT_MODELS, TTS, ORCHESTRATOR, PROXY_URL } from './constants';

// ── Utilities ──────────────────────────────────────────────────────────
export { sanitizeText, validateUserMessage, sanitizeMessages, INPUT_LIMITS } from './sanitize';
export type { ValidationResult } from './sanitize';

// ── Proxy (legacy, prefer apiService) ──────────────────────────────────
export { callProxy } from './proxy';
export type { ProxyRequest, ProxyResponse } from './proxy';
