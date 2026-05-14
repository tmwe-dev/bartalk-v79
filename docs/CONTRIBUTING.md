# Contributing to BarTalk v8.2.6

## Prerequisites

- Node.js 18+ (Node 20 recommended for native fetch in serverless functions)
- npm 9+
- Git

## Setup

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd radiochat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with required variables:
   ```
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ENCRYPTION_KEY=<hex-encoded-aes-256-key>
   VITE_SENTRY_DSN=<optional-sentry-dsn>
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The app runs at `http://localhost:5173` by default (Vite).

## Testing

Run the full test suite:
```bash
npx vitest run
```

Run tests in watch mode:
```bash
npx vitest
```

Run only unit tests:
```bash
npx vitest run tests/lib
```

Run E2E tests with Playwright:
```bash
npx playwright test
```

Generate coverage report:
```bash
npx vitest run --coverage
```

The project has 713 tests across 36 files covering unit, integration, component, and E2E layers.

## Code Style

- **TypeScript strict mode** for all source files (`src/`)
- **ESLint** with `@eslint/js`, `typescript-eslint`, `react-hooks`, and `react-refresh` plugins
- **Naming conventions**:
  - Components: PascalCase (`ChatContainer.tsx`)
  - Hooks: camelCase with `use` prefix (`useTTS.ts`)
  - Lib modules: camelCase (`apiService.ts`)
  - Types: PascalCase for interfaces/types, camelCase for files
  - Constants: UPPER_SNAKE_CASE
- **CSS**: Use CSS variables for theming; no CSS-in-JS
- **Imports**: Use barrel exports from `index.ts` files where available

Run linting:
```bash
npx eslint src/
```

## Project Structure

- `api/` — Vercel serverless functions (Node.js)
- `src/components/` — React components organized by feature (21 directories)
- `src/context/` — React Context providers (12 contexts)
- `src/hooks/` — Custom React hooks (8 hooks)
- `src/lib/` — Core logic and utilities (57 modules)
- `src/pages/` — Lazy-loaded route pages
- `src/types/` — TypeScript type definitions
- `tests/` — Test files (lib/, v2/, e2e/, components)

See `docs/ARCHITECTURE.md` for the full architecture overview.

## Pull Request Process

1. Create a feature branch from the main branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes and ensure all tests pass:
   ```bash
   npx vitest run
   npx eslint src/
   ```

3. Write tests for new functionality. Place unit tests in `tests/lib/` and integration tests in `tests/v2/`.

4. Keep commits focused and descriptive.

5. Open a pull request with:
   - A clear title describing the change
   - Description of what was changed and why
   - Any relevant test output or screenshots

6. Address review feedback promptly.

## Additional Resources

- [Architecture Guide](./ARCHITECTURE.md) — System design, contexts, data flow
- [API Reference](./API.md) — Endpoint documentation
