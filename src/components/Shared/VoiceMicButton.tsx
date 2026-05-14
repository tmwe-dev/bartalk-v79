/**
 * RadioChat v8 — VoiceMicButton
 * Pulsante microfono riutilizzabile per qualsiasi campo di testo.
 *
 * Usa useSpeechToText con la lingua dinamica dell'app.
 * Quando l'utente parla, il testo viene passato al setter via onTranscript.
 * Al termine del riconoscimento, il testo finale viene inviato via onResult.
 *
 * Uso:
 *   <VoiceMicButton onTranscript={setText} onResult={(text) => setText(text)} />
 */

import { useEffect, useCallback } from 'react';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { useSettingsContext } from '../../context/SettingsContext';
import { getLangConfig } from '../../types/settings';

interface VoiceMicButtonProps {
  /** Chiamato in tempo reale con il transcript (interim + final) */
  onTranscript: (text: string) => void;
  /** Chiamato quando il riconoscimento termina con il testo finale */
  onResult?: (text: string) => void;
  /** Disabilita il pulsante */
  disabled?: boolean;
  /** Classe CSS aggiuntiva */
  className?: string;
  /** Dimensione: 'sm' per inline accanto a input, 'md' per standalone */
  size?: 'sm' | 'md';
}

export function VoiceMicButton({
  onTranscript,
  onResult,
  disabled = false,
  className = '',
  size = 'sm',
}: VoiceMicButtonProps) {
  const { language } = useSettingsContext();
  const langConfig = getLangConfig(language);

  const handleResult = useCallback(
    (text: string) => {
      onResult?.(text);
    },
    [onResult],
  );

  const { isListening, isSupported, transcript, toggleListening, clearTranscript } =
    useSpeechToText(langConfig.bcp47, handleResult);

  // Aggiorna il testo in tempo reale
  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  const handleClick = useCallback(() => {
    if (isListening) {
      toggleListening();
    } else {
      clearTranscript();
      toggleListening();
    }
  }, [isListening, toggleListening, clearTranscript]);

  if (!isSupported) return null;

  const title = isListening ? langConfig.ui.stopRecording : langConfig.ui.speak;

  return (
    <button
      type="button"
      className={`voice-mic-btn voice-mic-btn--${size} ${isListening ? 'voice-mic-btn--active' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {isListening ? '⏹' : '🎤'}
    </button>
  );
}
