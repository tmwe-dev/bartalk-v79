/**
 * RadioChat v8 — SkipModeBanner
 * Banner sticky per utenti in modalità skip (quota info).
 * Per utenti autenticati: mostra tier badge + crediti rimanenti.
 */

import { useAuthContext } from '../../context/AuthContext';
import { SKIP_MODE } from '../../lib/constants';
import { useT } from '../../lib/i18n';
import { useEffectiveTier } from '../../hooks/useEffectiveTier';
import { tierLabel } from '../../lib/featureGating';

interface SkipModeBannerProps {
  onSwitchToFull?: () => void;
}

export function SkipModeBanner({ onSwitchToFull }: SkipModeBannerProps) {
  const { isSkipMode, skipQuotaInfo, resumeAuth, user, authState } = useAuthContext();
  const t = useT();
  const { tier, source, creditsAI } = useEffectiveTier();

  // ── Utente autenticato (non skip, non guest) → mostra tier badge ──
  if (authState === 'authenticated' && user && user.id !== 'guest' && !isSkipMode) {
    // Nascondi se unlimited senza crediti specifici (utente Stripe unlimited, non serve badge)
    if (tier === 'unlimited' && source === 'stripe') return null;

    return (
      <div className="tier-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`tier-badge tier-badge--${tier}`}>
            {tierLabel(tier)}
          </span>
          {creditsAI !== undefined && creditsAI > 0 && source === 'invite' && (
            <span className="tier-credits">
              AI: {creditsAI} rimanenti
            </span>
          )}
        </div>
        {tier === 'free' && (
          <button className="tier-upgrade-btn" onClick={resumeAuth}>
            Passa a PRO
          </button>
        )}
      </div>
    );
  }

  // ── Skip mode → mostra quota banner originale ──
  if (!isSkipMode || !skipQuotaInfo) return null;

  const { remaining, daysRemaining, expired } = skipQuotaInfo;

  // Calcola percentuale uso per colore
  const aiPercent = Math.round(((SKIP_MODE.maxAIMessages - remaining.ai) / SKIP_MODE.maxAIMessages) * 100);
  const overallPercent = Math.max(aiPercent);

  const bannerClass = expired
    ? 'skip-banner skip-banner--expired'
    : overallPercent >= 100
    ? 'skip-banner skip-banner--exceeded'
    : overallPercent >= SKIP_MODE.warningThresholdPercent
    ? 'skip-banner skip-banner--warning'
    : 'skip-banner';

  if (expired) {
    return (
      <div className={bannerClass}>
        <span className="skip-banner-text">
          {t('skipExpired')}
        </span>
        <div className="skip-banner-actions">
          {onSwitchToFull && (
            <button className="skip-banner-switch" onClick={onSwitchToFull} title="Vista Standard">
              ⛶
            </button>
          )}
          <button className="skip-banner-btn" onClick={resumeAuth}>
            {t('register')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={bannerClass}>
      <div className="skip-banner-quotas">
        <span className="skip-banner-item" title={t('aiMessagesRemaining')}>
          {t('aiMessages')}: {remaining.ai}/{SKIP_MODE.maxAIMessages}
        </span>
        <span className="skip-banner-sep">|</span>
        <span className="skip-banner-item" title={t('voiceRequestsRemaining')}>
          {t('voiceQuota')}: {remaining.tts}/{SKIP_MODE.maxTTSRequests}
        </span>
        <span className="skip-banner-sep">|</span>
        <span className="skip-banner-item" title={t('coursesRemaining')}>
          {t('coursesQuota')}: {remaining.courses}/{SKIP_MODE.maxCourses}
        </span>
        <span className="skip-banner-sep">|</span>
        <span className="skip-banner-item skip-banner-days">
          {daysRemaining}{t('daysLeft')}
        </span>
      </div>
      <div className="skip-banner-actions">
        {onSwitchToFull && (
          <button className="skip-banner-switch" onClick={onSwitchToFull} title="Vista Standard">
            ⛶
          </button>
        )}
        <button className="skip-banner-btn" onClick={resumeAuth}>
          {t('register')}
        </button>
      </div>
    </div>
  );
}
