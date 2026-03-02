import { useCallback } from 'react';
import { useSettingsContext } from '../context/SettingsContext';
import { useAgentContext } from '../context/AgentContext';
import { enqueueTTS, stopTTS, resetTTS } from '../lib/tts';

export function useTTS() {
  const { ttsEnabled } = useSettingsContext();
  const { getVoiceId } = useAgentContext();

  const speak = useCallback((text: string, agentId: string) => {
    if (!ttsEnabled) return;
    const voiceId = getVoiceId(agentId);
    enqueueTTS(text, voiceId, agentId);
  }, [ttsEnabled, getVoiceId]);

  const stop = useCallback(() => {
    stopTTS();
  }, []);

  const reset = useCallback(() => {
    resetTTS();
  }, []);

  return { speak, stop, reset, ttsEnabled };
}
