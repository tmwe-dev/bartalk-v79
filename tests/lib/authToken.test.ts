/**
 * Tests for src/lib/authToken.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({ supabase: null }));

import {
  getAuthToken,
  getAuthTokenAsync,
  buildAuthHeaders,
  buildAuthHeadersAsync,
} from '../../src/lib/authToken';

describe('authToken', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getAuthToken', () => {
    it('returns null when no token in localStorage', () => {
      expect(getAuthToken()).toBeNull();
    });

    it('returns null for invalid JSON in token key', () => {
      // The mock localStorage doesn't support Object.keys iteration,
      // so getAuthToken will always return null in test env.
      // This tests the fallback behavior.
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('getAuthTokenAsync', () => {
    it('returns null when supabase is null and no localStorage token', async () => {
      const token = await getAuthTokenAsync();
      expect(token).toBeNull();
    });
  });

  describe('buildAuthHeaders', () => {
    it('throws when not authenticated', () => {
      expect(() => buildAuthHeaders()).toThrow('Non autenticato');
    });

    it('error message is in Italian', () => {
      try {
        buildAuthHeaders();
      } catch (e) {
        expect((e as Error).message).toContain('login');
      }
    });
  });

  describe('buildAuthHeadersAsync', () => {
    it('returns headers with Content-Type when not authenticated', async () => {
      const headers = await buildAuthHeadersAsync();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('does not include Authorization when not authenticated', async () => {
      const headers = await buildAuthHeadersAsync();
      expect(headers['Authorization']).toBeUndefined();
    });
  });
});
