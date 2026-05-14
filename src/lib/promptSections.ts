/**
 * @module promptSections
 * Modular prompt section system.
 * Manages reusable, composable prompt sections that can be enabled/disabled
 * and combined to build complex system prompts.
 */

export type PromptSectionType = 'rules' | 'topic' | 'context';

export interface PromptSection {
  id: string;
  type: PromptSectionType;
  title: string;
  content: string;
  /** Tag argomento — se type=topic, la sezione è attiva solo quando l'input matcha un tag */
  tags: string[];
  /** Priorità (1 = alta, 10 = bassa). Determina ordine nel prompt */
  priority: number;
  enabled: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'bartalk_prompt_sections';

// ── Storage ──────────────────────────────────────────────────────────

export function loadPromptSections(): PromptSection[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

/**
 * Saves prompt sections to storage.
 * @param sections - The sections parameter
 */
export function savePromptSections(sections: PromptSection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
}

/**
 * Adds prompt section.
 * @param section - The section parameter
 */
export function addPromptSection(section: PromptSection): void {
  const sections = loadPromptSections();
  sections.push(section);
  savePromptSections(sections);
}

/**
 * Updates prompt section.
 * @param id - The id parameter
 * @param updates - The updates parameter
 */
export function updatePromptSection(id: string, updates: Partial<PromptSection>): void {
  const sections = loadPromptSections();
  const idx = sections.findIndex(s => s.id === id);
  if (idx >= 0) {
    sections[idx] = { ...sections[idx], ...updates };
    savePromptSections(sections);
  }
}

/**
 * Deletes prompt section.
 * @param id - The id parameter
 */
export function deletePromptSection(id: string): void {
  const sections = loadPromptSections().filter(s => s.id !== id);
  savePromptSections(sections);
}

// ── Resolver: data un messaggio utente, restituisci le sezioni attive ─

/**
 * Resolves active sections.
 * @param userMessage - The userMessage parameter
 * @returns PromptSection[]
 */
export function resolveActiveSections(userMessage: string): PromptSection[] {
  const sections = loadPromptSections().filter(s => s.enabled);
  const lowerMsg = userMessage.toLowerCase();

  const active = sections.filter(s => {
    // RULES e CONTEXT: sempre attive
    if (s.type === 'rules' || s.type === 'context') return true;
    // TOPIC: attiva solo se almeno un tag matcha
    if (s.type === 'topic' && s.tags.length > 0) {
      return s.tags.some(tag => lowerMsg.includes(tag.toLowerCase()));
    }
    return false;
  });

  // Ordina per priorità (1 = prima)
  return active.sort((a, b) => a.priority - b.priority);
}

// ── Formatta sezioni attive per iniezione nel system prompt ──────────

/**
 * Builds sections block.
 * @param userMessage - The userMessage parameter
 * @returns string
 */
export function buildSectionsBlock(userMessage: string): string {
  const active = resolveActiveSections(userMessage);
  if (active.length === 0) return '';

  const parts: string[] = ['\n--- REGOLE PERSONALIZZATE ---'];
  for (const s of active) {
    const typeLabel = s.type === 'rules' ? '📋' : s.type === 'topic' ? '🏷️' : '📖';
    parts.push(`${typeLabel} ${s.title}:`);
    parts.push(s.content);
    parts.push('');
  }
  parts.push('--- FINE REGOLE ---');
  return parts.join('\n');
}

// ── Sezioni di esempio (per primo avvio) ─────────────────────────────

/** EXAMPLE_SECTIONS constant. */
export const EXAMPLE_SECTIONS: Omit<PromptSection, 'id' | 'createdAt'>[] = [
  {
    type: 'rules',
    title: 'Formato risposte',
    content: 'Usa sempre elenchi puntati per i punti chiave. Chiudi ogni risposta con una domanda provocatoria.',
    tags: [],
    priority: 1,
    enabled: false,
  },
  {
    type: 'topic',
    title: 'Economia e Finanza',
    content: 'Quando si parla di economia: cita dati recenti, distingui tra correlazione e causalità, considera sia prospettiva macro che micro.',
    tags: ['economia', 'finanza', 'mercato', 'inflazione', 'pil', 'economy', 'finance'],
    priority: 3,
    enabled: false,
  },
  {
    type: 'context',
    title: 'Background progetto',
    content: 'Questo è un progetto di ricerca accademica. Mantieni un registro formale e cita fonti quando possibile.',
    tags: [],
    priority: 2,
    enabled: false,
  },
];
