/**
 * BarTalk v8 — PromptSectionsTab
 * Gestione sezioni prompt personalizzate (regole, topic, contesto).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadPromptSections,
  savePromptSections,
  deletePromptSection,
  EXAMPLE_SECTIONS,
  type PromptSection,
  type PromptSectionType,
} from '../../lib/promptSections';
import { generateId } from '../../lib/utils';

const TYPE_OPTIONS: { value: PromptSectionType; label: string; icon: string; desc: string }[] = [
  { value: 'rules', label: 'Regole', icon: '📋', desc: 'Sempre attive in ogni conversazione' },
  { value: 'topic', label: 'Argomento', icon: '🏷️', desc: 'Attive solo quando l\'input matcha i tag' },
  { value: 'context', label: 'Contesto', icon: '📖', desc: 'Background sempre disponibile agli agenti' },
];

export function PromptSectionsTab() {
  const [sections, setSections] = useState<PromptSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  // New section form
  const [newType, setNewType] = useState<PromptSectionType>('rules');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newPriority, setNewPriority] = useState(5);

  useEffect(() => {
    setSections(loadPromptSections());
  }, []);

  const refresh = useCallback(() => {
    setSections(loadPromptSections());
  }, []);

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    const section: PromptSection = {
      id: generateId(),
      type: newType,
      title: newTitle.trim(),
      content: newContent.trim(),
      tags: newType === 'topic'
        ? newTags.split(',').map(t => t.trim()).filter(Boolean)
        : [],
      priority: newPriority,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...sections, section];
    savePromptSections(updated);
    setSections(updated);
    resetForm();
  };

  const resetForm = () => {
    setNewType('rules');
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setNewPriority(5);
    setShowCreator(false);
  };

  const toggleEnabled = (id: string) => {
    const updated = sections.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    savePromptSections(updated);
    setSections(updated);
  };

  const handleDelete = (id: string) => {
    deletePromptSection(id);
    refresh();
  };

  const handleUpdateField = (id: string, field: keyof PromptSection, value: string | number | string[]) => {
    const updated = sections.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    );
    savePromptSections(updated);
    setSections(updated);
  };

  const loadExamples = () => {
    const examples: PromptSection[] = EXAMPLE_SECTIONS.map(ex => ({
      ...ex,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }));
    const updated = [...sections, ...examples];
    savePromptSections(updated);
    setSections(updated);
  };

  const sorted = [...sections].sort((a, b) => a.priority - b.priority);

  return (
    <div className="tab-content prompt-sections-tab">
      <p className="psections-intro">
        Crea regole personalizzate che vengono iniettate nel prompt degli agenti.
        Le sezioni <strong>Regole</strong> e <strong>Contesto</strong> sono sempre attive.
        Le sezioni <strong>Argomento</strong> si attivano solo quando il messaggio contiene uno dei tag.
      </p>

      {/* ── Lista sezioni ──────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="psections-empty">
          <p>Nessuna sezione personalizzata.</p>
          <button className="psections-btn-secondary" onClick={loadExamples}>
            Carica 3 esempi
          </button>
        </div>
      ) : (
        <div className="psections-list">
          {sorted.map(s => {
            const typeInfo = TYPE_OPTIONS.find(t => t.value === s.type);
            const isEditing = editingId === s.id;

            return (
              <div key={s.id} className={`psections-card ${s.enabled ? '' : 'disabled'}`}>
                <div className="psections-card-header">
                  <span className="psections-card-icon">{typeInfo?.icon}</span>
                  <span className="psections-card-title">{s.title}</span>
                  <span className={`psections-card-type ${s.type}`}>{typeInfo?.label}</span>
                  <span className="psections-card-priority">P{s.priority}</span>
                  <button
                    className={`psections-toggle ${s.enabled ? 'on' : 'off'}`}
                    onClick={() => toggleEnabled(s.id)}
                    title={s.enabled ? 'Disattiva' : 'Attiva'}
                  >
                    {s.enabled ? '✓' : '✕'}
                  </button>
                  <button
                    className="psections-edit-btn"
                    onClick={() => setEditingId(isEditing ? null : s.id)}
                  >
                    {isEditing ? '✓' : '✏️'}
                  </button>
                  <button
                    className="psections-delete-btn"
                    onClick={() => handleDelete(s.id)}
                  >
                    🗑
                  </button>
                </div>

                {s.type === 'topic' && s.tags.length > 0 && (
                  <div className="psections-tags">
                    {s.tags.map((tag, i) => (
                      <span key={i} className="psections-tag">{tag}</span>
                    ))}
                  </div>
                )}

                {isEditing ? (
                  <div className="psections-edit-body">
                    <input
                      className="psections-input"
                      value={s.title}
                      onChange={e => handleUpdateField(s.id, 'title', e.target.value)}
                      placeholder="Titolo"
                    />
                    <textarea
                      className="psections-textarea"
                      value={s.content}
                      onChange={e => handleUpdateField(s.id, 'content', e.target.value)}
                      rows={3}
                    />
                    {s.type === 'topic' && (
                      <input
                        className="psections-input"
                        value={s.tags.join(', ')}
                        onChange={e => handleUpdateField(s.id, 'tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                        placeholder="Tag separati da virgola"
                      />
                    )}
                    <div className="psections-priority-row">
                      <label>Priorità: {s.priority}</label>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={s.priority}
                        onChange={e => handleUpdateField(s.id, 'priority', Number(e.target.value))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="psections-card-content">{s.content}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Creator ────────────────────────────────── */}
      {showCreator ? (
        <div className="psections-creator">
          <div className="psections-type-selector">
            {TYPE_OPTIONS.map(t => (
              <button
                key={t.value}
                className={`psections-type-btn ${newType === t.value ? 'active' : ''}`}
                onClick={() => setNewType(t.value)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <span className="psections-type-desc">{TYPE_OPTIONS.find(t => t.value === newType)?.desc}</span>

          <input
            className="psections-input"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Titolo sezione"
          />
          <textarea
            className="psections-textarea"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Contenuto della regola / contesto..."
            rows={4}
          />
          {newType === 'topic' && (
            <input
              className="psections-input"
              value={newTags}
              onChange={e => setNewTags(e.target.value)}
              placeholder="Tag separati da virgola (es: economia, finanza, mercato)"
            />
          )}
          <div className="psections-priority-row">
            <label>Priorità: {newPriority} (1=alta, 10=bassa)</label>
            <input
              type="range"
              min={1}
              max={10}
              value={newPriority}
              onChange={e => setNewPriority(Number(e.target.value))}
            />
          </div>
          <div className="psections-creator-actions">
            <button className="psections-btn-secondary" onClick={resetForm}>Annulla</button>
            <button
              className="psections-btn-primary"
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newContent.trim()}
            >
              + Aggiungi Sezione
            </button>
          </div>
        </div>
      ) : (
        <button className="psections-add-btn" onClick={() => setShowCreator(true)}>
          + Nuova Sezione Prompt
        </button>
      )}

      {sections.length > 0 && (
        <button className="psections-btn-secondary psections-examples-btn" onClick={loadExamples}>
          + Carica esempi
        </button>
      )}
    </div>
  );
}
