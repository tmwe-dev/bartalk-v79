/**
 * BarTalk v8.2.5 — xAPI Statement Receiver
 * POST /api/xapi — accept xAPI statement batches
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

    const { statements } = req.body || {};

    if (!Array.isArray(statements) || statements.length === 0) {
      return res.status(400).json({ error: 'Expected non-empty statements array' });
    }

    // Map xAPI statements to DB rows
    const rows = statements.map((s) => ({
      user_id: user.id,
      verb: s.verb?.id || s.verb || '',
      object_id: s.object?.id || '',
      object_type: s.object?.objectType || 'Activity',
      result: s.result || null,
      context: s.context || null,
      timestamp: s.timestamp || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('xapi_statements')
      .insert(rows)
      .select('id');

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      ok: true,
      stored: data?.length || 0,
    });
  } catch (err) {
    console.error('[xapi] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
