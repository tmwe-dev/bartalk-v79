/**
 * @module agentFreedom
 * Agent freedom level system controlling how strictly agents follow prompts.
 * Supports four levels: strict, balanced, creative, and autonomous.
 * Each level adjusts temperature, word range, and behavioral instructions.
 */

export type FreedomLevel = 'strict' | 'balanced' | 'creative' | 'autonomous';

export interface AgentFreedomConfig {
  agentId: string;
  level: FreedomLevel;
  customInstructions?: string; // istruzioni aggiuntive per questo agente
}

// ── Freedom level descriptions (per UI) ─────────────────────────────

export const FREEDOM_LEVELS: Record<FreedomLevel, {
  label: string;
  description: string;
  emoji: string;
  tempModifier: number; // moltiplicatore temperatura
  wordRangeModifier: [number, number]; // aggiustamento word range
}> = {
  strict: {
    label: 'Rigoroso',
    description: 'Segue rigidamente le istruzioni. Risposte precise e concise.',
    emoji: '🎯',
    tempModifier: 0.7,
    wordRangeModifier: [0.8, 0.8],
  },
  balanced: {
    label: 'Bilanciato',
    description: 'Equilibrio tra istruzioni e creatività. Default consigliato.',
    emoji: '⚖️',
    tempModifier: 1.0,
    wordRangeModifier: [1.0, 1.0],
  },
  creative: {
    label: 'Creativo',
    description: 'Alta libertà espressiva. Può reinterpretare ed espandere.',
    emoji: '🎨',
    tempModifier: 1.2,
    wordRangeModifier: [1.0, 1.3],
  },
  autonomous: {
    label: 'Autonomo',
    description: 'Massima libertà. Può andare oltre le istruzioni base.',
    emoji: '🚀',
    tempModifier: 1.4,
    wordRangeModifier: [0.8, 1.5],
  },
};

// ── Storage ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'bartalk_agent_freedom';

/**
 * Loads freedom configs from storage.
 * @returns AgentFreedomConfig[]
 */
export function loadFreedomConfigs(): AgentFreedomConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

/**
 * Saves freedom configs to storage.
 * @param configs - The configs parameter
 */
export function saveFreedomConfigs(configs: AgentFreedomConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

/**
 * Gets agent freedom.
 * @param agentId - The agentId parameter
 * @returns FreedomLevel
 */
export function getAgentFreedom(agentId: string): FreedomLevel {
  const configs = loadFreedomConfigs();
  const config = configs.find(c => c.agentId === agentId);
  return config?.level || 'balanced';
}

/**
 * Sets agent freedom.
 * @param agentId - The agentId parameter
 * @param level - The level parameter
 * @param customInstructions - The customInstructions parameter
 */
export function setAgentFreedom(agentId: string, level: FreedomLevel, customInstructions?: string): void {
  const configs = loadFreedomConfigs();
  const existing = configs.findIndex(c => c.agentId === agentId);
  const newConfig: AgentFreedomConfig = { agentId, level, customInstructions };

  if (existing >= 0) {
    configs[existing] = newConfig;
  } else {
    configs.push(newConfig);
  }

  saveFreedomConfigs(configs);

  // Push to DB in background (non-blocking)
  import('./dbSync').then(m => m.pushFreedomConfigs()).catch(() => {});
}

// ── Prompt injection per freedom level ──────────────────────────────

/**
 * Gets freedom prompt addition.
 * @param level - The level parameter
 * @returns string
 */
export function getFreedomPromptAddition(level: FreedomLevel): string {
  switch (level) {
    case 'strict':
      return '\n\n[MODALITÀ RIGOROSA] Segui le istruzioni alla lettera. Non aggiungere informazioni non richieste. Rispondi in modo preciso e conciso.';
    case 'balanced':
      return ''; // nessuna aggiunta per il default
    case 'creative':
      return '\n\n[MODALITÀ CREATIVA] Sei incoraggiato a espandere le risposte con analogie, esempi inaspettati e connessioni creative. Mantieni la sostanza ma esprimi liberamente il tuo stile.';
    case 'autonomous':
      return '\n\n[MODALITÀ AUTONOMA] Hai piena libertà di interpretare e rispondere come ritieni più utile. Puoi proporre angolazioni non richieste, fare domande retoriche, e andare oltre il framework standard. La qualità e utilità della risposta viene prima della conformità alle istruzioni.';
  }
}

/**
 * Applica i modificatori di freedom alla temperatura e word range.
 */
export function applyFreedomModifiers(
  agentId: string,
  temperature: number,
  wordRange: [number, number],
): { temperature: number; wordRange: [number, number] } {
  const level = getAgentFreedom(agentId);
  const config = FREEDOM_LEVELS[level];

  return {
    temperature: Math.min(2, temperature * config.tempModifier),
    wordRange: [
      Math.round(wordRange[0] * config.wordRangeModifier[0]),
      Math.round(wordRange[1] * config.wordRangeModifier[1]),
    ],
  };
}
