import { useTTS } from '../../hooks/useTTS';
import { useSettingsContext } from '../../context/SettingsContext';
import { getAgent } from '../../lib/agents';

/**
 * Mini console audio floating — appare a destra al centro quando
 * l'audio è in riproduzione. Layout verticale con controlli compatti.
 */
export function AudioControlBar() {
  const { isPlaying, isPaused, currentAgent, stop, togglePlayPause, skip } = useTTS();
  const { setTtsEnabled } = useSettingsContext();

  const agent = currentAgent ? getAgent(currentAgent) : null;

  if (!isPlaying) return null;

  return (
    <div className="audio-mini-console" role="region" aria-label="Controlli audio">
      {agent ? (
        <div className="audio-mini-agent" style={{ color: agent.color }} title={agent.name}>
          {agent.emoji}
        </div>
      ) : currentAgent ? (
        <div className="audio-mini-agent" title={currentAgent}>🎵</div>
      ) : null}

      <button className="audio-mini-btn" onClick={togglePlayPause}
        title={isPaused ? 'Riprendi' : 'Pausa'} aria-label={isPaused ? 'Riprendi' : 'Pausa'}>
        {isPaused ? '▶️' : '⏸️'}
      </button>

      <button className="audio-mini-btn" onClick={skip}
        title="Salta" aria-label="Salta al prossimo">⏭️</button>

      <button className="audio-mini-btn stop" onClick={stop}
        title="Stop" aria-label="Ferma tutto">⏹️</button>

      <button className="audio-mini-btn mute"
        onClick={() => { stop(); setTtsEnabled(false); }}
        title="Disattiva audio" aria-label="Disattiva audio">🔇</button>
    </div>
  );
}
