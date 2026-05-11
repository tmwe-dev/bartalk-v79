import type { ProviderType } from '../types/agents';
import { PROXY_URL, ORCHESTRATOR } from './constants';
import { supabase } from './supabase';
import { captureAPIError } from './errorTracker';

export interface ProxyRequest {
  provider: ProviderType;
  model: string;
  messages: { role: string; content: string }[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
}

export interface ProxyResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  duration: number;
  error?: string;
  detail?: string;
}

// ── Retry config ────────────────────────────────────────────────────
const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 1000,    // 1s → 2s → 4s (exponential)
  maxDelay: 8000,
  /** Codici HTTP che meritano un retry */
  retryableStatuses: new Set([429, 500, 502, 503, 504]),
};

function shouldRetry(status: number, attempt: number): boolean {
  if (attempt >= RETRY_CONFIG.maxRetries) return false;
  return RETRY_CONFIG.retryableStatuses.has(status);
}

function getRetryDelay(attempt: number, retryAfterHeader?: string | null): number {
  // Rispetta Retry-After header se presente
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds) && seconds > 0 && seconds <= 60) {
      return seconds * 1000;
    }
  }
  // Exponential backoff con jitter
  const exponential = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(exponential + jitter, RETRY_CONFIG.maxDelay);
}

/**
 * Chiama il proxy /api/ai-proxy con i parametri dati.
 * Gestisce errori HTTP, retry con exponential backoff, e li converte in ProxyResponse.
 */
export async function callProxy(req: ProxyRequest): Promise<ProxyResponse> {
  const startTime = Date.now();

  // Costruisci headers con auth token se disponibile (una sola volta)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['X-BT-Skip-Auth'] = 'true';
      }
    } catch {
      headers['X-BT-Skip-Auth'] = 'true';
    }
  } else {
    headers['X-BT-Skip-Auth'] = 'true';
  }

  // Costruisci body payload (una sola volta)
  const isVaultPlaceholder = req.apiKey === '••••••••' || !req.apiKey || req.apiKey.trim() === '';
  const bodyPayload: Record<string, unknown> = {
    provider: req.provider,
    model: req.model,
    messages: req.messages,
    systemPrompt: req.systemPrompt,
    temperature: req.temperature ?? ORCHESTRATOR.defaultTemperature,
    maxTokens: req.maxTokens ?? ORCHESTRATOR.maxTokens,
  };
  if (!isVaultPlaceholder) {
    bodyPayload.apiKey = req.apiKey;
  }
  const bodyString = JSON.stringify(bodyPayload);

  // ── Retry loop ──────────────────────────────────────────────────
  let lastError: ProxyResponse | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Attendi prima del retry (non al primo tentativo)
      if (attempt > 0) {
        const delay = getRetryDelay(attempt - 1, lastError?.detail);
        console.log(`[proxy] ${req.provider} retry ${attempt}/${RETRY_CONFIG.maxRetries} dopo ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers,
        body: bodyString,
      });

      // Leggi il body come testo prima, poi prova a parsare JSON
      const rawText = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error(`[proxy] ${req.provider} risposta non-JSON (HTTP ${res.status}):`, rawText.substring(0, 200));
        const errorResponse: ProxyResponse = {
          content: '',
          tokensIn: 0,
          tokensOut: 0,
          duration: Date.now() - startTime,
          error: `Proxy HTTP ${res.status}`,
          detail: rawText.substring(0, 200),
        };
        // Retry su errori server
        if (shouldRetry(res.status, attempt)) {
          lastError = errorResponse;
          continue;
        }
        return errorResponse;
      }

      if (!res.ok) {
        console.error(`[proxy] ${req.provider} HTTP ${res.status}:`, data.error, data.detail);
        const errorResponse: ProxyResponse = {
          content: '',
          tokensIn: 0,
          tokensOut: 0,
          duration: Date.now() - startTime,
          error: (data.error as string) || `HTTP ${res.status}`,
          detail: data.detail as string,
        };

        // Retry solo su errori transitori
        if (shouldRetry(res.status, attempt)) {
          lastError = errorResponse;
          // Usa Retry-After header se presente
          const retryAfter = res.headers?.get?.('Retry-After');
          if (retryAfter) lastError.detail = retryAfter;
          continue;
        }

        return errorResponse;
      }

      // Successo!
      if (attempt > 0) {
        console.log(`[proxy] ${req.provider} successo al tentativo ${attempt + 1}`);
      }

      return {
        content: (data.content as string) || '',
        tokensIn: (data.tokensIn as number) || 0,
        tokensOut: (data.tokensOut as number) || 0,
        duration: (data.duration as number) || Date.now() - startTime,
      };
    } catch (err) {
      console.error(`[proxy] ${req.provider} network error (tentativo ${attempt + 1}):`, err);
      lastError = {
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        duration: Date.now() - startTime,
        error: 'Errore di rete',
        detail: (err as Error).message,
      };

      // Retry su errori di rete
      if (attempt < RETRY_CONFIG.maxRetries) continue;
    }
  }

  // Tutti i retry esauriti — traccia l'errore
  const finalError = lastError || {
    content: '',
    tokensIn: 0,
    tokensOut: 0,
    duration: Date.now() - startTime,
    error: 'Tutti i tentativi falliti',
    detail: `${RETRY_CONFIG.maxRetries + 1} tentativi esauriti per ${req.provider}`,
  };

  captureAPIError(req.provider, finalError.error || 'unknown', finalError.detail);
  return finalError;
}
