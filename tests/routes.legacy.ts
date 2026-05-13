/**
 * BarTalk v8.2 — Route Definition Tests
 * Verifica che tutte le rotte siano definite e i componenti esistano.
 * Eseguire con: npx tsx tests/routes.test.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname || __dirname, '..');

// ── Expected routes and their page components ───────────────────────
const ROUTES: Record<string, string> = {
  '/':               'src/pages/WelcomePage.tsx',
  '/welcome':        'src/pages/WelcomePage.tsx',
  '/login':          'src/pages/LoginPage.tsx',
  '/auth/callback':  'src/pages/AuthCallback.tsx',
  '/radio-chat':     'src/App.tsx',            // main app, always exists
  '/settings':       'src/pages/SettingsPage.tsx',
  '/radio-debug':    'src/pages/DebugPage.tsx',
};

// ── Expected API endpoints ──────────────────────────────────────────
const API_FILES: string[] = [
  'api/health.js',
  'api/ai-proxy.js',
  'api/keys.js',
  'api/user-profile.js',
  'api/billing.js',
  'api/conversations.js',
  'api/agent-config.js',
  'api/stripe-webhook.js',
  'api/parse-file.js',
  'api/ai-preprocess-file.js',
];

// ── Test runner ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}: ${err instanceof Error ? err.message : err}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ── Route tests ─────────────────────────────────────────────────────
console.log('\n📍 Route Component Tests');
console.log('─'.repeat(50));

for (const [route, file] of Object.entries(ROUTES)) {
  test(`Route ${route} → ${file} esiste`, () => {
    const fullPath = resolve(ROOT, file);
    assert(existsSync(fullPath), `File non trovato: ${file}`);
  });
}

// ── Router config test ──────────────────────────────────────────────
console.log('\n🔀 Router Configuration');
console.log('─'.repeat(50));

test('router.tsx esiste', () => {
  assert(existsSync(resolve(ROOT, 'src/router.tsx')), 'src/router.tsx non trovato');
});

test('router.tsx importa tutte le pagine', () => {
  const content = readFileSync(resolve(ROOT, 'src/router.tsx'), 'utf-8');
  assert(content.includes('WelcomePage'), 'Manca import WelcomePage');
  assert(content.includes('LoginPage'), 'Manca import LoginPage');
  assert(content.includes('AuthCallback'), 'Manca import AuthCallback');
  assert(content.includes('SettingsPage'), 'Manca import SettingsPage');
  assert(content.includes('DebugPage'), 'Manca import DebugPage');
});

test('router.tsx usa lazy loading', () => {
  const content = readFileSync(resolve(ROOT, 'src/router.tsx'), 'utf-8');
  assert(content.includes('lazy('), 'Manca lazy() per code splitting');
  assert(content.includes('Suspense'), 'Manca Suspense wrapper');
});

// ── API endpoint tests ──────────────────────────────────────────────
console.log('\n🔌 API Endpoint Tests');
console.log('─'.repeat(50));

for (const file of API_FILES) {
  test(`API ${file} esiste`, () => {
    const fullPath = resolve(ROOT, file);
    assert(existsSync(fullPath), `File non trovato: ${file}`);
  });
}

test('Tutti gli endpoint API esportano handler default', () => {
  for (const file of API_FILES) {
    const content = readFileSync(resolve(ROOT, file), 'utf-8');
    assert(
      content.includes('export default') || content.includes('module.exports'),
      `${file} non esporta handler`,
    );
  }
});

test('API CORS headers presenti sugli endpoint protetti', () => {
  const protectedApis = ['user-profile.js', 'billing.js', 'conversations.js', 'agent-config.js'];
  for (const api of protectedApis) {
    const content = readFileSync(resolve(ROOT, `api/${api}`), 'utf-8');
    assert(content.includes('Access-Control-Allow-Origin'), `${api} manca CORS header`);
    assert(content.includes('OPTIONS'), `${api} non gestisce preflight OPTIONS`);
  }
});

test('API protetti verificano autenticazione', () => {
  const authApis = ['user-profile.js', 'conversations.js', 'agent-config.js'];
  for (const api of authApis) {
    const content = readFileSync(resolve(ROOT, `api/${api}`), 'utf-8');
    assert(content.includes('getUserFromToken') || content.includes('401'), `${api} non verifica auth`);
  }
});

// ── Lib integration tests ───────────────────────────────────────────
console.log('\n📚 Library Integration Tests');
console.log('─'.repeat(50));

test('agentFreedom.ts esporta tutti i tipi/funzioni necessari', () => {
  const content = readFileSync(resolve(ROOT, 'src/lib/agentFreedom.ts'), 'utf-8');
  assert(content.includes('export type FreedomLevel'), 'Manca export FreedomLevel');
  assert(content.includes('export function getAgentFreedom'), 'Manca export getAgentFreedom');
  assert(content.includes('export function setAgentFreedom'), 'Manca export setAgentFreedom');
  assert(content.includes('export function applyFreedomModifiers'), 'Manca export applyFreedomModifiers');
  assert(content.includes('export function getFreedomPromptAddition'), 'Manca export getFreedomPromptAddition');
});

test('structuredPrompts.ts esporta le operazioni CRUD', () => {
  const content = readFileSync(resolve(ROOT, 'src/lib/structuredPrompts.ts'), 'utf-8');
  assert(content.includes('export function loadSystemPrompts'), 'Manca loadSystemPrompts');
  assert(content.includes('export function saveSystemPrompt'), 'Manca saveSystemPrompt');
  assert(content.includes('export function composePromptForAgent'), 'Manca composePromptForAgent');
});

test('dbSync.ts esporta pull/push functions', () => {
  const content = readFileSync(resolve(ROOT, 'src/lib/dbSync.ts'), 'utf-8');
  assert(content.includes('export async function pullAllFromDB'), 'Manca pullAllFromDB');
  assert(content.includes('export async function pushAllToDB'), 'Manca pushAllToDB');
  assert(content.includes('export async function pullFreedomConfigs'), 'Manca pullFreedomConfigs');
  assert(content.includes('export async function pushFreedomConfigs'), 'Manca pushFreedomConfigs');
});

test('agentFreedom.ts ha push DB integrato in setAgentFreedom', () => {
  const content = readFileSync(resolve(ROOT, 'src/lib/agentFreedom.ts'), 'utf-8');
  assert(content.includes("import('./dbSync')"), 'setAgentFreedom non fa push a DB');
});

test('structuredPrompts.ts ha push DB integrato nei save', () => {
  const content = readFileSync(resolve(ROOT, 'src/lib/structuredPrompts.ts'), 'utf-8');
  const pushCount = (content.match(/import\('\.\/dbSync'\)/g) || []).length;
  assert(pushCount >= 4, `Solo ${pushCount} push DB nei save, attesi almeno 4`);
});

test('AuthContext.tsx chiama pullAllFromDB al login', () => {
  const content = readFileSync(resolve(ROOT, 'src/context/AuthContext.tsx'), 'utf-8');
  assert(content.includes('pullAllFromDB'), 'AuthContext non chiama pullAllFromDB');
});

// ── Supabase schema verification ────────────────────────────────────
console.log('\n🗄️ Schema Verification');
console.log('─'.repeat(50));

test('Schema SQL definisce tutte le 14 tabelle', () => {
  const sql = readFileSync(resolve(ROOT, 'supabase/migrations/20260511_v82_full_schema.sql'), 'utf-8');
  const tables = [
    'user_profiles', 'billing_plans', 'stripe_subscriptions', 'config_ai',
    'user_api_keys', 'user_agent_configs', 'user_elevenlabs_config', 'elevenlabs_agents',
    'chat_laboratory_system_prompts', 'chat_laboratory_prompt_sections',
    'chat_laboratory_composed_prompts', 'chat_laboratory_conversations',
    'chat_laboratory_messages', 'chat_laboratory_bar_mode',
  ];
  for (const t of tables) {
    assert(sql.includes(`CREATE TABLE IF NOT EXISTS ${t}`), `Tabella mancante: ${t}`);
  }
});

test('RLS abilitato su tutte le tabelle utente', () => {
  const sql = readFileSync(resolve(ROOT, 'supabase/migrations/20260511_v82_full_schema.sql'), 'utf-8');
  const rlsTables = [
    'user_profiles', 'stripe_subscriptions', 'user_api_keys', 'user_agent_configs',
    'user_elevenlabs_config', 'elevenlabs_agents', 'chat_laboratory_system_prompts',
    'chat_laboratory_prompt_sections', 'chat_laboratory_composed_prompts',
    'chat_laboratory_conversations', 'chat_laboratory_messages', 'chat_laboratory_bar_mode',
  ];
  for (const t of rlsTables) {
    assert(sql.includes(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`), `RLS mancante: ${t}`);
  }
});

// ── CSS files ───────────────────────────────────────────────────────
console.log('\n🎨 CSS Files');
console.log('─'.repeat(50));

const CSS_FILES = [
  'src/pages/WelcomePage.css',
  'src/pages/SettingsPage.css',
  'src/pages/DebugPage.css',
  'src/components/Chat/FileUpload.css',
];

for (const file of CSS_FILES) {
  test(`CSS ${file} esiste`, () => {
    assert(existsSync(resolve(ROOT, file)), `File non trovato: ${file}`);
  });
}

// ── parse-file.js specific ──────────────────────────────────────────
console.log('\n📄 File Parse API Tests');
console.log('─'.repeat(50));

test('parse-file.js gestisce PDF, DOCX, XLSX', () => {
  const content = readFileSync(resolve(ROOT, 'api/parse-file.js'), 'utf-8');
  assert(content.includes("case 'pdf'"), 'Manca handler PDF');
  assert(content.includes("case 'docx'"), 'Manca handler DOCX');
  assert(content.includes("case 'xlsx'"), 'Manca handler XLSX');
});

test('parse-file.js usa pdf-parse, mammoth, xlsx', () => {
  const content = readFileSync(resolve(ROOT, 'api/parse-file.js'), 'utf-8');
  assert(content.includes('pdf-parse'), 'Manca import pdf-parse');
  assert(content.includes('mammoth'), 'Manca import mammoth');
  assert(content.includes('xlsx'), 'Manca import xlsx');
});

test('parse-file.js ha body size limit configurato', () => {
  const content = readFileSync(resolve(ROOT, 'api/parse-file.js'), 'utf-8');
  assert(content.includes('sizeLimit'), 'Manca bodyParser sizeLimit');
});

// ── FileUpload.tsx uses server-side parsing ──────────────────────────
test('FileUpload.tsx chiama /api/parse-file per PDF/DOCX/XLSX', () => {
  const content = readFileSync(resolve(ROOT, 'src/components/Chat/FileUpload.tsx'), 'utf-8');
  assert(content.includes('parseServerSide'), 'Manca parseServerSide function');
  assert(content.includes('/api/parse-file'), 'Manca chiamata a /api/parse-file');
});

// ── Summary ─────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log(`\n🏁 Risultati: ${passed} passati, ${failed} falliti (totale: ${passed + failed})`);

if (failed > 0) {
  console.log('\n⚠️ Alcuni test sono falliti!');
  process.exit(1);
} else {
  console.log('\n✅ Tutti i test passati!');
  process.exit(0);
}
