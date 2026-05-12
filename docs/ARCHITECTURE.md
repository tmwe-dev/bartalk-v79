# BarTalk v8.2.5 — Architecture

## Overview

BarTalk is a multi-agent AI chat platform built with React 19, TypeScript, Vite 7, and deployed on Vercel with Supabase as the backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | CSS Variables (dark/light theme) |
| Routing | React Router v7 (lazy-loaded pages) |
| State | React Context (Auth, Settings, Agent, Conversation, Task, UI, Theme) |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI Providers | OpenAI, Anthropic, Google Gemini, Groq, xAI |
| TTS | ElevenLabs Multilingual v2 |
| Testing | Vitest + React Testing Library + Playwright |
| Error Tracking | Sentry |

## Directory Structure

```
radiochat/
├── api/                    # Vercel serverless functions
│   ├── ai-proxy.js         # Main AI proxy with rate limiting
│   ├── conversations.js    # CRUD conversations
│   ├── agent-config.js     # Agent configuration
│   ├── billing.js          # Stripe billing
│   └── parse-file.js       # File parsing (PDF/DOCX/XLSX)
├── docs/                   # Documentation
├── public/                 # Static assets
│   ├── .well-known/        # Security contact
│   └── assets/             # Agent images, GIFs
├── src/
│   ├── components/         # React components
│   │   ├── Agents/         # Agent cards, selector
│   │   ├── Auth/           # Authentication gate
│   │   ├── Carousel/       # 3D radio carousel (Three.js)
│   │   ├── Chat/           # Chat container, messages, input
│   │   ├── Common/         # Toast, Modal, ErrorBoundary, Skeleton
│   │   ├── Layout/         # AppLayout, Navbar
│   │   ├── Podcast/        # Podcast mode
│   │   ├── Settings/       # Settings modal tabs
│   │   ├── Studio/         # Studio/debug page
│   │   └── Tasks/          # Task objective panel
│   ├── context/            # React Context providers
│   │   ├── AuthContext      # Supabase auth + skip mode
│   │   ├── SettingsContext   # API keys, preferences
│   │   ├── AgentContext      # Agent enable/disable
│   │   ├── ConversationContext # Messages, conversations
│   │   ├── TaskContext       # Objective/deliverable system
│   │   ├── UIContext         # UI state (modals, studio)
│   │   └── ThemeContext      # Dark/light theme
│   ├── hooks/              # Custom hooks (useTTS, useSTT)
│   ├── lib/                # Core logic
│   │   ├── agents.ts       # Agent definitions (4 agents)
│   │   ├── apiService.ts   # Typed API service layer
│   │   ├── announce.ts     # ARIA live region helpers
│   │   ├── constants.ts    # App constants, models
│   │   ├── convergence.ts  # Convergence detection
│   │   ├── dbSync.ts       # DB ↔ localStorage sync
│   │   ├── errors.ts       # Custom error hierarchy
│   │   ├── errorTracker.ts # Sentry integration
│   │   ├── memory.ts       # Conversation memory
│   │   ├── orchestrator.ts # Multi-agent orchestration
│   │   ├── performance.ts  # Debounce, throttle, memo
│   │   ├── proxy.ts        # AI proxy client with retry
│   │   ├── sanitize.ts     # Input sanitization
│   │   ├── storage.ts      # localStorage wrappers
│   │   └── index.ts        # Barrel exports
│   ├── pages/              # Route pages (lazy-loaded)
│   ├── types/              # TypeScript type definitions
│   │   ├── agents.ts       # Provider, Agent types
│   │   ├── auth.ts         # Auth state types
│   │   ├── conversation.ts # Message, Conversation types
│   │   ├── orchestrator.ts # Orchestration types
│   │   ├── settings.ts     # Settings, Language types
│   │   ├── tasks.ts        # Task/deliverable types
│   │   └── index.ts        # Barrel exports
│   └── router.tsx          # Route definitions
├── tests/
│   ├── unit.test.ts        # 323 unit tests
│   ├── components.test.tsx # 66 component tests
│   ├── setup.ts            # Vitest setup
│   └── e2e/
│       └── app.spec.ts     # 21 Playwright E2E tests
└── vercel.json             # Deployment config + security headers
```

## AI Agents

| Agent | Provider | Model | Role |
|-------|----------|-------|------|
| Albert | OpenAI | gpt-4o | General knowledge |
| Archimede | Anthropic | claude-sonnet-4 | Deep analysis |
| Pitagora | Google Gemini | gemini-2.0-flash | Scientific reasoning |
| Newton | xAI | grok-3-mini | Technical expertise |

## Data Flow

```
User Input → InputBox → ConversationContext → Orchestrator
                                                    ↓
                                        Build system prompts
                                                    ↓
                                        For each agent in plan:
                                          proxy.ts → /api/ai-proxy
                                                         ↓
                                              Provider API (OpenAI, etc.)
                                                         ↓
                                              Response → Message store
                                                         ↓
                                              MessageBubble → TTS (optional)
```

## Security

- CSP headers with strict directives
- CORS restricted to production domain
- Per-IP and per-user rate limiting
- Input sanitization on client and server
- Supabase RLS for data access control
- CSRF token validation
- SRI-ready asset integrity

## Error Handling

Custom error hierarchy:
- `AppError` → base class with code, statusCode, context
- `NetworkError` → fetch failures, timeouts
- `ProviderError` → AI provider errors (rate limit, auth, server)
- `ValidationError` → input validation failures
- `AuthError` → authentication errors
- `StorageError` → localStorage/DB errors

## Testing Strategy

- **Unit tests** (323): Pure functions, utils, sanitization, convergence
- **Component tests** (66): React components with Vitest + RTL
- **E2E tests** (21): Full browser tests with Playwright
- **Coverage thresholds**: 60% statements, 50% branches/functions
