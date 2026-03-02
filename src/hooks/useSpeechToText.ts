import { useState, useCallback, useRef } from 'react';

interface SpeechToTextResult {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

function getSpeechRecognitionClass(): (new () => SpeechRecognitionInstance) | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Hook per Speech-to-Text con lingua dinamica.
 * @param lang - codice BCP-47 (es. 'it-IT', 'en-US', 'es-ES')
 * @param onResult - callback quando la trascrizione è completa
 */
export function useSpeechToText(lang: string = 'it-IT', onResult?: (text: string) => void): SpeechToTextResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);

  const SR = getSpeechRecognitionClass();
  const isSupported = !!SR;

  const startListening = useCallback(() => {
    const SRClass = getSpeechRecognitionClass();
    if (!SRClass || isListening) return;

    const recognition = new SRClass();
    recognition.lang = lang; // Lingua dinamica dalla configurazione
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        onResult?.(finalTranscript.trim());
      }
      recognitionRef.current = null;
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('[STT] Errore:', event.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, lang, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
