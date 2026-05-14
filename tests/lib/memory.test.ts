/**
 * BarTalk v8 — Tests for src/lib/memory.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadMemoryConfig, saveMemoryConfig, resetMemoryConfig, getMemoryConfig,
  buildMemoryBlock, buildMemoryMessages, shouldTriggerSummary,
  loadSummaries, saveSummary, deleteSummaries,
  exportConversationAsText, exportConversationAsMarkdown,
  MEMORY_CONFIG,
} from '../../src/lib/memory';
import type { Message } from '../../src/types/conversation';

vi.mock('../../src/lib/proxy', () => ({
  callProxy: vi.fn(),
}));

vi.mock('../../src/lib/storage', () => ({
  getAPIKey: vi.fn(() => ''),
  getModel: vi.fn(() => ''),
}));

vi.mock('../../src/lib/constants', () => ({
  DEFAULT_MODELS: { openai: 'gpt-4o', anthropic: 'claude-sonnet-4-20250514', gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile' },
}));

function makeMsg(content: string, senderType: 'human' | 'assistant' = 'assistant', senderName = 'Albert'): Message {
  return {
    id: crypto.randomUUID(),
    content,
    senderType,
    senderName,
    createdAt: new Date().toISOString(),
  } as Message;
}

describe('Memory Config', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadMemoryConfig returns defaults', () => {
    const config = loadMemoryConfig();
    expect(config.fullDetailCount).toBe(20);
    expect(config.condensedCount).toBe(20);
    expect(config.summaryTrigger).toBe(20);
  });

  it('saveMemoryConfig persists overrides', () => {
    saveMemoryConfig({ fullDetailCount: 30 });
    const config = loadMemoryConfig();
    expect(config.fullDetailCount).toBe(30);
    expect(config.condensedCount).toBe(20); // unchanged
  });

  it('resetMemoryConfig restores defaults', () => {
    saveMemoryConfig({ fullDetailCount: 30 });
    resetMemoryConfig();
    expect(loadMemoryConfig().fullDetailCount).toBe(20);
  });

  it('getMemoryConfig returns current config', () => {
    const config = getMemoryConfig();
    expect(config).toEqual(loadMemoryConfig());
  });

  it('MEMORY_CONFIG is the default', () => {
    expect(MEMORY_CONFIG.fullDetailCount).toBe(20);
  });
});

describe('Summaries Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSummaries returns empty array for unknown conversation', () => {
    expect(loadSummaries('unknown')).toEqual([]);
  });

  it('saveSummary and loadSummaries roundtrip', () => {
    const summary = {
      id: 'sum1',
      conversationId: 'conv1',
      content: 'Test summary',
      messageRange: [0, 10] as [number, number],
      createdAt: new Date().toISOString(),
    };
    saveSummary(summary);
    const loaded = loadSummaries('conv1');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].content).toBe('Test summary');
  });

  it('deleteSummaries removes conversation summaries', () => {
    saveSummary({
      id: 'sum1',
      conversationId: 'conv1',
      content: 'Test',
      messageRange: [0, 5] as [number, number],
      createdAt: new Date().toISOString(),
    });
    deleteSummaries('conv1');
    expect(loadSummaries('conv1')).toEqual([]);
  });
});

describe('buildMemoryBlock', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds block with stats for small conversation', () => {
    const msgs = Array.from({ length: 5 }, (_, i) => makeMsg(`Message ${i}`));
    const block = buildMemoryBlock(msgs, 'conv1');

    expect(block.full).toHaveLength(5);
    expect(block.condensed).toHaveLength(0);
    expect(block.summary).toBe('');
    expect(block.stats.totalMessages).toBe(5);
    expect(block.stats.level1Count).toBe(5);
  });

  it('splits into L1 and L2 for larger conversations', () => {
    const msgs = Array.from({ length: 30 }, (_, i) => makeMsg(`Message ${i}`));
    const block = buildMemoryBlock(msgs, 'conv1');

    expect(block.stats.level1Count).toBe(20); // fullDetailCount default
    expect(block.stats.level2Count).toBe(10); // remaining
    expect(block.stats.totalMessages).toBe(30);
  });

  it('includes summary from saved summaries', () => {
    saveSummary({
      id: 'sum1',
      conversationId: 'conv1',
      content: 'Previous discussion about AI.',
      messageRange: [0, 10] as [number, number],
      createdAt: new Date().toISOString(),
    });
    const msgs = Array.from({ length: 5 }, (_, i) => makeMsg(`Message ${i}`));
    const block = buildMemoryBlock(msgs, 'conv1');
    expect(block.summary).toContain('Previous discussion');
  });
});

describe('buildMemoryMessages', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds user message at the end', () => {
    const msgs = [makeMsg('context message')];
    const result = buildMemoryMessages('new question', msgs, 'conv1');
    expect(result[result.length - 1].content).toBe('new question');
    expect(result[result.length - 1].role).toBe('user');
  });

  it('includes full messages for small conversations', () => {
    const msgs = Array.from({ length: 3 }, (_, i) =>
      makeMsg(`msg ${i}`, i % 2 === 0 ? 'assistant' : 'human')
    );
    const result = buildMemoryMessages('question', msgs, 'conv1');
    expect(result.length).toBe(4); // 3 context + 1 user
  });
});

describe('shouldTriggerSummary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false for short conversations', () => {
    const msgs = Array.from({ length: 10 }, (_, i) => makeMsg(`msg ${i}`));
    expect(shouldTriggerSummary(msgs, 'conv1')).toBe(false);
  });

  it('returns true when enough messages since last summary', () => {
    const msgs = Array.from({ length: 25 }, (_, i) => makeMsg(`msg ${i}`));
    expect(shouldTriggerSummary(msgs, 'conv1')).toBe(true);
  });

  it('returns false right after a summary', () => {
    const msgs = Array.from({ length: 25 }, (_, i) => makeMsg(`msg ${i}`));
    saveSummary({
      id: 'sum1',
      conversationId: 'conv1',
      content: 'Summary',
      messageRange: [0, 20] as [number, number],
      createdAt: new Date().toISOString(),
    });
    expect(shouldTriggerSummary(msgs, 'conv1')).toBe(false);
  });
});

describe('exportConversationAsText', () => {
  it('exports messages with headers', () => {
    const msgs = [
      makeMsg('Ciao!', 'human', 'Utente'),
      makeMsg('Benvenuto!', 'assistant', 'Albert'),
    ];
    const result = exportConversationAsText(msgs, 'Test Conversation');
    expect(result).toContain('# Test Conversation');
    expect(result).toContain('Messaggi: 2');
    expect(result).toContain('Benvenuto!');
  });

  it('handles empty messages', () => {
    const result = exportConversationAsText([], 'Empty');
    expect(result).toContain('Messaggi: 0');
  });
});

describe('exportConversationAsMarkdown', () => {
  it('is an alias for exportConversationAsText', () => {
    const msgs = [makeMsg('test')];
    expect(exportConversationAsMarkdown(msgs, 'T')).toBe(exportConversationAsText(msgs, 'T'));
  });
});
