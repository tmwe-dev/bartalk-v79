/**
 * BarTalk v8 — Billing Context
 * Gestione stato abbonamento, usage e checkout Stripe.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  SubscriptionTier,
  BillingStatus,
  BillingContextValue,
} from '../types/billing';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  getPortalUrl,
} from '../lib/billingAPI';

const BillingContext = createContext<BillingContextValue | null>(null);

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minuti

export function BillingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      const s = await getSubscriptionStatus();
      setStatus(s);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore billing';
      console.warn('[BillingContext] Errore refresh status:', msg);
      setError(msg);
      // Default a free se errore
      if (!status) {
        setStatus({
          tier: 'free',
          status: 'none',
          usage: {
            messagesUsed: 0,
            messagesLimit: 10,
            limitPeriod: 'day',
            resetAt: null,
            costBreakdown: [],
          },
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  // Auto-refresh al mount e ogni 5 minuti
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCheckout = useCallback(async (tier: SubscriptionTier) => {
    try {
      const url = await createCheckoutSession(tier);
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore checkout';
      setError(msg);
      throw err;
    }
  }, []);

  const openPortal = useCallback(async () => {
    try {
      const url = await getPortalUrl();
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore portale';
      setError(msg);
      throw err;
    }
  }, []);

  const tier: SubscriptionTier = status?.tier || 'free';
  const isAtLimit =
    status?.usage?.messagesLimit !== null &&
    status?.usage?.messagesLimit !== undefined &&
    (status?.usage?.messagesUsed ?? 0) >= (status?.usage?.messagesLimit ?? Infinity);

  return (
    <BillingContext.Provider
      value={{
        tier,
        status,
        isLoading,
        error,
        refreshStatus,
        openCheckout,
        openPortal,
        isAtLimit,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBillingContext(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBillingContext must be used within BillingProvider');
  return ctx;
}
