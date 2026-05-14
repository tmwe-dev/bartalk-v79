/**
 * BarTalk v8.2.6 — Supabase Database Types
 *
 * Auto-derived from the v8.2 full schema (14 tables).
 * Each table gets three interfaces:
 *   - Row    — what SELECT returns
 *   - Insert — fields accepted by INSERT (generated cols omitted)
 *   - Update — partial fields for UPDATE (all optional)
 *
 * The master `Database` type plugs straight into
 * `createClient<Database>(...)` from @supabase/supabase-js.
 */

// ── Utility alias ────────────────────────────────────────────────────────
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// ────────────────────────────────────────────────────────────────────────
// 1. user_profiles
// ────────────────────────────────────────────────────────────────────────

/** Full row returned by `SELECT * FROM user_profiles`. */
export interface UserProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro';
  onboarding_completed: boolean;
  language: string;
  preferences: Json;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when inserting a new user profile. */
export interface UserProfileInsert {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  plan?: 'free' | 'pro';
  onboarding_completed?: boolean;
  language?: string;
  preferences?: Json;
}

/** Partial update payload for user_profiles. */
export interface UserProfileUpdate {
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  plan?: 'free' | 'pro';
  onboarding_completed?: boolean;
  language?: string;
  preferences?: Json;
}

// ────────────────────────────────────────────────────────────────────────
// 2. billing_plans
// ────────────────────────────────────────────────────────────────────────

/** Full row returned by `SELECT * FROM billing_plans`. */
export interface BillingPlanRow {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_agents: number;
  max_messages_day: number;
  max_file_size_mb: number;
  features: Json;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
}

/** Fields accepted when inserting a new billing plan. */
export interface BillingPlanInsert {
  id: string;
  name: string;
  description?: string | null;
  price_monthly?: number;
  price_yearly?: number;
  currency?: string;
  max_agents?: number;
  max_messages_day?: number;
  max_file_size_mb?: number;
  features?: Json;
  stripe_price_id?: string | null;
  is_active?: boolean;
}

/** Partial update payload for billing_plans. */
export interface BillingPlanUpdate {
  name?: string;
  description?: string | null;
  price_monthly?: number;
  price_yearly?: number;
  currency?: string;
  max_agents?: number;
  max_messages_day?: number;
  max_file_size_mb?: number;
  features?: Json;
  stripe_price_id?: string | null;
  is_active?: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// 3. stripe_subscriptions
// ────────────────────────────────────────────────────────────────────────

export type StripeSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete';

/** Full row returned by `SELECT * FROM stripe_subscriptions`. */
export interface StripeSubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: string | null;
  status: StripeSubscriptionStatus;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when inserting a new stripe subscription. */
export interface StripeSubscriptionInsert {
  user_id: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plan_id?: string | null;
  status?: StripeSubscriptionStatus;
  cancel_at_period_end?: boolean;
  current_period_start?: string | null;
  current_period_end?: string | null;
}

/** Partial update payload for stripe_subscriptions. */
export interface StripeSubscriptionUpdate {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plan_id?: string | null;
  status?: StripeSubscriptionStatus;
  cancel_at_period_end?: boolean;
  current_period_start?: string | null;
  current_period_end?: string | null;
}

// ────────────────────────────────────────────────────────────────────────
// 4. config_ai
// ────────────────────────────────────────────────────────────────────────

/** Full row returned by `SELECT * FROM config_ai`. */
export interface ConfigAiRow {
  id: string;
  default_model_openai: string;
  default_model_anthropic: string;
  default_model_gemini: string;
  default_model_groq: string;
  default_temperature: number;
  default_max_tokens: number;
  default_word_range: Json;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  updated_at: string;
}

/** Fields accepted when inserting a config_ai row. */
export interface ConfigAiInsert {
  id?: string;
  default_model_openai?: string;
  default_model_anthropic?: string;
  default_model_gemini?: string;
  default_model_groq?: string;
  default_temperature?: number;
  default_max_tokens?: number;
  default_word_range?: Json;
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
}

/** Partial update payload for config_ai. */
export interface ConfigAiUpdate {
  default_model_openai?: string;
  default_model_anthropic?: string;
  default_model_gemini?: string;
  default_model_groq?: string;
  default_temperature?: number;
  default_max_tokens?: number;
  default_word_range?: Json;
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
}

// ────────────────────────────────────────────────────────────────────────
// 5. user_api_keys
// ────────────────────────────────────────────────────────────────────────

/** Full row returned by `SELECT * FROM user_api_keys`. */
export interface UserApiKeyRow {
  id: string;
  user_id: string;
  provider: string;
  model: string | null;
  key_hash: string | null;
  is_valid: boolean;
  last_used: string | null;
  created_at: string;
}

/** Fields accepted when inserting a new user API key. */
export interface UserApiKeyInsert {
  user_id: string;
  provider: string;
  model?: string | null;
  key_hash?: string | null;
  is_valid?: boolean;
  last_used?: string | null;
}

/** Partial update payload for user_api_keys. */
export interface UserApiKeyUpdate {
  provider?: string;
  model?: string | null;
  key_hash?: string | null;
  is_valid?: boolean;
  last_used?: string | null;
}

// ────────────────────────────────────────────────────────────────────────
// 6. user_agent_configs
// ────────────────────────────────────────────────────────────────────────

export type FreedomLevel = 'strict' | 'balanced' | 'creative' | 'autonomous';

/** Full row returned by `SELECT * FROM user_agent_configs`. */
export interface UserAgentConfigRow {
  id: string;
  user_id: string;
  agent_id: string;
  is_enabled: boolean;
  freedom_level: FreedomLevel;
  custom_instructions: string | null;
  custom_model: string | null;
  custom_temperature: number | null;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when inserting a new agent config. */
export interface UserAgentConfigInsert {
  user_id: string;
  agent_id: string;
  is_enabled?: boolean;
  freedom_level?: FreedomLevel;
  custom_instructions?: string | null;
  custom_model?: string | null;
  custom_temperature?: number | null;
}

/** Partial update payload for user_agent_configs. */
export interface UserAgentConfigUpdate {
  is_enabled?: boolean;
  freedom_level?: FreedomLevel;
  custom_instructions?: string | null;
  custom_model?: string | null;
  custom_temperature?: number | null;
}

// ────────────────────────────────────────────────────────────────────────
// 7. user_elevenlabs_config
// ────────────────────────────────────────────────────────────────────────

/** Full row returned by `SELECT * FROM user_elevenlabs_config`. */
export interface UserElevenlabsConfigRow {
  id: string;
  user_id: string;
  api_key_hash: string | null;
  is_enabled: boolean;
  default_model: string;
  stability: number;
  similarity_boost: number;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when inserting a new ElevenLabs config. */
export interface UserElevenlabsConfigInsert {
  user_id: string;
  api_key_hash?: string | null;
  is_enabled?: boolean;
  default_model?: string;
  stability?: number;
  similarity_boost?: number;
}

/** Partial update payload for user_elevenlabs_config. */
export interface UserElevenlabsConfigUpdate {
  api_key_hash?: string | null;
  is_enabled?: boolean;
  default_model?: string;
  stability?: number;
  similarity_boost?: number;
}

// ────────────────────────────────────────────────────────────────────────
// 8. elevenlabs_agents
// ────────────────────────────────────────────────────────────────────────

/** Full row returned by `SELECT * FROM elevenlabs_agents`. */
export interface ElevenlabsAgentRow {
  id: string;
  user_id: string;
  agent_id: string;
  voice_id: string;
  voice_name: string | null;
  created_at: string;
}

/** Fields accepted when inserting a new ElevenLabs agent mapping. */
export interface ElevenlabsAgentInsert {
  user_id: string;
  agent_id: string;
  voice_id: string;
  voice_name?: string | null;
}

/** Partial update payload for elevenlabs_agents. */
export interface ElevenlabsAgentUpdate {
  voice_id?: string;
  voice_name?: string | null;
}

// ────────────────────────────────────────────────────────────────────────
// 9. chat_laboratory_system_prompts
// ────────────────────────────────────────────────────────────────────────

/** Full row returned by `SELECT * FROM chat_laboratory_system_prompts`. */
export interface ChatLabSystemPromptRow {
  id: string;
  user_id: string | null;
  name: string;
  content: string;
  is_default: boolean;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when inserting a new system prompt. */
export interface ChatLabSystemPromptInsert {
  user_id?: string | null;
  name: string;
  content: string;
  is_default?: boolean;
  is_global?: boolean;
}

/** Partial update payload for chat_laboratory_system_prompts. */
export interface ChatLabSystemPromptUpdate {
  name?: string;
  content?: string;
  is_default?: boolean;
  is_global?: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// 10. chat_laboratory_prompt_sections
// ────────────────────────────────────────────────────────────────────────

export type PromptSectionType = 'rules' | 'topic' | 'context' | 'personality';

/** Full row returned by `SELECT * FROM chat_laboratory_prompt_sections`. */
export interface ChatLabPromptSectionRow {
  id: string;
  user_id: string | null;
  type: PromptSectionType;
  title: string;
  content: string;
  tags: string[];
  priority: number;
  enabled: boolean;
  agent_id: string | null;
  created_at: string;
}

/** Fields accepted when inserting a new prompt section. */
export interface ChatLabPromptSectionInsert {
  user_id?: string | null;
  type: PromptSectionType;
  title: string;
  content: string;
  tags?: string[];
  priority?: number;
  enabled?: boolean;
  agent_id?: string | null;
}

/** Partial update payload for chat_laboratory_prompt_sections. */
export interface ChatLabPromptSectionUpdate {
  type?: PromptSectionType;
  title?: string;
  content?: string;
  tags?: string[];
  priority?: number;
  enabled?: boolean;
  agent_id?: string | null;
}

// ────────────────────────────────────────────────────────────────────────
// 11. chat_laboratory_composed_prompts
// ────────────────────────────────────────────────────────────────────────

/** Full row returned by `SELECT * FROM chat_laboratory_composed_prompts`. */
export interface ChatLabComposedPromptRow {
  id: string;
  user_id: string | null;
  name: string;
  system_prompt_id: string | null;
  personality_section_ids: string[];
  additional_context: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when inserting a new composed prompt. */
export interface ChatLabComposedPromptInsert {
  user_id?: string | null;
  name: string;
  system_prompt_id?: string | null;
  personality_section_ids?: string[];
  additional_context?: string | null;
  is_active?: boolean;
}

/** Partial update payload for chat_laboratory_composed_prompts. */
export interface ChatLabComposedPromptUpdate {
  name?: string;
  system_prompt_id?: string | null;
  personality_section_ids?: string[];
  additional_context?: string | null;
  is_active?: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// 12. chat_laboratory_conversations
// ────────────────────────────────────────────────────────────────────────

export type ConversationModeDB = 'consultation' | 'debate' | 'brainstorm' | 'interview';

/** Full row returned by `SELECT * FROM chat_laboratory_conversations`. */
export interface ChatLabConversationRow {
  id: string;
  user_id: string | null;
  title: string;
  mode: string;
  composed_prompt_id: string | null;
  cumulative_summary: string | null;
  message_count: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when inserting a new conversation. */
export interface ChatLabConversationInsert {
  user_id?: string | null;
  title?: string;
  mode?: string;
  composed_prompt_id?: string | null;
  cumulative_summary?: string | null;
  message_count?: number;
  metadata?: Json;
}

/** Partial update payload for chat_laboratory_conversations. */
export interface ChatLabConversationUpdate {
  title?: string;
  mode?: string;
  composed_prompt_id?: string | null;
  cumulative_summary?: string | null;
  message_count?: number;
  metadata?: Json;
}

// ────────────────────────────────────────────────────────────────────────
// 13. chat_laboratory_messages
// ────────────────────────────────────────────────────────────────────────

export type SenderType = 'human' | 'assistant' | 'system';

/** Full row returned by `SELECT * FROM chat_laboratory_messages`. */
export interface ChatLabMessageRow {
  id: string;
  conversation_id: string;
  user_id: string | null;
  sender_type: SenderType;
  sender_name: string | null;
  agent_id: string | null;
  content: string;
  model: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  metadata: Json;
  created_at: string;
}

/** Fields accepted when inserting a new message. */
export interface ChatLabMessageInsert {
  conversation_id: string;
  user_id?: string | null;
  sender_type: SenderType;
  sender_name?: string | null;
  agent_id?: string | null;
  content: string;
  model?: string | null;
  tokens_used?: number | null;
  latency_ms?: number | null;
  metadata?: Json;
}

/** Partial update payload for chat_laboratory_messages. */
export interface ChatLabMessageUpdate {
  sender_type?: SenderType;
  sender_name?: string | null;
  agent_id?: string | null;
  content?: string;
  model?: string | null;
  tokens_used?: number | null;
  latency_ms?: number | null;
  metadata?: Json;
}

// ────────────────────────────────────────────────────────────────────────
// 14. chat_laboratory_bar_mode
// ────────────────────────────────────────────────────────────────────────

export type BarModeType = 'consultation' | 'debate' | 'brainstorm' | 'interview';
export type TurnStrategyType = 'round_robin' | 'random' | 'priority' | 'reactive';

/** Full row returned by `SELECT * FROM chat_laboratory_bar_mode`. */
export interface ChatLabBarModeRow {
  id: string;
  user_id: string;
  mode: BarModeType;
  turn_strategy: TurnStrategyType;
  tts_enabled: boolean;
  auto_run: boolean;
  temperature: number;
  max_tokens: number;
  word_range: Json;
  language: string;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when inserting a new bar mode config. */
export interface ChatLabBarModeInsert {
  user_id: string;
  mode?: BarModeType;
  turn_strategy?: TurnStrategyType;
  tts_enabled?: boolean;
  auto_run?: boolean;
  temperature?: number;
  max_tokens?: number;
  word_range?: Json;
  language?: string;
}

/** Partial update payload for chat_laboratory_bar_mode. */
export interface ChatLabBarModeUpdate {
  mode?: BarModeType;
  turn_strategy?: TurnStrategyType;
  tts_enabled?: boolean;
  auto_run?: boolean;
  temperature?: number;
  max_tokens?: number;
  word_range?: Json;
  language?: string;
}

// ────────────────────────────────────────────────────────────────────────
// Master Database type
// ────────────────────────────────────────────────────────────────────────

/**
 * Master database type compatible with `createClient<Database>(...)`.
 * Maps every public table to its Row, Insert, and Update shapes.
 */
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      billing_plans: {
        Row: BillingPlanRow;
        Insert: BillingPlanInsert;
        Update: BillingPlanUpdate;
      };
      stripe_subscriptions: {
        Row: StripeSubscriptionRow;
        Insert: StripeSubscriptionInsert;
        Update: StripeSubscriptionUpdate;
      };
      config_ai: {
        Row: ConfigAiRow;
        Insert: ConfigAiInsert;
        Update: ConfigAiUpdate;
      };
      user_api_keys: {
        Row: UserApiKeyRow;
        Insert: UserApiKeyInsert;
        Update: UserApiKeyUpdate;
      };
      user_agent_configs: {
        Row: UserAgentConfigRow;
        Insert: UserAgentConfigInsert;
        Update: UserAgentConfigUpdate;
      };
      user_elevenlabs_config: {
        Row: UserElevenlabsConfigRow;
        Insert: UserElevenlabsConfigInsert;
        Update: UserElevenlabsConfigUpdate;
      };
      elevenlabs_agents: {
        Row: ElevenlabsAgentRow;
        Insert: ElevenlabsAgentInsert;
        Update: ElevenlabsAgentUpdate;
      };
      chat_laboratory_system_prompts: {
        Row: ChatLabSystemPromptRow;
        Insert: ChatLabSystemPromptInsert;
        Update: ChatLabSystemPromptUpdate;
      };
      chat_laboratory_prompt_sections: {
        Row: ChatLabPromptSectionRow;
        Insert: ChatLabPromptSectionInsert;
        Update: ChatLabPromptSectionUpdate;
      };
      chat_laboratory_composed_prompts: {
        Row: ChatLabComposedPromptRow;
        Insert: ChatLabComposedPromptInsert;
        Update: ChatLabComposedPromptUpdate;
      };
      chat_laboratory_conversations: {
        Row: ChatLabConversationRow;
        Insert: ChatLabConversationInsert;
        Update: ChatLabConversationUpdate;
      };
      chat_laboratory_messages: {
        Row: ChatLabMessageRow;
        Insert: ChatLabMessageInsert;
        Update: ChatLabMessageUpdate;
      };
      chat_laboratory_bar_mode: {
        Row: ChatLabBarModeRow;
        Insert: ChatLabBarModeInsert;
        Update: ChatLabBarModeUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plan_type: 'free' | 'pro';
      subscription_status: StripeSubscriptionStatus;
      freedom_level: FreedomLevel;
      prompt_section_type: PromptSectionType;
      sender_type: SenderType;
      bar_mode_type: BarModeType;
      turn_strategy_type: TurnStrategyType;
      conversation_mode: ConversationModeDB;
    };
  };
}

// ── Helper types for ergonomic table access ──────────────────────────────

/** Extract the Row type for a given table name. */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Extract the Insert type for a given table name. */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Extract the Update type for a given table name. */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
