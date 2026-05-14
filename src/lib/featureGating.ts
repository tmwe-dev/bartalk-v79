/**
 * @module featureGating
 * Feature gating system based on user subscription tier.
 * Controls access to premium features (courses, TTS, file management, etc.)
 * by checking the user's tier (free, pro, team) against feature requirements.
 */

export type UserTier = 'free' | 'pro' | 'unlimited';

/** Mappa feature → tier che la possono usare */
const TIER_FEATURES: Record<string, UserTier[]> = {
  chat:       ['free', 'pro', 'unlimited'],
  tasks:      ['free', 'pro', 'unlimited'],
  progress:   ['free', 'pro', 'unlimited'],
  podcast:    ['pro', 'unlimited'],
  courses:    ['pro', 'unlimited'],
  maestro:    ['pro', 'unlimited'],
  freevoice:  ['pro', 'unlimited'],
  lifetutor:  ['unlimited'],
  carousel:   ['unlimited'],
};

/** Tier ordinati per livello (utile per confronti) */
const TIER_LEVEL: Record<UserTier, number> = {
  free: 0,
  pro: 1,
  unlimited: 2,
};

/**
 * Controlla se una feature è disponibile per un dato tier.
 */
export function isFeatureAvailable(feature: string, tier: UserTier): boolean {
  const allowed = TIER_FEATURES[feature];
  if (!allowed) return true; // feature sconosciuta → permetti (safe default)
  return allowed.includes(tier);
}

/**
 * Restituisce il tier minimo richiesto per una feature.
 */
export function getRequiredTier(feature: string): UserTier {
  const allowed = TIER_FEATURES[feature];
  if (!allowed || allowed.length === 0) return 'free';
  // Prendi il tier con livello più basso tra quelli permessi
  return allowed.reduce((min, t) => TIER_LEVEL[t] < TIER_LEVEL[min] ? t : min, allowed[0]);
}

/**
 * Restituisce tutte le features bloccate per un dato tier.
 */
export function getLockedFeatures(tier: UserTier): string[] {
  return Object.entries(TIER_FEATURES)
    .filter(([, tiers]) => !tiers.includes(tier))
    .map(([feature]) => feature);
}

/**
 * Label leggibile per tier.
 */
export function tierLabel(tier: UserTier): string {
  switch (tier) {
    case 'free': return 'FREE';
    case 'pro': return 'PRO';
    case 'unlimited': return 'UNLIMITED';
  }
}
