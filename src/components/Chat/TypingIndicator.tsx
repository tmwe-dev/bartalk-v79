import { useConversationContext } from '../../context/ConversationContext';

export function TypingIndicator() {
  const { isWaiting } = useConversationContext();

  if (!isWaiting) return null;

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
      <span className="typing-text">Gli agenti stanno pensando...</span>
    </div>
  );
}
