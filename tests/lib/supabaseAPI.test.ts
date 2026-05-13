/**
 * Tests for src/lib/supabaseAPI.ts — Supabase database operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a chainable mock for Supabase query builder
function createQueryBuilder(resolvedValue: { data: any; error: any }) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  };
  // Make builder itself resolve to the value (for non-single queries)
  builder[Symbol.toStringTag] = 'Promise';
  // Override then for promise-like chaining on the builder itself
  return builder;
}

let mockQueryResult: { data: any; error: any };
let mockFrom: any;

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import {
  getWorkspace,
  loadSettings,
  saveSettings,
  loadAPIKeys,
  saveAPIKey,
  deleteAPIKey,
  loadConversations,
  saveConversation,
  deleteConversation,
  loadMessages,
  saveMessage,
  saveMessagesBatch,
  logAudit,
  searchMessages,
} from '../../src/lib/supabaseAPI';

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = { data: null, error: null };
});

// Helper to set up mockFrom with a query builder that resolves to given result
function setupMock(result: { data: any; error: any }) {
  const builder = createQueryBuilder(result);
  mockFrom = vi.fn().mockReturnValue(builder);
  return builder;
}

// ── getWorkspace ──────────────────────────────────────────────────────

describe('getWorkspace', () => {
  it('returns workspace data on success', async () => {
    const wsData = { id: 'ws-1', user_id: 'user-1', name: 'Default', created_at: '', updated_at: '' };
    setupMock({ data: wsData, error: null });

    const result = await getWorkspace('user-1');
    expect(result).toEqual(wsData);
    expect(mockFrom).toHaveBeenCalledWith('workspaces');
  });

  it('returns null on error', async () => {
    setupMock({ data: null, error: { message: 'Not found' } });

    const result = await getWorkspace('user-1');
    expect(result).toBeNull();
  });
});

// ── loadSettings ──────────────────────────────────────────────────────

describe('loadSettings', () => {
  it('returns settings on success', async () => {
    const settings = { id: 's-1', workspace_id: 'ws-1', language: 'it' };
    setupMock({ data: settings, error: null });

    const result = await loadSettings('ws-1');
    expect(result).toEqual(settings);
  });

  it('returns null when no rows found', async () => {
    setupMock({ data: null, error: { code: 'PGRST116', message: 'No rows' } });

    const result = await loadSettings('ws-1');
    expect(result).toBeNull();
  });

  it('returns null on other errors', async () => {
    setupMock({ data: null, error: { message: 'DB error' } });

    const result = await loadSettings('ws-1');
    expect(result).toBeNull();
  });
});

// ── saveSettings ──────────────────────────────────────────────────────

describe('saveSettings', () => {
  it('calls upsert with workspace_id and settings', async () => {
    const builder = setupMock({ data: null, error: null });

    await saveSettings('ws-1', { language: 'en' as any });
    expect(mockFrom).toHaveBeenCalledWith('user_settings');
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'ws-1',
        language: 'en',
      }),
      { onConflict: 'workspace_id' },
    );
  });
});

// ── loadAPIKeys ───────────────────────────────────────────────────────

describe('loadAPIKeys', () => {
  it('returns keys on success', async () => {
    const keys = [{ id: 'k-1', provider: 'openai', encrypted_key: 'enc' }];
    // For non-single queries, the builder resolves as a promise
    const builder = createQueryBuilder({ data: keys, error: null });
    // Override builder's then to resolve the whole builder promise chain
    let resolveData = { data: keys, error: null };
    builder.eq = vi.fn().mockReturnValue({
      then: (resolve: any) => Promise.resolve(resolveData).then(resolve),
    });
    builder.select = vi.fn().mockReturnValue(builder);
    mockFrom = vi.fn().mockReturnValue(builder);

    const result = await loadAPIKeys('ws-1');
    expect(result).toEqual(keys);
  });

  it('returns empty array on error', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'err' } });
    builder.eq = vi.fn().mockReturnValue({
      then: (resolve: any) => Promise.resolve({ data: null, error: { message: 'err' } }).then(resolve),
    });
    builder.select = vi.fn().mockReturnValue(builder);
    mockFrom = vi.fn().mockReturnValue(builder);

    const result = await loadAPIKeys('ws-1');
    expect(result).toEqual([]);
  });
});

// ── saveAPIKey ────────────────────────────────────────────────────────

describe('saveAPIKey', () => {
  it('calls upsert with key data', async () => {
    const builder = setupMock({ data: null, error: null });

    await saveAPIKey('ws-1', 'openai', 'encrypted-value', 'gpt-4o');
    expect(mockFrom).toHaveBeenCalledWith('api_keys_vault');
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'ws-1',
        provider: 'openai',
        encrypted_key: 'encrypted-value',
        model: 'gpt-4o',
      }),
      { onConflict: 'workspace_id,provider' },
    );
  });

  it('uses null model when not provided', async () => {
    const builder = setupMock({ data: null, error: null });

    await saveAPIKey('ws-1', 'openai', 'encrypted');
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ model: null }),
      expect.any(Object),
    );
  });
});

// ── deleteAPIKey ──────────────────────────────────────────────────────

describe('deleteAPIKey', () => {
  it('calls delete with correct filters', async () => {
    const builder = setupMock({ data: null, error: null });

    await deleteAPIKey('ws-1', 'openai');
    expect(mockFrom).toHaveBeenCalledWith('api_keys_vault');
    expect(builder.delete).toHaveBeenCalled();
    // eq is called twice: workspace_id and provider
    expect(builder.eq).toHaveBeenCalledTimes(2);
  });
});

// ── loadConversations ─────────────────────────────────────────────────

describe('loadConversations', () => {
  it('returns conversations on success', async () => {
    const convs = [{ id: 'c-1', title: 'Test' }];
    const builder = createQueryBuilder({ data: convs, error: null });
    builder.order = vi.fn().mockReturnValue({
      then: (resolve: any) => Promise.resolve({ data: convs, error: null }).then(resolve),
    });
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.select = vi.fn().mockReturnValue(builder);
    mockFrom = vi.fn().mockReturnValue(builder);

    const result = await loadConversations('ws-1');
    expect(result).toEqual(convs);
  });
});

// ── saveConversation ──────────────────────────────────────────────────

describe('saveConversation', () => {
  it('upserts conversation', async () => {
    const builder = setupMock({ data: null, error: null });

    await saveConversation('ws-1', { id: 'c-1', title: 'Test', turn_index: 3 });
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'c-1',
        workspace_id: 'ws-1',
        title: 'Test',
        turn_index: 3,
      }),
    );
  });
});

// ── deleteConversation ────────────────────────────────────────────────

describe('deleteConversation', () => {
  it('deletes by conversation id', async () => {
    const builder = setupMock({ data: null, error: null });

    await deleteConversation('c-1');
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'c-1');
  });
});

// ── loadMessages ──────────────────────────────────────────────────────

describe('loadMessages', () => {
  it('returns messages on success', async () => {
    const msgs = [{ id: 'm-1', content: 'Hello' }];
    const builder = createQueryBuilder({ data: msgs, error: null });
    builder.order = vi.fn().mockReturnValue({
      then: (resolve: any) => Promise.resolve({ data: msgs, error: null }).then(resolve),
    });
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.select = vi.fn().mockReturnValue(builder);
    mockFrom = vi.fn().mockReturnValue(builder);

    const result = await loadMessages('c-1');
    expect(result).toEqual(msgs);
  });
});

// ── saveMessage ───────────────────────────────────────────────────────

describe('saveMessage', () => {
  it('inserts message with correct fields', async () => {
    const builder = setupMock({ data: null, error: null });

    const msg = {
      conversation_id: 'c-1',
      sender_type: 'assistant' as const,
      agent_name: 'Albert',
      provider: 'openai',
      content: 'Hello',
      tokens_in: 10,
      tokens_out: 20,
      duration_ms: 500,
      is_demo: false,
      metadata: {},
    };

    await saveMessage('c-1', msg);
    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'c-1',
        sender_type: 'assistant',
        agent_name: 'Albert',
        content: 'Hello',
      }),
    );
  });
});

// ── saveMessagesBatch ─────────────────────────────────────────────────

describe('saveMessagesBatch', () => {
  it('inserts multiple messages', async () => {
    const builder = setupMock({ data: null, error: null });

    const msgs = [
      {
        conversation_id: 'c-1',
        sender_type: 'human' as const,
        agent_name: null,
        provider: null,
        content: 'Hi',
        tokens_in: 0,
        tokens_out: 0,
        duration_ms: 0,
        is_demo: false,
        metadata: {},
      },
      {
        conversation_id: 'c-1',
        sender_type: 'assistant' as const,
        agent_name: 'Albert',
        provider: 'openai',
        content: 'Hello',
        tokens_in: 5,
        tokens_out: 10,
        duration_ms: 300,
        is_demo: false,
        metadata: {},
      },
    ];

    await saveMessagesBatch('c-1', msgs);
    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(builder.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ content: 'Hi' }),
        expect.objectContaining({ content: 'Hello' }),
      ]),
    );
  });
});

// ── logAudit ──────────────────────────────────────────────────────────

describe('logAudit', () => {
  it('inserts audit log entry', async () => {
    const builder = setupMock({ data: null, error: null });

    await logAudit('ws-1', 'settings_changed', { field: 'language' });
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'ws-1',
        action: 'settings_changed',
        details: { field: 'language' },
      }),
    );
  });

  it('uses empty object when details not provided', async () => {
    const builder = setupMock({ data: null, error: null });

    await logAudit('ws-1', 'login');
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ details: {} }),
    );
  });
});

// ── searchMessages ────────────────────────────────────────────────────

describe('searchMessages', () => {
  it('returns empty for short query', async () => {
    const result = await searchMessages('ws-1', 'a');
    expect(result).toEqual([]);
  });

  it('returns empty for empty query', async () => {
    const result = await searchMessages('ws-1', '');
    expect(result).toEqual([]);
  });
});
