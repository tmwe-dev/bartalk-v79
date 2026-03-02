import { useSettingsContext } from '../../context/SettingsContext';
import { UI } from '../../lib/constants';
import { LANGUAGES } from '../../types/settings';
import type { AppLanguage } from '../../types/settings';
import type { ConversationMode, TurnStrategy } from '../../types/conversation';

export function PreferencesTab() {
  const {
    conversationMode, setConversationMode,
    turnStrategy, setTurnStrategy,
    ttsEnabled, setTtsEnabled,
    language, setLanguage,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    wordRange, setWordRange,
  } = useSettingsContext();

  const modes: { value: ConversationMode; label: string; desc: string }[] = [
    { value: 'consultation', label: UI.modConsultation, desc: 'Tutti gli agenti rispondono a ogni messaggio' },
    { value: 'standard', label: UI.modStandard, desc: 'Un agente alla volta, a rotazione' },
    { value: 'bar_realtime', label: UI.modBarRealtime, desc: 'Tutti gli agenti, formato radio' },
  ];

  const strategies: { value: TurnStrategy; label: string }[] = [
    { value: 'round_robin', label: UI.turnRoundRobin },
    { value: 'random', label: UI.turnRandom },
  ];

  return (
    <div className="tab-content">

      {/* ── LINGUA ─────────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">Lingua risposte</label>
        <div className="language-grid">
          {LANGUAGES.map(lang => (
            <button
              key={lang.value}
              className={`lang-btn ${language === lang.value ? 'lang-active' : ''}`}
              onClick={() => setLanguage(lang.value as AppLanguage)}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span className="lang-name">{lang.label}</span>
            </button>
          ))}
        </div>
        <p className="field-hint">
          Gli agenti risponderanno nella lingua selezionata.
        </p>
      </div>

      {/* ── MODALITÀ CONVERSAZIONE ─────────────────────── */}
      <div className="field-group">
        <label className="field-label">Modalità conversazione</label>
        {modes.map(m => (
          <label key={m.value} className="radio-option">
            <input
              type="radio"
              name="mode"
              checked={conversationMode === m.value}
              onChange={() => setConversationMode(m.value)}
            />
            <span className="radio-label">{m.label}</span>
            <span className="radio-desc">{m.desc}</span>
          </label>
        ))}
        <p className="field-hint">
          I primi 4 turni sono sempre in modalità Consultazione.
        </p>
      </div>

      {/* ── STRATEGIA TURNI ────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">Strategia turni (modalità Standard)</label>
        {strategies.map(s => (
          <label key={s.value} className="radio-option">
            <input
              type="radio"
              name="strategy"
              checked={turnStrategy === s.value}
              onChange={() => setTurnStrategy(s.value)}
            />
            <span className="radio-label">{s.label}</span>
          </label>
        ))}
      </div>

      {/* ── TTS ────────────────────────────────────────── */}
      <div className="field-group">
        <label className="radio-option">
          <input
            type="checkbox"
            checked={ttsEnabled}
            onChange={(e) => setTtsEnabled(e.target.checked)}
          />
          <span className="radio-label">
            {ttsEnabled ? UI.ttsOn : UI.ttsOff}
          </span>
          <span className="radio-desc">
            Usa ElevenLabs per le voci degli agenti (richiede chiave API)
          </span>
        </label>
      </div>

      {/* ── TEMPERATURA ────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">
          Temperatura: <strong>{temperature.toFixed(1)}</strong>
        </label>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="range-input"
        />
        <div className="range-labels">
          <span>Preciso (0)</span>
          <span>Creativo (1.5)</span>
        </div>
        <p className="field-hint">
          Valori bassi = risposte più precise. Valori alti = più creatività.
        </p>
      </div>

      {/* ── MAX TOKENS ─────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">
          Max tokens: <strong>{maxTokens}</strong>
        </label>
        <input
          type="range"
          min="256"
          max="4096"
          step="256"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          className="range-input"
        />
        <div className="range-labels">
          <span>Breve (256)</span>
          <span>Lungo (4096)</span>
        </div>
      </div>

      {/* ── WORD RANGE ─────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">
          Parole per risposta: <strong>{wordRange[0]}–{wordRange[1]}</strong>
        </label>
        <div className="dual-range">
          <div>
            <span className="range-sublabel">Min:</span>
            <input
              type="range"
              min="20"
              max="300"
              step="10"
              value={wordRange[0]}
              onChange={(e) => {
                const min = parseInt(e.target.value);
                setWordRange([min, Math.max(min + 20, wordRange[1])]);
              }}
              className="range-input"
            />
          </div>
          <div>
            <span className="range-sublabel">Max:</span>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={wordRange[1]}
              onChange={(e) => {
                const max = parseInt(e.target.value);
                setWordRange([Math.min(wordRange[0], max - 20), max]);
              }}
              className="range-input"
            />
          </div>
        </div>
      </div>

      <p className="field-hint auto-save-notice">
        Le preferenze vengono salvate automaticamente.
      </p>
    </div>
  );
}
