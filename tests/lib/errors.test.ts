/**
 * Tests for src/lib/errors.ts — Custom error types and helpers
 */
import { describe, it, expect } from 'vitest';
import {
  AppError,
  NetworkError,
  ProviderError,
  ValidationError,
  AuthError,
  StorageError,
  isAppError,
  getUserMessage,
} from '../../src/lib/errors';

// ── AppError ──────────────────────────────────────────────────────────

describe('AppError', () => {
  it('creates with message, code, status, context', () => {
    const err = new AppError('test error', 'TEST', 418, { foo: 'bar' });
    expect(err.message).toBe('test error');
    expect(err.code).toBe('TEST');
    expect(err.statusCode).toBe(418);
    expect(err.context).toEqual({ foo: 'bar' });
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('defaults statusCode to 500', () => {
    const err = new AppError('msg', 'CODE');
    expect(err.statusCode).toBe(500);
  });
});

// ── NetworkError ──────────────────────────────────────────────────────

describe('NetworkError', () => {
  it('has correct code and status', () => {
    const err = new NetworkError('Connection refused', { url: '/api' });
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.statusCode).toBe(503);
    expect(err.name).toBe('NetworkError');
    expect(err.context).toEqual({ url: '/api' });
    expect(err).toBeInstanceOf(AppError);
  });
});

// ── ProviderError ─────────────────────────────────────────────────────

describe('ProviderError', () => {
  it('stores provider and upstream status', () => {
    const err = new ProviderError('openai', 429, 'Rate limited');
    expect(err.provider).toBe('openai');
    expect(err.upstreamStatus).toBe(429);
    expect(err.message).toBe('Rate limited');
    expect(err.name).toBe('ProviderError');
  });

  it('detects rate limit', () => {
    expect(new ProviderError('openai', 429, 'msg').isRateLimit).toBe(true);
    expect(new ProviderError('openai', 200, 'msg').isRateLimit).toBe(false);
  });

  it('detects auth errors', () => {
    expect(new ProviderError('openai', 401, 'msg').isAuth).toBe(true);
    expect(new ProviderError('openai', 403, 'msg').isAuth).toBe(true);
    expect(new ProviderError('openai', 500, 'msg').isAuth).toBe(false);
  });

  it('maps upstream 5xx to 502', () => {
    expect(new ProviderError('openai', 500, 'msg').statusCode).toBe(502);
    expect(new ProviderError('openai', 503, 'msg').statusCode).toBe(502);
  });

  it('preserves upstream 4xx as statusCode', () => {
    expect(new ProviderError('openai', 401, 'msg').statusCode).toBe(401);
    expect(new ProviderError('openai', 429, 'msg').statusCode).toBe(429);
  });
});

// ── ValidationError ───────────────────────────────────────────────────

describe('ValidationError', () => {
  it('has correct code and status', () => {
    const err = new ValidationError('Invalid input', 'email');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.field).toBe('email');
    expect(err.name).toBe('ValidationError');
  });

  it('works without field', () => {
    const err = new ValidationError('Bad request');
    expect(err.field).toBeUndefined();
    expect(err.context).toBeUndefined();
  });
});

// ── AuthError ─────────────────────────────────────────────────────────

describe('AuthError', () => {
  it('has default message', () => {
    const err = new AuthError();
    expect(err.message).toBe('Autenticazione richiesta');
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe('AuthError');
  });

  it('accepts custom message', () => {
    const err = new AuthError('Token scaduto');
    expect(err.message).toBe('Token scaduto');
  });
});

// ── StorageError ──────────────────────────────────────────────────────

describe('StorageError', () => {
  it('has correct code and status', () => {
    const err = new StorageError('Write failed', { key: 'settings' });
    expect(err.code).toBe('STORAGE_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.context).toEqual({ key: 'settings' });
    expect(err.name).toBe('StorageError');
  });
});

// ── isAppError ────────────────────────────────────────────────────────

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(new AppError('msg', 'CODE'))).toBe(true);
    expect(isAppError(new NetworkError('msg'))).toBe(true);
    expect(isAppError(new ProviderError('openai', 500, 'msg'))).toBe(true);
    expect(isAppError(new ValidationError('msg'))).toBe(true);
    expect(isAppError(new AuthError())).toBe(true);
    expect(isAppError(new StorageError('msg'))).toBe(true);
  });

  it('returns false for non-AppError', () => {
    expect(isAppError(new Error('msg'))).toBe(false);
    expect(isAppError('string')).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError(42)).toBe(false);
  });
});

// ── getUserMessage ────────────────────────────────────────────────────

describe('getUserMessage', () => {
  it('returns rate limit message for 429 ProviderError', () => {
    const msg = getUserMessage(new ProviderError('openai', 429, 'Too many'));
    expect(msg).toContain('Troppe richieste');
  });

  it('returns auth message for 401 ProviderError', () => {
    const msg = getUserMessage(new ProviderError('openai', 401, 'Unauthorized'));
    expect(msg).toContain('openai');
    expect(msg).toContain('non valida');
  });

  it('returns generic provider message for 500 ProviderError', () => {
    const msg = getUserMessage(new ProviderError('anthropic', 500, 'Server error'));
    expect(msg).toContain('anthropic');
    expect(msg).toContain('Riprova');
  });

  it('returns connection message for NetworkError', () => {
    const msg = getUserMessage(new NetworkError('Fetch failed'));
    expect(msg).toContain('connessione');
  });

  it('returns validation message as-is', () => {
    const msg = getUserMessage(new ValidationError('Campo obbligatorio'));
    expect(msg).toBe('Campo obbligatorio');
  });

  it('returns auth message as-is', () => {
    const msg = getUserMessage(new AuthError('Token scaduto'));
    expect(msg).toBe('Token scaduto');
  });

  it('returns message from generic Error', () => {
    const msg = getUserMessage(new Error('Something broke'));
    expect(msg).toBe('Something broke');
  });

  it('returns fallback for non-error', () => {
    const msg = getUserMessage('random string');
    expect(msg).toContain('errore imprevisto');
  });

  it('returns fallback for null', () => {
    const msg = getUserMessage(null);
    expect(msg).toContain('errore imprevisto');
  });
});
