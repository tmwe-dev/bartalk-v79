/**
 * Tests for src/lib/keysAPI.ts — API key vault client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase module
const mockGetSession = vi.fn();

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

import { listVaultKeys, saveVaultKey, deleteVaultKey } from '../../src/lib/keysAPI';

beforeEach(() => {
  vi.restoreAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token-123' } },
  });
});

// ── listVaultKeys ─────────────────────────────────────────────────────

describe('listVaultKeys', () => {
  it('returns keys from successful response', async () => {
    const mockKeys = [
      { provider: 'openai', model: 'gpt-4o', hasKey: true, updatedAt: '2024-01-01' },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ keys: mockKeys }),
    });

    const result = await listVaultKeys();
    expect(result).toEqual(mockKeys);
    expect(fetch).toHaveBeenCalledWith('/api/keys', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-123',
      }),
    }));
  });

  it('returns empty array on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    const result = await listVaultKeys();
    expect(result).toEqual([]);
  });

  it('returns empty array on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await listVaultKeys();
    expect(result).toEqual([]);
  });

  it('returns empty array when keys field is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await listVaultKeys();
    expect(result).toEqual([]);
  });
});

// ── saveVaultKey ──────────────────────────────────────────────────────

describe('saveVaultKey', () => {
  it('returns success on ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await saveVaultKey('openai', 'sk-123', 'gpt-4o');
    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledWith('/api/keys', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ provider: 'openai', apiKey: 'sk-123', model: 'gpt-4o' }),
    }));
  });

  it('returns error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid key' }),
    });

    const result = await saveVaultKey('openai', 'bad-key');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid key');
  });

  it('returns error on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await saveVaultKey('openai', 'sk-123');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});

// ── deleteVaultKey ────────────────────────────────────────────────────

describe('deleteVaultKey', () => {
  it('returns success on ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await deleteVaultKey('openai');
    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledWith('/api/keys', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ provider: 'openai' }),
    }));
  });

  it('returns error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    const result = await deleteVaultKey('openai');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not found');
  });

  it('returns error on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Timeout'));

    const result = await deleteVaultKey('openai');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Timeout');
  });
});

// ── Auth headers ──────────────────────────────────────────────────────

describe('auth headers', () => {
  it('includes Bearer token when session exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ keys: [] }),
    });

    await listVaultKeys();
    const calledHeaders = (fetch as any).mock.calls[0][1].headers;
    expect(calledHeaders['Authorization']).toBe('Bearer test-token-123');
  });

  it('omits Authorization when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ keys: [] }),
    });

    await listVaultKeys();
    const calledHeaders = (fetch as any).mock.calls[0][1].headers;
    expect(calledHeaders['Authorization']).toBeUndefined();
  });
});
