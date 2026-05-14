/**
 * @module structuredPrompts
 * Structured prompt composition system.
 * Builds prompts from modular sections with support for task context,
 * agent freedom levels, TTS optimization, and convergence awareness.
 */

export interface SystemPromptTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PersonalitySection {
  id: string;
  agentId: string; // quale agente usa questa personalità
  name: string;
  content: string; // istruzioni personalità
  isActive: boolean;
  createdAt: string;
}

/** ComposedPrompt interface. */
export interface ComposedPrompt {
  id: string;
  name: string;
  systemPromptId: string; // riferimento al SystemPromptTemplate
  personalitySectionIds: string[]; // sezioni personalità incluse
  additionalContext?: string; // contesto aggiuntivo
  createdAt: string;
  updatedAt: string;
}

/** CumulativeSummary interface. */
export interface CumulativeSummary {
  conversationId: string;
  summary: string;
  messageCount: number;
  updatedAt: string;
}

// ── Storage keys ────────────────────────────────────────────────────
const KEYS = {
  systemPrompts: 'bartalk_system_prompts',
  personalities: 'bartalk_personality_sections',
  composedPrompts: 'bartalk_composed_prompts',
  summaries: 'bartalk_cumulative_summaries',
  activeComposed: 'bartalk_active_composed_prompt',
};

// ── Default system prompt ───────────────────────────────────────────
const DEFAULT_SYSTEM_PROMPT: SystemPromptTemplate = {
  id: 'default',
  name: 'BarTalk Standard',
  content: `Sei un agente AI parte del sistema BarTalk, una radio-chat con 4 agenti AI.
Ogni agente ha la propria personalità e prospettiva unica.
Rispondi in modo naturale, coinvolgente e utile.
Quando appropriato, fai riferimento a ciò che hanno detto gli altri agenti.
Mantieni un tono conversazionale da programma radiofonico.`,
  isDefault: true,
  createdAt: new Date().toISOString(),
};

// ── CRUD Operations ─────────────────────────────────────────────────

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// System Prompts
/**
 * Loads system prompts from storage.
 * @returns SystemPromptTemplate[]
 */
export function loadSystemPrompts(): SystemPromptTemplate[] {
  return load(KEYS.systemPrompts, [DEFAULT_SYSTEM_PROMPT]);
}

/**
 * Saves system prompt to storage.
 * @param prompt - The prompt parameter
 */
export function saveSystemPrompt(prompt: SystemPromptTemplate): void {
  const prompts = loadSystemPrompts();
  const idx = prompts.findIndex(p => p.id === prompt.id);
  if (idx >= 0) prompts[idx] = prompt;
  else prompts.push(prompt);
  save(KEYS.systemPrompts, prompts);
  import('./dbSync').then(m => m.pushSystemPrompts()).catch(() => {});
}

// Personality Sections
/**
 * Loads personality sections from storage.
 * @returns PersonalitySection[]
 */
export function loadPersonalitySections(): PersonalitySection[] {
  return load(KEYS.personalities, []);
}

/**
 * Saves personality section to storage.
 * @param section - The section parameter
 */
export function savePersonalitySection(section: PersonalitySection): void {
  const sections = loadPersonalitySections();
  const idx = sections.findIndex(s => s.id === section.id);
  if (idx >= 0) sections[idx] = section;
  else sections.push(section);
  save(KEYS.personalities, sections);
  import('./dbSync').then(m => m.pushPersonalitySections()).catch(() => {});
}

/**
 * Deletes personality section.
 * @param id - The id parameter
 */
export function deletePersonalitySection(id: string): void {
  const sections = loadPersonalitySections().filter(s => s.id !== id);
  save(KEYS.personalities, sections);
  import('./dbSync').then(m => m.pushPersonalitySections()).catch(() => {});
}

// Composed Prompts
/**
 * Loads composed prompts from storage.
 * @returns ComposedPrompt[]
 */
export function loadComposedPrompts(): ComposedPrompt[] {
  return load(KEYS.composedPrompts, []);
}

/**
 * Saves composed prompt to storage.
 * @param prompt - The prompt parameter
 */
export function saveComposedPrompt(prompt: ComposedPrompt): void {
  const prompts = loadComposedPrompts();
  const idx = prompts.findIndex(p => p.id === prompt.id);
  if (idx >= 0) prompts[idx] = { ...prompt, updatedAt: new Date().toISOString() };
  else prompts.push(prompt);
  save(KEYS.composedPrompts, prompts);
  import('./dbSync').then(m => m.pushComposedPrompts()).catch(() => {});
}

// Active composed prompt
/**
 * Gets active composed prompt id.
 * @returns string | null
 */
export function getActiveComposedPromptId(): string | null {
  return localStorage.getItem(KEYS.activeComposed);
}

/**
 * Sets active composed prompt id.
 * @param id - The id parameter
 */
export function setActiveComposedPromptId(id: string | null): void {
  if (id) localStorage.setItem(KEYS.activeComposed, id);
  else localStorage.removeItem(KEYS.activeComposed);
  import('./dbSync').then(m => m.pushComposedPrompts()).catch(() => {});
}

// Cumulative Summaries
/**
 * Loads cumulative summary from storage.
 * @param conversationId - The conversationId parameter
 * @returns CumulativeSummary | null
 */
export function loadCumulativeSummary(conversationId: string): CumulativeSummary | null {
  const summaries: CumulativeSummary[] = load(KEYS.summaries, []);
  return summaries.find(s => s.conversationId === conversationId) || null;
}

/**
 * Saves cumulative summary to storage.
 * @param summary - The summary parameter
 */
export function saveCumulativeSummary(summary: CumulativeSummary): void {
  const summaries: CumulativeSummary[] = load(KEYS.summaries, []);
  const idx = summaries.findIndex(s => s.conversationId === summary.conversationId);
  if (idx >= 0) summaries[idx] = summary;
  else summaries.push(summary);
  // Keep only last 50 summaries
  save(KEYS.summaries, summaries.slice(-50));
}

// ── Compose final prompt ────────────────────────────────────────────

/**
 * Assembla il prompt finale per un agente combinando:
 * 1. System prompt globale
 * 2. Personalità agente
 * 3. Sezioni personalità attive
 * 4. Riassunto cumulativo (se esiste)
 * 5. Contesto aggiuntivo
 */
export function composePromptForAgent(
  agentId: string,
  composedPromptId?: string | null,
  conversationId?: string,
): string {
  const parts: string[] = [];

  // 1. System prompt
  const prompts = loadSystemPrompts();
  let systemPrompt = prompts.find(p => p.isDefault) || DEFAULT_SYSTEM_PROMPT;

  if (composedPromptId) {
    const composed = loadComposedPrompts().find(c => c.id === composedPromptId);
    if (composed) {
      const customSystem = prompts.find(p => p.id === composed.systemPromptId);
      if (customSystem) systemPrompt = customSystem;

      // Personality sections from composed
      const allSections = loadPersonalitySections();
      const activeSections = composed.personalitySectionIds
        .map(id => allSections.find(s => s.id === id))
        .filter(Boolean) as PersonalitySection[];

      if (activeSections.length > 0) {
        parts.push(activeSections.map(s => s.content).join('\n\n'));
      }

      if (composed.additionalContext) {
        parts.push(composed.additionalContext);
      }
    }
  }

  parts.unshift(systemPrompt.content);

  // Agent-specific personality sections
  const agentSections = loadPersonalitySections()
    .filter(s => s.agentId === agentId && s.isActive);
  if (agentSections.length > 0) {
    parts.push(agentSections.map(s => s.content).join('\n'));
  }

  // Cumulative summary
  if (conversationId) {
    const summary = loadCumulativeSummary(conversationId);
    if (summary) {
      parts.push(`\n[Contesto conversazione precedente]\n${summary.summary}`);
    }
  }

  return parts.join('\n\n');
}
