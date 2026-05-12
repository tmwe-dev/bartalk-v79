/**
 * BarTalk v8 — xAPI Statement Builder
 * Factory functions per costruire statement xAPI standard.
 * Riferimento: https://github.com/adlnet/xAPI-Spec
 */

import type {
  XAPIActor,
  XAPIVerb,
  XAPIObject,
  XAPIStatementWithMeta,
} from '../types/education';

// ── Costanti IRI ADL ────────────────────────────────────────────────

const ADL_VERBS = {
  launched:     'http://adlnet.gov/expapi/verbs/launched',
  completed:    'http://adlnet.gov/expapi/verbs/completed',
  scored:       'http://adlnet.gov/expapi/verbs/scored',
  progressed:   'http://adlnet.gov/expapi/verbs/progressed',
  interacted:   'http://adlnet.gov/expapi/verbs/interacted',
  experienced:  'http://adlnet.gov/expapi/verbs/experienced',
  attempted:    'http://adlnet.gov/expapi/verbs/attempted',
  passed:       'http://adlnet.gov/expapi/verbs/passed',
  failed:       'http://adlnet.gov/expapi/verbs/failed',
} as const;

const ACTIVITY_TYPES = {
  course:      'http://adlnet.gov/expapi/activities/course',
  lesson:      'http://adlnet.gov/expapi/activities/lesson',
  assessment:  'http://adlnet.gov/expapi/activities/assessment',
  interaction: 'http://adlnet.gov/expapi/activities/interaction',
  objective:   'http://adlnet.gov/expapi/activities/objective',
  media:       'http://adlnet.gov/expapi/activities/media',
} as const;

const BARTALK_BASE = 'https://radiochat-pro.vercel.app';

// ── Helpers ─────────────────────────────────────────────────────────

function buildActor(name: string, email?: string, workspaceId?: string): XAPIActor {
  const actor: XAPIActor = {
    objectType: 'Agent',
    name,
  };
  if (email) {
    actor.mbox = `mailto:${email}`;
  }
  if (workspaceId) {
    actor.account = {
      homePage: BARTALK_BASE,
      name: workspaceId,
    };
  }
  return actor;
}

function buildVerb(key: keyof typeof ADL_VERBS, labelIt: string, labelEn: string): XAPIVerb {
  return {
    id: ADL_VERBS[key],
    display: { it: labelIt, en: labelEn },
  };
}

function buildObject(
  type: keyof typeof ACTIVITY_TYPES,
  id: string,
  name: string,
  description?: string,
): XAPIObject {
  return {
    id: `${BARTALK_BASE}/${id}`,
    objectType: 'Activity',
    definition: {
      type: ACTIVITY_TYPES[type],
      name: { it: name },
      ...(description ? { description: { it: description } } : {}),
    },
  };
}

/** Converte secondi in durata ISO 8601 (PT...S) */
function toDuration(seconds: number): string {
  if (seconds < 60) return `PT${Math.round(seconds)}S`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `PT${mins}M${secs}S`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `PT${hours}H${remMins}M${secs}S`;
}

// ── Statement Builders ──────────────────────────────────────────────

/**
 * Studente ha avviato un corso/lezione.
 */
export function buildLaunchStatement(opts: {
  actorName: string;
  actorEmail?: string;
  workspaceId?: string;
  courseId: string;
  courseTitle: string;
  lessonIndex?: number;
  lessonTitle?: string;
}): XAPIStatementWithMeta {
  const isLesson = opts.lessonIndex !== undefined;
  const objectId = isLesson
    ? `course/${opts.courseId}/lesson/${opts.lessonIndex}`
    : `course/${opts.courseId}`;

  return {
    actor: buildActor(opts.actorName, opts.actorEmail, opts.workspaceId),
    verb: buildVerb('launched', 'ha avviato', 'launched'),
    object: buildObject(
      isLesson ? 'lesson' : 'course',
      objectId,
      isLesson ? (opts.lessonTitle || `Lezione ${(opts.lessonIndex ?? 0) + 1}`) : opts.courseTitle,
    ),
    context: isLesson ? {
      contextActivities: {
        parent: [buildObject('course', `course/${opts.courseId}`, opts.courseTitle)],
      },
    } : undefined,
    timestamp: new Date().toISOString(),
    statementType: 'launched',
    courseId: opts.courseId,
    lessonIndex: opts.lessonIndex,
  };
}

/**
 * Studente ha completato una lezione.
 */
export function buildCompletedStatement(opts: {
  actorName: string;
  actorEmail?: string;
  workspaceId?: string;
  courseId: string;
  courseTitle: string;
  lessonIndex: number;
  lessonTitle: string;
  score: number;              // 0-100
  durationSeconds?: number;
}): XAPIStatementWithMeta {
  return {
    actor: buildActor(opts.actorName, opts.actorEmail, opts.workspaceId),
    verb: buildVerb('completed', 'ha completato', 'completed'),
    object: buildObject(
      'lesson',
      `course/${opts.courseId}/lesson/${opts.lessonIndex}`,
      opts.lessonTitle,
    ),
    result: {
      score: {
        scaled: opts.score / 100,
        raw: opts.score,
        min: 0,
        max: 100,
      },
      completion: true,
      success: opts.score >= 60,
      ...(opts.durationSeconds ? { duration: toDuration(opts.durationSeconds) } : {}),
    },
    context: {
      contextActivities: {
        parent: [buildObject('course', `course/${opts.courseId}`, opts.courseTitle)],
      },
    },
    timestamp: new Date().toISOString(),
    statementType: 'completed',
    courseId: opts.courseId,
    lessonIndex: opts.lessonIndex,
  };
}

/**
 * Risultato di un assessment/quiz.
 */
export function buildScoredStatement(opts: {
  actorName: string;
  actorEmail?: string;
  workspaceId?: string;
  courseId: string;
  courseTitle: string;
  lessonIndex: number;
  lessonTitle: string;
  score: number;              // 0-100
  totalQuestions: number;
  correctAnswers: number;
}): XAPIStatementWithMeta {
  const passed = opts.score >= 60;
  return {
    actor: buildActor(opts.actorName, opts.actorEmail, opts.workspaceId),
    verb: buildVerb(passed ? 'passed' : 'failed', passed ? 'ha superato' : 'non ha superato', passed ? 'passed' : 'failed'),
    object: buildObject(
      'assessment',
      `course/${opts.courseId}/lesson/${opts.lessonIndex}/assessment`,
      `Assessment: ${opts.lessonTitle}`,
    ),
    result: {
      score: {
        scaled: opts.score / 100,
        raw: opts.correctAnswers,
        min: 0,
        max: opts.totalQuestions,
      },
      success: passed,
      completion: true,
    },
    context: {
      contextActivities: {
        parent: [buildObject('lesson', `course/${opts.courseId}/lesson/${opts.lessonIndex}`, opts.lessonTitle)],
        grouping: [buildObject('course', `course/${opts.courseId}`, opts.courseTitle)],
      },
    },
    timestamp: new Date().toISOString(),
    statementType: passed ? 'passed' : 'failed',
    courseId: opts.courseId,
    lessonIndex: opts.lessonIndex,
  };
}

/**
 * Studente ha raggiunto un obiettivo di apprendimento.
 */
export function buildProgressedStatement(opts: {
  actorName: string;
  actorEmail?: string;
  workspaceId?: string;
  courseId: string;
  courseTitle: string;
  lessonIndex: number;
  lessonTitle: string;
  objectiveIndex: number;
  objectiveText: string;
  totalObjectives: number;
  studySessionId?: string;
}): XAPIStatementWithMeta {
  return {
    actor: buildActor(opts.actorName, opts.actorEmail, opts.workspaceId),
    verb: buildVerb('progressed', 'è progredito in', 'progressed'),
    object: buildObject(
      'objective',
      `course/${opts.courseId}/lesson/${opts.lessonIndex}/objective/${opts.objectiveIndex}`,
      opts.objectiveText,
    ),
    result: {
      score: {
        scaled: (opts.objectiveIndex + 1) / opts.totalObjectives,
      },
      extensions: {
        [`${BARTALK_BASE}/xapi/ext/objective-index`]: opts.objectiveIndex,
        [`${BARTALK_BASE}/xapi/ext/total-objectives`]: opts.totalObjectives,
      },
    },
    context: {
      contextActivities: {
        parent: [buildObject('lesson', `course/${opts.courseId}/lesson/${opts.lessonIndex}`, opts.lessonTitle)],
        grouping: [buildObject('course', `course/${opts.courseId}`, opts.courseTitle)],
      },
    },
    timestamp: new Date().toISOString(),
    statementType: 'progressed',
    courseId: opts.courseId,
    lessonIndex: opts.lessonIndex,
    studySessionId: opts.studySessionId,
  };
}

/**
 * Interazione con un maestro (fine sessione di studio).
 */
export function buildInteractedStatement(opts: {
  actorName: string;
  actorEmail?: string;
  workspaceId?: string;
  courseId: string;
  courseTitle: string;
  lessonIndex: number;
  maestroId: string;
  maestroName: string;
  messageCount: number;
  comprehensionScore: number;
  durationSeconds?: number;
  studySessionId: string;
}): XAPIStatementWithMeta {
  return {
    actor: buildActor(opts.actorName, opts.actorEmail, opts.workspaceId),
    verb: buildVerb('interacted', 'ha interagito con', 'interacted'),
    object: buildObject(
      'interaction',
      `maestro/${opts.maestroId}/session/${opts.studySessionId}`,
      `Sessione con ${opts.maestroName}`,
      `${opts.messageCount} messaggi nella lezione del corso "${opts.courseTitle}"`,
    ),
    result: {
      score: {
        scaled: opts.comprehensionScore / 100,
        raw: opts.comprehensionScore,
        max: 100,
      },
      ...(opts.durationSeconds ? { duration: toDuration(opts.durationSeconds) } : {}),
      extensions: {
        [`${BARTALK_BASE}/xapi/ext/message-count`]: opts.messageCount,
        [`${BARTALK_BASE}/xapi/ext/maestro-id`]: opts.maestroId,
      },
    },
    context: {
      contextActivities: {
        parent: [buildObject('lesson', `course/${opts.courseId}/lesson/${opts.lessonIndex}`, `Lezione ${opts.lessonIndex + 1}`)],
        grouping: [buildObject('course', `course/${opts.courseId}`, opts.courseTitle)],
      },
    },
    timestamp: new Date().toISOString(),
    statementType: 'interacted',
    courseId: opts.courseId,
    lessonIndex: opts.lessonIndex,
    studySessionId: opts.studySessionId,
    maestroId: opts.maestroId,
  };
}

/**
 * Esercizio di pronuncia completato.
 */
export function buildExperiencedStatement(opts: {
  actorName: string;
  actorEmail?: string;
  workspaceId?: string;
  courseId: string;
  lessonIndex: number;
  phrase: string;
  pronunciationScore: number;  // 0-100
  language: string;            // BCP-47
}): XAPIStatementWithMeta {
  return {
    actor: buildActor(opts.actorName, opts.actorEmail, opts.workspaceId),
    verb: buildVerb('experienced', 'ha praticato', 'experienced'),
    object: buildObject(
      'media',
      `pronunciation/${encodeURIComponent(opts.phrase)}`,
      `Pronuncia: "${opts.phrase}"`,
    ),
    result: {
      score: {
        scaled: opts.pronunciationScore / 100,
        raw: opts.pronunciationScore,
        max: 100,
      },
    },
    context: {
      language: opts.language,
      contextActivities: {
        parent: [buildObject('lesson', `course/${opts.courseId}/lesson/${opts.lessonIndex}`, `Lezione ${opts.lessonIndex + 1}`)],
      },
    },
    timestamp: new Date().toISOString(),
    statementType: 'experienced',
    courseId: opts.courseId,
    lessonIndex: opts.lessonIndex,
  };
}
