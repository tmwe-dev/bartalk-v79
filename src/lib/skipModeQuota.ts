/**
 * @module skipModeQuota
 * Skip mode (unauthenticated) quota management.
 * Tracks and enforces usage limits for AI messages, TTS requests, and courses
 * with configurable expiry and warning thresholds.
 */

import { SKIP_MODE } from './constants';

const QUOTA_KEY = 'bt_skip_quota';

export interface SkipModeQuota {
  aiMessagesUsed: number;
  ttsRequestsUsed: number;
  coursesCreated: number;
  startDate: string; // ISO timestamp
}

const DEFAULT_QUOTA: SkipModeQuota = {
  aiMessagesUsed: 0,
  ttsRequestsUsed: 0,
  coursesCreated: 0,
  startDate: '',
};

/**
 * Loads skip quota from storage.
 * @returns SkipModeQuota
 */
export function loadSkipQuota(): SkipModeQuota {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) { console.warn('[skipQuota] loadSkipQuota failed:', err); }
  return { ...DEFAULT_QUOTA };
}

/**
 * Saves skip quota to storage.
 * @param quota - The quota parameter
 */
export function saveSkipQuota(quota: SkipModeQuota): void {
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
  } catch (err) { console.warn('[skipQuota] saveSkipQuota failed:', err); }
}

/**
 * Initializes skip quota.
 */
export function initSkipQuota(): void {
  const existing = loadSkipQuota();
  if (!existing.startDate) {
    saveSkipQuota({
      ...DEFAULT_QUOTA,
      startDate: new Date().toISOString(),
    });
  }
}

/**
 * Gets remaining quota.
 * @returns { ai: number; tts: number; courses: number }
 */
export function getRemainingQuota(): { ai: number; tts: number; courses: number } {
  const q = loadSkipQuota();
  return {
    ai: Math.max(0, SKIP_MODE.maxAIMessages - q.aiMessagesUsed),
    tts: Math.max(0, SKIP_MODE.maxTTSRequests - q.ttsRequestsUsed),
    courses: Math.max(0, SKIP_MODE.maxCourses - q.coursesCreated),
  };
}

/**
 * Gets usage percent.
 * @param type - The type parameter
 * @returns number
 */
export function getUsagePercent(type: 'ai' | 'tts' | 'courses'): number {
  const q = loadSkipQuota();
  switch (type) {
    case 'ai': return Math.min(100, Math.round((q.aiMessagesUsed / SKIP_MODE.maxAIMessages) * 100));
    case 'tts': return Math.min(100, Math.round((q.ttsRequestsUsed / SKIP_MODE.maxTTSRequests) * 100));
    case 'courses': return Math.min(100, Math.round((q.coursesCreated / SKIP_MODE.maxCourses) * 100));
  }
}

/**
 * Checks if has expired.
 * @returns boolean
 */
export function hasExpired(): boolean {
  const q = loadSkipQuota();
  if (!q.startDate) return false;
  const start = new Date(q.startDate).getTime();
  const now = Date.now();
  const expiryMs = SKIP_MODE.expiryDays * 24 * 60 * 60 * 1000;
  return now - start > expiryMs;
}

/**
 * Gets remaining days.
 * @returns number
 */
export function getRemainingDays(): number {
  const q = loadSkipQuota();
  if (!q.startDate) return SKIP_MODE.expiryDays;
  const start = new Date(q.startDate).getTime();
  const expiryMs = SKIP_MODE.expiryDays * 24 * 60 * 60 * 1000;
  const remaining = expiryMs - (Date.now() - start);
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/**
 * Increments a i usage counter.
 */
export function incrementAIUsage(): void {
  const q = loadSkipQuota();
  q.aiMessagesUsed++;
  saveSkipQuota(q);
}

/**
 * Increments t t s usage counter.
 */
export function incrementTTSUsage(): void {
  const q = loadSkipQuota();
  q.ttsRequestsUsed++;
  saveSkipQuota(q);
}

/**
 * Increments course usage counter.
 */
export function incrementCourseUsage(): void {
  const q = loadSkipQuota();
  q.coursesCreated++;
  saveSkipQuota(q);
}

/**
 * Checks if the quota for a category has been exceeded.
 * @param category - The quota category to check
 * @returns True if the quota limit has been reached
 */
export function isQuotaExceeded(type: 'ai' | 'tts' | 'courses'): { exceeded: boolean; message: string } {
  // Check expiry first
  if (hasExpired()) {
    return { exceeded: true, message: 'Il periodo di prova è scaduto. Registrati per continuare a usare BarTalk.' };
  }

  const remaining = getRemainingQuota();
  switch (type) {
    case 'ai':
      return remaining.ai <= 0
        ? { exceeded: true, message: `Hai raggiunto il limite di ${SKIP_MODE.maxAIMessages} messaggi AI. Registrati per accesso illimitato.` }
        : { exceeded: false, message: '' };
    case 'tts':
      return remaining.tts <= 0
        ? { exceeded: true, message: `Hai raggiunto il limite di ${SKIP_MODE.maxTTSRequests} richieste vocali. Registrati per accesso illimitato.` }
        : { exceeded: false, message: '' };
    case 'courses':
      return remaining.courses <= 0
        ? { exceeded: true, message: `Hai raggiunto il limite di ${SKIP_MODE.maxCourses} corsi. Registrati per creare più corsi.` }
        : { exceeded: false, message: '' };
  }
}

/**
 * Checks if is near quota limit.
 * @param type - The type parameter
 * @returns boolean
 */
export function isNearQuotaLimit(type: 'ai' | 'tts' | 'courses'): boolean {
  return getUsagePercent(type) >= SKIP_MODE.warningThresholdPercent;
}

/**
 * Clears skip quota.
 */
export function clearSkipQuota(): void {
  localStorage.removeItem(QUOTA_KEY);
}
