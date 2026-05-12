/**
 * Life Tutor — Objectives Panel
 * Dashboard obiettivi con progress bar e milestones.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LTObjective, ObjectiveCategory, ObjectiveStatus } from '../../types/lifeTutor';

const CATEGORY_ICONS: Record<string, string> = {
  studio: '\u{1F4D6}',
  lavoro: '\u{1F4BC}',
  salute: '\u{1F3C3}',
  relazioni: '❤️',
  crescita_personale: '\u{1F331}',
  finanza: '\u{1F4B0}',
  hobby: '\u{1F3A8}',
  creativita: '\u{1F3AD}',
  altro: '⭐',
};

const STATUS_LABELS: Record<ObjectiveStatus, string> = {
  active: 'Attivo',
  paused: 'In pausa',
  achieved: 'Completato',
  abandoned: 'Abbandonato',
};

function loadObjectives(): LTObjective[] {
  try {
    const raw = localStorage.getItem('bt_lt_objectives');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveObjectives(objectives: LTObjective[]) {
  localStorage.setItem('bt_lt_objectives', JSON.stringify(objectives));
}

export function ObjectivesPanel() {
  const [objectives, setObjectives] = useState<LTObjective[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved'>('active');

  // New objective form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ObjectiveCategory>('crescita_personale');
  const [newPriority, setNewPriority] = useState(3);

  useEffect(() => {
    setObjectives(loadObjectives());
  }, []);

  const addObjective = useCallback(() => {
    if (!newTitle.trim()) return;

    const obj: LTObjective = {
      id: `obj_${Date.now()}`,
      workspaceId: 'local',
      title: newTitle.trim(),
      description: '',
      category: newCategory,
      status: 'active',
      priority: newPriority,
      progress: 0,
      milestones: [],
      targetDate: null,
      notes: '',
      aiSuggestions: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    const updated = [...objectives, obj];
    setObjectives(updated);
    saveObjectives(updated);
    setNewTitle('');
    setShowForm(false);
  }, [newTitle, newCategory, newPriority, objectives]);

  const updateProgress = useCallback((id: string, delta: number) => {
    setObjectives(prev => {
      const updated = prev.map((o): LTObjective => {
        if (o.id !== id) return o;
        const newProgress = Math.max(0, Math.min(100, o.progress + delta));
        const newStatus: ObjectiveStatus = newProgress >= 100 ? 'achieved' : o.status;
        return { ...o, progress: newProgress, status: newStatus, updatedAt: new Date().toISOString() } as LTObjective;
      });
      saveObjectives(updated);
      return updated;
    });
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setObjectives(prev => {
      const updated = prev.map((o): LTObjective => {
        if (o.id !== id) return o;
        const next: ObjectiveStatus = o.status === 'active' ? 'paused' : o.status === 'paused' ? 'active' : o.status;
        return { ...o, status: next } as LTObjective;
      });
      saveObjectives(updated);
      return updated;
    });
  }, []);

  const deleteObjective = useCallback((id: string) => {
    setObjectives(prev => {
      const updated = prev.filter(o => o.id !== id);
      saveObjectives(updated);
      return updated;
    });
  }, []);

  const filtered = objectives.filter(o => {
    if (filter === 'active') return o.status === 'active' || o.status === 'paused';
    if (filter === 'achieved') return o.status === 'achieved';
    return true;
  });

  const stats = {
    total: objectives.length,
    active: objectives.filter(o => o.status === 'active').length,
    achieved: objectives.filter(o => o.status === 'achieved').length,
    avgProgress: objectives.filter(o => o.status === 'active').length > 0
      ? Math.round(objectives.filter(o => o.status === 'active').reduce((s, o) => s + o.progress, 0) / objectives.filter(o => o.status === 'active').length)
      : 0,
  };

  return (
    <div className="lt-objectives">
      <div className="lt-objectives-header">
        <span className="lt-objectives-title">Obiettivi</span>
        <button
          className="lt-objectives-add-btn"
          onClick={() => setShowForm(!showForm)}
          title="Nuovo obiettivo"
        >
          {showForm ? '✕' : '＋'}
        </button>
      </div>

      {/* Stats bar */}
      <div className="lt-objectives-stats">
        <span className="lt-stat">{stats.active} attivi</span>
        <span className="lt-stat">{stats.achieved} completati</span>
        <span className="lt-stat">media {stats.avgProgress}%</span>
      </div>

      {/* Filter tabs */}
      <div className="lt-objectives-filters">
        {(['active', 'achieved', 'all'] as const).map(f => (
          <button
            key={f}
            className={`lt-filter-btn ${filter === f ? 'lt-filter-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? 'Attivi' : f === 'achieved' ? 'Completati' : 'Tutti'}
          </button>
        ))}
      </div>

      {/* New objective form */}
      {showForm && (
        <div className="lt-objectives-form">
          <input
            className="lt-obj-input"
            placeholder="Titolo obiettivo..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addObjective()}
            autoFocus
          />
          <div className="lt-obj-form-row">
            <select
              className="lt-obj-select"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as ObjectiveCategory)}
            >
              {Object.entries(CATEGORY_ICONS).map(([k, v]) => (
                <option key={k} value={k}>{v} {k.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <div className="lt-obj-priority">
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  className={`lt-priority-dot ${p <= newPriority ? 'lt-priority-filled' : ''}`}
                  onClick={() => setNewPriority(p)}
                  title={`Priorità ${p}`}
                />
              ))}
            </div>
            <button className="lt-obj-save-btn" onClick={addObjective}>Salva</button>
          </div>
        </div>
      )}

      {/* Objectives list */}
      <div className="lt-objectives-list">
        {filtered.length === 0 && (
          <div className="lt-objectives-empty">
            <p>{filter === 'achieved' ? 'Nessun obiettivo completato ancora.' : 'Nessun obiettivo attivo.'}</p>
            {filter === 'active' && (
              <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Aggiungi il tuo primo obiettivo!</p>
            )}
          </div>
        )}

        {filtered.map(obj => (
          <div key={obj.id} className={`lt-objective-card lt-obj-status-${obj.status}`}>
            <div className="lt-obj-card-header">
              <span className="lt-obj-icon">{CATEGORY_ICONS[obj.category] || '⭐'}</span>
              <span className="lt-obj-card-title">{obj.title}</span>
              <span className={`lt-obj-status-badge lt-badge-${obj.status}`}>
                {STATUS_LABELS[obj.status]}
              </span>
            </div>

            {/* Progress bar */}
            <div className="lt-obj-progress-wrap">
              <div className="lt-obj-progress-bar">
                <div
                  className="lt-obj-progress-fill"
                  style={{ width: `${obj.progress}%` }}
                />
              </div>
              <span className="lt-obj-progress-text">{obj.progress}%</span>
            </div>

            {/* Actions */}
            <div className="lt-obj-card-actions">
              {obj.status === 'active' && (
                <>
                  <button className="lt-obj-action" onClick={() => updateProgress(obj.id, -10)} title="-10%">{'−'}</button>
                  <button className="lt-obj-action" onClick={() => updateProgress(obj.id, 10)} title="+10%">{'＋'}</button>
                </>
              )}
              <button
                className="lt-obj-action"
                onClick={() => toggleStatus(obj.id)}
                title={obj.status === 'active' ? 'Pausa' : 'Riprendi'}
              >
                {obj.status === 'active' ? '⏸' : obj.status === 'paused' ? '▶' : ''}
              </button>
              <button className="lt-obj-action lt-obj-delete" onClick={() => deleteObjective(obj.id)} title="Elimina">{'\u{1F5D1}'}</button>
            </div>

            {/* Priority dots */}
            <div className="lt-obj-priority-display">
              {[1, 2, 3, 4, 5].map(p => (
                <span key={p} className={`lt-priority-mini ${p <= obj.priority ? 'lt-priority-mini-filled' : ''}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
