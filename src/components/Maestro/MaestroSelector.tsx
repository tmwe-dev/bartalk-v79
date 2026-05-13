/**
 * BarTalk v8 — MaestroSelector
 * Scelta del maestro per una sessione di studio.
 */

import { ErrorBoundary } from '../Common/ErrorBoundary';
import { useMaestroContext } from '../../context/MaestroContext';
import type { MaestroDefinition } from '../../types/maestro';
import type { CourseCategoryId } from '../../types/courses';

interface MaestroSelectorProps {
  category: CourseCategoryId;
  courseId: string;
  lessonIndex: number;
  onSelect: (maestroId: string) => void;
  onBack: () => void;
}

export function MaestroSelector({
  category,
  courseId: _courseId,
  lessonIndex: _lessonIndex,
  onSelect,
  onBack,
}: MaestroSelectorProps) {
  const { availableMaestri, getMaestroForCategory } = useMaestroContext();

  const recommended = getMaestroForCategory(category);

  return (
    <ErrorBoundary
      fallback={
        <div className="maestro-selector">
          <div className="maestro-selector-header">
            <button className="maestro-back-btn" onClick={onBack}>←</button>
            <h3>Scegli il tuo maestro</h3>
          </div>
          <p style={{ textAlign: 'center', padding: '32px', color: '#e53e3e' }}>
            Errore nel caricamento dei maestri. Prova a tornare indietro e riprovare.
          </p>
        </div>
      }
    >
      <div className="maestro-selector">
        <div className="maestro-selector-header">
          <button className="maestro-back-btn" onClick={onBack}>←</button>
          <h3>Scegli il tuo maestro</h3>
        </div>

        <p className="maestro-selector-desc">Ogni maestro ha un approccio unico. Scegli chi ti guiderà in questa lezione.</p>

        {availableMaestri.length === 0 ? (
          <div className="course-empty">
            <div className="course-empty-icon">🎓</div>
            <p>Nessun maestro disponibile al momento.</p>
          </div>
        ) : (
          <div className="maestro-grid">
            {availableMaestri.map((m, idx) => (
              <MaestroCard
                key={m.id}
                maestro={m}
                isRecommended={m.id === recommended.id}
                onSelect={() => onSelect(m.id)}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

function MaestroCard({
  maestro,
  isRecommended,
  onSelect,
  index,
}: {
  maestro: MaestroDefinition;
  isRecommended: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <div
      className={`maestro-card ${isRecommended ? 'recommended' : ''}`}
      style={{
        '--maestro-color': maestro.color,
        animationDelay: `${index * 0.08}s`,
      } as React.CSSProperties}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
    >
      {isRecommended && (
        <span className="maestro-recommended-badge">CONSIGLIATO</span>
      )}
      <div className="maestro-card-avatar">{maestro.avatar}</div>
      <div className="maestro-card-name">{maestro.name}</div>
      <div className="maestro-card-title">{maestro.title}</div>
      <div className="maestro-card-style">
        {maestro.personality.tone.split('.')[0]}
      </div>
      <div className="maestro-card-catchphrase">
        &ldquo;{maestro.personality.catchphrases[0]}&rdquo;
      </div>
    </div>
  );
}
