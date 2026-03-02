import type { ProviderType } from '../types/agents';
import { PROXY_URL, ORCHESTRATOR } from './constants';

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
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: req.provider,
        model: req.model,
        messages: req.messages,
        systemPrompt: req.systemPrompt,
        temperature: req.temperature ?? ORCHESTRATOR.defaultTemperature,
        maxTokens: req.maxTokens ?? ORCHESTRATOR.maxTokens,
        apiKey: req.apiKey,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[proxy] ${req.provider} HTTP ${res.status}:`, data.error, data.detail);
      return {
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        duration: Date.now() - startTime,
        error: data.error || `HTTP ${res.status}`,
        detail: data.detail,
      };
    }

    return {
      content: data.content || '',
      tokensIn: data.tokensIn || 0,
      tokensOut: data.tokensOut || 0,
      duration: data.duration || Date.now() - startTime,
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
