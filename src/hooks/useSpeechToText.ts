import { useState, useCallback, useRef } from 'react';

interface SpeechToTextResult {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string; confidence: number } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionClass(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Minimum confidence threshold — below this value the result is noise */
const MIN_CONFIDENCE = 0.25;
/** Milliseconds of silence (no new onresult) before auto-stop */
const SILENCE_TIMEOUT_MS = 2500;

/**
 * Hook for Speech-to-Text with dynamic language, confidence tracking,
 * automatic silence timeout, and background noise filtering.
 *
 * The silence timeout solves the problem of `continuous: true` where the browser
 * never calls `onend` if there is ambient noise — after SILENCE_TIMEOUT_MS
 * without new meaningful results, recognition is closed and the accumulated
 * text is sent via onResult.
 *
 * @param lang - BCP-47 code (e.g. 'it-IT', 'en-US', 'es-ES')
 * @param onResult - callback when transcription is complete
 */
export function useSpeechToText(lang: string = 'it-IT', onResult?: (text: string, confidence: number) => void): SpeechToTextResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  const confidenceScoresRef = useRef<number[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SR = getSpeechRecognitionClass();
  const isSupported = !!SR;

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    const SRClass = getSpeechRecognitionClass();
    if (!SRClass || isListening) return;

    const recognition = new SRClass();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';
    let hasMeaningfulResult = false;
    confidenceScoresRef.current = [];

    // ── Silence timeout: auto-stop if no meaningful result for N seconds ──
    const resetSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        // If there's accumulated text, close recognition -> onend -> onResult
        if (recognitionRef.current && hasMeaningfulResult) {
          recognitionRef.current.stop();
        }
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string; confidence: number } } } }) => {
      let interim = '';
      let hasNewContent = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const conf = result[0].confidence || 0;

        if (result.isFinal) {
          // Filter results with too low confidence (background noise)
          if (conf >= MIN_CONFIDENCE || conf === 0) {
            // conf === 0 -> browser doesn't provide confidence, accept it
            finalTranscript += result[0].transcript + ' ';
            confidenceScoresRef.current.push(conf);
            hasNewContent = true;
            hasMeaningfulResult = true;
          }
        } else {
          // Interim: always show (user sees what the browser is understanding)
          interim += result[0].transcript;
          hasNewContent = true;
        }
      }

      // Update UI
      const avgConfidence = confidenceScoresRef.current.length > 0
        ? confidenceScoresRef.current.reduce((a, b) => a + b, 0) / confidenceScoresRef.current.length
        : 0;

      setTranscript(finalTranscript + interim);
      setConfidence(avgConfidence);

      // Reset silence timer — user is still speaking
      if (hasNewContent) {
        resetSilenceTimer();
      }
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      const finalConfidence = confidenceScoresRef.current.length > 0
        ? confidenceScoresRef.current.reduce((a, b) => a + b, 0) / confidenceScoresRef.current.length
        : 0;

      if (finalTranscript.trim()) {
        onResult?.(finalTranscript.trim(), finalConfidence);
      }
      recognitionRef.current = null;
    };

    recognition.onerror = (event: { error: string }) => {
      // 'no-speech' and 'aborted' are normal — not real errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('[STT] Error:', event.error);
      }
      clearSilenceTimer();
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);

    // Start first silence timer — if user doesn't speak within N seconds, close
    resetSilenceTimer();
  }, [isListening, lang, onResult, clearSilenceTimer]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [clearSilenceTimer]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    confidenceScoresRef.current = [];
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    confidence,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
