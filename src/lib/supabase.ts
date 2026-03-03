/**
 * BarTalk v8 — Client Supabase (singleton)
 * Se le variabili ambiente mancano, l'app funziona in modalità Skip.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true se le env vars Supabase sono configurate */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Client Supabase — null se non configurato */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
