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
import * as keysAPI from '../lib/keysAPI';
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

        // Carica info chiavi dal vault server-side
        // Il frontend NON riceve mai le chiavi in chiaro — solo i provider salvati.
        // Il proxy legge le chiavi direttamente dal DB quando serve.
        const vaultKeys = await keysAPI.listVaultKeys();
        if (cancelled) return;

        if (vaultKeys.length > 0) {
          // Merge: chiavi vault (marker server-side) + chiavi localStorage (legacy/skip)
          const localKeys = storage.loadAPIKeys();
          const mergedKeys: APIKeyEntry[] = [];

          for (const vk of vaultKeys) {
            // Chiave nel vault: preserva la chiave reale in localStorage se esiste,
            // altrimenti usa placeholder (il proxy leggerà dal vault server-side)
            const localMatch = localKeys.find(lk => lk.provider === vk.provider);
            const hasRealLocalKey = localMatch?.apiKey && localMatch.apiKey !== '••••••••';
            mergedKeys.push({
              provider: vk.provider as APIKeyEntry['provider'],
              apiKey: hasRealLocalKey ? localMatch.apiKey : '••••••••',
              model: vk.model || localMatch?.model || undefined,
            });
          }
          // Aggiungi chiavi solo in localStorage (non ancora nel vault)
          for (const lk of localKeys) {
            if (!mergedKeys.find(mk => mk.provider === lk.provider)) {
              mergedKeys.push(lk);
            }
          }
          setApiKeys(mergedKeys);
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
  // Le chiavi vengono salvate singolarmente via setAPIKey/removeAPIKey.
  // L'auto-save qui aggiorna solo localStorage come cache.
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

    // Se autenticato, salva nel vault server-side (criptata AES-256-GCM)
    if (authState === 'authenticated' && apiKey) {
      keysAPI.saveVaultKey(provider, apiKey, model)
        .then(res => {
          if (!res.success) console.warn('[settings] Vault save error:', res.error);
        })
        .catch(err => console.warn('[settings] Vault save error:', err));
    }
  }, [authState]);

  const removeAPIKey = useCallback((provider: string) => {
    setApiKeys(prev => prev.filter(k => k.provider !== provider));

    // Se autenticato, rimuovi dal vault server-side
    if (authState === 'authenticated') {
      keysAPI.deleteVaultKey(provider)
        .catch(err => console.warn('[settings] Vault delete error:', err));
    }
  }, [authState]);

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
