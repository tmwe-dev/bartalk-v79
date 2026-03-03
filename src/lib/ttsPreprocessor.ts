/**
 * TTS Preprocessor — Pulizia e normalizzazione testo per lettura vocale.
 *
 * Gestisce:
 * 1. Markdown → testo pulito (bold, italic, headers, liste, link, code)
 * 2. Sigle e acronimi → espansione o spaziatura fonetica
 * 3. Numeri, date, valute → forme leggibili
 * 4. Punteggiatura → pause naturali
 * 5. Emoji → rimozione o descrizione
 * 6. Caratteri speciali → pulizia
 */

// ── Knowledge Base: Sigle comuni (IT/EN) ─────────────────────────────

const ACRONYM_KB: Record<string, Record<string, string>> = {
  // Tech
  'API':   { it: 'A P I', en: 'A P I' },
  'UI':    { it: 'U I', en: 'U I' },
  'UX':    { it: 'U X', en: 'U X' },
  'AI':    { it: 'A I', en: 'A I' },
  'ML':    { it: 'emme elle', en: 'M L' },
  'CSS':   { it: 'ci esse esse', en: 'C S S' },
  'HTML':  { it: 'acca ti emme elle', en: 'H T M L' },
  'HTTP':  { it: 'acca ti ti pi', en: 'H T T P' },
  'HTTPS': { it: 'acca ti ti pi esse', en: 'H T T P S' },
  'URL':   { it: 'U R L', en: 'U R L' },
  'SQL':   { it: 'esse cu elle', en: 'S Q L' },
  'SDK':   { it: 'esse di cappa', en: 'S D K' },
  'IDE':   { it: 'I D E', en: 'I D E' },
  'REST':  { it: 'rest', en: 'rest' },
  'JSON':  { it: 'jason', en: 'jason' },
  'XML':   { it: 'ics emme elle', en: 'X M L' },
  'PDF':   { it: 'pi di effe', en: 'P D F' },
  'CPU':   { it: 'ci pi u', en: 'C P U' },
  'GPU':   { it: 'gi pi u', en: 'G P U' },
  'RAM':   { it: 'ram', en: 'ram' },
  'SSD':   { it: 'esse esse di', en: 'S S D' },
  'DNS':   { it: 'di enne esse', en: 'D N S' },
  'TCP':   { it: 'ti ci pi', en: 'T C P' },
  'IP':    { it: 'I P', en: 'I P' },
  'VPN':   { it: 'vi pi enne', en: 'V P N' },
  'SSH':   { it: 'esse esse acca', en: 'S S H' },
  'FTP':   { it: 'effe ti pi', en: 'F T P' },
  'IoT':   { it: 'I o T', en: 'I o T' },
  'SaaS':  { it: 'saas', en: 'saas' },
  'TTS':   { it: 'ti ti esse', en: 'T T S' },
  'NLP':   { it: 'enne elle pi', en: 'N L P' },
  'LLM':   { it: 'elle elle emme', en: 'L L M' },
  'GPT':   { it: 'gi pi ti', en: 'G P T' },
  'AWS':   { it: 'A W S', en: 'A W S' },
  'GCP':   { it: 'gi ci pi', en: 'G C P' },

  // Business / Finance
  'CEO':   { it: 'ci i o', en: 'C E O' },
  'CTO':   { it: 'ci ti o', en: 'C T O' },
  'CFO':   { it: 'ci effe o', en: 'C F O' },
  'COO':   { it: 'ci o o', en: 'C O O' },
  'ROI':   { it: 'erre o i', en: 'R O I' },
  'KPI':   { it: 'cappa pi i', en: 'K P I' },
  'B2B':   { it: 'bi tu bi', en: 'B to B' },
  'B2C':   { it: 'bi tu ci', en: 'B to C' },
  'PMI':   { it: 'pi emme i', en: 'P M I' },
  'PIL':   { it: 'pi i elle', en: 'G D P' },
  'IVA':   { it: 'i va', en: 'V A T' },
  'GDPR':  { it: 'gi di pi erre', en: 'G D P R' },
  'PCI':   { it: 'pi ci i', en: 'P C I' },
  'DSS':   { it: 'di esse esse', en: 'D S S' },
  'SLA':   { it: 'esse elle a', en: 'S L A' },
  'ERP':   { it: 'e erre pi', en: 'E R P' },
  'CRM':   { it: 'ci erre emme', en: 'C R M' },
  'FAQ':   { it: 'faq', en: 'F A Q' },
  'OKR':   { it: 'o cappa erre', en: 'O K R' },

  // Security
  'OAuth': { it: 'o auth', en: 'o auth' },
  '2FA':   { it: 'doppia effe a', en: 'two F A' },
  'MFA':   { it: 'emme effe a', en: 'M F A' },
  'SSO':   { it: 'esse esse o', en: 'S S O' },
  'JWT':   { it: 'gi doppiavu ti', en: 'J W T' },

  // General
  'USA':   { it: 'U S A', en: 'U S A' },
  'UE':    { it: 'u e', en: 'E U' },
  'EU':    { it: 'e u', en: 'E U' },
  'ONU':   { it: 'o enne u', en: 'U N' },
  'NATO':  { it: 'nato', en: 'nato' },
  'FIFA':  { it: 'fifa', en: 'fifa' },
  'UNESCO': { it: 'unesco', en: 'unesco' },
  'OMS':   { it: 'o emme esse', en: 'W H O' },
  'WHO':   { it: 'o emme esse', en: 'W H O' },
};

// ── KB: Simboli e caratteri speciali ─────────────────────────────────

const SYMBOL_KB: Record<string, Record<string, string>> = {
  '€':  { it: 'euro', en: 'euros' },
  '$':  { it: 'dollari', en: 'dollars' },
  '£':  { it: 'sterline', en: 'pounds' },
  '¥':  { it: 'yen', en: 'yen' },
  '%':  { it: 'percento', en: 'percent' },
  '&':  { it: 'e', en: 'and' },
  '@':  { it: 'chiocciola', en: 'at' },
  '#':  { it: 'cancelletto', en: 'hashtag' },
  '→':  { it: ', quindi, ', en: ', then, ' },
  '←':  { it: ', da, ', en: ', from, ' },
  '↔':  { it: ', tra, ', en: ', between, ' },
  '✓':  { it: 'sì', en: 'yes' },
  '✕':  { it: 'no', en: 'no' },
  '✗':  { it: 'no', en: 'no' },
  '•':  { it: '. ', en: '. ' },
  '·':  { it: ' ', en: ' ' },
  '…':  { it: '... ', en: '... ' },
  '—':  { it: ', ', en: ', ' },
  '–':  { it: ', ', en: ', ' },
  '|':  { it: ', ', en: ', ' },
  '/':  { it: ' o ', en: ' or ' },
};

// ── KB: Unità di misura ──────────────────────────────────────────────

const UNIT_KB: Array<{ pattern: RegExp; replace: (m: RegExpExecArray, lang: string) => string }> = [
  { pattern: /(\d+)\s*KB/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'chilobyte' : 'kilobytes'}` },
  { pattern: /(\d+)\s*MB/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'megabyte' : 'megabytes'}` },
  { pattern: /(\d+)\s*GB/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'gigabyte' : 'gigabytes'}` },
  { pattern: /(\d+)\s*TB/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'terabyte' : 'terabytes'}` },
  { pattern: /(\d+)\s*ms/g, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'millisecondi' : 'milliseconds'}` },
  { pattern: /(\d+)\s*px/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'pixel' : 'pixels'}` },
  { pattern: /(\d+)\s*km\/h/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'chilometri orari' : 'kilometers per hour'}` },
  { pattern: /(\d+)\s*km/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'chilometri' : 'kilometers'}` },
  { pattern: /(\d+)\s*kg/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'chili' : 'kilograms'}` },
  { pattern: /(\d+)\s*mg/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'milligrammi' : 'milligrams'}` },
  { pattern: /(\d+)\s*cm/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'centimetri' : 'centimeters'}` },
  { pattern: /(\d+)\s*mm/gi, replace: (m, lang) => `${m[1]} ${lang === 'it' ? 'millimetri' : 'millimeters'}` },
];

// ── Funzioni di trasformazione ───────────────────────────────────────

/** Determina la lingua base (it/en) per le KB */
function baseLang(lang: string): 'it' | 'en' {
  const l = lang.toLowerCase().slice(0, 2);
  if (l === 'it') return 'it';
  if (l === 'es' || l === 'pt' || l === 'fr') return 'it'; // lingue neolatine → fonetica italiana
  return 'en';
}

/** 1. Rimuovi markdown formatting */
function stripMarkdown(text: string): string {
  let t = text;

  // Headers: ## Title → Title.
  t = t.replace(/^#{1,6}\s+(.+)$/gm, '$1.');

  // Bold + Italic: ***text*** or ___text___
  t = t.replace(/\*{3}(.+?)\*{3}/g, '$1');
  t = t.replace(/_{3}(.+?)_{3}/g, '$1');

  // Bold: **text** or __text__
  t = t.replace(/\*{2}(.+?)\*{2}/g, '$1');
  t = t.replace(/_{2}(.+?)_{2}/g, '$1');

  // Italic: *text* or _text_
  t = t.replace(/\*(.+?)\*/g, '$1');
  t = t.replace(/_(.+?)_/g, '$1');

  // Strikethrough: ~~text~~
  t = t.replace(/~~(.+?)~~/g, '$1');

  // Inline code: `code`
  t = t.replace(/`([^`]+)`/g, '$1');

  // Code blocks: ```...```
  t = t.replace(/```[\s\S]*?```/g, '');

  // Links: [text](url) → text
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Images: ![alt](url) → rimuovi
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // Bullet lists: - item or * item → item con pausa
  t = t.replace(/^[\s]*[-*+]\s+/gm, '. ');

  // Numbered lists: 1. item → item con pausa
  t = t.replace(/^[\s]*\d+\.\s+/gm, '. ');

  // Blockquotes: > text
  t = t.replace(/^>\s*/gm, '');

  // Horizontal rules: --- or ***
  t = t.replace(/^[-*_]{3,}$/gm, '. ');

  // Tables: | col | col | → spazi
  t = t.replace(/\|/g, ', ');
  t = t.replace(/^[-:]+[,\s]+[-:,\s]+$/gm, '');

  return t;
}

/** 2. Espandi sigle e acronimi */
function expandAcronyms(text: string, lang: string): string {
  const bl = baseLang(lang);
  let t = text;

  // Sigle note dalla KB
  for (const [acronym, translations] of Object.entries(ACRONYM_KB)) {
    const expansion = translations[bl] || translations.en;
    // Match parola intera, case-insensitive per la maggior parte
    const regex = new RegExp(`\\b${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    t = t.replace(regex, expansion);
  }

  // Sigle generiche non riconosciute (2-5 lettere maiuscole) → spaziate
  t = t.replace(/\b([A-Z]{2,5})\b/g, (match) => {
    // Se è già stata espansa o è una parola comune, non toccare
    const common = ['IO', 'AI', 'IT', 'SE', 'NO', 'OR', 'AN', 'IN', 'ON', 'AT', 'TO', 'IS', 'OK', 'UP', 'GO', 'DO', 'SO', 'MY', 'HE', 'WE', 'US', 'AM', 'BE'];
    if (common.includes(match)) return match;
    return match.split('').join(' ');
  });

  return t;
}

/** 3. Normalizza numeri, date, valute */
function normalizeNumbers(text: string, lang: string): string {
  const bl = baseLang(lang);
  let t = text;

  // Unità di misura
  for (const unit of UNIT_KB) {
    let match: RegExpExecArray | null;
    const re = new RegExp(unit.pattern.source, unit.pattern.flags);
    while ((match = re.exec(t)) !== null) {
      const replacement = unit.replace(match, bl);
      t = t.slice(0, match.index) + replacement + t.slice(match.index + match[0].length);
      re.lastIndex = match.index + replacement.length;
    }
  }

  // Valute: €100 → 100 euro, $50 → 50 dollari
  t = t.replace(/€\s*(\d[\d.,]*)/g, (_, n) => `${n} ${bl === 'it' ? 'euro' : 'euros'}`);
  t = t.replace(/\$\s*(\d[\d.,]*)/g, (_, n) => `${n} ${bl === 'it' ? 'dollari' : 'dollars'}`);
  t = t.replace(/£\s*(\d[\d.,]*)/g, (_, n) => `${n} ${bl === 'it' ? 'sterline' : 'pounds'}`);

  // Percentuali: 15% → 15 percento
  t = t.replace(/(\d[\d.,]*)\s*%/g, (_, n) => `${n} ${bl === 'it' ? 'percento' : 'percent'}`);

  // Numeri con separatori: 1.000.000 o 1,000,000 → leggi naturalmente
  // In italiano: 1.000 = mille, in inglese: 1,000 = one thousand
  // Lasciamo che il TTS gestisca i numeri puri, ma rimuoviamo formattazioni ambigue

  // Versioni software: v2.0.1 → versione 2 punto 0 punto 1
  t = t.replace(/\bv(\d+)\.(\d+)(?:\.(\d+))?\b/gi, (_, major, minor, patch) => {
    const dot = bl === 'it' ? 'punto' : 'point';
    return patch !== undefined
      ? `${bl === 'it' ? 'versione' : 'version'} ${major} ${dot} ${minor} ${dot} ${patch}`
      : `${bl === 'it' ? 'versione' : 'version'} ${major} ${dot} ${minor}`;
  });

  // Range: 10-20 → da 10 a 20
  t = t.replace(/(\d+)\s*-\s*(\d+)/g, (_, a, b) => {
    return bl === 'it' ? `da ${a} a ${b}` : `${a} to ${b}`;
  });

  // Frazioni: 1/2, 3/4
  const fractions: Record<string, Record<string, string>> = {
    '1/2': { it: 'un mezzo', en: 'one half' },
    '1/3': { it: 'un terzo', en: 'one third' },
    '2/3': { it: 'due terzi', en: 'two thirds' },
    '1/4': { it: 'un quarto', en: 'one quarter' },
    '3/4': { it: 'tre quarti', en: 'three quarters' },
  };
  for (const [frac, trans] of Object.entries(fractions)) {
    t = t.replaceAll(frac, trans[bl] || trans.en);
  }

  return t;
}

/** 4. Sostituisci simboli */
function replaceSymbols(text: string, lang: string): string {
  const bl = baseLang(lang);
  let t = text;

  for (const [sym, translations] of Object.entries(SYMBOL_KB)) {
    const replacement = translations[bl] || translations.en;
    // Usa replaceAll per simboli semplici
    if (sym.length === 1) {
      t = t.replaceAll(sym, ` ${replacement} `);
    }
  }

  return t;
}

/** 5. Rimuovi emoji (mantieni solo testo) */
function stripEmoji(text: string): string {
  // Rimuovi tutti i codepoint emoji
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}]+/gu, ' ');
}

/** 6. Normalizza punteggiatura per pause naturali */
function normalizePunctuation(text: string): string {
  let t = text;

  // Multipli punti esclamativi/interrogativi → singolo
  t = t.replace(/!{2,}/g, '!');
  t = t.replace(/\?{2,}/g, '?');

  // Ellissi → pausa
  t = t.replace(/\.{3,}/g, '... ');

  // Parentesi → virgole per pausa naturale
  t = t.replace(/\s*\(\s*/g, ', ');
  t = t.replace(/\s*\)\s*/g, ', ');

  // Parentesi quadre → rimuovi
  t = t.replace(/\[/g, '');
  t = t.replace(/\]/g, '');

  // Graffe → rimuovi
  t = t.replace(/[{}]/g, '');

  // Virgolette → pausa leggera
  t = t.replace(/["«»""]/g, '');
  t = t.replace(/'/g, '\'');

  // Doppio due punti o punto-virgola ridondante
  t = t.replace(/:\s*:/g, ':');
  t = t.replace(/;\s*;/g, ';');

  // Due punti seguiti da elenco → pausa
  t = t.replace(/:\s*\./g, '. ');

  return t;
}

/** 7. Pulizia finale: spazi multipli, trim */
function cleanWhitespace(text: string): string {
  let t = text;

  // Rimuovi righe vuote multiple
  t = t.replace(/\n{3,}/g, '\n\n');

  // Newlines → pausa naturale (punto + spazio)
  t = t.replace(/\n+/g, '. ');

  // Spazi multipli → singolo
  t = t.replace(/\s{2,}/g, ' ');

  // Virgole/punti doppi
  t = t.replace(/,\s*,/g, ',');
  t = t.replace(/\.\s*\./g, '.');
  t = t.replace(/,\s*\./g, '.');
  t = t.replace(/\.\s*,/g, '.');

  // Spazio prima di punteggiatura
  t = t.replace(/\s+([.,;:!?])/g, '$1');

  // Trim
  t = t.trim();

  return t;
}

// ══════════════════════════════════════════════════════════════════════
//  PIPELINE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════

/**
 * Preprocessa il testo per la lettura TTS.
 * Applica tutte le trasformazioni in sequenza.
 *
 * @param text - Testo grezzo (potenzialmente con markdown, sigle, ecc.)
 * @param lang - Codice lingua (es. 'it', 'en', 'it-IT', 'en-US')
 * @returns Testo pulito e ottimizzato per la lettura vocale
 */
export function preprocessForTTS(text: string, lang: string = 'it'): string {
  if (!text || !text.trim()) return '';

  let processed = text;

  // Pipeline di trasformazione (ordine importante!)
  processed = stripMarkdown(processed);       // 1. Rimuovi markdown
  processed = stripEmoji(processed);           // 2. Rimuovi emoji
  processed = expandAcronyms(processed, lang); // 3. Espandi sigle
  processed = normalizeNumbers(processed, lang); // 4. Numeri e unità
  processed = replaceSymbols(processed, lang); // 5. Simboli
  processed = normalizePunctuation(processed); // 6. Punteggiatura
  processed = cleanWhitespace(processed);      // 7. Pulizia finale

  return processed;
}

// ══════════════════════════════════════════════════════════════════════
//  KB PROMPT: Istruzioni per gli agenti AI sulla formattazione TTS
// ══════════════════════════════════════════════════════════════════════

/**
 * Genera il blocco KB/prompt da iniettare nel system prompt
 * per guidare gli agenti a scrivere in modo TTS-friendly.
 */
export function buildTTSKnowledgeBase(lang: string = 'it'): string {
  const bl = baseLang(lang);

  if (bl === 'it') {
    return `
📢 ISTRUZIONI LETTURA VOCALE (TTS)
Il tuo testo verrà letto ad alta voce. Segui queste regole per una lettura fluida:

STILE DI SCRITTURA:
- Scrivi in modo discorsivo e naturale, come se stessi parlando
- Evita elenchi puntati o numerati quando possibile; usa frasi connesse
- Preferisci frasi complete e scorrevoli rispetto a frammenti

SIGLE E ACRONIMI:
- Alla prima menzione, espandi sempre la sigla: "OAuth, cioè Open Authorization"
- Per sigle tecniche molto note (API, URL, PDF), puoi usarle direttamente
- Evita catene di sigle ravvicinate; alterna con spiegazioni

NUMERI E DATI:
- Scrivi i numeri in lettere quando sono brevi: "tre", "dodici", "cento"
- Per numeri grandi, usa forme leggibili: "2 milioni" invece di "2.000.000"
- Per percentuali: "il 15 percento" invece di "15%"
- Per valute: "100 euro" invece di "€100"
- Per versioni software: "versione 2 punto 0" invece di "v2.0"

PUNTEGGIATURA:
- Usa punti e virgole per creare pause naturali nel discorso
- Evita parentesi multiple o annidate
- Evita eccessiva formattazione con asterischi, trattini o simboli
- Preferisci frasi brevi e chiare

FORMATTAZIONE:
- Non usare markdown (grassetto, corsivo, headers, code blocks)
- Non usare tabelle o strutture complesse
- Non usare emoji nei punti chiave del discorso
- Non usare caratteri speciali come →, ←, •, |
`.trim();
  }

  return `
📢 TEXT-TO-SPEECH GUIDELINES
Your text will be read aloud. Follow these rules for smooth reading:

WRITING STYLE:
- Write conversationally, as if you were speaking naturally
- Avoid bullet points or numbered lists when possible; use connected sentences
- Prefer complete, flowing sentences over fragments

ACRONYMS AND ABBREVIATIONS:
- On first mention, always expand: "OAuth, meaning Open Authorization"
- For well-known tech acronyms (API, URL, PDF), you may use them directly
- Avoid chaining multiple acronyms together; alternate with explanations

NUMBERS AND DATA:
- Write small numbers as words: "three", "twelve", "a hundred"
- For large numbers, use readable forms: "2 million" instead of "2,000,000"
- For percentages: "15 percent" instead of "15%"
- For currencies: "100 dollars" instead of "$100"
- For versions: "version 2 point 0" instead of "v2.0"

PUNCTUATION:
- Use periods and commas to create natural pauses
- Avoid multiple or nested parentheses
- Avoid excessive formatting with asterisks, dashes, or symbols
- Prefer short, clear sentences

FORMATTING:
- Do not use markdown (bold, italic, headers, code blocks)
- Do not use tables or complex structures
- Do not use emoji in key discussion points
- Do not use special characters like →, ←, •, |
`.trim();
}
