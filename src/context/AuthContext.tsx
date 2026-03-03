/**
 * BarTalk v8 — AuthContext
 * Gestisce autenticazione Supabase + modalità Skip.
 * Se Supabase non è configurato, solo skip mode è disponibile.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { AuthState, AuthUser, AuthContextValue } from '../types/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ── Chiave localStorage per skip mode ────────────────────────────────
const SKIP_KEY = 'bartalk_auth_skipped';

// ── Context ──────────────────────────────────────────────────────────
const AuthCtx = createContext<AuthContextValue | null>(null);

// ── Messaggi errore in italiano ──────────────────────────────────────
function translateError(msg: string): string {
  if (msg.includes('Invalid login')) return 'Email o password non validi';
  if (msg.includes('User already registered')) return 'Email già registrata';
  if (msg.includes('Password should be')) return 'La password deve avere almeno 6 caratteri';
  if (msg.includes('Email not confirmed')) return 'Conferma la tua email prima di accedere';
  if (msg.includes('rate limit')) return 'Troppi tentativi, riprova tra poco';
  return msg;
}

// ── Provider ─────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Controlla skip mode salvato
  const [isSkipMode, setIsSkipMode] = useState<boolean>(() => {
    return localStorage.getItem(SKIP_KEY) === 'true';
  });

  // ── Init: controlla sessione esistente o skip ──
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      // Se Supabase non configurato → forza skip mode
      if (!isSupabaseConfigured || !supabase) {
        setIsSkipMode(true);
        setAuthState('skipped');
        return;
      }

      // Se skip mode attivo → non controllare sessione
      if (isSkipMode) {
        setAuthState('skipped');
        return;
      }

      // Controlla sessione Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name,
          });
          setAuthState('authenticated');
        } else {
          setAuthState('unauthenticated');
        }
      } catch (err) {
        console.error('[auth] Errore getSession:', err);
        if (mountedRef.current) {
          setAuthState('unauthenticated');
        }
      }
    };

    init();

    // Listener per cambi di stato auth (logout da altro tab, token scaduto, etc.)
    let subscription: { unsubscribe: () => void } | null = null;

    if (supabase && isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mountedRef.current) return;

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name,
          });
          setAuthState('authenticated');
          setIsSkipMode(false);
          localStorage.removeItem(SKIP_KEY);
        } else if (!isSkipMode) {
          setUser(null);
          setAuthState('unauthenticated');
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign Up ────────────────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase non configurato' };
    setError(null);

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (err) {
      const msg = translateError(err.message);
      setError(msg);
      return { error: msg };
    }

    return {};
  }, []);

  // ── Sign In ────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase non configurato' };
    setError(null);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      const msg = translateError(err.message);
      setError(msg);
      return { error: msg };
    }

    return {};
  }, []);

  // ── Sign Out ───────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setAuthState('unauthenticated');
    setError(null);
  }, []);

  // ── Skip Auth ──────────────────────────────────────────────────────
  const skipAuth = useCallback(() => {
    localStorage.setItem(SKIP_KEY, 'true');
    setIsSkipMode(true);
    setAuthState('skipped');
    setError(null);
  }, []);

  // ── Resume Auth (torna al login dalla skip mode) ───────────────────
  const resumeAuth = useCallback(() => {
    localStorage.removeItem(SKIP_KEY);
    setIsSkipMode(false);
    setAuthState('unauthenticated');
    setError(null);
  }, []);

  // ── Clear Error ────────────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthCtx.Provider value={{
      user,
      authState,
      isSkipMode,
      signUp,
      signIn,
      signOut,
      skipAuth,
      resumeAuth,
      error,
      clearError,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuthContext deve essere usato dentro AuthProvider');
  return ctx;
}
