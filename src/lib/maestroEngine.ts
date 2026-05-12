/**
 * BarTalk v8 — Maestro Engine (Orchestration Layer)
 * Coordinates the maestro system by importing and re-exporting
 * from focused sub-modules, while keeping main orchestration functions.
 */

import type {
  MaestroDefinition,
  MaestroMessage,
  StudentProfile,
  MaestroMemory,
  EmotionalState,
  StudySession,
} from '../types/maestro';
import type { CourseDefinition, CourseLesson } from '../types/courses';
import { callProxy } from './proxy';
import { generateId } from './utils';
import { processMessageForKB } from './lifeTutor/processor';
import { resolveApiKeyOrThrow } from './apiKeyResolver';

// ── Re-export from sub-modules ────────────────────────────────────────

// Definitions
export { MAESTRI, getMaestroById, getMaestroForCategory } from './maestro/definitions';

// Voices
export { VOICE_BY_LANGUAGE, getVoiceForMaestro, getL2Voice } from './maestro/voices';

// Prompts
export { buildMaestroSystemPrompt, buildEmotionalResponseGuide, getLevelBehavior, getLearningStyleAdaptation } from './maestro/prompts';

// Parsing & Language
export { parseResponse, detectStudyLanguage, getStudyLangLabel } from './maestro/parsing';

// Types
export { EMOTIONAL_STATE_META } from '../types/maestro';

// ── Main Orchestration Functions ────────────────────────────────────

import { buildMaestroSystemPrompt } from './maestro/prompts';
import { parseResponse } from './maestro/parsing';
import { detectContextTags } from './lifeTutorMemory';

export interface TeachingResponse {
  message: MaestroMessage;
  detectedEmotion: EmotionalState;
  coveredObjective: number;
  teacherNote: string;
  pronunciationExercise: string | null;
  /** Testo con tag [L2:...] per il dual-voice TTS */
  textWithL2Tags: string;
}

export async function generateTeachingResponse(
  maestro: MaestroDefinition,
  course: CourseDefinition,
  lesson: CourseLesson,
  profile: StudentProfile,
  memory: MaestroMemory | null,
  session: StudySession,
  studentMessage: string,
  lang: string,
): Promise<TeachingResponse> {
  // ── KB Processor: analizza il messaggio PRIMA per selezionare le KB rilevanti ──
  const recentMessages = session.messages.slice(-5).map(m => m.content);
  const contextTags = detectContextTags(lesson.title + ' ' + lesson.description + ' ' + studentMessage);
  const processorResult = processMessageForKB(
    studentMessage,
    {
      contextTags,
      conversationHistory: recentMessages,
      courseCategory: course.category,
    },
  );

  const systemPrompt = buildMaestroSystemPrompt(
    maestro, course, lesson, profile, memory, session, lang,
    processorResult.kbInjection, // Solo le KB rilevanti per questo messaggio
  );

  const apiConfig = resolveApiKeyOrThrow(maestro.preferredProvider, maestro.preferredModel);

  // Costruisci la cronologia messaggi (max ultimi 20 per contesto)
  const historyMessages = session.messages.slice(-20).map(m => ({
    role: m.role === 'maestro' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));

  // Aggiungi il messaggio corrente
  historyMessages.push({ role: 'user', content: studentMessage });

  const response = await callProxy({
    provider: apiConfig.provider,
    model: apiConfig.model,
    messages: historyMessages,
    systemPrompt,
    temperature: 0.7, // Più alto per naturalezza
    maxTokens: 4096, // Maestro libero di dare risposte complete
    apiKey: apiConfig.apiKey,
  });

  if (response.error) {
    throw new Error(`Errore maestro: ${response.error}`);
  }

  const { text, textWithL2Tags, meta, pronunciationExercise } = parseResponse(response.content);

  const message: MaestroMessage = {
    id: generateId(),
    role: 'maestro',
    content: text,
    timestamp: new Date().toISOString(),
    detectedEmotion: meta?.emotion || 'focused',
    teachingAction: (meta?.teachingAction as MaestroMessage['teachingAction']) || 'explain',
    pronunciationExercise: pronunciationExercise || undefined,
  };

  return {
    message,
    detectedEmotion: meta?.emotion || 'focused',
    coveredObjective: meta?.coveredObjective ?? -1,
    teacherNote: meta?.teacherNote || '',
    pronunciationExercise,
    textWithL2Tags,
  };
}

// ── Welcome Message Generator ───────────────────────────────────────

export function generateWelcomeMessage(
  maestro: MaestroDefinition,
  course: CourseDefinition,
  lesson: CourseLesson,
  profile: StudentProfile,
  memory: MaestroMemory | null,
): MaestroMessage {
  const p = maestro.personality;
  const isFirstTime = !memory || memory.totalInteractions === 0;
  const studentName = profile.name;

  let content: string;

  if (isFirstTime) {
    content = `${maestro.avatar} Ciao ${studentName}! Sono ${maestro.name}, ${maestro.title.toLowerCase()}. `
      + `Sarò il tuo compagno di studio per "${course.title}". `
      + `\n\nOggi iniziamo con: **${lesson.title}** — ${lesson.description}`
      + `\n\n${p.catchphrases[0]} Iniziamo? Dimmi cosa sai già di questo argomento, così partiamo dal punto giusto per te.`;
  } else {
    const emotion = memory!.lastEmotionalState;
    const streak = memory!.successStreak;

    content = `${maestro.avatar} Bentornato ${studentName}! `;

    if (streak >= 3) {
      content += `Stai andando alla grande — ${streak} successi di fila! `;
    }

    if (emotion === 'frustrated' || emotion === 'confused') {
      content += `L'ultima volta abbiamo lavorato duro su alcuni concetti complessi. Oggi andiamo con calma. `;
    } else if (emotion === 'motivated') {
      content += `Mi piace il tuo entusiasmo! `;
    }

    content += `\n\nPronti per: **${lesson.title}** — ${lesson.description}`;
    content += `\n\nDa dove vuoi partire?`;
  }

  return {
    id: generateId(),
    role: 'maestro',
    content,
    timestamp: new Date().toISOString(),
    teachingAction: 'explain',
  };
}
