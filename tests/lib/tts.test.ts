/**
 * Tests for src/lib/tts.ts — TTS queue management and parseL2Segments
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock before import
vi.mock('../../src/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
vi.mock('../../src/lib/proxy', () => ({
  callProxy: vi.fn().mockResolvedValue({ content: '', tokensIn: 0, tokensOut: 0, duration: 0 }),
}));
vi.mock('../../src/lib/constants', () => ({
  TTS: {
    apiBase: 'https://api.elevenlabs.io/v1',
    model: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true,
    chunkMaxChars: 500,
    maxChars: 5000,
  },
  RATE_LIMITS: {
    ttsMaxCharsPerItem: 3000,
  },
}));
vi.mock('../../src/lib/storage', () => ({
  loadSettings: vi.fn(() => ({ language: 'it' })),
  isInSkipMode: vi.fn(() => false),
  getAPIKey: vi.fn(() => ''),
}));
vi.mock('../../src/lib/authToken', () => ({
  getAuthToken: vi.fn(() => null),
}));
vi.mock('../../src/lib/utils', () => ({
  stripHtml: vi.fn((s: string) => s),
  truncate: vi.fn((s: string) => s),
}));
vi.mock('../../src/lib/ttsPreprocessor', () => ({
  preprocessForTTS: vi.fn((s: string) => s),
}));
vi.mock('../../src/lib/rateLimiter', () => ({
  ttsLimiter: {
    canProceed: vi.fn(() => true),
    recordRequest: vi.fn(),
  },
}));
vi.mock('../../src/lib/usageTracker', () => ({
  recordTTSUsage: vi.fn(),
}));
vi.mock('../../src/lib/skipModeQuota', () => ({
  incrementTTSUsage: vi.fn(),
  isQuotaExceeded: vi.fn(() => ({ exceeded: false })),
}));

// Mock getLangConfig
vi.mock('../../src/types/settings', () => ({
  getLangConfig: vi.fn(() => ({ bcp47: 'it-IT', name: 'Italiano' })),
}));

// Mock browser APIs
const mockDispatchEvent = vi.fn();
const mockSpeechSynthesis = { cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), speak: vi.fn() };
Object.defineProperty(window, 'dispatchEvent', { value: mockDispatchEvent, writable: true });
Object.defineProperty(window, 'speechSynthesis', { value: mockSpeechSynthesis, writable: true });
Object.defineProperty(window, 'AudioContext', { value: vi.fn(), writable: true });

// Stub document event listeners so the module-level code doesn't break
vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});

import {
  parseL2Segments,
  getTTSState,
  stopTTS,
  resetTTS,
  pauseTTS,
  resumeTTS,
} from '../../src/lib/tts';

describe('tts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTTS();
  });

  describe('parseL2Segments', () => {
    it('returns single L1 segment for text without L2 tags', () => {
      const segments = parseL2Segments('Hello world');
      expect(segments).toEqual([{ text: 'Hello world', isL2: false }]);
    });

    it('extracts L2 segments from tagged text', () => {
      const segments = parseL2Segments('Ciao [L2: Hello] mondo');
      expect(segments).toEqual([
        { text: 'Ciao', isL2: false },
        { text: 'Hello', isL2: true },
        { text: 'mondo', isL2: false },
      ]);
    });

    it('handles multiple L2 tags', () => {
      const segments = parseL2Segments('[L2: One] between [L2: Two]');
      expect(segments).toEqual([
        { text: 'One', isL2: true },
        { text: 'between', isL2: false },
        { text: 'Two', isL2: true },
      ]);
    });

    it('handles empty L2 tags gracefully', () => {
      const segments = parseL2Segments('before [L2: ] after');
      expect(segments).toEqual([
        { text: 'before', isL2: false },
        { text: 'after', isL2: false },
      ]);
    });

    it('handles case-insensitive L2 tags', () => {
      const segments = parseL2Segments('[l2: hello]');
      expect(segments).toEqual([{ text: 'hello', isL2: true }]);
    });

    it('returns empty array for empty string', () => {
      const segments = parseL2Segments('');
      expect(segments).toEqual([]);
    });

    it('handles text with only L2 content', () => {
      const segments = parseL2Segments('[L2: solo L2]');
      expect(segments).toEqual([{ text: 'solo L2', isL2: true }]);
    });
  });

  describe('getTTSState', () => {
    it('returns initial state correctly', () => {
      const state = getTTSState();
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.currentAgent).toBeNull();
      expect(state.queueLength).toBe(0);
    });
  });

  describe('stopTTS', () => {
    it('resets playing state', () => {
      stopTTS();
      const state = getTTSState();
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.queueLength).toBe(0);
    });

    it('cancels speech synthesis', () => {
      stopTTS();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('dispatches stop event', () => {
      stopTTS();
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'radio-audio-stop' })
      );
    });
  });

  describe('resetTTS', () => {
    it('calls stopTTS and resets counters', () => {
      resetTTS();
      const state = getTTSState();
      expect(state.isPlaying).toBe(false);
      expect(state.queueLength).toBe(0);
    });
  });

  describe('pauseTTS / resumeTTS', () => {
    it('pauseTTS does nothing when not playing', () => {
      pauseTTS();
      expect(getTTSState().isPaused).toBe(false);
    });

    it('resumeTTS does nothing when not paused', () => {
      resumeTTS();
      expect(getTTSState().isPaused).toBe(false);
    });
  });
});
