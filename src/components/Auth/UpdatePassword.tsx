/**
 * BarTalk v8 — UpdatePassword Component
 * Mostrato quando l'utente clicca il link di reset password nell'email.
 * Permette di inserire la nuova password.
 */

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface UpdatePasswordProps {
  onComplete: () => void;
}

export function UpdatePassword({ onComplete }: UpdatePasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    setLoading(true);
    try {
      if (!supabase) throw new Error('Supabase non configurato');
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      // Dopo 2 secondi, torna all'app
      setTimeout(() => onComplete(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="password-reset">
        <div className="password-reset__success">
          <h3>Password aggiornata!</h3>
          <p>La tua password è stata cambiata con successo. Stai per essere reindirizzato...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset">
      <h3>Nuova Password</h3>
      <p className="password-reset__desc">
        Inserisci la tua nuova password.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nuova password (min. 6 caratteri)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="password-reset__input"
          minLength={6}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Conferma password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="password-reset__input"
          minLength={6}
          required
        />
        {error && <div className="password-reset__error">{error}</div>}
        <button
          type="submit"
          className="password-reset__btn password-reset__btn--primary"
          disabled={loading}
        >
          {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
        </button>
      </form>
    </div>
  );
}
