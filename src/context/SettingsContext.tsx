import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { APIKeyEntry, AppSettings } from '../types/settings';
import type { ConversationMode, TurnStrategy } from '../types/conversation';
import * as storage from '../lib/storage';

interface SettingsContextValue {
  apiKeys: APIKeyEntry[];
  conversationMode: ConversationMode;
  turnStrategy: TurnStrategy;
  ttsEnabled: boolean;
  setAPIKey: (provider: string, apiKey: string, model?: string) => void;
  removeAPIKey: (provider: string) => void;
  getAPIKey: (provider: string) => string | null;
  setConversationMode: (mode: ConversationMode) => void;
  setTurnStrategy: (strategy: TurnStrategy) => void;
  setTtsEnabled: (enabled: boolean) => void;
  saveAll: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<APIKeyEntry[]>(() => storage.loadAPIKeys());
  const [conversationMode, setConversationMode] = useState<ConversationMode>('consultation');
  const [turnStrategy, setTurnStrategy] = useState<TurnStrategy>('round_robin');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Carica impostazioni salvate
  useEffect(() => {
    const saved = storage.loadSettings<Partial<AppSettings>>({});
    if (saved.conversationMode) setConversationMode(saved.conversationMode);
    if (saved.turnStrategy) setTurnStrategy(saved.turnStrategy);
    if (saved.ttsEnabled !== undefined) setTtsEnabled(saved.ttsEnabled);
  }, []);

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

  const saveAll = useCallback(() => {
    storage.saveAPIKeys(apiKeys);
    storage.saveSettings({
      conversationMode,
      turnStrategy,
      ttsEnabled,
    });
  }, [apiKeys, conversationMode, turnStrategy, ttsEnabled]);

  return (
    <SettingsContext.Provider value={{
      apiKeys,
      conversationMode,
      turnStrategy,
      ttsEnabled,
      setAPIKey,
      removeAPIKey,
      getAPIKey: getAPIKeyValue,
      setConversationMode,
      setTurnStrategy,
      setTtsEnabled,
      saveAll,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext deve essere usato dentro SettingsProvider');
  return ctx;
}
