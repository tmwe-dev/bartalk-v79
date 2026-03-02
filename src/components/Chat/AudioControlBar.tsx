import { useTTS } from '../../hooks/useTTS';
import { useSettingsContext } from '../../context/SettingsContext';
import { getAgent } from '../../lib/agents';

export function AudioControlBar() {
  const { isPlaying, isPaused, currentAgent, stop, togglePlayPause, skip } = useTTS();
  const { ttsEnabled, setTtsEnabled } = useSettingsContext();

  const agent = currentAgent ? getAgent(currentAgent) : null;

  return (
    <div className="audio-control-bar">
      {/* TTS on/off toggle */}
      <button
        className={`audio-ctrl-btn ${ttsEnabled ? 'active' : ''}`}
        onClick={() => setTtsEnabled(!ttsEnabled)}
        title={ttsEnabled ? 'Disattiva audio' : 'Attiva audio'}
      >
        {ttsEnabled ? '🔊' : '🔇'}
      </button>

      {/* Now playing indicator */}
      {isPlaying && agent && (
        <span className="audio-now-playing" style={{ color: agent.color }}>
          {agent.emoji} {agent.name}
        </span>
      )}
      {isPlaying && !agent && currentAgent && (
        <span className="audio-now-playing">
          🎵 {currentAgent}
        </span>
      )}

      {/* Play/Pause */}
      {isPlaying && (
        <button
          className="audio-ctrl-btn"
          onClick={togglePlayPause}
          title={isPaused ? 'Riprendi' : 'Pausa'}
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>
      )}

      {/* Skip to next */}
      {isPlaying && (
        <button
          className="audio-ctrl-btn"
          onClick={skip}
          title="Salta al prossimo"
        >
          ⏭️
        </button>
      )}

      {/* Stop all */}
      {isPlaying && (
        <button
          className="audio-ctrl-btn stop"
          onClick={stop}
          title="Ferma tutto"
        >
          ⏹️
        </button>
      )}
    </div>
  );
}
