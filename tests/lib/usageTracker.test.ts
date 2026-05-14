/**
 * Tests for src/lib/usageTracker.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  loadUsageStats,
  recordAIUsage,
  recordTTSUsage,
  estimateCost,
  resetUsageStats,
} from '../../src/lib/usageTracker';

describe('usageTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadUsageStats', () => {
    it('returns default stats when nothing saved', () => {
      const stats = loadUsageStats();
      expect(stats.totalTokensIn).toBe(0);
      expect(stats.totalTokensOut).toBe(0);
      expect(stats.totalAIRequests).toBe(0);
      expect(stats.totalTTSRequests).toBe(0);
      expect(stats.totalTTSChars).toBe(0);
      expect(stats.sessionStartTime).toBeTruthy();
    });

    it('returns saved stats', () => {
      localStorage.setItem('bt_usage_stats', JSON.stringify({
        totalTokensIn: 100,
        totalTokensOut: 200,
        totalAIRequests: 5,
        totalTTSRequests: 3,
        totalTTSChars: 1000,
        sessionStartTime: '2024-01-01',
        lastRequestTime: '2024-01-01',
      }));
      const stats = loadUsageStats();
      expect(stats.totalTokensIn).toBe(100);
      expect(stats.totalTokensOut).toBe(200);
    });

    it('handles corrupted localStorage', () => {
      localStorage.setItem('bt_usage_stats', 'bad-json');
      const stats = loadUsageStats();
      expect(stats.totalTokensIn).toBe(0);
    });
  });

  describe('recordAIUsage', () => {
    it('increments token counts', () => {
      recordAIUsage(100, 200);
      const stats = loadUsageStats();
      expect(stats.totalTokensIn).toBe(100);
      expect(stats.totalTokensOut).toBe(200);
    });

    it('increments AI request count', () => {
      recordAIUsage(10, 20);
      recordAIUsage(30, 40);
      const stats = loadUsageStats();
      expect(stats.totalAIRequests).toBe(2);
    });

    it('accumulates tokens across calls', () => {
      recordAIUsage(100, 200);
      recordAIUsage(50, 100);
      const stats = loadUsageStats();
      expect(stats.totalTokensIn).toBe(150);
      expect(stats.totalTokensOut).toBe(300);
    });

    it('updates lastRequestTime', () => {
      recordAIUsage(10, 20);
      const stats = loadUsageStats();
      expect(stats.lastRequestTime).toBeTruthy();
    });
  });

  describe('recordTTSUsage', () => {
    it('increments TTS request count', () => {
      recordTTSUsage(500);
      const stats = loadUsageStats();
      expect(stats.totalTTSRequests).toBe(1);
    });

    it('accumulates TTS characters', () => {
      recordTTSUsage(500);
      recordTTSUsage(300);
      const stats = loadUsageStats();
      expect(stats.totalTTSChars).toBe(800);
    });
  });

  describe('estimateCost', () => {
    it('returns zero cost when no usage', () => {
      const cost = estimateCost();
      expect(cost.usd).toBe(0);
      expect(cost.breakdown.ai).toBe(0);
      expect(cost.breakdown.tts).toBe(0);
    });

    it('calculates AI cost', () => {
      recordAIUsage(500_000, 500_000); // 1M total tokens
      const cost = estimateCost();
      expect(cost.breakdown.ai).toBeGreaterThan(0);
    });

    it('calculates TTS cost', () => {
      recordTTSUsage(10_000); // 10K chars
      const cost = estimateCost();
      expect(cost.breakdown.tts).toBeGreaterThan(0);
    });

    it('total is sum of ai and tts', () => {
      recordAIUsage(100_000, 100_000);
      recordTTSUsage(5000);
      const cost = estimateCost();
      expect(cost.usd).toBe(cost.breakdown.ai + cost.breakdown.tts);
    });
  });

  describe('resetUsageStats', () => {
    it('clears all stats', () => {
      recordAIUsage(100, 200);
      recordTTSUsage(500);
      resetUsageStats();
      const stats = loadUsageStats();
      expect(stats.totalTokensIn).toBe(0);
      expect(stats.totalAIRequests).toBe(0);
    });
  });
});
