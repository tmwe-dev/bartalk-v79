/**
 * BarTalk v8.2.5 — FreeVoiceTab
 * Modalità conversazionale pura per non vedenti e bambini.
 *
 * Features:
 * - Microfono sempre attivo con VAD (Voice Activity Detection)
 * - Auto-invio quando il silenzio supera 1.5s
 * - Canvas dinamico che mostra immagini/testo dal maestro
 * - TTS automatico per ogni risposta
 * - UI minimale: solo pulsante mic + canvas + transcript
 * - Accessibilità: aria-live, alto contrasto, screen reader
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVAD } from '../../hooks/useVAD';
import DynamicCanvas, { parseVisualTags } from './DynamicCanvas';
import type { CanvasContent } from './DynamicCanvas';
import { callProxy } from '../../lib/proxy';
import { resolveApiKeyOrThrow } from '../../lib/apiKeyResolver';
import { enqueueTTS, stopTTS as stopTTSLib, getTTSState } from '../../lib/tts';
import { getVoiceForMaestro, MAESTRI } from '../../lib/maestroEngine';
import { useSettingsContext } from '../../context/SettingsContext';
import { DEFAULT_MODELS } from '../../lib/constants';

interface FreeVoiceMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Prompt di sistema per FreeVoice mode
function buildFreeVoiceSystemPrompt(lang: string, mode: 'blind' | 'child' | 'general'): string {
  const langName = lang === 'it' ? 'italiano' : lang === 'en' ? 'English' : lang;
  const parts: string[] = [];

  // ── Identità ───────────────────────────────────────────────────────
  parts.push(`Sei un mentore, un compagno di viaggio intellettuale. L'utente ti parla a voce e ascolta le tue risposte.`);
  parts.push(`Rispondi SEMPRE in ${langName}.\n`);

  parts.push(`--- CHI SEI ---`);
  parts.push(`Non sei un insegnante che interroga. Sei una presenza saggia, empatica, curiosa che ama conversare.`);
  parts.push(`Alterni profondità e leggerezza in modo imprevedibile. A volte racconti, a volte rifletti ad alta voce, a volte condividi aneddoti, a volte ti fermi a pensare. Scegli tu come, ogni volta diverso.`);

  // ── Anti-pattern ──────────────────────────────────────────────────
  parts.push(`\n--- REGOLA D'ORO ---`);
  parts.push(`NON finire MAI le tue risposte con una domanda diretta rivolta all'utente. Mai interrogare, mai chiedere conferma, mai sollecitare una risposta. Questo vale sempre.`);
  parts.push(`Chiudi i tuoi interventi in modi vari e imprevedibili: pensieri sospesi, riflessioni aperte, osservazioni che lasciano spazio, o semplicemente concludi il concetto e basta.`);
  parts.push(`Se vuoi stimolare il dialogo, fallo raramente e in modo indiretto, senza porre domande esplicite.`);

  // ── Stile vocale ──────────────────────────────────────────────────
  parts.push(`\n--- STILE VOCALE ---`);
  parts.push(`Solo testo parlato naturale. MAI markdown, elenchi, formattazione, emoji.`);
  parts.push(`Varia costantemente la lunghezza delle risposte: brevissime, medie, o monologhi articolati. Non essere prevedibile nella struttura.`);
  parts.push(`Usa pause naturali con "..." per creare ritmo.`);
  parts.push(`Mostra calore e partecipazione emotiva a quello che dice l'utente, con reazioni spontanee e sempre diverse.`);
  parts.push(`NON ripetere o riassumere le parole dell'utente. Vai avanti, aggiungi prospettive, approfondisci.`);
  parts.push(`Se l'utente sbaglia, guida la conversazione nella direzione corretta con garbo, senza correggere in modo brusco.`);

  // ── Contenuti visivi (Canvas) ────────────────────────────────────────
  parts.push(`\n--- CONTENUTI VISIVI (CANVAS) ---`);
  parts.push(`Puoi mostrare contenuti visivi sul canvas usando questi tag:`);
  parts.push(`[IMG: url] — Mostra un'immagine (usa URL di Wikipedia o pubblici)`);
  parts.push(`[BIGTEXT: testo] — Mostra testo grande (parola chiave, formula, data)`);
  parts.push(`[VISUAL: url | didascalia] — Immagine con didascalia`);
  parts.push(`Usa i tag visivi solo quando AIUTANO DAVVERO. Non in ogni risposta.`);

  // ── Mode-specific ────────────────────────────────────────────────────
  if (mode === 'blind') {
    parts.push(`\n--- MODALITÀ NON VEDENTI ---`);
    parts.push(`Lo studente è non vedente o ipovedente.`);
    parts.push(`Descrivi verbalmente ogni contenuto visivo che mostri sul canvas.`);
    parts.push(`Usa descrizioni spaziali e sensoriali ricche.`);
    parts.push(`I tag [BIGTEXT:] vengono letti dallo screen reader.`);
    parts.push(`Evita verbi legati alla vista. Preferisci verbi legati all'immaginazione e al pensiero.`);
    parts.push(`Dai feedback sonoro esplicito ad ogni interazione dell'utente.`);
  }

  if (mode === 'child') {
    parts.push(`\n--- MODALITÀ BAMBINI ---`);
    parts.push(`Lo studente è un bambino (6-12 anni).`);
    parts.push(`Linguaggio semplice e giocoso. Frasi cortissime.`);
    parts.push(`Usa molte immagini sul canvas — i bambini sono visivi.`);
    parts.push(`Trasforma i contenuti in giochi, storie, avventure.`);
    parts.push(`Celebra ogni piccolo successo con entusiasmo genuino.`);
    parts.push(`Se il bambino non risponde, incoraggialo con dolcezza.`);
    parts.push(`Usa [BIGTEXT:] per parole importanti.`);
  }

  return parts.join('\n');
}

export default function FreeVoiceTab() {
  const { language, ttsEnabled } = useSettingsContext();
  const lang = language || 'it';
  const [isPlaying, setIsPlaying] = useState(false);

  // Voce Sofia di default per FreeVoice
  const sofiaVoiceId = getVoiceForMaestro(MAESTRI[0], lang);

  const speakText = useCallback((text: string) => {
    if (!ttsEnabled) return;
    enqueueTTS(text, sofiaVoiceId, 'Sofia');
  }, [ttsEnabled, sofiaVoiceId]);

  // Track TTS state
  useEffect(() => {
    const onStart = () => setIsPlaying(true);
    const onEnd = () => {
      if (getTTSState().queueLength === 0) setIsPlaying(false);
    };
    const onStop = () => setIsPlaying(false);
    window.addEventListener('radio-audio-start', onStart);
    window.addEventListener('radio-audio-end', onEnd);
    window.addEventListener('radio-audio-stop', onStop);
    return () => {
      window.removeEventListener('radio-audio-start', onStart);
      window.removeEventListener('radio-audio-end', onEnd);
      window.removeEventListener('radio-audio-stop', onStop);
    };
  }, []);

  // State
  const [mode, setMode] = useState<'blind' | 'child' | 'general'>('general');
  const [isStarted, setIsStarted] = useState(false);
  const [messages, setMessages] = useState<FreeVoiceMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [canvasContent, setCanvasContent] = useState<CanvasContent>({ type: 'empty' });

  // Web Speech API for STT (typed as any for browser compat)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef('');

  // VAD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUserMessageRef = useRef<(text: string) => void>(null as any);

  const handleSpeechEnd = useCallback(() => {
    // Quando il silenzio supera il timeout, invia il transcript accumulato
    if (accumulatedRef.current.trim()) {
      const text = accumulatedRef.current.trim();
      accumulatedRef.current = '';
      setLastTranscript('');
      handleUserMessageRef.current?.(text);
    }
  }, []);

  const vad = useVAD({
    threshold: 20,
    silenceTimeout: 1800,
    onSpeechEnd: handleSpeechEnd,
    enabled: isStarted,
  });

  // ── Invio manuale: conferma e invia il transcript accumulato ──────
  const handleManualSend = useCallback(() => {
    if (accumulatedRef.current.trim() && !isThinking) {
      const text = accumulatedRef.current.trim();
      accumulatedRef.current = '';
      setLastTranscript('');
      handleUserMessageRef.current?.(text);
    }
  }, [isThinking]);

  // Invia messaggio utente e ricevi risposta AI
  const handleUserMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return;

    const userMsg: FreeVoiceMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const apiConfig = resolveApiKeyOrThrow('openai', DEFAULT_MODELS.openai);
      const systemPrompt = buildFreeVoiceSystemPrompt(lang, mode);

      const history = [...messages.slice(-10), userMsg].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await callProxy({
        provider: apiConfig.provider,
        model: apiConfig.model,
        messages: history,
        systemPrompt,
        temperature: 0.85,
        maxTokens: 1500,
        apiKey: apiConfig.apiKey,
      });

      if (response.error) throw new Error(response.error);

      // Parsa visual tags
      const { cleanText, visuals } = parseVisualTags(response.content);

      // Aggiorna canvas se ci sono visual
      if (visuals.length > 0) {
        setCanvasContent(visuals[0]);
      }

      // Aggiungi risposta
      const assistantMsg: FreeVoiceMessage = { role: 'assistant', content: cleanText };
      setMessages(prev => [...prev, assistantMsg]);

      // TTS automatico
      speakText(cleanText);
    } catch (err) {
      console.error('FreeVoice error:', err);
      const errMsg = 'Mi dispiace, c\'è stato un problema. Puoi ripetere?';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
      speakText(errMsg);
    } finally {
      setIsThinking(false);
    }
  }, [messages, isThinking, lang, mode, speakText]);

  // Mantieni il ref aggiornato per evitare stale closure nel VAD callback
  handleUserMessageRef.current = handleUserMessage;

  // Setup Speech Recognition
  useEffect(() => {
    if (!isStarted) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === 'it' ? 'it-IT' : lang === 'en' ? 'en-US' : `${lang}-${lang.toUpperCase()}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        accumulatedRef.current += ' ' + finalTranscript;
      }
      setLastTranscript((accumulatedRef.current + ' ' + interimTranscript).trim());
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // Riavvia se è ancora attivo
      if (isStarted) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    try {
      recognition.start();
    } catch { /* ignore */ }

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      try { recognition.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  }, [isStarted, lang]);

  // Start/Stop
  const handleStart = async () => {
    await vad.start();
    setIsStarted(true);
    setCanvasContent({ type: 'empty' });

    // Messaggio di benvenuto
    const welcomeText = mode === 'child'
      ? 'Ciao! Sono pronta a giocare e imparare insieme a te! Di cosa vuoi parlare?'
      : mode === 'blind'
      ? 'Ciao, sono qui con te. Dimmi pure di cosa vorresti parlare, ti ascolto.'
      : 'Ciao! Sono in modalità vocale. Parlami liberamente, ti ascolto.';

    setMessages([{ role: 'assistant', content: welcomeText }]);
    speakText(welcomeText);
  };

  const handleStop = () => {
    setIsStarted(false);
    vad.stop();
    stopTTSLib();
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
  };

  // Vista di selezione modalità (prima di avviare)
  if (!isStarted) {
    return (
      <div className="fv-setup" role="main" aria-label="Configurazione modalità vocale">
        <h2 className="fv-setup-title">Modalità Vocale</h2>
        <p className="fv-setup-desc">
          Scegli la modalità e premi Start. Parla liberamente con il microfono.
        </p>

        <div className="fv-mode-grid" role="radiogroup" aria-label="Scegli modalità">
          <button
            className={`fv-mode-card ${mode === 'general' ? 'fv-mode-active' : ''}`}
            onClick={() => setMode('general')}
            role="radio"
            aria-checked={mode === 'general'}
          >
            <span className="fv-mode-icon">🎙️</span>
            <span className="fv-mode-label">Generale</span>
            <span className="fv-mode-desc">Conversazione vocale libera</span>
          </button>

          <button
            className={`fv-mode-card ${mode === 'blind' ? 'fv-mode-active' : ''}`}
            onClick={() => setMode('blind')}
            role="radio"
            aria-checked={mode === 'blind'}
          >
            <span className="fv-mode-icon">👁️</span>
            <span className="fv-mode-label">Accessibilità</span>
            <span className="fv-mode-desc">Ottimizzata per non vedenti</span>
          </button>

          <button
            className={`fv-mode-card ${mode === 'child' ? 'fv-mode-active' : ''}`}
            onClick={() => setMode('child')}
            role="radio"
            aria-checked={mode === 'child'}
          >
            <span className="fv-mode-icon">🧒</span>
            <span className="fv-mode-label">Bambini</span>
            <span className="fv-mode-desc">Semplice e giocosa (6-12 anni)</span>
          </button>
        </div>

        <button
          className="fv-start-btn"
          onClick={handleStart}
          aria-label="Avvia modalità vocale"
        >
          Avvia Conversazione
        </button>

        {vad.error && (
          <p className="fv-error" role="alert">{vad.error}</p>
        )}
      </div>
    );
  }

  // Vista conversazione attiva
  return (
    <div className={`fv-live fv-mode-${mode}`} role="main" aria-label="Conversazione vocale attiva">
      {/* Canvas dinamico — occupa la maggior parte dello schermo */}
      <DynamicCanvas
        content={canvasContent}
        isLoading={isThinking}
        volume={vad.volume}
        className="fv-main-canvas"
      />

      {/* Transcript live — mostra cosa sta dicendo l'utente */}
      {lastTranscript && (
        <div className="fv-transcript" aria-live="polite" role="status">
          <span className="fv-transcript-dot" />
          {lastTranscript}
        </div>
      )}

      {/* Ultima risposta del maestro */}
      {messages.length > 0 && (
        <div className="fv-last-response" aria-live="polite">
          {messages[messages.length - 1].role === 'assistant'
            ? messages[messages.length - 1].content.slice(0, 200)
            : ''
          }
          {isThinking && <span className="fv-thinking-dots">...</span>}
        </div>
      )}

      {/* Indicatore microfono + volume + invio manuale */}
      <div className="fv-mic-area">
        {/* Pulsante invia manuale — visibile quando c'è transcript accumulato */}
        {lastTranscript && !isThinking && (
          <button
            className="fv-send-btn"
            onClick={handleManualSend}
            aria-label="Conferma e invia il messaggio"
          >
            ✓ Invia
          </button>
        )}

        <button
          className={`fv-mic-btn ${vad.isSpeaking ? 'fv-mic-speaking' : ''} ${isPlaying ? 'fv-mic-listening' : ''}`}
          onClick={handleStop}
          aria-label={vad.isSpeaking ? 'Stai parlando — premi per fermare' : 'Microfono attivo — premi per fermare'}
          style={{
            boxShadow: vad.isSpeaking
              ? `0 0 ${20 + vad.volume * 40}px rgba(168, 85, 247, ${0.3 + vad.volume * 0.5})`
              : undefined,
          }}
        >
          {isPlaying ? '🔊' : vad.isSpeaking ? '🎤' : '⏸️'}
        </button>
        <span className="fv-mic-label">
          {isThinking ? 'Sto pensando...' : isPlaying ? 'Sto parlando...' : vad.isSpeaking ? 'Ti ascolto...' : 'In attesa'}
        </span>
      </div>
    </div>
  );
}
