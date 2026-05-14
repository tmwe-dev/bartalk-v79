/**
 * Life Tutor — Free Chat Panel
 * Conversazione libera con il Life Tutor su qualsiasi argomento.
 * Include: input vocale real-time (STT), output vocale (TTS), comunicazione fluida.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { useSettingsContext } from '../../context/SettingsContext';
import { callProxy } from '../../lib/proxy';
import { resolveApiKey, PRIORITY_ORDERS } from '../../lib/apiKeyResolver';
import { buildLifeTutorPromptAddon } from '../../lib/lifeTutor/prompt';
import { detectContextTags } from '../../lib/lifeTutor/memory';
import { loadProfileLocal } from '../../lib/lifeTutor/profile';
import { processConversationMemories } from '../../lib/lifeTutor/extraction';
import { enqueueTTS } from '../../lib/tts';
import { preprocessForTTS } from '../../lib/ttsPreprocessor';
import { getVoiceForMaestro } from '../../lib/maestro/voices';
import { MAESTRI } from '../../lib/maestro/definitions';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { getLangConfig } from '../../types/settings';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function FreeChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { ttsEnabled, language } = useSettingsContext();

  // ── Speech-to-Text ────────────────────────────────────────────────
  const langConfig = getLangConfig(language);
  const autoSendRef = useRef(false);

  const handleSttResult = useCallback((text: string) => {
    if (text.trim()) {
      setInput(text.trim());
      autoSendRef.current = true; // Auto-invio dopo che STT ha finito
    }
  }, []);

  const {
    isListening, isSupported, transcript,
    toggleListening, clearTranscript,
  } = useSpeechToText(langConfig.bcp47, handleSttResult);

  // Aggiorna textarea in real-time con il transcript
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Save memories on unmount
  useEffect(() => {
    return () => {
      if (messages.length >= 4) {
        const simpleMsgs = messages.map(m => ({ role: m.role, content: m.content }));
        processConversationMemories(simpleMsgs, 'free_chat').catch(() => {});
      }
    };
  }, [messages]);

  // ── Mic button handler ─────────────────────────────────────────────
  const handleMicClick = useCallback(() => {
    if (isListening) {
      toggleListening(); // Stop → onResult → handleSttResult → auto-send
    } else {
      clearTranscript();
      setInput('');
      toggleListening();
    }
  }, [isListening, toggleListening, clearTranscript]);

  // ── Cancella testo e ricomincia registrazione ────────────────────
  const handleClearRestart = useCallback(() => {
    clearTranscript();
    setInput('');
    // Se non sta già ascoltando, riavvia il mic
    if (!isListening) {
      toggleListening();
    }
  }, [clearTranscript, isListening, toggleListening]);

  const sendMessageRef = useRef<() => void>(() => {});
  const sendingRef = useRef(false); // Guard sincrono anti-doppio invio

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const apiConfig = resolveApiKey(undefined, undefined, PRIORITY_ORDERS.default);
      if (!apiConfig) {
        setMessages(prev => [...prev, {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Nessuna API key configurata. Vai nelle impostazioni per aggiungerne una.',
          timestamp: new Date().toISOString(),
        }]);
        setIsLoading(false);
        return;
      }

      // Build context
      const profile = loadProfileLocal();
      const studentName = profile?.displayName || profile?.nickname || '';
      const contextTags = detectContextTags(text);
      const lifeTutorAddon = buildLifeTutorPromptAddon(studentName, contextTags, 'free_chat', language);

      const LIFE_TUTOR_BASE = `Sei il Life Tutor di BarTalk — un mentore personale empatico, intelligente e proattivo.
Il tuo ruolo è guidare lo studente nella crescita personale, professionale e nello studio.
NON sei un assistente generico. Sei un TUTOR DI VITA con queste caratteristiche:
- Conosci lo studente e ricordi le conversazioni passate
- Proponi attività, sfide e riflessioni personalizzate
- Alterni ascolto empatico e guida pratica
- Celebri i progressi e noti i pattern (stress, motivazione, blocchi)
- NON inizi MAI con "Come posso aiutarti?" — sei TU a guidare la conversazione
- Rispondi in italiano a meno che lo studente non scriva in un'altra lingua
- Sei genuino, caldo, mai robotico — parli come un amico fidato e mentore esperto
${studentName ? `Lo studente si chiama ${studentName}.` : ''}`;

      const systemPrompt = LIFE_TUTOR_BASE + (lifeTutorAddon ? '\n' + lifeTutorAddon : '');

      // Build message history (last 20 messages for context)
      const history = messages.slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }));
      history.push({ role: 'user', content: text });

      const response = await callProxy({
        provider: apiConfig.provider,
        model: apiConfig.model,
        messages: history,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 2048,
        apiKey: apiConfig.apiKey,
      });

      const assistantContent = response.error
        ? `Mi dispiace, c'è stato un errore: ${response.error}`
        : response.content;

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // TTS — usa voce ElevenLabs del maestro Sofia (primo maestro)
      if (ttsEnabled && !response.error) {
        const processed = preprocessForTTS(assistantContent, language);
        const voiceId = getVoiceForMaestro(MAESTRI[0], language);
        enqueueTTS({ text: processed, voiceId, agentName: 'Life Tutor' });
      }
    } catch (_err) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'Errore di connessione. Riprova tra qualche secondo.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  }, [input, isLoading, messages, ttsEnabled, language]);

  // Mantieni il ref aggiornato
  sendMessageRef.current = sendMessage;

  // ── Conferma e invia manuale (fallback durante ascolto) ───────────
  const handleConfirmSend = useCallback(() => {
    if (isListening) {
      toggleListening();
    }
    if (input.trim()) {
      autoSendRef.current = false;
      setTimeout(() => sendMessageRef.current(), 50);
    }
  }, [isListening, toggleListening, input]);

  // ── Auto-send dopo STT ─────────────────────────────────────────────
  // Quando il riconoscimento vocale finisce e ha prodotto testo, invia automaticamente.
  // NOTA: usiamo sendMessageRef (non sendMessage) per evitare che la ricreazione
  // del callback (dovuta a cambio messages/input) ri-triggeri l'effect.
  useEffect(() => {
    if (autoSendRef.current && input.trim() && !isLoading && !isListening) {
      autoSendRef.current = false;
      sendMessageRef.current();
    }
  }, [input, isLoading, isListening]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="lt-freechat" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ color: '#e53e3e', marginBottom: '8px' }}>Errore nella chat</h3>
          <p style={{ color: '#718096' }}>Impossibile caricare la chat. Verifica la connessione e riprova.</p>
        </div>
      }
    >
    <div className="lt-freechat">
      <div className="lt-freechat-header">
        <span className="lt-freechat-title">Life Tutor</span>
        <span className="lt-freechat-subtitle">Parla liberamente di qualsiasi cosa</span>
      </div>

      <div className="lt-freechat-messages">
        {messages.length === 0 && (
          <div className="lt-freechat-empty">
            <div className="lt-freechat-empty-icon">{'\u{1F393}'}</div>
            <p>Ciao! Sono il tuo Life Tutor.</p>
            <p>Puoi parlarmi di qualsiasi cosa: studio, lavoro, vita personale, obiettivi, o semplicemente fare una chiacchierata.</p>
            <div className="lt-freechat-suggestions">
              {['Come stai oggi?', 'Ho bisogno di un consiglio', 'Parliamo dei miei obiettivi', 'Cosa mi suggerisci?'].map(s => (
                <button
                  key={s}
                  className="lt-freechat-suggestion-btn"
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`lt-freechat-msg lt-freechat-msg-${msg.role}`}>
            <div className="lt-freechat-msg-avatar">
              {msg.role === 'user' ? '\u{1F464}' : '\u{1F393}'}
            </div>
            <div className="lt-freechat-msg-content">
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="lt-freechat-msg lt-freechat-msg-assistant">
            <div className="lt-freechat-msg-avatar">{'\u{1F393}'}</div>
            <div className="lt-freechat-msg-content lt-freechat-typing">
              <span className="lt-typing-dot" />
              <span className="lt-typing-dot" />
              <span className="lt-typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="lt-freechat-input-area">
        {isSupported && (
          <button
            className={`lt-freechat-mic ${isListening ? 'lt-mic-active' : ''}`}
            onClick={handleMicClick}
            disabled={isLoading}
            title={isListening ? 'Stop registrazione' : 'Parla'}
          >
            {isListening ? '⏹' : '\u{1F3A4}'}
          </button>
        )}
        {/* Cancella testo e ricomincia — visibile quando c'è testo (recording o no) */}
        {input.trim() && !isLoading && (
          <button
            className="lt-freechat-clear"
            onClick={handleClearRestart}
            title="Cancella e ricomincia"
          >
            {'✕'}
          </button>
        )}
        <textarea
          ref={inputRef}
          className="lt-freechat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? '\u{1F3A4} Sto ascoltando...' : 'Scrivi o parla...'}
          rows={1}
          disabled={isLoading}
        />
        {/* Conferma+invia — visibile durante ascolto quando c'è testo */}
        {isListening && input.trim() && (
          <button
            className="lt-freechat-confirm-send"
            onClick={handleConfirmSend}
            title="Conferma e invia"
          >
            {'✓'}
          </button>
        )}
        <button
          className="lt-freechat-send"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          {'➤'}
        </button>
      </div>
    </div>
    </ErrorBoundary>
  );
}
