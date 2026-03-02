import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { useOrchestrator } from '../../hooks/useOrchestrator';
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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="input-box">
      <textarea
        ref={inputRef}
        className="input-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isWaiting ? 'Gli agenti stanno rispondendo...' : UI.placeholder}
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
