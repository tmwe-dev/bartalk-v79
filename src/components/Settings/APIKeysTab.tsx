import { useState, useEffect } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { id: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-proj-...' },
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIzaSy...' },
  { id: 'groq', label: 'Groq (Llama)', placeholder: 'gsk_...' },
  { id: 'elevenlabs', label: 'ElevenLabs (TTS)', placeholder: 'xi-...' },
] as const;

export function APIKeysTab() {
  const { apiKeys, setAPIKey, saveAll } = useSettingsContext();

  // Stato locale per i campi
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const p of PROVIDERS) {
      const entry = apiKeys.find(k => k.provider === p.id);
      init[p.id] = entry?.apiKey || '';
    }
    setFields(init);
  }, [apiKeys]);

  const handleChange = (provider: string, value: string) => {
    setFields(prev => ({ ...prev, [provider]: value }));
  };

  const handleSave = () => {
    for (const p of PROVIDERS) {
      setAPIKey(p.id, fields[p.id] || '');
    }
    saveAll();
  };

  return (
    <div className="tab-content">
      <p className="tab-description">
        Inserisci le chiavi API per ciascun provider. Le chiavi sono salvate localmente nel browser.
      </p>

      {PROVIDERS.map(p => (
        <div key={p.id} className="field-group">
          <label className="field-label">
            {p.label}
            {fields[p.id] && <span className="key-status key-ok">✓</span>}
          </label>
          <input
            type="password"
            className="field-input"
            value={fields[p.id] || ''}
            onChange={(e) => handleChange(p.id, e.target.value)}
            placeholder={p.placeholder}
            autoComplete="off"
          />
        </div>
      ))}

      <button className="btn btn-primary" onClick={handleSave}>
        Salva chiavi
      </button>
    </div>
  );
}
