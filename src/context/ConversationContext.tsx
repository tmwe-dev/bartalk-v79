import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Message } from '../types/conversation';
import { generateId, now } from '../lib/utils';

interface ConversationContextValue {
  conversationId: string;
  messages: Message[];
  turnIndex: number;
  isWaiting: boolean;
  activeTurnId: string | null;
  addMessage: (msg: Omit<Message, 'id' | 'createdAt' | 'conversationId'>) => Message;
  setWaiting: (waiting: boolean) => void;
  incrementTurn: () => void;
  newConversation: () => void;
  startTurn: () => string; // Ritorna il turnId
  clearMessages: () => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversationId, setConversationId] = useState(() => generateId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isWaiting, setWaiting] = useState(false);
  const activeTurnRef = useRef<string | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);

  const addMessage = useCallback((partial: Omit<Message, 'id' | 'createdAt' | 'conversationId'>): Message => {
    const msg: Message = {
      ...partial,
      id: generateId(),
      conversationId,
      createdAt: now(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, [conversationId]);

  const incrementTurn = useCallback(() => {
    setTurnIndex(prev => prev + 1);
  }, []);

  const startTurn = useCallback((): string => {
    const turnId = generateId();
    activeTurnRef.current = turnId;
    setActiveTurnId(turnId);
    return turnId;
  }, []);

  const newConversation = useCallback(() => {
    setConversationId(generateId());
    setMessages([]);
    setTurnIndex(0);
    setWaiting(false);
    activeTurnRef.current = null;
    setActiveTurnId(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTurnIndex(0);
  }, []);

  return (
    <ConversationContext.Provider value={{
      conversationId,
      messages,
      turnIndex,
      isWaiting,
      activeTurnId,
      addMessage,
      setWaiting,
      incrementTurn,
      newConversation,
      startTurn,
      clearMessages,
    }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationContext() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error('useConversationContext deve essere usato dentro ConversationProvider');
  return ctx;
}
