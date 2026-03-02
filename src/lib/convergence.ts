import type { Message } from '../types/conversation';
import type { ConvergenceState } from '../types/orchestrator';

/**
 * Analizza la convergenza della conversazione basandosi sugli ultimi messaggi.
 * Rileva se gli agenti sono in accordo, divergenza, stagnazione o neutro.
 */
export function analyzeConvergence(messages: Message[]): ConvergenceState {
  const agentMessages = messages.filter(m => m.senderType === 'assistant');
  if (agentMessages.length < 4) return 'neutral';

  // Ultimi 6 messaggi agenti
  const recent = agentMessages.slice(-6);
  const contents = recent.map(m => m.content.toLowerCase());

  // Controlla stagnazione (contenuti molto simili)
  if (isStagnant(contents)) return 'stagnation';

  // Controlla accordo (parole chiave comuni)
  if (isAgreement(contents)) return 'agreement';

  // Controlla divergenza (parole contrastanti)
  if (isDivergence(contents)) return 'divergence';

  return 'neutral';
}

function isStagnant(contents: string[]): boolean {
  if (contents.length < 3) return false;

  // Controlla se gli ultimi messaggi sono troppo simili
  for (let i = 1; i < contents.length; i++) {
    const similarity = calculateSimilarity(contents[i - 1], contents[i]);
    if (similarity > 0.6) return true;
  }
  return false;
}

function isAgreement(contents: string[]): boolean {
  const agreementWords = ['concordo', 'esattamente', 'sono d\'accordo', 'hai ragione', 'confermo', 'condivido'];
  let agreementCount = 0;
  for (const content of contents) {
    if (agreementWords.some(w => content.includes(w))) agreementCount++;
  }
  return agreementCount >= 2;
}

function isDivergence(contents: string[]): boolean {
  const divergenceWords = ['tuttavia', 'al contrario', 'non sono d\'accordo', 'diversamente', 'invece', 'obietto'];
  let divergenceCount = 0;
  for (const content of contents) {
    if (divergenceWords.some(w => content.includes(w))) divergenceCount++;
  }
  return divergenceCount >= 2;
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  const total = Math.max(wordsA.size, wordsB.size);
  return total === 0 ? 0 : common / total;
}

/**
 * Genera istruzione per il sistema basata sulla convergenza.
 */
export function getConvergenceInstruction(state: ConvergenceState): string {
  switch (state) {
    case 'stagnation':
      return '\n⚠️ LA CONVERSAZIONE È STAGNANTE. Porta un punto di vista NUOVO o proponi una direzione concreta. Non ripetere ciò che è già stato detto.';
    case 'agreement':
      return '\nGli agenti sembrano in accordo. Prova ad approfondire un aspetto specifico o a trovare possibili criticità.';
    case 'divergence':
      return '\nCi sono opinioni diverse. Cerca di trovare un punto di sintesi o proponi un compromesso costruttivo.';
    default:
      return '';
  }
}
