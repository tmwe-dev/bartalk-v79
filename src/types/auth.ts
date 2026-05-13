/**
 * BarTalk v8 — Tipi Autenticazione
 * Definizioni per il sistema auth con Supabase + modalità Skip.
 */

/** Stato del flusso di autenticazione */
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'skipped';

/** Utente autenticato (sottoinsieme di Supabase User) */
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

/** Tab visibile nella schermata auth */
export type AuthTab = 'login' | 'signup';

/** Info quota per skip mode */
export interface SkipQuotaInfo {
  remaining: { ai: number; tts: number; courses: number };
  daysRemaining: number;
  expired: boolean;
}

/** Valore esposto da AuthContext */
export interface AuthContextValue {
  user: AuthUser | null;
  authState: AuthState;
  isSkipMode: boolean;
  isGuestMode: boolean;
  isPasswordRecovery: boolean;
  skipQuotaInfo: SkipQuotaInfo | null;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle?: () => Promise<{ error?: string }>;
  signInWithApple?: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  skipAuth: () => void;
  guestAuth: () => void;
  resumeAuth: () => void;
  clearPasswordRecovery: () => void;
  error: string | null;
  clearError: () => void;
}
