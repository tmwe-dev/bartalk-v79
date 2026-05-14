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

// ── Course types ──────────────────────────────────────────────────────
export type * from './courses';

// ── Maestro types ─────────────────────────────────────────────────────
export type * from './maestro';

// ── Life Tutor types ──────────────────────────────────────────────────
export type * from './lifeTutor';

// ── Education / xAPI types ────────────────────────────────────────────
export type * from './education';

// ── Billing types ─────────────────────────────────────────────────────
export type * from './billing';

// ── Audit types ───────────────────────────────────────────────────────
export type * from './audit';

// ── Tool types ────────────────────────────────────────────────────────
export type * from './tools';

// ── Menu types ────────────────────────────────────────────────────────
export type * from './menu';

// ── Database types (Supabase schema) ─────────────────────────────────
export * from './database';
