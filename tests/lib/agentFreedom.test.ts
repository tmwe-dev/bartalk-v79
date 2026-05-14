/**
 * Tests for src/lib/agentFreedom.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({ supabase: null }));
vi.mock('../../src/lib/dbSync', () => ({
  pushFreedomConfigs: vi.fn().mockResolvedValue(undefined),
}));

import {
  FREEDOM_LEVELS,
  loadFreedomConfigs,
  saveFreedomConfigs,
  getAgentFreedom,
  setAgentFreedom,
  getFreedomPromptAddition,
  applyFreedomModifiers,
} from '../../src/lib/agentFreedom';

describe('agentFreedom', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('FREEDOM_LEVELS', () => {
    it('has all four levels', () => {
      expect(Object.keys(FREEDOM_LEVELS)).toEqual(['strict', 'balanced', 'creative', 'autonomous']);
    });

    it('each level has required properties', () => {
      for (const level of Object.values(FREEDOM_LEVELS)) {
        expect(level).toHaveProperty('label');
        expect(level).toHaveProperty('description');
        expect(level).toHaveProperty('emoji');
        expect(level).toHaveProperty('tempModifier');
        expect(level).toHaveProperty('wordRangeModifier');
        expect(level.wordRangeModifier).toHaveLength(2);
      }
    });

    it('balanced has modifier 1.0', () => {
      expect(FREEDOM_LEVELS.balanced.tempModifier).toBe(1.0);
    });

    it('strict has lower temperature modifier', () => {
      expect(FREEDOM_LEVELS.strict.tempModifier).toBeLessThan(1.0);
    });

    it('creative has higher temperature modifier', () => {
      expect(FREEDOM_LEVELS.creative.tempModifier).toBeGreaterThan(1.0);
    });

    it('autonomous has highest temperature modifier', () => {
      expect(FREEDOM_LEVELS.autonomous.tempModifier).toBeGreaterThan(FREEDOM_LEVELS.creative.tempModifier);
    });
  });

  describe('loadFreedomConfigs / saveFreedomConfigs', () => {
    it('returns empty array when nothing saved', () => {
      expect(loadFreedomConfigs()).toEqual([]);
    });

    it('round-trips configs through storage', () => {
      const configs = [
        { agentId: 'a1', level: 'creative' as const },
        { agentId: 'a2', level: 'strict' as const, customInstructions: 'Be precise' },
      ];
      saveFreedomConfigs(configs);
      expect(loadFreedomConfigs()).toEqual(configs);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('bartalk_agent_freedom', 'not-json');
      expect(loadFreedomConfigs()).toEqual([]);
    });
  });

  describe('getAgentFreedom', () => {
    it('returns balanced as default', () => {
      expect(getAgentFreedom('unknown-agent')).toBe('balanced');
    });

    it('returns saved freedom level', () => {
      saveFreedomConfigs([{ agentId: 'a1', level: 'creative' }]);
      expect(getAgentFreedom('a1')).toBe('creative');
    });
  });

  describe('setAgentFreedom', () => {
    it('saves new config', () => {
      setAgentFreedom('a1', 'strict');
      expect(getAgentFreedom('a1')).toBe('strict');
    });

    it('updates existing config', () => {
      setAgentFreedom('a1', 'strict');
      setAgentFreedom('a1', 'autonomous');
      expect(getAgentFreedom('a1')).toBe('autonomous');
    });

    it('preserves other agent configs', () => {
      setAgentFreedom('a1', 'strict');
      setAgentFreedom('a2', 'creative');
      expect(getAgentFreedom('a1')).toBe('strict');
      expect(getAgentFreedom('a2')).toBe('creative');
    });

    it('stores custom instructions', () => {
      setAgentFreedom('a1', 'creative', 'Be bold');
      const configs = loadFreedomConfigs();
      expect(configs[0].customInstructions).toBe('Be bold');
    });
  });

  describe('getFreedomPromptAddition', () => {
    it('returns empty string for balanced', () => {
      expect(getFreedomPromptAddition('balanced')).toBe('');
    });

    it('returns strict instructions', () => {
      const result = getFreedomPromptAddition('strict');
      expect(result).toContain('RIGOROSA');
    });

    it('returns creative instructions', () => {
      const result = getFreedomPromptAddition('creative');
      expect(result).toContain('CREATIVA');
    });

    it('returns autonomous instructions', () => {
      const result = getFreedomPromptAddition('autonomous');
      expect(result).toContain('AUTONOMA');
    });
  });

  describe('applyFreedomModifiers', () => {
    it('returns unmodified values for balanced agent', () => {
      const result = applyFreedomModifiers('unknown', 0.7, [50, 150]);
      expect(result.temperature).toBe(0.7);
      expect(result.wordRange).toEqual([50, 150]);
    });

    it('reduces temperature for strict agent', () => {
      saveFreedomConfigs([{ agentId: 'a1', level: 'strict' }]);
      const result = applyFreedomModifiers('a1', 1.0, [100, 200]);
      expect(result.temperature).toBeLessThan(1.0);
    });

    it('increases temperature for creative agent', () => {
      saveFreedomConfigs([{ agentId: 'a1', level: 'creative' }]);
      const result = applyFreedomModifiers('a1', 0.7, [50, 150]);
      expect(result.temperature).toBeGreaterThan(0.7);
    });

    it('caps temperature at 2', () => {
      saveFreedomConfigs([{ agentId: 'a1', level: 'autonomous' }]);
      const result = applyFreedomModifiers('a1', 1.8, [50, 150]);
      expect(result.temperature).toBeLessThanOrEqual(2);
    });

    it('rounds word range values', () => {
      saveFreedomConfigs([{ agentId: 'a1', level: 'creative' }]);
      const result = applyFreedomModifiers('a1', 0.7, [50, 150]);
      expect(Number.isInteger(result.wordRange[0])).toBe(true);
      expect(Number.isInteger(result.wordRange[1])).toBe(true);
    });
  });
});
