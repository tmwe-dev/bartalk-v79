-- BarTalk v8.2.5 — V2 Tutor Integration Migration
-- Creates tables for Life Tutor memory, user profiles, credits, study sessions, and xAPI.
-- Run against your Supabase project with RLS enabled.

-- ════════════════════════════════════════════════════════════════════════
-- 1. lt_memories — Life Tutor long-term memory layers
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lt_memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layer       TEXT NOT NULL CHECK (layer IN ('episodic', 'semantic', 'procedural', 'emotional')),
  tag         TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL,
  confidence  REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source      TEXT NOT NULL DEFAULT 'conversation',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ
);

ALTER TABLE lt_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY lt_memories_owner ON lt_memories
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_lt_memories_user    ON lt_memories (user_id);
CREATE INDEX idx_lt_memories_layer   ON lt_memories (user_id, layer);
CREATE INDEX idx_lt_memories_tag     ON lt_memories (user_id, tag);
CREATE INDEX idx_lt_memories_expires ON lt_memories (expires_at) WHERE expires_at IS NOT NULL;


-- ════════════════════════════════════════════════════════════════════════
-- 2. lt_user_profile — Life Tutor user profile / personality model
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lt_user_profile (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  preferences JSONB NOT NULL DEFAULT '{}',
  personality JSONB NOT NULL DEFAULT '{}',
  goals       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lt_user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY lt_user_profile_owner ON lt_user_profile
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_lt_user_profile_user ON lt_user_profile (user_id);


-- ════════════════════════════════════════════════════════════════════════
-- 3. user_credits — Tier + credit tracking for AI and TTS usage
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_credits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'unlimited')),
  tier_override TEXT CHECK (tier_override IN ('free', 'pro', 'unlimited', NULL)),
  credits_ai    INTEGER NOT NULL DEFAULT 0,
  credits_tts   INTEGER NOT NULL DEFAULT 0,
  reset_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_credits_owner ON user_credits
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_credits_user ON user_credits (user_id);
CREATE INDEX idx_user_credits_reset ON user_credits (reset_at) WHERE reset_at IS NOT NULL;


-- ════════════════════════════════════════════════════════════════════════
-- 4. study_sessions — Per-session tracking for courses / maestro
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS study_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id        TEXT NOT NULL DEFAULT '',
  maestro_id       TEXT NOT NULL DEFAULT '',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  messages_count   INTEGER NOT NULL DEFAULT 0,
  score            REAL CHECK (score >= 0 AND score <= 100)
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY study_sessions_owner ON study_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_study_sessions_user     ON study_sessions (user_id);
CREATE INDEX idx_study_sessions_course   ON study_sessions (user_id, course_id);
CREATE INDEX idx_study_sessions_started  ON study_sessions (user_id, started_at DESC);


-- ════════════════════════════════════════════════════════════════════════
-- 5. xapi_statements — xAPI / TinCan statement storage
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xapi_statements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verb        TEXT NOT NULL,
  object_id   TEXT NOT NULL,
  object_type TEXT NOT NULL DEFAULT 'Activity',
  result      JSONB,
  context     JSONB,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE xapi_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY xapi_statements_owner ON xapi_statements
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_xapi_user      ON xapi_statements (user_id);
CREATE INDEX idx_xapi_verb      ON xapi_statements (user_id, verb);
CREATE INDEX idx_xapi_object    ON xapi_statements (user_id, object_id);
CREATE INDEX idx_xapi_timestamp ON xapi_statements (user_id, timestamp DESC);


-- ════════════════════════════════════════════════════════════════════════
-- updated_at triggers
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lt_memories_updated
  BEFORE UPDATE ON lt_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_lt_user_profile_updated
  BEFORE UPDATE ON lt_user_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
