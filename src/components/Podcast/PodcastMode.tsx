import { useState, useCallback, useRef, useEffect } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useAgentContext } from '../../context/AgentContext';
import { useT } from '../../lib/i18n';
import { orchestrate } from '../../lib/orchestrator';
import {
  enqueueTTS, stopTTS, pauseTTS, resumeTTS, skipTTS,
  getTTSState, waitForTTSQueueDrain,
} from '../../lib/tts';
import { VoiceMicButton } from '../Shared/VoiceMicButton';
import type { AgentResponse } from '../../types/orchestrator';

const MAX_ROUNDS = 10;

interface PodcastState {
  status: 'idle' | 'running' | 'paused' | 'finished';
  topic: string;
  round: number;
  totalRounds: number;
}

/** Messaggio podcast memorizzato per navigazione prev/next */
interface PodcastMessage {
  agentName: string;
  content: string;
  voiceId: string;
  agentEmoji?: string;
  agentColor?: string;
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

  // Navigazione messaggi podcast
  const [podcastMessages, setPodcastMessages] = useState<PodcastMessage[]>([]);
  const [currentMsgIndex, setCurrentMsgIndex] = useState(-1);
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);

  const { messages, addMessage, setWaiting, startTurn, incrementTurn, conversationId } =
    useConversationContext();
  const { ttsEnabled, language } = useSettingsContext();
  const { enabledAgents, getVoiceId } = useAgentContext();
  const t = useT();

  // Track TTS state per aggiornare UI in tempo reale
  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'paused') return;

    const onStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCurrentAgent(detail?.agentName || null);
      // Trova l'indice del messaggio corrente in base all'agente
      const ttsState = getTTSState();
      if (ttsState.currentAgent) {
        setCurrentAgent(ttsState.currentAgent);
      }
    };
    const onEnd = () => {
      const ttsState = getTTSState();
      if (ttsState.queueLength === 0) {
        setCurrentAgent(null);
      }
    };
    const onStop = () => {
      setCurrentAgent(null);
      setIsTTSPaused(false);
    };
    const onPause = () => setIsTTSPaused(true);
    const onResume = () => setIsTTSPaused(false);

    window.addEventListener('radio-audio-start', onStart);
    window.addEventListener('radio-audio-end', onEnd);
    window.addEventListener('radio-audio-stop', onStop);
    window.addEventListener('radio-audio-pause', onPause);
    window.addEventListener('radio-audio-resume', onResume);

    return () => {
      window.removeEventListener('radio-audio-start', onStart);
      window.removeEventListener('radio-audio-end', onEnd);
      window.removeEventListener('radio-audio-stop', onStop);
      window.removeEventListener('radio-audio-pause', onPause);
      window.removeEventListener('radio-audio-resume', onResume);
    };
  }, [state.status]);

  const startPodcast = useCallback(async () => {
    if (!topic.trim() || enabledAgents.length < 2) return;

    abortRef.current = false;
    setPodcastMessages([]);
    setCurrentMsgIndex(-1);
    setIsTTSPaused(false);
    setCurrentAgent(null);

    setState({
      status: 'running',
      topic: topic.trim(),
      round: 0,
      totalRounds: rounds,
    });

    addMessage({
      senderType: 'system',
      senderName: 'Sistema',
      content: `🎙️ Podcast avviato: "${topic.trim()}" — ${rounds} round con ${enabledAgents.length} agenti`,
    });

    setWaiting(true);

    for (let r = 0; r < rounds; r++) {
      if (abortRef.current) break;

      setState(prev => ({ ...prev, round: r + 1 }));

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
            language: language || 'it',
            temperature: 0.8,
            maxTokens: 2048,
            wordRange: [80, 200],
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

            // Salva messaggio per navigazione
            const agent = enabledAgents.find(a => a.name === response.agentName);
            const voiceId = agent ? getVoiceId(agent.id) : '';
            const podMsg: PodcastMessage = {
              agentName: response.agentName,
              content: response.content,
              voiceId,
              agentEmoji: agent?.emoji,
              agentColor: agent?.color,
            };
            setPodcastMessages(prev => {
              const newList = [...prev, podMsg];
              setCurrentMsgIndex(newList.length - 1);
              return newList;
            });

            // TTS — accodato sequenzialmente (nessun overlap grazie alla coda)
            if (ttsEnabled && !response.isDemo && !response.error && voiceId) {
              enqueueTTS({ text: response.content, voiceId, agentName: response.agentName });
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

      // CRITICO: aspetta che la coda TTS si svuoti COMPLETAMENTE prima del round successivo
      // Questo evita che i messaggi si accumulino senza controllo
      if (r < rounds - 1 && !abortRef.current && ttsEnabled) {
        await waitForTTSQueueDrain(abortRef);
      }
    }

    setWaiting(false);

    // Aspetta che anche l'ultimo round finisca di parlare
    if (!abortRef.current && ttsEnabled) {
      await waitForTTSQueueDrain(abortRef);
    }

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
  }, [topic, rounds, enabledAgents, conversationId, messages, ttsEnabled, language, addMessage, setWaiting, startTurn, incrementTurn, getVoiceId]);

  const stopPodcast = useCallback(() => {
    abortRef.current = true;
    stopTTS();
    setWaiting(false);
    setIsTTSPaused(false);
    setCurrentAgent(null);
    setState(prev => ({ ...prev, status: 'idle' }));
  }, [setWaiting]);

  // Pause/Resume TTS
  const togglePause = useCallback(() => {
    if (isTTSPaused) {
      resumeTTS();
      setIsTTSPaused(false);
    } else {
      pauseTTS();
      setIsTTSPaused(true);
    }
  }, [isTTSPaused]);

  // Skip al messaggio successivo nella coda TTS
  const handleNext = useCallback(() => {
    skipTTS();
    setCurrentMsgIndex(prev => Math.min(prev + 1, podcastMessages.length - 1));
  }, [podcastMessages.length]);

  // Riproduci messaggio precedente: ferma tutto, ri-accoda il messaggio precedente
  const handlePrev = useCallback(() => {
    if (currentMsgIndex <= 0 || podcastMessages.length === 0) return;
    const prevIdx = currentMsgIndex - 1;
    const msg = podcastMessages[prevIdx];
    if (!msg) return;

    // Ferma il TTS corrente e ri-accoda il messaggio precedente
    stopTTS();
    setCurrentMsgIndex(prevIdx);

    if (ttsEnabled && msg.voiceId) {
      // Piccolo delay per lasciare che stopTTS pulisca
      setTimeout(() => {
        enqueueTTS({ text: msg.content, voiceId: msg.voiceId, agentName: msg.agentName });
      }, 100);
    }
  }, [currentMsgIndex, podcastMessages, ttsEnabled]);

  // Replay messaggio corrente
  const handleReplay = useCallback(() => {
    if (currentMsgIndex < 0 || !podcastMessages[currentMsgIndex]) return;
    const msg = podcastMessages[currentMsgIndex];
    stopTTS();
    if (ttsEnabled && msg.voiceId) {
      setTimeout(() => {
        enqueueTTS({ text: msg.content, voiceId: msg.voiceId, agentName: msg.agentName });
      }, 100);
    }
  }, [currentMsgIndex, podcastMessages, ttsEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  const isRunning = state.status === 'running' || state.status === 'paused';
  const isFinished = state.status === 'finished';
  const currentPodMsg = podcastMessages[currentMsgIndex];

  return (
    <div className="podcast-panel" role="region" aria-label="Modalità podcast">
      <div className="podcast-header">
        <span className="podcast-icon">🎙️</span>
        <h3>{t('podcastTitle')}</h3>
      </div>

      {!isRunning && !isFinished ? (
        <div className="podcast-setup">
          <label className="podcast-label">{t('podcastTopic')}</label>
          <div className="voice-input-row">
            <input
              type="text"
              className="podcast-input"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={t('podcastPlaceholder')}
              onKeyDown={e => e.key === 'Enter' && startPodcast()}
              aria-label="Argomento podcast"
            />
            <VoiceMicButton onTranscript={setTopic} />
          </div>

          <label className="podcast-label">
            {t('podcastRounds')}: {rounds}
          </label>
          <input
            type="range"
            min={2}
            max={MAX_ROUNDS}
            value={rounds}
            onChange={e => setRounds(Number(e.target.value))}
            className="podcast-slider"
            aria-label={`Numero round: ${rounds}`}
          />

          <div className="podcast-info">
            {enabledAgents.length} {t('podcastActiveAgents')} — {rounds} {t('podcastRoundsOf')}
            {enabledAgents.length < 2 && (
              <span style={{ color: 'var(--color-error)' }}>
                {' '}({t('podcastNeedAgents')})
              </span>
            )}
          </div>

          <button
            className="podcast-start-btn"
            onClick={startPodcast}
            disabled={!topic.trim() || enabledAgents.length < 2}
          >
            ▶ {t('podcastStart')}
          </button>
        </div>
      ) : (
        <div className="podcast-running">
          {/* Progress bar */}
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

          {/* Messaggio corrente in riproduzione */}
          {currentPodMsg && (
            <div className="podcast-now-playing" style={{ borderLeftColor: currentPodMsg.agentColor || '#888' }}>
              <div className="podcast-now-agent">
                {currentPodMsg.agentEmoji} {currentPodMsg.agentName}
                {currentAgent === currentPodMsg.agentName && (
                  <span className="podcast-speaking-dot" />
                )}
              </div>
              <div className="podcast-now-text">
                {currentPodMsg.content.slice(0, 150)}
                {currentPodMsg.content.length > 150 ? '...' : ''}
              </div>
              <div className="podcast-msg-counter">
                {currentMsgIndex + 1} / {podcastMessages.length}
              </div>
            </div>
          )}

          {/* Agent chips */}
          <div className="podcast-agents-row">
            {enabledAgents.map(agent => (
              <div
                key={agent.id}
                className={`podcast-agent-chip ${currentAgent === agent.name ? 'podcast-agent-active' : ''}`}
                style={{ borderColor: agent.color }}
              >
                {agent.emoji} {agent.name}
              </div>
            ))}
          </div>

          {/* Controlli navigazione — SEMPRE visibili quando il podcast è attivo */}
          <div className="podcast-controls">
            <button
              className="podcast-ctrl-btn"
              onClick={handlePrev}
              disabled={currentMsgIndex <= 0}
              aria-label="Messaggio precedente"
              title="Precedente"
            >
              ⏮
            </button>

            <button
              className="podcast-ctrl-btn"
              onClick={handleReplay}
              disabled={podcastMessages.length === 0}
              aria-label="Riascolta messaggio"
              title="Riascolta"
            >
              🔄
            </button>

            <button
              className="podcast-ctrl-btn podcast-ctrl-pause"
              onClick={togglePause}
              aria-label={isTTSPaused ? 'Riprendi' : 'Pausa'}
              title={isTTSPaused ? 'Riprendi' : 'Pausa'}
            >
              {isTTSPaused ? '▶' : '⏸'}
            </button>

            <button
              className="podcast-ctrl-btn"
              onClick={handleNext}
              disabled={podcastMessages.length === 0}
              aria-label="Messaggio successivo"
              title="Successivo"
            >
              ⏭
            </button>

            <button className="podcast-ctrl-btn podcast-ctrl-stop" onClick={stopPodcast} aria-label="Ferma podcast">
              ⏹
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
