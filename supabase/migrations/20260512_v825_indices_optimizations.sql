-- ============================================================
-- BarTalk v8.2.5 — Database Indices & Optimizations
-- Performance indices for common query patterns.
-- ============================================================

-- ── Conversations: lookup by workspace + ordering ──────────────
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_updated
  ON chat_laboratory_conversations (workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_workspace_created
  ON chat_laboratory_conversations (workspace_id, created_at DESC);

-- ── Messages: lookup by conversation + chronological ───────────
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON chat_laboratory_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender
  ON chat_laboratory_messages (conversation_id, sender_type);

CREATE INDEX IF NOT EXISTS idx_messages_turn_id
  ON chat_laboratory_messages (turn_id)
  WHERE turn_id IS NOT NULL;

-- ── User profiles: email lookup ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_email
  ON user_profiles (email);

-- ── API Keys: workspace lookup ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_provider
  ON user_api_keys (workspace_id, provider);

-- ── Agent configs: workspace lookup ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agent_configs_workspace
  ON user_agent_configs (workspace_id);

-- ── Stripe subscriptions: user + status ────────────────────────
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_status
  ON stripe_subscriptions (user_id, status);

-- ── Prompt sections: workspace + ordering ──────────────────────
CREATE INDEX IF NOT EXISTS idx_prompt_sections_workspace_order
  ON chat_laboratory_prompt_sections (workspace_id, sort_order ASC);

-- ── System prompts: lookup by name ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_system_prompts_name
  ON chat_laboratory_system_prompts (name);

-- ── Composed prompts: workspace ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_composed_prompts_workspace
  ON chat_laboratory_composed_prompts (workspace_id);

-- ── Bar mode config: workspace ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bar_mode_workspace
  ON chat_laboratory_bar_mode (workspace_id);

-- ── ElevenLabs config: user lookup ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_elevenlabs_config_user
  ON user_elevenlabs_config (user_id);

-- ── Function: optimized message count per conversation ─────────
CREATE OR REPLACE FUNCTION get_conversation_message_count(conv_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM chat_laboratory_messages
  WHERE conversation_id = conv_id;
$$ LANGUAGE sql STABLE;

-- ── Function: get latest N messages efficiently ────────────────
CREATE OR REPLACE FUNCTION get_latest_messages(conv_id UUID, n INTEGER DEFAULT 20)
RETURNS SETOF chat_laboratory_messages AS $$
  SELECT * FROM chat_laboratory_messages
  WHERE conversation_id = conv_id
  ORDER BY created_at DESC
  LIMIT n;
$$ LANGUAGE sql STABLE;

-- ── Validate: check constraints on key fields ──────────────────
ALTER TABLE chat_laboratory_messages
  ADD CONSTRAINT IF NOT EXISTS chk_sender_type
  CHECK (sender_type IN ('human', 'assistant', 'system'));

ALTER TABLE chat_laboratory_conversations
  ADD CONSTRAINT IF NOT EXISTS chk_turn_index_positive
  CHECK (turn_index >= 0);
