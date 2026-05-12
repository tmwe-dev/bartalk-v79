/**
 * BarTalk v8.2 — Auth Callback
 * Gestisce il redirect da Supabase auth (email confirm, OAuth, magic link).
 * Rotta: /auth/callback
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setStatus('error');
        setErrorMsg('Supabase non configurato.');
        return;
      }

      try {
        // Supabase gestisce automaticamente il token dall'URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setStatus('error');
          setErrorMsg(error.message);
          return;
        }

        if (session) {
          setStatus('success');
          // Controlla se ha completato onboarding
          const onboarded = localStorage.getItem('bartalk_onboarding_completed');
          setTimeout(() => {
            navigate(onboarded ? '/radio-chat' : '/welcome', { replace: true });
          }, 1500);
        } else {
          setStatus('error');
          setErrorMsg('Sessione non trovata. Riprova il login.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg('Errore durante la verifica. Riprova.');
        console.error('[auth/callback]', err);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="auth-gate">
      <div className="auth-card">
        {status === 'loading' && (
          <>
            <div className="auth-logo">🔄</div>
            <h1 className="auth-title">Verifica in corso...</h1>
            <p className="auth-subtitle">Stiamo confermando il tuo account.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="auth-logo">✅</div>
            <h1 className="auth-title">Account confermato!</h1>
            <p className="auth-subtitle">Reindirizzamento in corso...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="auth-logo">❌</div>
            <h1 className="auth-title">Errore</h1>
            <p className="auth-subtitle">{errorMsg}</p>
            <button className="auth-btn auth-btn-primary" onClick={() => navigate('/login')}>
              Torna al login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
