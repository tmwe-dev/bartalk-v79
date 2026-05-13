/**
 * BarTalk v8 — Exploration Card Component
 * Visualizza risultati di ricerca web e findings degli agenti.
 * Inline nei messaggi chat con preview compatta ed espansione.
 */

import { useState } from 'react';
import type { ExplorationCard as CardType } from '../../types/tools';

interface ExplorationCardProps {
  card: CardType;
  onSaveToTask?: (card: CardType) => void;
}

const TYPE_ICONS: Record<CardType['type'], string> = {
  webpage: '🌐',
  data: '📊',
  file: '📄',
  summary: '💡',
};

export function ExplorationCard({ card, onSaveToTask }: ExplorationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const icon = TYPE_ICONS[card.type] || '📎';
  const hasFullContent = card.fullContent && card.fullContent.length > card.snippet.length;

  return (
    <div className="exploration-card">
      <div className="exploration-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="exploration-card-icon">{icon}</span>
        <div className="exploration-card-title-group">
          <span className="exploration-card-title">{card.title}</span>
          <span className="exploration-card-source">
            {card.source.length > 60 ? card.source.slice(0, 60) + '...' : card.source}
          </span>
        </div>
        <div className="exploration-card-actions">
          {onSaveToTask && !card.savedToTask && (
            <button
              className="exploration-card-save"
              onClick={(e) => { e.stopPropagation(); onSaveToTask(card); }}
              title="Salva nei file task"
            >
              💾
            </button>
          )}
          {card.savedToTask && (
            <span className="exploration-card-saved" title="Salvato nel task">✅</span>
          )}
          {hasFullContent && (
            <button
              className="exploration-card-expand"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              title={expanded ? 'Comprimi' : 'Espandi'}
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      <div className="exploration-card-snippet">
        {expanded && hasFullContent ? card.fullContent : card.snippet}
      </div>

      {card.agentName && (
        <div className="exploration-card-meta">
          Trovato da {card.agentName} • {new Date(card.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

/**
 * Gruppo di exploration cards per un messaggio.
 */
interface ExplorationCardsGroupProps {
  cards: CardType[];
  onSaveToTask?: (card: CardType) => void;
}

export function ExplorationCardsGroup({ cards, onSaveToTask }: ExplorationCardsGroupProps) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="exploration-cards-group">
      {cards.map(card => (
        <ExplorationCard key={card.id} card={card} onSaveToTask={onSaveToTask} />
      ))}
    </div>
  );
}
