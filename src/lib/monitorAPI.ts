/**
 * BarTalk — Monitor API Client
 *
 * Frontend interface for /api/monitor serverless endpoint.
 */

import { getAuthToken, buildAuthHeaders } from './authToken';

const MONITOR_URL = '/api/monitor';

// ─── Types ───────────────────────────────────────────────────

export interface ProviderStats {
  calls: number;
  errors: number;
  avgMs: number;
  totalMs: number;
  tokensIn: number;
  tokensOut: number;
}

export interface MonitorStats {
  totalCalls: number;
  errorRate: number;
  avgDuration: number;
  p95Duration: number;
  totalTokensIn: number;
  totalTokensOut: number;
  byProvider: Record<string, ProviderStats>;
  hoursBack: number;
}

export interface ErrorEvent {
  id: string;
  workspace_id: string;
  source: 'server' | 'client';
  severity: 'error' | 'warning' | 'fatal';
  message: string;
  stack: string | null;
  context: Record<string, unknown>;
  url: string | null;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
}

export interface ErrorsResponse {
  errors: ErrorEvent[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Queries ─────────────────────────────────────────────────

export async function fetchStats(hours = 24): Promise<MonitorStats> {
  const res = await fetch(`${MONITOR_URL}?view=stats&hours=${hours}`, {
    headers: buildAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Errore ${res.status}`);
  }
  return res.json();
}

export async function fetchErrors(page = 1, pageSize = 30): Promise<ErrorsResponse> {
  const res = await fetch(`${MONITOR_URL}?view=errors&page=${page}&pageSize=${pageSize}`, {
    headers: buildAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Errore ${res.status}`);
  }
  return res.json();
}

// ─── Report client error ────────────────────────────────────

export async function reportClientError(params: {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  severity?: 'error' | 'warning' | 'fatal';
}): Promise<void> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    await fetch(MONITOR_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
  } catch {
    // Silently fail — monitor errors shouldn't break the app
  }
}
