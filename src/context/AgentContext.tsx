import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AgentConfig } from '../types/agents';
import type { VoiceConfig } from '../types/settings';
import { AGENTS } from '../lib/agents';
import * as storage from '../lib/storage';

interface AgentContextValue {
  agents: AgentConfig[];
  excludedAgents: string[];
  customVoices: VoiceConfig;
  enabledAgents: AgentConfig[];
  toggleAgent: (agentId: string) => void;
  isAgentEnabled: (agentId: string) => boolean;
  setCustomVoice: (agentId: string, voiceId: string) => void;
  resetVoice: (agentId: string) => void;
  getVoiceId: (agentId: string) => string;
  saveAll: () => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [excludedAgents, setExcluded] = useState<string[]>(() => storage.loadExcludedAgents());
  const [customVoices, setCustomVoices] = useState<VoiceConfig>(() => storage.loadCustomVoices());

  const enabledAgents = AGENTS.filter(a => !excludedAgents.includes(a.id));

  const toggleAgent = useCallback((agentId: string) => {
    setExcluded(prev => {
      const next = prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId];
      storage.saveExcludedAgents(next);
      return next;
    });
  }, []);

  const isAgentEnabled = useCallback((agentId: string) => {
    return !excludedAgents.includes(agentId);
  }, [excludedAgents]);

  const setCustomVoice = useCallback((agentId: string, voiceId: string) => {
    setCustomVoices(prev => {
      const next = { ...prev, [agentId]: voiceId };
      storage.saveCustomVoices(next);
      return next;
    });
  }, []);

  const resetVoice = useCallback((agentId: string) => {
    setCustomVoices(prev => {
      const next = { ...prev };
      delete next[agentId];
      storage.saveCustomVoices(next);
      return next;
    });
  }, []);

  const getVoiceId = useCallback((agentId: string): string => {
    if (customVoices[agentId]) return customVoices[agentId];
    const agent = AGENTS.find(a => a.id === agentId);
    return agent?.defaultVoiceId || '';
  }, [customVoices]);

  const saveAll = useCallback(() => {
    storage.saveExcludedAgents(excludedAgents);
    storage.saveCustomVoices(customVoices);
  }, [excludedAgents, customVoices]);

  return (
    <AgentContext.Provider value={{
      agents: AGENTS,
      excludedAgents,
      customVoices,
      enabledAgents,
      toggleAgent,
      isAgentEnabled,
      setCustomVoice,
      resetVoice,
      getVoiceId,
      saveAll,
    }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgentContext deve essere usato dentro AgentProvider');
  return ctx;
}
