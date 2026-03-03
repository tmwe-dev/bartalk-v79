import type { ProviderType } from '../types/agents';
import { PROXY_URL, ORCHESTRATOR } from './constants';
import { supabase } from './supabase';

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

/**
 * Chiama il proxy /api/ai-proxy con i parametri dati.
 * Gestisce errori HTTP e li converte in ProxyResponse con campo error.
 */
export async function callProxy(req: ProxyRequest): Promise<ProxyResponse> {
  const startTime = Date.now();

  try {
    // Costruisci headers con auth token se disponibile
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        // Skip mode: segnala al proxy che non c'è auth
        headers['X-BT-Skip-Auth'] = 'true';
      }
    } else {
      headers['X-BT-Skip-Auth'] = 'true';
    }

    // Se la chiave è un placeholder del vault (utente autenticato), non inviarla.
    // Il proxy la leggerà direttamente dal DB server-side.
    const isVaultPlaceholder = req.apiKey === '••••••••' || !req.apiKey;
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

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    // Leggi il body come testo prima, poi prova a parsare JSON
    const rawText = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error(`[proxy] ${req.provider} risposta non-JSON (HTTP ${res.status}):`, rawText.substring(0, 200));
      return {
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        duration: Date.now() - startTime,
        error: `Proxy HTTP ${res.status}`,
        detail: rawText.substring(0, 200),
      };
    }

    if (!res.ok) {
      console.error(`[proxy] ${req.provider} HTTP ${res.status}:`, data.error, data.detail);
      return {
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        duration: Date.now() - startTime,
        error: (data.error as string) || `HTTP ${res.status}`,
        detail: data.detail as string,
      };
    }

    return {
      content: (data.content as string) || '',
      tokensIn: (data.tokensIn as number) || 0,
      tokensOut: (data.tokensOut as number) || 0,
      duration: (data.duration as number) || Date.now() - startTime,
    };
  } catch (err) {
    console.error(`[proxy] ${req.provider} network error:`, err);
    return {
      content: '',
      tokensIn: 0,
      tokensOut: 0,
      duration: Date.now() - startTime,
      error: 'Errore di rete',
      detail: (err as Error).message,
    };
  }
}
