import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { UI } from '../../lib/constants';

export function InputBox() {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isWaiting } = useConversationContext();
  const { sendMessage } = useOrchestrator();

  const handleSend = useCallback(() => {
    const msg = text.trim();
    if (!msg || isWaiting) return;
    setText('');
    sendMessage(msg);
    inputRef.current?.focus();
  }, [text, isWaiting, sendMessage]);

  // Speech-to-Text: quando finisce di ascoltare, inserisci il testo
  const { isListening, isSupported, transcript, toggleListening, clearTranscript } = useSpeechToText();

  // Aggiorna il testo con il transcript in tempo reale
  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      // Stop: il testo è già nel campo, l'utente può inviarlo
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

  return (
    <div className="input-box">
      {isSupported && (
        <button
          className={`mic-button ${isListening ? 'mic-active' : ''}`}
          onClick={handleMicClick}
          disabled={isWaiting}
          title={isListening ? 'Ferma registrazione' : 'Parla'}
        >
          {isListening ? '⏹' : '🎤'}
        </button>
      )}
      <textarea
        ref={inputRef}
        className="input-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? 'Sto ascoltando...' : isWaiting ? 'Gli agenti stanno rispondendo...' : UI.placeholder}
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
