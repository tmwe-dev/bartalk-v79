// Vercel Serverless Function: API Keys Manager per BarTalk v8
// Gestisce CRUD chiavi API con encryption AES-256-GCM server-side.
// Le chiavi non transitano MAI in chiaro dopo il primo salvataggio.

import { createClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// ── Config ───────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''; // 32 bytes hex (64 chars)
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

// ── CORS (stessi domini del proxy) ───────────────────────────────────
const ALLOWED_ORIGINS_EXACT = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

if (ALLOWED_ORIGINS_EXACT.length === 0) {
  ALLOWED_ORIGINS_EXACT.push(
    'https://bartalk-v79.vercel.app',
    'https://bartalk-v79-git-main-tmwe-devs-projects.vercel.app',
  );
}

const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || '';
  const clean = origin.replace(/\/$/, '');
  if (!clean) return null;
  if (ALLOWED_ORIGINS_EXACT.includes(clean)) return clean;
  if (LOCALHOST_PATTERN.test(clean)) return clean;
  return null;
}

// ── JWT verification (stessa del proxy) ──────────────────────────────
function verifyJWT(token) {
  if (!SUPABASE_JWT_SECRET || !token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload.sub || null;
  } catch {
    return null;
  }
}

// ── Encryption: AES-256-GCM ─────────────────────────────────────────
function getEncryptionKey() {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 64) {
    throw new Error('ENCRYPTION_KEY env var mancante o troppo corta (serve 64 hex chars = 32 bytes)');
  }
  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV per GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Formato: iv:authTag:encrypted (tutto in hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error('Formato ciphertext non valido');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ── Supabase admin client (service role per bypassare RLS) ───────────
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY non configurate');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ══════════════════════════════════════════════════════════════════════
// Handler
// ══════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  // CORS
  const origin = getAllowedOrigin(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // Auth obbligatoria (questo endpoint non supporta skip mode)
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Auth token richiesto per gestire le chiavi API' });
  }

  const userId = verifyJWT(authHeader.slice(7));
  if (!userId) {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }

  try {
    const sb = getSupabaseAdmin();

    // Trova workspace dell'utente
    const { data: workspace, error: wsErr } = await sb
      .from('workspaces')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (wsErr || !workspace) {
      return res.status(404).json({ error: 'Workspace non trovato' });
    }

    const workspaceId = workspace.id;

    // ── GET: lista provider salvati (senza chiavi in chiaro) ──
    if (req.method === 'GET') {
      const { data: keys, error } = await sb
        .from('api_keys_vault')
        .select('id, provider, model, created_at, updated_at')
        .eq('workspace_id', workspaceId);

      if (error) {
        return res.status(500).json({ error: 'Errore lettura chiavi', detail: error.message });
      }

      // Restituisci solo provider e modello, MAI la chiave
      return res.status(200).json({
        keys: (keys || []).map(k => ({
          provider: k.provider,
          model: k.model,
          hasKey: true,
          updatedAt: k.updated_at,
        })),
      });
    }

    // ── POST: salva/aggiorna una chiave ──
    if (req.method === 'POST') {
      const { provider, apiKey, model } = req.body || {};

      if (!provider || !apiKey) {
        return res.status(400).json({ error: 'provider e apiKey sono obbligatori' });
      }

      if (typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 256) {
        return res.status(400).json({ error: 'Formato apiKey non valido (10-256 caratteri)' });
      }

      // Encrypt la chiave
      const encryptedKey = encrypt(apiKey);

      const { error } = await sb
        .from('api_keys_vault')
        .upsert({
          workspace_id: workspaceId,
          provider,
          encrypted_key: encryptedKey,
          model: model || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,provider' });

      if (error) {
        return res.status(500).json({ error: 'Errore salvataggio chiave', detail: error.message });
      }

      // Log audit
      await sb.from('audit_logs').insert({
        workspace_id: workspaceId,
        user_id: userId,
        action: 'api_key_saved',
        details: { provider, model: model || null },
      }).catch(() => {}); // non bloccare se audit fallisce

      return res.status(200).json({ success: true, provider });
    }

    // ── DELETE: rimuovi una chiave ──
    if (req.method === 'DELETE') {
      const { provider } = req.body || {};

      if (!provider) {
        return res.status(400).json({ error: 'provider è obbligatorio' });
      }

      const { error } = await sb
        .from('api_keys_vault')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('provider', provider);

      if (error) {
        return res.status(500).json({ error: 'Errore eliminazione chiave', detail: error.message });
      }

      // Log audit
      await sb.from('audit_logs').insert({
        workspace_id: workspaceId,
        user_id: userId,
        action: 'api_key_deleted',
        details: { provider },
      }).catch(() => {});

      return res.status(200).json({ success: true, provider });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[keys] Fatal error:', error.message);
    return res.status(500).json({ error: 'Errore interno', detail: error.message });
  }
}
