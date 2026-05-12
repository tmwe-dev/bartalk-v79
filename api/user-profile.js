/**
 * BarTalk v8.2 — User Profile API
 * GET: recupera profilo utente
 * PUT: aggiorna profilo utente
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Non autenticato' });

  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Supabase non configurato' });

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Profilo non trovato' });
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { display_name, language, preferences, onboarding_completed, plan } = req.body || {};

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (language !== undefined) updates.language = language;
    if (preferences !== undefined) updates.preferences = preferences;
    if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed;
    if (plan !== undefined) updates.plan = plan;

    const { data, error } = await sb
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Metodo non supportato' });
}
