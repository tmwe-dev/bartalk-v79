/**
 * Life Tutor — Main Tab
 * Combina Free Chat, Suggerimenti e Obiettivi in un layout a tab.
 */

import { useState } from 'react';
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
        {activeSubTab === 'chat' && <FreeChatPanel />}
        {activeSubTab === 'suggestions' && <SuggestionsWidget />}
        {activeSubTab === 'objectives' && <ObjectivesPanel />}
      </div>
    </div>
  );
}
