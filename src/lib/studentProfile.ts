/**
 * BarTalk v8 — Student Profile & Memory System
 * Gestione persistente del profilo studente e della memoria del maestro.
 */

import type {
  StudentProfile,
  MaestroMemory,
  EmotionalState,
  StudySession,
} from '../types/maestro';
import { generateId } from './utils';

// ── localStorage keys ───────────────────────────────────────────────

const LS_STUDENT = 'bt_student_profile';
const LS_MEMORY_PREFIX = 'bt_maestro_memory_';
const LS_SESSION_PREFIX = 'bt_study_session_';
const LS_SESSIONS_INDEX = 'bt_study_sessions';

// ── Student Profile ─────────────────────────────────────────────────

export function loadStudentProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(LS_STUDENT);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveStudentProfile(profile: StudentProfile): void {
  localStorage.setItem(LS_STUDENT, JSON.stringify(profile));
}

export function createDefaultProfile(name: string): StudentProfile {
  return {
    id: generateId(),
    name,
    goals: [],
    learningStyle: 'reading',
    techComfort: 'medium',
    nativeLanguage: 'it',
    interests: [],
    challenges: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function updateStudentProfile(updates: Partial<StudentProfile>): StudentProfile {
  const current = loadStudentProfile();
  if (!current) {
    const profile = createDefaultProfile(updates.name || 'Studente');
    const merged = { ...profile, ...updates, updatedAt: new Date().toISOString() };
    saveStudentProfile(merged);
    return merged;
  }
  const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
  saveStudentProfile(merged);
  return merged;
}

// ── Maestro Memory ──────────────────────────────────────────────────

function memoryKey(courseId: string, maestroId: string): string {
  return `${LS_MEMORY_PREFIX}${courseId}_${maestroId}`;
}

export function loadMaestroMemory(courseId: string, maestroId: string): MaestroMemory | null {
  try {
    const raw = localStorage.getItem(memoryKey(courseId, maestroId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveMaestroMemory(memory: MaestroMemory): void {
  localStorage.setItem(memoryKey(memory.courseId, memory.maestroId), JSON.stringify(memory));
}

export function createDefaultMemory(courseId: string, maestroId: string): MaestroMemory {
  return {
    id: generateId(),
    courseId,
    maestroId,
    strengths: [],
    weaknesses: [],
    masteredConcepts: [],
    conceptsToReinforce: [],
    lastEmotionalState: 'focused',
    successStreak: 0,
    totalInteractions: 0,
    teacherNotes: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Options for updateMemoryFromInteraction
 */
export interface UpdateMemoryFromInteractionOptions {
  newNotes?: string[];
  masteredConcept?: string;
  conceptToReinforce?: string;
}

export function updateMemoryFromInteraction(
  memory: MaestroMemory,
  emotion: EmotionalState,
  options?: UpdateMemoryFromInteractionOptions,
): MaestroMemory {
  const {
    newNotes,
    masteredConcept,
    conceptToReinforce,
  } = options || {};
  const updated: MaestroMemory = {
    ...memory,
    lastEmotionalState: emotion,
    totalInteractions: memory.totalInteractions + 1,
    updatedAt: new Date().toISOString(),
  };

  if (newNotes && newNotes.length > 0) {
    // Mantieni max 50 note per non sovraccaricare
    updated.teacherNotes = [...memory.teacherNotes, ...newNotes].slice(-50);
  }

  if (masteredConcept && !memory.masteredConcepts.includes(masteredConcept)) {
    updated.masteredConcepts = [...memory.masteredConcepts, masteredConcept];
    // Rimuovi dai concetti da rinforzare se c'era
    updated.conceptsToReinforce = memory.conceptsToReinforce.filter(c => c !== masteredConcept);
    updated.successStreak = memory.successStreak + 1;
  }

  if (conceptToReinforce && !memory.conceptsToReinforce.includes(conceptToReinforce)) {
    updated.conceptsToReinforce = [...memory.conceptsToReinforce, conceptToReinforce];
    updated.successStreak = 0; // Reset streak on difficulty
  }

  return updated;
}

// ── Study Sessions ──────────────────────────────────────────────────

export function loadStudySession(sessionId: string): StudySession | null {
  try {
    const raw = localStorage.getItem(`${LS_SESSION_PREFIX}${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveStudySession(session: StudySession): void {
  localStorage.setItem(`${LS_SESSION_PREFIX}${session.id}`, JSON.stringify(session));

  // Aggiorna l'indice delle sessioni
  const index = loadSessionIndex();
  if (!index.includes(session.id)) {
    index.push(session.id);
    localStorage.setItem(LS_SESSIONS_INDEX, JSON.stringify(index));
  }
}

function loadSessionIndex(): string[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_INDEX);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getSessionsForCourse(courseId: string): StudySession[] {
  const index = loadSessionIndex();
  return index
    .map(id => loadStudySession(id))
    .filter((s): s is StudySession => s !== null && s.courseId === courseId)
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}

export function createStudySession(
  courseId: string,
  lessonIndex: number,
  maestroId: string,
): StudySession {
  return {
    id: generateId(),
    courseId,
    lessonIndex,
    maestroId,
    messages: [],
    coveredObjectives: [],
    status: 'active',
    comprehensionScore: 0,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
}

// ── Costruzione contesto studente per prompt ────────────────────────

export function buildStudentContext(
  profile: StudentProfile,
  memory: MaestroMemory | null,
): string {
  const parts: string[] = [];

  parts.push(`\n--- PROFILO STUDENTE ---`);
  parts.push(`Nome: ${profile.name}`);
  if (profile.age) parts.push(`Età: ${profile.age}`);
  if (profile.occupation) parts.push(`Occupazione: ${profile.occupation}`);

  parts.push(`Stile di apprendimento: ${profile.learningStyle}`);
  parts.push(`Comfort tecnologico: ${profile.techComfort}`);

  if (profile.goals.length > 0) {
    parts.push(`\nObiettivi personali: ${profile.goals.join(', ')}`);
  }

  if (profile.interests.length > 0) {
    parts.push(`Interessi (contesto di sfondo — NON menzionarli proattivamente, usali SOLO se c'è un collegamento DIRETTO e NON FORZATO col concetto in discussione): ${profile.interests.join(', ')}`);
  }

  if (profile.challenges.length > 0) {
    parts.push(`Difficoltà note: ${profile.challenges.join(', ')}`);
  }

  if (profile.notes) {
    parts.push(`Note: ${profile.notes}`);
  }

  if (memory) {
    parts.push(`\n--- MEMORIA DEL MAESTRO ---`);
    parts.push(`Interazioni totali: ${memory.totalInteractions}`);
    parts.push(`Stato emotivo recente: ${memory.lastEmotionalState}`);
    parts.push(`Striscia successi: ${memory.successStreak}`);

    if (memory.strengths.length > 0) {
      parts.push(`Punti di forza: ${memory.strengths.join(', ')}`);
    }
    if (memory.weaknesses.length > 0) {
      parts.push(`Aree di miglioramento: ${memory.weaknesses.join(', ')}`);
    }
    if (memory.masteredConcepts.length > 0) {
      parts.push(`Concetti padroneggiati: ${memory.masteredConcepts.slice(-10).join(', ')}`);
    }
    if (memory.conceptsToReinforce.length > 0) {
      parts.push(`Da rinforzare: ${memory.conceptsToReinforce.join(', ')}`);
    }
    if (memory.teacherNotes.length > 0) {
      parts.push(`\nNote delle sessioni precedenti (ultime 5):`);
      memory.teacherNotes.slice(-5).forEach(n => parts.push(`  - ${n}`));
    }
  }

  return parts.join('\n');
}
