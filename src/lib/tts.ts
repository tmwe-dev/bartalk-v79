import { TTS } from './constants';
import { getAPIKey } from './storage';
import { stripHtml, truncate } from './utils';

// ── Stato globale TTS ────────────────────────────────────────────────
interface TTSJob {
  seq: number;
  text: string;
  voiceId: string;
  agentName: string;
  blob?: Blob;
  useWebSpeech?: boolean;
  ready: boolean;
}

let queue: TTSJob[] = [];
let currentSeq = 0;
let nextSeq = 1;
let isPlaying = false;
let currentAudio: HTMLAudioElement | null = null;

// ── API pubblica ─────────────────────────────────────────────────────

/**
 * Accoda un messaggio TTS. Sintetizza in background e riproduce in ordine.
 */
export function enqueueTTS(text: string, voiceId: string, agentName: string): void {
  const cleanText = truncate(stripHtml(text), TTS.maxChars);
  if (!cleanText.trim()) return;

  const seq = ++currentSeq;
  const job: TTSJob = { seq, text: cleanText, voiceId, agentName, ready: false };
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
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
}

/** Resetta i contatori (per nuova conversazione) */
export function resetTTS(): void {
  stopTTS();
  currentSeq = 0;
  nextSeq = 1;
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

  try {
    if (job.blob) {
      await playBlob(job.blob);
    } else if (job.useWebSpeech) {
      await playWebSpeech(job.text);
    }
  } catch (err) {
    console.error('[tts] Errore riproduzione:', err);
  }

  // Rimuovi job completato
  queue = queue.filter(j => j.seq !== job.seq);
  nextSeq++;
  isPlaying = false;

  // Emetti evento fine audio (per carousel/UI)
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

function playWebSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve(); // Non bloccare se fallisce

    window.speechSynthesis.speak(utterance);
  });
}
