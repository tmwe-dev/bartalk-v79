/**
 * Life Tutor — Suggestions Widget
 * Mostra suggerimenti proattivi dell'AI con accept/dismiss.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPendingSuggestions,
  respondToSuggestion,
  markSuggestionShown,
  generateProactiveSuggestions,
} from '../../lib/lifeTutor/proactivity';
import type { LTAISuggestion } from '../../types/lifeTutor';

const ICON_MAP: Record<string, string> = {
  topic_exploration: '\u{1F50D}',
  skill_reinforcement: '\u{1F4AA}',
  emotional_support: '\u{1F49A}',
  objective_reminder: '\u{1F3AF}',
  achievement_celebration: '\u{1F389}',
  habit_suggestion: '\u{1F504}',
  resource_recommendation: '\u{1F4DA}',
  conversation_starter: '\u{1F4AC}',
  review_suggestion: '\u{1F4DD}',
  challenge_proposal: '\u{1F3C6}',
};

const ACTION_LABELS: Record<string, string> = {
  topic_exploration: 'Esplora',
  skill_reinforcement: 'Rinforza',
  emotional_support: 'Parliamone',
  objective_reminder: 'Vai',
  achievement_celebration: 'Festeggia',
  habit_suggestion: 'Prova',
  resource_recommendation: 'Scopri',
  conversation_starter: 'Inizia',
  review_suggestion: 'Ripassa',
  challenge_proposal: 'Accetta sfida',
};

export function SuggestionsWidget() {
  const [suggestions, setSuggestions] = useState<LTAISuggestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Load pending suggestions
  useEffect(() => {
    const pending = getPendingSuggestions();
    setSuggestions(pending);
    for (const s of pending) {
      markSuggestionShown(s.id);
    }
  }, []);

  const handleAccept = useCallback((suggestion: LTAISuggestion) => {
    respondToSuggestion(suggestion.id, true);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, []);

  const handleDismiss = useCallback((suggestion: LTAISuggestion) => {
    respondToSuggestion(suggestion.id, false);
    setDismissed(prev => new Set(prev).add(suggestion.id));
    setTimeout(() => {
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    }, 300);
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await generateProactiveSuggestions();
      const pending = getPendingSuggestions();
      setSuggestions(pending);
      for (const s of pending) {
        markSuggestionShown(s.id);
      }
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  }, []);

  const visible = suggestions.filter(s => s.status === 'pending');

  return (
    <div className="lt-suggestions">
      <div className="lt-suggestions-header">
        <span className="lt-suggestions-title">Suggerimenti</span>
        <button
          className="lt-suggestions-refresh"
          onClick={handleGenerate}
          disabled={generating}
          title="Genera nuovi suggerimenti"
        >
          {generating ? '⏳' : '✨'}
        </button>
      </div>

      {visible.length === 0 && !generating && (
        <div className="lt-suggestions-empty">
          <p>Nessun suggerimento al momento.</p>
          <button className="lt-suggestions-gen-btn" onClick={handleGenerate}>
            Genera suggerimenti
          </button>
        </div>
      )}

      {generating && visible.length === 0 && (
        <div className="lt-suggestions-loading">
          <div className="lt-typing-dot" />
          <div className="lt-typing-dot" />
          <div className="lt-typing-dot" />
          <span style={{ marginLeft: 8 }}>Analizzo il tuo percorso...</span>
        </div>
      )}

      <div className="lt-suggestions-list">
        {visible.map(s => (
          <div
            key={s.id}
            className={`lt-suggestion-card ${s.priority >= 4 ? 'lt-suggestion-high' : ''} ${dismissed.has(s.id) ? 'lt-suggestion-dismissed' : ''}`}
          >
            <div className="lt-suggestion-icon">
              {ICON_MAP[s.suggestionType] || '\u{1F4A1}'}
            </div>
            <div className="lt-suggestion-body">
              <div className="lt-suggestion-title">{s.title}</div>
              <div className="lt-suggestion-text">{s.content}</div>
              <div className="lt-suggestion-actions">
                <button
                  className="lt-suggestion-accept"
                  onClick={() => handleAccept(s)}
                >
                  {ACTION_LABELS[s.suggestionType] || 'Vai'}
                </button>
                <button
                  className="lt-suggestion-dismiss"
                  onClick={() => handleDismiss(s)}
                >
                  Non ora
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
