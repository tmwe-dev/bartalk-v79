/**
 * Tests for src/lib/orchestrator.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../../src/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
vi.mock('../../src/lib/proxy', () => ({
  callProxy: vi.fn().mockResolvedValue({ content: 'Test response', tokensIn: 10, tokensOut: 20, duration: 100 }),
}));
vi.mock('../../src/lib/storage', () => ({
  getAPIKey: vi.fn(() => 'test-key'),
  getModel: vi.fn(() => 'gpt-4o'),
  loadSettings: vi.fn(() => ({})),
}));
vi.mock('../../src/lib/constants', () => ({
  ORCHESTRATOR: {
    forcedConsultationTurns: 2,
    consultationWordRange: [30, 80],
    wordRange: [50, 150],
    maxTokens: 2048,
    defaultTemperature: 0.7,
    temperatureByMode: {
      standard: 0.7,
      consultation: 0.8,
      bar_realtime: 0.9,
    },
    historySlice: {
      standard: 10,
      consultation: 8,
      bar_realtime: 6,
    },
  },
  DEFAULT_MODELS: {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash',
    groq: 'llama-3.3-70b-versatile',
    xai: 'grok-3-mini',
  },
}));
vi.mock('../../src/lib/convergence', () => ({
  analyzeConvergence: vi.fn(() => 'neutral'),
  getConvergenceInstruction: vi.fn(() => ''),
}));
vi.mock('../../src/lib/utils', () => ({
  generateId: vi.fn(() => 'test-turn-id'),
}));
vi.mock('../../src/lib/prompts', () => ({
  buildRichSystemPrompt: vi.fn(() => 'System prompt'),
}));
vi.mock('../../src/lib/memory', () => ({
  buildMemoryMessages: vi.fn((msg: string) => [{ role: 'user', content: msg }]),
  shouldTriggerSummary: vi.fn(() => false),
  generateAutoSummary: vi.fn().mockResolvedValue(null),
}));

import { orchestrate } from '../../src/lib/orchestrator';
import { callProxy } from '../../src/lib/proxy';
import type { AgentConfig } from '../../src/types/agents';

const makeAgent = (id: string, name: string, provider = 'openai' as const): AgentConfig => ({
  id,
  name,
  provider,
  personality: 'Test personality',
  style: 'analitico' as AgentConfig['style'],
  voiceId: '',
  color: '#000',
  avatar: '',
  enabled: true,
});

describe('orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('orchestrate', () => {
    it('returns empty responses when no agents enabled', async () => {
      const result = await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 0,
        enabledAgents: [],
        mode: 'consultation',
        conversationId: 'conv-1',
      });
      expect(result.responses).toEqual([]);
      expect(result.newTurnIndex).toBe(0);
      expect(result.convergence).toBe('neutral');
      expect(result.turnId).toBe('test-turn-id');
    });

    it('increments turnIndex by 1', async () => {
      const result = await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 5,
        enabledAgents: [makeAgent('a1', 'Albert')],
        mode: 'standard',
        conversationId: 'conv-1',
      });
      expect(result.newTurnIndex).toBe(6);
    });

    it('calls callProxy for each agent in consultation mode', async () => {
      const agents = [makeAgent('a1', 'Albert'), makeAgent('a2', 'Archimede')];
      await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 0,
        enabledAgents: agents,
        mode: 'consultation',
        conversationId: 'conv-1',
      });
      // forced consultation at turnIndex 0 means all agents speak
      expect(callProxy).toHaveBeenCalledTimes(2);
    });

    it('calls onAgentResponse callback for each response', async () => {
      const callback = vi.fn();
      await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 0,
        enabledAgents: [makeAgent('a1', 'Albert')],
        mode: 'consultation',
        conversationId: 'conv-1',
      }, callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        agentName: 'Albert',
        content: 'Test response',
      }));
    });

    it('returns agent responses with correct metadata', async () => {
      const result = await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 0,
        enabledAgents: [makeAgent('a1', 'Albert')],
        mode: 'consultation',
        conversationId: 'conv-1',
      });
      expect(result.responses).toHaveLength(1);
      expect(result.responses[0]).toMatchObject({
        agentName: 'Albert',
        provider: 'openai',
        content: 'Test response',
        isDemo: false,
      });
    });

    it('handles proxy errors gracefully with user-friendly messages', async () => {
      vi.mocked(callProxy).mockResolvedValueOnce({
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        duration: 0,
        error: '429 Too Many Requests',
      });
      const result = await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 0,
        enabledAgents: [makeAgent('a1', 'Albert')],
        mode: 'consultation',
        conversationId: 'conv-1',
      });
      expect(result.responses).toHaveLength(1);
      expect(result.responses[0].content).toContain('troppe richieste');
      expect(result.responses[0].error).toBe('429 Too Many Requests');
    });

    it('forces consultation mode for early turns', async () => {
      const agents = [makeAgent('a1', 'Albert'), makeAgent('a2', 'Archimede')];
      // turnIndex=1 < forcedConsultationTurns=2, so both should speak even in standard
      await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 1,
        enabledAgents: agents,
        mode: 'standard',
        conversationId: 'conv-1',
      });
      expect(callProxy).toHaveBeenCalledTimes(2);
    });

    it('only calls one agent in standard mode after forced turns', async () => {
      const agents = [makeAgent('a1', 'Albert'), makeAgent('a2', 'Archimede')];
      await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 5,
        enabledAgents: agents,
        mode: 'standard',
        turnStrategy: 'round_robin',
        conversationId: 'conv-1',
      });
      expect(callProxy).toHaveBeenCalledTimes(1);
    });

    it('handles taskContext as a function', async () => {
      const taskCtx = vi.fn((agentId: string) => `context for ${agentId}`);
      await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 0,
        enabledAgents: [makeAgent('a1', 'Albert')],
        mode: 'consultation',
        conversationId: 'conv-1',
        taskContext: taskCtx,
      });
      expect(taskCtx).toHaveBeenCalledWith('a1');
    });

    it('handles 401 auth errors with friendly message', async () => {
      vi.mocked(callProxy).mockResolvedValueOnce({
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        duration: 0,
        error: '401 Unauthorized invalid key',
      });
      const result = await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 0,
        enabledAgents: [makeAgent('a1', 'Albert')],
        mode: 'consultation',
        conversationId: 'conv-1',
      });
      expect(result.responses[0].content).toContain('autenticarsi');
    });

    it('handles network errors with friendly message', async () => {
      vi.mocked(callProxy).mockResolvedValueOnce({
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        duration: 0,
        error: 'network fetch failed timeout',
      });
      const result = await orchestrate({
        userMessage: 'Hello',
        messages: [],
        turnIndex: 0,
        enabledAgents: [makeAgent('a1', 'Albert')],
        mode: 'consultation',
        conversationId: 'conv-1',
      });
      expect(result.responses[0].content).toContain('connettersi');
    });
  });
});
