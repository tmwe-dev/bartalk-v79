/**
 * @module storage
 * LocalStorage persistence layer for BarTalk. Provides CRUD operations for API keys,
 * custom voices, excluded agents, conversation messages, settings, studio runs,
 * and conversation list management. Also includes full-text search across all stored conversations.
 *
 * In skip mode (unauthenticated), this is the primary data store.
 * When authenticated, it serves as a local cache synchronized with Supabase.
 */

import type { APIKeyEntry, VoiceConfig } from '../types/settings';
import type { Message } from '../types/conversation';

// ── Chiavi localStorage ──────────────────────────────────────────────
const KEYS = {
  apiKeys: 'bartalk_api_keys',
  customVoices: 'bartalk_custom_voices',
  excludedAgents: 'bartalk_excluded_agents',
  keysConfigured: 'bartalk_keys_configured',
  onboardingDone: 'radiochat-onboarding-done',
  conversations: 'bartalk_conversations',
  studioRuns: 'bartalk_studio_runs',
  settings: 'bartalk_settings',
  currentConversation: 'bartalk_current_conversation',
  conversationList: 'bartalk_conversation_list',
} as const;

// ── Helpers generici ─────────────────────────────────────────────────
function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[storage] Errore scrittura:', key, e);
  }
}

// ── Skip mode ───────────────────────────────────────────────────────
function isInSkipMode(): boolean {
  return localStorage.getItem('bartalk_auth_skipped') === 'true';
}
export { isInSkipMode };

/**
 * Loads all stored API key entries from localStorage.
 * @returns Array of API key entries, empty if none stored
 */
export function loadAPIKeys(): APIKeyEntry[] {
  return getJSON<APIKeyEntry[]>(KEYS.apiKeys, []);
}

/**
 * Saves API key entries to localStorage and marks keys as configured.
 * @param keys - Array of API key entries to persist
 */
export function saveAPIKeys(keys: APIKeyEntry[]): void {
  setJSON(KEYS.apiKeys, keys);
  localStorage.setItem(KEYS.keysConfigured, 'true');
}

/** Removes API keys and configuration flag from localStorage. */
export function clearSensitiveLocalData(): void {
  localStorage.removeItem(KEYS.apiKeys);
  localStorage.removeItem(KEYS.keysConfigured);
}

/**
 * Retrieves the API key for a specific provider.
 * @param provider - Provider identifier (e.g., 'openai', 'anthropic')
 * @returns The API key string, or null if not found
 */
export function getAPIKey(provider: string): string | null {
  const keys = loadAPIKeys();
  const entry = keys.find(k => k.provider === provider);
  return entry?.apiKey || null;
}

/**
 * Retrieves the selected model for a specific provider.
 * @param provider - Provider identifier
 * @returns The model string, or null if not configured
 */
export function getModel(provider: string): string | null {
  const keys = loadAPIKeys();
  const entry = keys.find(k => k.provider === provider);
  return entry?.model || null;
}

/**
 * Loads custom voice assignments from localStorage.
 * @returns Voice config mapping agent names to ElevenLabs voice IDs
 */
export function loadCustomVoices(): VoiceConfig {
  return getJSON<VoiceConfig>(KEYS.customVoices, {});
}

/**
 * Persists custom voice assignments to localStorage.
 * @param voices - Voice config to save
 */
export function saveCustomVoices(voices: VoiceConfig): void {
  setJSON(KEYS.customVoices, voices);
}

/**
 * Loads the list of excluded agent IDs from localStorage.
 * @returns Array of agent IDs that are disabled
 */
export function loadExcludedAgents(): string[] {
  return getJSON<string[]>(KEYS.excludedAgents, []);
}

/**
 * Persists the list of excluded agent IDs to localStorage.
 * @param excluded - Agent IDs to exclude from conversations
 */
export function saveExcludedAgents(excluded: string[]): void {
  setJSON(KEYS.excludedAgents, excluded);
}

/**
 * Loads messages for a specific conversation from localStorage.
 * @param conversationId - The conversation to load
 * @returns Array of messages, empty if not found
 */
export function loadConversationMessages(conversationId: string): Message[] {
  return getJSON<Message[]>(`bartalk_messages_${conversationId}`, []);
}

/**
 * Persists messages for a conversation to localStorage.
 * @param conversationId - The conversation to save
 * @param messages - Array of messages to persist
 */
export function saveConversationMessages(conversationId: string, messages: Message[]): void {
  setJSON(`bartalk_messages_${conversationId}`, messages);
}

/**
 * Loads general application settings from localStorage.
 * @param fallback - Default value if no settings are stored
 * @returns Parsed settings or the fallback value
 */
export function loadSettings<T>(fallback: T): T {
  return getJSON<T>(KEYS.settings, fallback);
}

/**
 * Persists general application settings to localStorage.
 * @param settings - Settings object to save
 */
export function saveSettings(settings: unknown): void {
  setJSON(KEYS.settings, settings);
}

// ── Studio runs ──────────────────────────────────────────────────────
export function loadStudioRuns() {
  return getJSON<unknown[]>(KEYS.studioRuns, []);
}

export function saveStudioRuns(runs: unknown[]): void {
  // Mantieni solo le ultime 50
  setJSON(KEYS.studioRuns, runs.slice(-50));
}

// ── Conversation list management ─────────────────────────────────────
/** Metadata for a conversation in the conversation list (without full messages). */
export interface ConversationMeta {
  id: string;
  title: string;
  turnIndex: number;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string; // preview
}

/**
 * Loads the conversation list metadata from localStorage.
 * @returns Array of conversation metadata entries
 */
export function loadConversationList(): ConversationMeta[] {
  return getJSON<ConversationMeta[]>(KEYS.conversationList, []);
}

/**
 * Persists conversation list metadata to localStorage.
 * @param list - Array of conversation metadata entries
 */
export function saveConversationList(list: ConversationMeta[]): void {
  setJSON(KEYS.conversationList, list);
}

/**
 * Gets the currently active conversation ID from localStorage.
 * @returns The current conversation ID, or null if none is active
 */
export function getCurrentConversationId(): string | null {
  return localStorage.getItem(KEYS.currentConversation) || null;
}

/**
 * Sets the currently active conversation ID in localStorage.
 * @param id - The conversation ID to set as current
 */
export function setCurrentConversationId(id: string): void {
  localStorage.setItem(KEYS.currentConversation, id);
}

/**
 * Deletes all data for a conversation (messages and list entry).
 * @param id - The conversation ID to delete
 */
export function deleteConversationData(id: string): void {
  localStorage.removeItem(`bartalk_messages_${id}`);
  const list = loadConversationList();
  saveConversationList(list.filter(c => c.id !== id));
}

/** Result from a local conversation search. */
export interface SearchResult {
  convId: string;
  matchCount: number;
  snippet: string;
}

/**
 * Performs full-text search across all conversations stored in localStorage.
 * @param query - Search query (min 2 characters)
 * @returns Array of search results with conversation IDs, match counts, and snippets
 */
export function searchAllConversations(query: string): SearchResult[] {
  if (!query || query.trim().length < 2) return [];
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];
  const list = loadConversationList();
  for (const conv of list) {
    const raw = localStorage.getItem(`bartalk_messages_${conv.id}`);
    if (!raw) continue;
    try {
      const messages: { content?: string }[] = JSON.parse(raw);
      let matchCount = 0;
      let snippet = '';
      for (const m of messages) {
        if (m.content && m.content.toLowerCase().includes(lowerQuery)) {
          matchCount++;
          if (!snippet) {
            const idx = m.content.toLowerCase().indexOf(lowerQuery);
            const start = Math.max(0, idx - 30);
            snippet = m.content.substring(start, start + 80);
          }
        }
      }
      if (matchCount > 0) results.push({ convId: conv.id, matchCount, snippet });
    } catch { /* skip corrupted */ }
  }
  return results;
}
