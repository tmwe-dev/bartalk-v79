-- ============================================================
-- BarTalk v8.2 — Full Supabase Schema Migration
-- Integrazione completa delle 14 tabelle v7.9 + miglioramenti v8.2
--
-- TABELLE:
-- 1.  user_profiles           — Profili utente con onboarding
-- 2.  billing_plans           — Piani (Free/Pro)
-- 3.  stripe_subscriptions    — Sottoscrizioni Stripe
-- 4.  config_ai               — Configurazione AI globale
-- 5.  user_api_keys           — Chiavi API utente (criptate)
-- 6.  user_agent_configs      — Configurazione agenti per utente
-- 7.  user_elevenlabs_config  — Config ElevenLabs per utente
-- 8.  elevenlabs_agents       — Mapping agenti → voci ElevenLabs
-- 9.  chat_laboratory_system_prompts    — Template system prompts
-- 10. chat_laboratory_prompt_sections   — Sezioni prompt modulari
-- 11. chat_laboratory_composed_prompts  — Prompt composti
-- 12. chat_laboratory_conversations     — Conversazioni
-- 13. chat_laboratory_messages          — Messaggi
-- 14. chat_laboratory_bar_mode          — Configurazione bar mode
--
-- SICUREZZA: RLS abilitato su tutte le tabelle.
-- ============================================================

-- ── 1. user_profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'it',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger per auto-creare profilo alla registrazione
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. billing_plans ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) DEFAULT 0,
  price_yearly NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'eur',
  max_agents INTEGER DEFAULT 3,
  max_messages_day INTEGER DEFAULT 50,
  max_file_size_mb INTEGER DEFAULT 5,
  features JSONB DEFAULT '[]',
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default plans
INSERT INTO billing_plans (id, name, description, price_monthly, max_agents, max_messages_day, max_file_size_mb, features)
VALUES
  ('free', 'Free', 'Fino a 3 agenti AI', 0, 3, 50, 5,
   '["3 agenti AI", "50 messaggi/giorno", "Cronologia 7 giorni", "Modalità radio base"]'),
  ('pro', 'Pro', 'Agenti illimitati', 9.99, -1, -1, 50,
   '["Agenti illimitati", "Messaggi illimitati", "Cronologia illimitata", "Upload file (PDF, DOCX, XLSX)", "Podcast mode avanzato", "Supporto prioritario"]')
ON CONFLICT (id) DO NOTHING;

-- ── 3. stripe_subscriptions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan_id TEXT REFERENCES billing_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_subs_select" ON stripe_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ── 4. config_ai ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_ai (
  id TEXT PRIMARY KEY DEFAULT 'global',
  default_model_openai TEXT DEFAULT 'gpt-4o-mini',
  default_model_anthropic TEXT DEFAULT 'claude-sonnet-4-20250514',
  default_model_gemini TEXT DEFAULT 'gemini-2.0-flash',
  default_model_groq TEXT DEFAULT 'llama-3.3-70b-versatile',
  default_temperature NUMERIC(3,2) DEFAULT 0.77,
  default_max_tokens INTEGER DEFAULT 1024,
  default_word_range JSONB DEFAULT '[100, 250]',
  rate_limit_per_minute INTEGER DEFAULT 20,
  rate_limit_per_day INTEGER DEFAULT 500,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO config_ai (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

-- ── 5. user_api_keys ────────────────────────────────────────────────
-- Le chiavi sono criptate AES-256-GCM nel vault serverless.
-- Questa tabella contiene solo i metadata.
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT,
  key_hash TEXT, -- hash per verifica, non la chiave
  is_valid BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_api_keys_select" ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user_api_keys_insert" ON user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_api_keys_update" ON user_api_keys FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "user_api_keys_delete" ON user_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ── 6. user_agent_configs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  freedom_level TEXT DEFAULT 'balanced' CHECK (freedom_level IN ('strict', 'balanced', 'creative', 'autonomous')),
  custom_instructions TEXT,
  custom_model TEXT,
  custom_temperature NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

ALTER TABLE user_agent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_agent_configs_select" ON user_agent_configs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user_agent_configs_insert" ON user_agent_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_agent_configs_update" ON user_agent_configs FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 7. user_elevenlabs_config ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_elevenlabs_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  api_key_hash TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  default_model TEXT DEFAULT 'eleven_multilingual_v2',
  stability NUMERIC(3,2) DEFAULT 0.5,
  similarity_boost NUMERIC(3,2) DEFAULT 0.75,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_elevenlabs_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_elevenlabs_select" ON user_elevenlabs_config FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user_elevenlabs_insert" ON user_elevenlabs_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_elevenlabs_update" ON user_elevenlabs_config FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 8. elevenlabs_agents ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elevenlabs_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

ALTER TABLE elevenlabs_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "elevenlabs_agents_select" ON elevenlabs_agents FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "elevenlabs_agents_insert" ON elevenlabs_agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "elevenlabs_agents_update" ON elevenlabs_agents FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 9. chat_laboratory_system_prompts ───────────────────────────────
CREATE TABLE IF NOT EXISTS chat_laboratory_system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_global BOOLEAN DEFAULT FALSE, -- se true, visibile a tutti
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_laboratory_system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_prompts_select" ON chat_laboratory_system_prompts FOR SELECT
  USING (is_global = TRUE OR auth.uid() = user_id);
CREATE POLICY "system_prompts_insert" ON chat_laboratory_system_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "system_prompts_update" ON chat_laboratory_system_prompts FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 10. chat_laboratory_prompt_sections ─────────────────────────────
CREATE TABLE IF NOT EXISTS chat_laboratory_prompt_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rules', 'topic', 'context', 'personality')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 5,
  enabled BOOLEAN DEFAULT TRUE,
  agent_id TEXT, -- se NULL, si applica a tutti gli agenti
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_laboratory_prompt_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompt_sections_select" ON chat_laboratory_prompt_sections FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "prompt_sections_insert" ON chat_laboratory_prompt_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prompt_sections_update" ON chat_laboratory_prompt_sections FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "prompt_sections_delete" ON chat_laboratory_prompt_sections FOR DELETE
  USING (auth.uid() = user_id);

-- ── 11. chat_laboratory_composed_prompts ────────────────────────────
CREATE TABLE IF NOT EXISTS chat_laboratory_composed_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt_id UUID REFERENCES chat_laboratory_system_prompts(id),
  personality_section_ids UUID[] DEFAULT '{}',
  additional_context TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_laboratory_composed_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "composed_prompts_select" ON chat_laboratory_composed_prompts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "composed_prompts_insert" ON chat_laboratory_composed_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "composed_prompts_update" ON chat_laboratory_composed_prompts FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 12. chat_laboratory_conversations ───────────────────────────────
CREATE TABLE IF NOT EXISTS chat_laboratory_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Nuova conversazione',
  mode TEXT DEFAULT 'consultation',
  composed_prompt_id UUID REFERENCES chat_laboratory_composed_prompts(id),
  cumulative_summary TEXT,
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_laboratory_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select" ON chat_laboratory_conversations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert" ON chat_laboratory_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update" ON chat_laboratory_conversations FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "conversations_delete" ON chat_laboratory_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ── 13. chat_laboratory_messages ────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_laboratory_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_laboratory_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('human', 'assistant', 'system')),
  sender_name TEXT,
  agent_id TEXT,
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_laboratory_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON chat_laboratory_messages FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "messages_insert" ON chat_laboratory_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_laboratory_messages(conversation_id, created_at);

-- ── 14. chat_laboratory_bar_mode ────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_laboratory_bar_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mode TEXT DEFAULT 'consultation' CHECK (mode IN ('consultation', 'debate', 'brainstorm', 'interview')),
  turn_strategy TEXT DEFAULT 'round_robin' CHECK (turn_strategy IN ('round_robin', 'random', 'priority', 'reactive')),
  tts_enabled BOOLEAN DEFAULT TRUE,
  auto_run BOOLEAN DEFAULT TRUE,
  temperature NUMERIC(3,2) DEFAULT 0.77,
  max_tokens INTEGER DEFAULT 1024,
  word_range JSONB DEFAULT '[100, 250]',
  language TEXT DEFAULT 'it',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_laboratory_bar_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bar_mode_select" ON chat_laboratory_bar_mode FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "bar_mode_insert" ON chat_laboratory_bar_mode FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bar_mode_update" ON chat_laboratory_bar_mode FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Funzione updated_at ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger updated_at a tutte le tabelle con colonna updated_at
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
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Fine migrazione v8.2
-- ============================================================
