import type { Message } from '../types/conversation';
import type { ConvergenceState } from '../types/orchestrator';
import type { AppLanguage } from '../types/settings';

/**
 * BarTalk v8 — Sistema di Convergenza Avanzato
 *
 * Analizza la convergenza della conversazione con:
 * - Keywords multilingua (6 lingue)
 * - Similarity migliorata con stop words filtering
 * - Soglie ottimizzate
 */

// ── Keywords per lingua ──────────────────────────────────────────────

const AGREEMENT_KEYWORDS: Record<AppLanguage, string[]> = {
  it: ['concordo', 'esattamente', 'sono d\'accordo', 'hai ragione', 'confermo', 'condivido', 'giusto', 'perfettamente', 'assolutamente'],
  en: ['agree', 'exactly', 'correct', 'right', 'indeed', 'absolutely', 'precisely', 'well said', 'I share'],
  es: ['de acuerdo', 'exactamente', 'correcto', 'coincido', 'comparto', 'precisamente', 'efectivamente'],
  fr: ['d\'accord', 'exactement', 'tout à fait', 'je confirme', 'effectivement', 'précisément', 'je partage'],
  de: ['einverstanden', 'genau', 'stimme zu', 'richtig', 'absolut', 'in der tat', 'teile die meinung'],
  pt: ['concordo', 'exatamente', 'de acordo', 'correto', 'compartilho', 'precisamente', 'certamente'],
};

const DIVERGENCE_KEYWORDS: Record<AppLanguage, string[]> = {
  it: ['tuttavia', 'al contrario', 'non sono d\'accordo', 'diversamente', 'invece', 'obietto', 'ma', 'però', 'dissento', 'non credo'],
  en: ['however', 'disagree', 'on the contrary', 'actually', 'but', 'rather', 'I object', 'differ', 'not quite', 'I don\'t think'],
  es: ['sin embargo', 'al contrario', 'no estoy de acuerdo', 'en cambio', 'pero', 'disiento', 'difiero', 'no creo'],
  fr: ['cependant', 'au contraire', 'je ne suis pas d\'accord', 'en revanche', 'mais', 'toutefois', 'je m\'oppose', 'je ne pense pas'],
  de: ['jedoch', 'im gegenteil', 'nicht einverstanden', 'andererseits', 'aber', 'allerdings', 'widerspreche', 'glaube nicht'],
  pt: ['no entanto', 'ao contrário', 'discordo', 'em contrapartida', 'mas', 'porém', 'não concordo', 'não acredito'],
};

const STOP_WORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'del', 'della',
  'a', 'e', 'è', 'che', 'non', 'per', 'con', 'da', 'in', 'su', 'questo', 'quello',
  'the', 'a', 'an', 'is', 'are', 'was', 'be', 'to', 'of', 'and', 'in', 'that',
  'it', 'for', 'on', 'with', 'as', 'at', 'by', 'this', 'from', 'or', 'but',
]);

// ── Funzione principale ──────────────────────────────────────────────

export function analyzeConvergence(messages: Message[], lang?: AppLanguage): ConvergenceState {
  const agentMessages = messages.filter(m => m.senderType === 'assistant');
  if (agentMessages.length < 4) return 'neutral';

  const recent = agentMessages.slice(-6);
  const contents = recent.map(m => m.content.toLowerCase());

  if (isStagnant(contents)) return 'stagnation';
  if (isAgreement(contents, lang)) return 'agreement';
  if (isDivergence(contents, lang)) return 'divergence';

  return 'neutral';
}

function isStagnant(contents: string[]): boolean {
  if (contents.length < 3) return false;

  let stagnantPairs = 0;
  for (let i = 1; i < contents.length; i++) {
    const similarity = calculateSimilarity(contents[i - 1], contents[i]);
    if (similarity > 0.55) stagnantPairs++;
  }
  // Stagnazione se almeno 2 coppie consecutive sono troppo simili
  return stagnantPairs >= 2;
}

function isAgreement(contents: string[], lang?: AppLanguage): boolean {
  const allKeywords = lang
    ? AGREEMENT_KEYWORDS[lang] || AGREEMENT_KEYWORDS.it
    : Object.values(AGREEMENT_KEYWORDS).flat();

  let agreementCount = 0;
  for (const content of contents) {
    if (allKeywords.some(w => content.includes(w))) agreementCount++;
  }
  return agreementCount >= 2;
}

function isDivergence(contents: string[], lang?: AppLanguage): boolean {
  const allKeywords = lang
    ? DIVERGENCE_KEYWORDS[lang] || DIVERGENCE_KEYWORDS.it
    : Object.values(DIVERGENCE_KEYWORDS).flat();

  let divergenceCount = 0;
  for (const content of contents) {
    if (allKeywords.some(w => content.includes(w))) divergenceCount++;
  }
  return divergenceCount >= 2;
}

function calculateSimilarity(a: string, b: string): number {
  const tokenize = (s: string) => {
    const words = s.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    return new Set(words);
  };

  const wordsA = tokenize(a);
  const wordsB = tokenize(b);
  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  const total = Math.max(wordsA.size, wordsB.size);
  return total === 0 ? 0 : common / total;
}

// ── Istruzioni convergenza multilingua ───────────────────────────────

const CONVERGENCE_INSTRUCTIONS: Record<AppLanguage, Record<ConvergenceState, string>> = {
  it: {
    stagnation: '\n⚠️ LA CONVERSAZIONE È STAGNANTE. Porta un punto di vista COMPLETAMENTE NUOVO o proponi una direzione inaspettata. Cambia prospettiva, usa un\'analogia diversa, o sfida un presupposto condiviso.',
    agreement: '\nGli agenti stanno convergendo. Approfondisci un aspetto specifico che nessuno ha ancora esplorato, oppure identifica possibili criticità o eccezioni alla posizione condivisa.',
    divergence: '\nCi sono opinioni diverse in gioco. Cerca un punto di sintesi che integri le prospettive migliori, oppure proponi un compromesso costruttivo che tenga conto di tutte le posizioni.',
    neutral: '',
  },
  en: {
    stagnation: '\n⚠️ THE CONVERSATION IS STAGNATING. Bring a COMPLETELY NEW perspective or propose an unexpected direction. Change perspective, use a different analogy, or challenge a shared assumption.',
    agreement: '\nThe agents are converging. Dive deeper into a specific aspect no one has explored yet, or identify possible criticisms or exceptions to the shared position.',
    divergence: '\nThere are different opinions in play. Seek a synthesis that integrates the best perspectives, or propose a constructive compromise that accounts for all positions.',
    neutral: '',
  },
  es: {
    stagnation: '\n⚠️ LA CONVERSACIÓN ESTÁ ESTANCADA. Trae una perspectiva COMPLETAMENTE NUEVA o propón una dirección inesperada.',
    agreement: '\nLos agentes están convergiendo. Profundiza en un aspecto específico o identifica posibles críticas a la posición compartida.',
    divergence: '\nHay opiniones diferentes. Busca una síntesis que integre las mejores perspectivas.',
    neutral: '',
  },
  fr: {
    stagnation: '\n⚠️ LA CONVERSATION STAGNE. Apportez une perspective COMPLÈTEMENT NOUVELLE ou proposez une direction inattendue.',
    agreement: '\nLes agents convergent. Approfondissez un aspect spécifique ou identifiez des critiques possibles.',
    divergence: '\nIl y a des opinions différentes. Cherchez une synthèse qui intègre les meilleures perspectives.',
    neutral: '',
  },
  de: {
    stagnation: '\n⚠️ DAS GESPRÄCH STAGNIERT. Bringen Sie eine VÖLLIG NEUE Perspektive ein oder schlagen Sie eine unerwartete Richtung vor.',
    agreement: '\nDie Agenten konvergieren. Vertiefen Sie einen spezifischen Aspekt oder identifizieren Sie mögliche Kritikpunkte.',
    divergence: '\nEs gibt unterschiedliche Meinungen. Suchen Sie nach einer Synthese der besten Perspektiven.',
    neutral: '',
  },
  pt: {
    stagnation: '\n⚠️ A CONVERSA ESTÁ ESTAGNADA. Traga uma perspectiva COMPLETAMENTE NOVA ou proponha uma direção inesperada.',
    agreement: '\nOs agentes estão convergindo. Aprofunde um aspecto específico ou identifique possíveis críticas à posição compartilhada.',
    divergence: '\nHá opiniões diferentes em jogo. Busque uma síntese que integre as melhores perspectivas.',
    neutral: '',
  },
};

export function getConvergenceInstruction(state: ConvergenceState, lang?: AppLanguage): string {
  const langKey = lang || 'it';
  const instructions = CONVERGENCE_INSTRUCTIONS[langKey] || CONVERGENCE_INSTRUCTIONS.it;
  return instructions[state] || '';
}
