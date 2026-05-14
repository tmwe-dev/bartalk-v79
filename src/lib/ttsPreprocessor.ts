/**
 * @module ttsPreprocessor
 * TTS Preprocessor -- Minimal structural text cleanup for voice synthesis.
 *
 * Philosophy: code performs ONLY structural cleanup (markdown, emoji, whitespace).
 * All linguistic intelligence (acronyms, formulas, numbers, nomenclature)
 * is delegated to the AI prompt via {@link buildTTSKnowledgeBase}.
 *
 * This approach is language-agnostic: works identically for all 70+ supported
 * languages without hard-coded per-language data.
 *
 * Exports:
 * - {@link preprocessForTTS} -- Main cleanup pipeline
 * - {@link buildTTSKnowledgeBase} -- Full TTS prompt instructions for AI agents
 * - {@link buildTTSLightSection} -- Compact TTS prompt for structured prompts
 */

// ── Funzioni di pulizia strutturale ─────────────────────────────────

/** Rimuovi markdown formatting → testo pulito */
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

  // Code blocks BEFORE inline code (```...``` contiene backtick che inline code consumerebbe)
  t = t.replace(/```[\s\S]*?```/g, '');

  // Inline code: `code`
  t = t.replace(/`([^`]+)`/g, '$1');

  // Images BEFORE links (![alt](url) verrebbe catturato da [text](url))
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // Links: [text](url) → text
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Bullet lists: - item or * item → pausa
  t = t.replace(/^[\s]*[-*+]\s+/gm, '. ');

  // Numbered lists: 1. item → pausa
  t = t.replace(/^[\s]*\d+\.\s+/gm, '. ');

  // Blockquotes: > text
  t = t.replace(/^>\s*/gm, '');

  // Horizontal rules: --- or ***
  t = t.replace(/^[-*_]{3,}$/gm, '. ');

  // Tables: | col | col | → virgole
  t = t.replace(/\|/g, ', ');
  t = t.replace(/^[-:]+[,\s]+[-:,\s]+$/gm, '');

  return t;
}

/** Rimuovi emoji (mantieni solo testo) */
function stripEmoji(text: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}]+/gu, ' ');
}

/** Normalizza punteggiatura per pause naturali */
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

  // Parentesi quadre e graffe → rimuovi
  t = t.replace(/[[\]{}]/g, '');

  // Virgolette → rimuovi
  t = t.replace(/["«»""]/g, '');
  t = t.replace(/'/g, '\'');

  // Due punti o punto-virgola doppi
  t = t.replace(/:\s*:/g, ':');
  t = t.replace(/;\s*;/g, ';');

  // Due punti seguiti da punto → pausa
  t = t.replace(/:\s*\./g, '. ');

  return t;
}

/** Pulizia finale: spazi multipli, trim */
function cleanWhitespace(text: string): string {
  let t = text;

  // Righe vuote multiple
  t = t.replace(/\n{3,}/g, '\n\n');

  // Newlines → pausa (punto + spazio)
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

  t = t.trim();

  return t;
}

// ══════════════════════════════════════════════════════════════════════
//  PIPELINE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════

/**
 * Preprocesses text for TTS reading by applying structural cleanup only.
 * No linguistic transformations -- that intelligence lives in the AI prompt.
 *
 * Pipeline: stripMarkdown -> stripEmoji -> normalizePunctuation -> cleanWhitespace
 *
 * @param text - Raw text to preprocess
 * @param _lang - Language code (reserved for future use, currently unused)
 * @returns Cleaned text suitable for TTS synthesis
 *
 * @example
 * ```ts
 * preprocessForTTS('## Hello **world**! 🎉') // => 'Hello world!'
 * ```
 */
export function preprocessForTTS(text: string, _lang = 'it'): string {
  if (!text || !text.trim()) return '';

  let processed = text;

  processed = stripMarkdown(processed);       // 1. Rimuovi markdown
  processed = stripEmoji(processed);           // 2. Rimuovi emoji
  processed = normalizePunctuation(processed); // 3. Punteggiatura
  processed = cleanWhitespace(processed);      // 4. Pulizia finale

  return processed;
}

// ══════════════════════════════════════════════════════════════════════
//  KB PROMPT: Istruzioni AI-driven per formattazione TTS-friendly
// ══════════════════════════════════════════════════════════════════════

/**
 * Generates the TTS instruction block to inject into AI agent system prompts.
 * Guides agents to write text optimized for voice synthesis.
 *
 * Approach: generic rules and objectives, NOT fixed per-language data.
 * The AI already knows all languages -- instructions describe WHAT to do, not HOW.
 *
 * @param lang - Current language code (e.g., 'it', 'en') for contextualizing instructions
 * @returns Multi-line prompt string with TTS writing rules
 */
export function buildTTSKnowledgeBase(lang: string = 'it'): string {
  // Rileva la famiglia linguistica per adattare leggermente le istruzioni
  const l = lang.toLowerCase().slice(0, 2);
  const langName = getLangDisplayName(l);

  return `
[TTS-MODE] Il tuo testo verrà letto ad alta voce da un sintetizzatore vocale nella lingua ${langName}.
Il tuo OBIETTIVO PRIMARIO è produrre testo che suoni naturale, fluido e chiaro quando pronunciato.

Scrivi come se stessi parlando a un pubblico dal vivo. Ogni frase deve essere comprensibile all'ascolto, senza ambiguità.

═══ REGOLE DI SCRITTURA ═══

1. STILE PARLATO
   Scrivi in modo discorsivo e naturale. Usa frasi connesse, non elenchi.
   Se devi elencare elementi, integrali nel flusso del discorso con connettori come "inoltre", "in aggiunta", "da un lato... dall'altro".
   Evita strutture visive (tabelle, elenchi puntati, intestazioni markdown, blocchi di codice).

2. SIGLE, ACRONIMI E ABBREVIAZIONI
   Quando usi una sigla per la prima volta, espandila nel modo più naturale per la lingua corrente.
   Esempio: non scrivere "l'OMS", ma "l'Organizzazione Mondiale della Sanità, nota come OMS".
   Per sigle universalmente note nella lingua corrente puoi usarle direttamente dopo la prima espansione.
   Se una sigla contiene numeri o trattini (come COVID-19, H1N1, 5G, USB-C, GPT-4), scrivi la forma parlata completa.
   Ad esempio: "COVID-19" diventa "covid diciannove" in italiano, "covid nineteen" in inglese.
   Adatta la pronuncia alla lingua corrente — tu conosci la fonetica corretta.

3. FORMULE, CODICI E NOMENCLATURA TECNICA
   Formule chimiche: scrivi il nome comune o la lettura parlata.
   Esempio: "CO2" → "anidride carbonica" o "ci o due" in italiano; "carbon dioxide" in inglese.
   Formule matematiche/fisiche: leggile come farebbe un professore che spiega a voce.
   Esempio: "E=mc²" → "e uguale emme ci al quadrato"; "a² + b² = c²" → "a al quadrato più b al quadrato uguale c al quadrato".
   Nomenclatura medica, ingegneristica, scientifica: usa sempre il termine completo parlato.
   Esempio: "MRI" → "risonanza magnetica"; "BPM" → "battiti al minuto"; "kWh" → "chilowattora".
   Codici e standard (ISO 9001, H.264, 1080p): leggili come farebbe un esperto che parla.

4. NUMERI, QUANTITÀ E MISURE
   Scrivi i numeri in una forma naturale per la lettura vocale.
   Numeri piccoli (fino a venti): usa la forma scritta in lettere.
   Numeri grandi: usa forme comprensibili ("2 milioni" non "2.000.000").
   Percentuali: "il quindici percento", non "15%".
   Valute: "cento euro", non "€100". Metti il numero prima della valuta.
   Versioni software: "versione due punto zero", non "v2.0".
   Date: scrivi in forma estesa ("3 marzo 2026", non "03/03/2026").
   Intervalli: "da dieci a venti", non "10-20".
   Unità di misura: scrivi il nome completo ("chilometri orari", non "km/h"; "millimetri di mercurio", non "mmHg").
   Frazioni: "un mezzo", "tre quarti", non "1/2", "3/4".

5. SIMBOLI E CARATTERI SPECIALI
   Non usare MAI simboli nel testo: →, ←, •, |, /, &, @, #, ², ³, √, π, Δ, Σ, ∫, ≈, ≠, ∞.
   Sostituiscili sempre con la loro espressione verbale nella lingua corrente.
   Simboli di valuta (€, $, £, ¥): metti sempre il numero prima e il nome della valuta dopo.
   Percentuale (%): scrivi sempre "percento" (o equivalente nella lingua corrente).

6. PUNTEGGIATURA PER IL PARLATO
   Usa punti e virgole per creare pause naturali nel ritmo del discorso.
   Frasi brevi e chiare. Evita subordinate troppo lunghe o annidate.
   Evita parentesi (usa incisi con virgole se necessario).
   Niente punti esclamativi o interrogativi multipli.

7. FORMATTAZIONE
   Non usare markdown (grassetto, corsivo, headers, code blocks).
   Non usare tabelle, elenchi puntati o numerati.
   Non usare emoji nei punti chiave del discorso.
   Scrivi solo testo piano, continuo, scorrevole.

═══ PRINCIPIO GUIDA ═══
Immagina di essere un oratore professionista che parla nella lingua ${langName}.
Se un ascoltatore chiudesse gli occhi, dovrebbe capire TUTTO perfettamente solo ascoltando.
Non ci sono elementi visivi — solo la tua voce. Ogni simbolo, sigla, formula o numero
deve diventare una parola pronunciabile e comprensibile nel contesto.
`.trim();
}

/**
 * Mappa codice lingua → nome leggibile per il prompt.
 * Copre le lingue principali; per lingue non mappate usa il codice ISO.
 */
function getLangDisplayName(code: string): string {
  const names: Record<string, string> = {
    it: 'italiana',
    en: 'inglese',
    es: 'spagnola',
    fr: 'francese',
    de: 'tedesca',
    pt: 'portoghese',
    nl: 'olandese',
    ru: 'russa',
    zh: 'cinese',
    ja: 'giapponese',
    ko: 'coreana',
    ar: 'araba',
    hi: 'hindi',
    pl: 'polacca',
    sv: 'svedese',
    da: 'danese',
    no: 'norvegese',
    fi: 'finlandese',
    tr: 'turca',
    el: 'greca',
    cs: 'ceca',
    ro: 'rumena',
    hu: 'ungherese',
    uk: 'ucraina',
    th: 'tailandese',
    vi: 'vietnamita',
    id: 'indonesiana',
    ms: 'malese',
    he: 'ebraica',
    bg: 'bulgara',
    hr: 'croata',
    sk: 'slovacca',
    sl: 'slovena',
    sr: 'serba',
    ca: 'catalana',
    eu: 'basca',
    gl: 'galiziana',
  };
  return names[code] || code.toUpperCase();
}

// ── TTS Light Section (restored from backup2) ────────────────────────

/**
 * Generates a compact TTS-MODE section for structured prompts.
 * Lighter than buildTTSKnowledgeBase, suitable for embedding in larger prompt compositions.
 *
 * @param lang - Current language code (default: 'it')
 * @returns Compact TTS instruction string
 */
export function buildTTSLightSection(lang: string = 'it'): string {
  const l = lang.toLowerCase().slice(0, 2);
  const langName = getLangDisplayName(l);

  return `
[TTS-MODE] Il testo verrà letto ad alta voce da un sintetizzatore vocale in ${langName}.
Scrivi come se stessi parlando a un pubblico dal vivo: testo piano, discorsivo, senza formattazione visiva.
- Niente markdown, elenchi puntati, tabelle, emoji, simboli (→ ← • | & @ # ²).
- Numeri piccoli in lettere, grandi in forma parlata ("due milioni" non "2.000.000").
- Sigle: espandile alla prima occorrenza, poi usa la sigla.
- Formule e codici: leggili come un professore che spiega a voce.
- Frasi di lunghezza variabile per creare ritmo naturale.
Ogni ascoltatore deve capire TUTTO perfettamente solo ascoltando.`.trim();
}


