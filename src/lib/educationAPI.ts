/**
 * BarTalk v8 — Education API Client
 * Client per /api/education — mirrors billingAPI.ts pattern.
 * Gestisce dual-layer: se autenticato → Supabase via API, altrimenti → localStorage.
 */

import type { StudentProfile, MaestroMemory, StudySession } from '../types/maestro';
import type { CourseDefinition, CourseProgress, CourseLesson } from '../types/courses';
import type { DeliverableType } from '../types/tasks';
import type { EducationAPIResponse } from '../types/education';
import { buildAuthHeadersAsync } from './authToken';

const API_BASE = '/api/education';

// ── Helper ──────────────────────────────────────────────────────────

async function callEducation<T>(action: string, payload: Record<string, unknown> = {}): Promise<EducationAPIResponse<T>> {
  try {
    const headers = await buildAuthHeadersAsync();
    if (!headers['Authorization']) {
      // Skip mode: non abbiamo JWT → ritorna null (il caller usa localStorage)
      return { ok: false, error: 'not-authenticated' };
    }

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[educationAPI]', action, 'error:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ── Student Profile ─────────────────────────────────────────────────

export async function getStudentProfileCloud(): Promise<StudentProfile | null> {
  const res = await callEducation<StudentProfile>('get-profile');
  if (!res.ok || !res.data) return null;
  // Mappa snake_case → camelCase
  const d = res.data as unknown as Record<string, unknown>;
  return {
    id: (d.id as string) || '',
    name: (d.name as string) || '',
    age: d.age as number | undefined,
    occupation: d.occupation as string | undefined,
    goals: (d.goals as string[]) || [],
    learningStyle: (d.learning_style as StudentProfile['learningStyle']) || 'reading',
    techComfort: (d.tech_comfort as StudentProfile['techComfort']) || 'medium',
    nativeLanguage: (d.native_language as string) || 'it',
    interests: (d.interests as string[]) || [],
    challenges: (d.challenges as string[]) || [],
    notes: (d.notes as string) || '',
    createdAt: (d.created_at as string) || new Date().toISOString(),
    updatedAt: (d.updated_at as string) || new Date().toISOString(),
  };
}

export async function saveStudentProfileCloud(profile: Partial<StudentProfile>): Promise<boolean> {
  const res = await callEducation('save-profile', { profile });
  return res.ok;
}

// ── Courses ─────────────────────────────────────────────────────────

export async function getCoursesCloud(): Promise<CourseDefinition[]> {
  const res = await callEducation<unknown[]>('get-courses');
  if (!res.ok || !res.data) return [];
  // I dati arrivano con snake_case + lessons nested
  return (res.data as Record<string, unknown>[]).map(mapCourseFromDB);
}

export async function saveCourseCloud(course: CourseDefinition): Promise<boolean> {
  const res = await callEducation('save-course', { course });
  return res.ok;
}

// ── Course Progress ─────────────────────────────────────────────────

export async function getCourseProgressCloud(courseId?: string): Promise<CourseProgress | CourseProgress[] | null> {
  const res = await callEducation<unknown>('get-progress', { courseId });
  if (!res.ok) return courseId ? null : [];
  if (courseId && res.data) {
    return mapProgressFromDB(res.data as Record<string, unknown>);
  }
  if (Array.isArray(res.data)) {
    return (res.data as Record<string, unknown>[]).map(mapProgressFromDB);
  }
  return courseId ? null : [];
}

export async function saveCourseProgressCloud(progress: CourseProgress): Promise<boolean> {
  const res = await callEducation('save-progress', { progress });
  return res.ok;
}

// ── Assessment ──────────────────────────────────────────────────────

export async function recordAssessmentCloud(assessment: {
  courseId: string;
  lessonIndex: number;
  answers: number[];
  score: number;
}): Promise<boolean> {
  const res = await callEducation('record-assessment', { assessment });
  return res.ok;
}

// ── Maestro Memories ────────────────────────────────────────────────

export async function getMaestroMemoryCloud(courseId: string, maestroId: string): Promise<MaestroMemory | null> {
  const res = await callEducation<Record<string, unknown>>('get-memories', { courseId, maestroId });
  if (!res.ok || !res.data) return null;
  return mapMemoryFromDB(res.data);
}

export async function syncMaestroMemoryCloud(memory: MaestroMemory): Promise<boolean> {
  const res = await callEducation('sync-memory', { memory });
  return res.ok;
}

// ── Study Sessions ──────────────────────────────────────────────────

export async function getStudySessionsCloud(courseId?: string): Promise<StudySession[]> {
  const res = await callEducation<unknown[]>('get-sessions', { courseId });
  if (!res.ok || !res.data) return [];
  return (res.data as Record<string, unknown>[]).map(mapSessionFromDB);
}

export async function saveStudySessionCloud(session: StudySession): Promise<boolean> {
  const res = await callEducation('save-session', { session });
  return res.ok;
}

// ── xAPI Statements ─────────────────────────────────────────────────

export async function sendXAPIStatements(statements: unknown[]): Promise<boolean> {
  try {
    const headers = await buildAuthHeadersAsync();
    if (!headers['Authorization']) return false;

    const res = await fetch('/api/xapi', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ statements }),
    });

    const data = await res.json();
    return data.ok;
  } catch {
    return false;
  }
}

// ── DB → TypeScript mappers ─────────────────────────────────────────

function mapCourseFromDB(d: Record<string, unknown>): CourseDefinition {
  const lessons = Array.isArray(d.lessons) ? d.lessons : [];
  return {
    id: (d.id as string) || '',
    title: (d.title as string) || '',
    topic: (d.topic as string) || '',
    level: (d.level as CourseDefinition['level']) || 'base',
    language: (d.language as string) || 'it',
    category: (d.category as CourseDefinition['category']) || 'altro',
    totalLessons: (d.total_lessons as number) || 0,
    lessons: lessons.map((l: Record<string, unknown>) => ({
      id: (l.id as string) || '',
      index: (l.lesson_index as number) ?? 0,
      title: (l.title as string) || '',
      description: (l.description as string) || '',
      objectives: (l.objectives as string[]) || [],
      status: (l.status as 'locked' | 'available' | 'in_progress' | 'completed') || 'locked',
      taskType: ((l.task_type as string) || 'research') as DeliverableType,
      score: l.score as number | undefined,
      assessment: l.assessment as CourseLesson['assessment'],
      sources: l.sources as CourseLesson['sources'],
      completedAt: l.completed_at as string | undefined,
    })),
    requiresCertifiedSources: (d.require_certified_sources as boolean) || false,
    createdAt: (d.created_at as string) || '',
    updatedAt: (d.updated_at as string) || '',
  };
}

function mapProgressFromDB(d: Record<string, unknown>): CourseProgress {
  return {
    courseId: (d.course_id as string) || '',
    currentLessonIndex: (d.current_lesson_index as number) ?? 0,
    completedLessons: (d.completed_lessons as number) ?? 0,
    averageScore: (d.average_score as number) ?? 0,
    startedAt: (d.started_at as string) || '',
    lastActivityAt: (d.last_activity_at as string) || '',
  };
}

function mapMemoryFromDB(d: Record<string, unknown>): MaestroMemory {
  return {
    id: (d.id as string) || '',
    courseId: (d.course_id as string) || '',
    maestroId: (d.maestro_id as string) || '',
    strengths: (d.strengths as string[]) || [],
    weaknesses: (d.weaknesses as string[]) || [],
    masteredConcepts: (d.mastered_concepts as string[]) || [],
    conceptsToReinforce: (d.concepts_to_reinforce as string[]) || [],
    lastEmotionalState: (d.last_emotional_state as MaestroMemory['lastEmotionalState']) || 'focused',
    successStreak: (d.success_streak as number) ?? 0,
    totalInteractions: (d.total_interactions as number) ?? 0,
    teacherNotes: (d.teacher_notes as string[]) || [],
    updatedAt: (d.updated_at as string) || '',
  };
}

function mapSessionFromDB(d: Record<string, unknown>): StudySession {
  return {
    id: (d.id as string) || '',
    courseId: (d.course_id as string) || '',
    lessonIndex: (d.lesson_index as number) ?? 0,
    maestroId: (d.maestro_id as string) || '',
    messages: (d.messages as StudySession['messages']) || [],
    coveredObjectives: (d.covered_objectives as number[]) || [],
    status: (d.status as StudySession['status']) || 'active',
    comprehensionScore: (d.comprehension_score as number) ?? 0,
    startedAt: (d.started_at as string) || '',
    lastActivityAt: (d.last_activity_at as string) || '',
  };
}
