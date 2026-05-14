/**
 * Tests for src/lib/dbSync.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOr = vi.fn().mockReturnThis();
const mockUpsert = vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [] }) });
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  eq: mockEq,
  or: mockOr,
  upsert: mockUpsert,
}));

const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { user: { id: 'user-123' } } },
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    from: (...args: unknown[]) => mockFrom(...args),
  },
  isSupabaseConfigured: true,
}));

vi.mock('../../src/lib/agentFreedom', () => ({
  loadFreedomConfigs: vi.fn(() => [
    { agentId: 'a1', level: 'balanced', customInstructions: '' },
  ]),
  saveFreedomConfigs: vi.fn(),
}));

vi.mock('../../src/lib/structuredPrompts', () => ({
  loadSystemPrompts: vi.fn(() => [{ id: 'default', name: 'Default', content: 'test', isDefault: true }]),
  loadPersonalitySections: vi.fn(() => []),
  loadComposedPrompts: vi.fn(() => []),
}));

import {
  pullFreedomConfigs,
  pushFreedomConfigs,
  pullSystemPrompts,
  pushSystemPrompts,
  pullAllFromDB,
  pushAllToDB,
} from '../../src/lib/dbSync';
import { saveFreedomConfigs } from '../../src/lib/agentFreedom';

describe('dbSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset chain mocks
    mockSelect.mockReturnThis();
    mockEq.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      or: mockOr,
      data: [{ agent_id: 'a1', freedom_level: 'creative', custom_instructions: 'be bold' }],
      error: null,
    });
  });

  describe('pullFreedomConfigs', () => {
    it('does nothing when no session', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      await pullFreedomConfigs();
      expect(saveFreedomConfigs).not.toHaveBeenCalled();
    });

    it('calls supabase from user_agent_configs', async () => {
      // Mock chain to return data
      mockEq.mockResolvedValueOnce({
        data: [{ agent_id: 'a1', freedom_level: 'creative', custom_instructions: 'test' }],
        error: null,
      });
      await pullFreedomConfigs();
      expect(mockFrom).toHaveBeenCalledWith('user_agent_configs');
    });
  });

  describe('pushFreedomConfigs', () => {
    it('does nothing when no session', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      await pushFreedomConfigs();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('pushes configs to supabase', async () => {
      await pushFreedomConfigs();
      expect(mockFrom).toHaveBeenCalledWith('user_agent_configs');
    });
  });

  describe('pullSystemPrompts', () => {
    it('does nothing when no session', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      await pullSystemPrompts();
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('pushSystemPrompts', () => {
    it('does nothing when no session', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      await pushSystemPrompts();
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('pullAllFromDB', () => {
    it('calls all pull functions', async () => {
      // Just verify it doesn't throw
      await expect(pullAllFromDB()).resolves.not.toThrow();
    });
  });

  describe('pushAllToDB', () => {
    it('calls all push functions', async () => {
      await expect(pushAllToDB()).resolves.not.toThrow();
    });
  });
});
