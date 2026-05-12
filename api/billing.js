/**
 * BarTalk v8.2 — Billing API
 * GET /api/billing — stato subscription utente
 * GET /api/billing?action=plans — lista piani disponibili
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo non supportato' });

  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Supabase non configurato' });

  const { action } = req.query || {};

  // Lista piani (pubblico)
  if (action === 'plans') {
    const { data, error } = await sb
      .from('billing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ plans: data });
  }

  // Stato subscription (richiede auth)
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Non autenticato' });

  const { data: subscription } = await sb
    .from('stripe_subscriptions')
    .select('*, billing_plans(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const { data: profile } = await sb
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  return res.status(200).json({
    plan: profile?.plan || 'free',
    subscription: subscription || null,
    isActive: !!subscription,
  });
}
