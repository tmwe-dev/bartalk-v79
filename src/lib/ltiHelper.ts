/**
 * BarTalk v8 — LTI Helper
 * Utility per il frontend LTI: detect LTI mode, extract token, submit grades.
 */

import { buildAuthHeadersAsync } from './authToken';

// ── Tipi ────────────────────────────────────────────────────────────

export interface LTILaunchParams {
  isLTI: boolean;
  token: string | null;
  platformName: string | null;
  contextTitle: string | null;
}

export interface LTIGradeResult {
  ok: boolean;
  gradeSubmitted: boolean;
  error?: string;
}

// ── Detect LTI mode da URL params ──────────────────────────────────

export function extractLTIFromURL(): LTILaunchParams {
  try {
    const params = new URLSearchParams(window.location.search);
    const isLTI = params.get('lti') === '1';

    if (!isLTI) {
      return { isLTI: false, token: null, platformName: null, contextTitle: null };
    }

    return {
      isLTI: true,
      token: params.get('token'),
      platformName: params.get('platform'),
      contextTitle: params.get('context'),
    };
  } catch {
    return { isLTI: false, token: null, platformName: null, contextTitle: null };
  }
}

// ── Pulisci URL params LTI (dopo l'estrazione) ─────────────────────

export function cleanLTIParams(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('lti');
    url.searchParams.delete('token');
    url.searchParams.delete('platform');
    url.searchParams.delete('context');
    window.history.replaceState({}, '', url.toString());
  } catch { /* ignora */ }
}

// ── Submit grade al LMS via /api/lti/ags ───────────────────────────

export async function submitGradeToLMS(opts: {
  launchId: string;
  score: number;       // 0-100
  courseId?: string;
  lessonIndex?: number;
  comment?: string;
}): Promise<LTIGradeResult> {
  try {
    const headers = await buildAuthHeadersAsync();
    if (!headers['Authorization']) {
      return { ok: false, gradeSubmitted: false, error: 'Not authenticated' };
    }

    const res = await fetch('/api/lti/ags', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, gradeSubmitted: false, error: data.error || 'Failed' };
    }

    return {
      ok: true,
      gradeSubmitted: data.gradeSubmitted || false,
    };
  } catch (err) {
    return {
      ok: false,
      gradeSubmitted: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
