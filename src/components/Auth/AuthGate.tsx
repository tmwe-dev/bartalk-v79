/**
 * BarTalk v8 — AuthGate
 * Schermata di autenticazione che appare prima dell'app.
 * Mostra login/signup con pulsante "Salta per ora" prominente.
 * Se l'utente è autenticato o ha skippato, mostra i children (l'app).
 */

import { useState, type ReactNode, type FormEvent } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import type { AuthTab } from '../../types/auth';
import './AuthGate.css';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { authState, isSkipMode, signIn, signUp, skipAuth, error, clearError } = useAuthContext();
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // ── Se autenticato o skip → mostra l'app ──
  if (authState === 'authenticated' || authState === 'skipped' || isSkipMode) {
    return <>{children}</>;
  }

  // ── Loading iniziale ──
  if (authState === 'loading') {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <div className="auth-logo">🎙️</div>
          <h1 className="auth-title">BarTalk</h1>
          <div className="auth-loading">Caricamento...</div>
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
          <h1 className="auth-title">Controlla la tua email</h1>
          <p className="auth-subtitle">
            Ti abbiamo inviato un link di conferma. Clicca il link per attivare il tuo account.
          </p>
          <button
            className="auth-btn auth-btn-secondary"
            onClick={() => { setSignupSuccess(false); setTab('login'); }}
          >
            Torna al login
          </button>
          <button className="auth-skip-btn" onClick={skipAuth}>
            Salta per ora →
          </button>
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
        <h1 className="auth-title">BarTalk</h1>
        <p className="auth-subtitle">Radio Chat con 4 Agenti AI</p>

        {/* Tab Login / Registrati */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
          >
            Accedi
          </button>
          <button
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => switchTab('signup')}
          >
            Registrati
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
            {loading ? '...' : tab === 'login' ? 'Accedi' : 'Crea account'}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>oppure</span>
        </div>

        {/* Skip — grande e prominente */}
        <button className="auth-skip-btn" onClick={skipAuth}>
          Salta per ora →
        </button>
        <p className="auth-skip-note">
          Usa BarTalk senza account. I dati saranno salvati solo sul tuo browser.
        </p>
      </div>
    </div>
  );
}
