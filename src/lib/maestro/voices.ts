/**
 * @module maestro/voices
 * ElevenLabs voice selection for maestro tutors.
 * Maps languages and genders to ElevenLabs voice IDs,
 * with fallbacks for unmapped languages.
 */

import type { MaestroDefinition } from '../../types/maestro';

/** Voci ElevenLabs per lingua e genere */
export const VOICE_BY_LANGUAGE: Record<string, { male: string; female: string }> = {
  it: { male: 'ErXwobaYiN019PkySvjV', female: 'EXAVITQu4vr4xnSDxMaL' },
  en: { male: 'TxGEqnHWrfWFTfGW9XjX', female: 'XB0fDUnXU5powFXDhCwa' },
  es: { male: 'GBv7mTt0atIp3Br8iCZE', female: 'XrExE9yKIg1WjnnlVkGX' },
  fr: { male: 'IKne3meq5aSn9XLyUdCD', female: 'ThT5KcBeYPX3keUQqHPh' },
  de: { male: 'cjVigY5qzO86Huf0OWal', female: 'XrExE9yKIg1WjnnlVkGX' },
  pt: { male: 'ErXwobaYiN019PkySvjV', female: 'EXAVITQu4vr4xnSDxMaL' },
  zh: { male: 'TxGEqnHWrfWFTfGW9XjX', female: 'XB0fDUnXU5powFXDhCwa' },
  ja: { male: 'TxGEqnHWrfWFTfGW9XjX', female: 'XB0fDUnXU5powFXDhCwa' },
  ko: { male: 'TxGEqnHWrfWFTfGW9XjX', female: 'XB0fDUnXU5powFXDhCwa' },
  ru: { male: 'GBv7mTt0atIp3Br8iCZE', female: 'ThT5KcBeYPX3keUQqHPh' },
  ar: { male: 'ErXwobaYiN019PkySvjV', female: 'EXAVITQu4vr4xnSDxMaL' },
  hi: { male: 'ErXwobaYiN019PkySvjV', female: 'EXAVITQu4vr4xnSDxMaL' },
  tr: { male: 'GBv7mTt0atIp3Br8iCZE', female: 'ThT5KcBeYPX3keUQqHPh' },
  pl: { male: 'ErXwobaYiN019PkySvjV', female: 'EXAVITQu4vr4xnSDxMaL' },
  nl: { male: 'GBv7mTt0atIp3Br8iCZE', female: 'ThT5KcBeYPX3keUQqHPh' },
  sv: { male: 'TxGEqnHWrfWFTfGW9XjX', female: 'XB0fDUnXU5powFXDhCwa' },
};

/** Ottieni la voce appropriata per un maestro in base alla lingua */
export function getVoiceForMaestro(maestro: MaestroDefinition, language: string): string {
  const langVoices = VOICE_BY_LANGUAGE[language];
  if (langVoices) {
    return maestro.gender === 'female' ? langVoices.female : langVoices.male;
  }
  return maestro.preferredVoiceId; // fallback voce default
}

/** Ottieni la voce ElevenLabs madrelingua per la lingua di studio */
export function getL2Voice(studyLangCode: string, gender: 'male' | 'female' = 'female'): string {
  const langVoices = VOICE_BY_LANGUAGE[studyLangCode];
  if (langVoices) {
    return gender === 'female' ? langVoices.female : langVoices.male;
  }
  // Fallback: voce inglese
  return gender === 'female' ? VOICE_BY_LANGUAGE['en'].female : VOICE_BY_LANGUAGE['en'].male;
}
