/**
 * BarTalk v8 — Billing Panel
 * Pannello abbonamento per le Settings: piano attuale, usage, azioni.
 */

import { ErrorBoundary } from '../Common/ErrorBoundary';
import { useBillingContext } from '../../context/BillingContext';

export function BillingPanel() {
  const { tier, status, isLoading, error, openPortal, openCheckout, refreshStatus } =
    useBillingContext();

  if (isLoading) {
    return (
      <div className="billing-panel billing-panel--loading">
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          Caricamento...
        </div>
      </div>
    );
  }

  const usage = status?.usage;
  const usagePercent =
    usage && usage.messagesLimit
      ? Math.min(100, Math.round((usage.messagesUsed / usage.messagesLimit) * 100))
      : 0;
  const isHigh = usagePercent >= 80;

  return (
    <ErrorBoundary
      fallback={
        <div className="billing-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ color: '#e53e3e', marginBottom: '8px' }}>Errore nel pannello fatturazione</h3>
          <p style={{ color: '#718096' }}>Impossibile caricare i dati di fatturazione. Riprova più tardi.</p>
        </div>
      }
    >
    <div className="billing-panel">
      {/* Tier attuale */}
      <div className="billing-tier">
        <span className="billing-tier-badge" data-tier={tier}>
          {tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Unlimited'}
        </span>
        {status?.status && status.status !== 'none' && (
          <span className="billing-status-label">
            {status.status === 'active'
              ? 'Attivo'
              : status.status === 'trialing'
                ? 'In prova'
                : status.status === 'past_due'
                  ? 'Pagamento in ritardo'
                  : status.status === 'canceled'
                    ? 'Cancellato'
                    : status.status}
          </span>
        )}
      </div>

      {/* Usage meter */}
      {usage && usage.messagesLimit !== null && (
        <div className="billing-usage">
          <div className="billing-usage-header">
            <span>Utilizzo messaggi</span>
            <span>
              {usage.messagesUsed} / {usage.messagesLimit}
            </span>
          </div>
          <div className="billing-usage-bar">
            <div
              className={`billing-usage-bar__fill ${isHigh ? 'billing-usage-bar__fill--high' : ''}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="billing-usage-footer">
            {usage.limitPeriod === 'day' ? 'Reset giornaliero' : 'Reset mensile'}
            {usage.resetAt && ` · ${new Date(usage.resetAt).toLocaleDateString('it-IT')}`}
          </div>
        </div>
      )}

      {usage?.messagesLimit === null && (
        <div className="billing-usage">
          <div className="billing-usage-header">
            <span>Messaggi illimitati</span>
          </div>
        </div>
      )}

      {/* Cost breakdown */}
      {usage?.costBreakdown && usage.costBreakdown.length > 0 && (
        <div className="billing-breakdown">
          <h4>Costi per provider</h4>
          <div className="billing-breakdown-list">
            {usage.costBreakdown.map((cb) => (
              <div key={cb.provider} className="billing-breakdown-row">
                <span className="billing-breakdown-provider">{cb.provider}</span>
                <span>{cb.messages} msg</span>
                <span>${cb.costUsd.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Azioni */}
      <div className="billing-actions">
        {tier === 'free' && (
          <button
            className="billing-btn billing-btn--primary"
            onClick={() => openCheckout('pro')}
          >
            Passa a Pro — €9.90/mese
          </button>
        )}
        {tier === 'pro' && (
          <button
            className="billing-btn billing-btn--primary"
            onClick={() => openCheckout('unlimited')}
          >
            Passa a Unlimited — €24.90/mese
          </button>
        )}
        {tier !== 'free' && (
          <button className="billing-btn" onClick={() => openPortal()}>
            Gestisci abbonamento
          </button>
        )}
        <button
          className="billing-btn billing-btn--ghost"
          onClick={() => refreshStatus()}
        >
          Aggiorna
        </button>
      </div>

      {error && <div className="billing-error">{error}</div>}
    </div>
    </ErrorBoundary>
  );
}
