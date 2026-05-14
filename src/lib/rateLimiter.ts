/**
 * @module rateLimiter
 * Client-side sliding window rate limiter.
 * Tracks request timestamps per category and enforces per-minute limits
 * to prevent API abuse from the client side.
 */

import { RATE_LIMITS } from './constants';

export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(config: { maxRequests: number; windowMs: number }) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  private cleanup(): void {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
  }

  canProceed(): boolean {
    this.cleanup();
    return this.timestamps.length < this.maxRequests;
  }

  recordRequest(): void {
    this.timestamps.push(Date.now());
  }

  getRemainingRequests(): number {
    this.cleanup();
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  getWaitTimeMs(): number {
    this.cleanup();
    if (this.timestamps.length < this.maxRequests) return 0;
    const oldest = this.timestamps[0];
    return Math.max(0, this.windowMs - (Date.now() - oldest));
  }

  getWaitTimeSeconds(): number {
    return Math.ceil(this.getWaitTimeMs() / 1000);
  }

  reset(): void {
    this.timestamps = [];
  }
}

// Singleton instances — lazy initialization to avoid TDZ errors
// from cross-chunk circular dependencies (index ↔ audio chunks).
// RATE_LIMITS is accessed at first call time, not module evaluation time.

let _aiLimiter: RateLimiter | null = null;
/** Returns the AI rate limiter singleton (lazy-initialized). */
export function getAiLimiter(): RateLimiter {
  if (!_aiLimiter) {
    _aiLimiter = new RateLimiter({
      maxRequests: RATE_LIMITS.aiRequestsPerMinute,
      windowMs: 60_000,
    });
  }
  return _aiLimiter;
}

let _ttsLimiter: RateLimiter | null = null;
/** Returns the TTS rate limiter singleton (lazy-initialized). */
export function getTtsLimiter(): RateLimiter {
  if (!_ttsLimiter) {
    _ttsLimiter = new RateLimiter({
      maxRequests: RATE_LIMITS.ttsRequestsPerMinute,
      windowMs: 60_000,
    });
  }
  return _ttsLimiter;
}
