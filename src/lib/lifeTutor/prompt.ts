/**
 * Life Tutor — Prompt Builder Module
 * Costruisce il system prompt completo del Life Tutor combinando:
 * - Identità e personalità (da KB)
 * - Profilo utente
 * - Memoria (recente + rilevante)
 * - Obiettivi attivi
 * - Suggerimenti proattivi
 * - KB per tono, voce, numeri, lingue, scenari emotivi
 */

import type {
  MemoryTag, LifeTutorConfig,
  ConversationLogType,
} from '../../types/lifeTutor';
import { buildMemorySummary } from './memory';
import { loadProfileLocal, buildProfilePromptSection } from './profile';
import { loadLifeTutorConfig } from './config';
import { buildIdentityInjection } from './processor';
import { getPendingSuggestions, buildSuggestionsPromptSection } from './proactivity';

// ── Main Prompt Builder ──────────────────────────────────────────────

/**
 * Costruisce il blocco di system prompt completo per il Life Tutor.
 * Da iniettare nel system prompt del maestro, degli agenti, o della free chat.
 *
 * @param studentName - Nome dello studente
 * @param contextTags - Tag rilevanti al contesto corrente
 * @param conversationType - Tipo di conversazione in corso
 * @param language - Lingua corrente
 */
export function buildLifeTutorPromptAddon(
  studentName: string,
  contextTags: MemoryTag[] = [],
  conversationType: ConversationLogType = 'free_chat',
  _language = 'it',
): string {
  const config = loadLifeTutorConfig();
  if (!config.enabled) return '';

  const parts: string[] = [];

  // ═══ HEADER ═══
  parts.push('\n\n═══════════════════════════════════════');
  parts.push('═══ LIFE TUTOR MODE — CERVELLO ATTIVO ═══');
  parts.push('═══════════════════════════════════════');

  // ═══ IDENTITÀ & PERSONALITÀ (leggera — il dettaglio KB viene dal processore) ═══
  parts.push(buildIdentityInjection());

  // ═══ PROFILO UTENTE ═══
  const profile = loadProfileLocal();
  parts.push(buildProfilePromptSection(profile));

  // ═══ MEMORIA ═══
  const memorySummary = buildMemorySummary(contextTags, config);
  parts.push(memorySummary.promptText);

  // ═══ OBIETTIVI ═══
  parts.push(buildObjectivesPromptSection());

  // ═══ SUGGERIMENTI PROATTIVI ═══
  if (config.proactiveSuggestions) {
    const suggestions = getPendingSuggestions();
    parts.push(buildSuggestionsPromptSection(suggestions));
  }

  // ═══ ISTRUZIONI CONVERSAZIONE ═══
  parts.push(buildConversationInstructions(conversationType, config, studentName));

  // ═══ REGOLE COMPORTAMENTALI FINALI ═══
  parts.push(buildBehavioralRules(config));

  return parts.filter(p => p.trim()).join('\n');
}

// ── Objectives Prompt Section ────────────────────────────────────────

function buildObjectivesPromptSection(): string {
  try {
    const objectivesRaw = localStorage.getItem('bt_lt_objectives');
    if (!objectivesRaw) return '';

    const objectives = JSON.parse(objectivesRaw) as Array<{
      title: string;
      status: string;
      progress: number;
      priority: number;
      category: string;
    }>;

    const active = objectives.filter(o => o.status === 'active');
    if (active.length === 0) return '';

    const parts: string[] = [];
    parts.push('\n--- OBIETTIVI ATTIVI ---');
    for (const obj of active.slice(0, 5)) {
      parts.push(`• ${obj.title} — progresso: ${obj.progress}% — priorità: ${obj.priority}/5 — area: ${obj.category}`);
    }
    parts.push('Monitora questi obiettivi. Se il momento è giusto, chiedi come va o proponi azioni concrete.');

    return parts.join('\n');
  } catch { return ''; }
}

// ── Conversation Type Instructions ───────────────────────────────────

function buildConversationInstructions(
  type: ConversationLogType,
  _config: LifeTutorConfig,
  _studentName: string,
): string {
  const name = _studentName || 'lo studente';
  const parts: string[] = [];

  parts.push(`\n--- MODALITÀ CONVERSAZIONE: ${type.toUpperCase()} ---`);

  switch (type) {
    case 'free_chat':
      parts.push(`${name} ha scelto la conversazione libera. Può parlare di QUALSIASI COSA.`);
      parts.push('Sii un amico: ascolta, consiglia, proponi. Non forzare argomenti didattici.');
      parts.push('Se emerge un argomento interessante, puoi approfondire naturalmente.');
      parts.push('Se noti che potrebbe beneficiare di un\'attività specifica, proponila con delicatezza.');
      break;

    case 'maestro_session':
      parts.push(`Stai assistendo ${name} in una sessione con un maestro.`);
      parts.push('Il tuo ruolo è arricchire con contesto personale e connessioni emotive.');
      parts.push('NON interferire con la didattica del maestro — aggiungi valore con il contesto.');
      break;

    case 'course_session':
      parts.push(`${name} sta seguendo un corso. Mantieni il focus didattico.`);
      parts.push('Usa la memoria per collegare concetti nuovi a esperienze passate.');
      parts.push('Incoraggia e monitora i progressi rispetto al percorso complessivo.');
      break;

    case 'check_in':
      parts.push(`Questo è un check-in periodico con ${name}.`);
      parts.push('Chiedi come sta, cosa è successo di recente, come vanno gli obiettivi.');
      parts.push('Sii proattivo: proponi attività, ricorda scadenze, celebra progressi.');
      break;

    case 'reflection':
      parts.push(`${name} vuole riflettere. Aiutalo a elaborare pensieri e sentimenti.`);
      parts.push('Fai domande aperte, collega esperienze passate, offri nuove prospettive.');
      parts.push('Non forzare soluzioni — lascia che il processo di riflessione accada.');
      break;

    default:
      parts.push(`Conversazione standard con ${name}. Adatta il tuo approccio al contesto.`);
  }

  return parts.join('\n');
}

// ── Behavioral Rules ─────────────────────────────────────────────────

function buildBehavioralRules(config: LifeTutorConfig): string {
  const parts: string[] = [];

  parts.push('\n--- REGOLE COMPORTAMENTALI ---');
  parts.push('1. USA i ricordi personali per creare connessioni emotive genuine.');
  parts.push('2. NON rivelare MAI di avere una "memoria artificiale" — parla come un amico che ricorda.');
  parts.push('3. Se lo studente condivide qualcosa di personale, mostra interesse GENUINO.');
  parts.push('4. Celebra i progressi collegandoli al PERCORSO complessivo, non solo al singolo evento.');
  parts.push('5. Se noti pattern ricorrenti (stress, demotivazione, euforia), commentali con tatto.');
  parts.push('6. Fai SCELTE INDIPENDENTI: proponi argomenti, attività, sfide basate su quello che sai.');
  parts.push('7. Se un obiettivo è fermo da tempo, affrontalo — "Ehi, come va con...?"');
  parts.push('8. Alterna tra ascolto attivo e azione propositiva — non fare solo l\'uno o l\'altro.');
  parts.push('9. OGNI risposta deve contenere almeno un elemento personalizzato (riferimento a memoria, profilo, obiettivo).');
  parts.push('10. NON iniziare MAI con "Come posso aiutarti?" — sei tu a guidare, basandoti sul contesto.');

  if (config.defaultTone) {
    parts.push(`\nTono di default: ${config.defaultTone}`);
  }

  return parts.join('\n');
}

// ── Quick Prompt (for non-Life-Tutor contexts) ───────────────────────

/**
 * Versione ridotta del prompt per contesti dove il Life Tutor supporta
 * senza essere il protagonista (es: agent chat, podcast).
 */
export function buildLightLifeTutorAddon(
  _studentName: string,
  contextTags: MemoryTag[] = [],
): string {
  const config = loadLifeTutorConfig();
  if (!config.enabled) return '';

  const memorySummary = buildMemorySummary(contextTags, config);
  const profile = loadProfileLocal();

  const parts: string[] = [];
  parts.push('\n--- CONTESTO PERSONALE (Life Tutor) ---');

  if (profile?.displayName) {
    parts.push(`Studente: ${profile.displayName}`);
  }
  if (profile?.occupation) {
    parts.push(`Occupazione: ${profile.occupation}`);
  }

  // Solo ricordi più rilevanti
  if (memorySummary.recentMemories.length > 0) {
    parts.push('Ricordi recenti:');
    for (const m of memorySummary.recentMemories.slice(0, 5)) {
      parts.push(`  - ${m.summary}`);
    }
  }

  parts.push('Usa queste informazioni per personalizzare le risposte quando appropriato.');

  return parts.join('\n');
}
