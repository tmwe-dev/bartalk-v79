/**
 * BarTalk v8 — Course Context
 * Gestione stato per il sistema Percorsi formativi.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  CourseDefinition,
  CourseProgress,
  CourseContextValue,
  CourseLevelType,
  CourseCategoryId,
} from '../types/courses';
import { COURSE_CATEGORIES, COURSE_LEVEL_META } from '../types/courses';
import { generateCourseSyllabus } from '../lib/courseGenerator';
import { generateId } from '../lib/utils';
import { useXAPI } from './xAPIContext';
import { buildLaunchStatement, buildCompletedStatement } from '../lib/xapiBuilder';

// ── localStorage keys ───────────────────────────────────────────────

const LS_COURSES = 'bt_courses';
const LS_ACTIVE_COURSE = 'bt_active_course_id';

function loadCourses(): CourseDefinition[] {
  try {
    const raw = localStorage.getItem(LS_COURSES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCourses(courses: CourseDefinition[]) {
  localStorage.setItem(LS_COURSES, JSON.stringify(courses));
}

function loadActiveCourseId(): string | null {
  return localStorage.getItem(LS_ACTIVE_COURSE);
}

function saveActiveCourseId(id: string | null) {
  if (id) localStorage.setItem(LS_ACTIVE_COURSE, id);
  else localStorage.removeItem(LS_ACTIVE_COURSE);
}

function loadProgress(courseId: string): CourseProgress | null {
  try {
    const raw = localStorage.getItem(`bt_course_progress_${courseId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProgress(progress: CourseProgress) {
  localStorage.setItem(`bt_course_progress_${progress.courseId}`, JSON.stringify(progress));
}

// ── Context ─────────────────────────────────────────────────────────

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: ReactNode }) {
  const { enqueue: enqueueXAPI } = useXAPI();
  const [courses, setCourses] = useState<CourseDefinition[]>(loadCourses);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(loadActiveCourseId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);

  const activeCourse = courses.find(c => c.id === activeCourseId) || null;
  const progress = activeCourse ? loadProgress(activeCourse.id) : null;

  // ── Genera nuovo corso ──────────────────────────────────────────

  const generateCourse = useCallback(async (
    topic: string,
    level: CourseLevelType,
    category: CourseCategoryId,
    lang: string = 'it',
    customization?: string
  ) => {
    setIsGenerating(true);
    setGenerationWarning(null);
    try {
      const catMeta = COURSE_CATEGORIES.find(c => c.id === category);
      const requiresCertifiedSources = catMeta?.certifiedSources ?? false;

      const result = await generateCourseSyllabus(topic, level, category, lang, requiresCertifiedSources, customization);

      // Salva eventuale warning (syllabus parziale, ecc.) — non bloccante
      if (result.warning) {
        setGenerationWarning(result.warning);
      }

      const course: CourseDefinition = {
        id: generateId(),
        title: `${topic} — ${COURSE_LEVEL_META[level].label}`,
        topic,
        level,
        language: lang,
        category,
        totalLessons: result.lessons.length,
        lessons: result.lessons,
        requiresCertifiedSources,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...courses, course];
      setCourses(updated);
      saveCourses(updated);

      // Crea progresso iniziale
      const prog: CourseProgress = {
        courseId: course.id,
        currentLessonIndex: 0,
        completedLessons: 0,
        averageScore: 0,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      saveProgress(prog);

      // Attiva il corso
      setActiveCourseId(course.id);
      saveActiveCourseId(course.id);
    } catch (err) {
      console.error('[CourseContext] Errore generazione corso:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [courses]);

  // ── Avvia lezione ───────────────────────────────────────────────

  const startLesson = useCallback((lessonIndex: number) => {
    if (!activeCourse) return;

    const updated = { ...activeCourse };
    updated.lessons = updated.lessons.map((l, i) => {
      if (i === lessonIndex && l.status === 'available') {
        return { ...l, status: 'in_progress' as const };
      }
      return l;
    });
    updated.updatedAt = new Date().toISOString();

    const newCourses = courses.map(c => c.id === updated.id ? updated : c);
    setCourses(newCourses);
    saveCourses(newCourses);

    // Aggiorna progresso
    const prog = loadProgress(updated.id) || {
      courseId: updated.id,
      currentLessonIndex: lessonIndex,
      completedLessons: 0,
      averageScore: 0,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };
    prog.currentLessonIndex = lessonIndex;
    prog.lastActivityAt = new Date().toISOString();
    saveProgress(prog);

    // xAPI: registra launch lezione
    const lesson = updated.lessons[lessonIndex];
    if (lesson) {
      enqueueXAPI(buildLaunchStatement({
        actorName: 'Studente',
        courseId: updated.id,
        courseTitle: updated.title,
        lessonIndex,
        lessonTitle: lesson.title,
      }));
    }
  }, [activeCourse, courses, enqueueXAPI]);

  // ── Completa lezione ────────────────────────────────────────────

  const completeLesson = useCallback((lessonIndex: number, score: number) => {
    if (!activeCourse) return;

    const updated = { ...activeCourse };
    updated.lessons = updated.lessons.map((l, i) => {
      if (i === lessonIndex) {
        return { ...l, status: 'completed' as const, score, completedAt: new Date().toISOString() };
      }
      // Sblocca sempre la prossima lezione (l'assessment e educativo, non bloccante)
      if (i === lessonIndex + 1 && l.status === 'locked') {
        return { ...l, status: 'available' as const };
      }
      return l;
    });
    updated.updatedAt = new Date().toISOString();

    const newCourses = courses.map(c => c.id === updated.id ? updated : c);
    setCourses(newCourses);
    saveCourses(newCourses);

    // Aggiorna progresso
    const completedLessons = updated.lessons.filter(l => l.status === 'completed').length;
    const scores = updated.lessons.filter(l => l.score !== undefined).map(l => l.score!);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const prog: CourseProgress = {
      courseId: updated.id,
      currentLessonIndex: lessonIndex + 1 < updated.totalLessons ? lessonIndex + 1 : lessonIndex,
      completedLessons,
      averageScore,
      startedAt: loadProgress(updated.id)?.startedAt || new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };
    saveProgress(prog);

    // xAPI: registra completamento lezione
    const lesson = updated.lessons[lessonIndex];
    if (lesson) {
      enqueueXAPI(buildCompletedStatement({
        actorName: 'Studente',
        courseId: updated.id,
        courseTitle: updated.title,
        lessonIndex,
        lessonTitle: lesson.title,
        score,
      }));
    }
  }, [activeCourse, courses, enqueueXAPI]);

  // ── Elimina corso ───────────────────────────────────────────────

  const deleteCourse = useCallback((courseId: string) => {
    const newCourses = courses.filter(c => c.id !== courseId);
    setCourses(newCourses);
    saveCourses(newCourses);
    localStorage.removeItem(`bt_course_progress_${courseId}`);

    if (activeCourseId === courseId) {
      setActiveCourseId(null);
      saveActiveCourseId(null);
    }
  }, [courses, activeCourseId]);

  // ── Seleziona corso attivo ──────────────────────────────────────

  const setActiveCourseAction = useCallback((courseId: string | null) => {
    setActiveCourseId(courseId);
    saveActiveCourseId(courseId);
  }, []);

  // ── Contesto prompt per gli agenti ──────────────────────────────

  const getLessonPromptContext = useCallback((): string => {
    if (!activeCourse) return '';

    const currentLesson = activeCourse.lessons.find(l => l.status === 'in_progress');
    if (!currentLesson) return '';

    const parts: string[] = [];
    parts.push(`\n---\n📚 PERCORSO FORMATIVO: ${activeCourse.title}`);
    parts.push(`Argomento: ${activeCourse.topic}`);
    parts.push(`Livello: ${COURSE_LEVEL_META[activeCourse.level].label}`);
    parts.push(`Lezione ${currentLesson.index + 1} di ${activeCourse.totalLessons}: ${currentLesson.title}`);
    parts.push(`\nDescrizione lezione: ${currentLesson.description}`);

    if (currentLesson.objectives.length > 0) {
      parts.push(`\nObiettivi di apprendimento:`);
      currentLesson.objectives.forEach((obj, i) => {
        parts.push(`  ${i + 1}. ${obj}`);
      });
    }

    if (activeCourse.requiresCertifiedSources) {
      parts.push(`\n⚠️ FONTI CERTIFICATE RICHIESTE: Questo e un argomento ${activeCourse.category}.`);
      parts.push(`Cita SEMPRE le fonti accademiche/istituzionali nei tuoi messaggi.`);
      parts.push(`Usa riferimenti a: paper peer-reviewed, linee guida ufficiali, manuali accademici.`);
      parts.push(`Formato citazione: [Autore, Anno] o [Istituzione, Documento]`);
    }

    if (currentLesson.sources && currentLesson.sources.length > 0) {
      parts.push(`\nFonti di riferimento per questa lezione:`);
      currentLesson.sources.forEach(s => {
        parts.push(`  - ${s.title}${s.url ? ` (${s.url})` : ''} [${s.type}, credibilita: ${s.credibility}/5]`);
      });
    }

    // Istruzioni comportamentali per livello
    const levelInstructions: Record<CourseLevelType, string> = {
      bambino: 'Usa un linguaggio semplice e giocoso. Fai molti esempi concreti dalla vita quotidiana. Usa analogie divertenti. Frasi brevi.',
      base: 'Introduci i concetti gradualmente. Definisci ogni termine tecnico. Usa molti esempi pratici.',
      intermedio: 'Puoi usare terminologia specifica ma spiegala. Bilancia teoria e pratica. Fai riferimenti a concetti gia noti.',
      avanzato: 'Usa terminologia tecnica liberamente. Approfondisci i dettagli. Discuti casi limite e applicazioni avanzate.',
      universitario: 'Livello accademico. Cita fonti e studi. Discuti teorie e framework. Analisi critica.',
      ricercatore: 'Frontiera della ricerca. Discuti paper recenti, meta-analisi, controversie nel campo. Metodologia rigorosa.',
    };

    parts.push(`\nSTILE PER LIVELLO ${activeCourse.level.toUpperCase()}: ${levelInstructions[activeCourse.level]}`);
    parts.push(`\nIMPORTANTE: Ogni risposta deve insegnare qualcosa di concreto relativo alla lezione corrente. Segui gli obiettivi di apprendimento.`);

    return parts.join('\n');
  }, [activeCourse]);

  return (
    <CourseContext.Provider value={{
      activeCourse,
      progress,
      courses,
      isGenerating,
      generationWarning,
      generateCourse,
      startLesson,
      completeLesson,
      deleteCourse,
      setActiveCourse: setActiveCourseAction,
      getLessonPromptContext,
    }}>
      {children}
    </CourseContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourseContext(): CourseContextValue {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourseContext must be used within CourseProvider');
  return ctx;
}
