# Piano di Integrazione V2 Tutor/Maestro/Courses in BarTalk v8.2.5

## Codex Cobra — SC:INTEGRATE

**Data:** 2026-05-12
**Stato:** PIANIFICAZIONE COMPLETATA — In attesa di esecuzione
**Scope:** ~70 file nuovi, ~12.000+ righe di codice da integrare/adattare

---

## 1. AUDIT COMPLETO

### 1.1 Cosa manca in v8.2.5

Il sistema V2 (backup in `~/Downloads/mixer/radiochat_backup2/`) contiene moduli completi che non esistono affatto nel codebase v8.2.5:

| Area | File | Righe | Stato |
|------|------|-------|-------|
| **Types** | courses, maestro, lifeTutor, education, billing, audit, tools, menu | ~1,415 | MISSING |
| **Contexts** | CourseContext, MaestroContext, LTIContext, xAPIContext, BillingContext | ~1,176 | MISSING |
| **Lib/maestro/** | definitions, parsing, prompts, voices | ~635 | MISSING |
| **Lib/lifeTutor/** | index, config, extraction, kb, memory, proactivity, processor, profile, prompt | ~2,495 | MISSING |
| **Lib (main)** | maestroEngine, courseCatalog, courseGenerator, lessonContentGenerator, assessmentEngine, educationAPI, xapiBuilder, studentProfile, lifeTutorMemory, ltiHelper | ~2,363 | MISSING |
| **Lib (blocking)** | apiKeyResolver, authToken, featureGating | ~225 | MISSING |
| **Components/Courses/** | CourseBrowse, CourseCatalog, CourseWizard, CourseActive, CourseAssessment, CourseMaestro, CoursePanel | ~1,114 | MISSING |
| **Components/Maestro/** | MaestroAvatar, MaestroChat, MaestroSelector, MaestroToolbar, ProgressTimeline, PronunciationPanel, StudentOnboarding, WaveformCanvas | ~1,943 | MISSING |
| **Components/LifeTutor/** | FreeChatPanel, LifeTutorTab, ObjectivesPanel, SuggestionsWidget, index | ~784 | MISSING |
| **Components/FreeVoice/** | DynamicCanvas, FreeVoiceTab | ~596 | MISSING |
| **Components/Education/** | ProgressDashboard | ~432 | MISSING |
| **Components/Landing/** | LandingPage | ~193 | MISSING |
| **Components/Billing/** | BillingPanel, PricingCards, UpgradeModal | ~311 | MISSING |
| **Components/Legal/** | CookieBanner, PrivacyPolicy, TermsOfService | ~268 | MISSING |
| **Hooks** | useAudioRecording, useIsMobile, useVAD, useEffectiveTier, useIsAdmin | ~404 | MISSING |
| **Shared** | VoiceMicButton | ~84 | MISSING |

### 1.2 Cosa esiste e va aggiornato in v8.2.5

File che esistono in ENTRAMBI i sistemi e devono essere riconciliati:

| File v8.2.5 | File V2 | Azione |
|-------------|---------|--------|
| `lib/proxy.ts` | V2 proxy.ts (228 righe con guest mode, skip auth, usage tracking) | MERGE — aggiungere guest mode + usage |
| `lib/tts.ts` | V2 tts.ts (688 righe con dual voice, L2 segments, queue) | MERGE — aggiungere dual voice + L2 |
| `lib/constants.ts` | V2 constants.ts (100 righe) | MERGE — aggiungere TTS config, SKIP_MODE |
| `lib/utils.ts` | V2 utils.ts (43 righe) | VERIFY — controllare funzioni mancanti |
| `lib/storage.ts` | V2 usa loadSettings, getAPIKey da storage | VERIFY — assicurare compatibilita |
| `hooks/useOrchestrator.ts` | V2 (132 righe con CourseContext) | MERGE — aggiungere CourseContext |
| `hooks/useSpeechToText.ts` | V2 (184 righe) | VERIFY — possibili miglioramenti |
| `hooks/useTTS.ts` | V2 (70 righe) | VERIFY |
| `types/settings.ts` | V2 (323 righe con LANGUAGES array) | MERGE — aggiungere LANGUAGES se mancante |
| `context/SettingsContext.tsx` | V2 referenziato da molti componenti | VERIFY |
| `src/router.tsx` | Mancano route per courses, maestro, lifetutor, landing, billing | UPDATE |
| `src/App.tsx` | Mancano CourseProvider, MaestroProvider, BillingProvider, XAPIProvider, LTIProvider | UPDATE |

### 1.3 Problemi trasversali da risolvere durante l'integrazione

1. **i18n inconsistente:** ~60% dei file V2 ha stringhe italiane hardcoded senza usare `useT()`. Componenti Maestro, LifeTutor, FreeVoice, Education, Legal non usano i18n.
2. **Nome brand:** Mix di "BarTalk" e "RadioChat". Standardizzare su `UI.appName` da constants.
3. **localStorage keys:** Prefisso `bt_` (BarTalk legacy) usato ovunque. Mantenere per backward compatibility.
4. **Default lingua `'it'`:** Hardcoded in 6+ file. Deve derivare da settings utente.
5. **ElevenLabs config duplicata:** `audioAnalyzer.ts` ha parametri diversi da `constants.ts` (stability 0.5 vs 0.70).
6. **Score thresholds sparsi:** Valori 40/50/60/70/80 ripetuti in file diversi con significati diversi.
7. **FreeVoiceTab hardcoda `openai/gpt-4o-mini`:** Non usa il resolver generico.
8. **Dark mode:** `WaveformCanvas` ha sfondo bianco hardcoded. `ProgressTimeline` canvas non risolve CSS vars.
9. **Inline styles:** `ProgressDashboard` ha ~170 righe di stili inline. Deve usare CSS classes.
10. **xAPI base URL:** `BARTALK_BASE='https://bartalk-v79.vercel.app'` — deve diventare URL produzione v8.2.5.

---

## 2. PIANO DI ESECUZIONE — 8 FASI

### FASE 0: Preparazione e dipendenze bloccanti
**Stimato: ~400 righe**

Creare/portare i 3 moduli lib che sono prerequisiti per tutto il resto:

1. `src/lib/apiKeyResolver.ts` — Adattare da V2 (93 righe). Connettere a storage v8.2.5.
2. `src/lib/authToken.ts` — Adattare da V2 (68 righe). Connettere a supabase v8.2.5.
3. `src/lib/featureGating.ts` — Adattare da V2 (64 righe). Feature map per Free/Pro/Unlimited.
4. `src/lib/i18n.ts` — Se non esiste, portare V2 (1938 righe) o creare versione ridotta.
5. Aggiornare `src/lib/constants.ts` — Merge con valori V2 (TTS, SKIP_MODE, RATE_LIMITS).

**Verifica:** `npx tsc --noEmit` deve passare dopo ogni file.

### FASE 1: Types
**Stimato: ~1,415 righe**

Portare tutti i type module mancanti, adattandoli:

1. `src/types/courses.ts` — Portare da V2, rimuovere import di `./tasks.DeliverableType` se non esiste.
2. `src/types/maestro.ts` — Portare da V2. Aggiornare import di courses.
3. `src/types/lifeTutor.ts` — Portare da V2 (pure types, nessuna dipendenza).
4. `src/types/education.ts` — Portare da V2 (xAPI types, nessuna dipendenza).
5. `src/types/billing.ts` — Portare da V2. Aggiornare prezzi se necessario.
6. `src/types/audit.ts` — Portare da V2.
7. `src/types/tools.ts` — Portare da V2.
8. `src/types/menu.ts` — Portare da V2. Allineare MENU_ITEMS con route attuali.
9. Aggiornare `src/types/index.ts` — Re-esportare tutti i nuovi moduli.

**Verifica:** TypeScript compila senza errori.

### FASE 2: Lib pure (nessuna dipendenza AI)
**Stimato: ~3,500 righe**

Portare librerie che non fanno chiamate AI:

1. `src/lib/maestro/definitions.ts` — 4 tutori, voici ElevenLabs.
2. `src/lib/maestro/parsing.ts` — Parser risposte maestro.
3. `src/lib/maestro/voices.ts` — Mapping voici per lingua.
4. `src/lib/lifeTutor/config.ts` — Config localStorage.
5. `src/lib/lifeTutor/kb.ts` — Knowledge base con 9 entry di sistema.
6. `src/lib/lifeTutor/memory.ts` — Sistema memoria 3 livelli + Supabase.
7. `src/lib/lifeTutor/processor.ts` — 7 detection rules, locale-only.
8. `src/lib/lifeTutor/profile.ts` — Profilo utente + Supabase.
9. `src/lib/lifeTutor/prompt.ts` — Costruttore prompt addon.
10. `src/lib/lifeTutor/index.ts` — Barrel re-exports.
11. `src/lib/studentProfile.ts` — Profili studente localStorage.
12. `src/lib/courseCatalog.ts` — 20 template corsi.
13. `src/lib/assessmentEngine.ts` — Valutazione quiz (PASS_THRESHOLD=50).
14. `src/lib/xapiBuilder.ts` — xAPI statements. **Aggiornare BARTALK_BASE URL.**
15. `src/lib/ltiHelper.ts` — LTI launch/grade.
16. `src/lib/audioStorage.ts` — IndexedDB per registrazioni.
17. `src/lib/audioAnalyzer.ts` — Waveform + ElevenLabs reference audio. **Allineare config con constants.**
18. `src/lib/pronunciationAnalyzer.ts` — Analisi pronuncia via AI.
19. `src/lib/lifeTutorMemory.ts` — Barrel deprecato per backward compat.

**Adattamenti chiave:**
- `xapiBuilder.ts`: cambiare `BARTALK_BASE` da `bartalk-v79.vercel.app` a URL attuale
- `audioAnalyzer.ts`: usare `TTS.apiBase` e `TTS.model` da constants
- `memory.ts`: verificare compatibilita con client Supabase v8.2.5

**Verifica:** TypeScript compila. Unit test per assessmentEngine e parsing.

### FASE 3: Lib con dipendenze AI
**Stimato: ~1,500 righe**

Portare librerie che chiamano proxy AI:

1. `src/lib/maestro/prompts.ts` — System prompt builder per maestri.
2. `src/lib/maestroEngine.ts` — generateTeachingResponse, generateWelcomeMessage.
3. `src/lib/courseGenerator.ts` — Genera syllabus con AI (unlimitedTokens).
4. `src/lib/lessonContentGenerator.ts` — Genera contenuto lezioni.
5. `src/lib/educationAPI.ts` — Cloud sync. **Aggiornare endpoint `/api/education`.**
6. `src/lib/lifeTutor/extraction.ts` — Estrae memorie da conversazioni via AI.
7. `src/lib/lifeTutor/proactivity.ts` — Suggerimenti proattivi (rate-limited 4h).

**Adattamenti chiave:**
- Tutti devono usare `callProxy` da v8.2.5 (non importare versione V2)
- `courseGenerator.ts`: verificare che `repairJSON` esista o crearla
- `educationAPI.ts`: creare endpoint `/api/education` e `/api/xapi`

**Verifica:** TypeScript compila. Test manuali con un provider configurato.

### FASE 4: Hooks mancanti
**Stimato: ~450 righe**

1. `src/hooks/useAudioRecording.ts` — MediaRecorder hook.
2. `src/hooks/useIsMobile.ts` — Breakpoint detection.
3. `src/hooks/useVAD.ts` — Voice Activity Detection. **Fix:** i18n su errore italiano.
4. `src/hooks/useIsAdmin.ts` — Admin check da env vars.
5. `src/hooks/useEffectiveTier.ts` — Tier resolution con Supabase override.

Aggiornare hooks esistenti:
6. `src/hooks/useOrchestrator.ts` — Aggiungere CourseContext integration.

**Verifica:** Hooks importabili senza errori. No side effects a build time.

### FASE 5: Context Providers
**Stimato: ~1,200 righe**

1. `src/context/BillingContext.tsx` — Provider con refresh ogni 5 min.
2. `src/context/xAPIContext.tsx` — Queue xAPI con flush ogni 30s.
3. `src/context/LTIContext.tsx` — Session LTI con JWT TTL 4h.
4. `src/context/CourseContext.tsx` — Provider corsi completo.
5. `src/context/MaestroContext.tsx` — Provider maestro con student profile.

**Adattamenti chiave:**
- Tutti i context devono essere compatibili con React 19
- `CourseContext`: dipende da xAPIContext e courseGenerator
- `MaestroContext`: dipende da CourseContext, lifeTutor, xAPI
- Ordine nesting in App.tsx (da esterno a interno): `BillingProvider > XAPIProvider > LTIProvider > CourseProvider > MaestroProvider`

**Verifica:** Provider chain in App.tsx senza circular deps.

### FASE 6: Componenti UI
**Stimato: ~5,000+ righe**

Portare TUTTI i componenti, raggruppati per dipendenza:

**Batch A — Componenti standalone:**
- `Components/Common/VoiceMicButton.tsx` (da Shared/)
- `Components/Legal/CookieBanner.tsx`
- `Components/Legal/PrivacyPolicy.tsx`
- `Components/Legal/TermsOfService.tsx`
- `Components/Billing/PricingCards.tsx`
- `Components/Billing/BillingPanel.tsx`
- `Components/Billing/UpgradeModal.tsx`

**Batch B — Maestro (bottom-up):**
- `Components/Maestro/MaestroAvatar.tsx`
- `Components/Maestro/WaveformCanvas.tsx` — **Fix:** rimuovere bg bianco, usare CSS vars, rimuovere Tailwind
- `Components/Maestro/MaestroToolbar.tsx` — **Fix:** aggiungere i18n
- `Components/Maestro/PronunciationPanel.tsx` — **Fix:** aggiungere i18n
- `Components/Maestro/ProgressTimeline.tsx` — **Fix:** aggiungere i18n, rimuovere `'it-IT'` hardcoded
- `Components/Maestro/StudentOnboarding.tsx` — **Fix:** rimuovere `nativeLanguage: 'it'` hardcoded
- `Components/Maestro/MaestroSelector.tsx`
- `Components/Maestro/MaestroChat.tsx`

**Batch C — Courses (bottom-up):**
- `Components/Courses/CourseActive.tsx`
- `Components/Courses/CourseAssessment.tsx`
- `Components/Courses/CourseBrowse.tsx`
- `Components/Courses/CourseCatalog.tsx`
- `Components/Courses/CourseWizard.tsx`
- `Components/Courses/CourseMaestro.tsx`
- `Components/Courses/CoursePanel.tsx`

**Batch D — LifeTutor:**
- `Components/LifeTutor/ObjectivesPanel.tsx`
- `Components/LifeTutor/SuggestionsWidget.tsx`
- `Components/LifeTutor/FreeChatPanel.tsx`
- `Components/LifeTutor/LifeTutorTab.tsx`
- `Components/LifeTutor/index.ts`

**Batch E — Standalone:**
- `Components/FreeVoice/DynamicCanvas.tsx`
- `Components/FreeVoice/FreeVoiceTab.tsx` — **Fix:** usare apiKeyResolver invece di hardcode openai
- `Components/Education/ProgressDashboard.tsx` — **Fix:** convertire inline styles in CSS
- `Components/Landing/LandingPage.tsx` — **Fix:** aggiornare brand, email, agenti

**Adattamenti chiave globali:**
- Rimuovere `import React` dove presente (React 19 JSX transform)
- Verificare che nessun componente usi `React.FC` (preferire function declarations)
- Allineare CSS naming con convenzioni v8.2.5

**Verifica:** Ogni batch deve compilare prima di passare al successivo.

### FASE 7: Routing, App.tsx, API e Migration
**Stimato: ~500 righe**

1. **Aggiornare `src/router.tsx`:**
   - Aggiungere route: `/courses`, `/maestro`, `/life-tutor`, `/free-voice`, `/progress`, `/billing`, `/landing`
   - Lazy import per ogni pagina

2. **Aggiornare `src/App.tsx`:**
   - Aggiungere provider chain: `BillingProvider > XAPIProvider > LTIProvider > CourseProvider > MaestroProvider`
   - Aggiungere `CookieBanner` al root

3. **Creare API endpoints:**
   - `api/education.js` — Sync profili e corsi
   - `api/xapi.js` — Raccolta statement xAPI
   - `api/tts-proxy.js` — Proxy ElevenLabs (se non esiste)

4. **Creare migration Supabase:**
   - Tabella `lt_memories` (memoria Life Tutor)
   - Tabella `lt_user_profile` (profilo Life Tutor)
   - Tabella `user_credits` (tier e crediti)
   - Tabella `xapi_statements` (statement xAPI)
   - Tabella `study_sessions` (sessioni studio)

5. **Aggiornare barrel exports:**
   - `src/types/index.ts` — Tutti i nuovi types
   - `src/lib/index.ts` — Nuovi moduli pubblici

**Verifica:** Build completa. Tutte le route accessibili.

### FASE 8: Verifica finale
**Stimato: tempo di test**

1. `npx tsc --noEmit` — Zero errori TypeScript
2. `npm run build` — Vite build senza errori
3. Vercel preview deploy — Tutte le serverless functions OK
4. Test navigazione — Ogni route carica il componente corretto
5. Test Maestro — Seleziona tutor, invia messaggio, ricevi risposta
6. Test Courses — Sfoglia catalogo, genera corso, avvia lezione
7. Test LifeTutor — Chat libera, suggerimenti, obiettivi
8. Test FreeVoice — Modalita vocale base
9. Lighthouse audit — Performance, a11y, best practices
10. Deploy produzione

---

## 3. DIPENDENZE — GRAFO

```
FASE 0: apiKeyResolver, authToken, featureGating, i18n, constants (merge)
   |
   v
FASE 1: types/* (courses, maestro, lifeTutor, education, billing, audit, tools, menu)
   |
   v
FASE 2: lib pure (maestro/*, lifeTutor/*, courseCatalog, assessmentEngine, xapiBuilder, ...)
   |
   v
FASE 3: lib AI (maestroEngine, courseGenerator, lessonContentGenerator, educationAPI, extraction, proactivity)
   |
   v
FASE 4: hooks (useAudioRecording, useVAD, useIsMobile, useIsAdmin, useEffectiveTier)
   |
   v
FASE 5: contexts (BillingContext, xAPIContext, LTIContext, CourseContext, MaestroContext)
   |
   v
FASE 6: components (Legal > Billing > Maestro > Courses > LifeTutor > FreeVoice > Education > Landing)
   |
   v
FASE 7: router + App.tsx + API + migration SQL
   |
   v
FASE 8: build + test + deploy
```

---

## 4. VALORI HARDCODED DA AGGIORNARE

| Valore | Dove | Nuovo valore |
|--------|------|--------------|
| `BARTALK_BASE` | xapiBuilder.ts | URL produzione Vercel attuale |
| `support@bartalk.app` | LandingPage, PrivacyPolicy | Indirizzo email corretto |
| `privacy@bartalk.app` | PrivacyPolicy | Indirizzo email corretto |
| `'RadioChat v8.0'` | LandingPage | `'BarTalk v8.2.5'` o `UI.appName + UI.appVersion` |
| ElevenLabs voice IDs | definitions.ts | Verificare che siano ancora validi |
| `gpt-4o-mini` hardcoded | FreeVoiceTab | Usare `resolveApiKey` |
| `stability: 0.5` | audioAnalyzer.ts | Allineare con `TTS.voiceSettings` (0.70) |
| `'Marzo 2026'` | PrivacyPolicy, TermsOfService | `'Maggio 2026'` |
| `nativeLanguage: 'it'` | StudentOnboarding | Derivare da settings utente |
| `locale 'it-IT'` | utils.ts, ProgressTimeline, BillingPanel | Derivare da settings utente |

---

## 5. MIGRAZIONI SUPABASE NECESSARIE

```sql
-- Tabella: lt_memories
CREATE TABLE IF NOT EXISTS lt_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  layer TEXT CHECK (layer IN ('recent', 'consolidated', 'deep')),
  tag TEXT,
  content TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Tabella: lt_user_profile
CREATE TABLE IF NOT EXISTS lt_user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  name TEXT,
  preferences JSONB DEFAULT '{}',
  personality JSONB DEFAULT '{}',
  goals JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella: user_credits
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  tier TEXT DEFAULT 'free',
  tier_override TEXT,
  credits_ai INTEGER DEFAULT 0,
  credits_tts INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella: study_sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  course_id TEXT,
  maestro_id TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  messages_count INTEGER DEFAULT 0,
  score REAL
);

-- Tabella: xapi_statements
CREATE TABLE IF NOT EXISTS xapi_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  verb TEXT NOT NULL,
  object_id TEXT,
  object_type TEXT,
  result JSONB,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE lt_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lt_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xapi_statements ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users own lt_memories" ON lt_memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own lt_user_profile" ON lt_user_profile FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own user_credits" ON user_credits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own study_sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own xapi_statements" ON xapi_statements FOR ALL USING (auth.uid() = user_id);

-- Indici
CREATE INDEX idx_lt_memories_user ON lt_memories(user_id);
CREATE INDEX idx_lt_memories_layer ON lt_memories(layer);
CREATE INDEX idx_lt_memories_tag ON lt_memories(tag);
CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_xapi_statements_user ON xapi_statements(user_id);
```

---

## 6. STIMA TEMPI

| Fase | Righe stimate | Complessita |
|------|--------------|-------------|
| FASE 0: Dipendenze bloccanti | ~400 | Media |
| FASE 1: Types | ~1,415 | Bassa |
| FASE 2: Lib pure | ~3,500 | Media |
| FASE 3: Lib AI | ~1,500 | Alta |
| FASE 4: Hooks | ~450 | Bassa |
| FASE 5: Contexts | ~1,200 | Alta |
| FASE 6: Componenti | ~5,000+ | Alta |
| FASE 7: Router/App/API/SQL | ~500 | Media |
| FASE 8: Verifica | — | Test |
| **TOTALE** | **~14,000+** | — |

---

*Piano generato seguendo metodologia Codex Cobra — Audit completo prima di ogni modifica al codice.*
