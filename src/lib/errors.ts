/**
 * @module errors
 * Custom error type hierarchy for structured error handling.
 * Defines AppError base class and specialized subtypes: NetworkError,
 * ProviderError, ValidationError, AuthError, StorageError.
 * Includes type guard and user-friendly message extraction.
 */

/** Errore base BarTalk con codice e contesto */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode = 500, context?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

/** Errore di rete (fetch fallito, timeout) */
export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 503, context);
    this.name = 'NetworkError';
  }
}

/** Errore dal provider AI (rate limit, auth, server error) */
export class ProviderError extends AppError {
  readonly provider: string;
  readonly upstreamStatus: number;

  constructor(provider: string, upstreamStatus: number, message: string) {
    super(message, 'PROVIDER_ERROR', upstreamStatus >= 500 ? 502 : upstreamStatus, { provider });
    this.name = 'ProviderError';
    this.provider = provider;
    this.upstreamStatus = upstreamStatus;
  }

  get isRateLimit(): boolean {
    return this.upstreamStatus === 429;
  }

  get isAuth(): boolean {
    return this.upstreamStatus === 401 || this.upstreamStatus === 403;
  }
}

/** Errore di validazione input */
export class ValidationError extends AppError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, field ? { field } : undefined);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/** Errore di autenticazione */
export class AuthError extends AppError {
  constructor(message = 'Autenticazione richiesta') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

/** Errore di storage (localStorage, DB) */
export class StorageError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', 500, context);
    this.name = 'StorageError';
  }
}

/** Type guard: è un AppError? */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/** Converte errore generico in messaggio user-friendly */
export function getUserMessage(err: unknown): string {
  if (err instanceof ProviderError) {
    if (err.isRateLimit) return 'Troppe richieste. Riprova tra qualche secondo.';
    if (err.isAuth) return `Chiave API ${err.provider} non valida o scaduta.`;
    return `Errore dal provider ${err.provider}. Riprova.`;
  }
  if (err instanceof NetworkError) return 'Errore di connessione. Controlla la rete.';
  if (err instanceof ValidationError) return err.message;
  if (err instanceof AuthError) return err.message;
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Si è verificato un errore imprevisto.';
}
