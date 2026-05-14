/**
 * @module supabase
 * Supabase client singleton.
 * Creates and exports the Supabase client instance using environment variables,
 * with a configuration check flag for conditional feature enablement.
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
