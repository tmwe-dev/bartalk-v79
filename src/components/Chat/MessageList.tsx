import { useEffect, useRef } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { MessageBubble } from './MessageBubble';

export function MessageList() {
  const { messages } = useConversationContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll verso il basso quando arrivano nuovi messaggi
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <div className="empty-state">
          <h3>Benvenuto in BarTalk!</h3>
          <p>Scrivi un messaggio per iniziare una conversazione con gli agenti AI.</p>
          <p className="empty-hint">Premi <kbd>Ctrl</kbd>+<kbd>K</kbd> per configurare le chiavi API</p>
        </div>
      </div>
    );
  }

  // Filter out demo/error null messages
  const visibleMessages = messages.filter(msg =>
    !msg.isDemo && !msg.isError
  );

  return (
    <div className="message-list">
      {visibleMessages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
