/**
 * BarTalk v8 — MaestroSelector
 * Scelta del maestro per una sessione di studio.
 */

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
    <div className="maestro-selector">
      <div className="maestro-selector-header">
        <button className="maestro-back-btn" onClick={onBack}>←</button>
        <h3>Scegli il tuo maestro</h3>
      </div>

      <p className="maestro-selector-desc">Ogni maestro ha un approccio diverso. Scegli quello che preferisci.</p>

      <div className="maestro-grid">
        {availableMaestri.map(m => (
          <MaestroCard
            key={m.id}
            maestro={m}
            isRecommended={m.id === recommended.id}
            onSelect={() => onSelect(m.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MaestroCard({
  maestro,
  isRecommended,
  onSelect,
}: {
  maestro: MaestroDefinition;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`maestro-card ${isRecommended ? 'recommended' : ''}`}
      style={{ '--maestro-color': maestro.color } as React.CSSProperties}
      onClick={onSelect}
    >
      {isRecommended && (
        <span className="maestro-recommended-badge">Consigliato</span>
      )}
      <div className="maestro-card-avatar">{maestro.avatar}</div>
      <div className="maestro-card-name">{maestro.name}</div>
      <div className="maestro-card-title">{maestro.title}</div>
      <div className="maestro-card-style">
        {maestro.personality.tone.split('.')[0]}
      </div>
      <div className="maestro-card-catchphrase">
        "{maestro.personality.catchphrases[0]}"
      </div>
    </div>
  );
}
