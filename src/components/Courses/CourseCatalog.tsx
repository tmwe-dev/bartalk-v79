import type { CourseTemplate, CourseFocus, CustomDirection } from '../../lib/courseCatalog';
import {
  COURSE_CATALOG,
  CUSTOM_DIRECTIONS,
} from '../../lib/courseCatalog';
import type { CourseLevelType } from '../../types/courses';
import {
  COURSE_LEVEL_META,
  COURSE_CATEGORIES,
} from '../../types/courses';

interface CourseCatalogProps {
  selectedTemplate: CourseTemplate | null;
  selectedFocus: CourseFocus | null;
  selectedLevel: CourseLevelType;
  selectedDirection: CustomDirection | null;
  customText: string;
  isGenerating: boolean;
  error: string;

  onSelectTemplate: (template: CourseTemplate) => void;
  onSetSelectedTemplate: (template: CourseTemplate | null) => void;
  onSetSelectedFocus: (focus: CourseFocus | null) => void;
  onSetSelectedLevel: (level: CourseLevelType) => void;
  onSetSelectedDirection: (dir: CustomDirection | null) => void;
  onSetCustomText: (text: string) => void;
  onGenerateFromTemplate: () => void;
  onBack: () => void;
}

export function CourseCatalog({
  selectedTemplate,
  selectedFocus,
  selectedLevel,
  selectedDirection,
  customText,
  isGenerating,
  error,
  onSelectTemplate,
  onSetSelectedTemplate,
  onSetSelectedFocus,
  onSetSelectedLevel,
  onSetSelectedDirection,
  onSetCustomText,
  onGenerateFromTemplate,
  onBack,
}: CourseCatalogProps) {
  // Grid view - no template selected
  if (!selectedTemplate) {
    const grouped = new Map<string, CourseTemplate[]>();
    COURSE_CATALOG.forEach(t => {
      const cat = COURSE_CATEGORIES.find(c => c.id === t.category);
      const areaLabel = cat?.label || 'Altro';
      const arr = grouped.get(areaLabel) || [];
      arr.push(t);
      grouped.set(areaLabel, arr);
    });

    return (
      <div className="course-panel">
        <div className="course-panel-header">
          <button className="course-btn-back" onClick={onBack}>← Indietro</button>
          <h2 className="course-panel-title">📖 Catalogo Corsi</h2>
        </div>

        <div className="catalog-grid-container">
          {Array.from(grouped.entries()).map(([area, templates]) => (
            <div key={area} className="catalog-area">
              <div className="catalog-area-label">{area}</div>
              <div className="catalog-grid">
                {templates.map(t => (
                  <button
                    key={t.id}
                    className="catalog-card"
                    style={{ background: t.coverColor }}
                    onClick={() => onSelectTemplate(t)}
                  >
                    <span className="catalog-card-icon">{t.icon}</span>
                    <span className="catalog-card-title">{t.title}</span>
                    <span className="catalog-card-desc">{t.description}</span>
                    <span className="catalog-card-meta">
                      {t.focuses.length} specializzazioni · {t.availableLevels.length} livelli
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Configuration view - template selected
  return (
    <div className="course-panel">
      <div className="course-panel-header">
        <button className="course-btn-back" onClick={() => onSetSelectedTemplate(null)}>← Catalogo</button>
        <h2 className="course-panel-title">{selectedTemplate.icon} {selectedTemplate.title}</h2>
      </div>

      <div className="catalog-config">
        <p className="catalog-config-desc">{selectedTemplate.description}</p>

        {/* Focus / Specialization */}
        <div className="catalog-section">
          <label className="catalog-section-label">Specializzazione <span className="catalog-optional">(opzionale)</span></label>
          <div className="catalog-focus-grid">
            <button
              className={`catalog-focus-chip ${!selectedFocus ? 'selected' : ''}`}
              onClick={() => onSetSelectedFocus(null)}
            >
              <span className="catalog-focus-icon">📚</span>
              <span className="catalog-focus-text">
                <strong>Completo</strong>
                <small>Panoramica di tutti gli argomenti</small>
              </span>
            </button>
            {selectedTemplate.focuses.map(f => (
              <button
                key={f.id}
                className={`catalog-focus-chip ${selectedFocus?.id === f.id ? 'selected' : ''}`}
                onClick={() => onSetSelectedFocus(selectedFocus?.id === f.id ? null : f)}
              >
                <span className="catalog-focus-icon">{f.icon}</span>
                <span className="catalog-focus-text">
                  <strong>{f.label}</strong>
                  <small>{f.description}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="catalog-section">
          <label className="catalog-section-label">Livello</label>
          <div className="catalog-level-row">
            {selectedTemplate.availableLevels.map(lvl => {
              const meta = COURSE_LEVEL_META[lvl];
              return (
                <button
                  key={lvl}
                  className={`catalog-level-chip ${selectedLevel === lvl ? 'selected' : ''}`}
                  onClick={() => onSetSelectedLevel(lvl)}
                  title={meta.description}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Direction */}
        <div className="catalog-section">
          <label className="catalog-section-label">Direzione <span className="catalog-optional">(opzionale)</span></label>
          <div className="catalog-direction-row">
            {CUSTOM_DIRECTIONS.map(d => (
              <button
                key={d.id}
                className={`catalog-direction-chip ${selectedDirection === d.id ? 'selected' : ''}`}
                onClick={() => onSetSelectedDirection(selectedDirection === d.id ? null : d.id)}
                title={d.hint}
              >
                {d.icon} {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom text */}
        <div className="catalog-section">
          <label className="catalog-section-label">Personalizzazione libera <span className="catalog-optional">(opzionale)</span></label>
          <textarea
            className="catalog-custom-textarea"
            placeholder="Dai istruzioni specifiche... es. 'Solo ricette della tradizione napoletana', 'Con esperimenti pratici'"
            value={customText}
            onChange={e => onSetCustomText(e.target.value)}
            rows={2}
          />
          {selectedTemplate.suggestedCustomizations.length > 0 && (
            <div className="catalog-suggestions">
              {selectedTemplate.suggestedCustomizations.map((s, i) => (
                <button
                  key={i}
                  className="catalog-suggestion-pill"
                  onClick={() => onSetCustomText(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="catalog-summary">
          <div className="catalog-summary-title">Riepilogo</div>
          <div className="catalog-summary-row">
            <span>Corso:</span>
            <strong>{selectedTemplate.title}{selectedFocus ? ` — ${selectedFocus.label}` : ''}</strong>
          </div>
          <div className="catalog-summary-row">
            <span>Livello:</span>
            <strong>{COURSE_LEVEL_META[selectedLevel].icon} {COURSE_LEVEL_META[selectedLevel].label}</strong>
          </div>
          <div className="catalog-summary-row">
            <span>Lezioni stimate:</span>
            <strong>{COURSE_LEVEL_META[selectedLevel].lessonRange[0]}–{COURSE_LEVEL_META[selectedLevel].lessonRange[1]}</strong>
          </div>
          {selectedDirection && (
            <div className="catalog-summary-row">
              <span>Direzione:</span>
              <strong>{CUSTOM_DIRECTIONS.find(d => d.id === selectedDirection)?.icon} {CUSTOM_DIRECTIONS.find(d => d.id === selectedDirection)?.label}</strong>
            </div>
          )}
          {customText.trim() && (
            <div className="catalog-summary-row">
              <span>Note:</span>
              <strong className="catalog-summary-notes">{customText.trim()}</strong>
            </div>
          )}
        </div>

        {error && <div className="course-error">{error}</div>}

        <button
          className="course-btn-primary catalog-generate-btn"
          onClick={onGenerateFromTemplate}
          disabled={isGenerating}
        >
          {isGenerating ? '⏳ Generazione in corso...' : '🚀 Genera Percorso'}
        </button>
      </div>
    </div>
  );
}
