/**
 * BarTalk v8 — Pronunciation Practice Panel
 * Interactive pronunciation exercise with waveform visualization and feedback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WaveformCanvas } from './WaveformCanvas';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import {
  extractWaveformData,
  generateReferenceAudio,
  createLiveAnalyser,
  type LiveAnalyser,
} from '../../lib/audioAnalyzer';
import {
  analyzePronunciation,
  getApiConfigForPronunciation,
  type PronunciationResult,
} from '../../lib/pronunciationAnalyzer';

interface PronunciationPanelProps {
  phrase: string;           // text to pronounce
  maestroVoiceId: string;  // for reference audio generation
  language: string;         // BCP-47 code
  onComplete?: (score: number) => void;
}

type Phase = 'ready' | 'listening' | 'analyzing' | 'feedback';

export function PronunciationPanel({
  phrase,
  maestroVoiceId,
  language,
  onComplete,
}: PronunciationPanelProps) {
  // Phase management
  const [phase, setPhase] = useState<Phase>('ready');
  const [attempts, setAttempts] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Audio data
  const [referenceBlob, setReferenceBlob] = useState<Blob | null>(null);
  const [referenceWaveform, setReferenceWaveform] = useState<number[]>([]);
  const [, setStudentBlob] = useState<Blob | null>(null);
  const [studentWaveform, setStudentWaveform] = useState<number[]>([]);
  const [result, setResult] = useState<PronunciationResult | null>(null);

  // Hooks
  const {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    error: recordingError,
  } = useAudioRecording();

  const {
    transcript,
    startListening,
    stopListening,
  } = useSpeechToText(language);

  // Live analyser for visualization
  const liveAnalyserRef = useRef<LiveAnalyser | null>(null);
  const [liveData, setLiveData] = useState<Uint8Array | undefined>();
  const animationFrameRef = useRef<number | null>(null);

  // Load reference audio on mount
  useEffect(() => {
    const loadReference = async () => {
      try {
        const blob = await generateReferenceAudio(phrase, maestroVoiceId);
        if (blob) {
          setReferenceBlob(blob);
          const waveform = await extractWaveformData(blob, 100);
          setReferenceWaveform(waveform);
        }
      } catch (err) {
        console.error('[PronunciationPanel] Error loading reference audio:', err);
      }
    };

    loadReference();
  }, [phrase, maestroVoiceId]);

  // Play reference audio
  const playReference = useCallback(() => {
    if (!referenceBlob) return;
    const url = URL.createObjectURL(referenceBlob);
    const audio = new Audio(url);
    audio.play().catch((err) => console.error('[PronunciationPanel] Error playing audio:', err));
  }, [referenceBlob]);

  // Start recording with live visualization
  const startPronunciation = useCallback(async () => {
    try {
      setPhase('listening');
      setAttempts((prev) => prev + 1);

      // Start recording
      await startRecording();

      // Start speech recognition
      startListening();

      // Create live analyser for visualization
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const analyser = createLiveAnalyser(stream);
        liveAnalyserRef.current = analyser;

        // Animation loop for live data
        const animate = () => {
          if (!liveAnalyserRef.current) return;
          const dataArray = new Uint8Array(liveAnalyserRef.current.analyser.frequencyBinCount);
          liveAnalyserRef.current.analyser.getByteFrequencyData(dataArray);
          setLiveData(dataArray);
          animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);
      } catch (err) {
        console.error('[PronunciationPanel] Error setting up live analyser:', err);
      }
    } catch (err) {
      console.error('[PronunciationPanel] Error starting pronunciation:', err);
      setPhase('ready');
    }
  }, [startRecording, startListening]);

  // Stop recording and analyze
  const stopPronunciation = useCallback(async () => {
    try {
      // Stop recording + speech recognition
      await stopRecording();
      stopListening();

      // Clean up live analyser
      if (liveAnalyserRef.current) {
        liveAnalyserRef.current.audioContext.close();
        liveAnalyserRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setLiveData(undefined);

      setPhase('analyzing');

      // Analisi immediata — usa il transcript disponibile
      const spokenText = transcript.trim();

      if (audioBlob) {
        setStudentBlob(audioBlob);
        const waveform = await extractWaveformData(audioBlob, 100);
        setStudentWaveform(waveform);
      }

      if (spokenText) {
        const config = getApiConfigForPronunciation();
        const analysisResult = await analyzePronunciation(
          phrase,
          spokenText,
          language,
          config.apiKey,
          config.provider,
          config.model,
        );

        setResult(analysisResult);
        const newBestScore = Math.max(bestScore, analysisResult.overallScore);
        setBestScore(newBestScore);

        // Auto-avanzamento se punteggio alto
        if (analysisResult.overallScore >= 80 && onComplete) {
          // Mostra feedback brevemente poi avanza
          setPhase('feedback');
          setTimeout(() => onComplete(newBestScore), 2500);
          return;
        }
      } else {
        setResult({
          overallScore: 0,
          wordResults: [],
          feedback: 'Non ho sentito nulla. Riprova!',
          suggestion: 'Avvicinati al microfono e parla con voce chiara.',
        });
      }

      setPhase('feedback');
    } catch (err) {
      console.error('[PronunciationPanel] Error analyzing pronunciation:', err);
      setPhase('feedback');
    }
  }, [stopRecording, stopListening, audioBlob, transcript, phrase, language, bestScore, onComplete]);

  return (
    <div className="pronunciation-panel">
      {/* Frase da pronunciare */}
      <div className="pron-phrase">{phrase}</div>

      {/* Waveform compatta */}
      <WaveformCanvas
        referenceData={referenceWaveform}
        studentData={studentWaveform}
        score={result?.overallScore || bestScore}
        isRecording={isRecording}
        liveData={liveData}
        height={80}
      />

      {/* Feedback parole — compatto, inline */}
      {result && result.wordResults.length > 0 && (
        <div className="pron-words">
          {result.wordResults.map((wordResult, idx) => (
            <span
              key={idx}
              title={`${wordResult.expectedPhonetic || ''} → ${wordResult.spokenPhonetic || ''}`}
              className={`pron-word pron-word-${wordResult.status}`}
            >
              {wordResult.word}
            </span>
          ))}
        </div>
      )}

      {/* Punteggio + feedback rapido */}
      {result && (
        <div className="pron-score-row">
          <span className={`pron-score ${result.overallScore >= 70 ? 'pron-score-good' : result.overallScore >= 40 ? 'pron-score-ok' : 'pron-score-low'}`}>
            {result.overallScore}%
          </span>
          <span className="pron-feedback">{result.feedback}</span>
        </div>
      )}

      {/* Stato analisi */}
      {phase === 'analyzing' && (
        <div className="pron-analyzing">Analisi in corso...</div>
      )}

      {/* Pulsanti azione — compatti */}
      <div className="pron-actions">
        <button onClick={playReference} disabled={!referenceBlob || isRecording} className="pron-btn pron-btn-listen" title="Ascolta pronuncia corretta">
          ▶️
        </button>

        {!isRecording ? (
          <button
            onClick={startPronunciation}
            disabled={phase === 'analyzing'}
            className="pron-btn pron-btn-record"
            title="Registra"
          >
            🎤 {phase === 'ready' && attempts === 0 ? 'Registra' : 'Riprova'}
          </button>
        ) : (
          <button onClick={stopPronunciation} className="pron-btn pron-btn-stop" title="Stop registrazione">
            ⏹️ Stop
          </button>
        )}

        {/* SKIP — sempre visibile per procedere senza completare */}
        <button
          onClick={() => onComplete?.(bestScore)}
          className="pron-btn pron-btn-skip"
          title="Salta e continua"
        >
          ⏭️ Skip
        </button>
      </div>

      {/* Errore registrazione */}
      {recordingError && (
        <div className="pron-error">{recordingError}</div>
      )}

      {/* Celebrazione veloce se >= 80% */}
      {result && result.overallScore >= 80 && (
        <div className="pron-success">🎉 Ottimo! Avanzamento automatico...</div>
      )}
    </div>
  );
}
