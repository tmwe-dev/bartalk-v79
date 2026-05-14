-- ============================================================
-- BarTalk v8.2.6 — Database Hardening Migration
--
-- 1. updated_at trigger function + apply to all relevant tables
-- 2. Partial indexes for active conversations
-- 3. GIN index on messages content for full-text search
-- 4. Composite index for agent_configs lookup
-- 5. COMMENT on each table
-- ============================================================

-- ── 1. updated_at trigger (idempotent re-creation) ─────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to every table that carries an updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
       CREATE TRIGGER trg_set_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW
         EXECUTE FUNCTION set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ── 2. Partial indexes for active conversations ────────────────────────
-- Speeds up the most common query: "give me the user's non-archived conversations".
-- chat_laboratory_conversations.metadata->>'archived' acts as a soft-delete flag.
CREATE INDEX IF NOT EXISTS idx_conversations_active_user
  ON chat_laboratory_conversations (user_id, updated_at DESC)
  WHERE (metadata->>'archived')::boolean IS DISTINCT FROM TRUE;

-- Recent messages in active conversations
CREATE INDEX IF NOT EXISTS idx_messages_active_conversation
  ON chat_laboratory_messages (conversation_id, created_at DESC);

-- ── 3. GIN index on messages content for full-text search ──────────────
-- Uses to_tsvector so queries can leverage ts_query for fast searching.
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
  ON chat_laboratory_messages
  USING GIN (to_tsvector('simple', content));

-- ── 4. Composite index for agent_configs lookup ────────────────────────
-- Most queries filter by (user_id, agent_id) with an enabled check.
CREATE INDEX IF NOT EXISTS idx_agent_configs_user_agent_enabled
  ON user_agent_configs (user_id, agent_id)
  WHERE is_enabled = TRUE;

-- Composite for elevenlabs agent voice resolution
CREATE INDEX IF NOT EXISTS idx_elevenlabs_agents_user_agent
  ON elevenlabs_agents (user_id, agent_id);

-- Composite for prompt sections per user/type
CREATE INDEX IF NOT EXISTS idx_prompt_sections_user_type
  ON chat_laboratory_prompt_sections (user_id, type)
  WHERE enabled = TRUE;

-- ── 5. Table comments ──────────────────────────────────────────────────
COMMENT ON TABLE user_profiles IS
  'Core user profile linked 1:1 to auth.users. Stores display info, plan tier, onboarding state, and per-user preferences.';

COMMENT ON TABLE billing_plans IS
  'Catalogue of available subscription plans (Free, Pro). Seeded at deploy time; referenced by stripe_subscriptions.';

COMMENT ON TABLE stripe_subscriptions IS
  'Tracks the active Stripe subscription for each paying user. One active row per user.';

COMMENT ON TABLE config_ai IS
  'Global AI configuration singleton (id = "global"). Holds default models, temperature, token limits, and rate limits.';

COMMENT ON TABLE user_api_keys IS
  'Metadata for user-provided API keys (one per provider). Actual secrets are stored in the Supabase Vault, not here.';

COMMENT ON TABLE user_agent_configs IS
  'Per-user overrides for each AI agent: freedom level, custom model, temperature, and free-form instructions.';

COMMENT ON TABLE user_elevenlabs_config IS
  'Per-user ElevenLabs TTS configuration: API key hash, default voice model, stability, and similarity boost.';

COMMENT ON TABLE elevenlabs_agents IS
  'Maps each (user, agent) pair to a specific ElevenLabs voice for text-to-speech playback.';

COMMENT ON TABLE chat_laboratory_system_prompts IS
  'Reusable system prompt templates. Can be user-private or global (is_global = true).';

COMMENT ON TABLE chat_laboratory_prompt_sections IS
  'Modular prompt building blocks (rules, topic, context, personality) that compose into full prompts.';

COMMENT ON TABLE chat_laboratory_composed_prompts IS
  'Assembled prompts that link one system prompt with multiple personality sections plus free-form context.';

COMMENT ON TABLE chat_laboratory_conversations IS
  'Chat Laboratory conversation headers. Tracks title, mode, message count, and a rolling cumulative summary.';

COMMENT ON TABLE chat_laboratory_messages IS
  'Individual messages within a conversation. Stores sender info, content, model used, token/latency metrics.';

COMMENT ON TABLE chat_laboratory_bar_mode IS
  'Per-user Bar Mode configuration: conversation mode, turn strategy, TTS toggle, and generation parameters.';

-- ============================================================
-- Fine migrazione v8.2.6
-- ============================================================
