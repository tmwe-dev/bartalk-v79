import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { getLangConfig } from '../../types/settings';

export function InputBox() {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isWaiting } = useConversationContext();
  const { language } = useSettingsContext();
  const { sendMessage } = useOrchestrator();

  // Ottieni configurazione lingua corrente
  const langConfig = getLangConfig(language);

  const handleSend = useCallback(() => {
    const msg = text.trim();
    if (!msg || isWaiting) return;
    setText('');
    sendMessage(msg);
    inputRef.current?.focus();
  }, [text, isWaiting, sendMessage]);

  // Speech-to-Text con lingua dinamica
  const { isListening, isSupported, transcript, toggleListening, clearTranscript } =
    useSpeechToText(langConfig.bcp47);

  // Aggiorna il testo con il transcript in tempo reale
  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      toggleListening();
    } else {
      clearTranscript();
      setText('');
      toggleListening();
    }
  }, [isListening, toggleListening, clearTranscript]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Placeholder dinamico per lingua
  const placeholder = isListening
    ? langConfig.ui.listening
    : isWaiting
      ? langConfig.ui.waiting
      : langConfig.ui.placeholder;

  const micTitle = !isSupported
    ? langConfig.ui.micUnsupported
    : isListening
      ? langConfig.ui.stopRecording
      : langConfig.ui.speak;

  return (
    <div className="input-box">
      <button
        className={`mic-button ${isListening ? 'mic-active' : ''}`}
        onClick={handleMicClick}
        disabled={isWaiting || !isSupported}
        title={micTitle}
      >
        {isListening ? '⏹' : '🎤'}
      </button>
      <textarea
        ref={inputRef}
        className="input-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isWaiting}
        rows={1}
      />
      <button
        className="send-button"
        onClick={handleSend}
        disabled={isWaiting || !text.trim()}
      >
        {isWaiting ? '⏳' : '➤'}
      </button>
    </div>
  );
}
