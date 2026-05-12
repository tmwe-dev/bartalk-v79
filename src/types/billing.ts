/**
 * BarTalk v8 — Billing Types
 * Tipi per il sistema di fatturazione e subscription Stripe.
 */

// ── Subscription Tiers ─────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'unlimited';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete';

// ── Billing Status (dal backend /api/billing/status) ───────────────

export interface UsageStats {
  messagesUsed: number;
  messagesLimit: number | null; // null = unlimited
  limitPeriod: 'day' | 'month';
  resetAt: string | null;       // ISO date
  costBreakdown: CostBreakdown[];
}

export interface CostBreakdown {
  provider: string;
  messages: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface BillingStatus {
  tier: SubscriptionTier;
  status: SubscriptionStatus | 'none';
  usage: UsageStats;
}

// ── Pricing Tiers (client-side display) ────────────────────────────

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  priceMonthly: number;       // €
  messagesLimit: number | null;
  limitPeriod: 'day' | 'month';
  features: string[];
  highlighted?: boolean;
}

export const PRICING_TIERS_DISPLAY: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    messagesLimit: 10,
    limitPeriod: 'day',
    features: [
      '4 agenti AI',
      '10 messaggi al giorno',
      'Corsi base',
      'Cronologia chat',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 9.90,
    messagesLimit: 200,
    limitPeriod: 'month',
    highlighted: true,
    features: [
      'Tutto di Free, più:',
      '200 messaggi al mese',
      'Corsi illimitati',
      'Priorità nelle risposte',
      'Supporto email',
    ],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    priceMonthly: 24.90,
    messagesLimit: null,
    limitPeriod: 'month',
    features: [
      'Tutto di Pro, più:',
      'Messaggi illimitati',
      'Agenti custom',
      'Export conversazioni',
      'Supporto prioritario',
    ],
  },
];

// ── Context Value ──────────────────────────────────────────────────

export interface BillingContextValue {
  tier: SubscriptionTier;
  status: BillingStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  openCheckout: (tier: SubscriptionTier) => Promise<void>;
  openPortal: () => Promise<void>;
  /** True se l'utente ha raggiunto il limite */
  isAtLimit: boolean;
}
