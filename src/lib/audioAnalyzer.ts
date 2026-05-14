/**
 * @module audioAnalyzer
 * Web Audio API waveform analyzer for real-time audio visualization.
 * Creates and manages AnalyserNode instances connected to audio sources,
 * providing frequency and time-domain data for visual waveform rendering.
 */

import { getAPIKey } from './storage';
import { TTS } from './constants';

// ── Waveform extraction ──────────────────────────────────────────────

/**
 * Extract waveform amplitude data from an audio blob.
 * Uses Web Audio API to decode and downsample to a fixed number of points.
 *
 * @param audioBlob - The audio blob to analyze
 * @param sampleCount - Target number of waveform points (default 100)
 * @returns Array of normalized amplitudes (0-1)
 */
export async function extractWaveformData(
  audioBlob: Blob,
  sampleCount: number = 100,
): Promise<number[]> {
  try {
    // Validate inputs
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Audio blob is empty or invalid');
    }

    if (sampleCount < 1) {
      throw new Error('Sample count must be at least 1');
    }

    // Create AudioContext
    const AudioContextConstructor = window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext;
    const audioContext = new AudioContextConstructor();

    // Convert blob to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get channel 0 (mono or left channel)
    const channelData = audioBuffer.getChannelData(0);

    // Calculate bucket size for downsampling
    const bucketSize = Math.ceil(channelData.length / sampleCount);

    // Downsample: take max absolute amplitude in each bucket
    const waveformData: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const startIdx = i * bucketSize;
      const endIdx = Math.min(startIdx + bucketSize, channelData.length);

      let maxAmplitude = 0;
      for (let j = startIdx; j < endIdx; j++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[j]));
      }

      waveformData.push(maxAmplitude);
    }

    // Normalize to 0-1 range
    const maxValue = Math.max(...waveformData, 0.001); // Avoid division by zero
    const normalizedData = waveformData.map((v) => v / maxValue);

    // Close AudioContext
    audioContext.close();

    return normalizedData;
  } catch (err) {
    console.error('[audioAnalyzer] Error extracting waveform:', err);
    throw err;
  }
}

// ── Reference audio generation ───────────────────────────────────────

/**
 * Generate reference audio for a phrase using ElevenLabs TTS API directly.
 * Returns the audio blob for waveform comparison.
 *
 * @param text - The text to synthesize
 * @param voiceId - ElevenLabs voice ID
 * @returns Audio blob or null on error
 */
export async function generateReferenceAudio(
  text: string,
  voiceId: string,
): Promise<Blob | null> {
  try {
    // Validate inputs
    if (!text || !text.trim()) {
      console.warn('[audioAnalyzer] Empty text provided for TTS');
      return null;
    }

    if (!voiceId || !voiceId.trim()) {
      console.warn('[audioAnalyzer] No voice ID provided');
      return null;
    }

    // Get ElevenLabs API key from localStorage
    const apiKey = getAPIKey('elevenlabs');
    if (!apiKey) {
      console.warn('[audioAnalyzer] ElevenLabs API key not configured');
      return null;
    }

    // Call ElevenLabs TTS endpoint using constants
    const url = `${TTS.apiBase}/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: TTS.stability,
          similarity_boost: TTS.similarityBoost,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[audioAnalyzer] ElevenLabs error:', response.status, errorText);
      return null;
    }

    // Return response as blob
    const blob = await response.blob();
    return blob;
  } catch (err) {
    console.error('[audioAnalyzer] Error generating reference audio:', err);
    return null;
  }
}

// ── Real-time audio visualization ────────────────────────────────────

/**
 * Real-time audio analyser for live waveform visualization.
 */
export interface LiveAnalyser {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  audioContext: AudioContext;
}

/**
 * Create a real-time audio analyser node from a MediaStream.
 * Used for live microphone visualization during pronunciation recording.
 *
 * @param stream - MediaStream from getUserMedia
 * @returns Object containing analyser, dataArray, and audioContext
 */
export function createLiveAnalyser(stream: MediaStream): LiveAnalyser {
  try {
    // Validate input
    if (!stream || !stream.active) {
      throw new Error('Invalid or inactive MediaStream');
    }

    // Create AudioContext
    const AudioContextConstructor = window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext;
    const audioContext = new AudioContextConstructor();

    // Create source from stream
    const source = audioContext.createMediaStreamSource(stream);

    // Create AnalyserNode with fftSize 256
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    // Connect source → analyser
    source.connect(analyser);

    // Create data array for frequency data
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    return { analyser, dataArray, audioContext };
  } catch (err) {
    console.error('[audioAnalyzer] Error creating live analyser:', err);
    throw err;
  }
}
