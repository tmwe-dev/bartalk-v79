/**
 * Life Tutor — Main Tab
 * Combina Free Chat, Suggerimenti e Obiettivi in un layout a tab.
 */

import { useState } from 'react';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { FreeChatPanel } from './FreeChatPanel';
import { SuggestionsWidget } from './SuggestionsWidget';
import { ObjectivesPanel } from './ObjectivesPanel';

type SubTab = 'chat' | 'suggestions' | 'objectives';

const SUBTABS: { key: SubTab; label: string; icon: string }[] = [
  { key: 'chat', label: 'Chat', icon: '\u{1F4AC}' },
  { key: 'suggestions', label: 'Suggerimenti', icon: '✨' },
  { key: 'objectives', label: 'Obiettivi', icon: '\u{1F3AF}' },
];

export function LifeTutorTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('chat');

  return (
    <ErrorBoundary
      fallback={
        <div className="lt-tab-container" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ color: '#e53e3e', marginBottom: '8px' }}>Errore nel Life Tutor</h3>
          <p style={{ color: '#718096' }}>Si è verificato un errore. Prova a ricaricare la pagina.</p>
        </div>
      }
    >
      <div className="lt-tab-container">
        {/* Sub-navigation */}
        <div className="lt-subtabs">
          {SUBTABS.map(t => (
            <button
              key={t.key}
              className={`lt-subtab ${activeSubTab === t.key ? 'lt-subtab-active' : ''}`}
              onClick={() => setActiveSubTab(t.key)}
            >
              <span className="lt-subtab-icon">{t.icon}</span>
              <span className="lt-subtab-label">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lt-tab-content">
          <ErrorBoundary>
            {activeSubTab === 'chat' && <FreeChatPanel />}
            {activeSubTab === 'suggestions' && <SuggestionsWidget />}
            {activeSubTab === 'objectives' && <ObjectivesPanel />}
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}
