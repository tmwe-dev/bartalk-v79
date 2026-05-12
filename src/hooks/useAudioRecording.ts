import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAudioRecordingResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  audioBlob: Blob | null;
  duration: number;
  audioUrl: string | null;
  error: string | null;
}

/**
 * Hook for recording audio using the MediaRecorder API
 * Supports WebM with Opus codec (fallback to WebM)
 * Tracks recording duration and provides blob + objectURL for playback
 */
export function useAudioRecording(): UseAudioRecordingResult {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      setDuration(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine MIME type with fallback
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);

        // Revoke old URL if it exists
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      // Start duration timer
      let seconds = 0;
      durationIntervalRef.current = setInterval(() => {
        seconds += 1;
        setDuration(seconds);
      }, 1000);

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      console.error('[AudioRecording] Error starting recording:', err);
    }
  }, [audioUrl]);

  const stopRecording = useCallback(async () => {
    try {
      setError(null);

      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        // Clear duration timer
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      console.error('[AudioRecording] Error stopping recording:', err);
    }
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    duration,
    audioUrl,
    error,
  };
}
