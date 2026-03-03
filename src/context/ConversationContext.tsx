import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import type { Message } from '../types/conversation';
import { generateId, now, truncate } from '../lib/utils';
import * as storage from '../lib/storage';
import type { ConversationMeta } from '../lib/storage';

interface ConversationContextValue {
  conversationId: string;
  conversationTitle: string;
  messages: Message[];
  turnIndex: number;
  isWaiting: boolean;
  activeTurnId: string | null;
  conversationList: ConversationMeta[];
  sidebarOpen: boolean;
  addMessage: (msg: Omit<Message, 'id' | 'createdAt' | 'conversationId'>) => Message;
  setWaiting: (waiting: boolean) => void;
  incrementTurn: () => void;
  newConversation: () => void;
  startTurn: () => string;
  clearMessages: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversationId, setConversationId] = useState(() => {
    const saved = storage.getCurrentConversationId();
    return saved || generateId();
  });
  const [conversationTitle, setConversationTitle] = useState('Nuova conversazione');
  const [messages, setMessages] = useState<Message[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isWaiting, setWaiting] = useState(false);
  const [conversationList, setConversationList] = useState<ConversationMeta[]>(() => storage.loadConversationList());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeTurnRef = useRef<string | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const isInitRef = useRef(false);
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  // Load messages on init
  useEffect(() => {
    if (isInitRef.current) return;
    isInitRef.current = true;
    const savedMessages = storage.loadConversationMessages(conversationId) as Message[];
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
      // Find title from list
      const meta = conversationList.find(c => c.id === conversationId);
      if (meta) {
        setConversationTitle(meta.title);
        setTurnIndex(meta.turnIndex);
      }
    }
    storage.setCurrentConversationId(conversationId);
  }, []);

  // Auto-save messages
  useEffect(() => {
    if (!isInitRef.current) return;
    if (messages.length === 0) return;
    storage.saveConversationMessages(conversationId, messages);

    // Update conversation list metadata
    const firstHuman = messages.find(m => m.senderType === 'human');
    const title = firstHuman ? truncate(firstHuman.content, 50) : 'Nuova conversazione';
    const lastMsg = messages[messages.length - 1];

    setConversationTitle(title);

    setConversationList(prev => {
      const existing = prev.findIndex(c => c.id === conversationId);
      const meta: ConversationMeta = {
        id: conversationId,
        title,
        turnIndex,
        createdAt: existing >= 0 ? prev[existing].createdAt : (messages[0]?.createdAt || now()),
        updatedAt: now(),
        messageCount: messages.length,
        lastMessage: lastMsg ? truncate(lastMsg.content, 80) : undefined,
      };

      let newList;
      if (existing >= 0) {
        newList = [...prev];
        newList[existing] = meta;
      } else {
        newList = [meta, ...prev];
      }
      storage.saveConversationList(newList);
      return newList;
    });
  }, [messages, conversationId, turnIndex]);

  const addMessage = useCallback((partial: Omit<Message, 'id' | 'createdAt' | 'conversationId'>): Message => {
    const msg: Message = {
      ...partial,
      id: generateId(),
      conversationId: conversationIdRef.current,
      createdAt: now(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

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
    const newId = generateId();
    setConversationId(newId);
    setMessages([]);
    setTurnIndex(0);
    setWaiting(false);
    setConversationTitle('Nuova conversazione');
    activeTurnRef.current = null;
    setActiveTurnId(null);
    storage.setCurrentConversationId(newId);
  }, []);

  const loadConversation = useCallback((id: string) => {
    const savedMessages = storage.loadConversationMessages(id) as Message[];
    setConversationId(id);
    setMessages(savedMessages);
    const meta = conversationList.find(c => c.id === id);
    if (meta) {
      setConversationTitle(meta.title);
      setTurnIndex(meta.turnIndex);
    }
    setWaiting(false);
    activeTurnRef.current = null;
    setActiveTurnId(null);
    storage.setCurrentConversationId(id);
    setSidebarOpen(false);
  }, [conversationList]);

  const deleteConversation = useCallback((id: string) => {
    storage.deleteConversationData(id);
    setConversationList(prev => {
      const newList = prev.filter(c => c.id !== id);
      storage.saveConversationList(newList);
      return newList;
    });
    // If deleting current conversation, create new
    if (id === conversationId) {
      newConversation();
    }
  }, [conversationId, newConversation]);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversationList(prev => {
      const newList = prev.map(c => c.id === id ? { ...c, title } : c);
      storage.saveConversationList(newList);
      return newList;
    });
    if (id === conversationId) {
      setConversationTitle(title);
    }
  }, [conversationId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTurnIndex(0);
  }, []);

  return (
    <ConversationContext.Provider value={{
      conversationId,
      conversationTitle,
      messages,
      turnIndex,
      isWaiting,
      activeTurnId,
      conversationList,
      sidebarOpen,
      addMessage,
      setWaiting,
      incrementTurn,
      newConversation,
      startTurn,
      clearMessages,
      loadConversation,
      deleteConversation,
      renameConversation,
      setSidebarOpen,
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
