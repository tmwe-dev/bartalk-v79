/**
 * BarTalk — Audit Log API Client
 *
 * Frontend interface for /api/audit serverless endpoint.
 * Requires authenticated Supabase session.
 */

import type { AuditLogResponse, AuditExportFormat } from '../types/audit';
import { buildAuthHeaders } from './authToken';

const AUDIT_URL = '/api/audit';

// ─── List (paginated) ────────────────────────────────────────

export async function fetchAuditLogs(
  page = 1,
  pageSize = 50,
): Promise<AuditLogResponse> {
  const url = `${AUDIT_URL}?page=${page}&pageSize=${pageSize}`;
  const res = await fetch(url, { headers: buildAuthHeaders() });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Errore ${res.status}`);
  }

  return res.json();
}

// ─── Export ──────────────────────────────────────────────────

export async function exportAuditLogs(format: AuditExportFormat): Promise<void> {
  const url = `${AUDIT_URL}?export=${format}`;
  const res = await fetch(url, { headers: buildAuthHeaders() });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Errore export ${res.status}`);
  }

  // Trigger download
  const blob = await res.blob();
  const ext = format === 'csv' ? 'csv' : 'json';
  const filename = `bartalk_audit_${new Date().toISOString().slice(0, 10)}.${ext}`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ─── Delete / Purge ──────────────────────────────────────────

export async function purgeAuditLogs(
  opts: { before?: string; all?: boolean },
): Promise<{ deleted: number }> {
  const res = await fetch(AUDIT_URL, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Errore eliminazione ${res.status}`);
  }

  return res.json();
}
