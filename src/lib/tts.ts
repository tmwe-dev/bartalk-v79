import { TTS } from './constants';
import { getAPIKey, loadSettings } from './storage';
import { stripHtml, truncate } from './utils';
import { getLangConfig } from '../types/settings';
import type { AppSettings } from '../types/settings';

// ── Stato globale TTS ────────────────────────────────────────────────
interface TTSJob {
  seq: number;
  text: string;
  voiceId: string;
  agentName: string;
  lang: string; // BCP-47 language code
  blob?: Blob;
  useWebSpeech?: boolean;
  ready: boolean;
}

let queue: TTSJob[] = [];
let currentSeq = 0;
let nextSeq = 1;
let isPlaying = false;
let isPaused = false;
let currentAudio: HTMLAudioElement | null = null;
let currentJobAgentName: string | null = null;

// ── API pubblica ─────────────────────────────────────────────────────

/**
 * Accoda un messaggio TTS. Sintetizza in background e riproduce in ordine.
 */
export function enqueueTTS(text: string, voiceId: string, agentName: string): void {
  const cleanText = truncate(stripHtml(text), TTS.maxChars);
  if (!cleanText.trim()) return;

  // Leggi lingua corrente dalle impostazioni salvate
  const settings = loadSettings<Partial<AppSettings>>({});
  const langConfig = getLangConfig(settings.language || 'it');

  const seq = ++currentSeq;
  const job: TTSJob = { seq, text: cleanText, voiceId, agentName, lang: langConfig.bcp47, ready: false };
  queue.push(job);

  // Sintetizza in background
  synthesize(job).then(() => {
    job.ready = true;
    processQueue();
  });
}

/** Ferma la riproduzione e svuota la coda */
export function stopTTS(): void {
  queue = [];
  isPlaying = false;
  isPaused = false;
  currentJobAgentName = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
  // Emetti stop event
  window.dispatchEvent(new CustomEvent('radio-audio-stop'));
}

/** Pausa la riproduzione corrente */
export function pauseTTS(): void {
  if (!isPlaying || isPaused) return;
  isPaused = true;
  if (currentAudio) {
    currentAudio.pause();
  }
  window.speechSynthesis?.pause();
  window.dispatchEvent(new CustomEvent('radio-audio-pause'));
}

/** Riprendi la riproduzione dopo pausa */
export function resumeTTS(): void {
  if (!isPaused) return;
  isPaused = false;
  if (currentAudio) {
    currentAudio.play();
  }
  window.speechSynthesis?.resume();
  window.dispatchEvent(new CustomEvent('radio-audio-resume'));
}

/** Salta al prossimo messaggio in coda */
export function skipTTS(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = currentAudio.duration || 0;
    // L'evento onended gestirà il passaggio al prossimo
  }
  window.speechSynthesis?.cancel();
}

/** Resetta i contatori (per nuova conversazione) */
export function resetTTS(): void {
  stopTTS();
  currentSeq = 0;
  nextSeq = 1;
}

/** Stato corrente TTS */
export function getTTSState(): { isPlaying: boolean; isPaused: boolean; currentAgent: string | null; queueLength: number } {
  return {
    isPlaying,
    isPaused,
    currentAgent: currentJobAgentName,
    queueLength: queue.length,
  };
}

// ── Sintetizzazione ──────────────────────────────────────────────────

async function synthesize(job: TTSJob): Promise<void> {
  const elevenLabsKey = getAPIKey('elevenlabs');

  if (elevenLabsKey && job.voiceId) {
    try {
      const response = await fetch(
        `${TTS.apiBase}/text-to-speech/${job.voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: job.text,
            model_id: TTS.model,
            voice_settings: {
              stability: TTS.stability,
              similarity_boost: TTS.similarityBoost,
              style: TTS.style,
            },
          }),
        },
      );

      if (response.ok) {
        job.blob = await response.blob();
        return;
      }
      console.warn(`[tts] ElevenLabs errore HTTP ${response.status}, fallback Web Speech`);
    } catch (err) {
      console.warn('[tts] ElevenLabs errore rete, fallback Web Speech:', err);
    }
  }

  // Fallback a Web Speech API
  job.useWebSpeech = true;
}

// ── Coda di riproduzione (sequenziale) ───────────────────────────────

async function processQueue(): Promise<void> {
  if (isPlaying) return;

  const job = queue.find(j => j.seq === nextSeq && j.ready);
  if (!job) return;

  isPlaying = true;
  isPaused = false;
  currentJobAgentName = job.agentName;

  // Emetti evento INIZIO audio (per carousel/UI sync)
  window.dispatchEvent(new CustomEvent('radio-audio-start', {
    detail: { agentName: job.agentName, seq: job.seq },
  }));

  try {
    if (job.blob) {
      await playBlob(job.blob);
    } else if (job.useWebSpeech) {
      await playWebSpeech(job.text, job.lang);
    }
  } catch (err) {
    console.error('[tts] Errore riproduzione:', err);
  }

  // Rimuovi job completato
  queue = queue.filter(j => j.seq !== job.seq);
  nextSeq++;
  isPlaying = false;
  currentJobAgentName = null;

  // Emetti evento FINE audio (per carousel/UI auto-advance)
  window.dispatchEvent(new CustomEvent('radio-audio-end', {
    detail: { agentName: job.agentName, seq: job.seq },
  }));

  // Processa il prossimo in coda
  processQueue();
}

// ── Riproduttori ─────────────────────────────────────────────────────

function playBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      reject(e);
    };

    audio.play().catch(reject);
  });
}

function playWebSpeech(text: string, lang: string = 'it-IT'): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang; // Lingua dinamica
    utterance.rate = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}
