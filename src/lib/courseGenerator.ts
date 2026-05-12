/**
 * BarTalk v8 — Course Syllabus Generator
 * Genera un syllabus strutturato via AI (Anthropic preferito per JSON affidabile).
 */

import type { CourseLesson, CourseLevelType, CourseCategoryId, AssessmentQuestion, ContentSource } from '../types/courses';
import { COURSE_LEVEL_META } from '../types/courses';
import { callProxy } from './proxy';
import { generateId } from './utils';
import { resolveApiKeyOrThrow } from './apiKeyResolver';

// ── Prompt di generazione ───────────────────────────────────────────

function buildSyllabusPrompt(
  topic: string,
  level: CourseLevelType,
  category: CourseCategoryId,
  lang: string,
  requiresCertifiedSources: boolean,
  customization?: string
): string {
  const levelMeta = COURSE_LEVEL_META[level];
  const [minLessons, maxLessons] = levelMeta.lessonRange;

  const langLabel = lang === 'it' ? 'italiano' : lang === 'en' ? 'inglese' : lang;

  let sourceInstructions = '';
  if (requiresCertifiedSources) {
    sourceInstructions = `
FONTI CERTIFICATE OBBLIGATORIE:
Questo è un argomento ${category}. Per OGNI lezione devi includere "sources" con almeno 2 fonti reali:
- Usa paper peer-reviewed, libri di testo universitari, linee guida ufficiali
- Per ogni fonte indica: title, url (se disponibile), type ("academic"|"institutional"|"professional"|"general"), credibility (1-5, dove 5=peer-reviewed)
- Le fonti devono essere REALI e verificabili, non inventate
- Preferisci: PubMed, WHO, NIH, Cochrane, manuali universitari riconosciuti

Per ogni domanda assessment in argomenti certificati, includi la fonte che supporta la risposta corretta.`;
  }

  const customBlock = customization ? `\nPERSONALIZZAZIONE RICHIESTA:\n${customization}\nAdatta il syllabus secondo queste indicazioni specifiche dell'utente.\n` : '';

  return `Sei un esperto progettista di percorsi formativi. Genera un syllabus completo in ${langLabel} per il seguente corso:

ARGOMENTO: ${topic}
LIVELLO: ${levelMeta.label} — ${levelMeta.description}
CATEGORIA: ${category}
NUMERO LEZIONI: tra ${minLessons} e ${maxLessons}
${customBlock}

REQUISITI PER LIVELLO:
${getLevelRequirements(level)}

${sourceInstructions}

FORMATO OUTPUT:
Rispondi SOLO con un array JSON valido. Nessun testo prima o dopo. Ogni elemento dell'array ha questa struttura:

{
  "title": "Titolo della lezione",
  "description": "Descrizione di 1-2 frasi",
  "objectives": ["obiettivo 1", "obiettivo 2", "obiettivo 3"],
  "taskType": "lesson",
  "assessment": [
    {
      "question": "Domanda?",
      "options": ["opzione A", "opzione B", "opzione C", "opzione D"],
      "correctIndex": 0,
      "explanation": "Spiegazione della risposta corretta"${requiresCertifiedSources ? `,
      "sources": [{"title": "Nome fonte", "type": "academic", "credibility": 5}]` : ''}
    }
  ]${requiresCertifiedSources ? `,
  "sources": [
    {"title": "Nome fonte reale", "url": "https://...", "type": "academic", "credibility": 5}
  ]` : ''}
}

REGOLE:
- Ogni lezione deve avere esattamente 3-5 domande assessment
- Le domande devono testare la comprensione degli obiettivi
- Le opzioni devono essere plausibili (non risposte ovviamente sbagliate)
- L'ordine delle lezioni deve essere logico e progressivo
- Ogni lezione deve costruire sulle precedenti
- Il campo "taskType" è sempre "lesson"
- RISPONDI SOLO CON L'ARRAY JSON, niente altro
- IMPORTANTE: assicurati di chiudere TUTTE le parentesi. L'array deve terminare con ]
- Se il contenuto è lungo, preferisci lezioni concise piuttosto che rischiare di troncare il JSON
- Ogni stringa deve avere le virgolette di chiusura
- NON usare virgolette doppie non-escapate dentro le stringhe JSON

FILOSOFIA DIDATTICA — MODELLO "MAESTRO ALLA LAVAGNA":
Queste lezioni verranno insegnate da un maestro virtuale in una CONVERSAZIONE INTERATTIVA, non lette come testo statico.
Progetta ogni lezione per essere RACCONTATA e DISCUSSA, non per essere letta passivamente.
- Gli obiettivi sono TRAGUARDI di una conversazione, non checklist da spuntare
- La descrizione deve suggerire un FILO NARRATIVO che il maestro può seguire
- Le lezioni devono avere spessore sufficiente per una discussione di 15-30 minuti
- Evita lezioni troppo frammentate (micro-concetti isolati): ogni lezione deve avere un TEMA CENTRALE coerente
- Favorisci progressione naturale: dalla curiosità alla comprensione alla padronanza`;
}

function getLevelRequirements(level: CourseLevelType): string {
  switch (level) {
    case 'bambino':
      return `- Linguaggio semplice, frasi brevi, parole concrete
- Esempi dalla vita quotidiana di un bambino (scuola, giochi, natura)
- Domande quiz facili con risposte intuitive
- Max 3 obiettivi per lezione
- Titoli divertenti e coinvolgenti`;
    case 'base':
      return `- Introduzione graduale dei concetti fondamentali
- Ogni termine tecnico viene definito la prima volta
- Molti esempi pratici e concreti
- Quiz che verificano la comprensione di base
- 3-4 obiettivi per lezione`;
    case 'intermedio':
      return `- Terminologia specifica introdotta progressivamente
- Bilanciamento tra teoria e applicazioni pratiche
- Riferimenti a concetti prerequisiti
- Quiz che richiedono ragionamento, non solo memoria
- 3-4 obiettivi per lezione`;
    case 'avanzato':
      return `- Terminologia tecnica usata liberamente
- Approfondimento di dettagli e casi particolari
- Analisi critica e confronto tra approcci
- Quiz che testano applicazione e analisi
- 4-5 obiettivi per lezione`;
    case 'universitario':
      return `- Livello accademico con framework teorici
- Riferimenti a studi e ricerche
- Discussione di teorie contrastanti
- Quiz che richiedono sintesi e valutazione critica
- 4-5 obiettivi per lezione`;
    case 'ricercatore':
      return `- Frontiera della ricerca nel campo
- Meta-analisi, review sistematiche, studi recenti
- Discussione di controversie e lacune nella letteratura
- Metodologia di ricerca specifica del campo
- Quiz che testano conoscenza della letteratura e pensiero critico
- 5 obiettivi per lezione`;
  }
}

// ── Risultato generazione con warning opzionale ─────────────────────

export interface SyllabusResult {
  lessons: CourseLesson[];
  /** Avviso non bloccante (es. syllabus troncato e parzialmente recuperato) */
  warning?: string;
}

// ── Chiamata AI e parsing ───────────────────────────────────────────

/**
 * Genera il syllabus completo. La creazione percorsi è ESENTE dai limiti token
 * consueti: usa sempre il massimo di token disponibile e gestisce troncamenti
 * in modo non bloccante (avviso, non errore).
 */
export async function generateCourseSyllabus(
  topic: string,
  level: CourseLevelType,
  category: CourseCategoryId,
  lang: string,
  requiresCertifiedSources: boolean,
  customization?: string
): Promise<SyllabusResult> {
  const systemPrompt = buildSyllabusPrompt(topic, level, category, lang, requiresCertifiedSources, customization);

  // Recupera API key da settings (Anthropic preferito)
  const settings = resolveApiKeyOrThrow();

  // NOTE: v8.2.5 proxy does not support unlimitedTokens — we omit maxTokens
  // to let the proxy use its default (which is the max allowed by ORCHESTRATOR config)
  const response = await callProxy({
    provider: settings.provider,
    model: settings.model,
    messages: [{ role: 'user', content: `Genera il syllabus per: ${topic} (livello: ${level}, categoria: ${category})` }],
    systemPrompt,
    temperature: 0.3,
    apiKey: settings.apiKey,
  });

  if (response.error) {
    throw new Error(`Errore generazione syllabus: ${response.error}${response.detail ? ` — ${response.detail}` : ''}`);
  }

  // Controlla se la risposta è stata troncata (JSON incompleto)
  const wasTruncated = response.content && !response.content.trimEnd().endsWith(']');

  // Parsing JSON dalla risposta (repairJSON gestisce troncamenti)
  let lessons: RawLesson[];
  let warning: string | undefined;

  try {
    lessons = parseJsonResponse(response.content);
  } catch (parseErr) {
    // Se il parse fallisce completamente, non bloccare ma avvisa
    if (wasTruncated) {
      throw new Error(
        'Il syllabus generato è troppo lungo per il limite token attuale. ' +
        'Prova con un livello più semplice o un argomento più specifico.'
      );
    }
    throw parseErr;
  }

  // Se il syllabus era troncato ma il repair ha salvato delle lezioni, avvisa senza bloccare
  if (wasTruncated && lessons.length > 0) {
    warning = `Il syllabus è stato parzialmente generato (${lessons.length} lezioni recuperate). ` +
      `Per un percorso più completo, prova con un argomento più specifico o un livello diverso.`;
    console.warn(`[CourseGenerator] ${warning}`);
  }

  const formattedLessons = lessons.map((raw, index) => formatLesson(raw, index));
  return { lessons: formattedLessons, warning };
}

// ── Helpers ─────────────────────────────────────────────────────────

interface RawLesson {
  title?: string;
  description?: string;
  objectives?: string[];
  taskType?: string;
  assessment?: RawAssessment[];
  sources?: RawSource[];
}

interface RawAssessment {
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  sources?: RawSource[];
}

interface RawSource {
  title?: string;
  url?: string;
  type?: string;
  credibility?: number;
}

/**
 * Riparazione robusta di JSON malformato (trailing commas, newline in stringhe,
 * quote non escapate, proprietà troncate, ecc.).
 */
function repairJSON(input: string): string {
  let s = input;

  // 1. Rimuovi trailing commas prima di } o ]
  s = s.replace(/,\s*([}\]])/g, '$1');

  // 2. Rimuovi newline/tab all'interno delle stringhe JSON
  // Processa carattere per carattere per rispettare i confini delle stringhe
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      result += ch;
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && (ch === '\n' || ch === '\r' || ch === '\t')) {
      // Sostituisci newline/tab dentro stringhe con spazio
      result += ch === '\t' ? '\\t' : ' ';
      continue;
    }
    result += ch;
  }
  s = result;

  // 3. Se la stringa finisce con un oggetto troncato (manca la chiusura ],}),
  //    prova a chiudere le parentesi aperte
  let openBrackets = 0;
  let openBraces = 0;
  inString = false;
  escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
      else if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
    }
  }

  // Chiudi parentesi mancanti
  while (openBraces > 0) { s += '}'; openBraces--; }
  while (openBrackets > 0) { s += ']'; openBrackets--; }

  // 4. Rimuovi trailing commas di nuovo (dopo le chiusure)
  s = s.replace(/,\s*([}\]])/g, '$1');

  // 5. Se il JSON finisce a metà di una stringa, chiudila
  {
    let ins = false;
    let esc = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (esc) { esc = false; continue; }
      if (c === '\\' && ins) { esc = true; continue; }
      if (c === '"') ins = !ins;
    }
    if (ins) s += '"';
  }

  // 6. Tentativo aggressivo: se il JSON è ancora non parsabile,
  //    prova a troncare all'ultimo oggetto completo valido
  try {
    JSON.parse(s);
  } catch {
    // Strategia: trova l'ultimo oggetto completo nell'array top-level
    let bestEnd = -1;
    let depth = 0;      // bracket depth []
    let braceDepth = 0; // brace depth {}
    let inStr2 = false;
    let esc3 = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (esc3) { esc3 = false; continue; }
      if (c === '\\' && inStr2) { esc3 = true; continue; }
      if (c === '"') { inStr2 = !inStr2; continue; }
      if (!inStr2) {
        if (c === '[') depth++;
        else if (c === ']') depth--;
        else if (c === '{') braceDepth++;
        else if (c === '}') {
          braceDepth--;
          // Se siamo al livello top dell'array (depth=1) e l'oggetto si è chiuso (braceDepth=0)
          if (depth === 1 && braceDepth === 0) {
            bestEnd = i;
          }
        }
      }
    }

    if (bestEnd > 0) {
      const fixed = s.slice(0, bestEnd + 1).replace(/,\s*$/, '') + ']';
      try {
        const parsed = JSON.parse(fixed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[repairJSON] Troncato a ${parsed.length} oggetti completi`);
          s = fixed;
        }
      } catch {
        // Fallback: prova con l'ultimo },
        const lastObjComma = s.lastIndexOf('},');
        if (lastObjComma > 0) {
          const fixedB = s.slice(0, lastObjComma + 1) + ']';
          try {
            JSON.parse(fixedB);
            s = fixedB;
          } catch { /* keep original */ }
        }
      }
    }
  }

  return s;
}

function parseJsonResponse(content: string): RawLesson[] {
  // Cerca un array JSON nella risposta
  let jsonStr = content.trim();

  // Rimuovi eventuale markdown code block
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Trova il primo '[' e l'ultimo ']'
  const start = jsonStr.indexOf('[');
  const end = jsonStr.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Risposta AI non contiene un array JSON valido');
  }

  jsonStr = jsonStr.slice(start, end + 1);

  // Tentativo 1: parse diretto
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Array JSON vuoto o non valido');
    }
    return parsed;
  } catch (_firstErr) {
    // Tentativo 2: riparazione JSON
    try {
      const repaired = repairJSON(jsonStr);
      const parsed = JSON.parse(repaired);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Array JSON vuoto dopo riparazione');
      }
      console.log('[CourseGenerator] JSON riparato con successo');
      return parsed;
    } catch (err) {
      throw new Error(`Errore parsing JSON syllabus: ${err instanceof Error ? err.message : 'formato non valido'}`);
    }
  }
}

function formatLesson(raw: RawLesson, index: number): CourseLesson {
  const assessment: AssessmentQuestion[] = (raw.assessment || []).map((q) => ({
    id: generateId(),
    question: q.question || 'Domanda mancante',
    options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
    correctIndex: typeof q.correctIndex === 'number' ? Math.min(q.correctIndex, 3) : 0,
    explanation: q.explanation || '',
    sources: (q.sources || []).map(formatSource),
  }));

  const sources: ContentSource[] = (raw.sources || []).map(formatSource);

  return {
    id: generateId(),
    index,
    title: raw.title || `Lezione ${index + 1}`,
    description: raw.description || '',
    objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
    status: index === 0 ? 'available' : 'locked',
    taskType: 'lesson',
    assessment: assessment.length > 0 ? assessment : undefined,
    sources: sources.length > 0 ? sources : undefined,
  };
}

function formatSource(raw: RawSource): ContentSource {
  const validTypes = ['academic', 'institutional', 'professional', 'general'] as const;
  const type = validTypes.includes(raw.type as typeof validTypes[number])
    ? (raw.type as ContentSource['type'])
    : 'general';

  return {
    title: raw.title || 'Fonte non specificata',
    url: raw.url || undefined,
    type,
    credibility: (typeof raw.credibility === 'number' && raw.credibility >= 1 && raw.credibility <= 5)
      ? raw.credibility as ContentSource['credibility']
      : 3,
  };
}
