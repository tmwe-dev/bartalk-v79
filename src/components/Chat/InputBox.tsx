import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { getLangConfig } from '../../types/settings';
import { FileUpload, type ParsedFile } from './FileUpload';

export function InputBox() {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<ParsedFile[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isWaiting } = useConversationContext();
  const { language } = useSettingsContext();
  const { sendMessage } = useOrchestrator();

  // Ottieni configurazione lingua corrente
  const langConfig = getLangConfig(language);

  const handleFilesParsed = useCallback((files: ParsedFile[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  }, []);

  const handleSend = useCallback(() => {
    const msg = text.trim();
    if ((!msg && attachedFiles.length === 0) || isWaiting) return;

    // Se ci sono file allegati, includi il loro contenuto nel messaggio
    let fullMessage = msg;
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map(f =>
        `--- File: ${f.name} ---\n${f.content}`
      ).join('\n\n');
      fullMessage = fullMessage
        ? `${fullMessage}\n\n[File allegati]\n${fileContext}`
        : `[File allegati]\n${fileContext}`;
      setAttachedFiles([]);
    }

    setText('');
    sendMessage(fullMessage);
    inputRef.current?.focus();
  }, [text, attachedFiles, isWaiting, sendMessage]);

  // Speech-to-Text con lingua dinamica
  const { isListening, isSupported, transcript, toggleListening, clearTranscript } =
    useSpeechToText(langConfig.bcp47);

  // Aggiorna il testo con il transcript in tempo reale
  useEffect(() => {
    if (transcript) {
      queueMicrotask(() => setText(transcript));
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
    <div className="input-box-wrapper">
      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="input-attached-files">
          {attachedFiles.map((f, i) => (
            <div key={`${f.name}-${i}`} className="input-attached-file">
              <span>{f.type.startsWith('image/') ? '🖼️' : '📄'} {f.name}</span>
              <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="input-box">
        <FileUpload onFilesParsed={handleFilesParsed} disabled={isWaiting} compact />
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
          disabled={isWaiting || (!text.trim() && attachedFiles.length === 0)}
        >
          {isWaiting ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}
