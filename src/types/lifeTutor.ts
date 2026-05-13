/**
 * BarTalk v8 — Life Tutor Types
 * Cervello indipendente con memoria a 3 livelli.
 *
 * Architettura:
 * 1. RECENTE (7 giorni) — Sempre nel prompt
 * 2. CONSOLIDATA (libreria) — Fatti importanti per tag, cercati attivamente
 * 3. PROFONDA (cantina) — Archivio completo per ricostruzioni
 *
 * Componenti:
 * - Memory: ricordi persistenti (Supabase + localStorage fallback)
 * - Profile: profilo utente ricco e evolutivo
 * - KB: knowledge base separate per dominio
 * - Objectives: obiettivi dichiarati con tracking
 * - Conversations: log conversazioni per analisi longitudinale
 * - LearningPaths: percorsi completati
 * - Assessments: test e valutazioni
 * - Suggestions: suggerimenti autonomi dell'AI
 */

// ══════════════════════════════════════════════════════════════════════
// ── Memory ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type MemoryLayer = 'recent' | 'consolidated' | 'deep';

export type MemoryTag =
  | 'famiglia'     // Famiglia, relazioni familiari
  | 'lavoro'       // Lavoro, carriera, colleghi
  | 'studio'       // Percorsi di studio, esami, progressi accademici
  | 'emozione'     // Stati emotivi significativi
  | 'successo'     // Successi, traguardi, vittorie
  | 'difficolta'   // Problemi, sfide, momenti duri
  | 'salute'       // Salute fisica e mentale
  | 'hobby'        // Hobby, passioni, tempo libero
  | 'relazioni'    // Amicizie, relazioni sentimentali
  | 'obiettivi'    // Obiettivi personali, sogni, piani
  | 'evento'       // Eventi importanti (compleanno, matrimonio, viaggio)
  | 'preferenza'   // Preferenze personali (cibo, musica, film)
  | 'opinione'     // Opinioni espresse su argomenti
  | 'aneddoto'     // Storie personali raccontate
  | 'progresso'    // Progressi nell'apprendimento
  | 'altro';       // Tutto il resto

export type MemorySource =
  | 'maestro_chat'
  | 'agent_chat'
  | 'onboarding'
  | 'user_input'
  | 'system_analysis'
  | 'consolidation'
  | 'free_chat'
  | 'course_session'
  | 'life_tutor_chat';

export interface MemoryEntry {
  id: string;
  content: string;
  summary: string;
  tags: MemoryTag[];
  importance: number;           // 1-5
  emotion?: string;
  layer: MemoryLayer;
  source: MemorySource;
  courseId?: string;
  maestroId?: string;
  conversationId?: string;
  createdAt: string;
  lastAccessedAt: string;
  accessCount: number;
}

// ══════════════════════════════════════════════════════════════════════
// ── Memory Summary (per il prompt) ───────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export interface MemoryStats {
  totalMemories: number;
  oldestMemory: string | null;
  topTags: MemoryTag[];
  emotionalTrend: string;
  lastInteractionDate: string | null;
}

export interface MemorySummary {
  recentMemories: MemoryEntry[];
  relevantMemories: MemoryEntry[];
  stats: MemoryStats;
  promptText: string;
}

// ══════════════════════════════════════════════════════════════════════
// ── User Profile ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type CommunicationStyle = 'formal' | 'informal' | 'balanced' | 'playful' | 'technical';
export type HumorPreference = 'none' | 'light' | 'moderate' | 'heavy';
export type FeedbackStyle = 'direct' | 'gentle' | 'motivational';
export type SessionLengthPref = 'short' | 'medium' | 'long';
export type ContentDepth = 'surface' | 'standard' | 'deep';
export type LearningStyleType = 'visual' | 'auditory' | 'reading' | 'kinesthetic';
export type EngagementTrend = 'rising' | 'stable' | 'declining';

export interface FamilyContext {
  status: string;
  members: string[];
  notes: string;
}

export interface WorkContext {
  role: string;
  company: string;
  satisfaction: number;  // 1-5
  notes: string;
}

export interface EducationContext {
  level: string;
  field: string;
  current: string;
  notes: string;
}

export interface HealthContext {
  physical: string;
  mental: string;
  notes: string;
}

export interface LifeContext {
  family: FamilyContext;
  work: WorkContext;
  education: EducationContext;
  health: HealthContext;
  hobbies: string[];
  currentChallenges: string[];
  recentAchievements: string[];
}

export interface UserPreferences {
  topicsLoved: string[];
  topicsAvoided: string[];
  learningStyle: LearningStyleType;
  sessionLengthPref: SessionLengthPref;
  feedbackStyle: FeedbackStyle;
  musicGenres: string[];
  favoriteSubjects: string[];
  contentDepth: ContentDepth;
}

export interface GrowthMetrics {
  totalSessions: number;
  totalMinutes: number;
  streakDays: number;
  longestStreak: number;
  topicsExplored: number;
  coursesCompleted: number;
  assessmentsPassed: number;
  emotionalResilienceScore: number;
  engagementTrend: EngagementTrend;
}

export interface EducationHistoryEntry {
  type: 'degree' | 'course' | 'certification' | 'self_study';
  title: string;
  institution: string;
  field: string;
  year: string;
  notes: string;
}

export interface LTUserProfile {
  id: string;
  workspaceId: string;
  displayName: string;
  nickname: string;
  ageRange: string;
  occupation: string;
  nativeLanguage: string;
  spokenLanguages: string[];
  personalityTraits: string[];
  communicationStyle: CommunicationStyle;
  humorPreference: HumorPreference;
  emotionalBaseline: string;
  lifeContext: LifeContext;
  preferences: UserPreferences;
  growthMetrics: GrowthMetrics;
  educationHistory: EducationHistoryEntry[];
  firstInteractionAt: string;
  lastInteractionAt: string;
}

export const DEFAULT_LIFE_CONTEXT: LifeContext = {
  family: { status: '', members: [], notes: '' },
  work: { role: '', company: '', satisfaction: 3, notes: '' },
  education: { level: '', field: '', current: '', notes: '' },
  health: { physical: '', mental: '', notes: '' },
  hobbies: [],
  currentChallenges: [],
  recentAchievements: [],
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  topicsLoved: [],
  topicsAvoided: [],
  learningStyle: 'reading',
  sessionLengthPref: 'medium',
  feedbackStyle: 'motivational',
  musicGenres: [],
  favoriteSubjects: [],
  contentDepth: 'standard',
};

export const DEFAULT_GROWTH_METRICS: GrowthMetrics = {
  totalSessions: 0,
  totalMinutes: 0,
  streakDays: 0,
  longestStreak: 0,
  topicsExplored: 0,
  coursesCompleted: 0,
  assessmentsPassed: 0,
  emotionalResilienceScore: 0,
  engagementTrend: 'stable',
};

// ══════════════════════════════════════════════════════════════════════
// ── Objectives ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type ObjectiveCategory =
  | 'studio' | 'lavoro' | 'salute' | 'relazioni'
  | 'hobby' | 'crescita_personale' | 'finanza' | 'creativita' | 'altro';

export type ObjectiveStatus = 'active' | 'achieved' | 'paused' | 'abandoned';

export interface ObjectiveMilestone {
  title: string;
  completed: boolean;
  completedAt: string | null;
}

export interface AISuggestionEntry {
  suggestion: string;
  createdAt: string;
  accepted: boolean | null;
}

export interface LTObjective {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  category: ObjectiveCategory;
  status: ObjectiveStatus;
  priority: number;           // 1-5
  progress: number;           // 0-100
  targetDate: string | null;
  milestones: ObjectiveMilestone[];
  notes: string;
  aiSuggestions: AISuggestionEntry[];
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════
// ── Conversations Log ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type ConversationLogType =
  | 'free_chat' | 'maestro_session' | 'course_session'
  | 'agent_debate' | 'onboarding' | 'check_in' | 'reflection';

export type EmotionTrend = 'improved' | 'stable' | 'declined';

export interface ConversationInsight {
  type: 'discovery' | 'concern' | 'progress' | 'suggestion';
  content: string;
}

export interface LTConversationLog {
  id: string;
  workspaceId: string;
  conversationType: ConversationLogType;
  topic: string;
  summary: string;
  tags: MemoryTag[];
  emotionStart: string | null;
  emotionEnd: string | null;
  emotionTrend: EmotionTrend | null;
  messagesCount: number;
  durationSeconds: number;
  memoriesExtracted: number;
  insights: ConversationInsight[];
  metadata: Record<string, unknown>;
  startedAt: string;
  endedAt: string | null;
}

// ══════════════════════════════════════════════════════════════════════
// ── Learning Paths ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type LearningPathType = 'course' | 'topic_exploration' | 'skill_building' | 'language' | 'custom';
export type LearningPathStatus = 'in_progress' | 'completed' | 'paused' | 'abandoned';

export interface LTLearningPath {
  id: string;
  workspaceId: string;
  pathType: LearningPathType;
  title: string;
  description: string;
  category: string;
  level: string;
  totalLessons: number;
  completedLessons: number;
  averageScore: number;
  strengths: string[];
  weaknesses: string[];
  timeInvestedMinutes: number;
  status: LearningPathStatus;
  insights: ConversationInsight[];
  startedAt: string;
  completedAt: string | null;
  lastActivityAt: string;
}

// ══════════════════════════════════════════════════════════════════════
// ── Assessments ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type AssessmentType =
  | 'quiz' | 'exercise' | 'project' | 'oral_exam'
  | 'self_evaluation' | 'progress_check' | 'challenge';

export interface AssessmentQuestionData {
  question: string;
  answer: string;
  correct: boolean;
  feedback: string;
}

export interface LTAssessment {
  id: string;
  workspaceId: string;
  assessmentType: AssessmentType;
  topic: string;
  courseId?: string;
  lessonIndex?: number;
  score: number;
  maxScore: number;
  timeSpentSeconds: number;
  strengthsShown: string[];
  weaknessesShown: string[];
  questionsData: AssessmentQuestionData[];
  aiFeedback: string;
  improvementPlan: string;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════
// ── Knowledge Base ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type KBType =
  | 'tone_management'
  | 'voice_control'
  | 'number_reading'
  | 'acronym_nomenclature'
  | 'language_management'
  | 'emotional_scenarios'
  | 'conversation_templates'
  | 'learning_protocols'
  | 'personality_traits'
  | 'user_specific'
  | 'topic_expertise';

export interface KBEntry {
  id: string;
  workspaceId: string;
  kbType: KBType;
  title: string;
  content: Record<string, unknown>;
  tags: string[];
  language: string;
  priority: number;          // 1-10
  isSystem: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════
// ── AI Suggestions ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type SuggestionType =
  | 'topic_exploration'
  | 'skill_reinforcement'
  | 'emotional_support'
  | 'objective_reminder'
  | 'achievement_celebration'
  | 'habit_suggestion'
  | 'resource_recommendation'
  | 'conversation_starter'
  | 'review_suggestion'
  | 'challenge_proposal';

export type SuggestionStatus = 'pending' | 'shown' | 'accepted' | 'dismissed' | 'expired';

export interface LTAISuggestion {
  id: string;
  workspaceId: string;
  suggestionType: SuggestionType;
  title: string;
  content: string;
  reasoning: string;
  priority: number;           // 1-5
  contextTags: string[];
  status: SuggestionStatus;
  shownAt: string | null;
  respondedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════
// ── Life Tutor Configuration ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export interface LifeTutorConfig {
  enabled: boolean;
  tutorName: string;
  memoryDepth: 'minimal' | 'standard' | 'deep';
  autoExtract: boolean;
  /** Abilita suggerimenti proattivi dell'AI */
  proactiveSuggestions: boolean;
  /** Modalità free chat (conversazione libera) */
  freeChatEnabled: boolean;
  /** Tono di default */
  defaultTone: 'amichevole' | 'professionale' | 'motivazionale' | 'empatico';
  /** Lingua preferita Life Tutor */
  preferredLanguage: string;
}

export const DEFAULT_LIFE_TUTOR_CONFIG: LifeTutorConfig = {
  enabled: true,
  tutorName: 'Life Tutor',
  memoryDepth: 'standard',
  autoExtract: true,
  proactiveSuggestions: true,
  freeChatEnabled: true,
  defaultTone: 'amichevole',
  preferredLanguage: 'it',
};

// ══════════════════════════════════════════════════════════════════════
// ── Extraction Result ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export interface ExtractionResult {
  memories: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>[];
  conversationSummary: string;
  overallEmotion: string;
  /** Nuovi insight estratti dalla conversazione */
  insights?: ConversationInsight[];
  /** Aggiornamenti al profilo utente estratti */
  profileUpdates?: Partial<LTUserProfile>;
  /** Obiettivi menzionati o aggiornati */
  objectiveUpdates?: { title: string; progress?: number; status?: ObjectiveStatus }[];
}

// ══════════════════════════════════════════════════════════════════════
// ── Life Tutor Stats (aggregato per dashboard) ───────────────────────
// ══════════════════════════════════════════════════════════════════════

export interface LTStats {
  totalMemories: number;
  recentMemories: number;
  consolidatedMemories: number;
  totalConversations: number;
  activeObjectives: number;
  achievedObjectives: number;
  totalAssessments: number;
  averageScore: number;
  learningPathsCompleted: number;
  pendingSuggestions: number;
  kbEntries: number;
  topTags: { tag: string; count: number }[];
}

// ══════════════════════════════════════════════════════════════════════
// ── Prompt Context (passato al prompt builder) ───────────────────────
// ══════════════════════════════════════════════════════════════════════

export interface LTPromptContext {
  profile: LTUserProfile | null;
  memorySummary: MemorySummary;
  activeObjectives: LTObjective[];
  pendingSuggestions: LTAISuggestion[];
  recentPaths: LTLearningPath[];
  kbEntries: KBEntry[];
  conversationType: ConversationLogType;
  language: string;
}
