/**
 * BarTalk v8.2.5 — Provider Health Monitoring & Fallback Chain
 * Tracks provider health status and implements automatic fallback.
 */

import type { ProviderType } from '../types/agents';
import { DEFAULT_MODELS } from './constants';

// ── Health Status ──────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface ProviderHealthState {
  provider: ProviderType;
  status: HealthStatus;
  lastSuccess: number;      // timestamp
  lastError: number;         // timestamp
  consecutiveFailures: number;
  avgLatency: number;        // ms (rolling average)
  totalRequests: number;
  totalErrors: number;
}

// ── Configuration ──────────────────────────────────────────────────────

const HEALTH_CONFIG = {
  /** After this many consecutive failures, mark as "down" */
  downThreshold: 3,
  /** After this many consecutive failures, mark as "degraded" */
  degradedThreshold: 1,
  /** Auto-recover after this many ms without new errors */
  recoveryTimeout: 60_000, // 1 minute
  /** Rolling average window for latency */
  latencyWindow: 10,
} as const;

// ── Fallback chains per provider ───────────────────────────────────────

/**
 * Defines fallback order: if provider X fails, try these alternatives.
 * Based on capability similarity.
 */
const FALLBACK_CHAINS: Record<ProviderType, ProviderType[]> = {
  openai: ['anthropic', 'xai', 'gemini', 'groq'],
  anthropic: ['openai', 'gemini', 'xai', 'groq'],
  gemini: ['openai', 'anthropic', 'xai', 'groq'],
  groq: ['xai', 'openai', 'gemini', 'anthropic'],
  xai: ['groq', 'openai', 'anthropic', 'gemini'],
};

// ── Health Store (in-memory, per session) ──────────────────────────────

const healthStore = new Map<ProviderType, ProviderHealthState>();

function getOrCreateState(provider: ProviderType): ProviderHealthState {
  if (!healthStore.has(provider)) {
    healthStore.set(provider, {
      provider,
      status: 'healthy',
      lastSuccess: 0,
      lastError: 0,
      consecutiveFailures: 0,
      avgLatency: 0,
      totalRequests: 0,
      totalErrors: 0,
    });
  }
  return healthStore.get(provider)!;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Record a successful request for the given provider.
 */
export function recordSuccess(provider: ProviderType, latencyMs: number): void {
  const state = getOrCreateState(provider);
  state.lastSuccess = Date.now();
  state.consecutiveFailures = 0;
  state.totalRequests++;
  state.status = 'healthy';

  // Rolling average latency
  const w = HEALTH_CONFIG.latencyWindow;
  state.avgLatency = state.avgLatency === 0
    ? latencyMs
    : (state.avgLatency * (w - 1) + latencyMs) / w;
}

/**
 * Record a failed request for the given provider.
 */
export function recordFailure(provider: ProviderType): void {
  const state = getOrCreateState(provider);
  state.lastError = Date.now();
  state.consecutiveFailures++;
  state.totalRequests++;
  state.totalErrors++;

  if (state.consecutiveFailures >= HEALTH_CONFIG.downThreshold) {
    state.status = 'down';
  } else if (state.consecutiveFailures >= HEALTH_CONFIG.degradedThreshold) {
    state.status = 'degraded';
  }
}

/**
 * Get the current health status of a provider.
 * Auto-recovers if no errors for `recoveryTimeout` ms.
 */
export function getProviderHealth(provider: ProviderType): ProviderHealthState {
  const state = getOrCreateState(provider);

  // Auto-recovery check
  if (state.status !== 'healthy' && state.lastError > 0) {
    const timeSinceError = Date.now() - state.lastError;
    if (timeSinceError > HEALTH_CONFIG.recoveryTimeout) {
      state.status = 'healthy';
      state.consecutiveFailures = 0;
    }
  }

  return { ...state };
}

/**
 * Get health status for all known providers.
 */
export function getAllProviderHealth(): ProviderHealthState[] {
  const allProviders: ProviderType[] = ['openai', 'anthropic', 'gemini', 'groq', 'xai'];
  return allProviders.map(p => getProviderHealth(p));
}

/**
 * Check if a provider is currently available.
 */
export function isProviderAvailable(provider: ProviderType): boolean {
  return getProviderHealth(provider).status !== 'down';
}

/**
 * Get the best fallback provider for a given failed provider.
 * Returns the first healthy provider in the fallback chain,
 * or null if all are down.
 */
export function getFallbackProvider(
  failedProvider: ProviderType,
  availableProviders?: ProviderType[]
): { provider: ProviderType; model: string } | null {
  const chain = FALLBACK_CHAINS[failedProvider] || [];

  for (const candidate of chain) {
    // If we have a whitelist, check it
    if (availableProviders && !availableProviders.includes(candidate)) continue;

    const health = getProviderHealth(candidate);
    if (health.status !== 'down') {
      return {
        provider: candidate,
        model: DEFAULT_MODELS[candidate],
      };
    }
  }

  return null;
}

/**
 * Reset health state (e.g., when user changes API keys).
 */
export function resetProviderHealth(provider?: ProviderType): void {
  if (provider) {
    healthStore.delete(provider);
  } else {
    healthStore.clear();
  }
}

/**
 * Get a human-readable summary of provider health.
 */
export function getHealthSummary(): string {
  const states = getAllProviderHealth();
  const lines = states.map(s => {
    const emoji = s.status === 'healthy' ? '🟢' : s.status === 'degraded' ? '🟡' : '🔴';
    const latency = s.avgLatency > 0 ? `${Math.round(s.avgLatency)}ms` : 'N/A';
    return `${emoji} ${s.provider}: ${s.status} (${s.totalRequests} req, ${latency} avg)`;
  });
  return lines.join('\n');
}
