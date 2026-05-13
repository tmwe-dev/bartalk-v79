/**
 * Tests for src/lib/storage.ts — localStorage CRUD operations
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  isInSkipMode,
  loadAPIKeys,
  saveAPIKeys,
  clearSensitiveLocalData,
  getAPIKey,
  getModel,
  loadCustomVoices,
  saveCustomVoices,
  loadExcludedAgents,
  saveExcludedAgents,
  loadConversationMessages,
  saveConversationMessages,
  loadSettings,
  saveSettings,
  loadStudioRuns,
  saveStudioRuns,
  loadConversationList,
  saveConversationList,
  getCurrentConversationId,
  setCurrentConversationId,
  deleteConversationData,
  searchAllConversations,
  type ConversationMeta,
} from '../../src/lib/storage';

beforeEach(() => {
  localStorage.clear();
});

// ── isInSkipMode ──────────────────────────────────────────────────────

describe('isInSkipMode', () => {
  it('returns false when not set', () => {
    expect(isInSkipMode()).toBe(false);
  });

  it('returns true when set to "true"', () => {
    localStorage.setItem('bartalk_auth_skipped', 'true');
    expect(isInSkipMode()).toBe(true);
  });

  it('returns false for other values', () => {
    localStorage.setItem('bartalk_auth_skipped', 'false');
    expect(isInSkipMode()).toBe(false);
  });
});

// ── API Keys ──────────────────────────────────────────────────────────

describe('loadAPIKeys / saveAPIKeys', () => {
  it('returns empty array when no keys saved', () => {
    expect(loadAPIKeys()).toEqual([]);
  });

  it('saves and loads keys', () => {
    const keys = [
      { provider: 'openai' as const, apiKey: 'sk-123', model: 'gpt-4o' },
      { provider: 'anthropic' as const, apiKey: 'sk-ant-456' },
    ];
    saveAPIKeys(keys);
    expect(loadAPIKeys()).toEqual(keys);
  });

  it('sets keysConfigured flag on save', () => {
    saveAPIKeys([{ provider: 'openai' as const, apiKey: 'sk-123' }]);
    expect(localStorage.getItem('bartalk_keys_configured')).toBe('true');
  });

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('bartalk_api_keys', '{invalid json');
    expect(loadAPIKeys()).toEqual([]);
  });
});

describe('clearSensitiveLocalData', () => {
  it('removes api keys and configured flag', () => {
    saveAPIKeys([{ provider: 'openai' as const, apiKey: 'sk-123' }]);
    expect(localStorage.getItem('bartalk_api_keys')).toBeTruthy();
    expect(localStorage.getItem('bartalk_keys_configured')).toBe('true');

    clearSensitiveLocalData();
    expect(localStorage.getItem('bartalk_api_keys')).toBeNull();
    expect(localStorage.getItem('bartalk_keys_configured')).toBeNull();
  });
});

describe('getAPIKey', () => {
  it('returns null when no keys exist', () => {
    expect(getAPIKey('openai')).toBeNull();
  });

  it('returns the key for matching provider', () => {
    saveAPIKeys([
      { provider: 'openai' as const, apiKey: 'sk-123', model: 'gpt-4o' },
      { provider: 'anthropic' as const, apiKey: 'sk-ant-456' },
    ]);
    expect(getAPIKey('openai')).toBe('sk-123');
    expect(getAPIKey('anthropic')).toBe('sk-ant-456');
  });

  it('returns null for non-existent provider', () => {
    saveAPIKeys([{ provider: 'openai' as const, apiKey: 'sk-123' }]);
    expect(getAPIKey('gemini')).toBeNull();
  });
});

describe('getModel', () => {
  it('returns null when no keys exist', () => {
    expect(getModel('openai')).toBeNull();
  });

  it('returns model for matching provider', () => {
    saveAPIKeys([{ provider: 'openai' as const, apiKey: 'sk-123', model: 'gpt-4o' }]);
    expect(getModel('openai')).toBe('gpt-4o');
  });

  it('returns null when provider has no model', () => {
    saveAPIKeys([{ provider: 'anthropic' as const, apiKey: 'sk-ant-456' }]);
    expect(getModel('anthropic')).toBeNull();
  });
});

// ── Custom Voices ─────────────────────────────────────────────────────

describe('loadCustomVoices / saveCustomVoices', () => {
  it('returns empty object when no voices saved', () => {
    expect(loadCustomVoices()).toEqual({});
  });

  it('saves and loads voices', () => {
    const voices = { albert: 'voice-123', archimede: 'voice-456' };
    saveCustomVoices(voices);
    expect(loadCustomVoices()).toEqual(voices);
  });
});

// ── Excluded Agents ───────────────────────────────────────────────────

describe('loadExcludedAgents / saveExcludedAgents', () => {
  it('returns empty array when none saved', () => {
    expect(loadExcludedAgents()).toEqual([]);
  });

  it('saves and loads excluded agents', () => {
    const excluded = ['albert', 'newton'];
    saveExcludedAgents(excluded);
    expect(loadExcludedAgents()).toEqual(excluded);
  });
});

// ── Conversation Messages ─────────────────────────────────────────────

describe('loadConversationMessages / saveConversationMessages', () => {
  it('returns empty array for unknown conversation', () => {
    expect(loadConversationMessages('unknown-id')).toEqual([]);
  });

  it('saves and loads messages for a conversation', () => {
    const messages = [
      { id: '1', content: 'Hello', senderType: 'human', timestamp: 1000, role: 'user' },
      { id: '2', content: 'Hi there', senderType: 'assistant', timestamp: 2000, role: 'assistant' },
    ];
    saveConversationMessages('conv-1', messages as any);
    expect(loadConversationMessages('conv-1')).toEqual(messages);
  });

  it('isolates messages per conversation', () => {
    saveConversationMessages('conv-1', [{ id: '1', content: 'A' }] as any);
    saveConversationMessages('conv-2', [{ id: '2', content: 'B' }] as any);
    expect(loadConversationMessages('conv-1')).toHaveLength(1);
    expect(loadConversationMessages('conv-2')).toHaveLength(1);
    expect(loadConversationMessages('conv-1')[0].content).toBe('A');
  });
});

// ── Settings ──────────────────────────────────────────────────────────

describe('loadSettings / saveSettings', () => {
  it('returns fallback when no settings saved', () => {
    expect(loadSettings({ theme: 'dark' })).toEqual({ theme: 'dark' });
  });

  it('saves and loads settings', () => {
    const settings = { language: 'en', ttsEnabled: false };
    saveSettings(settings);
    expect(loadSettings({})).toEqual(settings);
  });
});

// ── Studio Runs ───────────────────────────────────────────────────────

describe('loadStudioRuns / saveStudioRuns', () => {
  it('returns empty array when none saved', () => {
    expect(loadStudioRuns()).toEqual([]);
  });

  it('saves and loads runs', () => {
    const runs = [{ id: 'run-1' }, { id: 'run-2' }];
    saveStudioRuns(runs);
    expect(loadStudioRuns()).toEqual(runs);
  });

  it('limits to last 50 runs', () => {
    const runs = Array.from({ length: 60 }, (_, i) => ({ id: `run-${i}` }));
    saveStudioRuns(runs);
    const loaded = loadStudioRuns();
    expect(loaded).toHaveLength(50);
    expect((loaded[0] as any).id).toBe('run-10');
  });
});

// ── Conversation List ─────────────────────────────────────────────────

describe('loadConversationList / saveConversationList', () => {
  it('returns empty array when none saved', () => {
    expect(loadConversationList()).toEqual([]);
  });

  it('saves and loads conversation list', () => {
    const list: ConversationMeta[] = [
      {
        id: 'conv-1',
        title: 'Test Conv',
        turnIndex: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        messageCount: 5,
      },
    ];
    saveConversationList(list);
    expect(loadConversationList()).toEqual(list);
  });
});

// ── Current Conversation ID ───────────────────────────────────────────

describe('getCurrentConversationId / setCurrentConversationId', () => {
  it('returns null when not set', () => {
    expect(getCurrentConversationId()).toBeNull();
  });

  it('sets and gets conversation id', () => {
    setCurrentConversationId('conv-abc');
    expect(getCurrentConversationId()).toBe('conv-abc');
  });
});

// ── deleteConversationData ────────────────────────────────────────────

describe('deleteConversationData', () => {
  it('removes messages and list entry', () => {
    saveConversationMessages('conv-1', [{ id: '1', content: 'test' }] as any);
    saveConversationList([
      { id: 'conv-1', title: 'A', turnIndex: 0, createdAt: '', updatedAt: '', messageCount: 1 },
      { id: 'conv-2', title: 'B', turnIndex: 0, createdAt: '', updatedAt: '', messageCount: 2 },
    ]);

    deleteConversationData('conv-1');

    expect(localStorage.getItem('bartalk_messages_conv-1')).toBeNull();
    const list = loadConversationList();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('conv-2');
  });
});

// ── searchAllConversations ────────────────────────────────────────────

describe('searchAllConversations', () => {
  it('returns empty for short query', () => {
    expect(searchAllConversations('')).toEqual([]);
    expect(searchAllConversations('a')).toEqual([]);
  });

  it('returns empty when no conversations exist', () => {
    expect(searchAllConversations('hello')).toEqual([]);
  });

  it('finds messages matching query', () => {
    saveConversationList([
      { id: 'conv-1', title: 'Test', turnIndex: 0, createdAt: '', updatedAt: '', messageCount: 2 },
    ]);
    localStorage.setItem(
      'bartalk_messages_conv-1',
      JSON.stringify([
        { content: 'Hello world, this is a test message' },
        { content: 'Another hello from the other side' },
      ]),
    );

    const results = searchAllConversations('hello');
    expect(results).toHaveLength(1);
    expect(results[0].convId).toBe('conv-1');
    expect(results[0].matchCount).toBe(2);
    expect(results[0].snippet).toBeTruthy();
  });

  it('is case-insensitive', () => {
    saveConversationList([
      { id: 'conv-1', title: 'Test', turnIndex: 0, createdAt: '', updatedAt: '', messageCount: 1 },
    ]);
    localStorage.setItem(
      'bartalk_messages_conv-1',
      JSON.stringify([{ content: 'HELLO WORLD' }]),
    );

    const results = searchAllConversations('hello');
    expect(results).toHaveLength(1);
  });

  it('skips corrupted conversation data', () => {
    saveConversationList([
      { id: 'conv-bad', title: 'Bad', turnIndex: 0, createdAt: '', updatedAt: '', messageCount: 1 },
    ]);
    localStorage.setItem('bartalk_messages_conv-bad', '{not valid json');

    expect(searchAllConversations('test')).toEqual([]);
  });

  it('skips conversations with no stored messages', () => {
    saveConversationList([
      { id: 'conv-empty', title: 'Empty', turnIndex: 0, createdAt: '', updatedAt: '', messageCount: 0 },
    ]);
    // No messages stored in localStorage for this conversation
    expect(searchAllConversations('test')).toEqual([]);
  });

  it('returns snippet around match', () => {
    saveConversationList([
      { id: 'conv-1', title: 'Test', turnIndex: 0, createdAt: '', updatedAt: '', messageCount: 1 },
    ]);
    const longText = 'A'.repeat(50) + 'target_word' + 'B'.repeat(50);
    localStorage.setItem(
      'bartalk_messages_conv-1',
      JSON.stringify([{ content: longText }]),
    );

    const results = searchAllConversations('target_word');
    expect(results).toHaveLength(1);
    expect(results[0].snippet.length).toBeLessThanOrEqual(80);
    expect(results[0].snippet).toContain('target_word');
  });
});
