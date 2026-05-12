/**
 * Life Tutor — User Profile Module
 * Profilo utente ricco e evolutivo che cresce con l'utente.
 */

import type {
  LTUserProfile, LifeContext, UserPreferences, GrowthMetrics,
} from '../../types/lifeTutor';
import {
  DEFAULT_LIFE_CONTEXT, DEFAULT_USER_PREFERENCES, DEFAULT_GROWTH_METRICS,
} from '../../types/lifeTutor';
import { supabase, isSupabaseConfigured } from '../supabase';
import { generateId } from '../utils';

const PROFILE_KEY = 'bt_lt_profile';

// ── Default Profile ──────────────────────────────────────────────────

function createDefaultProfile(workspaceId: string): LTUserProfile {
  return {
    id: generateId(),
    workspaceId,
    displayName: '',
    nickname: '',
    ageRange: '',
    occupation: '',
    nativeLanguage: 'it',
    spokenLanguages: ['it'],
    personalityTraits: [],
    communicationStyle: 'balanced',
    humorPreference: 'moderate',
    emotionalBaseline: 'stable',
    lifeContext: { ...DEFAULT_LIFE_CONTEXT },
    preferences: { ...DEFAULT_USER_PREFERENCES },
    growthMetrics: { ...DEFAULT_GROWTH_METRICS },
    educationHistory: [],
    firstInteractionAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
  };
}

// ── Load / Save ──────────────────────────────────────────────────────

export function loadProfileLocal(): LTUserProfile | null {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) { console.warn('[lt-profile] localStorage parse failed:', err); }
  return null;
}

function saveProfileLocal(profile: LTUserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadProfile(): Promise<LTUserProfile | null> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (ws) {
          const { data, error } = await supabase
            .from('lt_user_profile')
            .select('*')
            .eq('workspace_id', ws.id)
            .single();
          if (!error && data) {
            const profile = dbToProfile(data);
            saveProfileLocal(profile); // cache locally
            return profile;
          }
        }
      }
    } catch (err) { console.warn('[lt-profile] Supabase load failed, using localStorage:', err); }
  }
  return loadProfileLocal();
}

export async function saveProfile(profile: LTUserProfile): Promise<void> {
  profile.lastInteractionAt = new Date().toISOString();
  saveProfileLocal(profile);

  if (supabase && isSupabaseConfigured) {
    try {
      await supabase.from('lt_user_profile').upsert(profileToDb(profile));
    } catch (err) { console.warn('[lt-profile] Supabase save failed:', err); }
  }
}

export async function getOrCreateProfile(workspaceId: string): Promise<LTUserProfile> {
  const existing = await loadProfile();
  if (existing) return existing;

  const newProfile = createDefaultProfile(workspaceId);
  await saveProfile(newProfile);
  return newProfile;
}

// ── Profile Updates (from AI extraction) ─────────────────────────────

export async function mergeProfileUpdates(
  updates: Partial<LTUserProfile>
): Promise<LTUserProfile | null> {
  const profile = loadProfileLocal();
  if (!profile) return null;

  // Merge semplice: non sovrascrivere campi vuoti
  if (updates.displayName && !profile.displayName) profile.displayName = updates.displayName;
  if (updates.nickname && !profile.nickname) profile.nickname = updates.nickname;
  if (updates.occupation && !profile.occupation) profile.occupation = updates.occupation;
  if (updates.ageRange && !profile.ageRange) profile.ageRange = updates.ageRange;

  // Merge array (aggiungi senza duplicati)
  if (updates.personalityTraits) {
    const set = new Set([...profile.personalityTraits, ...updates.personalityTraits]);
    profile.personalityTraits = [...set];
  }
  if (updates.spokenLanguages) {
    const set = new Set([...profile.spokenLanguages, ...updates.spokenLanguages]);
    profile.spokenLanguages = [...set];
  }

  // Merge life context (deep merge)
  if (updates.lifeContext) {
    profile.lifeContext = mergeLifeContext(profile.lifeContext, updates.lifeContext);
  }

  // Merge preferences
  if (updates.preferences) {
    profile.preferences = mergePreferences(profile.preferences, updates.preferences);
  }

  await saveProfile(profile);
  return profile;
}

function mergeLifeContext(existing: LifeContext, updates: Partial<LifeContext>): LifeContext {
  const merged = { ...existing };
  if (updates.family) {
    merged.family = {
      ...existing.family,
      ...Object.fromEntries(Object.entries(updates.family).filter(([, v]) => v !== '' && v !== undefined)),
    };
  }
  if (updates.work) {
    merged.work = {
      ...existing.work,
      ...Object.fromEntries(Object.entries(updates.work).filter(([, v]) => v !== '' && v !== undefined && v !== 0)),
    };
  }
  if (updates.education) {
    merged.education = {
      ...existing.education,
      ...Object.fromEntries(Object.entries(updates.education).filter(([, v]) => v !== '' && v !== undefined)),
    };
  }
  if (updates.health) {
    merged.health = {
      ...existing.health,
      ...Object.fromEntries(Object.entries(updates.health).filter(([, v]) => v !== '' && v !== undefined)),
    };
  }
  if (updates.hobbies?.length) {
    merged.hobbies = [...new Set([...existing.hobbies, ...updates.hobbies])];
  }
  if (updates.currentChallenges?.length) {
    merged.currentChallenges = [...new Set([...existing.currentChallenges, ...updates.currentChallenges])];
  }
  if (updates.recentAchievements?.length) {
    merged.recentAchievements = [...new Set([...existing.recentAchievements, ...updates.recentAchievements])];
  }
  return merged;
}

function mergePreferences(existing: UserPreferences, updates: Partial<UserPreferences>): UserPreferences {
  const merged = { ...existing };
  if (updates.topicsLoved?.length) {
    merged.topicsLoved = [...new Set([...existing.topicsLoved, ...updates.topicsLoved])];
  }
  if (updates.topicsAvoided?.length) {
    merged.topicsAvoided = [...new Set([...existing.topicsAvoided, ...updates.topicsAvoided])];
  }
  if (updates.favoriteSubjects?.length) {
    merged.favoriteSubjects = [...new Set([...existing.favoriteSubjects, ...updates.favoriteSubjects])];
  }
  if (updates.learningStyle) merged.learningStyle = updates.learningStyle;
  if (updates.feedbackStyle) merged.feedbackStyle = updates.feedbackStyle;
  if (updates.contentDepth) merged.contentDepth = updates.contentDepth;
  return merged;
}

// ── Growth Metrics Update ────────────────────────────────────────────

export async function incrementGrowthMetrics(
  updates: Partial<GrowthMetrics>
): Promise<void> {
  const profile = loadProfileLocal();
  if (!profile) return;

  const m = profile.growthMetrics;
  if (updates.totalSessions) m.totalSessions += updates.totalSessions;
  if (updates.totalMinutes) m.totalMinutes += updates.totalMinutes;
  if (updates.topicsExplored) m.topicsExplored += updates.topicsExplored;
  if (updates.coursesCompleted) m.coursesCompleted += updates.coursesCompleted;
  if (updates.assessmentsPassed) m.assessmentsPassed += updates.assessmentsPassed;

  await saveProfile(profile);
}

// ── Build Profile Prompt Section ─────────────────────────────────────

export function buildProfilePromptSection(profile: LTUserProfile | null): string {
  if (!profile) return '';

  const parts: string[] = [];
  parts.push('\n--- PROFILO UTENTE ---');

  if (profile.displayName || profile.nickname) {
    const name = profile.nickname || profile.displayName;
    parts.push(`Nome: ${name}`);
  }
  if (profile.occupation) parts.push(`Occupazione: ${profile.occupation}`);
  if (profile.ageRange) parts.push(`Fascia età: ${profile.ageRange}`);

  // Personalità
  if (profile.personalityTraits.length > 0) {
    parts.push(`Tratti personalità: ${profile.personalityTraits.join(', ')}`);
  }
  parts.push(`Stile comunicazione preferito: ${profile.communicationStyle}`);
  parts.push(`Umorismo: ${profile.humorPreference}`);

  // Contesto di vita (solo campi compilati)
  const ctx = profile.lifeContext;
  if (ctx.family.status || ctx.family.members.length > 0) {
    parts.push(`\nFamiglia: ${ctx.family.status}${ctx.family.members.length > 0 ? ` (${ctx.family.members.join(', ')})` : ''}`);
  }
  if (ctx.work.role || ctx.work.company) {
    parts.push(`Lavoro: ${ctx.work.role}${ctx.work.company ? ` @ ${ctx.work.company}` : ''}${ctx.work.satisfaction ? ` (soddisfazione: ${ctx.work.satisfaction}/5)` : ''}`);
  }
  if (ctx.education.current || ctx.education.field) {
    parts.push(`Formazione: ${ctx.education.current || ctx.education.field}`);
  }
  if (ctx.hobbies.length > 0) {
    parts.push(`Hobby: ${ctx.hobbies.join(', ')}`);
  }
  if (ctx.currentChallenges.length > 0) {
    parts.push(`Sfide attuali: ${ctx.currentChallenges.join(', ')}`);
  }
  if (ctx.recentAchievements.length > 0) {
    parts.push(`Successi recenti: ${ctx.recentAchievements.join(', ')}`);
  }

  // Preferenze apprendimento
  const prefs = profile.preferences;
  if (prefs.topicsLoved.length > 0) {
    parts.push(`\nArgomenti preferiti: ${prefs.topicsLoved.join(', ')}`);
  }
  if (prefs.topicsAvoided.length > 0) {
    parts.push(`Argomenti da evitare: ${prefs.topicsAvoided.join(', ')}`);
  }
  parts.push(`Stile apprendimento: ${prefs.learningStyle}`);
  parts.push(`Feedback preferito: ${prefs.feedbackStyle}`);
  parts.push(`Profondità contenuti: ${prefs.contentDepth}`);

  // Metriche crescita
  const g = profile.growthMetrics;
  if (g.totalSessions > 0) {
    parts.push(`\nSessioni totali: ${g.totalSessions} | Minuti: ${g.totalMinutes} | Streak: ${g.streakDays} giorni`);
    parts.push(`Corsi completati: ${g.coursesCompleted} | Test superati: ${g.assessmentsPassed}`);
    parts.push(`Trend engagement: ${g.engagementTrend}`);
  }

  return parts.join('\n');
}

// ── DB Converters ────────────────────────────────────────────────────

function profileToDb(p: LTUserProfile) {
  return {
    id: p.id,
    workspace_id: p.workspaceId,
    display_name: p.displayName,
    nickname: p.nickname,
    age_range: p.ageRange,
    occupation: p.occupation,
    native_language: p.nativeLanguage,
    spoken_languages: p.spokenLanguages,
    personality_traits: JSON.stringify(p.personalityTraits),
    communication_style: p.communicationStyle,
    humor_preference: p.humorPreference,
    emotional_baseline: p.emotionalBaseline,
    life_context: JSON.stringify(p.lifeContext),
    preferences: JSON.stringify(p.preferences),
    growth_metrics: JSON.stringify(p.growthMetrics),
    education_history: JSON.stringify(p.educationHistory),
    first_interaction_at: p.firstInteractionAt,
    last_interaction_at: p.lastInteractionAt,
  };
}

function dbToProfile(row: Record<string, unknown>): LTUserProfile {
  const parseJSON = (val: unknown, fallback: unknown) => {
    if (typeof val === 'string') try { return JSON.parse(val); } catch { return fallback; }
    if (typeof val === 'object' && val !== null) return val;
    return fallback;
  };

  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    displayName: (row.display_name as string) || '',
    nickname: (row.nickname as string) || '',
    ageRange: (row.age_range as string) || '',
    occupation: (row.occupation as string) || '',
    nativeLanguage: (row.native_language as string) || 'it',
    spokenLanguages: (row.spoken_languages as string[]) || ['it'],
    personalityTraits: parseJSON(row.personality_traits, []) as string[],
    communicationStyle: (row.communication_style as LTUserProfile['communicationStyle']) || 'balanced',
    humorPreference: (row.humor_preference as LTUserProfile['humorPreference']) || 'moderate',
    emotionalBaseline: (row.emotional_baseline as string) || 'stable',
    lifeContext: parseJSON(row.life_context, DEFAULT_LIFE_CONTEXT) as LTUserProfile['lifeContext'],
    preferences: parseJSON(row.preferences, DEFAULT_USER_PREFERENCES) as LTUserProfile['preferences'],
    growthMetrics: parseJSON(row.growth_metrics, DEFAULT_GROWTH_METRICS) as LTUserProfile['growthMetrics'],
    educationHistory: parseJSON(row.education_history, []) as LTUserProfile['educationHistory'],
    firstInteractionAt: (row.first_interaction_at as string) || new Date().toISOString(),
    lastInteractionAt: (row.last_interaction_at as string) || new Date().toISOString(),
  };
}
