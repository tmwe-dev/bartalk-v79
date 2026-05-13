/**
 * Tests for src/lib/skipModeQuota.ts — Skip mode quota management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadSkipQuota,
  saveSkipQuota,
  initSkipQuota,
  getRemainingQuota,
  getUsagePercent,
  hasExpired,
  getRemainingDays,
  incrementAIUsage,
  incrementTTSUsage,
  incrementCourseUsage,
  isQuotaExceeded,
  isNearQuotaLimit,
  clearSkipQuota,
} from '../../src/lib/skipModeQuota';

beforeEach(() => {
  localStorage.clear();
});

// ── loadSkipQuota / saveSkipQuota ────────────────────────────────────

describe('loadSkipQuota / saveSkipQuota', () => {
  it('returns default quota when nothing saved', () => {
    const q = loadSkipQuota();
    expect(q.aiMessagesUsed).toBe(0);
    expect(q.ttsRequestsUsed).toBe(0);
    expect(q.coursesCreated).toBe(0);
    expect(q.startDate).toBe('');
  });

  it('saves and loads quota', () => {
    const quota = {
      aiMessagesUsed: 10,
      ttsRequestsUsed: 3,
      coursesCreated: 1,
      startDate: '2024-01-01T00:00:00.000Z',
    };
    saveSkipQuota(quota);
    expect(loadSkipQuota()).toEqual(quota);
  });

  it('handles corrupted data gracefully', () => {
    localStorage.setItem('bt_skip_quota', 'not valid json');
    const q = loadSkipQuota();
    expect(q.aiMessagesUsed).toBe(0);
  });
});

// ── initSkipQuota ─────────────────────────────────────────────────────

describe('initSkipQuota', () => {
  it('sets startDate if not already set', () => {
    initSkipQuota();
    const q = loadSkipQuota();
    expect(q.startDate).toBeTruthy();
    expect(new Date(q.startDate).getTime()).toBeGreaterThan(0);
  });

  it('does not overwrite existing quota', () => {
    const existing = {
      aiMessagesUsed: 5,
      ttsRequestsUsed: 2,
      coursesCreated: 1,
      startDate: '2024-01-01T00:00:00.000Z',
    };
    saveSkipQuota(existing);
    initSkipQuota();
    const q = loadSkipQuota();
    expect(q.aiMessagesUsed).toBe(5);
    expect(q.startDate).toBe('2024-01-01T00:00:00.000Z');
  });
});

// ── getRemainingQuota ─────────────────────────────────────────────────

describe('getRemainingQuota', () => {
  it('returns full quota when nothing used', () => {
    const r = getRemainingQuota();
    expect(r.ai).toBeGreaterThan(0);
    expect(r.tts).toBeGreaterThan(0);
    expect(r.courses).toBeGreaterThan(0);
  });

  it('decreases as usage increases', () => {
    const before = getRemainingQuota();
    incrementAIUsage();
    const after = getRemainingQuota();
    expect(after.ai).toBe(before.ai - 1);
  });

  it('never goes below zero', () => {
    saveSkipQuota({
      aiMessagesUsed: 99999,
      ttsRequestsUsed: 99999,
      coursesCreated: 99999,
      startDate: new Date().toISOString(),
    });
    const r = getRemainingQuota();
    expect(r.ai).toBe(0);
    expect(r.tts).toBe(0);
    expect(r.courses).toBe(0);
  });
});

// ── getUsagePercent ───────────────────────────────────────────────────

describe('getUsagePercent', () => {
  it('returns 0 when nothing used', () => {
    expect(getUsagePercent('ai')).toBe(0);
    expect(getUsagePercent('tts')).toBe(0);
    expect(getUsagePercent('courses')).toBe(0);
  });

  it('caps at 100', () => {
    saveSkipQuota({
      aiMessagesUsed: 99999,
      ttsRequestsUsed: 99999,
      coursesCreated: 99999,
      startDate: '',
    });
    expect(getUsagePercent('ai')).toBe(100);
    expect(getUsagePercent('tts')).toBe(100);
    expect(getUsagePercent('courses')).toBe(100);
  });
});

// ── hasExpired ────────────────────────────────────────────────────────

describe('hasExpired', () => {
  it('returns false when no start date', () => {
    expect(hasExpired()).toBe(false);
  });

  it('returns false for recent start date', () => {
    saveSkipQuota({
      aiMessagesUsed: 0,
      ttsRequestsUsed: 0,
      coursesCreated: 0,
      startDate: new Date().toISOString(),
    });
    expect(hasExpired()).toBe(false);
  });

  it('returns true for old start date', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30); // 30 days ago
    saveSkipQuota({
      aiMessagesUsed: 0,
      ttsRequestsUsed: 0,
      coursesCreated: 0,
      startDate: oldDate.toISOString(),
    });
    expect(hasExpired()).toBe(true);
  });
});

// ── getRemainingDays ──────────────────────────────────────────────────

describe('getRemainingDays', () => {
  it('returns full days when no start date', () => {
    const days = getRemainingDays();
    expect(days).toBeGreaterThan(0);
  });

  it('returns reduced days after some time', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    saveSkipQuota({
      aiMessagesUsed: 0,
      ttsRequestsUsed: 0,
      coursesCreated: 0,
      startDate: twoDaysAgo.toISOString(),
    });
    const days = getRemainingDays();
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThan(7); // default expiry is 7 days
  });

  it('returns 0 when expired', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);
    saveSkipQuota({
      aiMessagesUsed: 0,
      ttsRequestsUsed: 0,
      coursesCreated: 0,
      startDate: oldDate.toISOString(),
    });
    expect(getRemainingDays()).toBe(0);
  });
});

// ── increment functions ───────────────────────────────────────────────

describe('increment functions', () => {
  it('incrementAIUsage increases count', () => {
    incrementAIUsage();
    incrementAIUsage();
    expect(loadSkipQuota().aiMessagesUsed).toBe(2);
  });

  it('incrementTTSUsage increases count', () => {
    incrementTTSUsage();
    expect(loadSkipQuota().ttsRequestsUsed).toBe(1);
  });

  it('incrementCourseUsage increases count', () => {
    incrementCourseUsage();
    expect(loadSkipQuota().coursesCreated).toBe(1);
  });
});

// ── isQuotaExceeded ───────────────────────────────────────────────────

describe('isQuotaExceeded', () => {
  it('returns not exceeded when quota available', () => {
    const result = isQuotaExceeded('ai');
    expect(result.exceeded).toBe(false);
    expect(result.message).toBe('');
  });

  it('returns exceeded when AI quota used up', () => {
    saveSkipQuota({
      aiMessagesUsed: 99999,
      ttsRequestsUsed: 0,
      coursesCreated: 0,
      startDate: new Date().toISOString(),
    });
    const result = isQuotaExceeded('ai');
    expect(result.exceeded).toBe(true);
    expect(result.message).toContain('messaggi AI');
  });

  it('returns exceeded when TTS quota used up', () => {
    saveSkipQuota({
      aiMessagesUsed: 0,
      ttsRequestsUsed: 99999,
      coursesCreated: 0,
      startDate: new Date().toISOString(),
    });
    const result = isQuotaExceeded('tts');
    expect(result.exceeded).toBe(true);
    expect(result.message).toContain('vocali');
  });

  it('returns exceeded when courses quota used up', () => {
    saveSkipQuota({
      aiMessagesUsed: 0,
      ttsRequestsUsed: 0,
      coursesCreated: 99999,
      startDate: new Date().toISOString(),
    });
    const result = isQuotaExceeded('courses');
    expect(result.exceeded).toBe(true);
    expect(result.message).toContain('corsi');
  });

  it('returns exceeded when expired', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);
    saveSkipQuota({
      aiMessagesUsed: 0,
      ttsRequestsUsed: 0,
      coursesCreated: 0,
      startDate: oldDate.toISOString(),
    });
    // All types report expired
    expect(isQuotaExceeded('ai').exceeded).toBe(true);
    expect(isQuotaExceeded('tts').exceeded).toBe(true);
    expect(isQuotaExceeded('courses').exceeded).toBe(true);
    expect(isQuotaExceeded('ai').message).toContain('scaduto');
  });
});

// ── isNearQuotaLimit ──────────────────────────────────────────────────

describe('isNearQuotaLimit', () => {
  it('returns false when usage is low', () => {
    expect(isNearQuotaLimit('ai')).toBe(false);
  });

  it('returns true when usage is high', () => {
    saveSkipQuota({
      aiMessagesUsed: 99999,
      ttsRequestsUsed: 0,
      coursesCreated: 0,
      startDate: '',
    });
    expect(isNearQuotaLimit('ai')).toBe(true);
  });
});

// ── clearSkipQuota ────────────────────────────────────────────────────

describe('clearSkipQuota', () => {
  it('removes quota from localStorage', () => {
    initSkipQuota();
    expect(localStorage.getItem('bt_skip_quota')).toBeTruthy();
    clearSkipQuota();
    expect(localStorage.getItem('bt_skip_quota')).toBeNull();
  });
});
