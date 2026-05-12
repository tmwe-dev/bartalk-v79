import type { CourseLevelType, CourseCategoryId } from '../../types/courses';
import {
  COURSE_LEVEL_META,
  COURSE_CATEGORIES,
  QUICK_SUGGESTIONS,
} from '../../types/courses';
import { VoiceMicButton } from '../Shared/VoiceMicButton';

interface CourseWizardProps {
  topic: string;
  level: CourseLevelType;
  category: CourseCategoryId;
  step: number;
  isGenerating: boolean;
  error: string;

  onSetTopic: (topic: string) => void;
  onSetLevel: (level: CourseLevelType) => void;
  onSetCategory: (category: CourseCategoryId) => void;
  onSetStep: (step: number) => void;
  onGenerate: () => void;
  onQuickSuggestion: (s: typeof QUICK_SUGGESTIONS[number]) => void;
  onBack: () => void;
}

export function CourseWizard({
  topic,
  level,
  category,
  step,
  isGenerating,
  error,
  onSetTopic,
  onSetLevel,
  onSetCategory,
  onSetStep,
  onGenerate,
  onQuickSuggestion,
  onBack,
}: CourseWizardProps) {
  return (
    <div className="course-panel">
      <div className="course-panel-header">
        <button className="course-btn-back" onClick={onBack}>← Indietro</button>
        <h2 className="course-panel-title">Nuovo Percorso</h2>
      </div>

      <div className="course-wizard">
        {/* Progress dots */}
        <div className="course-wizard-steps">
          {['Argomento', 'Livello', 'Genera'].map((label, i) => (
            <div key={i} className={`course-wizard-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="course-wizard-dot">{i < step ? '✓' : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Step 0: Topic */}
        {step === 0 && (
          <div className="course-wizard-content">
            <label className="course-wizard-label">Di cosa vuoi imparare?</label>
            <div className="voice-input-row">
              <input
                type="text"
                className="course-wizard-input"
                placeholder="es. Inglese B2, Psicologia Cognitiva, Python..."
                value={topic}
                onChange={e => onSetTopic(e.target.value)}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && topic.trim()) onSetStep(1); }}
              />
              <VoiceMicButton onTranscript={onSetTopic} />
            </div>

            <div className="course-suggestions">
              <span className="course-suggestions-label">Suggerimenti:</span>
              <div className="course-suggestions-grid">
                {QUICK_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="course-suggestion-chip"
                    onClick={() => onQuickSuggestion(s)}
                  >
                    {COURSE_CATEGORIES.find(c => c.id === s.category)?.icon} {s.topic}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="course-btn-primary"
              disabled={!topic.trim()}
              onClick={() => onSetStep(1)}
            >
              Avanti →
            </button>
          </div>
        )}

        {/* Step 1: Level + Category */}
        {step === 1 && (
          <div className="course-wizard-content">
            <label className="course-wizard-label">Seleziona il livello:</label>
            <div className="course-level-grid">
              {(Object.entries(COURSE_LEVEL_META) as [CourseLevelType, typeof COURSE_LEVEL_META[CourseLevelType]][]).map(([key, meta]) => (
                <button
                  key={key}
                  className={`course-level-option ${level === key ? 'selected' : ''}`}
                  onClick={() => onSetLevel(key)}
                >
                  <span className="course-level-icon">{meta.icon}</span>
                  <span className="course-level-name">{meta.label}</span>
                  <span className="course-level-desc">{meta.description}</span>
                </button>
              ))}
            </div>

            <label className="course-wizard-label" style={{ marginTop: 16 }}>Categoria:</label>
            <div className="course-category-grid">
              {COURSE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`course-category-chip ${category === cat.id ? 'selected' : ''}`}
                  onClick={() => onSetCategory(cat.id)}
                >
                  {cat.icon} {cat.label}
                  {cat.certifiedSources && <span className="course-certified-dot" title="Fonti certificate">•</span>}
                </button>
              ))}
            </div>

            <div className="course-wizard-buttons">
              <button className="course-btn-secondary" onClick={() => onSetStep(0)}>← Indietro</button>
              <button className="course-btn-primary" onClick={() => onSetStep(2)}>Avanti →</button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm + Generate */}
        {step === 2 && (
          <div className="course-wizard-content">
            <div className="course-wizard-summary">
              <div className="course-wizard-summary-row">
                <span className="course-wizard-summary-label">Argomento:</span>
                <span className="course-wizard-summary-value">{topic}</span>
              </div>
              <div className="course-wizard-summary-row">
                <span className="course-wizard-summary-label">Livello:</span>
                <span className="course-wizard-summary-value">{COURSE_LEVEL_META[level].icon} {COURSE_LEVEL_META[level].label}</span>
              </div>
              <div className="course-wizard-summary-row">
                <span className="course-wizard-summary-label">Categoria:</span>
                <span className="course-wizard-summary-value">{COURSE_CATEGORIES.find(c => c.id === category)?.icon} {COURSE_CATEGORIES.find(c => c.id === category)?.label}</span>
              </div>
              <div className="course-wizard-summary-row">
                <span className="course-wizard-summary-label">Lezioni stimate:</span>
                <span className="course-wizard-summary-value">{COURSE_LEVEL_META[level].lessonRange[0]}–{COURSE_LEVEL_META[level].lessonRange[1]}</span>
              </div>
              {COURSE_CATEGORIES.find(c => c.id === category)?.certifiedSources && (
                <div className="course-wizard-certified-notice">
                  ⚠️ Argomento con fonti certificate: le fonti accademiche saranno evidenziate nei messaggi
                </div>
              )}
            </div>

            {error && <div className="course-error">{error}</div>}

            <div className="course-wizard-buttons">
              <button className="course-btn-secondary" onClick={() => onSetStep(1)} disabled={isGenerating}>← Indietro</button>
              <button className="course-btn-primary" onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? '⏳ Generazione in corso...' : '🚀 Genera Percorso'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
