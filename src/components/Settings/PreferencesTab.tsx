import { useSettingsContext } from '../../context/SettingsContext';
import { UI } from '../../lib/constants';
import type { ConversationMode, TurnStrategy } from '../../types/conversation';

export function PreferencesTab() {
  const {
    conversationMode, setConversationMode,
    turnStrategy, setTurnStrategy,
    ttsEnabled, setTtsEnabled,
    saveAll,
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
          I primi 4 turni sono sempre in modalità Consultazione (tutti gli agenti rispondono).
        </p>
      </div>

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

      <button className="btn btn-primary" onClick={saveAll}>
        Salva preferenze
      </button>
    </div>
  );
}
