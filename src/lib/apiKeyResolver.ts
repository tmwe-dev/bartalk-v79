/**
 * @module apiKeyResolver
 * Centralized API key resolution with configurable priority orders.
 * Resolves the best available provider/model/key combination by checking
 * localStorage, Supabase vault, and server-side keys in priority order.
 */

import { loadAPIKeys } from './storage';
import { DEFAULT_MODELS } from './constants';

export type ProviderType = 'anthropic' | 'openai' | 'gemini' | 'groq';

export interface ResolvedApiKey {
  provider: ProviderType;
  model: string;
  apiKey: string;
}

/** Ordini di priorità predefiniti per diversi contesti */
export const PRIORITY_ORDERS = {
  /** Default: Anthropic primo (migliore per JSON e istruzioni complesse) */
  default: ['anthropic', 'openai', 'gemini', 'groq'] as ProviderType[],
  /** Per estrazione veloce (Life Tutor, batch): modelli veloci ed economici */
  fast: ['gemini', 'groq', 'anthropic', 'openai'] as ProviderType[],
  /** Per pronuncia: ordine standard */
  pronunciation: ['anthropic', 'openai', 'gemini', 'groq'] as ProviderType[],
} as const;

/**
 * Risolvi la chiave API migliore disponibile.
 *
 * @param preferredProvider - Provider preferito (opzionale, provato per primo)
 * @param preferredModel - Modello preferito (opzionale, usato se il provider match)
 * @param priorityOrder - Ordine di fallback se il preferito non è disponibile
 * @returns ResolvedApiKey o null se nessuna chiave è configurata
 */
export function resolveApiKey(
  preferredProvider?: string,
  preferredModel?: string,
  priorityOrder: ProviderType[] = PRIORITY_ORDERS.default,
): ResolvedApiKey | null {
  try {
    const keys = loadAPIKeys();
    if (!keys || keys.length === 0) return null;

    // 1. Prova il provider preferito se specificato
    if (preferredProvider) {
      const preferred = keys.find(
        k => k.provider === preferredProvider && k.apiKey && k.apiKey !== '••••••••',
      );
      if (preferred) {
        return {
          provider: preferredProvider as ProviderType,
          model: preferred.model || preferredModel || DEFAULT_MODELS[preferredProvider as keyof typeof DEFAULT_MODELS] || 'default',
          apiKey: preferred.apiKey,
        };
      }
    }

    // 2. Fallback: segui ordine di priorità
    for (const prov of priorityOrder) {
      const k = keys.find(x => x.provider === prov && x.apiKey && x.apiKey !== '••••••••');
      if (k) {
        return {
          provider: prov,
          model: k.model || DEFAULT_MODELS[prov],
          apiKey: k.apiKey,
        };
      }
    }
  } catch {
    /* localStorage non disponibile */
  }

  return null;
}

/**
 * Risolvi la chiave API o lancia errore.
 * Comodo per i contesti dove la chiave è obbligatoria.
 */
export function resolveApiKeyOrThrow(
  preferredProvider?: string,
  preferredModel?: string,
  priorityOrder?: ProviderType[],
): ResolvedApiKey {
  const result = resolveApiKey(preferredProvider, preferredModel, priorityOrder);
  if (!result) {
    throw new Error('Nessuna chiave API configurata. Salva le chiavi in Impostazioni → Chiavi API.');
  }
  return result;
}
