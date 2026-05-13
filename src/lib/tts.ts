import { TTS, RATE_LIMITS } from './constants';
import { loadSettings, isInSkipMode, getAPIKey } from './storage';
import { stripHtml, truncate } from './utils';
import { getAuthToken } from './authToken';
import { getLangConfig } from '../types/settings';
import type { AppSettings } from '../types/settings';
import { preprocessForTTS } from './ttsPreprocessor';
import { ttsLimiter } from './rateLimiter';
import { recordTTSUsage } from './usageTracker';
import { incrementTTSUsage, isQuotaExceeded } from './skipModeQuota';

// ── Unlock audio context su mobile ──────────────────────────────────
// I browser mobile bloccano audio.play() senza interazione utente.
// Creiamo un AudioContext silente al primo tap per sbloccare.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    // Anche un Audio element silente per sbloccare HTMLAudioElement.play()
    const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    silentAudio.play().then(() => silentAudio.pause()).catch(err => console.warn('[tts] Audio unlock blocked:', err));
    audioUnlocked = true;
    document.removeEventListener('touchstart', unlockAudio, true);
    document.removeEventListener('click', unlockAudio, true);
  } catch { /* ignora */ }
}
document.addEventListener('touchstart', unlockAudio, true);
document.addEventListener('click', unlockAudio, true);

// ── Velocità TTS per lingua (lingue senza spazi/agglutinanti = più lente) ──
const LANG_SPEED: Record<string, number> = {
  th: 0.85,   // Thailandese: parole lunghe senza spazi
  zh: 0.88,   // Cinese: caratteri densi
  ja: 0.88,   // Giapponese: mix kanji/kana
  ko: 0.90,   // Coreano: sillabe dense
  km: 0.85,   // Khmer: parole lunghe senza spazi
  lo: 0.85,   // Laotiano: come il thailandese
  my: 0.85,   // Birmano: scrittura continua
  vi: 0.90,   // Vietnamita: toni richiedono tempo
  ar: 0.92,   // Arabo: complesso
  fa: 0.92,   // Persiano
  he: 0.92,   // Ebraico
  hi: 0.92,   // Hindi
  bn: 0.92,   // Bengali
  ur: 0.92,   // Urdu
};

function getTTSSpeed(lang: string): number {
  const code = lang.toLowerCase().slice(0, 2);
  return LANG_SPEED[code] || 1.0;
}

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
// Contatore "generazione" — incrementa a ogni stopTTS/resetTTS.
// Le vecchie Promise di processQueue controllano questo valore per sapere
// se lo stato è stato resettato durante la riproduzione.
let playGeneration = 0;

// ── Result type per enqueueTTS ──────────────────────────────────────
export interface EnqueueResult {
  success: boolean;
  error?: string;
  quotaExceeded?: boolean;
  rateLimited?: boolean;
}

// ── API pubblica ─────────────────────────────────────────────────────

/**
 * Accoda un messaggio TTS. Spezza in chunk per qualità ottimale e sintetizza in background.
 * Ora con rate limiting, quota check, e limiti coda.
 */
export interface EnqueueTTSOptions {
  text: string;
  voiceId: string;
  agentName: string;
}

export function enqueueTTS(opts: EnqueueTTSOptions): EnqueueResult {
  const { text, voiceId, agentName } = opts;
  console.log(`[tts] enqueueTTS chiamato — agent=${agentName}, voiceId=${voiceId}, textLen=${text.length}`);

  // ── Rate Limiting (soft: solo log, non blocca) ──
  if (!ttsLimiter.canProceed()) {
    console.warn('[tts] Rate limit raggiunto, ma procedo comunque');
  }

  // ── Queue Size Limit (alzato a 20) ──
  if (queue.length >= 20) {
    console.warn(`[tts] Coda piena (${queue.length} items), rifiuto`);
    return {
      success: false,
      error: 'Coda vocale piena. Attendi che i messaggi correnti finiscano.',
    };
  }

  // ── Skip-mode Quota: solo warning, non blocca l'audio ──
  if (isInSkipMode()) {
    const quota = isQuotaExceeded('tts');
    if (quota.exceeded) {
      console.warn('[tts] Quota skip-mode superata (non bloccante)');
    }
  }

  // Leggi lingua corrente dalle impostazioni salvate
  const settings = loadSettings<Partial<AppSettings>>({});
  const langConfig = getLangConfig(settings.language || 'it');

  // Pipeline di pulizia: HTML → TTS preprocessing → truncate
  const stripped = stripHtml(text);
  const preprocessed = preprocessForTTS(stripped, langConfig.bcp47);
  const cleanText = truncate(preprocessed, TTS.maxChars);
  if (!cleanText.trim()) {
    console.warn('[tts] Testo vuoto dopo pulizia');
    return { success: false, error: 'Testo vuoto' };
  }

  // ── Char Limit per item ──
  const limitedText = cleanText.length > RATE_LIMITS.ttsMaxCharsPerItem
    ? cleanText.slice(0, RATE_LIMITS.ttsMaxCharsPerItem)
    : cleanText;

  // Chunking: spezza testi lunghi in blocchi naturali (per frase)
  const chunks = chunkText(limitedText, TTS.chunkMaxChars);
  console.log(`[tts] ${chunks.length} chunk(s) creati, queueLen=${queue.length}`);

  for (const chunk of chunks) {
    const seq = ++currentSeq;
    const job: TTSJob = { seq, text: chunk, voiceId, agentName, lang: langConfig.bcp47, ready: false };
    queue.push(job);

    // Sintetizza in background
    synthesize(job).then(() => {
      job.ready = true;
      console.log(`[tts] Job seq=${job.seq} ready (blob=${!!job.blob}, webSpeech=${!!job.useWebSpeech}), nextSeq=${nextSeq}`);
      processQueue();
    }).catch(err => {
      console.error(`[tts] synthesize FALLITA per seq=${job.seq}:`, err);
      // Anche se fallisce, marca come ready con webSpeech fallback
      job.useWebSpeech = true;
      job.ready = true;
      processQueue();
    });
  }

  // Record rate limit + usage
  ttsLimiter.recordRequest();
  recordTTSUsage(limitedText.length);

  // Skip-mode: incrementa quota
  if (isInSkipMode()) {
    incrementTTSUsage();
  }

  console.log(`[tts] enqueueTTS OK — currentSeq=${currentSeq}, nextSeq=${nextSeq}, queueLen=${queue.length}`);
  return { success: true };
}

// ── Dual-Voice TTS: segmenti L1/L2 con voci diverse ────────────────

export interface DualVoiceSegment {
  text: string;
  isL2: boolean;
}

/**
 * Parsa il testo per estrarre segmenti [L2: ...].
 * Ritorna un array alternato di segmenti L1 e L2.
 */
export function parseL2Segments(text: string): DualVoiceSegment[] {
  const segments: DualVoiceSegment[] = [];
  const regex = /\[L2:\s*(.*?)\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Testo L1 prima del tag
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      segments.push({ text: before, isL2: false });
    }
    // Testo L2 dentro il tag
    const l2Text = match[1].trim();
    if (l2Text) {
      segments.push({ text: l2Text, isL2: true });
    }
    lastIndex = match.index + match[0].length;
  }

  // Testo L1 rimanente dopo l'ultimo tag
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    segments.push({ text: remaining, isL2: false });
  }

  return segments;
}

/**
 * Accoda TTS con dual-voice: voce L1 per il maestro, voce L2 per la lingua straniera.
 * Splitta il testo sui tag [L2:...] e alterna le voci automaticamente.
 */
export interface EnqueueDualVoiceTTSOptions {
  text: string;
  l1VoiceId: string;
  l2VoiceId: string;
  agentName: string;
  l2LangCode: string;
}

export function enqueueDualVoiceTTS(opts: EnqueueDualVoiceTTSOptions): EnqueueResult {
  const { text, l1VoiceId, l2VoiceId, agentName, l2LangCode } = opts;
  const segments = parseL2Segments(text);

  // Se non ci sono tag L2, usa il TTS normale
  if (segments.length <= 1 || !segments.some(s => s.isL2)) {
    // Rimuovi eventuali tag [L2:...] rimasti
    const cleanText = text.replace(/\[L2:\s*(.*?)\]/gi, '$1');
    return enqueueTTS({ text: cleanText, voiceId: l1VoiceId, agentName });
  }

  console.log(`[tts] enqueueDualVoiceTTS: ${segments.length} segmenti (L2=${segments.filter(s => s.isL2).length})`);

  // Rate limiting e quota check (una volta per tutto il blocco)
  if (!ttsLimiter.canProceed()) {
    console.warn('[tts] Rate limit raggiunto, ma procedo comunque');
  }
  if (queue.length >= 20) {
    return { success: false, error: 'Coda vocale piena.' };
  }
  if (isInSkipMode()) {
    const quota = isQuotaExceeded('tts');
    if (quota.exceeded) {
      console.warn('[tts] Quota skip-mode superata (non bloccante)');
    }
  }

  const settings = loadSettings<Partial<AppSettings>>({});
  const l1LangConfig = getLangConfig(settings.language || 'it');

  for (const segment of segments) {
    const voiceId = segment.isL2 ? l2VoiceId : l1VoiceId;
    const langCode = segment.isL2 ? l2LangCode : l1LangConfig.bcp47;

    // Pipeline di pulizia per ogni segmento
    const stripped = stripHtml(segment.text);
    const preprocessed = preprocessForTTS(stripped, langCode);
    const cleanText = truncate(preprocessed, TTS.maxChars);
    if (!cleanText.trim()) continue;

    const limitedText = cleanText.length > RATE_LIMITS.ttsMaxCharsPerItem
      ? cleanText.slice(0, RATE_LIMITS.ttsMaxCharsPerItem)
      : cleanText;

    // Chunking per segmenti lunghi
    const chunks = chunkText(limitedText, TTS.chunkMaxChars);

    for (const chunk of chunks) {
      const seq = ++currentSeq;
      const job: TTSJob = {
        seq,
        text: chunk,
        voiceId,
        agentName: segment.isL2 ? `${agentName} [L2]` : agentName,
        lang: langCode,
        ready: false,
      };
      queue.push(job);

      synthesize(job).then(() => {
        job.ready = true;
        console.log(`[tts] DualVoice job seq=${job.seq} ready (L2=${segment.isL2}, blob=${!!job.blob})`);
        processQueue();
      }).catch(err => {
        console.error(`[tts] DualVoice synthesize FALLITA seq=${job.seq}:`, err);
        job.useWebSpeech = true;
        job.ready = true;
        processQueue();
      });
    }
  }

  ttsLimiter.recordRequest();
  recordTTSUsage(text.length);
  if (isInSkipMode()) incrementTTSUsage();

  console.log(`[tts] enqueueDualVoiceTTS OK — currentSeq=${currentSeq}, nextSeq=${nextSeq}, queueLen=${queue.length}`);
  return { success: true };
}

/** Ferma la riproduzione e svuota la coda */
export function stopTTS(): void {
  // CRITICO: incrementa la generazione PRIMA di toccare lo stato.
  // Le vecchie Promise di processQueue vedranno un gen diverso e non
  // sovrascriveranno isPlaying/nextSeq con valori stale.
  playGeneration++;
  queue = [];
  isPlaying = false;
  isPaused = false;
  currentJobAgentName = null;
  // Sincronizza nextSeq con currentSeq.
  nextSeq = currentSeq + 1;
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

/**
 * Ritorna una Promise che si risolve quando la coda TTS è completamente vuota
 * (nessun job in coda e nessuna riproduzione in corso).
 * Utile per attendere che tutti i messaggi siano stati letti prima di procedere.
 * @param abortSignal - se diventa true, la promise si risolve subito
 */
export function waitForTTSQueueDrain(abortSignal?: { current: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (abortSignal?.current) { resolve(); return; }
      if (queue.length === 0 && !isPlaying) { resolve(); return; }
      // Ricontrolla ogni 300ms
      setTimeout(check, 300);
    };
    check();
  });
}

// ── Chunking per testi lunghi ────────────────────────────────────────

/**
 * Spezza il testo in chunk rispettando i confini delle frasi.
 * ElevenLabs produce artefatti (pause, allungamenti) su testi > 1000 chars.
 */
function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining.trim());
      break;
    }

    // Trova il punto di taglio migliore (fine frase) entro maxChars
    let cutIndex = -1;

    // Priorità: punto fermo, punto esclamativo, interrogativo
    for (const sep of ['. ', '! ', '? ', '; ', ', ']) {
      const lastSep = remaining.lastIndexOf(sep, maxChars);
      if (lastSep > maxChars * 0.3) { // almeno 30% del chunk usato
        cutIndex = lastSep + sep.length;
        break;
      }
    }

    // Se nessun separatore trovato, taglia allo spazio più vicino
    if (cutIndex === -1) {
      cutIndex = remaining.lastIndexOf(' ', maxChars);
      if (cutIndex === -1) cutIndex = maxChars;
    }

    const chunk = remaining.slice(0, cutIndex).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(cutIndex).trim();
  }

  return chunks.filter(c => c.length > 0);
}

// ── Sintetizzazione ──────────────────────────────────────────────────

async function synthesize(job: TTSJob): Promise<void> {
  const elevenLabsKey = getAPIKey('elevenlabs');
  console.log(`[tts] synthesize seq=${job.seq}: elevenLabsKey=${elevenLabsKey ? 'YES' : 'NO'}, voiceId=${job.voiceId}`);

  if (elevenLabsKey && job.voiceId) {
    try {
      // Prova prima il proxy server-side (chiave protetta nel vault)
      console.log('[tts] Tentativo proxy...');
      const proxyOk = await synthesizeViaProxy(job, elevenLabsKey);
      if (proxyOk) {
        console.log(`[tts] ✓ Proxy OK, blob size=${job.blob?.size}`);
        return;
      }
      console.warn('[tts] Proxy fallito, provo diretto');
    } catch (err) {
      console.warn('[tts] Proxy errore, fallback diretto ElevenLabs:', err);
    }

    // Fallback diretto (skip-mode o proxy non disponibile)
    try {
      const response = await fetch(
        `${TTS.apiBase}/text-to-speech/${job.voiceId}?output_format=${TTS.outputFormat}`,
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
              use_speaker_boost: TTS.useSpeakerBoost,
            },
            speed: getTTSSpeed(job.lang),
          }),
        },
      );

      if (response.ok) {
        job.blob = await response.blob();
        return;
      }
      console.warn(`[tts] ElevenLabs diretto errore HTTP ${response.status}, fallback Web Speech`);
    } catch (err) {
      console.warn('[tts] ElevenLabs errore rete, fallback Web Speech:', err);
    }
  } else if (job.voiceId) {
    // Nessuna chiave locale ma utente autenticato → prova proxy con vault
    try {
      console.log('[tts] Nessuna chiave locale, tentativo proxy con vault...');
      const proxyOk = await synthesizeViaProxy(job, null);
      if (proxyOk) {
        console.log(`[tts] ✓ Proxy vault OK, blob size=${job.blob?.size}`);
        return;
      }
      console.warn('[tts] Proxy vault fallito');
    } catch (err) {
      console.warn('[tts] Proxy senza chiave locale fallito:', err);
    }
  } else {
    console.log('[tts] Nessun voiceId, skip ElevenLabs');
  }

  // Fallback a Web Speech API
  console.log(`[tts] → Fallback Web Speech per seq=${job.seq}`);
  job.useWebSpeech = true;
}

/**
 * Sintetizza via /api/tts-proxy (chiave nel vault server-side).
 * Ritorna true se audio ottenuto con successo, false altrimenti.
 */
async function synthesizeViaProxy(job: TTSJob, clientApiKey: string | null): Promise<boolean> {
  const token = getAuthToken();
  if (!token && !clientApiKey) return false;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['X-BT-Skip-Auth'] = 'true';
  }

  const response = await fetch('/api/tts-proxy', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: job.text,
      voiceId: job.voiceId,
      modelId: TTS.model,
      outputFormat: TTS.outputFormat,
      voiceSettings: {
        stability: TTS.stability,
        similarity_boost: TTS.similarityBoost,
        style: TTS.style,
        use_speaker_boost: TTS.useSpeakerBoost,
      },
      speed: getTTSSpeed(job.lang),
      ...(clientApiKey && !token ? { clientApiKey } : {}),
    }),
  });

  if (response.ok) {
    job.blob = await response.blob();
    return true;
  }

  console.warn(`[tts] Proxy errore HTTP ${response.status}`);
  return false;
}

// ── Coda di riproduzione (sequenziale) ───────────────────────────────

async function processQueue(): Promise<void> {
  if (isPlaying) {
    return;
  }

  const job = queue.find(j => j.seq === nextSeq && j.ready);
  if (!job) {
    if (queue.length > 0) {
      const pending = queue.filter(j => !j.ready);
      const ready = queue.filter(j => j.ready);
      console.log(`[tts] processQueue: nessun job per nextSeq=${nextSeq}. Queue: ${queue.length} (ready=${ready.length}, pending=${pending.length}), seqs=[${queue.map(j => j.seq).join(',')}]`);
    }
    return;
  }

  // Cattura la generazione corrente PRIMA di iniziare a riprodurre.
  // Se stopTTS() viene chiamato durante il playback, gen sarà diverso
  // da playGeneration e non toccheremo lo stato globale.
  const gen = playGeneration;

  console.log(`[tts] ▶ Riproduco seq=${job.seq} agent=${job.agentName} gen=${gen}`);
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
    } else {
      await playWebSpeech(job.text, job.lang);
    }
  } catch (err) {
    console.warn('[tts] Errore riproduzione, fallback Web Speech:', err);
    try {
      await playWebSpeech(job.text, job.lang);
    } catch (fallbackErr) { console.warn('[tts] Web Speech fallback also failed:', fallbackErr); }
  }

  // ── GUARD: se la generazione è cambiata, stopTTS è stato chiamato
  // durante la riproduzione → NON toccare lo stato globale!
  if (gen !== playGeneration) {
    console.log(`[tts] ⚠ Generazione cambiata (${gen} → ${playGeneration}), ignoro cleanup stale`);
    return;
  }

  // Rimuovi job completato e avanza
  queue = queue.filter(j => j.seq !== job.seq);
  nextSeq++;
  isPlaying = false;
  currentJobAgentName = null;

  // Emetti evento FINE audio
  window.dispatchEvent(new CustomEvent('radio-audio-end', {
    detail: { agentName: job.agentName, seq: job.seq },
  }));

  // Processa il prossimo in coda
  setTimeout(processQueue, 0);
}

// ── Riproduttori ─────────────────────────────────────────────────────

function playBlob(blob: Blob): Promise<void> {
  console.log(`[tts] playBlob: size=${blob.size}, type=${blob.type}`);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    // Safety timeout: se l'audio non finisce entro 120s, risolvi comunque
    // (previene Promise bloccate per sempre se audio.pause() viene chiamato da stopTTS)
    const safetyTimeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve();
    }, 120_000);

    audio.onended = () => {
      clearTimeout(safetyTimeout);
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve();
    };
    audio.onerror = (e) => {
      clearTimeout(safetyTimeout);
      URL.revokeObjectURL(url);
      currentAudio = null;
      reject(e);
    };

    audio.play().catch((err) => {
      clearTimeout(safetyTimeout);
      console.warn('[tts] audio.play() bloccato (autoplay policy):', err.message);
      URL.revokeObjectURL(url);
      currentAudio = null;
      // Risolvi senza errore — processQueue passerà al prossimo
      resolve();
    });
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
    utterance.rate = getTTSSpeed(lang);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}
