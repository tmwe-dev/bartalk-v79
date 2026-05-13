/**
 * BarTalk v8 — MaestroChat
 * Interfaccia conversazionale per le sessioni di studio interattive.
 * Integra: microfono, registrazione audio, analisi pronuncia, avatar, toolbar, cambio lingua.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { useMaestroContext } from '../../context/MaestroContext';
import { useCourseContext } from '../../context/CourseContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { saveRecording } from '../../lib/audioStorage';
import { getVoiceForMaestro } from '../../lib/maestro/voices';
import { generateId } from '../../lib/utils';
import { RATE_LIMITS } from '../../lib/constants';
import { LANGUAGES } from '../../types/settings';
import { MaestroAvatar } from './MaestroAvatar';
import { MaestroToolbar } from './MaestroToolbar';
import { PronunciationPanel } from './PronunciationPanel';
import type { MaestroMessage, EmotionalState, MaestroDefinition } from '../../types/maestro';
import { EMOTIONAL_STATE_META } from '../../types/maestro';

interface MaestroChatProps {
  onBack: () => void;
}

export function MaestroChat({ onBack }: MaestroChatProps) {
  const {
    currentSession,
    currentMaestro,
    memory,
    isTeaching,
    isSpeaking,
    sendMessage,
    endSession,
  } = useMaestroContext();
  const { activeCourse, completeLesson } = useCourseContext();
  const { language } = useSettingsContext();

  const [input, setInput] = useState('');
  const [sessionLang, setSessionLang] = useState(language);
  // Slider verbosità: 1=sintetico, 2=normale, 3=approfondito
  const [verbosity, setVerbosity] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('bt_maestro_verbosity') || '2') || 2; } catch { return 2; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get BCP-47 code for STT
  const langConfig = LANGUAGES.find(l => l.value === sessionLang);
  const bcp47 = langConfig?.bcp47 || 'it-IT';

  // Speech-to-Text — onResult receives (text, confidence) in v8.2.5
  const handleSttResult = useCallback((text: string, _confidence: number) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
  }, []);

  const {
    isListening,
    isSupported: sttSupported,
    transcript: interimTranscript,
    toggleListening,
    clearTranscript,
  } = useSpeechToText(bcp47, handleSttResult);

  // Audio Recording (parallel to STT)
  const {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    duration: recordingDuration,
    audioUrl,
  } = useAudioRecording();

  // Sync sessionLang quando l'utente cambia lingua nelle preferenze globali
  useEffect(() => {
    setSessionLang(language);
  }, [language]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Auto-focus input
  useEffect(() => {
    if (!isTeaching && !isListening) inputRef.current?.focus();
  }, [isTeaching, isListening]);

  // Sync interim transcript to input
  useEffect(() => {
    if (isListening && interimTranscript) {
      setInput(interimTranscript);
    }
  }, [isListening, interimTranscript]);

  if (!currentSession || !currentMaestro || !activeCourse) {
    return (
      <div className="maestro-chat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: '#718096' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
          <p>Caricamento sessione in corso...</p>
        </div>
      </div>
    );
  }

  const lesson = activeCourse.lessons[currentSession.lessonIndex];
  if (!lesson) return null;

  const isLanguageCourse = activeCourse.category === 'lingue';
  const totalObjectives = lesson.objectives.length;
  const coveredObjectives = currentSession.coveredObjectives.length;
  const progressPercent = totalObjectives > 0
    ? Math.round((coveredObjectives / totalObjectives) * 100)
    : 0;

  const voiceId = getVoiceForMaestro(currentMaestro, sessionLang);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || isTeaching) return;

    // Save audio recording if we were recording
    if (audioBlob && audioUrl) {
      try {
        await saveRecording({
          id: generateId(),
          sessionId: currentSession.id,
          courseId: currentSession.courseId,
          lessonIndex: currentSession.lessonIndex,
          timestamp: new Date().toISOString(),
          blob: audioBlob,
          duration: recordingDuration,
          transcript: text,
          language: bcp47,
        });
      } catch (err) {
        console.error('[MaestroChat] Errore salvataggio audio:', err);
      }
    }

    setInput('');
    clearTranscript();

    // Inietta istruzione verbosità come hint invisibile allo studente
    const verbosityHint = verbosity === 1
      ? '\n[SISTEMA: lo studente preferisce risposte SINTETICHE e rapide. Vai dritto al punto.]'
      : verbosity === 3
        ? '\n[SISTEMA: lo studente vuole APPROFONDIMENTO. Spiega in dettaglio, fai esempi, espandi.]'
        : '';
    const messageWithHint = text + verbosityHint;

    await sendMessage(messageWithHint, sessionLang);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      // Stop
      toggleListening();
      stopRecording();
    } else {
      // Start
      clearTranscript();
      toggleListening();
      startRecording();
    }
  };

  const handleToolbarCommand = (text: string) => {
    handleSend(text);
  };

  const handleEndSession = () => {
    if (currentSession.comprehensionScore >= 60) {
      completeLesson(currentSession.lessonIndex, currentSession.comprehensionScore);
    }
    endSession();
    onBack();
  };

  // Gestisci risultato esercizio pronuncia → invia feedback automatico al maestro
  const handlePronunciationComplete = useCallback((phrase: string, score: number) => {
    const isGood = score >= 80;
    const isMedium = score >= 50;

    let feedbackMsg: string;
    if (isGood) {
      feedbackMsg = `[SISTEMA: Lo studente ha completato l'esercizio di pronuncia per "${phrase}" con punteggio ${score}%. Ottimo risultato! Complimentati brevemente e prosegui con la lezione. Se ci sono altri argomenti da coprire, avanza. Non riproporre lo stesso esercizio.]`;
    } else if (isMedium) {
      feedbackMsg = `[SISTEMA: Lo studente ha completato l'esercizio di pronuncia per "${phrase}" con punteggio ${score}%. Risultato discreto ma migliorabile. Incoraggialo, dai un suggerimento specifico sulla pronuncia, e prosegui. Ricorda questa difficoltà per proporla di nuovo più avanti nella lezione come ripasso.]`;
    } else {
      feedbackMsg = `[SISTEMA: Lo studente ha completato l'esercizio di pronuncia per "${phrase}" con punteggio ${score}%. Ha avuto difficoltà. Non scoraggiarlo — semplifica, proponi la parola più lentamente o scomponila in sillabe. Annota mentalmente questa difficoltà per riproporla come ripasso più avanti.]`;
    }

    sendMessage(feedbackMsg, sessionLang);
  }, [sendMessage, sessionLang]);

  const handleLanguageChange = (newLang: string) => {
    setSessionLang(newLang as typeof language);
  };

  const handleVerbosityChange = (v: number) => {
    setVerbosity(v);
    localStorage.setItem('bt_maestro_verbosity', String(v));
  };

  // Lingue per il selettore: prima primary/major, poi tutte le altre
  const primaryLanguages = LANGUAGES.filter(l => l.group === 'primary' || l.group === 'major');
  const otherLanguages = LANGUAGES.filter(l => l.group !== 'primary' && l.group !== 'major');

  return (
    <ErrorBoundary
      fallback={
        <div className="maestro-chat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ color: '#e53e3e', marginBottom: '8px' }}>Errore nella sessione</h3>
            <p style={{ color: '#718096', marginBottom: '16px' }}>Si è verificato un errore durante la sessione con il maestro.</p>
            <button
              onClick={onBack}
              style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: '#3182ce', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              Torna indietro
            </button>
          </div>
        </div>
      }
    >
    <div className="maestro-chat" style={{ '--maestro-color': currentMaestro.color } as React.CSSProperties}>
      {/* Header */}
      <div className="maestro-chat-header">
        <div className="maestro-chat-header-left">
          <button className="maestro-back-btn" onClick={onBack} title="Indietro">
            ←
          </button>
          <MaestroAvatar maestro={currentMaestro} size="md" isSpeaking={isSpeaking} />
          <div className="maestro-header-info">
            <span className="maestro-name">{currentMaestro.name}</span>
            <span className="maestro-title">{currentMaestro.title}</span>
          </div>
        </div>
        <div className="maestro-chat-header-right">
          {/* Language selector — cambia lingua del professore in tempo reale */}
          <select
            className="maestro-lang-select"
            value={sessionLang}
            onChange={e => handleLanguageChange(e.target.value)}
            title="Lingua del professore"
          >
            <optgroup label="Principali">
              {primaryLanguages.map(l => (
                <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
              ))}
            </optgroup>
            {otherLanguages.length > 0 && (
              <optgroup label="Altre lingue">
                {otherLanguages.map(l => (
                  <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
                ))}
              </optgroup>
            )}
          </select>

          {memory && (
            <span className="maestro-emotion" title={EMOTIONAL_STATE_META[memory.lastEmotionalState].label}>
              {EMOTIONAL_STATE_META[memory.lastEmotionalState].icon}
            </span>
          )}
          <button className="maestro-end-btn" onClick={handleEndSession}>
            Termina sessione
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <MaestroToolbar
        onCommand={handleToolbarCommand}
        isLanguageCourse={isLanguageCourse}
        disabled={isTeaching}
      />

      {/* Lesson Progress Bar */}
      <div className="maestro-progress">
        <div className="maestro-progress-label">
          <span>{lesson.title}</span>
          <span>{coveredObjectives}/{totalObjectives} obiettivi</span>
        </div>
        <div className="maestro-progress-bar">
          <div
            className="maestro-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="maestro-messages">
        {currentSession.messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            maestro={currentMaestro}
            voiceId={voiceId}
            language={bcp47}
            isLanguageCourse={isLanguageCourse}
            onPronunciationComplete={handlePronunciationComplete}
          />
        ))}
        {isTeaching && (
          <div className="maestro-typing">
            <MaestroAvatar maestro={currentMaestro} size="sm" />
            <div className="maestro-typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="maestro-input-area">
        {sttSupported && (
          <button
            className={`maestro-mic-btn ${isListening ? 'listening' : ''}`}
            onClick={handleMicToggle}
            disabled={isTeaching}
            title={isListening ? 'Stop' : 'Parla'}
          >
            {isListening ? '⏹' : '🎤'}
          </button>
        )}
        <div className="maestro-input-wrapper">
          <textarea
            ref={inputRef}
            className="maestro-input"
            value={input}
            onChange={e => {
              const val = e.target.value;
              if (val.length <= RATE_LIMITS.inputMaxChars) setInput(val);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? '🎤 Sto ascoltando...' : 'Scrivi un messaggio...'}
            disabled={isTeaching}
            rows={1}
            maxLength={RATE_LIMITS.inputMaxChars}
          />
          {input.length > RATE_LIMITS.inputMaxChars * 0.8 && (
            <span className={`char-counter ${input.length >= RATE_LIMITS.inputMaxChars ? 'char-counter--limit' : 'char-counter--warning'}`}>
              {input.length}/{RATE_LIMITS.inputMaxChars}
            </span>
          )}
        </div>
        <button
          className="maestro-send-btn"
          onClick={() => handleSend()}
          disabled={!input.trim() || isTeaching || input.length > RATE_LIMITS.inputMaxChars}
        >
          ➤
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="maestro-recording-indicator">
          <span className="recording-dot" /> Registrando... {Math.floor(recordingDuration)}s
        </div>
      )}

      {/* Verbosity Slider + Quick Responses — SEMPRE visibili */}
      <div className="maestro-interaction-bar">
        {/* Slider verbosità */}
        <div className="maestro-verbosity">
          <span className="maestro-verbosity-label" title="Regola il livello di dettaglio">
            {verbosity === 1 ? '⚡' : verbosity === 3 ? '📖' : '💬'}
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={1}
            value={verbosity}
            onChange={e => handleVerbosityChange(Number(e.target.value))}
            className="maestro-verbosity-slider"
            title={verbosity === 1 ? 'Sintetico' : verbosity === 3 ? 'Approfondito' : 'Normale'}
          />
          <span className="maestro-verbosity-text">
            {verbosity === 1 ? 'Sintesi' : verbosity === 3 ? 'Approfondisci' : 'Normale'}
          </span>
        </div>

        {/* Risposte rapide contestuali */}
        {!isTeaching && !isListening && (
          <div className="maestro-quick-responses">
            {getQuickResponses(currentSession.messages, lesson.title).map((text, i) => (
              <button
                key={i}
                className="maestro-quick-btn"
                onClick={() => handleSend(text)}
                disabled={isTeaching}
              >
                {text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}

// ── Message Bubble Component ────────────────────────────────────────

function MessageBubble({
  message,
  maestro,
  voiceId,
  language,
  isLanguageCourse,
  onPronunciationComplete,
}: {
  message: MaestroMessage;
  maestro: MaestroDefinition;
  voiceId: string;
  language: string;
  isLanguageCourse: boolean;
  onPronunciationComplete?: (phrase: string, score: number) => void;
}) {
  const isMaestro = message.role === 'maestro';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="maestro-msg maestro-msg-system">
        <div className="maestro-msg-content system">{message.content}</div>
      </div>
    );
  }

  return (
    <div className={`maestro-msg ${isMaestro ? 'maestro-msg-teacher' : 'maestro-msg-student'}`}>
      {isMaestro && (
        <MaestroAvatar maestro={maestro} size="sm" />
      )}
      <div className={`maestro-msg-content ${isMaestro ? 'teacher' : 'student'}`}>
        {formatMessage(message.content)}

        {/* Pronunciation Panel inline */}
        {isMaestro && isLanguageCourse && message.pronunciationExercise && (
          <PronunciationPanel
            phrase={message.pronunciationExercise}
            maestroVoiceId={voiceId}
            language={language}
            onComplete={(score) => onPronunciationComplete?.(message.pronunciationExercise!, score)}
          />
        )}

        {/* Audio playback for student messages */}
        {!isMaestro && message.audioRecordingId && (
          <div className="maestro-audio-player">
            <span>🎤</span>
          </div>
        )}

        {message.detectedEmotion && message.detectedEmotion !== 'focused' && isMaestro && (
          <EmotionIndicator emotion={message.detectedEmotion} />
        )}
      </div>
    </div>
  );
}

function EmotionIndicator({ emotion }: { emotion: EmotionalState }) {
  const meta = EMOTIONAL_STATE_META[emotion];
  return (
    <span className="maestro-emotion-indicator" title={meta.label}>
      {meta.icon}
    </span>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatMessage(text: string): React.ReactNode {
  // Split by markdown links, bold, and newlines
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

  // First, handle links by replacing them with placeholders
  const linkMap: { placeholder: string; label: string; url: string }[] = [];
  let processedText = text.replace(linkRegex, (_, label, url) => {
    const placeholder = `__LINK_${linkMap.length}__`;
    linkMap.push({ placeholder, label, url });
    return placeholder;
  });

  // Now split by bold and link placeholders
  const tokenRegex = /(\*\*.*?\*\*|__LINK_\d+__)/g;
  const parts = processedText.split(tokenRegex);

  return (
    <>
      {parts.map((part, i) => {
        // Bold
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        // Link placeholder
        const linkMatch = part.match(/^__LINK_(\d+)__$/);
        if (linkMatch) {
          const link = linkMap[parseInt(linkMatch[1])];
          return (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="maestro-link">
              {link.label}
            </a>
          );
        }
        // Regular text with newlines
        return part.split('\n').map((line, j) => (
          <span key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </span>
        ));
      })}
    </>
  );
}

function getQuickResponses(messages: MaestroMessage[], _lessonTitle: string): string[] {
  const msgCount = messages.length;
  const lastMsg = messages[msgCount - 1];
  const lastContent = lastMsg?.content?.toLowerCase() || '';

  // Prima interazione — risposte iniziali
  if (msgCount <= 1) {
    return [
      'Partiamo da zero!',
      'Ho già le basi, andiamo avanti',
      'Iniziamo dalla parte più importante',
      'Ho poco tempo, sintesi veloce',
    ];
  }

  // Se il maestro ha fatto una domanda
  const isQuestion = lastMsg?.role === 'maestro' && (
    lastContent.includes('?') ||
    lastContent.includes('cosa ne pensi') ||
    lastContent.includes('hai capito') ||
    lastContent.includes('è chiaro')
  );

  if (isQuestion) {
    return [
      'Sì, tutto chiaro! Avanti',
      'Puoi ripetere in modo diverso?',
      'Fammi un esempio pratico',
      'Non ho capito, spiega meglio',
    ];
  }

  // Se il maestro ha proposto un quiz
  if (lastContent.includes('quiz') || lastContent.includes('domanda')) {
    return [
      'Sono pronto, vai col quiz!',
      'Prima fammi un ripasso veloce',
      'Salta il quiz, andiamo avanti',
    ];
  }

  // Risposte generiche contestuali
  return [
    'Avanti, continua!',
    'Puoi approfondire?',
    'Fammi un esempio',
    'Prossimo argomento',
  ];
}
