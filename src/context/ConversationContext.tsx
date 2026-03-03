/**
 * BarTalk v8 — ConversationContext
 * Dual-layer persistence: Supabase DB (autenticato) + localStorage (skip mode).
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import type { Message } from '../types/conversation';
import { generateId, now, truncate } from '../lib/utils';
import { useAuthContext } from './AuthContext';
import { useSettingsContext } from './SettingsContext';
import * as storage from '../lib/storage';
import * as dbAPI from '../lib/supabaseAPI';
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
  const { authState } = useAuthContext();
  const { workspaceId } = useSettingsContext();

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

  // ── Helper: è in modalità DB? ──
  const isDBMode = authState === 'authenticated' && !!workspaceId;

  // ── Init: carica messaggi dalla fonte corretta ──
  useEffect(() => {
    if (isInitRef.current) return;
    isInitRef.current = true;

    const loadInit = async () => {
      if (isDBMode) {
        try {
          const dbConvs = await dbAPI.loadConversations(workspaceId!);
          if (dbConvs.length > 0) {
            const metaList: ConversationMeta[] = dbConvs.map(c => ({
              id: c.id,
              title: c.title,
              turnIndex: c.turn_index,
              createdAt: c.created_at,
              updatedAt: c.updated_at,
              messageCount: 0,
            }));
            setConversationList(metaList);

            const firstConv = dbConvs[0];
            const dbMsgs = await dbAPI.loadMessages(firstConv.id);
            if (dbMsgs.length > 0) {
              setConversationId(firstConv.id);
              setConversationTitle(firstConv.title);
              setTurnIndex(firstConv.turn_index);
              setMessages(dbMsgs.map(m => ({
                id: m.id,
                conversationId: m.conversation_id,
                senderType: m.sender_type,
                senderName: m.agent_name || (m.sender_type === 'human' ? 'Tu' : 'Sistema'),
                provider: m.provider || undefined,
                content: m.content,
                tokensIn: m.tokens_in,
                tokensOut: m.tokens_out,
                duration: m.duration_ms,
                isDemo: m.is_demo,
                createdAt: m.created_at,
              })));
            }
          }
        } catch (err) {
          console.warn('[conversation] DB load fallback to localStorage:', err);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      const savedMessages = storage.loadConversationMessages(conversationId) as Message[];
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
        const meta = conversationList.find(c => c.id === conversationId);
        if (meta) {
          setConversationTitle(meta.title);
          setTurnIndex(meta.turnIndex);
        }
      }
      storage.setCurrentConversationId(conversationId);
    };

    loadInit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save messaggi ──
  useEffect(() => {
    if (!isInitRef.current) return;
    if (messages.length === 0) return;

    // Salva sempre in localStorage (cache rapida)
    storage.saveConversationMessages(conversationId, messages);

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

    // Se autenticato, salva anche in DB
    if (isDBMode) {
      dbAPI.saveConversation(workspaceId!, {
        id: conversationId,
        title,
        turn_index: turnIndex,
      }).catch(err => console.warn('[conversation] DB save error:', err));
    }
  }, [messages, conversationId, turnIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── addMessage ──
  const addMessage = useCallback((partial: Omit<Message, 'id' | 'createdAt' | 'conversationId'>): Message => {
    const msg: Message = {
      ...partial,
      id: generateId(),
      conversationId: conversationIdRef.current,
      createdAt: now(),
    };
    setMessages(prev => [...prev, msg]);

    // Salva in DB in background
    if (isDBMode) {
      dbAPI.saveMessage(conversationIdRef.current, {
        conversation_id: conversationIdRef.current,
        sender_type: msg.senderType,
        agent_name: msg.senderName || null,
        provider: msg.provider || null,
        content: msg.content,
        tokens_in: msg.tokensIn || 0,
        tokens_out: msg.tokensOut || 0,
        duration_ms: msg.duration || 0,
        is_demo: msg.isDemo || false,
        metadata: {},
      }).catch(err => console.warn('[conversation] DB message save error:', err));
    }

    return msg;
  }, [isDBMode]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const loadConversation = useCallback(async (id: string) => {
    let loadedMessages: Message[] = [];

    if (isDBMode) {
      try {
        const dbMsgs = await dbAPI.loadMessages(id);
        loadedMessages = dbMsgs.map(m => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderType: m.sender_type,
          agentName: m.agent_name || undefined,
          provider: m.provider || undefined,
          content: m.content,
          tokensIn: m.tokens_in,
          tokensOut: m.tokens_out,
          duration: m.duration_ms,
          isDemo: m.is_demo,
          createdAt: m.created_at,
        }));
      } catch {
        loadedMessages = storage.loadConversationMessages(id) as Message[];
      }
    } else {
      loadedMessages = storage.loadConversationMessages(id) as Message[];
    }

    setConversationId(id);
    setMessages(loadedMessages);
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
  }, [conversationList, isDBMode]);

  const deleteConversation = useCallback((id: string) => {
    storage.deleteConversationData(id);
    setConversationList(prev => {
      const newList = prev.filter(c => c.id !== id);
      storage.saveConversationList(newList);
      return newList;
    });

    if (isDBMode) {
      dbAPI.deleteConversation(id)
        .catch(err => console.warn('[conversation] DB delete error:', err));
    }

    if (id === conversationId) {
      newConversation();
    }
  }, [conversationId, newConversation, isDBMode]);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversationList(prev => {
      const newList = prev.map(c => c.id === id ? { ...c, title } : c);
      storage.saveConversationList(newList);
      return newList;
    });
    if (id === conversationId) {
      setConversationTitle(title);
    }

    if (isDBMode) {
      dbAPI.saveConversation(workspaceId!, {
        id, title, turn_index: turnIndex,
      }).catch(err => console.warn('[conversation] DB rename error:', err));
    }
  }, [conversationId, isDBMode, workspaceId, turnIndex]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTurnIndex(0);
  }, []);

  return (
    <ConversationContext.Provider value={{
      conversationId, conversationTitle, messages, turnIndex,
      isWaiting, activeTurnId, conversationList, sidebarOpen,
      addMessage, setWaiting, incrementTurn, newConversation,
      startTurn, clearMessages, loadConversation,
      deleteConversation, renameConversation, setSidebarOpen,
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
