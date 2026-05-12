/**
 * BarTalk v8.2.5 — Education Data Sync API
 * POST /api/education — sync education data (study sessions, progress, etc.)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function extractToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  try {
    const supabase = getSupabase();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { action, payload } = req.body || {};

    switch (action) {
      case 'sync_session': {
        const { data, error } = await supabase
          .from('study_sessions')
          .upsert({ ...payload, user_id: user.id }, { onConflict: 'id' })
          .select()
          .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ ok: true, session: data });
      }

      case 'get_progress': {
        const { data, error } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(50);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ ok: true, sessions: data });
      }

      default:
        return res.status(200).json({ ok: true, message: 'Education API ready' });
    }
  } catch (err) {
    console.error('[education] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
