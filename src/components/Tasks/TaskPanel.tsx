/**
 * BarTalk v8 — TaskPanel
 * Pannello per configurare e gestire obiettivi/task collaborativi.
 */

import { useState, useRef } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { DELIVERABLE_TEMPLATES, PHASE_LABELS } from '../../lib/taskTemplates';
import { AGENTS } from '../../lib/agents';
import { useAgentContext } from '../../context/AgentContext';
import { generateId } from '../../lib/utils';
import type { DeliverableType, AttachedFile } from '../../types/tasks';

export function TaskPanel() {
  const {
    activeTask,
    createTask,
    advancePhase,
    attachFile,
    removeFile,
    setLeadAgent,
    clearTask,
  } = useTaskContext();
  const { isAgentEnabled } = useAgentContext();

  // Creazione nuovo task
  const [showCreator, setShowCreator] = useState(false);
  const [newType, setNewType] = useState<DeliverableType>('report');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createTask(newType, newTitle.trim(), newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setShowCreator(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 500 * 1024) continue; // Max 500KB per file

      try {
        const content = await file.text();
        const attached: AttachedFile = {
          id: generateId(),
          name: file.name,
          content,
          type: file.type || 'text/plain',
          size: file.size,
          addedAt: new Date().toISOString(),
        };
        attachFile(attached);
      } catch {
        // Skip file su errore lettura
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyDeliverable = () => {
    if (activeTask?.deliverableContent) {
      navigator.clipboard.writeText(activeTask.deliverableContent);
    }
  };

  // ── Se non c'è un task attivo, mostra il creatore ─────────────────

  if (!activeTask) {
    if (!showCreator) {
      return (
        <div className="task-panel task-empty">
          <div className="task-empty-icon">🎯</div>
          <h3 className="task-empty-title">Nessun obiettivo attivo</h3>
          <p className="task-empty-desc">
            Crea un obiettivo per guidare gli agenti verso un deliverable concreto:
            report, analisi, piani, lezioni, codice e molto altro.
          </p>
          <button className="task-create-btn" onClick={() => setShowCreator(true)}>
            + Nuovo Obiettivo
          </button>
        </div>
      );
    }

    return (
      <div className="task-panel task-creator">
        <h3 className="task-creator-title">🎯 Nuovo Obiettivo</h3>

        {/* Griglia template */}
        <div className="task-templates-grid">
          {Object.values(DELIVERABLE_TEMPLATES).map(t => (
            <button
              key={t.type}
              className={`task-template-btn ${newType === t.type ? 'active' : ''}`}
              onClick={() => setNewType(t.type)}
            >
              <span className="task-template-icon">{t.icon}</span>
              <span className="task-template-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="task-template-desc">
          {DELIVERABLE_TEMPLATES[newType].description}
        </div>

        {/* Campi */}
        <input
          className="task-input"
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Titolo obiettivo (es: Report trimestrale vendite)"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <textarea
          className="task-textarea"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Descrizione dettagliata dell'obiettivo e dei risultati attesi..."
          rows={3}
        />

        <div className="task-creator-actions">
          <button className="task-btn-secondary" onClick={() => setShowCreator(false)}>
            Annulla
          </button>
          <button
            className="task-btn-primary"
            onClick={handleCreate}
            disabled={!newTitle.trim()}
          >
            🚀 Crea Obiettivo
          </button>
        </div>
      </div>
    );
  }

  // ── Task attivo: mostra progresso e controlli ─────────────────────

  const template = DELIVERABLE_TEMPLATES[activeTask.type];
  const allPhases = [...activeTask.phases, 'completed'] as const;
  const currentIdx = allPhases.indexOf(activeTask.currentPhase);
  const progress = activeTask.currentPhase === 'completed'
    ? 100
    : Math.round((currentIdx / (allPhases.length - 1)) * 100);
  const isCompleted = activeTask.currentPhase === 'completed';

  return (
    <div className="task-panel task-active">

      {/* ── Header ──────────────────────────────── */}
      <div className="task-header">
        <div className="task-header-left">
          <span className="task-type-icon">{template.icon}</span>
          <div>
            <h3 className="task-title">{activeTask.title}</h3>
            <span className="task-type-label">{template.label}</span>
          </div>
        </div>
        <button className="task-close-btn" onClick={clearTask} title="Chiudi obiettivo">
          ✕
        </button>
      </div>

      {activeTask.description && (
        <p className="task-description">{activeTask.description}</p>
      )}

      {/* ── Progress bar con fasi ────────────────── */}
      <div className="task-progress">
        <div className="task-progress-bar">
          <div className="task-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="task-phases-row">
          {allPhases.map((phase, idx) => {
            const info = PHASE_LABELS[phase] || { icon: '❓', label: phase };
            const isCurrent = phase === activeTask.currentPhase;
            const isDone = idx < currentIdx;
            return (
              <div
                key={phase}
                className={`task-phase ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
              >
                <span className="task-phase-icon">{isDone ? '✅' : info.icon}</span>
                <span className="task-phase-label">{info.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Istruzione fase corrente ─────────────── */}
      {!isCompleted && (
        <div className="task-phase-instruction">
          <span className="task-phase-instruction-label">Fase: {activeTask.currentPhase.toUpperCase()}</span>
          <p className="task-phase-instruction-text">
            {template.phaseInstructions[activeTask.currentPhase]}
          </p>
        </div>
      )}

      {/* ── File allegati ────────────────────────── */}
      <div className="task-files">
        <div className="task-files-header">
          <span className="task-files-title">📎 File allegati ({activeTask.attachedFiles.length})</span>
          {!isCompleted && (
            <>
              <button
                className="task-btn-small"
                onClick={() => fileInputRef.current?.click()}
              >
                + Allega
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.csv,.md,.json,.xml,.html,.js,.ts,.py,.log"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
        {activeTask.attachedFiles.length > 0 && (
          <div className="task-files-list">
            {activeTask.attachedFiles.map(f => (
              <div key={f.id} className="task-file-item">
                <span className="task-file-name">{f.name}</span>
                <span className="task-file-size">{(f.size / 1024).toFixed(1)}KB</span>
                {!isCompleted && (
                  <button className="task-file-remove" onClick={() => removeFile(f.id)}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lead Agent selector ──────────────────── */}
      {!isCompleted && (
        <div className="task-lead">
          <span className="task-lead-label">Agente redattore:</span>
          <div className="task-lead-options">
            {AGENTS.filter(a => isAgentEnabled(a.id)).map(a => (
              <button
                key={a.id}
                className={`task-lead-btn ${activeTask.leadAgent === a.id ? 'active' : ''}`}
                onClick={() => setLeadAgent(a.id)}
                style={{ '--agent-color': a.color } as React.CSSProperties}
              >
                <img src={a.staticImage} alt={a.name} className="task-lead-img" />
                <span>{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Avanza fase / Genera deliverable ─────── */}
      {!isCompleted && (
        <div className="task-actions">
          <button className="task-btn-primary" onClick={advancePhase}>
            {activeTask.currentPhase === 'deliverable'
              ? '✅ Completa Obiettivo'
              : '▶ Avanza alla fase successiva'
            }
          </button>
        </div>
      )}

      {/* ── Deliverable content ──────────────────── */}
      {activeTask.deliverableContent && (
        <div className="task-deliverable">
          <div className="task-deliverable-header">
            <span>📦 Deliverable</span>
            <button className="task-btn-small" onClick={copyDeliverable}>
              📋 Copia
            </button>
          </div>
          <pre className="task-deliverable-content">{activeTask.deliverableContent}</pre>
        </div>
      )}

      {/* ── Deliverable editor (in fase deliverable) ─ */}
      {activeTask.currentPhase === 'deliverable' && !activeTask.deliverableContent && (
        <div className="task-deliverable-hint">
          💡 Chiedi agli agenti di generare il deliverable finale. Il contenuto apparirà qui quando un agente produce il risultato.
        </div>
      )}
    </div>
  );
}
