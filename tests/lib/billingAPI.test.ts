/**
 * Tests for src/lib/billingAPI.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({ supabase: null }));
vi.mock('../../src/lib/authToken', () => ({
  buildAuthHeadersAsync: vi.fn().mockResolvedValue({
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-token',
  }),
}));

import {
  getSubscriptionStatus,
  createCheckoutSession,
  getPortalUrl,
} from '../../src/lib/billingAPI';

describe('billingAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscriptionStatus', () => {
    it('returns billing status on success', async () => {
      const mockStatus = { tier: 'free', messagesUsed: 5, messagesLimit: 50 };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });
      const result = await getSubscriptionStatus();
      expect(result).toEqual(mockStatus);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/billing/status',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws on error response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });
      await expect(getSubscriptionStatus()).rejects.toThrow('Unauthorized');
    });

    it('throws with status code on parse failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('parse error')),
      });
      await expect(getSubscriptionStatus()).rejects.toThrow('Network error');
    });
  });

  describe('createCheckoutSession', () => {
    it('returns session URL on success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionUrl: 'https://checkout.stripe.com/session-123' }),
      });
      const url = await createCheckoutSession('pro');
      expect(url).toBe('https://checkout.stripe.com/session-123');
    });

    it('sends tier in request body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionUrl: 'url' }),
      });
      await createCheckoutSession('pro');
      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(JSON.parse(call[1].body)).toEqual({ tier: 'pro' });
    });

    it('throws on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid tier' }),
      });
      await expect(createCheckoutSession('invalid' as any)).rejects.toThrow('Invalid tier');
    });
  });

  describe('getPortalUrl', () => {
    it('returns portal URL on success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ portalUrl: 'https://billing.stripe.com/portal-123' }),
      });
      const url = await getPortalUrl();
      expect(url).toBe('https://billing.stripe.com/portal-123');
    });

    it('throws on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });
      await expect(getPortalUrl()).rejects.toThrow('Server error');
    });
  });
});
