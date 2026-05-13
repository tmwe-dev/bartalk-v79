import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../../src/lib/rateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 60_000 });
  });

  describe('canProceed', () => {
    it('returns true when no requests have been made', () => {
      expect(limiter.canProceed()).toBe(true);
    });

    it('returns true when under the limit', () => {
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.canProceed()).toBe(true);
    });

    it('returns false when at the limit', () => {
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.canProceed()).toBe(false);
    });
  });

  describe('getRemainingRequests', () => {
    it('returns maxRequests initially', () => {
      expect(limiter.getRemainingRequests()).toBe(3);
    });

    it('decreases as requests are recorded', () => {
      limiter.recordRequest();
      expect(limiter.getRemainingRequests()).toBe(2);
      limiter.recordRequest();
      expect(limiter.getRemainingRequests()).toBe(1);
    });

    it('never returns negative', () => {
      for (let i = 0; i < 10; i++) limiter.recordRequest();
      expect(limiter.getRemainingRequests()).toBe(0);
    });
  });

  describe('getWaitTimeMs', () => {
    it('returns 0 when under the limit', () => {
      expect(limiter.getWaitTimeMs()).toBe(0);
    });

    it('returns positive value when at the limit', () => {
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getWaitTimeMs()).toBeGreaterThan(0);
    });
  });

  describe('getWaitTimeSeconds', () => {
    it('returns ceiling of ms/1000', () => {
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      const seconds = limiter.getWaitTimeSeconds();
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThanOrEqual(60);
    });
  });

  describe('reset', () => {
    it('clears all timestamps', () => {
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.canProceed()).toBe(false);
      limiter.reset();
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.getRemainingRequests()).toBe(3);
    });
  });

  describe('sliding window cleanup', () => {
    it('allows requests after window expires', () => {
      const shortLimiter = new RateLimiter({ maxRequests: 1, windowMs: 100 });
      shortLimiter.recordRequest();
      expect(shortLimiter.canProceed()).toBe(false);

      // Fake time advancement by manipulating timestamps
      vi.useFakeTimers();
      vi.advanceTimersByTime(150);
      expect(shortLimiter.canProceed()).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('constructor configs', () => {
    it('respects custom maxRequests', () => {
      const l = new RateLimiter({ maxRequests: 100, windowMs: 1000 });
      expect(l.getRemainingRequests()).toBe(100);
    });
  });
});
