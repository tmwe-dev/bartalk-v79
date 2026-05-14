/**
 * @module billingAPI
 * Billing API client for Stripe integration.
 * Handles subscription status checks, Stripe Checkout session creation,
 * and Stripe Customer Portal access for subscription management.
 */

import type { BillingStatus, SubscriptionTier } from '../types/billing';
import { buildAuthHeadersAsync } from './authToken';

const API_BASE = '/api/billing';

/**
 * Recupera lo stato attuale dell'abbonamento e dell'usage.
 */
export async function getSubscriptionStatus(): Promise<BillingStatus> {
  const headers = await buildAuthHeadersAsync();
  const res = await fetch(`${API_BASE}/status`, { method: 'POST', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `Status ${res.status}`);
  }
  return res.json();
}

/**
 * Crea una sessione Stripe Checkout per un upgrade.
 * @returns URL della pagina di checkout Stripe
 */
export async function createCheckoutSession(tier: SubscriptionTier): Promise<string> {
  const headers = await buildAuthHeadersAsync();
  const res = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `Checkout error ${res.status}`);
  }
  const data = await res.json();
  return data.sessionUrl;
}

/**
 * Ottiene URL del portale clienti Stripe per gestire l'abbonamento.
 * @returns URL del Customer Portal
 */
export async function getPortalUrl(): Promise<string> {
  const headers = await buildAuthHeadersAsync();
  const res = await fetch(`${API_BASE}/portal`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `Portal error ${res.status}`);
  }
  const data = await res.json();
  return data.portalUrl;
}
