/**
 * BarTalk v8.2 — Conversations API
 * CRUD per conversazioni e messaggi (utenti autenticati).
 * GET    /api/conversations                — lista conversazioni
 * GET    /api/conversations?id=xxx         — dettaglio con messaggi
 * POST   /api/conversations                — crea nuova
 * PUT    /api/conversations                — aggiorna (title, summary)
 * DELETE /api/conversations?id=xxx         — elimina
 * POST   /api/conversations?action=message — aggiungi messaggio
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Non autenticato' });

  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Supabase non configurato' });

  const { id, action } = req.query || {};

  // ── GET ──
  if (req.method === 'GET') {
    if (id) {
      // Single conversation with messages
      const { data: conv, error: convErr } = await sb
        .from('chat_laboratory_conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (convErr) return res.status(404).json({ error: 'Conversazione non trovata' });

      const { data: messages } = await sb
        .from('chat_laboratory_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      return res.status(200).json({ conversation: conv, messages: messages || [] });
    }

    // List all conversations
    const { data, error } = await sb
      .from('chat_laboratory_conversations')
      .select('id, title, mode, message_count, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ conversations: data });
  }

  // ── POST ──
  if (req.method === 'POST') {
    // Add message to conversation
    if (action === 'message') {
      const { conversation_id, sender_type, sender_name, agent_id, content, model, tokens_used, latency_ms } = req.body || {};
      if (!conversation_id || !sender_type || !content) {
        return res.status(400).json({ error: 'Campi obbligatori: conversation_id, sender_type, content' });
      }

      const { data, error } = await sb
        .from('chat_laboratory_messages')
        .insert({
          conversation_id,
          user_id: user.id,
          sender_type,
          sender_name,
          agent_id,
          content: content.slice(0, 50000), // limit content size
          model,
          tokens_used,
          latency_ms,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      // Update conversation message count
      await sb.rpc('increment_message_count', { conv_id: conversation_id }).catch(() => {
        // Fallback if RPC not available
        sb.from('chat_laboratory_conversations')
          .update({ message_count: sb.raw('message_count + 1') })
          .eq('id', conversation_id);
      });

      return res.status(201).json(data);
    }

    // Create new conversation
    const { title, mode, composed_prompt_id } = req.body || {};
    const { data, error } = await sb
      .from('chat_laboratory_conversations')
      .insert({
        user_id: user.id,
        title: title || 'Nuova conversazione',
        mode: mode || 'consultation',
        composed_prompt_id,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // ── PUT ──
  if (req.method === 'PUT') {
    const { conversation_id, title, cumulative_summary, mode } = req.body || {};
    if (!conversation_id) return res.status(400).json({ error: 'conversation_id richiesto' });

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (cumulative_summary !== undefined) updates.cumulative_summary = cumulative_summary;
    if (mode !== undefined) updates.mode = mode;

    const { data, error } = await sb
      .from('chat_laboratory_conversations')
      .update(updates)
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // ── DELETE ──
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id richiesto' });

    const { error } = await sb
      .from('chat_laboratory_conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Metodo non supportato' });
}
