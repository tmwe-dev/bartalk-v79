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
export { AGENTS, getAgent } from './agents';

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

// ── i18n ──────────────────────────────────────────────────────────────
export { useT } from './i18n';

// ── Utilities (extra) ─────────────────────────────────────────────────
export { formatTime, truncate } from './utils';

// ── Memory ────────────────────────────────────────────────────────────
export { buildMemoryBlock, exportConversationAsMarkdown, generateFullConversationSummary } from './memory';

// ── TTS ───────────────────────────────────────────────────────────────
export { enqueueTTS, resetTTS, stopTTS } from './tts';
export type { EnqueueTTSOptions, EnqueueResult } from './tts';
