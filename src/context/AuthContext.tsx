/**
 * BarTalk v8 — AuthContext
 * Gestisce autenticazione Supabase + modalità Skip.
 * Se Supabase non è configurato, solo skip mode è disponibile.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { AuthState, AuthUser, AuthContextValue } from '../types/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { initSkipQuota, hasExpired, getRemainingQuota, getRemainingDays } from '../lib/skipModeQuota';
import { clearSensitiveLocalData } from '../lib/storage';

// ── Chiave localStorage per skip mode ────────────────────────────────
const SKIP_KEY = 'bartalk_auth_skipped';
const GUEST_KEY = 'bartalk_guest_mode';

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
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    return localStorage.getItem(GUEST_KEY) === 'true';
  });
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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

      // Se guest mode attivo → accesso completo senza auth
      if (isGuestMode) {
        setUser({ id: 'guest', email: 'guest@bartalk.app', displayName: 'Guest' });
        setAuthState('authenticated');
        return;
      }

      // Se skip mode attivo → controlla scadenza
      if (isSkipMode) {
        if (hasExpired()) {
          // Sessione skip scaduta: torna al login
          localStorage.removeItem(SKIP_KEY);
          setIsSkipMode(false);
          setAuthState('unauthenticated');
          return;
        }
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
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mountedRef.current) return;

        // Intercetta PASSWORD_RECOVERY → mostra form nuova password
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.display_name,
            });
            setAuthState('authenticated');
          }
          return;
        }

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name,
          });
          setAuthState('authenticated');
          setIsSkipMode(false);
          localStorage.removeItem(SKIP_KEY);
          // Pulisci chiavi API dal localStorage — ora si usa il vault
          clearSensitiveLocalData();
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

  // ── Sign In with Google OAuth ──────────────────────────────────────
  const signInWithGoogle = useCallback(async (): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase non configurato' };
    setError(null);

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (err) {
      const msg = translateError(err.message);
      setError(msg);
      return { error: msg };
    }

    return {};
  }, []);

  // ── Sign In with Apple OAuth ────────────────────────────────────────
  const signInWithApple = useCallback(async (): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase non configurato' };
    setError(null);

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin,
      },
    });

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
    localStorage.removeItem(GUEST_KEY);
    setIsGuestMode(false);
    setUser(null);
    setAuthState('unauthenticated');
    setError(null);
  }, []);

  // ── Skip Auth ──────────────────────────────────────────────────────
  const skipAuth = useCallback(() => {
    localStorage.setItem(SKIP_KEY, 'true');
    initSkipQuota(); // Inizializza quota se non esiste
    setIsSkipMode(true);
    setAuthState('skipped');
    setError(null);
  }, []);

  // ── Guest Auth (accesso completo, nessuna quota) ──────────────────
  const guestAuth = useCallback(() => {
    localStorage.setItem(GUEST_KEY, 'true');
    setIsGuestMode(true);
    setUser({ id: 'guest', email: 'guest@bartalk.app', displayName: 'Guest' });
    setAuthState('authenticated');
    setError(null);
  }, []);

  // ── Resume Auth (torna al login dalla skip mode) ───────────────────
  const resumeAuth = useCallback(() => {
    localStorage.removeItem(SKIP_KEY);
    localStorage.removeItem(GUEST_KEY);
    setIsSkipMode(false);
    setIsGuestMode(false);
    setUser(null);
    setAuthState('unauthenticated');
    setError(null);
  }, []);

  // ── Clear Error ────────────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), []);

  // ── Clear Password Recovery ──────────────────────────────────────
  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  // ── Skip Quota Info ─────────────────────────────────────────────
  const skipQuotaInfo = isSkipMode ? {
    remaining: getRemainingQuota(),
    daysRemaining: getRemainingDays(),
    expired: hasExpired(),
  } : null;

  return (
    <AuthCtx.Provider value={{
      user,
      authState,
      isSkipMode,
      isGuestMode,
      isPasswordRecovery,
      skipQuotaInfo,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
      skipAuth,
      guestAuth,
      resumeAuth,
      clearPasswordRecovery,
      error,
      clearError,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuthContext deve essere usato dentro AuthProvider');
  return ctx;
}
