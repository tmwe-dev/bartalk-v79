# BarTalk v8.2.6 — Architecture

## Overview

BarTalk is a multi-agent AI chat platform built with React 19, TypeScript, Vite 7, and deployed on Vercel with Supabase as the backend. It features four AI agents, streaming responses, a course/education system, a LifeTutor subsystem, and a Maestro orchestration layer.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | CSS Variables (dark/light theme) |
| Routing | React Router v7 (lazy-loaded pages) |
| State | React Context (12 contexts) |
| Backend | Vercel Serverless Functions (Node.js 20) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI Providers | OpenAI, Anthropic, Google Gemini, Groq, xAI |
| TTS | ElevenLabs Multilingual v2 |
| Billing | Stripe (subscriptions + webhooks) |
| Testing | Vitest + React Testing Library + Playwright |
| Error Tracking | Sentry |

## Directory Structure

```
radiochat/
├── api/                        # Vercel serverless functions (13 endpoints)
│   ├── ai-proxy.js             # Main AI proxy with rate limiting + streaming
│   ├── ai-preprocess-file.js   # AI-powered file preprocessing
│   ├── agent-config.js         # Agent configuration CRUD
│   ├── billing.js              # Stripe billing (plans, subscriptions)
│   ├── conversations.js        # Conversation + message CRUD
│   ├── education.js            # Course/education API
│   ├── health.js               # Health check endpoint
│   ├── keys.js                 # Encrypted API key vault
│   ├── parse-file.js           # File parsing (PDF/DOCX/XLSX)
│   ├── stripe-webhook.js       # Stripe webhook handler
│   ├── tts-proxy.js            # Text-to-speech proxy
│   ├── user-profile.js         # User profile management
│   └── xapi.js                 # xAPI learning record store
├── docs/                       # Documentation
├── migrations/                 # Supabase SQL migrations
├── public/
│   └── assets/                 # Agent images, GIFs
├── src/
│   ├── components/             # React components (21 directories)
│   │   ├── Agents/             # Agent cards, selector
│   │   ├── Auth/               # Authentication gate
│   │   ├── Billing/            # Billing UI, plan selection
│   │   ├── Carousel/           # 3D radio carousel (Three.js)
│   │   ├── Chat/               # Chat container, messages, input
│   │   ├── Common/             # Toast, Modal, ErrorBoundary, Skeleton
│   │   ├── Courses/            # Course catalog, lesson views
│   │   ├── Education/          # Education components
│   │   ├── FreeVoice/          # Free voice mode
│   │   ├── Landing/            # Landing page components
│   │   ├── Layout/             # AppLayout, Navbar
│   │   ├── Legal/              # Legal pages (terms, privacy)
│   │   ├── LifeTutor/          # LifeTutor coaching interface
│   │   ├── Maestro/            # Maestro orchestration UI
│   │   ├── Menu/               # Menu components
│   │   ├── Podcast/            # Podcast mode
│   │   ├── Settings/           # Settings modal tabs
│   │   ├── Shared/             # Shared/reusable components
│   │   ├── Studio/             # Studio/debug page
│   │   └── Tasks/              # Task objective panel
│   ├── context/                # React Context providers (12)
│   │   ├── AgentContext         # Agent enable/disable + freedom levels
│   │   ├── AuthContext          # Supabase auth + skip mode
│   │   ├── BillingContext       # Stripe subscription state
│   │   ├── ConversationContext  # Messages, conversations
│   │   ├── CourseContext        # Course enrollment + progress
│   │   ├── LTIContext           # LTI integration for LMS
│   │   ├── MaestroContext       # Maestro orchestration state
│   │   ├── SettingsContext      # API keys, preferences
│   │   ├── TaskContext          # Objective/deliverable system
│   │   ├── ThemeContext         # Dark/light theme
│   │   ├── UIContext            # UI state (modals, studio)
│   │   └── xAPIContext          # xAPI learning analytics
│   ├── hooks/                  # Custom hooks (8)
│   │   ├── useAudioRecording   # Audio capture
│   │   ├── useEffectiveTier    # Billing tier resolution
│   │   ├── useIsAdmin          # Admin role check
│   │   ├── useIsMobile         # Responsive breakpoint
│   │   ├── useOrchestrator     # Multi-agent orchestration hook
│   │   ├── useSpeechToText     # STT via Web Speech API
│   │   ├── useTTS              # Text-to-speech (ElevenLabs)
│   │   └── useVAD              # Voice activity detection
│   ├── lib/                    # Core logic (57 modules)
│   │   ├── agents.ts           # Agent definitions (4 agents)
│   │   ├── agentFreedom.ts     # Freedom level system
│   │   ├── apiKeyResolver.ts   # API key resolution chain
│   │   ├── apiService.ts       # Typed API service layer
│   │   ├── assessmentEngine.ts # Quiz/assessment engine
│   │   ├── audioAnalyzer.ts    # Audio waveform analysis
│   │   ├── audioStorage.ts     # Audio file management
│   │   ├── auditAPI.ts         # Audit log API
│   │   ├── billingAPI.ts       # Billing API client
│   │   ├── commands.ts         # Slash command system
│   │   ├── constants.ts        # App constants, models
│   │   ├── convergence.ts      # Convergence detection
│   │   ├── courseCatalog.ts    # Course catalog data
│   │   ├── courseGenerator.ts  # Dynamic course generation
│   │   ├── dbSync.ts           # DB <-> localStorage sync
│   │   ├── dbValidation.ts     # Database validation
│   │   ├── educationAPI.ts     # Education API client
│   │   ├── errors.ts           # Custom error hierarchy
│   │   ├── errorTracker.ts     # Sentry integration
│   │   ├── featureGating.ts    # Feature flags per billing tier
│   │   ├── i18n/               # Internationalization (5 files)
│   │   ├── lifeTutor/          # LifeTutor subsystem (10 modules)
│   │   ├── maestro/            # Maestro subsystem (4 modules)
│   │   ├── memory.ts           # Conversation memory
│   │   ├── lifeTutorMemory.ts  # LifeTutor memory persistence
│   │   ├── orchestrator.ts     # Multi-agent orchestration
│   │   ├── performance.ts      # Debounce, throttle, memo
│   │   ├── prompts.ts          # Prompt templates
│   │   ├── proxy.ts            # AI proxy client with retry
│   │   ├── rateLimiter.ts      # Client-side rate limiting
│   │   ├── sanitize.ts         # Input sanitization
│   │   ├── streaming.ts        # SSE/streaming response handling
│   │   ├── storage.ts          # localStorage wrappers
│   │   ├── supabase.ts         # Supabase client init
│   │   ├── toolExecutor.ts     # Tool execution engine
│   │   ├── toolRegistry.ts     # Tool registration system
│   │   └── ...                 # + additional utility modules
│   ├── pages/                  # Route pages (12, lazy-loaded)
│   │   ├── AdminPage           # Admin dashboard
│   │   ├── ChatPage            # Main chat interface
│   │   ├── DebugPage           # Debug/studio page
│   │   ├── LoginPage           # Authentication
│   │   ├── MenuPage            # Menu navigation
│   │   ├── SectionPage         # Section views
│   │   ├── SettingsPage        # User settings
│   │   └── WelcomePage         # Onboarding/welcome
│   └── types/                  # TypeScript type definitions (16 files)
│       ├── agents.ts           # Provider, Agent types
│       ├── auth.ts             # Auth state types
│       ├── billing.ts          # Billing/subscription types
│       ├── conversation.ts     # Message, Conversation types
│       ├── courses.ts          # Course/lesson types
│       ├── education.ts        # Education types
│       ├── lifeTutor.ts        # LifeTutor types
│       ├── maestro.ts          # Maestro types
│       ├── orchestrator.ts     # Orchestration types
│       ├── settings.ts         # Settings, Language types
│       ├── tasks.ts            # Task/deliverable types
│       └── tools.ts            # Tool system types
├── tests/
│   ├── components.test.tsx     # Component tests
│   ├── lib/                    # Unit tests (17 files)
│   ├── v2/                     # v2 integration tests (18 files)
│   ├── e2e/
│   │   └── app.spec.ts         # Playwright E2E tests
│   └── setup.ts                # Vitest setup
└── vercel.json                 # Deployment config + security headers
```

## AI Agents

| Agent | Provider | Model | Role |
|-------|----------|-------|------|
| Albert | OpenAI | gpt-4o | General knowledge |
| Archimede | Anthropic | claude-sonnet-4 | Deep analysis |
| Pitagora | Google Gemini | gemini-2.0-flash | Scientific reasoning |
| Newton | xAI | grok-3-mini | Technical expertise |

## Context System (12 Contexts)

The app uses React Context for state management across 12 providers:

| Context | Purpose |
|---------|---------|
| AuthContext | Supabase authentication, skip-auth mode |
| SettingsContext | User preferences, API keys, language |
| AgentContext | Agent enable/disable, freedom levels |
| ConversationContext | Messages, conversation CRUD, history |
| TaskContext | Objective/deliverable tracking |
| UIContext | Modal state, studio mode, panels |
| ThemeContext | Dark/light theme toggle |
| BillingContext | Stripe subscription, tier state |
| CourseContext | Course enrollment, lesson progress |
| MaestroContext | Maestro orchestration state |
| LTIContext | LTI integration for external LMS |
| xAPIContext | xAPI learning analytics tracking |

## Hooks (8 Custom Hooks)

| Hook | Purpose |
|------|---------|
| useOrchestrator | Multi-agent plan building and execution |
| useTTS | ElevenLabs text-to-speech playback |
| useSpeechToText | Browser Speech Recognition API |
| useVAD | Voice Activity Detection for auto-record |
| useAudioRecording | MediaRecorder audio capture |
| useEffectiveTier | Resolves user billing tier (free/pro) |
| useIsAdmin | Admin role check from auth context |
| useIsMobile | Responsive breakpoint detection |

## Memory System

- **memory.ts** — Conversation memory with summarization and context windowing
- **lifeTutorMemory.ts** — Persistent memory for LifeTutor coaching sessions
- **dbSync.ts** — Bidirectional sync between localStorage and Supabase

## Course and Maestro Systems

**Courses**: Dynamic course generation and catalog with assessment engine, student profiles, and xAPI-compatible learning records. Components in `src/components/Courses/` and `src/components/Education/`.

**Maestro**: Orchestration layer for advanced multi-agent workflows. Includes voice definitions, prompt construction, and parsing logic. Located in `src/lib/maestro/` with UI in `src/components/Maestro/`.

## LifeTutor

AI coaching subsystem with proactive engagement, user profiling, knowledge base, and memory. Located in `src/lib/lifeTutor/` (10 modules: config, extraction, kb, memory, proactivity, processor, profile, prompt, index). UI in `src/components/LifeTutor/`.

## Data Flow

```
User Input -> InputBox -> ConversationContext -> Orchestrator
                                                    |
                                        Build system prompts
                                                    |
                                        For each agent in plan:
                                          proxy.ts -> /api/ai-proxy
                                                         |
                                              Provider API (OpenAI, etc.)
                                                         |
                                              Stream/Response -> Message store
                                                         |
                                              MessageBubble -> TTS (optional)
```

## Security

- CSP headers with strict directives
- CORS restricted to production domain
- Per-IP and per-user rate limiting (30/60 req/min)
- Input sanitization on client and server
- Supabase RLS for data access control
- CSRF token validation
- AES-256-GCM encrypted API key vault
- SRI-ready asset integrity

## Error Handling

Custom error hierarchy:
- `AppError` — base class with code, statusCode, context
- `NetworkError` — fetch failures, timeouts
- `ProviderError` — AI provider errors (rate limit, auth, server)
- `ValidationError` — input validation failures
- `AuthError` — authentication errors
- `StorageError` — localStorage/DB errors

## Testing Strategy

- **713 total tests** across 36 test files
- **Unit tests** (17 files in `tests/lib/`): Pure functions, utils, sanitization, convergence, memory
- **Integration tests** (18 files in `tests/v2/`): Agents, contexts, pages, routes, feature gating
- **Component tests** (`tests/components.test.tsx`): React components with Vitest + RTL
- **E2E tests** (`tests/e2e/app.spec.ts`): Full browser tests with Playwright
- **Coverage**: V8 provider, thresholds at 15% statements/functions/lines, 10% branches
