/**
 * BarTalk v8 — Education & xAPI Types
 * Tipi per il sistema educativo Supabase e il tracciamento xAPI.
 */

// ── xAPI Standard Types ──────────────────────────────────────────────

/** Tipo statement xAPI (subset usati da BarTalk) */
export type XAPIStatementType =
  | 'launched'      // Inizio lezione/corso
  | 'completed'     // Fine lezione
  | 'scored'        // Risultato assessment
  | 'progressed'    // Obiettivo raggiunto
  | 'interacted'    // Interazione con maestro
  | 'experienced'   // Pronuncia/esercizio
  | 'attempted'     // Tentativo assessment
  | 'passed'        // Assessment superato
  | 'failed';       // Assessment fallito

/** xAPI Actor (chi ha fatto l'azione) */
export interface XAPIActor {
  objectType: 'Agent';
  name: string;
  mbox?: string;           // mailto:email
  account?: {
    homePage: string;
    name: string;          // workspace_id o user_id
  };
}

/** xAPI Verb (l'azione compiuta) */
export interface XAPIVerb {
  id: string;              // IRI standard ADL
  display: {
    [lang: string]: string; // es. { 'it': 'completato', 'en': 'completed' }
  };
}

/** xAPI Object (su cosa è stata compiuta l'azione) */
export interface XAPIObject {
  id: string;              // IRI dell'oggetto (es. bartalk://course/xxx/lesson/2)
  objectType: 'Activity';
  definition?: {
    type?: string;         // IRI tipo attività
    name?: Record<string, string>;
    description?: Record<string, string>;
    extensions?: Record<string, unknown>;
  };
}

/** xAPI Result (risultato dell'azione) */
export interface XAPIResult {
  score?: {
    scaled?: number;       // 0.0 - 1.0
    raw?: number;
    min?: number;
    max?: number;
  };
  success?: boolean;
  completion?: boolean;
  duration?: string;       // ISO 8601 duration (PT30M)
  response?: string;
  extensions?: Record<string, unknown>;
}

/** xAPI Context (contesto aggiuntivo) */
export interface XAPIContext {
  contextActivities?: {
    parent?: XAPIObject[];
    grouping?: XAPIObject[];
    category?: XAPIObject[];
  };
  language?: string;
  extensions?: Record<string, unknown>;
}

/** Statement xAPI completo */
export interface XAPIStatement {
  actor: XAPIActor;
  verb: XAPIVerb;
  object: XAPIObject;
  result?: XAPIResult;
  context?: XAPIContext;
  timestamp?: string;      // ISO 8601
}

/** Statement con metadata BarTalk per invio all'API */
export interface XAPIStatementWithMeta extends XAPIStatement {
  statementType: XAPIStatementType;
  courseId?: string;
  lessonIndex?: number;
  studySessionId?: string;
  maestroId?: string;
}

// ── Education API Types ──────────────────────────────────────────────

/** Azione supportata dall'endpoint /api/education */
export type EducationAction =
  | 'get-profile'
  | 'save-profile'
  | 'get-courses'
  | 'save-course'
  | 'get-progress'
  | 'save-progress'
  | 'record-assessment'
  | 'get-memories'
  | 'sync-memory'
  | 'get-sessions'
  | 'save-session';

/** Risposta API education generica */
export interface EducationAPIResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
