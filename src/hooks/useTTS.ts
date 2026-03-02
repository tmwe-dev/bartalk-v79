import { useCallback, useState, useEffect } from 'react';
import { useSettingsContext } from '../context/SettingsContext';
import { useAgentContext } from '../context/AgentContext';
import { enqueueTTS, stopTTS, resetTTS, pauseTTS, resumeTTS, skipTTS, getTTSState } from '../lib/tts';

export function useTTS() {
  const { ttsEnabled } = useSettingsContext();
  const { getVoiceId } = useAgentContext();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);

  // Ascolta eventi TTS per aggiornare stato React
  useEffect(() => {
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentAgent(detail?.agentName || null);
    };
    const onEnd = () => {
      const state = getTTSState();
      if (state.queueLength === 0) {
        setIsPlaying(false);
        setCurrentAgent(null);
      }
    };
    const onStop = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentAgent(null);
    };
    const onPause = () => setIsPaused(true);
    const onResume = () => setIsPaused(false);

    window.addEventListener('radio-audio-start', onStart);
    window.addEventListener('radio-audio-end', onEnd);
    window.addEventListener('radio-audio-stop', onStop);
    window.addEventListener('radio-audio-pause', onPause);
    window.addEventListener('radio-audio-resume', onResume);

    return () => {
      window.removeEventListener('radio-audio-start', onStart);
      window.removeEventListener('radio-audio-end', onEnd);
      window.removeEventListener('radio-audio-stop', onStop);
      window.removeEventListener('radio-audio-pause', onPause);
      window.removeEventListener('radio-audio-resume', onResume);
    };
  }, []);

  const speak = useCallback((text: string, agentId: string) => {
    if (!ttsEnabled) return;
    const voiceId = getVoiceId(agentId);
    enqueueTTS(text, voiceId, agentId);
  }, [ttsEnabled, getVoiceId]);

  const stop = useCallback(() => { stopTTS(); }, []);
  const reset = useCallback(() => { resetTTS(); }, []);
  const pause = useCallback(() => { pauseTTS(); }, []);
  const resume = useCallback(() => { resumeTTS(); }, []);
  const skip = useCallback(() => { skipTTS(); }, []);

  const togglePlayPause = useCallback(() => {
    if (isPaused) resumeTTS();
    else if (isPlaying) pauseTTS();
  }, [isPlaying, isPaused]);

  return { speak, stop, reset, pause, resume, skip, togglePlayPause, ttsEnabled, isPlaying, isPaused, currentAgent };
}
