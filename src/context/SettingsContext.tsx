/**
 * BarTalk v8 — SettingsContext
 * Dual-layer persistence: Supabase DB (autenticato) + localStorage (skip mode).
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { APIKeyEntry, AppSettings, AppLanguage } from '../types/settings';
import type { ConversationMode, TurnStrategy } from '../types/conversation';
import { useAuthContext } from './AuthContext';
import * as storage from '../lib/storage';
import * as dbAPI from '../lib/supabaseAPI';
import { ORCHESTRATOR } from '../lib/constants';

interface SettingsContextValue {
  apiKeys: APIKeyEntry[];
  conversationMode: ConversationMode;
  turnStrategy: TurnStrategy;
  ttsEnabled: boolean;
  autoRun: boolean;
  language: AppLanguage;
  temperature: number;
  maxTokens: number;
  wordRange: [number, number];
  workspaceId: string | null;
  setAPIKey: (provider: string, apiKey: string, model?: string) => void;
  removeAPIKey: (provider: string) => void;
  getAPIKey: (provider: string) => string | null;
  setConversationMode: (mode: ConversationMode) => void;
  setTurnStrategy: (strategy: TurnStrategy) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setAutoRun: (enabled: boolean) => void;
  setLanguage: (lang: AppLanguage) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setWordRange: (range: [number, number]) => void;
  saveAll: () => void;
}

const ConText = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, authState } = useAuthContext();

  const [apiKeys, setApiKeys] = useState<APIKeyEntry[]>(() => storage.loadAPIKeys());
  const [conversationMode, setConversationMode] = useState<ConversationMode>('consultation');
  const [turnStrategy, setTurnStrategy] = useState<TurnStrategy>('round_robin');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [autoRun, setAutoRun] = useState(true);
  const [language, setLanguage] = useState<AppLanguage>('it');
  const [temperature, setTemperature] = useState<number>(ORCHESTRATOR.defaultTemperature as number);
  const [maxTokens, setMaxTokens] = useState<number>(ORCHESTRATOR.maxTokens as number);
  const [wordRange, setWordRange] = useState<[number, number]>([...ORCHESTRATOR.wordRange]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const isInitRef = useRef(false);
  const dbLoadedRef = useRef(false);

  // ── Caricamento iniziale: localStorage (sempre, per velocità) ──
  useEffect(() => {
    const saved = storage.loadSettings<Partial<AppSettings>>({});
    if (saved.conversationMode) setConversationMode(saved.conversationMode);
    if (saved.turnStrategy) setTurnStrategy(saved.turnStrategy);
    if (saved.ttsEnabled !== undefined) setTtsEnabled(saved.ttsEnabled);
    if (saved.autoRun !== undefined) setAutoRun(saved.autoRun);
    if (saved.language) setLanguage(saved.language);
    if (saved.temperature !== undefined) setTemperature(saved.temperature);
    if (saved.maxTokens !== undefined) setMaxTokens(saved.maxTokens);
    if (saved.wordRange) setWordRange(saved.wordRange);
    setTimeout(() => { isInitRef.current = true; }, 0);
  }, []);

  // ── Se autenticato: carica da DB e sovrascrive localStorage ──
  useEffect(() => {
    if (authState !== 'authenticated' || !user) {
      setWorkspaceId(null);
      dbLoadedRef.current = false;
      return;
    }

    let cancelled = false;

    const loadFromDB = async () => {
      try {
        const ws = await dbAPI.getWorkspace(user.id);
        if (cancelled || !ws) return;
        setWorkspaceId(ws.id);

        // Carica settings
        const dbSettings = await dbAPI.loadSettings(ws.id);
        if (cancelled) return;

        if (dbSettings) {
          setConversationMode(dbSettings.conversation_mode);
          setTurnStrategy(dbSettings.turn_strategy);
          setTtsEnabled(dbSettings.tts_enabled);
          setAutoRun(dbSettings.auto_run);
          setLanguage(dbSettings.language);
          setTemperature(dbSettings.temperature);
          setMaxTokens(dbSettings.max_tokens);
          setWordRange(dbSettings.word_range);
        }

        // Carica API keys
        const dbKeys = await dbAPI.loadAPIKeys(ws.id);
        if (cancelled) return;

        if (dbKeys.length > 0) {
          setApiKeys(dbKeys.map(k => ({
            provider: k.provider as APIKeyEntry['provider'],
            apiKey: k.encrypted_key, // TODO: decrypt quando implementiamo encryption
            model: k.model || undefined,
          })));
        }

        dbLoadedRef.current = true;
      } catch (err) {
        console.error('[settings] Errore caricamento DB, uso localStorage:', err);
      }
    };

    loadFromDB();
    return () => { cancelled = true; };
  }, [authState, user]);

  // ── AUTO-SAVE preferenze ──
  useEffect(() => {
    if (!isInitRef.current) return;

    const settingsData = {
      conversationMode,
      turnStrategy,
      ttsEnabled,
      autoRun,
      language,
      temperature,
      maxTokens,
      wordRange,
    };

    // Salva sempre in localStorage (cache locale)
    storage.saveSettings(settingsData);

    // Se autenticato e DB caricato, salva anche in DB
    if (authState === 'authenticated' && workspaceId && dbLoadedRef.current) {
      dbAPI.saveSettings(workspaceId, {
        conversation_mode: conversationMode,
        turn_strategy: turnStrategy,
        tts_enabled: ttsEnabled,
        auto_run: autoRun,
        language,
        temperature,
        max_tokens: maxTokens,
        word_range: wordRange,
      }).catch(err => console.warn('[settings] DB save error:', err));
    }
  }, [conversationMode, turnStrategy, ttsEnabled, autoRun, language, temperature, maxTokens, wordRange, authState, workspaceId]);

  // ── AUTO-SAVE API keys ──
  useEffect(() => {
    if (!isInitRef.current) return;

    // Salva sempre in localStorage
    storage.saveAPIKeys(apiKeys);

    // Se autenticato, salva in DB
    if (authState === 'authenticated' && workspaceId && dbLoadedRef.current) {
      for (const key of apiKeys) {
        dbAPI.saveAPIKey(workspaceId, key.provider, key.apiKey, key.model)
          .catch(err => console.warn('[settings] DB key save error:', err));
      }
    }
  }, [apiKeys, authState, workspaceId]);

  const setAPIKey = useCallback((provider: string, apiKey: string, model?: string) => {
    setApiKeys(prev => {
      const filtered = prev.filter(k => k.provider !== provider);
      if (apiKey) {
        filtered.push({ provider: provider as APIKeyEntry['provider'], apiKey, model });
      }
      return filtered;
    });
  }, []);

  const removeAPIKey = useCallback((provider: string) => {
    setApiKeys(prev => prev.filter(k => k.provider !== provider));
    // Se autenticato, rimuovi anche da DB
    if (authState === 'authenticated' && workspaceId) {
      dbAPI.deleteAPIKey(workspaceId, provider)
        .catch(err => console.warn('[settings] DB key delete error:', err));
    }
  }, [authState, workspaceId]);

  const getAPIKeyValue = useCallback((provider: string): string | null => {
    const entry = apiKeys.find(k => k.provider === provider);
    return entry?.apiKey || null;
  }, [apiKeys]);

  const saveAll = useCallback(() => {
    storage.saveAPIKeys(apiKeys);
    storage.saveSettings({
      conversationMode, turnStrategy, ttsEnabled, autoRun,
      language, temperature, maxTokens, wordRange,
    });
  }, [apiKeys, conversationMode, turnStrategy, ttsEnabled, autoRun, language, temperature, maxTokens, wordRange]);

  return (
    <ConText.Provider value={{
      apiKeys, conversationMode, turnStrategy, ttsEnabled, autoRun,
      language, temperature, maxTokens, wordRange, workspaceId,
      setAPIKey, removeAPIKey, getAPIKey: getAPIKeyValue,
      setConversationMode, setTurnStrategy, setTtsEnabled, setAutoRun,
      setLanguage, setTemperature, setMaxTokens, setWordRange, saveAll,
    }}>
      {children}
    </ConText.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(ConText);
  if (!ctx) throw new Error('useSettingsContext deve essere usato dentro SettingsProvider');
  return ctx;
}
