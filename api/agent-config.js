/**
 * BarTalk v8.2 — Agent Config API
 * CRUD per configurazione agenti per utente (freedom levels, modelli custom).
 * GET  /api/agent-config            — lista config agenti
 * PUT  /api/agent-config            — aggiorna config agente
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Non autenticato' });

  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Supabase non configurato' });

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('user_agent_configs')
      .select('*')
      .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ configs: data || [] });
  }

  if (req.method === 'PUT') {
    const { agent_id, is_enabled, freedom_level, custom_instructions, custom_model, custom_temperature } = req.body || {};
    if (!agent_id) return res.status(400).json({ error: 'agent_id richiesto' });

    // Validate freedom level
    const validLevels = ['strict', 'balanced', 'creative', 'autonomous'];
    if (freedom_level && !validLevels.includes(freedom_level)) {
      return res.status(400).json({ error: 'freedom_level non valido' });
    }

    const updates = { user_id: user.id, agent_id };
    if (is_enabled !== undefined) updates.is_enabled = is_enabled;
    if (freedom_level !== undefined) updates.freedom_level = freedom_level;
    if (custom_instructions !== undefined) updates.custom_instructions = custom_instructions;
    if (custom_model !== undefined) updates.custom_model = custom_model;
    if (custom_temperature !== undefined) updates.custom_temperature = custom_temperature;

    const { data, error } = await sb
      .from('user_agent_configs')
      .upsert(updates, { onConflict: 'user_id,agent_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Metodo non supportato' });
}
