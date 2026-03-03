-- BarTalk v8 — Schema iniziale Supabase
-- Eseguire nella dashboard Supabase → SQL Editor

-- ══════════════════════════════════════════════════════════════════════
-- WORKSPACES: ogni utente ha un workspace default
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Il mio workspace',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner"
  ON workspaces FOR ALL
  USING (auth.uid() = user_id);

-- Trigger: crea workspace default alla registrazione
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspaces (user_id, name) VALUES (NEW.id, 'Il mio workspace');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace();

-- ══════════════════════════════════════════════════════════════════════
-- USER SETTINGS: preferenze per workspace (sostituisce localStorage)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_mode TEXT DEFAULT 'consultation',
  turn_strategy     TEXT DEFAULT 'round_robin',
  tts_enabled       BOOLEAN DEFAULT true,
  auto_run          BOOLEAN DEFAULT true,
  language          TEXT DEFAULT 'it',
  temperature       REAL DEFAULT 0.7,
  max_tokens        INT DEFAULT 2000,
  word_range        JSONB DEFAULT '[150, 300]'::jsonb,
  custom_voices     JSONB DEFAULT '{}'::jsonb,
  excluded_agents   TEXT[] DEFAULT ARRAY[]::TEXT[],
  custom_personalities JSONB DEFAULT '{}'::jsonb,
  prompt_sections   JSONB DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_via_workspace"
  ON user_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = user_settings.workspace_id
    AND w.user_id = auth.uid()
  ));

-- ══════════════════════════════════════════════════════════════════════
-- API KEYS VAULT: chiavi provider cifrate server-side
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS api_keys_vault (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  model         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

ALTER TABLE api_keys_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "keys_via_workspace"
  ON api_keys_vault FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = api_keys_vault.workspace_id
    AND w.user_id = auth.uid()
  ));

-- ══════════════════════════════════════════════════════════════════════
-- CONVERSATIONS: conversazioni per workspace
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Nuova conversazione',
  turn_index    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_via_workspace"
  ON conversations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = conversations.workspace_id
    AND w.user_id = auth.uid()
  ));

-- Indice per ordinamento cronologico
CREATE INDEX idx_conversations_workspace_updated
  ON conversations(workspace_id, updated_at DESC);

-- ══════════════════════════════════════════════════════════════════════
-- MESSAGES: messaggi per conversazione
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type     TEXT NOT NULL CHECK (sender_type IN ('human', 'assistant', 'system')),
  agent_name      TEXT,
  provider        TEXT,
  content         TEXT NOT NULL DEFAULT '',
  tokens_in       INT DEFAULT 0,
  tokens_out      INT DEFAULT 0,
  duration_ms     INT DEFAULT 0,
  is_demo         BOOLEAN DEFAULT false,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_via_conversation"
  ON messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM conversations c
    JOIN workspaces w ON w.id = c.workspace_id
    WHERE c.id = messages.conversation_id
    AND w.user_id = auth.uid()
  ));

-- Indice per caricamento messaggi per conversazione
CREATE INDEX idx_messages_conversation_created
  ON messages(conversation_id, created_at ASC);

-- ══════════════════════════════════════════════════════════════════════
-- AUDIT LOG: log azioni per workspace (append-only)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  action        TEXT NOT NULL,
  details       JSONB DEFAULT '{}'::jsonb,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo lettura per gli utenti (append via server/trigger)
CREATE POLICY "audit_read_via_workspace"
  ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = audit_logs.workspace_id
    AND w.user_id = auth.uid()
  ));

-- Permetti insert per utenti autenticati nel proprio workspace
CREATE POLICY "audit_insert_via_workspace"
  ON audit_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = audit_logs.workspace_id
    AND w.user_id = auth.uid()
  ));

CREATE INDEX idx_audit_workspace_created
  ON audit_logs(workspace_id, created_at DESC);
