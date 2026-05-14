/**
 * BarTalk v8 — AdminPage
 * Dashboard admin con 3 tab: Inviti, Utenti, Usage.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface AdminPageProps {
  onBack: () => void;
}

type Tab = 'invites' | 'users' | 'usage';

interface InviteFormData {
  label: string;
  tier: string;
  credits_ai: number;
  credits_tts: number;
  credits_courses: number;
  max_redemptions: number;
  expires_days: number;
}

const DEFAULT_FORM: InviteFormData = {
  label: '',
  tier: 'unlimited',
  credits_ai: 1000,
  credits_tts: 50,
  credits_courses: 10,
  max_redemptions: 1,
  expires_days: 30,
};

export function AdminPage({ onBack }: AdminPageProps) {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<Tab>('invites');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [stats, setStats] = useState<Record<string, unknown>>(null as unknown as Record<string, unknown>);
  const [invites, setInvites] = useState<Record<string, unknown>[]>([]);
  const [inviteForm, setInviteForm] = useState<InviteFormData>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  // ── Carica dati ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();

      const [statsRes, invitesRes] = await Promise.all([
        fetch('/api/admin-stats', { headers }),
        fetch('/api/invites', { headers }),
      ]);

      if (!statsRes.ok) {
        const err = await statsRes.json();
        throw new Error(err.error || `Stats ${statsRes.status}`);
      }
      if (!invitesRes.ok) {
        const err = await invitesRes.json();
        throw new Error(err.error || `Invites ${invitesRes.status}`);
      }

      const statsData = await statsRes.json();
      const invitesData = await invitesRes.json();

      setStats(statsData);
      setInvites(invitesData.invites || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Crea invito ──
  const handleCreateInvite = async () => {
    setCreating(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore creazione');
      }
      setInviteForm(DEFAULT_FORM);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  // ── Disattiva invito ──
  const handleDeactivate = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/invites?id=${id}`, { method: 'DELETE', headers });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // ── Copia link ──
  const copyLink = (code: string) => {
    const link = `${window.location.origin}?invite=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <button className="admin-back" onClick={onBack}>← Indietro</button>
          <h1>Admin Dashboard</h1>
        </div>
        <div className="admin-loading">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <button className="admin-back" onClick={onBack}>← Indietro</button>
        <h1>Admin Dashboard</h1>
        <span className="admin-user">{user?.email}</span>
      </div>

      {error && (
        <div className="admin-error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="admin-stats-cards">
          <div className="admin-card">
            <div className="admin-card-value">{stats.users?.total || 0}</div>
            <div className="admin-card-label">Utenti totali</div>
          </div>
          <div className="admin-card">
            <div className="admin-card-value">{stats.users?.active7d || 0}</div>
            <div className="admin-card-label">Attivi (7gg)</div>
          </div>
          <div className="admin-card">
            <div className="admin-card-value">{stats.invites?.totalRedemptions || 0}</div>
            <div className="admin-card-label">Inviti riscattati</div>
          </div>
          <div className="admin-card">
            <div className="admin-card-value">{stats.usage?.today || 0}</div>
            <div className="admin-card-label">Messaggi oggi</div>
          </div>
          <div className="admin-card">
            <div className="admin-card-value">${stats.usage?.costMonth || 0}</div>
            <div className="admin-card-label">Costo mese</div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'invites' ? 'active' : ''}`} onClick={() => setActiveTab('invites')}>
          Inviti
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          Utenti
        </button>
        <button className={`admin-tab ${activeTab === 'usage' ? 'active' : ''}`} onClick={() => setActiveTab('usage')}>
          Utilizzo
        </button>
      </div>

      {/* Tab content */}
      <div className="admin-content">
        {activeTab === 'invites' && (
          <div className="admin-invites">
            {/* Form crea invito */}
            <div className="admin-form">
              <h3>Crea nuovo invito</h3>
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Etichetta</label>
                  <input
                    type="text"
                    value={inviteForm.label}
                    onChange={e => setInviteForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="Es. Beta tester Marco"
                  />
                </div>
                <div className="admin-field">
                  <label>Tier</label>
                  <select value={inviteForm.tier} onChange={e => setInviteForm(f => ({ ...f, tier: e.target.value }))}>
                    <option value="unlimited">Unlimited</option>
                    <option value="pro">Pro</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label>Crediti AI</label>
                  <input type="number" value={inviteForm.credits_ai} onChange={e => setInviteForm(f => ({ ...f, credits_ai: +e.target.value }))} />
                </div>
                <div className="admin-field">
                  <label>Crediti TTS</label>
                  <input type="number" value={inviteForm.credits_tts} onChange={e => setInviteForm(f => ({ ...f, credits_tts: +e.target.value }))} />
                </div>
                <div className="admin-field">
                  <label>Crediti Corsi</label>
                  <input type="number" value={inviteForm.credits_courses} onChange={e => setInviteForm(f => ({ ...f, credits_courses: +e.target.value }))} />
                </div>
                <div className="admin-field">
                  <label>Max riscatti</label>
                  <input type="number" value={inviteForm.max_redemptions} onChange={e => setInviteForm(f => ({ ...f, max_redemptions: +e.target.value }))} />
                </div>
                <div className="admin-field">
                  <label>Scadenza (giorni)</label>
                  <input type="number" value={inviteForm.expires_days} onChange={e => setInviteForm(f => ({ ...f, expires_days: +e.target.value }))} />
                </div>
              </div>
              <button className="admin-create-btn" onClick={handleCreateInvite} disabled={creating}>
                {creating ? 'Creazione...' : '+ Crea invito'}
              </button>
            </div>

            {/* Lista inviti */}
            <div className="admin-list">
              <h3>Inviti ({invites.length})</h3>
              {invites.length === 0 ? (
                <p className="admin-empty">Nessun invito creato</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Codice</th>
                        <th>Etichetta</th>
                        <th>Tier</th>
                        <th>AI</th>
                        <th>Riscatti</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map(inv => (
                        <tr key={inv.id} className={!inv.active ? 'admin-row-inactive' : ''}>
                          <td className="admin-code">{inv.code}</td>
                          <td>{inv.label || '—'}</td>
                          <td>{inv.tier}</td>
                          <td>{inv.credits_ai}</td>
                          <td>{inv.current_redemptions}/{inv.max_redemptions}</td>
                          <td>
                            <span className={`admin-badge ${inv.active ? 'active' : 'inactive'}`}>
                              {inv.active ? 'Attivo' : 'Disattivato'}
                            </span>
                          </td>
                          <td className="admin-actions">
                            <button className="admin-action-btn" onClick={() => copyLink(inv.code)} title="Copia link">
                              {copiedCode === inv.code ? '✓' : '🔗'}
                            </button>
                            {inv.active && (
                              <button className="admin-action-btn admin-action-danger" onClick={() => handleDeactivate(inv.id)} title="Disattiva">
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Dettaglio riscatti */}
              {invites.filter(i => i.invite_redemptions?.length > 0).map(inv => (
                <div key={`r-${inv.id}`} className="admin-redemptions">
                  <strong>{inv.code}</strong> riscattato da:
                  {inv.invite_redemptions.map((r: Record<string, unknown>) => (
                    <span key={r.id} className="admin-redeemer">
                      {r.email || r.user_id.slice(0, 8)} ({new Date(r.redeemed_at).toLocaleDateString()})
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && stats?.users && (
          <div className="admin-users">
            <h3>Utenti registrati ({stats.users.total})</h3>
            <div className="admin-user-summary">
              Attivi ultimi 7gg: <strong>{stats.users.active7d}</strong> |
              Con crediti invito: <strong>{stats.users.withCredits}</strong>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Provider</th>
                    <th>Crediti AI</th>
                    <th>Tier</th>
                    <th>Ultimo accesso</th>
                    <th>Registrato</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.users.list || []).map((u: Record<string, unknown>) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.provider}</td>
                      <td>{u.credits?.credits_ai ?? '—'}</td>
                      <td>{u.credits?.tier_override || '—'}</td>
                      <td>{u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : 'Mai'}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'usage' && stats?.usage && (
          <div className="admin-usage">
            <h3>Statistiche utilizzo</h3>
            <div className="admin-usage-grid">
              <div className="admin-usage-item">
                <div className="admin-usage-value">{stats.usage.today}</div>
                <div className="admin-usage-label">Messaggi oggi</div>
              </div>
              <div className="admin-usage-item">
                <div className="admin-usage-value">{stats.usage.week}</div>
                <div className="admin-usage-label">Messaggi settimana</div>
              </div>
              <div className="admin-usage-item">
                <div className="admin-usage-value">{stats.usage.month}</div>
                <div className="admin-usage-label">Messaggi mese</div>
              </div>
              <div className="admin-usage-item">
                <div className="admin-usage-value">${stats.usage.costMonth}</div>
                <div className="admin-usage-label">Costo API mese</div>
              </div>
            </div>

            {stats.subscriptions && (
              <div className="admin-subs">
                <h4>Abbonamenti attivi</h4>
                <div className="admin-subs-grid">
                  <div className="admin-sub-item">
                    <span className="admin-sub-tier">Free</span>
                    <span className="admin-sub-count">{stats.subscriptions.free || 0}</span>
                  </div>
                  <div className="admin-sub-item">
                    <span className="admin-sub-tier">Pro</span>
                    <span className="admin-sub-count">{stats.subscriptions.pro || 0}</span>
                  </div>
                  <div className="admin-sub-item">
                    <span className="admin-sub-tier">Unlimited</span>
                    <span className="admin-sub-count">{stats.subscriptions.unlimited || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Barra visiva usage giornaliero */}
            <div className="admin-usage-bar-section">
              <h4>Uso relativo</h4>
              <div className="admin-usage-bar">
                <div className="admin-usage-bar-label">Oggi</div>
                <div className="admin-usage-bar-track">
                  <div
                    className="admin-usage-bar-fill"
                    style={{ width: `${Math.min(100, stats.usage.month > 0 ? (stats.usage.today / stats.usage.month) * 100 : 0)}%` }}
                  />
                </div>
                <span>{stats.usage.today}</span>
              </div>
              <div className="admin-usage-bar">
                <div className="admin-usage-bar-label">Settimana</div>
                <div className="admin-usage-bar-track">
                  <div
                    className="admin-usage-bar-fill admin-usage-bar-fill--week"
                    style={{ width: `${Math.min(100, stats.usage.month > 0 ? (stats.usage.week / stats.usage.month) * 100 : 0)}%` }}
                  />
                </div>
                <span>{stats.usage.week}</span>
              </div>
              <div className="admin-usage-bar">
                <div className="admin-usage-bar-label">Mese</div>
                <div className="admin-usage-bar-track">
                  <div className="admin-usage-bar-fill admin-usage-bar-fill--month" style={{ width: '100%' }} />
                </div>
                <span>{stats.usage.month}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reload button */}
      <button className="admin-reload" onClick={loadData}>Ricarica dati</button>
    </div>
  );
}

export default AdminPage;
