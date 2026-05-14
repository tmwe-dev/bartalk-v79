/**
 * BarTalk v8 — Tests for src/lib/agents.ts
 */
import { describe, it, expect } from 'vitest';
import { AGENTS, getAgent, getAgentByProvider, senderTypeToProvider } from '../../src/lib/agents';

describe('AGENTS', () => {
  it('has 4 agents', () => {
    expect(AGENTS).toHaveLength(4);
  });

  it('each agent has required fields', () => {
    for (const agent of AGENTS) {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.provider).toBeTruthy();
      expect(agent.emoji).toBeTruthy();
      expect(agent.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(agent.defaultModel).toBeTruthy();
      expect(agent.defaultVoiceId).toBeTruthy();
    }
  });

  it('all agent IDs are unique', () => {
    const ids = AGENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains expected agents', () => {
    const names = AGENTS.map(a => a.id);
    expect(names).toContain('albert');
    expect(names).toContain('archimede');
    expect(names).toContain('pitagora');
    expect(names).toContain('newton');
  });
});

describe('getAgent', () => {
  it('finds agent by id', () => {
    expect(getAgent('albert')?.name).toBe('Albert');
  });

  it('finds agent by name (case-insensitive)', () => {
    expect(getAgent('Albert')?.id).toBe('albert');
    expect(getAgent('ARCHIMEDE')?.id).toBe('archimede');
  });

  it('returns undefined for unknown agent', () => {
    expect(getAgent('unknown')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getAgent('')).toBeUndefined();
  });
});

describe('getAgentByProvider', () => {
  it('finds agent by provider', () => {
    expect(getAgentByProvider('openai')?.id).toBe('albert');
    expect(getAgentByProvider('anthropic')?.id).toBe('archimede');
    expect(getAgentByProvider('gemini')?.id).toBe('pitagora');
  });

  it('returns undefined for groq (no agent assigned)', () => {
    expect(getAgentByProvider('groq')).toBeUndefined();
  });
});

describe('senderTypeToProvider', () => {
  it('maps chatgpt to openai', () => {
    expect(senderTypeToProvider('chatgpt')).toBe('openai');
  });

  it('maps claude to anthropic', () => {
    expect(senderTypeToProvider('claude')).toBe('anthropic');
  });

  it('maps openai to openai', () => {
    expect(senderTypeToProvider('openai')).toBe('openai');
  });

  it('is case-insensitive', () => {
    expect(senderTypeToProvider('ChatGPT')).toBe('openai');
    expect(senderTypeToProvider('Claude')).toBe('anthropic');
  });
});
