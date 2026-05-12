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

// ── API Key Resolver ──────────────────────────────────────────────────
export { resolveApiKey, resolveApiKeyOrThrow, PRIORITY_ORDERS } from './apiKeyResolver';
export type { ResolvedApiKey } from './apiKeyResolver';

// ── Auth Token ────────────────────────────────────────────────────────
export { buildAuthHeaders, buildAuthHeadersAsync, getAuthToken, getAuthTokenAsync } from './authToken';

// ── Feature Gating ────────────────────────────────────────────────────
export { isFeatureAvailable, getRequiredTier, getLockedFeatures, tierLabel } from './featureGating';
export type { UserTier } from './featureGating';

// ── Maestro Engine ────────────────────────────────────────────────────
export { generateTeachingResponse, generateWelcomeMessage } from './maestroEngine';

// ── Assessment Engine ─────────────────────────────────────────────────
export { evaluateAnswers, getScoreInfo, shouldUnlockNext, PASS_THRESHOLD } from './assessmentEngine';
