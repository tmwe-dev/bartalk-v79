/**
 * @module usageTracker
 * Token and request usage tracking system.
 * Tracks cumulative token consumption and request counts per provider,
 * with daily/monthly aggregation and localStorage persistence.
 */

const USAGE_KEY = 'bt_usage_stats';

export interface UsageStats {
  totalTokensIn: number;
  totalTokensOut: number;
  totalAIRequests: number;
  totalTTSRequests: number;
  totalTTSChars: number;
  sessionStartTime: string;
  lastRequestTime: string;
}

const DEFAULT_STATS: UsageStats = {
  totalTokensIn: 0,
  totalTokensOut: 0,
  totalAIRequests: 0,
  totalTTSRequests: 0,
  totalTTSChars: 0,
  sessionStartTime: new Date().toISOString(),
  lastRequestTime: '',
};

/**
 * Loads usage stats from storage.
 * @returns UsageStats
 */
export function loadUsageStats(): UsageStats {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS, sessionStartTime: new Date().toISOString() };
}

function saveUsageStats(stats: UsageStats): void {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

export function recordAIUsage(tokensIn: number, tokensOut: number): void {
  const stats = loadUsageStats();
  stats.totalTokensIn += tokensIn;
  stats.totalTokensOut += tokensOut;
  stats.totalAIRequests++;
  stats.lastRequestTime = new Date().toISOString();
  saveUsageStats(stats);
}

export function recordTTSUsage(characters: number): void {
  const stats = loadUsageStats();
  stats.totalTTSRequests++;
  stats.totalTTSChars += characters;
  stats.lastRequestTime = new Date().toISOString();
  saveUsageStats(stats);
}

/** Stima costo approssimativa basata su pricing medio */
export function estimateCost(): { usd: number; breakdown: { ai: number; tts: number } } {
  const stats = loadUsageStats();
  // Pricing approssimativo (media tra provider)
  const aiCostPerMToken = 3.0; // ~$3/M token (media input+output)
  const ttsCostPerKChars = 0.03; // ~$0.03/1K chars ElevenLabs

  const totalTokens = stats.totalTokensIn + stats.totalTokensOut;
  const aiCost = (totalTokens / 1_000_000) * aiCostPerMToken;
  const ttsCost = (stats.totalTTSChars / 1_000) * ttsCostPerKChars;

  return {
    usd: Math.round((aiCost + ttsCost) * 100) / 100,
    breakdown: {
      ai: Math.round(aiCost * 100) / 100,
      tts: Math.round(ttsCost * 100) / 100,
    },
  };
}

/**
 * Resets usage stats to defaults.
 */
export function resetUsageStats(): void {
  localStorage.removeItem(USAGE_KEY);
}
