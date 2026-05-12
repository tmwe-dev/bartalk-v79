/**
 * BarTalk v8 — Client-Side Rate Limiter
 * Sliding window per limitare richieste AI e TTS.
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

// Singleton instances
export const aiLimiter = new RateLimiter({
  maxRequests: RATE_LIMITS.aiRequestsPerMinute,
  windowMs: 60_000,
});

export const ttsLimiter = new RateLimiter({
  maxRequests: RATE_LIMITS.ttsRequestsPerMinute,
  windowMs: 60_000,
});
