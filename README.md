# BarTalk v8.2.6

![Version](https://img.shields.io/badge/version-8.2.6-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![Tests](https://img.shields.io/badge/tests-713%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A multi-agent AI chat platform where four AI personalities converse together in real time. Each agent is powered by a different provider, creating dynamic and diverse conversations with distinct viewpoints.

| Agent | Provider | Personality |
|-------|----------|-------------|
| **Albert** | OpenAI | Analytical and methodical |
| **Archimede** | Anthropic | Creative and philosophical |
| **Pitagora** | Google Gemini | Logical and precise |
| **Newton** | xAI (Grok) | Witty and unconventional |

---

## Features

### Core Chat
- **Multi-agent conversations** -- four AI agents discuss topics together, each with a distinct voice and reasoning style
- **3 chat modes** -- Standard (free conversation), Consultation (focused Q&A), Bar Realtime (live bar atmosphere)
- **Convergence detection** -- automatically identifies when agents reach consensus
- **3-level memory system** -- full transcript, condensed context, and summary for efficient long conversations

### AI and Voice
- **5 AI providers** -- OpenAI, Anthropic, Google Gemini, Groq, and xAI integrated through a unified proxy
- **Text-to-speech** via ElevenLabs with multilingual support
- **Podcast mode** -- generates podcast-style audio from agent conversations

### Learning and Tools
- **Maestro** -- course system and learning platform with structured educational content
- **LifeTutor** -- personal development section with guided AI coaching
- **Studio/Debug tools** -- inspect agent behavior, prompt engineering, and system diagnostics
- **File upload** -- parse and discuss PDF, DOCX, and XLSX documents within conversations

### User Experience
- **Glassmorphism UI** with dark and light themes
- **Multi-language support** -- Italian, English, Spanish, French, German
- **Skip-mode** for unauthenticated users to try the platform
- **Responsive design** optimized for desktop and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7, React Router 7 |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase (PostgreSQL + Auth + Row Level Security) |
| AI Providers | OpenAI, Anthropic, Google Gemini, Groq, xAI |
| TTS | ElevenLabs |
| 3D/Animation | Three.js, GSAP |
| File Parsing | pdf-parse, mammoth (DOCX), xlsx |
| Testing | Vitest, React Testing Library, Playwright |

---

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm
- A Supabase project
- API keys for at least one AI provider

### Installation

```bash
git clone <repository-url>
cd radiochat
npm install
```

### Development

```bash
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Production Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```
radiochat/
├── api/                    # Vercel serverless functions (13 endpoints)
│   ├── ai-proxy.js         # Unified AI provider proxy
│   ├── tts-proxy.js        # ElevenLabs TTS proxy
│   ├── parse-file.js       # File upload and parsing
│   ├── billing.js          # Billing and usage tracking
│   ├── conversations.js    # Conversation CRUD
│   ├── education.js        # Course/education endpoints
│   └── ...
├── src/
│   ├── components/         # React components (20 modules)
│   │   ├── Agents/         # Agent avatars and displays
│   │   ├── Chat/           # Chat interface and messages
│   │   ├── Courses/        # Maestro course components
│   │   ├── LifeTutor/      # Personal development UI
│   │   ├── Podcast/        # Podcast mode interface
│   │   ├── Studio/         # Debug and development tools
│   │   └── ...
│   ├── context/            # React contexts (12 providers)
│   │   ├── AgentContext     # Agent state and configuration
│   │   ├── AuthContext      # Authentication and sessions
│   │   ├── ConversationContext # Chat state management
│   │   ├── ThemeContext     # Dark/light theme switching
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core logic (60 modules)
│   ├── pages/              # Route pages (12)
│   ├── types/              # TypeScript type definitions (16 files)
│   └── router.tsx          # Application routing
├── tests/
│   ├── v2/                 # Current test suite
│   ├── e2e/                # Playwright end-to-end tests
│   └── setup.ts            # Test configuration
├── migrations/             # Supabase SQL migrations
├── supabase/               # Supabase configuration
└── docs/                   # Additional documentation
```

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GEMINI_API_KEY=
GROQ_API_KEY=
XAI_API_KEY=

# ElevenLabs TTS
ELEVENLABS_API_KEY=

# Stripe (billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Application
VITE_APP_URL=
```

> **Note:** `VITE_` prefixed variables are exposed to the client. Server-only keys (API keys, secrets) are used exclusively in the `api/` serverless functions.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint across the codebase |

---

## Testing

The project uses a two-layer testing strategy:

### Unit and Integration Tests (Vitest)

```bash
npx vitest run
```

- 713 tests across 36 test files
- Environment: jsdom
- Coverage provider: V8
- Covers `src/lib/`, `src/context/`, `src/components/`, and `api/`

### End-to-End Tests (Playwright)

```bash
npx playwright test
```

- Runs against the preview server on port 4173
- Chromium browser
- Screenshots captured on failure

### Coverage

```bash
npx vitest run --coverage
```

Coverage thresholds are configured at 15% statements, 10% branches, 15% functions, and 15% lines.

---

## Deployment

The application is deployed on **Vercel**.

### Configuration

Deployment is configured via `vercel.json`:
- Framework: Vite
- Output directory: `dist`
- SPA routing with API passthrough
- Security headers: CSP, HSTS, X-Frame-Options, XSS Protection

### Steps

1. Connect the repository to Vercel
2. Set all environment variables in the Vercel dashboard
3. Deploy -- Vercel automatically builds with `npm run build` and serves the `dist/` directory
4. Serverless functions in `api/` are deployed as Vercel Functions automatically

### Supabase Setup

1. Create a Supabase project
2. Run the SQL migrations from `migrations/` in order
3. Enable Row Level Security on all tables
4. Configure authentication providers as needed

---

## Security

The application enforces several security measures:

- Content Security Policy restricting script and connection sources
- Strict Transport Security with preload
- Frame denial (X-Frame-Options: DENY)
- Row Level Security on all Supabase tables
- API keys isolated to serverless functions (never exposed to client)
- Microphone permission scoped to self only

---

## License

MIT
