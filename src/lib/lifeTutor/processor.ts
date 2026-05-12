/**
 * Life Tutor — KB Processor (Pre-Routing Engine)
 *
 * Analizza il messaggio dello studente + contesto PRIMA della generazione AI.
 * Determina quali KB sono rilevanti e produce un "context injection" leggero e mirato.
 *
 * Flusso:
 *   messaggio studente → PROCESSOR → seleziona KB pertinenti → inietta solo quelle nel prompt
 *
 * Il processore è VELOCE: lavora in locale (nessuna chiamata AI), usa pattern matching,
 * tag detection, e scoring per decidere cosa caricare.
 */

import type { KBType } from '../../types/lifeTutor';
import { getKBByType, loadKBEntries } from './kb';

// ══════════════════════════════════════════════════════════════════════
// ── Detection Patterns ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

interface DetectionRule {
  kbType: KBType;
  /** Regex patterns that trigger this KB */
  patterns: RegExp[];
  /** Context tags that trigger this KB */
  contextTags: string[];
  /** Base relevance score (0-10) when triggered */
  baseScore: number;
  /** Extra score per pattern match */
  matchBonus: number;
}

const DETECTION_RULES: DetectionRule[] = [
  // ── IPA / Phonetic symbols ───────────────────────────────────────
  {
    kbType: 'acronym_nomenclature',
    patterns: [
      /\/[ˈˌ]?[a-zɑæɒɔəɛɜɪʊʌðθʃʒŋɾʔ]+\//i,  // IPA transcriptions /ˈbʌtə/
      /\[[ˈˌ]?[a-zɑæɒɔəɛɜɪʊʌðθʃʒŋɾʔ]+\]/i,   // Phonetic brackets [bʌtə]
      /IPA|fonetica|fonetico|trascrizione|phonetic/i,
      /pronuncia|pronunciation|si pronuncia|come si dice/i,
      /britannico|americano|british|american.*english/i,
    ],
    contextTags: ['pronuncia', 'fonetica', 'ipa', 'lingua'],
    baseScore: 8,
    matchBonus: 2,
  },

  // ── Acronyms / Codes / Sigils ────────────────────────────────────
  {
    kbType: 'acronym_nomenclature',
    patterns: [
      /\b[A-Z]{2,8}\b/,                         // Uppercase acronyms: BVRAR, HDMI, USB
      /\b[A-Z0-9]{3,}\b/,                       // Alphanumeric codes: ABC123, XJ45
      /sigla|acronimo|abbreviazione|codice/i,
      /IBAN|codice fiscale|CAP|targa|partita IVA/i,
    ],
    contextTags: ['acronimi', 'sigle', 'codici'],
    baseScore: 6,
    matchBonus: 1,
  },

  // ── Numbers / Dates / Measurements ───────────────────────────────
  {
    kbType: 'number_reading',
    patterns: [
      /\d{3,}/,                                  // Numbers with 3+ digits
      /\d+[.,]\d+/,                              // Decimals
      /\d+%/,                                    // Percentages
      /\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/,   // Dates
      /\d{1,2}:\d{2}/,                           // Times
      /€|\$|£|¥/,                                // Currency symbols
      /\d+\s*(km|m|cm|mm|kg|g|mg|l|ml|°C|°F)/i, // Measurements
    ],
    contextTags: ['numeri', 'date', 'misure', 'valute'],
    baseScore: 5,
    matchBonus: 1,
  },

  // ── Emotional content ────────────────────────────────────────────
  {
    kbType: 'emotional_scenarios',
    patterns: [
      /frustrat|arrabbiat|incazzat|nervos/i,
      /triste|depress|giù di morale|scoraggiat/i,
      /ansios|preoccupat|stress|agitat/i,
      /content|felice|soddisfatt|entusiast/i,
      /annoiat|stufo|stanco|non mi interessa/i,
      /non capisco|non ce la faccio|mi arrendo/i,
      /problemi? personal[ie]|problema serio|momento difficile/i,
    ],
    contextTags: ['emozioni', 'supporto', 'emotivo'],
    baseScore: 7,
    matchBonus: 2,
  },

  // ── Tone adjustment ──────────────────────────────────────────────
  {
    kbType: 'tone_management',
    patterns: [
      /parla.*formale|parla.*informale|cambia tono/i,
      /sei troppo.*formale|più amichevole|meno serio/i,
      /sii.*diretto|sii.*gentile|troppo tecnico/i,
    ],
    contextTags: ['tono', 'comunicazione'],
    baseScore: 6,
    matchBonus: 2,
  },

  // ── Language management ──────────────────────────────────────────
  {
    kbType: 'language_management',
    patterns: [
      /in (inglese|english|francese|french|tedesco|german|spagnolo|spanish)/i,
      /traduc[io]|translation|come si dice in/i,
      /lingua.*straniera|foreign.*language|seconda lingua/i,
      /\[L2:|dual.*voice/i,
    ],
    contextTags: ['lingue', 'multilingua', 'traduzione'],
    baseScore: 7,
    matchBonus: 1,
  },

  // ── Voice / TTS specific ─────────────────────────────────────────
  {
    kbType: 'voice_control',
    patterns: [
      /voce|voice|tts|text.to.speech|sintesi vocale/i,
      /parl[ao] troppo (veloce|lento|piano|forte)/i,
      /ritmo|pacing|intonazione/i,
      /leggi|read.*aloud|pronuncia/i,
    ],
    contextTags: ['voce', 'tts', 'ritmo'],
    baseScore: 5,
    matchBonus: 1,
  },

  // ── Learning protocols ───────────────────────────────────────────
  {
    kbType: 'learning_protocols',
    patterns: [
      /metodo.*studio|study.*method|tecnica.*apprendimento/i,
      /spaced.*repetition|ripetizione.*spaziata/i,
      /socratic|maieutic|scaffolding/i,
      /come.*studio|come.*imparo|non riesco.*imparare/i,
      /quiz|test|eserciz|exercise|verifica/i,
    ],
    contextTags: ['didattica', 'apprendimento', 'protocolli'],
    baseScore: 4,
    matchBonus: 1,
  },
];

// ══════════════════════════════════════════════════════════════════════
// ── Processing Result ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export interface ProcessorResult {
  /** KB types that should be injected, sorted by relevance (highest first) */
  selectedKBs: KBType[];
  /** Relevance scores for each selected KB */
  scores: Record<string, number>;
  /** Detected content flags */
  flags: {
    hasIPA: boolean;
    hasCodes: boolean;
    hasNumbers: boolean;
    hasEmotionalContent: boolean;
    isMinimalInput: boolean;
    isConfirmation: boolean;
    isQuestion: boolean;
  };
  /** Max KB entries to inject (based on message complexity) */
  maxKBEntries: number;
  /** Built prompt injection string (ready to append to system prompt) */
  kbInjection: string;
}

// ══════════════════════════════════════════════════════════════════════
// ── Main Processor Function ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

/** Processing context: determines threshold calibration */
export type ProcessorContext = 'maestro' | 'agent' | 'freechat';

/**
 * Options for processMessageForKB function
 */
export interface ProcessMessageForKBOptions {
  contextTags?: string[];
  conversationHistory?: string[];
  courseCategory?: string;
  context?: ProcessorContext;
}

/**
 * Analyze student message + context and determine which KBs to load.
 *
 * @param studentMessage - The current student message (kept as first param)
 * @param options - Optional parameters grouped in options object
 */
export function processMessageForKB(
  studentMessage: string,
  options?: ProcessMessageForKBOptions,
): ProcessorResult {
  const {
    contextTags = [],
    conversationHistory = [],
    courseCategory,
    context = 'maestro',
  } = options || {};
  const scores: Record<string, number> = {};
  const fullContext = [studentMessage, ...conversationHistory.slice(-3)].join(' ');

  // ── Step 1: Detect flags ───────────────────────────────────────
  const flags = {
    hasIPA: /\/[ˈˌ]?[a-zɑæɒɔəɛɜɪʊʌðθʃʒŋɾʔ]+\//i.test(fullContext) ||
            /\[[ˈˌ]?[a-zɑæɒɔəɛɜɪʊʌðθʃʒŋɾʔ]+\]/i.test(fullContext),
    hasCodes: /\b[A-Z]{3,8}\b/.test(studentMessage) ||
              /\b[A-Z0-9]{4,}\b/.test(studentMessage),
    hasNumbers: /\d{2,}/.test(studentMessage),
    hasEmotionalContent: /frustrat|triste|ansios|content|annoiat|nervos|preoccupat|non capisco|non ce la faccio/i.test(studentMessage),
    isMinimalInput: studentMessage.trim().length <= 15,
    isConfirmation: /^(ok|sì|si|va bene|capito|prosegui|avanti|continua|perfetto|chiaro|ho capito|vai)[.!]?$/i.test(studentMessage.trim()),
    isQuestion: /\?$/.test(studentMessage.trim()) || /^(come|cosa|perché|quando|dove|chi|quale|quanto)/i.test(studentMessage.trim()),
  };

  // ── Step 2: If minimal/confirmation, skip heavy KB loading ─────
  if (flags.isConfirmation || (flags.isMinimalInput && !flags.hasEmotionalContent)) {
    return {
      selectedKBs: [],
      scores: {},
      flags,
      maxKBEntries: 0,
      kbInjection: '', // Prompt stays LIGHT
    };
  }

  // ── Step 3: Score each KB via detection rules ──────────────────
  for (const rule of DETECTION_RULES) {
    let score = 0;

    // Pattern matching on message
    for (const pattern of rule.patterns) {
      if (pattern.test(studentMessage)) {
        score += rule.matchBonus;
      }
      // Also check recent history (lower weight)
      if (pattern.test(fullContext) && !pattern.test(studentMessage)) {
        score += rule.matchBonus * 0.3;
      }
    }

    // Context tag matching
    for (const tag of rule.contextTags) {
      if (contextTags.includes(tag)) {
        score += 1;
      }
    }

    // If any match, add base score
    if (score > 0) {
      score += rule.baseScore;
    }

    // Accumulate (same kbType can be triggered by multiple rules)
    if (score > 0) {
      scores[rule.kbType] = (scores[rule.kbType] || 0) + score;
    }
  }

  // ── Step 4: Personality is ALWAYS included (lightweight) ───────
  // We don't add it to scores — it's injected separately as identity

  // ── Step 5: Select top KBs by score ────────────────────────────
  // Agent context has higher threshold (messages are more generic → less KB noise)
  const threshold = context === 'agent' ? 7 : 5;
  const maxKBEntries = flags.isQuestion ? 3 : (context === 'agent' ? 2 : 2);

  const selectedKBs = Object.entries(scores)
    .filter(([, s]) => s >= threshold)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKBEntries)
    .map(([type]) => type as KBType);

  // ── Step 6: Build KB injection string ──────────────────────────
  const kbInjection = buildKBInjection(selectedKBs, flags, courseCategory);

  return {
    selectedKBs,
    scores,
    flags,
    maxKBEntries,
    kbInjection,
  };
}

// ══════════════════════════════════════════════════════════════════════
// ── KB Injection Builder ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

/**
 * Build the prompt injection string from selected KBs.
 * Only includes the RELEVANT rules, not the entire KB.
 */
function buildKBInjection(
  selectedKBs: KBType[],
  flags: ProcessorResult['flags'],
  _courseCategory?: string,
): string {
  if (selectedKBs.length === 0) return '';

  const parts: string[] = [];
  parts.push('\n--- ISTRUZIONI CONTESTUALI (da KB) ---');

  for (const kbType of selectedKBs) {
    const entries = getKBByType(kbType);
    if (entries.length === 0) continue;

    for (const entry of entries) {
      const content = entry.content as Record<string, unknown>;

      // Extract rules (common to most KBs)
      const rules = content.rules as string[] | undefined;
      if (rules && Array.isArray(rules)) {
        // Filter rules based on flags for even more precision
        const relevantRules = filterRulesByRelevance(rules, kbType, flags);
        if (relevantRules.length > 0) {
          parts.push(`\n[${entry.title}]`);
          for (const rule of relevantRules) {
            parts.push(`• ${rule}`);
          }
        }
      }

      // IPA-specific rules
      if (flags.hasIPA && kbType === 'acronym_nomenclature') {
        const ipaRules = content.ipaAndPhoneticRules as string[] | undefined;
        if (ipaRules && Array.isArray(ipaRules)) {
          parts.push('\n[Regole Lettura IPA/Fonetica]');
          for (const rule of ipaRules) {
            parts.push(`• ${rule}`);
          }
        }
      }

      // Emotional scenarios — only include the relevant ones
      if (kbType === 'emotional_scenarios') {
        const scenarios = content.scenarios as Array<Record<string, unknown>> | undefined;
        if (scenarios) {
          parts.push('\n[Scenari Emotivi Rilevanti]');
          // Only include 2-3 most relevant scenarios
          for (const sc of scenarios.slice(0, 3)) {
            parts.push(`• Se ${sc.trigger}: ${sc.tone}. Evita: "${((sc.avoid as string[]) || [])[0] || ''}"}`);
          }
        }
      }

      // Tone adaptation states
      if (kbType === 'tone_management') {
        const adaptation = content.toneAdaptation as Record<string, Record<string, string>> | undefined;
        if (adaptation) {
          parts.push('\n[Adattamento Tono per Stato Emotivo]');
          // Include only a subset
          const keys = Object.keys(adaptation).slice(0, 4);
          for (const key of keys) {
            const v = adaptation[key];
            parts.push(`• ${key}: tono ${v.tone}, ritmo ${v.pacing}, frasi ${v.sentences}`);
          }
        }
      }

      // Learning protocols
      if (kbType === 'learning_protocols') {
        const protocols = content.protocols as Array<Record<string, unknown>> | undefined;
        if (protocols) {
          parts.push('\n[Protocolli Didattici Disponibili]');
          for (const proto of protocols) {
            parts.push(`• ${proto.name}: ${proto.description}. Quando: ${proto.when}`);
          }
        }
      }

      // Voice control — rhythm patterns
      if (kbType === 'voice_control') {
        const rhythms = content.rhythmPatterns as string[] | undefined;
        if (rhythms) {
          parts.push('\n[Pattern Ritmici Voce]');
          for (const r of rhythms.slice(0, 2)) {
            parts.push(`• ${r}`);
          }
        }
      }
    }
  }

  return parts.length > 1 ? parts.join('\n') : '';
}

/**
 * Filter KB rules to only include the ones relevant to current flags.
 * This prevents loading ALL rules when only a subset applies.
 */
function filterRulesByRelevance(
  rules: string[],
  kbType: KBType,
  flags: ProcessorResult['flags'],
): string[] {
  // For acronym KB, filter by what's actually in the message
  if (kbType === 'acronym_nomenclature') {
    return rules.filter(rule => {
      // Always include general rules (first 7)
      const ruleLC = rule.toLowerCase();
      if (flags.hasIPA && (ruleLC.includes('ipa') || ruleLC.includes('fonetico') || ruleLC.includes('pronuncia'))) return true;
      if (flags.hasCodes && (ruleLC.includes('codic') || ruleLC.includes('sigla') || ruleLC.includes('lettera per lettera') || ruleLC.includes('targ'))) return true;
      // Always include the first 3 general rules about acronyms
      if (rules.indexOf(rule) < 3) return true;
      return false;
    });
  }

  // For number KB, filter based on what numbers are present
  if (kbType === 'number_reading') {
    return rules.filter(rule => {
      const ruleLC = rule.toLowerCase();
      if (flags.hasCodes && (ruleLC.includes('codic') || ruleLC.includes('cifra per cifra'))) return true;
      if (flags.hasNumbers) return true;
      if (rules.indexOf(rule) < 3) return true; // Always include basics
      return false;
    });
  }

  // For other KBs, include all rules (they're usually short)
  return rules;
}

// ══════════════════════════════════════════════════════════════════════
// ── Identity Injection (always lightweight) ──────────────────────────
// ══════════════════════════════════════════════════════════════════════

/**
 * Build the identity/personality section — ALWAYS included but COMPACT.
 * This replaces the heavy buildFullKBContext() in the prompt.
 */
export function buildIdentityInjection(): string {
  const personalityEntries = getKBByType('personality_traits');
  if (personalityEntries.length === 0) return '';

  const content = personalityEntries[0].content as Record<string, unknown>;
  const identity = content.identity as Record<string, string> | undefined;
  const antiPatterns = content.antiPatterns as string[] | undefined;

  const parts: string[] = [];
  parts.push('\n═══ IDENTITÀ ═══');

  if (identity) {
    parts.push(identity.core);
    parts.push(`Voce: ${identity.voice}`);
  }

  // Anti-patterns are always critical — include them
  if (antiPatterns) {
    parts.push('\nCOMPORTAMENTI VIETATI:');
    for (const ap of antiPatterns) {
      parts.push(`• ${ap}`);
    }
  }

  return parts.join('\n');
}

// ══════════════════════════════════════════════════════════════════════
// ── Utility: Get all KB types with entry counts ──────────────────────
// ══════════════════════════════════════════════════════════════════════

export function getKBInventory(): { type: KBType; count: number; system: number; user: number }[] {
  const all = loadKBEntries();
  const types = new Set(all.map(e => e.kbType));

  return Array.from(types).map(type => {
    const entries = all.filter(e => e.kbType === type);
    return {
      type,
      count: entries.length,
      system: entries.filter(e => e.isSystem).length,
      user: entries.filter(e => !e.isSystem).length,
    };
  });
}
