/**
 * BarTalk v8 — useVAD (Voice Activity Detection)
 * Automatically detects when the user is speaking and when they stop.
 * Uses Web Audio API AnalyserNode to monitor volume in real-time.
 *
 * Flow:
 * 1. Microphone always active (MediaStream)
 * 2. Real-time volume analysis via AnalyserNode
 * 3. When volume exceeds threshold -> "speaking"
 * 4. When silence lasts > silenceTimeout -> "silent" -> onSpeechEnd callback
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseVADOptions {
  /** Volume threshold to consider "speaking" (0-255, default 25) */
  threshold?: number;
  /** Milliseconds of silence before considering speech ended (default 1500) */
  silenceTimeout?: number;
  /** Callback when the user finishes speaking */
  onSpeechEnd?: () => void;
  /** Callback when the user starts speaking */
  onSpeechStart?: () => void;
  /** Whether VAD is enabled */
  enabled?: boolean;
}

export interface UseVADResult {
  /** Whether the user is speaking */
  isSpeaking: boolean;
  /** Current volume normalized 0-1 */
  volume: number;
  /** Whether the microphone is active */
  isActive: boolean;
  /** Start VAD (requires microphone permission) */
  start: () => Promise<void>;
  /** Stop VAD */
  stop: () => void;
  /** Error if any */
  error: string | null;
  /** MediaStream for reuse (e.g. recording) */
  stream: MediaStream | null;
}

export function useVAD(options: UseVADOptions = {}): UseVADResult {
  const {
    threshold = 25,
    silenceTimeout = 1500,
    onSpeechEnd,
    onSpeechStart,
    enabled = true,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Stable callback refs
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onSpeechStartRef = useRef(onSpeechStart);
  onSpeechEndRef.current = onSpeechEnd;
  onSpeechStartRef.current = onSpeechStart;

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setStream(null);
    setIsActive(false);
    setIsSpeaking(false);
    setVolume(0);
    isSpeakingRef.current = false;
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return;
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;

        setVolume(Math.min(1, avg / 128));

        if (avg > threshold) {
          // Speaking
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
            onSpeechStartRef.current?.();
          }
          // Reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else {
          // Silence
          if (isSpeakingRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              setIsSpeaking(false);
              silenceTimerRef.current = null;
              onSpeechEndRef.current?.();
            }, silenceTimeout);
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      setIsActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone error');
    }
  }, [enabled, threshold, silenceTimeout, cleanup]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { isSpeaking, volume, isActive, start, stop, error, stream };
}
