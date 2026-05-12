/**
 * BarTalk v8.2 — Login Page (standalone)
 * Rotta: /login
 * Reindirizza a /radio-chat se già autenticato.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { AuthGate } from '../components/Auth/AuthGate';

export function LoginPage() {
  const navigate = useNavigate();
  const { authState, isSkipMode } = useAuthContext();

  useEffect(() => {
    if (authState === 'authenticated' || isSkipMode) {
      navigate('/radio-chat', { replace: true });
    }
  }, [authState, isSkipMode, navigate]);

  return (
    <div role="main" aria-label="Login BarTalk">
      <AuthGate>
        {/* Se l'utente passa il gate, redirect automatico via useEffect */}
        <div />
      </AuthGate>
    </div>
  );
}
