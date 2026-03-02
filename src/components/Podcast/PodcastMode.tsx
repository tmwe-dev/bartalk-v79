import { useState, useCallback, useRef, useEffect } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useAgentContext } from '../../context/AgentContext';
import { orchestrate } from '../../lib/orchestrator';
import { enqueueTTS, stopTTS } from '../../lib/tts';
import type { AgentResponse } from '../../types/orchestrator';

const MAX_ROUNDS = 10;
const PAUSE_BETWEEN_ROUNDS_MS = 2000;

interface PodcastState {
  status: 'idle' | 'running' | 'paused' | 'finished';
  topic: string;
  round: number;
  totalRounds: number;
}

export function PodcastMode() {
  const [topic, setTopic] = useState('');
  const [rounds, setRounds] = useState(5);
  const [state, setState] = useState<PodcastState>({
    status: 'idle',
    topic: '',
    round: 0,
    totalRounds: 5,
  });
  const abortRef = useRef(false);

  const { messages, addMessage, setWaiting, startTurn, incrementTurn, conversationId } =
    useConversationContext();
  const { ttsEnabled } = useSettingsContext();
  const { enabledAgents, getVoiceId } = useAgentContext();

  const startPodcast = useCallback(async () => {
    if (!topic.trim() || enabledAgents.length < 2) return;

    abortRef.current = false;
    setState({
      status: 'running',
      topic: topic.trim(),
      round: 0,
      totalRounds: rounds,
    });

    // Messaggio iniziale del sistema
    addMessage({
      senderType: 'system',
      senderName: 'Sistema',
      content: `🎙️ Podcast avviato: "${topic.trim()}" — ${rounds} round con ${enabledAgents.length} agenti`,
    });

    setWaiting(true);

    for (let r = 0; r < rounds; r++) {
      if (abortRef.current) break;

      setState(prev => ({ ...prev, round: r + 1 }));

      // Costruisci il prompt per questo round
      const roundPrompt = r === 0
        ? `Sei in un podcast/dibattito con altri esperti AI. L'argomento è: "${topic.trim()}". Presenta la tua posizione iniziale in modo coinvolgente e conciso (max 3 paragrafi). Parla in prima persona, sii appassionato.`
        : `Continua il podcast/dibattito sull'argomento "${topic.trim()}". Questo è il round ${r + 1}. Rispondi a quello che hanno detto gli altri, porta nuovi punti di vista, fai domande provocatorie. Sii conciso ma incisivo (max 2 paragrafi).`;

      const turnId = startTurn();

      try {
        await orchestrate(
          {
            conversationId,
            userMessage: roundPrompt,
            messages,
            turnIndex: r,
            mode: 'consultation',
            turnStrategy: 'round_robin',
            enabledAgents,
          },
          (response: AgentResponse) => {
            if (abortRef.current) return;

            addMessage({
              senderType: 'assistant',
              senderName: response.agentName,
              content: response.content,
              turnId,
              provider: response.provider,
              tokensIn: response.tokensIn,
              tokensOut: response.tokensOut,
              duration: response.duration,
            });

            // TTS
            if (ttsEnabled && !response.isDemo && !response.error) {
              const agent = enabledAgents.find(a => a.name === response.agentName);
              if (agent) {
                const voiceId = getVoiceId(agent.id);
                enqueueTTS(response.content, voiceId, response.agentName);
              }
            }
          },
        );

        incrementTurn();
      } catch (err) {
        console.error('[Podcast] Errore round', r + 1, err);
        addMessage({
          senderType: 'system',
          senderName: 'Sistema',
          content: `⚠️ Errore nel round ${r + 1}: ${(err as Error).message}`,
        });
      }

      // Pausa tra i round
      if (r < rounds - 1 && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, PAUSE_BETWEEN_ROUNDS_MS));
      }
    }

    setWaiting(false);

    if (!abortRef.current) {
      addMessage({
        senderType: 'system',
        senderName: 'Sistema',
        content: '🎙️ Podcast terminato! Grazie per l\'ascolto.',
      });
      setState(prev => ({ ...prev, status: 'finished' }));
    } else {
      addMessage({
        senderType: 'system',
        senderName: 'Sistema',
        content: '⏹️ Podcast interrotto.',
      });
      setState(prev => ({ ...prev, status: 'idle' }));
    }
  }, [topic, rounds, enabledAgents, conversationId, messages, ttsEnabled, addMessage, setWaiting, startTurn, incrementTurn, getVoiceId]);

  const stopPodcast = useCallback(() => {
    abortRef.current = true;
    stopTTS();
    setWaiting(false);
    setState(prev => ({ ...prev, status: 'idle' }));
  }, [setWaiting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  const isRunning = state.status === 'running';

  return (
    <div className="podcast-panel">
      <div className="podcast-header">
        <span className="podcast-icon">🎙️</span>
        <h3>Modalità Podcast</h3>
      </div>

      {!isRunning ? (
        <div className="podcast-setup">
          <label className="podcast-label">Argomento del dibattito:</label>
          <input
            type="text"
            className="podcast-input"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="es. L'intelligenza artificiale sostituirà i programmatori?"
            onKeyDown={e => e.key === 'Enter' && startPodcast()}
          />

          <label className="podcast-label">
            Round: {rounds}
          </label>
          <input
            type="range"
            min={2}
            max={MAX_ROUNDS}
            value={rounds}
            onChange={e => setRounds(Number(e.target.value))}
            className="podcast-slider"
          />

          <div className="podcast-info">
            {enabledAgents.length} agenti attivi — {rounds} round di dibattito
            {enabledAgents.length < 2 && (
              <span style={{ color: 'var(--color-error)' }}>
                {' '}(servono almeno 2 agenti!)
              </span>
            )}
          </div>

          <button
            className="podcast-start-btn"
            onClick={startPodcast}
            disabled={!topic.trim() || enabledAgents.length < 2}
          >
            ▶ Avvia Podcast
          </button>
        </div>
      ) : (
        <div className="podcast-running">
          <div className="podcast-progress">
            <div className="podcast-progress-bar">
              <div
                className="podcast-progress-fill"
                style={{ width: `${(state.round / state.totalRounds) * 100}%` }}
              />
            </div>
            <span className="podcast-progress-text">
              Round {state.round}/{state.totalRounds}
            </span>
          </div>

          <div className="podcast-topic-display">
            "{state.topic}"
          </div>

          <div className="podcast-agents-row">
            {enabledAgents.map(agent => (
              <div key={agent.id} className="podcast-agent-chip" style={{ borderColor: agent.color }}>
                {agent.emoji} {agent.name}
              </div>
            ))}
          </div>

          <button className="podcast-stop-btn" onClick={stopPodcast}>
            ⏹ Ferma Podcast
          </button>
        </div>
      )}
    </div>
  );
}
