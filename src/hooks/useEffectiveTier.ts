/**
 * BarTalk v8 — useEffectiveTier
 * Resolves the user's effective tier with priority:
 * 1. Guest mode -> unlimited (temporary full access)
 * 2. user_credits.tier_override (from admin invite) -> tier from invite
 * 3. Subscription Stripe (from BillingContext) -> paid tier
 * 4. Skip mode -> free
 * 5. Default -> free
 *
 * NOTE: BillingContext will be created in Phase 5.
 * NOTE: isGuestMode will be added to AuthContext in Phase 5.
 */

import { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useBillingContext } from '../context/BillingContext';
import { supabase } from '../lib/supabase';
import type { UserTier } from '../lib/featureGating';

interface EffectiveTierResult {
  tier: UserTier;
  source: string;
  creditsAI?: number;
}

export function useEffectiveTier(): EffectiveTierResult {
  const { user, authState, isSkipMode } = useAuthContext();
  const { tier: stripeTier } = useBillingContext();
  const [creditsTier, setCreditsTier] = useState<{ tier: UserTier; credits: number } | null>(null);

  // Fetch user_credits from Supabase for authenticated users
  useEffect(() => {
    if (!supabase || !user || user.id === 'guest' || authState !== 'authenticated') {
      setCreditsTier(null);
      return;
    }

    let cancelled = false;

    const fetchCredits = async () => {
      try {
        const { data, error } = await supabase!
          .from('user_credits')
          .select('tier_override, credits_ai')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (!error && data && data.tier_override) {
          setCreditsTier({
            tier: data.tier_override as UserTier,
            credits: data.credits_ai || 0,
          });
        } else {
          setCreditsTier(null);
        }
      } catch {
        if (!cancelled) setCreditsTier(null);
      }
    };

    fetchCredits();
    return () => { cancelled = true; };
  }, [user, authState]);

  // ── Resolve tier with priority ──

  // 1. Invite credits -> tier from invite
  if (creditsTier && creditsTier.tier) {
    return {
      tier: creditsTier.tier,
      source: 'invite_credits',
      creditsAI: creditsTier.credits,
    };
  }

  // 2. Stripe subscription
  if (authState === 'authenticated' && stripeTier && stripeTier !== 'free') {
    return { tier: stripeTier as UserTier, source: 'stripe' };
  }

  // 3. Skip mode -> free
  if (isSkipMode || authState === 'skipped') {
    return { tier: 'free', source: 'skip' };
  }

  // 4. Default -> free
  return { tier: 'free', source: 'default' };
}
