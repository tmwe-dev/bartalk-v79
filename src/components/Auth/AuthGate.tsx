/**
 * BarTalk v8 — AuthGate
 * Schermata di autenticazione con Welcome Carousel (3 slide):
 *   1. Prova Gratis → skip mode
 *   2. Ho un Invito → inserisci codice → registrazione
 *   3. Accedi → Google OAuth / Email
 * Se l'utente è autenticato o ha skippato, mostra i children (l'app).
 */

import { useState, useRef, useEffect, useCallback, type ReactNode, type FormEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../lib/i18n';
import type { AuthTab } from '../../types/auth';
import { PasswordReset } from './PasswordReset';
import { UpdatePassword } from './UpdatePassword';
import './AuthGate.css';

/** Se VITE_SKIP_MODE_ENABLED è "false", il pulsante skip viene nascosto. Default: abilitato. */
const SKIP_ENABLED = import.meta.env.VITE_SKIP_MODE_ENABLED !== 'false';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { authState, isSkipMode, isPasswordRecovery, signIn, signUp, signInWithGoogle, signInWithApple, skipAuth, guestAuth, clearPasswordRecovery, error, clearError } = useAuthContext();
  const t = useT();
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  // ── Welcome Carousel state ──
  const [welcomeSlide, setWelcomeSlide] = useState(0);
  const [inviteInput, setInviteInput] = useState('');
  const touchStartRef = useRef({ x: 0, y: 0 });
  const TOTAL_SLIDES = 3;

  const goToSlide = useCallback((idx: number) => {
    setWelcomeSlide(Math.max(0, Math.min(TOTAL_SLIDES - 1, idx)));
  }, []);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (!showWelcome || authState !== 'unauthenticated') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToSlide(welcomeSlide + 1);
      else if (e.key === 'ArrowLeft') goToSlide(welcomeSlide - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showWelcome, authState, welcomeSlide, goToSlide]);

  // Touch handlers for carousel
  const onTouchStart = (e: ReactTouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goToSlide(welcomeSlide + (dx < 0 ? 1 : -1));
    }
  };

  // ── Invite: salva codice e vai a registrazione ──
  const handleInviteRedeem = () => {
    const code = inviteInput.trim();
    if (!code) return;
    sessionStorage.setItem('bartalk_pending_invite', code);
    setShowWelcome(false);
    setTab('signup');
  };

  // ── Password Recovery → mostra form nuova password ──
  if (isPasswordRecovery) {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <div className="auth-logo">🔑</div>
          <h1 className="auth-title">RadioChat</h1>
          <UpdatePassword onComplete={clearPasswordRecovery} />
        </div>
      </div>
    );
  }

  // ── Se autenticato o skip → mostra l'app ──
  if (authState === 'authenticated' || authState === 'skipped' || isSkipMode) {
    return <>{children}</>;
  }

  // ── Welcome Carousel per visitatori (sostituisce LandingPage) ──
  if (authState === 'unauthenticated' && showWelcome) {
    return (
      <div className="auth-gate">
        <div className="welcome-container">
          {/* Brand header */}
          <div className="welcome-header">
            <h1 className="welcome-brand">📻 RadioChat</h1>
            <p className="welcome-tagline">Il tuo ambiente di apprendimento AI</p>
          </div>

          {/* Carousel */}
          <div
            className="welcome-carousel"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="welcome-track"
              style={{ transform: `translateX(-${welcomeSlide * 100}%)` }}
            >
              {/* ── Slide 1: Prova Gratis ── */}
              <div className="welcome-slide welcome-slide--green">
                <div className="welcome-slide__icon">🎧</div>
                <h2 className="welcome-slide__title">Prova Gratis</h2>
                <p className="welcome-slide__desc">
                  Chat e Task per 7 giorni, 10 messaggi al giorno
                </p>
                {SKIP_ENABLED && (
                  <button className="welcome-cta welcome-cta--green" onClick={skipAuth}>
                    Inizia Gratis
                  </button>
                )}
              </div>

              {/* ── Slide 2: Ho un Invito ── */}
              <div className="welcome-slide welcome-slide--blue">
                <div className="welcome-slide__icon">🎁</div>
                <h2 className="welcome-slide__title">Ho un Invito</h2>
                <p className="welcome-slide__desc">
                  Inserisci il codice del tuo amico e ottieni accesso completo
                </p>
                <div className="welcome-invite-field">
                  <input
                    type="text"
                    className="welcome-invite-input"
                    placeholder="Codice invito..."
                    value={inviteInput}
                    onChange={e => setInviteInput(e.target.value.toUpperCase())}
                    maxLength={12}
                    onKeyDown={e => e.key === 'Enter' && handleInviteRedeem()}
                  />
                  <button
                    className="welcome-cta welcome-cta--blue"
                    onClick={handleInviteRedeem}
                    disabled={!inviteInput.trim()}
                  >
                    Riscatta Invito
                  </button>
                </div>
                <p className="welcome-slide__note">
                  L'invito sarà attivato dopo la registrazione
                </p>
              </div>

              {/* ── Slide 3: Accedi ── */}
              <div className="welcome-slide welcome-slide--gold">
                <div className="welcome-slide__icon">🚀</div>
                <h2 className="welcome-slide__title">Accedi</h2>
                <p className="welcome-slide__desc">
                  Accesso completo con abbonamento Pro o Unlimited
                </p>
                <button
                  className="welcome-cta welcome-cta--google"
                  onClick={() => { signInWithGoogle?.(); }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Accedi con Google
                </button>
                <button
                  className="welcome-cta welcome-cta--email"
                  onClick={() => { setShowWelcome(false); setTab('login'); }}
                >
                  Email e Password
                </button>
                <p className="welcome-slide__link">
                  Non hai un account?{' '}
                  <button onClick={() => { setShowWelcome(false); setTab('signup'); }}>
                    Registrati
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Dot indicator */}
          <div className="welcome-dots">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                className={`welcome-dot ${i === welcomeSlide ? 'active' : ''}`}
                onClick={() => goToSlide(i)}
                data-slide={i}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Password Reset ──
  if (showPasswordReset) {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <PasswordReset onBack={() => setShowPasswordReset(false)} />
        </div>
      </div>
    );
  }

  // ── Loading iniziale ──
  if (authState === 'loading') {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <div className="auth-logo">🎙️</div>
          <h1 className="auth-title">RadioChat</h1>
          <div className="auth-loading">{t('loading')}</div>
        </div>
      </div>
    );
  }

  // ── Conferma registrazione ──
  if (signupSuccess) {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <div className="auth-logo">📧</div>
          <h1 className="auth-title">{t('authCheckEmail')}</h1>
          <p className="auth-subtitle">
            {t('authConfirmSent')}
          </p>
          <button
            className="auth-btn auth-btn-secondary"
            onClick={() => { setSignupSuccess(false); setTab('login'); }}
          >
            {t('authBackLogin')}
          </button>
          {SKIP_ENABLED && (
            <button className="auth-skip-btn" onClick={skipAuth}>
              {t('authSkip')} →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Submit form ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    clearError();

    try {
      if (tab === 'login') {
        await signIn(email.trim(), password);
      } else {
        const result = await signUp(email.trim(), password);
        if (!result.error) {
          setSignupSuccess(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Google Sign In ──
  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearError();
    try {
      await signInWithGoogle?.();
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Apple Sign In ──
  const handleAppleSignIn = async () => {
    setLoading(true);
    clearError();
    try {
      await signInWithApple?.();
    } finally {
      setLoading(false);
    }
  };

  // ── Switch tab ──
  const switchTab = (newTab: AuthTab) => {
    setTab(newTab);
    clearError();
    setEmail('');
    setPassword('');
  };

  return (
    <div className="auth-gate">
      <div className="auth-card">
        {/* Logo e titolo */}
        <div className="auth-logo">🎙️</div>
        <h1 className="auth-title">RadioChat</h1>
        <p className="auth-subtitle">{t('authSubtitle')}</p>

        {/* Tab Login / Registrati */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
          >
            {t('authLogin')}
          </button>
          <button
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => switchTab('signup')}
          >
            {t('authSignup')}
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={loading}
          />
          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            disabled={loading}
          />

          {/* Errore */}
          {error && <div className="auth-error">{error}</div>}

          {/* Submit */}
          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={loading}
          >
            {loading ? '...' : tab === 'login' ? t('authLogin') : t('authCreateAccount')}
          </button>

          {tab === 'login' && (
            <button
              type="button"
              className="auth-forgot-btn"
              onClick={() => setShowPasswordReset(true)}
            >
              {t('authForgot')}
            </button>
          )}
        </form>

        {/* Google OAuth */}
        <div className="auth-divider">
          <span>{t('or')}</span>
        </div>
        <button
          type="button"
          className="auth-btn auth-btn-google"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8, verticalAlign: 'middle' }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('signInGoogle')}
        </button>
        {/* Guest Mode — accesso completo temporaneo senza auth */}
        <button
          type="button"
          className="auth-btn auth-btn-guest"
          onClick={guestAuth}
          disabled={loading}
          style={{
            marginTop: 8,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
          }}
        >
          👤 Guest — Accesso Completo
        </button>

        {/* Apple OAuth — nascosto per ora, attivare in futuro impostando VITE_APPLE_AUTH_ENABLED=true */}
        {import.meta.env.VITE_APPLE_AUTH_ENABLED === 'true' && (
          <button
            type="button"
            className="auth-btn auth-btn-apple"
            onClick={handleAppleSignIn}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path fill="#fff" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {t('signInApple')}
          </button>
        )}

        {/* Skip — con info limiti (nascosto se VITE_SKIP_MODE_ENABLED=false) */}
        {SKIP_ENABLED && (
          <>
            <div className="auth-divider">
              <span>{t('or')}</span>
            </div>
            <button className="auth-skip-btn" onClick={skipAuth}>
              {t('authSkip')} →
            </button>
            <p className="auth-skip-note">
              {t('authSkipNote')}
            </p>
            <div className="auth-skip-limits">
              <span>{t('skipLimitAI')}</span>
              <span>•</span>
              <span>{t('skipLimitVoice')}</span>
              <span>•</span>
              <span>{t('skipLimitCourses')}</span>
              <span>•</span>
              <span>{t('skipLimitDays')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
