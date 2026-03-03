import { useCallback } from 'react';
import { useConversationContext } from '../context/ConversationContext';
import { useSettingsContext } from '../context/SettingsContext';
import { useAgentContext } from '../context/AgentContext';
import { useUIContext } from '../context/UIContext';
import { useTaskContext } from '../context/TaskContext';
import { orchestrate } from '../lib/orchestrator';
import { enqueueTTS } from '../lib/tts';
import { handleCommand } from '../lib/commands';
import type { AgentResponse } from '../types/orchestrator';

export function useOrchestrator() {
  const { messages, turnIndex, addMessage, setWaiting, incrementTurn, startTurn, conversationId } =
    useConversationContext();
  const { conversationMode, turnStrategy, ttsEnabled, language, temperature, maxTokens, wordRange } =
    useSettingsContext();
  const { enabledAgents, getVoiceId } = useAgentContext();
  const { openSettings } = useUIContext();
  const { getTaskPromptContext } = useTaskContext();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Controlla comandi slash
    if (text.trim().startsWith('/')) {
      const cmd = handleCommand(text);
      if (cmd.handled) {
        addMessage({
          senderType: 'human',
          senderName: 'Tu',
          content: text,
        });
        if (cmd.systemMessage) {
          addMessage({
            senderType: 'system',
            senderName: 'Sistema',
            content: cmd.systemMessage,
          });
        }
        if (text.trim().toLowerCase() === '/keys') {
          openSettings();
        }
        return;
      }
    }

    if (enabledAgents.length === 0) return;

    // Aggiungi messaggio utente
    addMessage({
      senderType: 'human',
      senderName: 'Tu',
      content: text,
    });

    setWaiting(true);
    const turnId = startTurn();

    try {
      await orchestrate(
        {
          conversationId,
          userMessage: text,
          messages,
          turnIndex,
          mode: conversationMode,
          turnStrategy,
          enabledAgents,
          language,
          temperature,
          maxTokens,
          wordRange,
          ttsEnabled,
          taskContext: (agentId: string) => getTaskPromptContext(agentId),
        },
        // Callback: ogni risposta agente arriva in tempo reale
        (response: AgentResponse) => {
          addMessage({
            senderType: 'assistant',
            senderName: response.agentName,
            content: response.content,
            turnId,
            provider: response.provider,
            tokensIn: response.tokensIn,
            tokensOut: response.tokensOut,
            duration: response.duration,
            isDemo: response.isDemo || false,
            isError: !!response.error,
          });

          // TTS: accoda la risposta
          if (ttsEnabled && !response.isDemo && !response.error) {
            const agent = enabledAgents.find(a => a.name === response.agentName);
            if (agent) {
              const voiceId = getVoiceId(agent.id);
              enqueueTTS(response.content, voiceId, response.agentName);
            }
          }
        },
      );

      incrementTurn();
    } catch (err) {
      console.error('[useOrchestrator] Errore:', err);
      addMessage({
        senderType: 'system',
        senderName: 'Sistema',
        content: `Errore nell'orchestratore: ${(err as Error).message}`,
      });
    } finally {
      setWaiting(false);
    }
  }, [
    enabledAgents, messages, turnIndex, conversationMode, turnStrategy,
    ttsEnabled, language, temperature, maxTokens, wordRange,
    conversationId, addMessage, setWaiting, startTurn,
    incrementTurn, getVoiceId, openSettings, getTaskPromptContext,
  ]);

  return { sendMessage };
}
