import { useState, useEffect } from 'react';
import { useAgentContext } from '../../context/AgentContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { AGENTS } from '../../lib/agents';
import { TTS } from '../../lib/constants';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export function VoicesTab() {
  const { setCustomVoice, resetVoice, getVoiceId } = useAgentContext();
  const { getAPIKey } = useSettingsContext();
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Carica catalogo voci ElevenLabs
  const loadVoices = async () => {
    const key = getAPIKey('elevenlabs');
    if (!key) return;

    setLoading(true);
    try {
      const res = await fetch(`${TTS.apiBase}/voices`, {
        headers: { 'xi-api-key': key },
      });
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
      }
    } catch (err) {
      console.error('[voices] Errore caricamento catalogo:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadVoices(); }, []);

  const filteredVoices = voices.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const previewVoice = (previewUrl?: string) => {
    if (!previewUrl) return;
    const audio = new Audio(previewUrl);
    audio.play();
  };

  return (
    <div className="tab-content">
      <h4>Voci assegnate</h4>
      <div className="voice-assignments">
        {AGENTS.map(agent => (
          <div key={agent.id} className="voice-row">
            <span style={{ color: agent.color }}>{agent.emoji} {agent.name}</span>
            <code className="voice-id">{getVoiceId(agent.id).substring(0, 12)}...</code>
            <button className="btn btn-sm" onClick={() => resetVoice(agent.id)}>Reset</button>
          </div>
        ))}
      </div>

      <hr className="divider" />

      <h4>Catalogo ElevenLabs</h4>
      {!getAPIKey('elevenlabs') && (
        <p className="tab-description">Inserisci la chiave ElevenLabs nel tab "Chiavi API" per caricare il catalogo.</p>
      )}

      {voices.length > 0 && (
        <>
          <input
            className="field-input"
            placeholder="Cerca voce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="voice-catalog">
            {filteredVoices.slice(0, 20).map(voice => (
              <div key={voice.voice_id} className="voice-card">
                <div className="voice-card-info">
                  <strong>{voice.name}</strong>
                  {voice.labels && (
                    <span className="voice-labels">
                      {Object.values(voice.labels).join(', ')}
                    </span>
                  )}
                </div>
                <div className="voice-card-actions">
                  {voice.preview_url && (
                    <button className="btn btn-sm" onClick={() => previewVoice(voice.preview_url)}>
                      ▶ Prova
                    </button>
                  )}
                  {AGENTS.map(agent => (
                    <button
                      key={agent.id}
                      className="btn btn-sm"
                      style={{ color: agent.color }}
                      onClick={() => setCustomVoice(agent.id, voice.voice_id)}
                    >
                      → {agent.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {loading && <p>Caricamento voci...</p>}

      <button className="btn btn-secondary" onClick={loadVoices} disabled={loading}>
        Ricarica catalogo
      </button>
    </div>
  );
}
