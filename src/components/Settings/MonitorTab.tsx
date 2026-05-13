import { useState, useCallback, useEffect } from 'react';
import type { MonitorStats, ErrorEvent } from '../../lib/monitorAPI';
import { fetchStats, fetchErrors } from '../../lib/monitorAPI';
import './MonitorTab.css';

const SEVERITY_LABELS: Record<string, string> = {
  fatal: 'Fatale',
  error: 'Errore',
  warning: 'Avviso',
};

const SEVERITY_VARIANT: Record<string, string> = {
  fatal: 'badge-danger',
  error: 'badge-danger',
  warning: 'badge-warning',
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatMs(ms: number): string {
  if (ms >= 10_000) return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

type View = 'dashboard' | 'errors';

export function MonitorTab() {
  const [view, setView] = useState<View>('dashboard');
  const [hours, setHours] = useState(24);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [errTotal, setErrTotal] = useState(0);
  const [errPage, setErrPage] = useState(1);
  const [errHasMore, setErrHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async (h: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStats(h);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadErrors = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchErrors(p);
      setErrors(data.errors);
      setErrTotal(data.total);
      setErrPage(data.page);
      setErrHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'dashboard') loadStats(hours);
    else loadErrors(1);
  }, [view, hours, loadStats, loadErrors]);

  // ─── Not authenticated ──────────────────────────────────
  if (error === 'Non autenticato.') {
    return (
      <div className="tab-content">
        <p className="tab-description">
          Il monitoraggio è disponibile solo per gli utenti autenticati.
        </p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      {/* Sub-navigation */}
      <div className="monitor-nav">
        <button
          className={`btn btn-sm ${view === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`btn btn-sm ${view === 'errors' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setView('errors')}
        >
          Errori {errTotal > 0 && `(${errTotal})`}
        </button>
      </div>

      {error && <div className="audit-status audit-status-err">{error}</div>}

      {/* ─── Dashboard View ─────────────────────────────── */}
      {view === 'dashboard' && (
        <>
          <div className="monitor-toolbar">
            <select
              className="monitor-select"
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
            >
              <option value={1}>Ultima ora</option>
              <option value={6}>Ultime 6 ore</option>
              <option value={24}>Ultime 24 ore</option>
              <option value={72}>Ultimi 3 giorni</option>
              <option value={168}>Ultima settimana</option>
            </select>
            <button className="btn btn-sm btn-secondary" onClick={() => loadStats(hours)} disabled={loading}>
              {loading ? '...' : '↻'}
            </button>
          </div>

          {stats && (
            <>
              {/* KPI cards */}
              <div className="monitor-kpis">
                <div className="kpi-card">
                  <div className="kpi-value">{formatNum(stats.totalCalls)}</div>
                  <div className="kpi-label">Chiamate API</div>
                </div>
                <div className={`kpi-card ${stats.errorRate > 10 ? 'kpi-danger' : stats.errorRate > 5 ? 'kpi-warning' : ''}`}>
                  <div className="kpi-value">{stats.errorRate}%</div>
                  <div className="kpi-label">Tasso errore</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-value">{formatMs(stats.avgDuration)}</div>
                  <div className="kpi-label">Latenza media</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-value">{formatMs(stats.p95Duration)}</div>
                  <div className="kpi-label">P95 latenza</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-value">{formatNum(stats.totalTokensIn + stats.totalTokensOut)}</div>
                  <div className="kpi-label">Token totali</div>
                </div>
              </div>

              {/* Per-provider breakdown */}
              {Object.keys(stats.byProvider).length > 0 && (
                <div className="monitor-providers">
                  <div className="monitor-section-title">Per provider</div>
                  <div className="provider-grid">
                    {Object.entries(stats.byProvider).map(([name, p]) => (
                      <div key={name} className="provider-card">
                        <div className="provider-name">{name}</div>
                        <div className="provider-stats">
                          <span>{p.calls} chiamate</span>
                          <span className={p.errors > 0 ? 'text-danger' : ''}>{p.errors} errori</span>
                          <span>{formatMs(p.avgMs)} avg</span>
                          <span>{formatNum(p.tokensIn + p.tokensOut)} token</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.totalCalls === 0 && (
                <div className="audit-empty">
                  Nessuna metrica nel periodo selezionato.
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── Errors View ────────────────────────────────── */}
      {view === 'errors' && (
        <>
          <div className="monitor-toolbar">
            <span className="tab-description">{errTotal} errori totali</span>
            <button className="btn btn-sm btn-secondary" onClick={() => loadErrors(errPage)} disabled={loading}>
              {loading ? '...' : '↻ Aggiorna'}
            </button>
          </div>

          {errors.length === 0 && !loading && (
            <div className="audit-empty">Nessun errore registrato.</div>
          )}

          <div className="audit-list">
            {errors.map(err => (
              <div key={err.id} className="audit-row monitor-error-row">
                <div className="audit-row-top">
                  <div className="monitor-error-badges">
                    <span className={`audit-badge ${SEVERITY_VARIANT[err.severity] || 'badge-default'}`}>
                      {SEVERITY_LABELS[err.severity] || err.severity}
                    </span>
                    <span className="audit-badge badge-default">
                      {err.source === 'server' ? 'Server' : 'Client'}
                    </span>
                  </div>
                  <span className="audit-date">{formatDate(err.created_at)}</span>
                </div>
                <div className="monitor-error-message">{err.message}</div>
                {err.stack && (
                  <details className="monitor-error-stack">
                    <summary>Stack trace</summary>
                    <pre>{err.stack}</pre>
                  </details>
                )}
                {err.context && Object.keys(err.context).length > 0 && (
                  <div className="audit-detail">
                    {Object.entries(err.context).map(([k, v]) =>
                      `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`
                    ).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {errTotal > 30 && (
            <div className="audit-pagination">
              <button className="btn btn-sm btn-secondary" onClick={() => loadErrors(errPage - 1)} disabled={errPage <= 1 || loading}>
                ← Precedente
              </button>
              <span className="audit-page-info">Pagina {errPage} di {Math.ceil(errTotal / 30)}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => loadErrors(errPage + 1)} disabled={!errHasMore || loading}>
                Successiva →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
