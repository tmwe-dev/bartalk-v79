/**
 * BarTalk v8 — Client per /api/keys (gestione chiavi server-side)
 * Usato solo quando l'utente è autenticato. In skip mode le chiavi restano in localStorage.
 */

import { supabase } from './supabase';

const KEYS_URL = '/api/keys';

/** Costruisci headers con token Supabase */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }
  return headers;
}

/** Info su una chiave salvata nel vault (senza il valore) */
export interface VaultKeyInfo {
  provider: string;
  model: string | null;
  hasKey: boolean;
  updatedAt: string;
}

// ── GET: lista provider con chiave salvata ───────────────────────────
export async function listVaultKeys(): Promise<VaultKeyInfo[]> {
  try {
    const res = await fetch(KEYS_URL, { headers: await authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.keys || [];
  } catch (err) {
    console.warn('[keysAPI] listVaultKeys error:', err);
    return [];
  }
}

// ── POST: salva una chiave nel vault (criptata server-side) ──────────
export async function saveVaultKey(
  provider: string,
  apiKey: string,
  model?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(KEYS_URL, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ provider, apiKey, model }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── DELETE: rimuovi una chiave dal vault ──────────────────────────────
export async function deleteVaultKey(provider: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(KEYS_URL, {
      method: 'DELETE',
      headers: await authHeaders(),
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
