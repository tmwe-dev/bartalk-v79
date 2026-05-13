/**
 * BarTalk v8.2.5 — Agents Configuration Tests
 * Tests: AGENTS array, getAgent, getAgentByProvider, senderTypeToProvider, providerToSenderType
 */
import { describe, it, expect } from 'vitest';
import {
  AGENTS,
  getAgent,
  getAgentByProvider,
  senderTypeToProvider,
  providerToSenderType,
} from '../../src/lib/agents';

describe('AGENTS array', () => {
  it('has exactly 4 agents', () => {
    expect(AGENTS).toHaveLength(4);
  });

  it('each agent has required fields', () => {
    for (const agent of AGENTS) {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.provider).toBeTruthy();
      expect(agent.emoji).toBeTruthy();
      expect(agent.color).toMatch(/^#/);
      expect(agent.defaultModel).toBeTruthy();
      expect(agent.defaultVoiceId).toBeTruthy();
      expect(agent.staticImage).toBeTruthy();
      expect(agent.talkGif).toBeTruthy();
    }
  });

  it('contains Albert (OpenAI)', () => {
    const albert = AGENTS.find(a => a.id === 'albert');
    expect(albert).toBeDefined();
    expect(albert!.provider).toBe('openai');
    expect(albert!.defaultModel).toContain('gpt');
  });

  it('contains Archimede (Anthropic)', () => {
    const arch = AGENTS.find(a => a.id === 'archimede');
    expect(arch).toBeDefined();
    expect(arch!.provider).toBe('anthropic');
    expect(arch!.defaultModel).toContain('claude');
  });

  it('contains Pitagora (Gemini)', () => {
    const pit = AGENTS.find(a => a.id === 'pitagora');
    expect(pit).toBeDefined();
    expect(pit!.provider).toBe('gemini');
    expect(pit!.defaultModel).toContain('gemini');
  });

  it('contains Newton (xAI)', () => {
    const newton = AGENTS.find(a => a.id === 'newton');
    expect(newton).toBeDefined();
    expect(newton!.provider).toBe('xai');
    expect(newton!.defaultModel).toContain('grok');
  });

  it('all agents have unique IDs', () => {
    const ids = AGENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all agents have unique providers', () => {
    const providers = AGENTS.map(a => a.provider);
    expect(new Set(providers).size).toBe(providers.length);
  });
});

describe('getAgent', () => {
  it('finds agent by id', () => {
    expect(getAgent('albert')?.name).toBe('Albert');
    expect(getAgent('archimede')?.name).toBe('Archimede');
    expect(getAgent('pitagora')?.name).toBe('Pitagora');
    expect(getAgent('newton')?.name).toBe('Newton');
  });

  it('finds agent by name (case insensitive)', () => {
    expect(getAgent('Albert')?.id).toBe('albert');
    expect(getAgent('ARCHIMEDE')?.id).toBe('archimede');
  });

  it('returns undefined for unknown agent', () => {
    expect(getAgent('sconosciuto')).toBeUndefined();
  });
});

describe('getAgentByProvider', () => {
  it('finds agent by provider', () => {
    expect(getAgentByProvider('openai')?.id).toBe('albert');
    expect(getAgentByProvider('anthropic')?.id).toBe('archimede');
    expect(getAgentByProvider('gemini')?.id).toBe('pitagora');
    expect(getAgentByProvider('xai')?.id).toBe('newton');
  });

  it('returns undefined for groq (no agent)', () => {
    expect(getAgentByProvider('groq')).toBeUndefined();
  });
});

describe('senderTypeToProvider', () => {
  it('maps chatgpt → openai', () => {
    expect(senderTypeToProvider('chatgpt')).toBe('openai');
  });

  it('maps openai → openai', () => {
    expect(senderTypeToProvider('openai')).toBe('openai');
  });

  it('maps claude → anthropic', () => {
    expect(senderTypeToProvider('claude')).toBe('anthropic');
  });

  it('maps anthropic → anthropic', () => {
    expect(senderTypeToProvider('anthropic')).toBe('anthropic');
  });

  it('maps groq → groq', () => {
    expect(senderTypeToProvider('groq')).toBe('groq');
  });

  it('maps xai → xai', () => {
    expect(senderTypeToProvider('xai')).toBe('xai');
  });

  it('maps grok → xai', () => {
    expect(senderTypeToProvider('grok')).toBe('xai');
  });

  it('defaults to gemini for unknown', () => {
    expect(senderTypeToProvider('unknown')).toBe('gemini');
  });
});

describe('providerToSenderType', () => {
  it('maps openai → chatgpt', () => {
    expect(providerToSenderType('openai')).toBe('chatgpt');
  });

  it('maps anthropic → claude', () => {
    expect(providerToSenderType('anthropic')).toBe('claude');
  });

  it('maps groq → groq', () => {
    expect(providerToSenderType('groq')).toBe('groq');
  });

  it('maps xai → xai', () => {
    expect(providerToSenderType('xai')).toBe('xai');
  });

  it('defaults to gemini', () => {
    expect(providerToSenderType('gemini')).toBe('gemini');
  });
});
