/**
 * RadioChat v8 — ReferralTab
 * Sezione "Invita amici" nel pannello impostazioni.
 * Mostra codice referral, link copiabile, e stats.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface ReferralData {
  code: string;
  link: string;
  stats: {
    count: number;
    creditsEarned: number;
  };
}

export function ReferralTab() {
  const { user, authState } = useAuthContext();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferral = useCallback(async () => {
    if (!supabase || authState !== 'authenticated' || !user || user.id === 'guest') {
      setLoading(false);
      return;
    }

    try {
      const session = (await supabase.auth.getSession()).data?.session;
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/referral', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore');
      }

      const result = await res.json();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [user, authState]);

  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const handleCopy = () => {
    if (!data?.link) return;
    navigator.clipboard.writeText(data.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authState !== 'authenticated' || !user || user.id === 'guest') {
    return (
      <div className="referral-tab">
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
          Accedi con un account per invitare amici
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="referral-tab">
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
          Caricamento...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="referral-tab">
        <p style={{ color: 'var(--danger)', textAlign: 'center', padding: 20 }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="referral-tab">
      <div className="referral-header">
        <span className="referral-icon">🎁</span>
        <h3 className="referral-title">Invita un amico</h3>
      </div>

      <p className="referral-desc">
        Condividi il tuo link e guadagna <strong>+100 messaggi AI</strong> per ogni amico che si registra.
        Il tuo amico riceve <strong>+50 messaggi AI</strong> bonus.
      </p>

      {data && (
        <>
          {/* Codice + link copiabile */}
          <div className="referral-code-box">
            <div className="referral-code-label">Il tuo codice</div>
            <div className="referral-code">{data.code}</div>
          </div>

          <div className="referral-link-row">
            <input
              type="text"
              className="referral-link-input"
              value={data.link}
              readOnly
              aria-label="Codice referral"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button className="referral-copy-btn" onClick={handleCopy}>
              {copied ? '✓ Copiato' : '📋 Copia'}
            </button>
          </div>

          {/* Stats */}
          <div className="referral-stats">
            <div className="referral-stat">
              <span className="referral-stat-value">{data.stats.count}</span>
              <span className="referral-stat-label">Amici invitati</span>
            </div>
            <div className="referral-stat">
              <span className="referral-stat-value">+{data.stats.creditsEarned}</span>
              <span className="referral-stat-label">Crediti guadagnati</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
