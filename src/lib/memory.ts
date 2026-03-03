/**
 * BarTalk v8 — Sistema Memoria a 3 Livelli
 *
 * Implementa la gestione memoria come da TMwEngine:
 * - Livello 1 (Full): ultimi N messaggi con testo completo
 * - Livello 2 (Condensed): messaggi medi con riassunto per turno
 * - Livello 3 (Summary): messaggi vecchi compressi in blocco riassuntivo
 *
 * + Riassunto automatico ogni SUMMARY_TRIGGER messaggi
 * + Token tracking cumulativo
 */

import type { Message } from '../types/conversation';
import { callProxy } from './proxy';
import { getAPIKey, getModel } from './storage';
import { DEFAULT_MODELS } from './constants';

// ── Configurazione memoria ──────────────────────────────────────────

// ── Defaults ────────────────────────────────────────────────────────
const DEFAULT_MEMORY_CONFIG = {
  fullDetailCount: 20,
  condensedCount: 20,
  summaryThreshold: 40,
  summaryTrigger: 20,
  maxContextTokens: 6000,
  condensedMaxChars: 120,
  summaryMaxChars: 800,
};

export type MemoryConfigType = typeof DEFAULT_MEMORY_CONFIG;

const MEMORY_SETTINGS_KEY = 'bartalk_memory_config';

/** Carica configurazione memoria (user-override o default) */
export function loadMemoryConfig(): MemoryConfigType {
  try {
    const saved = localStorage.getItem(MEMORY_SETTINGS_KEY);
    if (saved) return { ...DEFAULT_MEMORY_CONFIG, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULT_MEMORY_CONFIG };
}

/** Salva override configurazione memoria */
export function saveMemoryConfig(config: Partial<MemoryConfigType>): void {
  try {
    const current = loadMemoryConfig();
    localStorage.setItem(MEMORY_SETTINGS_KEY, JSON.stringify({ ...current, ...config }));
  } catch { /* ignore */ }
}

/** Reset configurazione memoria ai default */
export function resetMemoryConfig(): void {
  localStorage.removeItem(MEMORY_SETTINGS_KEY);
}

/** Getter runtime (sempre aggiornato) */
export function getMemoryConfig(): MemoryConfigType {
  return loadMemoryConfig();
}

// Esponiamo anche come costante statica per retrocompatibilità
export const MEMORY_CONFIG = DEFAULT_MEMORY_CONFIG;

// ── Tipi ─────────────────────────────────────────────────────────────

export interface MemoryBlock {
  /** Riassunto cumulativo dei messaggi più vecchi (Livello 3) */
  summary: string;
  /** Messaggi condensati (Livello 2): "AgentName: posizione in 1 frase" */
  condensed: { role: string; content: string }[];
  /** Messaggi completi recenti (Livello 1) */
  full: { role: string; content: string }[];
  /** Statistiche */
  stats: {
    totalMessages: number;
    level1Count: number;
    level2Count: number;
    level3Summarized: number;
    estimatedTokens: number;
  };
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  content: string;
  messageRange: [number, number]; // indici messaggi coperti
  createdAt: string;
}

// ── Storage riassunti ────────────────────────────────────────────────

const SUMMARIES_KEY = 'bartalk_summaries';

export function loadSummaries(conversationId: string): ConversationSummary[] {
  try {
    const all = JSON.parse(localStorage.getItem(SUMMARIES_KEY) || '{}');
    return all[conversationId] || [];
  } catch { return []; }
}

export function saveSummary(summary: ConversationSummary): void {
  try {
    const all = JSON.parse(localStorage.getItem(SUMMARIES_KEY) || '{}');
    if (!all[summary.conversationId]) all[summary.conversationId] = [];
    all[summary.conversationId].push(summary);
    localStorage.setItem(SUMMARIES_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function deleteSummaries(conversationId: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(SUMMARIES_KEY) || '{}');
    delete all[conversationId];
    localStorage.setItem(SUMMARIES_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// ── Stima token (approssimativa: ~4 char = 1 token) ─────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Condensatore: messaggio → 1 riga ────────────────────────────────

function condenseMessage(msg: Message): string {
  const cfg = getMemoryConfig();
  const name = msg.senderName || (msg.senderType === 'human' ? 'Utente' : 'Agente');
  const content = msg.content.trim();

  const firstSentence = content.split(/[.!?]\s/)[0];
  const condensed = firstSentence.length > cfg.condensedMaxChars
    ? firstSentence.substring(0, cfg.condensedMaxChars) + '...'
    : firstSentence;

  return `[${name}]: ${condensed}`;
}

// ── Builder principale: 3 livelli ────────────────────────────────────

export function buildMemoryBlock(
  messages: Message[],
  conversationId: string,
): MemoryBlock {
  const cfg = getMemoryConfig();
  const total = messages.length;
  const summaries = loadSummaries(conversationId);

  // Calcola il riassunto cumulativo (Livello 3)
  const cumulativeSummary = summaries.length > 0
    ? summaries.map(s => s.content).join('\n\n')
    : '';

  // Determina i confini dei 3 livelli
  const fullStart = Math.max(0, total - cfg.fullDetailCount);
  const condensedStart = Math.max(0, fullStart - cfg.condensedCount);

  // Livello 1: messaggi completi (ultimi N)
  const fullMessages = messages.slice(fullStart).map(m => ({
    role: m.senderType === 'human' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Livello 2: messaggi condensati (N precedenti)
  const condensedMessages = messages.slice(condensedStart, fullStart).map(m => ({
    role: m.senderType === 'human' ? 'user' : 'assistant',
    content: condenseMessage(m),
  }));

  // Stima token
  const summaryTokens = estimateTokens(cumulativeSummary);
  const condensedTokens = condensedMessages.reduce((acc, m) => acc + estimateTokens(m.content), 0);
  const fullTokens = fullMessages.reduce((acc, m) => acc + estimateTokens(m.content), 0);

  return {
    summary: cumulativeSummary,
    condensed: condensedMessages,
    full: fullMessages,
    stats: {
      totalMessages: total,
      level1Count: fullMessages.length,
      level2Count: condensedMessages.length,
      level3Summarized: condensedStart, // quanti messaggi sono coperti dal riassunto
      estimatedTokens: summaryTokens + condensedTokens + fullTokens,
    },
  };
}

// ── Assembla messaggi API con i 3 livelli ────────────────────────────

export function buildMemoryMessages(
  userMessage: string,
  messages: Message[],
  conversationId: string,
): { role: string; content: string }[] {
  const cfg = getMemoryConfig();
  const block = buildMemoryBlock(messages, conversationId);
  const apiMessages: { role: string; content: string }[] = [];

  // Livello 3: Riassunto cumulativo come primo messaggio di contesto
  if (block.summary) {
    // Tronca riassunto se troppo lungo
    const summaryText = block.summary.length > cfg.summaryMaxChars
      ? block.summary.substring(0, cfg.summaryMaxChars) + '...[troncato]'
      : block.summary;
    apiMessages.push({
      role: 'user',
      content: `[RIASSUNTO CONVERSAZIONE PRECEDENTE]\n${summaryText}`,
    });
    apiMessages.push({
      role: 'assistant',
      content: 'Ho letto il riassunto della conversazione precedente. Procedo con il contesto aggiornato.',
    });
  }

  // Livello 2: Messaggi condensati
  if (block.condensed.length > 0) {
    const condensedBlock = block.condensed.map(m => m.content).join('\n');
    apiMessages.push({
      role: 'user',
      content: `[CONTESTO PRECEDENTE - Sintesi]\n${condensedBlock}`,
    });
    apiMessages.push({
      role: 'assistant',
      content: 'Contesto ricevuto. Proseguo la discussione.',
    });
  }

  // Livello 1: Messaggi completi
  for (const msg of block.full) {
    apiMessages.push(msg);
  }

  // Messaggio utente corrente
  apiMessages.push({ role: 'user', content: userMessage });

  // ── TOKEN ENFORCEMENT ──────────────────────────────────────────────
  // Se il contesto supera maxContextTokens, rimuovi messaggi L1 più vecchi
  let totalTokens = apiMessages.reduce((acc, m) => acc + estimateTokens(m.content), 0);
  const maxTokens = cfg.maxContextTokens;

  if (totalTokens > maxTokens) {
    // Identifica l'indice dove iniziano i messaggi L1 (dopo L3+L2 headers)
    const l1StartIdx = block.summary ? 2 : 0;
    const l1StartWithL2 = l1StartIdx + (block.condensed.length > 0 ? 2 : 0);

    // Rimuovi messaggi L1 più vecchi finché non rientro nel limite
    while (totalTokens > maxTokens && apiMessages.length > l1StartWithL2 + 2) {
      // Rimuovi il messaggio più vecchio di L1 (non toccare L3, L2, e l'ultimo user)
      const removed = apiMessages.splice(l1StartWithL2, 1);
      if (removed.length > 0) {
        totalTokens -= estimateTokens(removed[0].content);
      } else {
        break;
      }
    }
  }

  return apiMessages;
}

// ── Controlla se serve un riassunto automatico ───────────────────────

export function shouldTriggerSummary(
  messages: Message[],
  conversationId: string,
): boolean {
  const cfg = getMemoryConfig();
  const summaries = loadSummaries(conversationId);
  const lastSummarizedIdx = summaries.length > 0
    ? summaries[summaries.length - 1].messageRange[1]
    : 0;

  const unsummarized = messages.length - lastSummarizedIdx;
  return unsummarized >= cfg.summaryTrigger;
}

// ── Genera riassunto automatico via AI ───────────────────────────────

export async function generateAutoSummary(
  messages: Message[],
  conversationId: string,
): Promise<ConversationSummary | null> {
  const summaries = loadSummaries(conversationId);
  const lastSummarizedIdx = summaries.length > 0
    ? summaries[summaries.length - 1].messageRange[1]
    : 0;

  // Messaggi da riassumere: dall'ultimo riassunto fino a N messaggi fa (L1 range)
  const cfg = getMemoryConfig();
  const endIdx = Math.max(lastSummarizedIdx, messages.length - cfg.fullDetailCount);
  if (endIdx <= lastSummarizedIdx) return null;

  const toSummarize = messages.slice(lastSummarizedIdx, endIdx);
  if (toSummarize.length < 5) return null;

  // Trova una API key disponibile
  const providers = ['openai', 'anthropic', 'gemini', 'groq'] as const;
  let apiKey = '';
  let provider: typeof providers[number] = 'openai';
  for (const p of providers) {
    const key = getAPIKey(p);
    if (key) { apiKey = key; provider = p; break; }
  }
  if (!apiKey) return null;

  const model = getModel(provider) || DEFAULT_MODELS[provider];

  // Prepara il testo da riassumere
  const text = toSummarize.map(m => {
    const name = m.senderName || (m.senderType === 'human' ? 'Utente' : 'Agente');
    return `${name}: ${m.content.substring(0, 300)}`;
  }).join('\n\n');

  const systemPrompt = `Sei un assistente che crea riassunti concisi e informativi di conversazioni multi-agente.
Regole:
1. Riassumi in massimo 200 parole
2. Cattura: argomento principale, posizioni di ogni partecipante, punti di accordo/disaccordo, conclusioni raggiunte
3. Usa formato: "[Riassunto messaggi ${lastSummarizedIdx + 1}-${endIdx}] ..."
4. Mantieni i nomi degli agenti
5. Rispondi SOLO con il riassunto, nessun commento aggiuntivo`;

  try {
    const result = await callProxy({
      provider,
      model,
      messages: [{ role: 'user', content: `Riassumi questa conversazione:\n\n${text}` }],
      systemPrompt,
      temperature: 0.3,
      maxTokens: 400,
      apiKey,
    });

    if (result.error || !result.content) return null;

    const summary: ConversationSummary = {
      id: crypto.randomUUID(),
      conversationId,
      content: result.content.trim(),
      messageRange: [lastSummarizedIdx, endIdx],
      createdAt: new Date().toISOString(),
    };

    saveSummary(summary);
    return summary;
  } catch {
    return null;
  }
}

// ── Genera riassunto completo della conversazione (per utente) ───────

export async function generateFullConversationSummary(
  messages: Message[],
): Promise<string | null> {
  if (messages.length < 3) return null;

  const providers = ['openai', 'anthropic', 'gemini', 'groq'] as const;
  let apiKey = '';
  let provider: typeof providers[number] = 'openai';
  for (const p of providers) {
    const key = getAPIKey(p);
    if (key) { apiKey = key; provider = p; break; }
  }
  if (!apiKey) return null;

  const model = getModel(provider) || DEFAULT_MODELS[provider];

  // Prepara testo (con condensamento intelligente per conversazioni lunghe)
  const textParts: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const name = m.senderName || (m.senderType === 'human' ? 'Utente' : 'Sistema');
    // Ultimi 10 messaggi: full; precedenti: condensati
    if (i >= messages.length - 10) {
      textParts.push(`${name}: ${m.content.substring(0, 500)}`);
    } else {
      textParts.push(`${name}: ${m.content.substring(0, 150)}...`);
    }
  }

  const text = textParts.join('\n\n');

  const systemPrompt = `Crea un riassunto completo ed esaustivo di questa conversazione multi-agente.

Struttura richiesta:
## Argomento
Breve descrizione del tema discusso.

## Partecipanti e Posizioni
Per ogni agente: nome, posizione principale, punti chiave sostenuti.

## Sviluppo della Discussione
Come si è evoluta la conversazione: punti di accordo, disaccordi, cambi di direzione.

## Conclusioni
Punti su cui si è converguto, questioni rimaste aperte.

## Punti Chiave
Elenco dei 3-5 insight più importanti emersi.

Scrivi in modo chiaro e conciso. Max 500 parole.`;

  try {
    const result = await callProxy({
      provider,
      model,
      messages: [{ role: 'user', content: `Riassumi questa conversazione:\n\n${text}` }],
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1000,
      apiKey,
    });

    return result.error ? null : result.content;
  } catch {
    return null;
  }
}

// ── Export conversazione in formato testo ─────────────────────────────

export function exportConversationAsText(messages: Message[], title: string): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push(`Esportata: ${new Date().toLocaleString('it-IT')}`);
  lines.push(`Messaggi: ${messages.length}`);
  lines.push('---\n');

  for (const m of messages) {
    const time = new Date(m.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const name = m.senderName || (m.senderType === 'human' ? 'Utente' : 'Sistema');
    const prefix = m.senderType === 'human' ? '👤' : m.senderType === 'assistant' ? '🤖' : '⚙️';
    lines.push(`${prefix} [${time}] **${name}**${m.provider ? ` (${m.provider})` : ''}`);
    lines.push(m.content);
    lines.push('');
  }

  return lines.join('\n');
}

export function exportConversationAsMarkdown(messages: Message[], title: string): string {
  return exportConversationAsText(messages, title);
}
