/**
 * @module maestro/parsing
 * Maestro response parsing and language detection.
 * Extracts metadata, pronunciation exercises, and L2 tags from maestro responses.
 * Detects study languages from course topics using multilingual pattern matching.
 */

import type { EmotionalState } from '../../types/maestro';

/** Metadata structure extracted from maestro responses */
interface MaestroMeta {
  emotion: EmotionalState;
  coveredObjective: number;
  teachingAction: string;
  teacherNote: string;
}

/**
 * Parse a maestro response to extract text, metadata, and pronunciation exercises
 */
export function parseResponse(content: string): {
  text: string;
  textWithL2Tags: string;
  meta: MaestroMeta | null;
  pronunciationExercise: string | null;
} {
  const metaMatch = content.match(/<!--MAESTRO_META:(.*?)-->/s);
  let meta: MaestroMeta | null = null;

  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1]);
    } catch {
      // Ignore parse errors
    }
  }

  // Extract pronunciation exercise tag
  const pronMatch = content.match(/\[PRONUNCIA:\s*(.*?)\]/i);
  const pronunciationExercise = pronMatch ? pronMatch[1].trim() : null;

  // Rimuovi meta e tag pronuncia, ma conserva [L2:...] per il TTS dual-voice
  const textWithL2Tags = content
    .replace(/<!--MAESTRO_META:.*?-->/s, '')
    .replace(/\[PRONUNCIA:\s*.*?\]/gi, '')
    .trim();

  // Testo visibile: rimuovi anche i tag [L2:...], mostrando solo il contenuto interno
  const text = textWithL2Tags
    .replace(/\[L2:\s*(.*?)\]/gi, '$1')
    .trim();

  return { text, textWithL2Tags, meta, pronunciationExercise };
}

/**
 * Detect the language being studied from course topic/title
 */
export function detectStudyLanguage(topic: string, title: string): string | null {
  const text = `${topic} ${title}`.toLowerCase();

  const langPatterns: [RegExp, string][] = [
    [/\b(english|inglese|anglais|englisch|inglés)\b/i, 'en'],
    [/\b(french|francese|français|französisch|francés)\b/i, 'fr'],
    [/\b(german|tedesco|deutsch|allemand|alemán)\b/i, 'de'],
    [/\b(spanish|spagnolo|español|espagnol|spanisch)\b/i, 'es'],
    [/\b(portuguese|portoghese|português|portugais|portugiesisch)\b/i, 'pt'],
    [/\b(chinese|cinese|中文|chinois|chinesisch)\b/i, 'zh'],
    [/\b(japanese|giapponese|日本語|japonais|japanisch)\b/i, 'ja'],
    [/\b(korean|coreano|한국어|coréen|koreanisch)\b/i, 'ko'],
    [/\b(russian|russo|русский|russe|russisch)\b/i, 'ru'],
    [/\b(arabic|arabo|العربية|arabe|arabisch)\b/i, 'ar'],
    [/\b(italian|italiano|italien|italienisch)\b/i, 'it'],
    [/\b(dutch|olandese|néerlandais|niederländisch|holandés)\b/i, 'nl'],
    [/\b(swedish|svedese|suédois|schwedisch|sueco)\b/i, 'sv'],
    [/\b(polish|polacco|polonais|polnisch|polaco)\b/i, 'pl'],
    [/\b(turkish|turco|turc|türkisch|turco)\b/i, 'tr'],
    [/\b(hindi|hindi)\b/i, 'hi'],
    [/\b(thai|tailandese|thaïlandais)\b/i, 'th'],
    [/\b(vietnamese|vietnamita)\b/i, 'vi'],
    [/\b(greek|greco|grec|griechisch)\b/i, 'el'],
    [/\b(hebrew|ebraico|hébreu|hebräisch)\b/i, 'he'],
    // Pattern con codice livello CEFR
    [/\b(b1|b2|a1|a2|c1|c2)\s+(en|eng)\b/i, 'en'],
    [/\b(b1|b2|a1|a2|c1|c2)\s+(fr|fra)\b/i, 'fr'],
    [/\b(b1|b2|a1|a2|c1|c2)\s+(de|deu)\b/i, 'de'],
    [/\b(b1|b2|a1|a2|c1|c2)\s+(es|esp)\b/i, 'es'],
  ];

  for (const [pattern, code] of langPatterns) {
    if (pattern.test(text)) return code;
  }

  return null;
}

/** Get human-readable label for a language code */
export function getStudyLangLabel(code: string): string {
  const labels: Record<string, string> = {
    it: 'italiano', en: 'inglese', es: 'spagnolo', fr: 'francese',
    de: 'tedesco', pt: 'portoghese', zh: 'cinese', ja: 'giapponese',
    ko: 'coreano', th: 'tailandese', ar: 'arabo', hi: 'hindi',
    bn: 'bengalese', ru: 'russo', tr: 'turco', vi: 'vietnamita',
    pl: 'polacco', uk: 'ucraino', nl: 'olandese', ro: 'rumeno',
    el: 'greco', cs: 'ceco', hu: 'ungherese', sv: 'svedese',
    da: 'danese', fi: 'finlandese', no: 'norvegese', id: 'indonesiano',
    ms: 'malese', tl: 'filippino', he: 'ebraico', fa: 'persiano',
    ur: 'urdu', sw: 'swahili', sk: 'slovacco', bg: 'bulgaro',
    hr: 'croato', sr: 'serbo', sl: 'sloveno', lt: 'lituano',
    lv: 'lettone', et: 'estone', ta: 'tamil', te: 'telugu',
    ml: 'malayalam', kn: 'kannada', gu: 'gujarati', mr: 'marathi',
    pa: 'punjabi', ne: 'nepalese', si: 'singalese', my: 'birmano',
    km: 'cambogiano', lo: 'laotiano', ka: 'georgiano', hy: 'armeno',
    az: 'azerbaigiano', kk: 'kazako', uz: 'uzbeko', mk: 'macedone',
    bs: 'bosniaco', sq: 'albanese', is: 'islandese', ga: 'irlandese',
    cy: 'gallese', gl: 'galiziano', ca: 'catalano', eu: 'basco',
    af: 'afrikaans', am: 'amarico', ha: 'hausa', yo: 'yoruba',
    zu: 'zulu', xh: 'xhosa', mn: 'mongolo', lb: 'lussemburghese',
    mt: 'maltese', eo: 'esperanto',
  };
  return labels[code] || code;
}
