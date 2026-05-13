/**
 * BarTalk v8 — Password Reset Component
 * Permette all'utente di richiedere il reset della password via email.
 */

import { useState } from 'react';
import { useT } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

interface PasswordResetProps {
  onBack: () => void;
}

export function PasswordReset({ onBack }: PasswordResetProps) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (!supabase) throw new Error('Supabase non configurato');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?reset=true`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il reset');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="password-reset">
        <div className="password-reset__success">
          <h3>{t('resetSuccess')}</h3>
          <p>
            {t('resetSuccessDesc')} (<strong>{email}</strong>).
          </p>
          <button className="password-reset__btn" onClick={onBack}>
            {t('authBackLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset">
      <h3>{t('resetTitle')}</h3>
      <p className="password-reset__desc">
        {t('resetDesc')}
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder={t('resetPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="password-reset__input"
          required
          autoFocus
        />
        {error && <div className="password-reset__error">{error}</div>}
        <button
          type="submit"
          className="password-reset__btn password-reset__btn--primary"
          disabled={loading}
        >
          {loading ? t('resetSending') : t('resetButton')}
        </button>
      </form>
      <button className="password-reset__back" onClick={onBack}>
        {t('authBackLogin')}
      </button>
    </div>
  );
}
