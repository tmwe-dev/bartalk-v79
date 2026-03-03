/**
 * BarTalk v8 — MemoryTab
 * Pannello configurazione parametri memoria nel Settings.
 */

import { useState, useEffect } from 'react';
import {
  loadMemoryConfig,
  saveMemoryConfig,
  resetMemoryConfig,
  type MemoryConfigType,
} from '../../lib/memory';

const FIELDS: { key: keyof MemoryConfigType; label: string; desc: string; min: number; max: number; step: number }[] = [
  { key: 'fullDetailCount', label: 'L1 — Messaggi completi', desc: 'Ultimi N messaggi inviati per intero agli agenti', min: 5, max: 50, step: 5 },
  { key: 'condensedCount', label: 'L2 — Messaggi condensati', desc: 'N messaggi precedenti inviati come sintesi di 1 riga', min: 5, max: 50, step: 5 },
  { key: 'summaryTrigger', label: 'Trigger riassunto auto', desc: 'Genera un riassunto AI ogni N messaggi non riassunti', min: 10, max: 100, step: 5 },
  { key: 'maxContextTokens', label: 'Max token contesto', desc: 'Limite massimo token stimati per il contesto (safety)', min: 2000, max: 16000, step: 500 },
  { key: 'condensedMaxChars', label: 'Max caratteri per condensato', desc: 'Lunghezza massima di ogni messaggio L2 condensato', min: 60, max: 300, step: 20 },
  { key: 'summaryMaxChars', label: 'Max caratteri riassunto', desc: 'Lunghezza massima del blocco riassunto L3', min: 400, max: 2000, step: 100 },
];

export function MemoryTab() {
  const [config, setConfig] = useState<MemoryConfigType>(loadMemoryConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(loadMemoryConfig());
  }, []);

  const handleChange = (key: keyof MemoryConfigType, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveMemoryConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetMemoryConfig();
    setConfig(loadMemoryConfig());
    setSaved(false);
  };

  return (
    <div className="memory-tab">
      <p className="memory-tab-intro">
        Configura i parametri del sistema di memoria a 3 livelli.
        Le modifiche si applicano dalla prossima chiamata agli agenti.
      </p>

      <div className="memory-fields">
        {FIELDS.map(f => (
          <div key={f.key} className="memory-field">
            <div className="memory-field-header">
              <label className="memory-field-label">{f.label}</label>
              <span className="memory-field-value">{config[f.key]}</span>
            </div>
            <input
              type="range"
              className="memory-slider"
              min={f.min}
              max={f.max}
              step={f.step}
              value={config[f.key]}
              onChange={e => handleChange(f.key, Number(e.target.value))}
            />
            <span className="memory-field-desc">{f.desc}</span>
          </div>
        ))}
      </div>

      <div className="memory-tab-actions">
        <button className="memory-btn-reset" onClick={handleReset}>
          Ripristina Default
        </button>
        <button className="memory-btn-save" onClick={handleSave}>
          {saved ? '✓ Salvato' : 'Salva'}
        </button>
      </div>
    </div>
  );
}
