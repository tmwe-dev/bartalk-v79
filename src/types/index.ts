/**
 * BarTalk v8.2.5 — Type barrel exports
 * Centralizza tutte le esportazioni dei tipi.
 */

// ── Agent types ────────────────────────────────────────────────────────
export type { ProviderType, AgentConfig, AgentState } from './agents';

// ── Conversation types ─────────────────────────────────────────────────
export type { Message, Conversation } from './conversation';
export type { ConversationMode, TurnStrategy } from './conversation';

// ── Settings types ─────────────────────────────────────────────────────
export type { APIKeyEntry, VoiceConfig, AppLanguage, LanguageConfig, AppSettings } from './settings';

// ── Auth types ─────────────────────────────────────────────────────────
export type * from './auth';

// ── Task types ─────────────────────────────────────────────────────────
export type * from './tasks';

// ── Orchestrator types ─────────────────────────────────────────────────
export type * from './orchestrator';
