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

// ── API Keys ─────────────────────────────────────────────────────────
export function loadAPIKeys(): APIKeyEntry[] {
  return getJSON<APIKeyEntry[]>(KEYS.apiKeys, []);
}

export function saveAPIKeys(keys: APIKeyEntry[]): void {
  setJSON(KEYS.apiKeys, keys);
  localStorage.setItem(KEYS.keysConfigured, 'true');
}

export function getAPIKey(provider: string): string | null {
  const keys = loadAPIKeys();
  const entry = keys.find(k => k.provider === provider);
  return entry?.apiKey || null;
}

export function getModel(provider: string): string | null {
  const keys = loadAPIKeys();
  const entry = keys.find(k => k.provider === provider);
  return entry?.model || null;
}

// ── Voci custom ──────────────────────────────────────────────────────
export function loadCustomVoices(): VoiceConfig {
  return getJSON<VoiceConfig>(KEYS.customVoices, {});
}

export function saveCustomVoices(voices: VoiceConfig): void {
  setJSON(KEYS.customVoices, voices);
}

// ── Agenti esclusi ───────────────────────────────────────────────────
export function loadExcludedAgents(): string[] {
  return getJSON<string[]>(KEYS.excludedAgents, []);
}

export function saveExcludedAgents(excluded: string[]): void {
  setJSON(KEYS.excludedAgents, excluded);
}

// ── Conversazioni ────────────────────────────────────────────────────
export function loadConversationMessages(conversationId: string): Message[] {
  return getJSON<Message[]>(`bartalk_messages_${conversationId}`, []);
}

export function saveConversationMessages(conversationId: string, messages: Message[]): void {
  setJSON(`bartalk_messages_${conversationId}`, messages);
}

// ── Settings generali ────────────────────────────────────────────────
export function loadSettings<T>(fallback: T): T {
  return getJSON<T>(KEYS.settings, fallback);
}

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
export interface ConversationMeta {
  id: string;
  title: string;
  turnIndex: number;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string; // preview
}

export function loadConversationList(): ConversationMeta[] {
  return getJSON<ConversationMeta[]>(KEYS.conversationList, []);
}

export function saveConversationList(list: ConversationMeta[]): void {
  setJSON(KEYS.conversationList, list);
}

export function getCurrentConversationId(): string | null {
  return localStorage.getItem(KEYS.currentConversation) || null;
}

export function setCurrentConversationId(id: string): void {
  localStorage.setItem(KEYS.currentConversation, id);
}

export function deleteConversationData(id: string): void {
  localStorage.removeItem(`bartalk_messages_${id}`);
  const list = loadConversationList();
  saveConversationList(list.filter(c => c.id !== id));
}
