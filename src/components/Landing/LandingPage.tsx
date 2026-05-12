/**
 * BarTalk v8.2.5 — Landing Page
 * Pagina di presentazione per utenti non autenticati.
 */

import { useState } from 'react';
import { PRICING_TIERS_DISPLAY } from '../../types/billing';
import { PrivacyPolicy } from '../Legal/PrivacyPolicy';
import { TermsOfService } from '../Legal/TermsOfService';
import { UI } from '../../lib/constants';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
  onGuest?: () => void;
}

export function LandingPage({ onLogin, onRegister, onGuest }: LandingPageProps) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (showPrivacy) {
    return (
      <div className="landing-legal-overlay">
        <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
      </div>
    );
  }
  if (showTerms) {
    return (
      <div className="landing-legal-overlay">
        <TermsOfService onClose={() => setShowTerms(false)} />
      </div>
    );
  }

  return (
    <div className="landing">
      {/* Hero Section */}
      <header className="landing-hero">
        <div className="landing-hero__badge">Il futuro dell'apprendimento AI</div>
        <h1 className="landing-hero__title">
          <span className="landing-hero__logo">{UI.appName}</span>
          <span className="landing-hero__version">v{UI.appVersion}</span>
        </h1>
        <p className="landing-hero__subtitle">
          Impara qualsiasi cosa con maestri AI personalizzati, voci realistiche e corsi interattivi.
        </p>
        <div className="landing-hero__cta">
          <button className="landing-btn landing-btn--primary" onClick={onRegister}>
            Crea Account
          </button>
          <button className="landing-btn landing-btn--secondary" onClick={onLogin}>
            Accedi
          </button>
          {onGuest && (
            <button
              className="landing-btn landing-btn--guest"
              onClick={onGuest}
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                padding: '12px 28px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              👤 Guest
            </button>
          )}
        </div>
      </header>

      {/* Features */}
      <section className="landing-features">
        <h2 className="landing-section-title">I Maestri AI</h2>
        <div className="landing-features__grid">
          <div className="landing-feature">
            <div className="landing-feature__icon">🧠</div>
            <h3>Albert</h3>
            <p>Powered by OpenAI. Il tutore universale per ogni materia.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature__icon">🔬</div>
            <h3>Archimede</h3>
            <p>Powered by Anthropic. Esperto in analisi e ragionamento profondo.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature__icon">📐</div>
            <h3>Pitagora</h3>
            <p>Powered by Google Gemini. Specialista in matematica e scienze.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature__icon">🍎</div>
            <h3>Newton</h3>
            <p>Powered by Groq. Risposte velocissime per sessioni rapide.</p>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="landing-capabilities">
        <h2 className="landing-section-title">Cosa puoi fare</h2>
        <div className="landing-capabilities__grid">
          <div className="landing-capability">
            <span>💬</span>
            <div>
              <h4>Chat Multi-Agente</h4>
              <p>Conversazioni con più maestri AI che discutono tra loro.</p>
            </div>
          </div>
          <div className="landing-capability">
            <span>🎙️</span>
            <div>
              <h4>Podcast AI</h4>
              <p>Ascolta dibattiti generati in tempo reale con voci naturali.</p>
            </div>
          </div>
          <div className="landing-capability">
            <span>📚</span>
            <div>
              <h4>Corsi Personalizzati</h4>
              <p>Percorsi di apprendimento creati dall'AI su misura per te.</p>
            </div>
          </div>
          <div className="landing-capability">
            <span>🎨</span>
            <div>
              <h4>Studio Tecnico</h4>
              <p>Strumenti avanzati per analisi approfondite e progetti.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-pricing">
        <h2 className="landing-section-title">Piani</h2>
        <div className="landing-pricing__grid">
          {PRICING_TIERS_DISPLAY.map((plan) => (
            <div
              key={plan.id}
              className={`landing-pricing-card ${plan.highlighted ? 'landing-pricing-card--highlighted' : ''}`}
            >
              {plan.highlighted && <div className="landing-pricing-card__badge">Consigliato</div>}
              <h3>{plan.name}</h3>
              <div className="landing-pricing-card__price">
                {plan.priceMonthly === 0 ? (
                  <span className="landing-pricing-card__amount">Gratis</span>
                ) : (
                  <>
                    <span className="landing-pricing-card__amount">&euro;{plan.priceMonthly.toFixed(2)}</span>
                    <span className="landing-pricing-card__period">/mese</span>
                  </>
                )}
              </div>
              <div className="landing-pricing-card__limit">
                {plan.messagesLimit === null
                  ? 'Messaggi illimitati'
                  : `${plan.messagesLimit} messaggi/${plan.limitPeriod === 'day' ? 'giorno' : 'mese'}`}
              </div>
              <ul className="landing-pricing-card__features">
                {plan.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <button className="landing-btn landing-btn--primary" onClick={onRegister}>
                {plan.priceMonthly === 0 ? 'Inizia gratis' : `Scegli ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__links">
          <button onClick={() => setShowPrivacy(true)}>Privacy</button>
          <button onClick={() => setShowTerms(true)}>Termini</button>
          <a href="mailto:support@radiochat.app">Contatti</a>
        </div>
        <p className="landing-footer__copy">
          &copy; 2026 {UI.appName}. Tutti i diritti riservati.
        </p>
      </footer>
    </div>
  );
}
