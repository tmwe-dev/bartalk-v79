/**
 * BarTalk v8 — Maestro System Types
 * Sistema di tutoring intelligente con maestri empatici e profilo studente.
 */

import type { CourseCategoryId, ContentSource } from './courses';

// ── Profilo Studente ─────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  name: string;
  age?: number;
  occupation?: string;
  /** Obiettivi generali dell'utente */
  goals: string[];
  /** Stile di apprendimento preferito */
  learningStyle: LearningStyle;
  /** Livello di comfort con la tecnologia */
  techComfort: 'low' | 'medium' | 'high';
  /** Lingua madre */
  nativeLanguage: string;
  /** Interessi personali (per analogie e motivazione) */
  interests: string[];
  /** Difficoltà note (es. "dislessia", "poco tempo", "ansia da esame") */
  challenges: string[];
  /** Note libere sullo studente */
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type LearningStyle =
  | 'visual'       // Impara con immagini, diagrammi, schemi
  | 'auditory'     // Impara ascoltando, discussioni
  | 'reading'      // Impara leggendo, prendendo appunti
  | 'kinesthetic'; // Impara facendo, esempi pratici

export const LEARNING_STYLE_META: Record<LearningStyle, {
  icon: string;
  label: string;
  description: string;
}> = {
  visual:      { icon: '👁️', label: 'Visivo',        description: 'Preferisci diagrammi, immagini e schemi' },
  auditory:    { icon: '👂', label: 'Uditivo',       description: 'Preferisci ascoltare spiegazioni e discutere' },
  reading:     { icon: '📖', label: 'Lettura',       description: 'Preferisci leggere e prendere appunti' },
  kinesthetic: { icon: '🤲', label: 'Pratico',       description: 'Preferisci fare esempi ed esercizi concreti' },
};

// ── Memoria Maestro (per ogni coppia maestro-studente-corso) ────────

export interface MaestroMemory {
  /** ID univoco */
  id: string;
  /** Corso associato */
  courseId: string;
  /** Maestro associato */
  maestroId: string;
  /** Punti di forza osservati durante le lezioni */
  strengths: string[];
  /** Aree di difficoltà osservate */
  weaknesses: string[];
  /** Concetti che lo studente ha padroneggiato */
  masteredConcepts: string[];
  /** Concetti su cui serve rinforzo */
  conceptsToReinforce: string[];
  /** Stato emotivo rilevato nell'ultima interazione */
  lastEmotionalState: EmotionalState;
  /** Striscia di successi consecutivi (per motivazione) */
  successStreak: number;
  /** Numero totale di interazioni */
  totalInteractions: number;
  /** Note del maestro sullo studente (accumulate) */
  teacherNotes: string[];
  /** Ultimo aggiornamento */
  updatedAt: string;
}

export type EmotionalState =
  | 'motivated'   // Carico, entusiasta
  | 'focused'     // Concentrato, neutro
  | 'confused'    // Confuso, ha bisogno di aiuto
  | 'frustrated'  // Frustrato, in difficoltà
  | 'bored'       // Annoiato, serve stimolo
  | 'anxious'     // Ansioso (es. pre-esame)
  | 'satisfied';  // Soddisfatto, ha appena capito qualcosa

export const EMOTIONAL_STATE_META: Record<EmotionalState, {
  icon: string;
  label: string;
  teacherAction: string;
}> = {
  motivated:  { icon: '🔥', label: 'Motivato',    teacherAction: 'Sfidalo con concetti più avanzati, mantieni il ritmo alto' },
  focused:    { icon: '🎯', label: 'Concentrato',  teacherAction: 'Procedi normalmente, ottimo ritmo' },
  confused:   { icon: '😕', label: 'Confuso',      teacherAction: 'Rallenta, usa analogie, chiedi cosa non è chiaro' },
  frustrated: { icon: '😤', label: 'Frustrato',    teacherAction: 'Empatizza, riduci la complessità, ricorda i successi passati' },
  bored:      { icon: '😴', label: 'Annoiato',     teacherAction: 'Proponi sfide, quiz interattivi, cambia approccio' },
  anxious:    { icon: '😰', label: 'Ansioso',      teacherAction: 'Rassicura, normalizza le difficoltà, proponi passi piccoli' },
  satisfied:  { icon: '😊', label: 'Soddisfatto',  teacherAction: 'Celebra il progresso, collega alla prossima sfida' },
};

// ── Maestro (Tutor persona) ─────────────────────────────────────────

export interface MaestroDefinition {
  id: string;
  name: string;
  /** Titolo/ruolo (es. "Professor", "Coach", "Mentor") */
  title: string;
  /** Emoji avatar */
  avatar: string;
  /** Colore tema */
  color: string;
  /** Genere */
  gender: 'male' | 'female';
  /** Specializzazioni */
  specialties: CourseCategoryId[];
  /** Personalità del maestro */
  personality: MaestroPersonality;
  /** Voce ElevenLabs preferita */
  preferredVoiceId: string;
  /** Provider AI preferito */
  preferredProvider: 'anthropic' | 'openai' | 'gemini' | 'groq';
  /** Modello AI preferito */
  preferredModel: string;
}

export interface MaestroPersonality {
  /** Stile di insegnamento */
  teachingStyle: string;
  /** Tono di comunicazione */
  tone: string;
  /** Come gestisce le difficoltà dello studente */
  supportStyle: string;
  /** Tipo di humor */
  humor: string;
  /** Frasi tipiche / catchphrases */
  catchphrases: string[];
  /** Come celebra i successi */
  celebrationStyle: string;
  /** Come motiva in momenti di difficoltà */
  motivationStyle: string;
}

// ── Conversazione Maestro ───────────────────────────────────────────

export interface MaestroMessage {
  id: string;
  role: 'maestro' | 'student' | 'system';
  content: string;
  /** Timestamp */
  timestamp: string;
  /** Stato emotivo rilevato (solo per messaggi studente) */
  detectedEmotion?: EmotionalState;
  /** Tipo di messaggio didattico */
  teachingAction?: TeachingAction;
  /** Fonti citate (se presenti) */
  sources?: ContentSource[];
  /** ID registrazione audio */
  audioRecordingId?: string;
  /** Dati pronuncia */
  pronunciationData?: PronunciationResult;
  /** Esercizio di pronuncia estratto */
  pronunciationExercise?: string;
}

export type TeachingAction =
  | 'explain'       // Spiegazione di un concetto
  | 'example'       // Esempio pratico
  | 'analogy'       // Analogia per rendere chiaro
  | 'question'      // Domanda per verificare comprensione
  | 'quiz'          // Mini-quiz interattivo
  | 'encourage'     // Incoraggiamento
  | 'summarize'     // Riassunto della lezione
  | 'challenge'     // Sfida/esercizio avanzato
  | 'review'        // Revisione di concetti precedenti
  | 'feedback';     // Feedback su risposta dello studente

// ── Sessione di studio ──────────────────────────────────────────────

export interface StudySession {
  id: string;
  courseId: string;
  lessonIndex: number;
  maestroId: string;
  messages: MaestroMessage[];
  /** Obiettivi della lezione coperti */
  coveredObjectives: number[];
  /** Stato della sessione */
  status: 'active' | 'paused' | 'completed';
  /** Punteggio stimato comprensione (0-100) */
  comprehensionScore: number;
  startedAt: string;
  lastActivityAt: string;
}

// ── Pronuncia ────────────────────────────────────────────────────────

export interface WordResult {
  word: string;
  status: 'correct' | 'almost' | 'wrong';
  expectedPhonetic?: string;
  spokenPhonetic?: string;
}

export interface PronunciationResult {
  overallScore: number;
  wordResults: WordResult[];
  feedback: string;
  suggestion: string;
}

// ── Context value ────────────────────────────────────────────────────

export interface MaestroContextValue {
  // Stato
  studentProfile: StudentProfile | null;
  currentSession: StudySession | null;
  currentMaestro: MaestroDefinition | null;
  memory: MaestroMemory | null;
  isTeaching: boolean;
  isSpeaking: boolean;

  // Profilo studente
  saveStudentProfile: (profile: Partial<StudentProfile>) => void;
  hasCompletedOnboarding: () => boolean;

  // Sessione di studio
  startStudySession: (courseId: string, lessonIndex: number, maestroId: string) => void;
  sendMessage: (content: string, sessionLang?: string) => Promise<void>;
  endSession: () => void;
  pauseSession: () => void;

  // Maestri
  getMaestroForCategory: (category: CourseCategoryId) => MaestroDefinition;
  availableMaestri: MaestroDefinition[];

  // TTS
  toggleVoice: () => void;
}
