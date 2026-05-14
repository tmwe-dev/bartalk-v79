/**
 * Tests for API wrapper modules: auditAPI, monitorAPI, educationAPI
 * These are thin wrappers around fetch with auth headers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({ supabase: null }));
vi.mock('../../src/lib/authToken', () => ({
  getAuthToken: vi.fn(() => 'test-token'),
  buildAuthHeaders: vi.fn(() => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-token',
  })),
  buildAuthHeadersAsync: vi.fn().mockResolvedValue({
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-token',
  }),
}));

import { fetchAuditLogs, purgeAuditLogs } from '../../src/lib/auditAPI';
import { fetchStats, fetchErrors, reportClientError } from '../../src/lib/monitorAPI';
import { getStudentProfileCloud, getCoursesCloud, sendXAPIStatements } from '../../src/lib/educationAPI';

describe('auditAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAuditLogs', () => {
    it('fetches with correct pagination params', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ logs: [], total: 0, page: 1, pageSize: 50 }),
      });
      await fetchAuditLogs(2, 25);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/audit?page=2&pageSize=25',
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it('uses default pagination', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ logs: [] }),
      });
      await fetchAuditLogs();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/audit?page=1&pageSize=50',
        expect.anything()
      );
    });

    it('throws on error response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Forbidden' }),
      });
      await expect(fetchAuditLogs()).rejects.toThrow('Forbidden');
    });
  });

  describe('purgeAuditLogs', () => {
    it('sends DELETE request', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ deleted: 10 }),
      });
      const result = await purgeAuditLogs({ all: true });
      expect(result.deleted).toBe(10);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/audit',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('throws on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'DB error' }),
      });
      await expect(purgeAuditLogs({ all: true })).rejects.toThrow('DB error');
    });
  });
});

describe('monitorAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStats', () => {
    it('fetches with default hours', async () => {
      const mockStats = { totalCalls: 100, errorRate: 0.05 };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });
      const result = await fetchStats();
      expect(result).toEqual(mockStats);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/monitor?view=stats&hours=24',
        expect.anything()
      );
    });

    it('fetches with custom hours', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      await fetchStats(48);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/monitor?view=stats&hours=48',
        expect.anything()
      );
    });

    it('throws on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      });
      await expect(fetchStats()).rejects.toThrow('Not authenticated');
    });
  });

  describe('fetchErrors', () => {
    it('fetches with pagination', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ errors: [], total: 0 }),
      });
      await fetchErrors(2, 10);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/monitor?view=errors&page=2&pageSize=10',
        expect.anything()
      );
    });
  });

  describe('reportClientError', () => {
    it('sends POST request with error details', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      await reportClientError({
        message: 'Test error',
        severity: 'error',
        context: { source: 'test' },
      });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/monitor',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('does not throw on failure (silent)', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network'));
      await expect(
        reportClientError({ message: 'Error' })
      ).resolves.not.toThrow();
    });
  });
});

describe('educationAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStudentProfileCloud', () => {
    it('returns null on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: false, error: 'not-found' }),
      });
      const result = await getStudentProfileCloud();
      expect(result).toBeNull();
    });

    it('maps snake_case to camelCase', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          data: {
            id: 'user-1',
            name: 'Test Student',
            learning_style: 'visual',
            tech_comfort: 'high',
            native_language: 'it',
            goals: ['learn AI'],
            interests: [],
            challenges: [],
          },
        }),
      });
      const profile = await getStudentProfileCloud();
      expect(profile).not.toBeNull();
      expect(profile?.learningStyle).toBe('visual');
      expect(profile?.techComfort).toBe('high');
      expect(profile?.nativeLanguage).toBe('it');
    });
  });

  describe('getCoursesCloud', () => {
    it('returns empty array on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: false }),
      });
      const courses = await getCoursesCloud();
      expect(courses).toEqual([]);
    });
  });

  describe('sendXAPIStatements', () => {
    it('returns true on success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
      const result = await sendXAPIStatements([{ verb: 'completed' }]);
      expect(result).toBe(true);
    });

    it('returns false on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network'));
      const result = await sendXAPIStatements([]);
      expect(result).toBe(false);
    });
  });
});
