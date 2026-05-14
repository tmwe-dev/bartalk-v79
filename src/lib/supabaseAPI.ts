/**
 * @module supabaseAPI
 * Supabase API helpers providing CRUD operations for all database tables.
 * Used by Context providers when the user is authenticated.
 * In skip mode these helpers are not called (localStorage is used instead).
 *
 * Tables managed: workspaces, user_settings, api_keys_vault, conversations,
 * messages, audit_logs. Includes full-text search across messages.
 */

import { supabase } from './supabase';
import type { ConversationMode, TurnStrategy } from '../types/conversation';
import type { AppLanguage } from '../types/settings';

// ── Tipi DB ──────────────────────────────────────────────────────────

/** Database row type for the workspaces table. */
export interface DBWorkspace {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/** Database row type for the user_settings table. */
export interface DBSettings {
  id: string;
  workspace_id: string;
  conversation_mode: ConversationMode;
  turn_strategy: TurnStrategy;
  tts_enabled: boolean;
  auto_run: boolean;
  language: AppLanguage;
  temperature: number;
  max_tokens: number;
  word_range: [number, number];
  custom_voices: Record<string, string>;
  excluded_agents: string[];
  custom_personalities: Record<string, string>;
  prompt_sections: unknown[];
}

/** Database row type for the api_keys_vault table. */
export interface DBAPIKey {
  id: string;
  workspace_id: string;
  provider: string;
  encrypted_key: string;
  model: string | null;
}

/** Database row type for the conversations table. */
export interface DBConversation {
  id: string;
  workspace_id: string;
  title: string;
  turn_index: number;
  created_at: string;
  updated_at: string;
}

/** Database row type for the messages table. */
export interface DBMessage {
  id: string;
  conversation_id: string;
  sender_type: 'human' | 'assistant' | 'system';
  agent_name: string | null;
  provider: string | null;
  content: string;
  tokens_in: number;
  tokens_out: number;
  duration_ms: number;
  is_demo: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Helper: controlla che Supabase sia attivo ────────────────────────

function requireSupabase() {
  if (!supabase) throw new Error('[supabaseAPI] Client non configurato');
  return supabase;
}

// ══════════════════════════════════════════════════════════════════════
// WORKSPACES
// ══════════════════════════════════════════════════════════════════════

/** Ottieni il workspace dell'utente (il trigger ne crea uno al signup) */
export async function getWorkspace(userId: string): Promise<DBWorkspace | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('workspaces')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    console.warn('[supabaseAPI] getWorkspace error:', error.message);
    return null;
  }
  return data;
}

// ══════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════

/**
 * Loads user settings for a workspace from the user_settings table.
 * @param workspaceId - The workspace to load settings for
 * @returns Settings object or null if not found
 */
export async function loadSettings(workspaceId: string): Promise<DBSettings | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('user_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.warn('[supabaseAPI] loadSettings error:', error.message);
  }
  return data || null;
}

/**
 * Upserts user settings for a workspace.
 * @param workspaceId - Target workspace ID
 * @param settings - Partial settings to merge/update
 */
export async function saveSettings(workspaceId: string, settings: Partial<Omit<DBSettings, 'id' | 'workspace_id'>>): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('user_settings')
    .upsert({
      workspace_id: workspaceId,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' });

  if (error) console.error('[supabaseAPI] saveSettings error:', error.message);
}

// ══════════════════════════════════════════════════════════════════════
// API KEYS VAULT
// ══════════════════════════════════════════════════════════════════════

/**
 * Loads all encrypted API keys for a workspace from the vault.
 * @param workspaceId - The workspace to load keys for
 * @returns Array of API key entries
 */
export async function loadAPIKeys(workspaceId: string): Promise<DBAPIKey[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('api_keys_vault')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.warn('[supabaseAPI] loadAPIKeys error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Upserts an encrypted API key in the vault for a workspace/provider pair.
 * @param workspaceId - Target workspace ID
 * @param provider - AI provider name (e.g., 'openai', 'anthropic')
 * @param encryptedKey - The encrypted API key string
 * @param model - Optional model override
 */
export async function saveAPIKey(
  workspaceId: string,
  provider: string,
  encryptedKey: string,
  model?: string,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('api_keys_vault')
    .upsert({
      workspace_id: workspaceId,
      provider,
      encrypted_key: encryptedKey,
      model: model || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,provider' });

  if (error) console.error('[supabaseAPI] saveAPIKey error:', error.message);
}

/**
 * Deletes an API key from the vault for a specific workspace and provider.
 * @param workspaceId - Target workspace ID
 * @param provider - AI provider whose key should be removed
 */
export async function deleteAPIKey(workspaceId: string, provider: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('api_keys_vault')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('provider', provider);

  if (error) console.error('[supabaseAPI] deleteAPIKey error:', error.message);
}

// ══════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ══════════════════════════════════════════════════════════════════════

/**
 * Loads all conversations for a workspace, ordered by most recently updated.
 * @param workspaceId - The workspace to load conversations for
 * @returns Array of conversation records
 */
export async function loadConversations(workspaceId: string): Promise<DBConversation[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('conversations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[supabaseAPI] loadConversations error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Upserts a conversation record in the database.
 * @param workspaceId - Target workspace ID
 * @param conversation - Conversation data to save (id, title, turn_index)
 */
export async function saveConversation(
  workspaceId: string,
  conversation: { id: string; title: string; turn_index: number },
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('conversations')
    .upsert({
      id: conversation.id,
      workspace_id: workspaceId,
      title: conversation.title,
      turn_index: conversation.turn_index,
      updated_at: new Date().toISOString(),
    });

  if (error) console.error('[supabaseAPI] saveConversation error:', error.message);
}

/**
 * Deletes conversation.
 * @param conversationId - The conversationId parameter
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const sb = requireSupabase();
  // Messages are cascaded
  const { error } = await sb
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) console.error('[supabaseAPI] deleteConversation error:', error.message);
}

// ══════════════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════════════

/**
 * Loads messages from storage.
 * @param conversationId - The conversationId parameter
 * @returns Promise<DBMessage[]>
 */
export async function loadMessages(conversationId: string): Promise<DBMessage[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[supabaseAPI] loadMessages error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Saves message to storage.
 */
export async function saveMessage(
  conversationId: string,
  message: Omit<DBMessage, 'id' | 'created_at'>,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: message.sender_type,
      agent_name: message.agent_name,
      provider: message.provider,
      content: message.content,
      tokens_in: message.tokens_in,
      tokens_out: message.tokens_out,
      duration_ms: message.duration_ms,
      is_demo: message.is_demo,
      metadata: message.metadata,
    });

  if (error) console.error('[supabaseAPI] saveMessage error:', error.message);
}

/** Salva un batch di messaggi (per import/migration) */
export async function saveMessagesBatch(
  conversationId: string,
  messages: Omit<DBMessage, 'id' | 'created_at'>[],
): Promise<void> {
  const sb = requireSupabase();
  const rows = messages.map(m => ({
    conversation_id: conversationId,
    sender_type: m.sender_type,
    agent_name: m.agent_name,
    provider: m.provider,
    content: m.content,
    tokens_in: m.tokens_in,
    tokens_out: m.tokens_out,
    duration_ms: m.duration_ms,
    is_demo: m.is_demo,
    metadata: m.metadata,
  }));

  const { error } = await sb
    .from('messages')
    .insert(rows);

  if (error) console.error('[supabaseAPI] saveMessagesBatch error:', error.message);
}

// ══════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════════════

/**
 * LogAudit.
 */
export async function logAudit(
  workspaceId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('audit_logs')
    .insert({
      workspace_id: workspaceId,
      action,
      details: details || {},
    });

  if (error) console.warn('[supabaseAPI] logAudit error:', error.message);
}

// ── Search messages in DB ─────────────────────────────────────────────
/** Result of a database message search, grouped by conversation. */
export interface DBSearchResult {
  conversationId: string;
  matchCount: number;
  snippet: string;
}

/**
 * Searches message content across a workspace using case-insensitive matching.
 * Groups results by conversation with match counts and text snippets.
 *
 * @param workspaceId - Workspace to search in
 * @param query - Search query (min 2 characters)
 * @returns Array of search results grouped by conversation
 */
export async function searchMessages(workspaceId: string, query: string): Promise<DBSearchResult[]> {
  if (!supabase || !query || query.trim().length < 2) return [];
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id, content')
      .eq('workspace_id', workspaceId)
      .ilike('content', `%${query}%`)
      .limit(200);

    if (error || !data) return [];

    const grouped = new Map<string, { count: number; snippet: string }>();
    for (const row of data) {
      const existing = grouped.get(row.conversation_id);
      if (existing) {
        existing.count++;
      } else {
        const idx = (row.content as string).toLowerCase().indexOf(query.toLowerCase());
        const start = Math.max(0, idx - 30);
        grouped.set(row.conversation_id, {
          count: 1,
          snippet: (row.content as string).substring(start, start + 80),
        });
      }
    }

    return Array.from(grouped.entries()).map(([conversationId, v]) => ({
      conversationId,
      matchCount: v.count,
      snippet: v.snippet,
    }));
  } catch (err) {
    console.error('[supabaseAPI] searchMessages error:', err);
    return [];
  }
}
