/**
 * authToken.ts — Centralizzazione recupero token di autenticazione
 *
 * Sostituisce le implementazioni duplicate in auditAPI.ts e monitorAPI.ts.
 * Supporta sia pattern sincrono (localStorage) che asincrono (Supabase client).
 */

import { supabase } from './supabase';

/**
 * Recupera il token JWT Supabase dal localStorage (sincrono).
 * Supabase salva la sessione con chiave `sb-<ref>-auth-token`.
 */
export function getAuthToken(): string | null {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const session = JSON.parse(localStorage.getItem(key) || '');
        return session?.access_token || null;
      }
    }
  } catch {
    /* localStorage non disponibile o JSON invalido */
  }
  return null;
}

/**
 * Recupera il token JWT via Supabase client (asincrono, più affidabile).
 * Usa il client Supabase se disponibile, altrimenti fallback a localStorage.
 */
export async function getAuthTokenAsync(): Promise<string | null> {
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch {
      /* fallback a sync */
    }
  }
  return getAuthToken();
}

/**
 * Genera gli header di autenticazione per le API call.
 * Lancia errore se non autenticato.
 */
export function buildAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) throw new Error('Non autenticato. Effettua il login.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Genera gli header di autenticazione (asincrono).
 * Non lancia errore — restituisce header senza auth se non autenticato.
 */
export async function buildAuthHeadersAsync(): Promise<Record<string, string>> {
  const token = await getAuthTokenAsync();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
