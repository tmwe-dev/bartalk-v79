import { describe, it, expect } from 'vitest';
import {
  isFeatureAvailable,
  getRequiredTier,
  getLockedFeatures,
  tierLabel,
} from '../../src/lib/featureGating';

describe('featureGating', () => {
  describe('isFeatureAvailable', () => {
    it('chat is available for free tier', () => {
      expect(isFeatureAvailable('chat', 'free')).toBe(true);
    });

    it('tasks is available for free tier', () => {
      expect(isFeatureAvailable('tasks', 'free')).toBe(true);
    });

    it('podcast is NOT available for free tier', () => {
      expect(isFeatureAvailable('podcast', 'free')).toBe(false);
    });

    it('podcast IS available for pro tier', () => {
      expect(isFeatureAvailable('podcast', 'pro')).toBe(true);
    });

    it('courses is available for pro and unlimited', () => {
      expect(isFeatureAvailable('courses', 'pro')).toBe(true);
      expect(isFeatureAvailable('courses', 'unlimited')).toBe(true);
    });

    it('lifetutor is only available for unlimited', () => {
      expect(isFeatureAvailable('lifetutor', 'free')).toBe(false);
      expect(isFeatureAvailable('lifetutor', 'pro')).toBe(false);
      expect(isFeatureAvailable('lifetutor', 'unlimited')).toBe(true);
    });

    it('carousel is only available for unlimited', () => {
      expect(isFeatureAvailable('carousel', 'free')).toBe(false);
      expect(isFeatureAvailable('carousel', 'unlimited')).toBe(true);
    });

    it('unknown features return true (safe default)', () => {
      expect(isFeatureAvailable('unknown_feature', 'free')).toBe(true);
    });
  });

  describe('getRequiredTier', () => {
    it('returns free for chat', () => {
      expect(getRequiredTier('chat')).toBe('free');
    });

    it('returns pro for podcast', () => {
      expect(getRequiredTier('podcast')).toBe('pro');
    });

    it('returns unlimited for lifetutor', () => {
      expect(getRequiredTier('lifetutor')).toBe('unlimited');
    });

    it('returns free for unknown features', () => {
      expect(getRequiredTier('nonexistent')).toBe('free');
    });
  });

  describe('getLockedFeatures', () => {
    it('free tier has several locked features', () => {
      const locked = getLockedFeatures('free');
      expect(locked).toContain('podcast');
      expect(locked).toContain('courses');
      expect(locked).toContain('freevoice');
      expect(locked).toContain('lifetutor');
      expect(locked).toContain('carousel');
    });

    it('pro tier still has lifetutor and carousel locked', () => {
      const locked = getLockedFeatures('pro');
      expect(locked).toContain('lifetutor');
      expect(locked).toContain('carousel');
      expect(locked).not.toContain('podcast');
      expect(locked).not.toContain('courses');
    });

    it('unlimited tier has nothing locked', () => {
      const locked = getLockedFeatures('unlimited');
      expect(locked).toHaveLength(0);
    });
  });

  describe('tierLabel', () => {
    it('returns FREE for free', () => {
      expect(tierLabel('free')).toBe('FREE');
    });

    it('returns PRO for pro', () => {
      expect(tierLabel('pro')).toBe('PRO');
    });

    it('returns UNLIMITED for unlimited', () => {
      expect(tierLabel('unlimited')).toBe('UNLIMITED');
    });
  });
});
