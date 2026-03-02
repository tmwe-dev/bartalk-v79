import { useCallback } from 'react';
import { useConversationContext } from '../context/ConversationContext';
import { useSettingsContext } from '../context/SettingsContext';
import { useAgentContext } from '../context/AgentContext';
import { orchestrate } from '../lib/orchestrator';
import { enqueueTTS } from '../lib/tts';
import type { AgentResponse } from '../types/orchestrator';

export function useOrchestrator() {
  const { messages, turnIndex, addMessage, setWaiting, incrementTurn, startTurn, conversationId } =
    useConversationContext();
  const { conversationMode, turnStrategy, ttsEnabled } = useSettingsContext();
  const { enabledAgents, getVoiceId } = useAgentContext();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || enabledAgents.length === 0) return;

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
    ttsEnabled, conversationId, addMessage, setWaiting, startTurn,
    incrementTurn, getVoiceId,
  ]);

  return { sendMessage };
}
