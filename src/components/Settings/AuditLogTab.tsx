import { useState, useCallback, useEffect } from 'react';
import { useT } from '../../lib/i18n';
import type { AuditLogEntry, AuditExportFormat } from '../../types/audit';
import { fetchAuditLogs, exportAuditLogs, purgeAuditLogs } from '../../lib/auditAPI';
import './AuditLogTab.css';

/** Human-readable labels for audit actions (Italian). */
const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  signup: 'Registrazione',
  api_key_save: 'auditApiKeySave',
  api_key_delete: 'auditApiKeyDelete',
  settings_update: 'auditSettingsUpdate',
  conversation_delete: 'auditConversationDelete',
  export_data: 'auditExportData',
  delete_account: 'auditDeleteAccount',
  audit_purge: 'auditLogsPurge',
};

/** Action → badge color class. */
const ACTION_VARIANT: Record<string, string> = {
  login: 'badge-info',
  logout: 'badge-info',
  signup: 'badge-success',
  api_key_save: 'badge-warning',
  api_key_delete: 'badge-danger',
  conversation_delete: 'badge-danger',
  delete_account: 'badge-danger',
  audit_purge: 'badge-danger',
  export_data: 'badge-info',
  settings_update: 'badge-default',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDetail(detail: Record<string, unknown> | null): string {
  if (!detail || Object.keys(detail).length === 0) return '';
  return Object.entries(detail)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

export function AuditLogTab() {
  const t = useT();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const PAGE_SIZE = 30;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLogs(p, PAGE_SIZE);
      setLogs(res.logs);
      setTotal(res.total);
      setPage(res.page);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => { load(1); }, [load]);

  const handleExport = async (format: AuditExportFormat) => {
    try {
      await exportAuditLogs(format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore export');
    }
  };

  const handlePurge = async () => {
    try {
      const { deleted } = await purgeAuditLogs({ all: true });
      setConfirmPurge(false);
      setLogs([]);
      setTotal(0);
      setHasMore(false);
      setError(null);
      // Brief success message
      setError(`✓ ${t('auditDeleted')} ${deleted} log`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore eliminazione');
    }
  };

  // ─── Not authenticated? ──────────────────────────────────────
  if (error === t('auditNotAuth')) {
    return (
      <div className="tab-content">
        <p className="tab-description">
          I log di audit sono disponibili solo per gli utenti autenticati.
          Effettua il login per visualizzare le attività del tuo workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <p className="tab-description">
        {t('auditDesc')} {total > 0 && `${total} ${t('auditTotalEvents')}.`}
      </p>

      {/* Toolbar */}
      <div className="audit-toolbar">
        <div className="audit-toolbar-left">
          <button className="btn btn-sm btn-secondary" onClick={() => load(page)} disabled={loading}>
            {loading ? '...' : `↻ ${t('refresh')}`}
          </button>
        </div>
        <div className="audit-toolbar-right">
          <button className="btn btn-sm btn-secondary" onClick={() => handleExport('csv')}>
            ↓ CSV
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => handleExport('json')}>
            ↓ JSON
          </button>
          {!confirmPurge ? (
            <button
              className="btn btn-sm btn-danger-outline"
              onClick={() => setConfirmPurge(true)}
              disabled={total === 0}
            >
              {t('auditDeleteAll')}
            </button>
          ) : (
            <div className="audit-confirm-group">
              <span className="audit-confirm-text">{t('auditConfirm')}</span>
              <button className="btn btn-sm btn-danger-outline" onClick={handlePurge}>
                {t('auditConfirmDelete')}
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setConfirmPurge(false)}>
                {t('cancel')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error / status */}
      {error && (
        <div className={`audit-status ${error.startsWith('✓') ? 'audit-status-ok' : 'audit-status-err'}`}>
          {error}
        </div>
      )}

      {/* Log list */}
      {logs.length === 0 && !loading && !error && (
        <div className="audit-empty">{t('auditEmpty')}</div>
      )}

      <div className="audit-list">
        {logs.map(log => (
          <div key={log.id} className="audit-row">
            <div className="audit-row-top">
              <span className={`audit-badge ${ACTION_VARIANT[log.action] || 'badge-default'}`}>
                {t(ACTION_LABELS[log.action] || log.action)}
              </span>
              <span className="audit-date">{formatDate(log.created_at)}</span>
            </div>
            {(log.detail && Object.keys(log.detail).length > 0) && (
              <div className="audit-detail">{formatDetail(log.detail)}</div>
            )}
            {log.ip && <div className="audit-ip">IP: {log.ip}</div>}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {(total > PAGE_SIZE) && (
        <div className="audit-pagination">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => load(page - 1)}
            disabled={page <= 1 || loading}
          >
            ← {t('auditPrevious')}
          </button>
          <span className="audit-page-info">
            {t('auditPage')} {page} {t('auditOf')} {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => load(page + 1)}
            disabled={!hasMore || loading}
          >
            {t('auditNext')} →
          </button>
        </div>
      )}
    </div>
  );
}
