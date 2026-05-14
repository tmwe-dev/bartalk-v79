/**
 * @module voiceSuggester
 * ElevenLabs voice suggestion utility.
 * Suggests optimal ElevenLabs voices based on the current UI language
 * and agent gender preferences.
 */

import { TTS } from './constants';

// ── Interface for ElevenLabs voice ──────────────────────────────────────
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

// ── Interface for voice suggestion result ──────────────────────────────────
export interface VoiceSuggestion {
  agentName: string;
  voiceId: string;
  voiceName: string;
  previewUrl?: string;
}

// ── Language code mapping (ISO 639-1 to full names and vice versa) ──────────
const LANG_CODE_MAP: Record<string, string> = {
  // ISO 639-1 codes to names
  en: 'english',
  it: 'italian',
  es: 'spanish',
  fr: 'french',
  de: 'german',
  pt: 'portuguese',
  nl: 'dutch',
  pl: 'polish',
  sv: 'swedish',
  no: 'norwegian',
  da: 'danish',
  fi: 'finnish',
  tr: 'turkish',
  ru: 'russian',
  ja: 'japanese',
  ko: 'korean',
  zh: 'chinese',
  ar: 'arabic',
  hi: 'hindi',
  cs: 'czech',
  ro: 'romanian',
  el: 'greek',
  hu: 'hungarian',
  hr: 'croatian',
  id: 'indonesian',
  ms: 'malay',
  ta: 'tamil',
  fil: 'filipino',
  uk: 'ukrainian',
  vi: 'vietnamese',
  th: 'thai',
  bg: 'bulgarian',
  sk: 'slovak',
  ca: 'catalan',
  // Extended names to ISO codes
  english: 'en',
  italian: 'it',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  portuguese: 'pt',
  dutch: 'nl',
  polish: 'pl',
  swedish: 'sv',
  norwegian: 'no',
  danish: 'da',
  finnish: 'fi',
  turkish: 'tr',
  russian: 'ru',
  japanese: 'ja',
  korean: 'ko',
  chinese: 'zh',
  arabic: 'ar',
  hindi: 'hi',
  czech: 'cs',
  romanian: 'ro',
  greek: 'el',
  hungarian: 'hu',
  croatian: 'hr',
  indonesian: 'id',
  malay: 'ms',
  tamil: 'ta',
  filipino: 'fil',
  ukrainian: 'uk',
  vietnamese: 'vi',
  thai: 'th',
  bulgarian: 'bg',
  slovak: 'sk',
  catalan: 'ca',
};

/**
 * Normalizes a language code or name to ISO 639-1 code.
 * Handles both codes (e.g., 'en', 'it') and full names (e.g., 'english', 'italian')
 */
function normalizeLanguageCode(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  // If it's already a code or maps to a code, return it
  return LANG_CODE_MAP[normalized] || normalized;
}

/**
 * Checks if a voice matches the target language based on its labels
 */
function voiceMatchesLanguage(
  voice: ElevenLabsVoice,
  targetLangCode: string
): boolean {
  if (!voice.labels) return false;

  const language = voice.labels.language?.toLowerCase() || '';
  const accent = voice.labels.accent?.toLowerCase() || '';

  // Direct code match (e.g., 'en' in 'en', or 'english' in 'english')
  if (language.includes(targetLangCode)) return true;
  if (accent.includes(targetLangCode)) return true;

  // Try to match by name (e.g., if targetLangCode is 'en', it might also be 'english')
  const langName = LANG_CODE_MAP[targetLangCode];
  if (langName) {
    if (language.includes(langName)) return true;
    if (accent.includes(langName)) return true;
  }

  // Reverse: if targetLangCode is a full name like 'english', look for 'en'
  const langCode = normalizeLanguageCode(targetLangCode);
  if (langCode !== targetLangCode) {
    if (language.includes(langCode)) return true;
    if (accent.includes(langCode)) return true;
  }

  return false;
}

/**
 * Gets the gender of a voice from its labels, if available
 */
function getVoiceGender(voice: ElevenLabsVoice): 'male' | 'female' | 'unknown' {
  if (!voice.labels?.gender) return 'unknown';
  const gender = voice.labels.gender.toLowerCase();
  if (gender.includes('male')) return 'male';
  if (gender.includes('female')) return 'female';
  return 'unknown';
}

/**
 * Main function: suggests ElevenLabs voices matching a target language
 *
 * @param targetLang ISO 639-1 language code (e.g., 'en', 'it', 'fr') or full name
 * @param voices Full ElevenLabs voice catalog
 * @param agentNames Array of agent names to suggest voices for (e.g., ['albert', 'archimede', 'pitagora', 'newton'])
 * @returns Array of voice suggestions, one per agent, or empty if insufficient matches
 */
export function suggestVoicesForLanguage(
  targetLang: string,
  voices: ElevenLabsVoice[],
  agentNames: string[]
): VoiceSuggestion[] {
  // Normalize the target language code
  const normalizedLang = normalizeLanguageCode(targetLang);

  // Filter voices that match the target language
  const matchingVoices = voices.filter(voice =>
    voiceMatchesLanguage(voice, normalizedLang)
  );

  // If we have fewer than the requested number of agents, return empty
  if (matchingVoices.length < agentNames.length) {
    return [];
  }

  // Select diverse voices (try to alternate gender if available)
  const selected: ElevenLabsVoice[] = [];
  const genderDistribution = { male: 0, female: 0, unknown: 0 };

  for (const voice of matchingVoices) {
    if (selected.length >= agentNames.length) break;

    const gender = getVoiceGender(voice);
    // Prefer genders that are least represented so far
    const genderCounts = [genderDistribution.male, genderDistribution.female, genderDistribution.unknown];
    const minCount = Math.min(...genderCounts);

    // Add if this gender is underrepresented, or if we need to fill remaining spots
    if (genderDistribution[gender] === minCount || selected.length === agentNames.length - 1) {
      selected.push(voice);
      genderDistribution[gender]++;
    }
  }

  // If we couldn't fill all slots, return empty
  if (selected.length < agentNames.length) {
    return [];
  }

  // Map voices to agent suggestions
  return selected.map((voice, index) => ({
    agentName: agentNames[index],
    voiceId: voice.voice_id,
    voiceName: voice.name,
    previewUrl: voice.preview_url,
  }));
}

/**
 * Fetches voices from ElevenLabs API and suggests matching voices for a language
 *
 * @param targetLang ISO 639-1 language code (e.g., 'en', 'it') or full name
 * @param apiKey ElevenLabs API key
 * @param agentNames Array of agent names (e.g., ['albert', 'archimede', 'pitagora', 'newton'])
 * @returns Array of voice suggestions, or empty array if fetch fails or insufficient matches
 */
export async function fetchAndSuggestVoices(
  targetLang: string,
  apiKey: string,
  agentNames: string[]
): Promise<VoiceSuggestion[]> {
  try {
    const response = await fetch(`${TTS.apiBase}/voices`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (!response.ok) {
      console.error(
        '[voiceSuggester] Failed to fetch voices:',
        response.status,
        response.statusText
      );
      return [];
    }

    const data = await response.json();
    const voices = data.voices || [];

    // Use the main suggestion function
    return suggestVoicesForLanguage(targetLang, voices, agentNames);
  } catch (error) {
    console.error('[voiceSuggester] Error fetching voices:', error);
    return [];
  }
}
