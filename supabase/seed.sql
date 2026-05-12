-- ============================================================
-- BarTalk v8.2.5 — Seed Data
-- Default billing plans and AI configuration.
-- ============================================================

-- ── Billing Plans ──────────────────────────────────────────────
INSERT INTO billing_plans (id, name, description, price_monthly, price_yearly, currency,
  max_agents, max_messages_day, max_file_size_mb, features, is_active)
VALUES
  ('free', 'Free', 'Piano gratuito con accesso base', 0, 0, 'eur',
   3, 50, 5, '["chat_base", "3_agenti", "tts_limitato"]'::jsonb, true),
  ('pro', 'Pro', 'Piano professionale con accesso completo', 9.99, 99.99, 'eur',
   4, 500, 50, '["chat_illimitato", "4_agenti", "tts_completo", "file_upload", "task_system", "priorità_api"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_agents = EXCLUDED.max_agents,
  max_messages_day = EXCLUDED.max_messages_day,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  features = EXCLUDED.features;

-- ── Default AI Configuration ───────────────────────────────────
INSERT INTO config_ai (id, provider, model_name, display_name, is_default, is_active, config)
VALUES
  ('openai-gpt4o', 'openai', 'gpt-4o', 'GPT-4o', true, true,
   '{"maxTokens": 2048, "temperature": 0.7}'::jsonb),
  ('anthropic-claude', 'anthropic', 'claude-sonnet-4-20250514', 'Claude Sonnet 4', true, true,
   '{"maxTokens": 2048, "temperature": 0.7}'::jsonb),
  ('gemini-flash', 'gemini', 'gemini-2.0-flash', 'Gemini 2.0 Flash', true, true,
   '{"maxTokens": 2048, "temperature": 0.7}'::jsonb),
  ('groq-llama', 'groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B', false, true,
   '{"maxTokens": 2048, "temperature": 0.7}'::jsonb),
  ('xai-grok', 'xai', 'grok-3-mini', 'Grok 3 Mini', true, true,
   '{"maxTokens": 2048, "temperature": 0.7}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  model_name = EXCLUDED.model_name,
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active,
  config = EXCLUDED.config;

-- ── Default System Prompts ─────────────────────────────────────
INSERT INTO chat_laboratory_system_prompts (name, content, is_default)
VALUES
  ('albert_default', 'Sei Albert, un esperto in conoscenza generale. Rispondi con competenza e chiarezza, portando sempre un punto di vista costruttivo alla discussione.', true),
  ('archimede_default', 'Sei Archimede, specialista in analisi approfondita. Esamini ogni argomento da più angolazioni, offrendo insight dettagliati e ben ragionati.', true),
  ('pitagora_default', 'Sei Pitagora, esperto di ragionamento scientifico e logico. Affronti i problemi con metodo rigoroso e fornisci spiegazioni precise.', true),
  ('newton_default', 'Sei Newton, specialista tecnico e innovatore. Combini competenza tecnica con creatività per risolvere problemi complessi.', true)
ON CONFLICT DO NOTHING;
