import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { APIKeyEntry, AppSettings, AppLanguage } from '../types/settings';
import type { ConversationMode, TurnStrategy } from '../types/conversation';
import * as storage from '../lib/storage';
import { ORCHESTRATOR } from '../lib/constants';

interface SettingsContextValue {
  apiKeys: APIKeyEntry[];
  conversationMode: ConversationMode;
  turnStrategy: TurnStrategy;
  ttsEnabled: boolean;
  language: AppLanguage;
  temperature: number;
  maxTokens: number;
  wordRange: [number, number];
  setAPIKey: (provider: string, apiKey: string, model?: string) => void;
  removeAPIKey: (provider: string) => void;
  getAPIKey: (provider: string) => string | null;
  setConversationMode: (mode: ConversationMode) => void;
  setTurnStrategy: (strategy: TurnStrategy) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setLanguage: (lang: AppLanguage) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setWordRange: (range: [number, number]) => void;
  saveAll: () => void;
}

const ConText = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<APIKeyEntry[]>(() => storage.loadAPIKeys());
  const [conversationMode, setConversationMode] = useState<ConversationMode>('consultation');
  const [turnStrategy, setTurnStrategy] = useState<TurnStrategy>('round_robin');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [language, setLanguage] = useState<AppLanguage>('it');
  const [temperature, setTemperature] = useState<number>(ORCHESTRATOR.defaultTemperature as number);
  const [maxTokens, setMaxTokens] = useState<number>(ORCHESTRATOR.maxTokens as number);
  const [wordRange, setWordRange] = useState<[number, number]>([...ORCHESTRATOR.wordRange]);
  const isInitRef = useRef(false);

  // Carica impostazioni salvate
  useEffect(() => {
    const saved = storage.loadSettings<Partial<AppSettings>>({});
    if (saved.conversationMode) setConversationMode(saved.conversationMode);
    if (saved.turnStrategy) setTurnStrategy(saved.turnStrategy);
    if (saved.ttsEnabled !== undefined) setTtsEnabled(saved.ttsEnabled);
    if (saved.language) setLanguage(saved.language);
    if (saved.temperature !== undefined) setTemperature(saved.temperature);
    if (saved.maxTokens !== undefined) setMaxTokens(saved.maxTokens);
    if (saved.wordRange) setWordRange(saved.wordRange);
    // Marca init completato dopo il prossimo render
    setTimeout(() => { isInitRef.current = true; }, 0);
  }, []);

  // ── AUTO-SAVE: salva ogni volta che cambia una preferenza ──
  useEffect(() => {
    if (!isInitRef.current) return; // Non salvare durante il caricamento iniziale
    storage.saveSettings({
      conversationMode,
      turnStrategy,
      ttsEnabled,
      language,
      temperature,
      maxTokens,
      wordRange,
    });
  }, [conversationMode, turnStrategy, ttsEnabled, language, temperature, maxTokens, wordRange]);

  // Auto-save API keys
  useEffect(() => {
    if (!isInitRef.current) return;
    storage.saveAPIKeys(apiKeys);
  }, [apiKeys]);

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
  }, []);

  const getAPIKeyValue = useCallback((provider: string): string | null => {
    const entry = apiKeys.find(k => k.provider === provider);
    return entry?.apiKey || null;
  }, [apiKeys]);

  // saveAll resta per compatibilità ma non è più necessario
  const saveAll = useCallback(() => {
    storage.saveAPIKeys(apiKeys);
    storage.saveSettings({
      conversationMode,
      turnStrategy,
      ttsEnabled,
      language,
      temperature,
      maxTokens,
      wordRange,
    });
  }, [apiKeys, conversationMode, turnStrategy, ttsEnabled, language, temperature, maxTokens, wordRange]);

  return (
    <ConText.Provider value={{
      apiKeys,
      conversationMode,
      turnStrategy,
      ttsEnabled,
      language,
      temperature,
      maxTokens,
      wordRange,
      setAPIKey,
      removeAPIKey,
      getAPIKey: getAPIKeyValue,
      setConversationMode,
      setTurnStrategy,
      setTtsEnabled,
      setLanguage,
      setTemperature,
      setMaxTokens,
      setWordRange,
      saveAll,
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
