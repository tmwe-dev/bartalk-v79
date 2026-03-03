import { useState } from 'react';
import { useUIContext } from '../../context/UIContext';
import { Modal } from '../Common/Modal';
import { APIKeysTab } from './APIKeysTab';
import { VoicesTab } from './VoicesTab';
import { PreferencesTab } from './PreferencesTab';
import { PromptTab } from './PromptTab';
import { MemoryTab } from './MemoryTab';
import { PromptSectionsTab } from './PromptSectionsTab';

const TABS = [
  { id: 'keys', label: 'Chiavi API' },
  { id: 'prompts', label: 'Prompt' },
  { id: 'sections', label: 'Sezioni' },
  { id: 'memory', label: 'Memoria' },
  { id: 'voices', label: 'Voci' },
  { id: 'prefs', label: 'Preferenze' },
] as const;

type TabId = typeof TABS[number]['id'];

export function SettingsModal() {
  const { settingsOpen, closeSettings } = useUIContext();
  const [activeTab, setActiveTab] = useState<TabId>('keys');

  return (
    <Modal open={settingsOpen} onClose={closeSettings} title="Impostazioni">
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'keys' && <APIKeysTab />}
      {activeTab === 'prompts' && <PromptTab />}
      {activeTab === 'sections' && <PromptSectionsTab />}
      {activeTab === 'memory' && <MemoryTab />}
      {activeTab === 'voices' && <VoicesTab />}
      {activeTab === 'prefs' && <PreferencesTab />}
    </Modal>
  );
}
