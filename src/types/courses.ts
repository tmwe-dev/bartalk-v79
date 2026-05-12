/**
 * BarTalk v8 — Sistema Percorsi (Courses)
 * Tipi per percorsi formativi sequenziali multi-task.
 */

import type { DeliverableType } from './tasks';

// ── Livelli utente ──────────────────────────────────────────────────

export type CourseLevelType =
  | 'bambino'        // 6-10 anni, linguaggio semplice, giocoso
  | 'base'           // Principiante adulto
  | 'intermedio'     // Conoscenza parziale
  | 'avanzato'       // Esperto
  | 'universitario'  // Livello accademico
  | 'ricercatore';   // Frontiera della ricerca

export const COURSE_LEVEL_META: Record<CourseLevelType, {
  icon: string;
  label: string;
  description: string;
  lessonRange: [number, number]; // min-max lezioni
}> = {
  bambino:       { icon: '🧒', label: 'Bambino',       description: 'Linguaggio semplice, esempi concreti, quiz facili', lessonRange: [3, 5] },
  base:          { icon: '🌱', label: 'Base',           description: 'Introduzione ai concetti fondamentali', lessonRange: [5, 8] },
  intermedio:    { icon: '📘', label: 'Intermedio',     description: 'Approfondimento con terminologia specifica', lessonRange: [6, 8] },
  avanzato:      { icon: '🎯', label: 'Avanzato',       description: 'Analisi dettagliata e applicazioni pratiche', lessonRange: [8, 12] },
  universitario: { icon: '🎓', label: 'Universitario',  description: 'Livello accademico con riferimenti scientifici', lessonRange: [8, 12] },
  ricercatore:   { icon: '🔬', label: 'Ricercatore',    description: 'Frontiera della ricerca, meta-analisi, metodologia', lessonRange: [10, 15] },
};

// ── Categorie con flag fonti certificate ────────────────────────────

export const COURSE_CATEGORIES = [
  { id: 'lingue',       label: 'Lingue',              icon: '🌍', certifiedSources: false },
  { id: 'scienze',      label: 'Scienze',             icon: '🔬', certifiedSources: false },
  { id: 'matematica',   label: 'Matematica',          icon: '📐', certifiedSources: false },
  { id: 'informatica',  label: 'Informatica',         icon: '💻', certifiedSources: false },
  { id: 'medicina',     label: 'Medicina',            icon: '🏥', certifiedSources: true },
  { id: 'psicologia',   label: 'Psicologia',          icon: '🧠', certifiedSources: true },
  { id: 'farmacologia', label: 'Farmacologia',        icon: '💊', certifiedSources: true },
  { id: 'nutrizione',   label: 'Nutrizione',          icon: '🥗', certifiedSources: true },
  { id: 'fisioterapia', label: 'Fisioterapia',        icon: '🦴', certifiedSources: true },
  { id: 'storia',       label: 'Storia',              icon: '📜', certifiedSources: false },
  { id: 'filosofia',    label: 'Filosofia',           icon: '🏛️', certifiedSources: false },
  { id: 'economia',     label: 'Economia',            icon: '📈', certifiedSources: false },
  { id: 'arte',         label: 'Arte e Design',       icon: '🎨', certifiedSources: false },
  { id: 'musica',       label: 'Musica',              icon: '🎵', certifiedSources: false },
  { id: 'benessere',    label: 'Benessere & Mindfulness', icon: '🧘', certifiedSources: true },
  { id: 'crescita',     label: 'Crescita Personale',  icon: '🌟', certifiedSources: false },
  { id: 'sport',        label: 'Sport & Fitness',     icon: '🏋️', certifiedSources: false },
  { id: 'educazione',   label: 'Educazione & Studio', icon: '📖', certifiedSources: false },
  { id: 'altro',        label: 'Altro',               icon: '📚', certifiedSources: false },
] as const;

export type CourseCategoryId = typeof COURSE_CATEGORIES[number]['id'];

// ── Fonti certificate ───────────────────────────────────────────────

export interface ContentSource {
  title: string;
  url?: string;
  type: 'academic' | 'institutional' | 'professional' | 'general';
  credibility: 1 | 2 | 3 | 4 | 5; // 5 = peer-reviewed journal
}

// ── Assessment ──────────────────────────────────────────────────────

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];       // 4 opzioni
  correctIndex: number;    // 0-3
  explanation: string;
  sources?: ContentSource[];
}

export interface AssessmentResult {
  lessonId: string;
  answers: number[];       // indici risposte scelte
  score: number;           // 0-100
  completedAt: string;
}

// ── Lezione ─────────────────────────────────────────────────────────

export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface CourseLesson {
  id: string;
  index: number;
  title: string;
  description: string;
  objectives: string[];
  status: LessonStatus;
  taskType: DeliverableType;
  score?: number;          // 0-100 da assessment
  assessment?: AssessmentQuestion[];
  sources?: ContentSource[];
  completedAt?: string;
}

// ── Corso completo ──────────────────────────────────────────────────

export interface CourseDefinition {
  id: string;
  title: string;
  topic: string;
  level: CourseLevelType;
  language: string;
  category: CourseCategoryId;
  totalLessons: number;
  lessons: CourseLesson[];
  requiresCertifiedSources: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Progresso utente ────────────────────────────────────────────────

export interface CourseProgress {
  courseId: string;
  currentLessonIndex: number;
  completedLessons: number;
  averageScore: number;
  startedAt: string;
  lastActivityAt: string;
}

// ── Suggerimenti rapidi per il wizard ───────────────────────────────

export const QUICK_SUGGESTIONS = [
  { topic: 'Inglese B2',              category: 'lingue' as CourseCategoryId,     level: 'intermedio' as CourseLevelType },
  { topic: 'Analisi Matematica I',    category: 'matematica' as CourseCategoryId, level: 'universitario' as CourseLevelType },
  { topic: 'Psicologia Cognitiva',    category: 'psicologia' as CourseCategoryId, level: 'avanzato' as CourseLevelType },
  { topic: 'Python per Principianti', category: 'informatica' as CourseCategoryId, level: 'base' as CourseLevelType },
  { topic: 'Anatomia Umana',          category: 'medicina' as CourseCategoryId,   level: 'universitario' as CourseLevelType },
  { topic: 'Storia dell\'Arte',       category: 'arte' as CourseCategoryId,       level: 'intermedio' as CourseLevelType },
  { topic: 'Economia Comportamentale', category: 'economia' as CourseCategoryId,  level: 'avanzato' as CourseLevelType },
  { topic: 'Il Sistema Solare',       category: 'scienze' as CourseCategoryId,    level: 'bambino' as CourseLevelType },
] as const;

// ── Context value ───────────────────────────────────────────────────

export interface CourseContextValue {
  // Stato
  activeCourse: CourseDefinition | null;
  progress: CourseProgress | null;
  courses: CourseDefinition[];
  isGenerating: boolean;
  /** Avviso non bloccante dopo generazione (es. syllabus parziale) */
  generationWarning: string | null;

  // Azioni
  generateCourse: (topic: string, level: CourseLevelType, category: CourseCategoryId, lang?: string, customization?: string) => Promise<void>;
  startLesson: (lessonIndex: number) => void;
  completeLesson: (lessonIndex: number, score: number) => void;
  deleteCourse: (courseId: string) => void;
  setActiveCourse: (courseId: string | null) => void;

  // Integrazione task system
  getLessonPromptContext: () => string;
}
