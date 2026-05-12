/**
 * BarTalk v8 — Cookie Banner
 * Banner GDPR per consenso cookie (solo tecnici + analytics opzionali).
 */

import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'bt_cookie_consent';

type ConsentLevel = 'none' | 'essential' | 'all';

function getStoredConsent(): ConsentLevel | null {
  try {
    const v = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (v === 'essential' || v === 'all') return v;
  } catch {}
  return null;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentLevel | null>(getStoredConsent);
  const analyticsAllowed = consent === 'all';
  return { consent, setConsent, analyticsAllowed };
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getStoredConsent()) {
      setVisible(true);
    }
  }, []);

  const accept = (level: ConsentLevel) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, level);
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-banner__content">
        <p>
          Utilizziamo cookie tecnici necessari al funzionamento del servizio e,
          con il tuo consenso, cookie analitici per migliorare l'esperienza.
          Per maggiori informazioni consulta la nostra{' '}
          <button className="cookie-banner__link" onClick={() => window.dispatchEvent(new CustomEvent('bt:open-privacy'))}>
            Informativa Privacy
          </button>.
        </p>
        <div className="cookie-banner__actions">
          <button
            className="cookie-banner__btn cookie-banner__btn--essential"
            onClick={() => accept('essential')}
          >
            Solo necessari
          </button>
          <button
            className="cookie-banner__btn cookie-banner__btn--all"
            onClick={() => accept('all')}
          >
            Accetta tutti
          </button>
        </div>
      </div>
    </div>
  );
}
