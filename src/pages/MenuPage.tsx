/**
 * RadioChat v8 — MenuPage
 * Pagina d'ingresso con carousel 3D per navigare tra le sezioni.
 * Integra feature gating: mostra lucchetto + tier badge sulle card bloccate.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MenuCarousel3D } from '../components/Menu/MenuCarousel3D';
import { MENU_ITEMS } from '../types/menu';
import { useT } from '../lib/i18n';
import { useEffectiveTier } from '../hooks/useEffectiveTier';
import { isFeatureAvailable, getRequiredTier, tierLabel } from '../lib/featureGating';
import { useUIContext } from '../context/UIContext';

interface MenuPageProps {
  onSectionSelect: (sectionId: string) => void;
  onSwitchToFull?: () => void;
}

export function MenuPage({ onSectionSelect, onSwitchToFull }: MenuPageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const t = useT();
  const { tier } = useEffectiveTier();
  const { addToast } = useUIContext();

  // Nasconde l'hint dopo 4 secondi
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const activeItem = MENU_ITEMS[currentIndex];
  const isActiveLocked = activeItem ? !isFeatureAvailable(activeItem.featureKey, tier) : false;
  const activeRequiredTier = activeItem ? getRequiredTier(activeItem.featureKey) : 'free';

  // Set di ID bloccati (per passare al carousel se necessario in futuro)
  const lockedIds = useMemo(() => {
    const set = new Set<string>();
    MENU_ITEMS.forEach(item => {
      if (!isFeatureAvailable(item.featureKey, tier)) set.add(item.id);
    });
    return set;
  }, [tier]);

  // Intercetta selezione: se bloccata → toast, altrimenti → entra
  const handleSelect = useCallback((itemId: string) => {
    if (lockedIds.has(itemId)) {
      const item = MENU_ITEMS.find(m => m.id === itemId);
      const required = item ? tierLabel(getRequiredTier(item.featureKey)) : 'PRO';
      addToast(`Passa a ${required} per accedere a questa sezione`, 'info');
      return;
    }
    onSectionSelect(itemId);
  }, [lockedIds, onSectionSelect, addToast]);

  return (
    <div className="menu-page">
      {/* Pulsante vista standard — fisso in alto a sinistra */}
      {onSwitchToFull && (
        <button className="menu-page__fullview-btn" onClick={onSwitchToFull} title="Vista Standard">
          ⛶
        </button>
      )}

      {/* Header — centrato, come prima */}
      <div className="menu-page__header">
        <h1 className="menu-page__brand">📻 RadioChat</h1>
        <p className="menu-page__subtitle">{t('menuSubtitle') || 'Scegli il tuo ambiente'}</p>
      </div>

      {/* Carousel */}
      <div className="menu-carousel-container">
        <MenuCarousel3D
          items={MENU_ITEMS}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          onSelect={handleSelect}
        />
      </div>

      {/* Footer — sempre visibile, protetto da safe-area */}
      <div className="menu-page__footer">
        {/* Active item label + lock badge */}
        <div className="menu-page__active-label" style={{ color: activeItem?.accentColor }}>
          <span className="menu-page__active-icon">{activeItem?.icon}</span>
          <span className="menu-page__active-title">{activeItem?.title}</span>
          {isActiveLocked && (
            <span className="menu-page__lock-badge">
              🔒 {tierLabel(activeRequiredTier)}
            </span>
          )}
        </div>

        {/* Hint */}
        {showHint && (
          <p className="menu-page__hint">
            {t('menuHint') || 'Scorri per esplorare, tocca per entrare'}
          </p>
        )}
      </div>
    </div>
  );
}

export default MenuPage;
