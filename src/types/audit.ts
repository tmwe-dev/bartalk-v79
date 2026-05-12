/** Audit log entry as stored in the DB and returned by the API. */
export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  action: AuditAction;
  detail: Record<string, unknown> | null;
  ip: string | null;
  created_at: string; // ISO 8601
}

/** Known audit actions. Extensible — the DB column is TEXT. */
export type AuditAction =
  | 'login'
  | 'logout'
  | 'signup'
  | 'api_key_save'
  | 'api_key_delete'
  | 'settings_update'
  | 'conversation_delete'
  | 'export_data'
  | 'delete_account'
  | string; // future actions

/** Shape returned by GET /api/audit */
export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Shape sent to DELETE /api/audit */
export interface AuditDeleteRequest {
  before?: string; // ISO 8601 — delete logs older than this
  all?: boolean;   // delete all logs for the workspace
}

/** Export format options */
export type AuditExportFormat = 'json' | 'csv';
