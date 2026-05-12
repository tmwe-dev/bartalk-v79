/**
 * BarTalk v8 — Pronunciation Analyzer
 * AI-powered pronunciation analysis using callProxy.
 * Compares expected text with spoken text from speech recognition.
 */

import { callProxy } from './proxy';
import { DEFAULT_MODELS } from './constants';
import type { ProviderType } from '../types/agents';
import { resolveApiKey, PRIORITY_ORDERS } from './apiKeyResolver';

// ── Types ────────────────────────────────────────────────────────────

export interface WordResult {
  word: string;
  status: 'correct' | 'almost' | 'wrong';
  expectedPhonetic?: string;
  spokenPhonetic?: string;
}

export interface PronunciationResult {
  overallScore: number; // 0-100
  wordResults: WordResult[];
  feedback: string;
  suggestion: string;
}

interface ApiConfig {
  provider: ProviderType;
  model: string;
  apiKey: string;
}

// ── Helper: Extract API configuration ────────────────────────────────

/**
 * Get API configuration for pronunciation analysis.
 * Tries providers in order: anthropic → openai → gemini → groq.
 * Falls back to placeholder if no key found.
 */
export function getApiConfigForPronunciation(): ApiConfig {
  const resolved = resolveApiKey(undefined, undefined, PRIORITY_ORDERS.pronunciation);
  if (resolved) return resolved;

  // Fallback: use anthropic with placeholder (auth mode will fetch from DB)
  return {
    provider: 'anthropic',
    model: DEFAULT_MODELS.anthropic,
    apiKey: '••••••••',
  };
}

// ── Main analysis function ───────────────────────────────────────────

/**
 * Analyze pronunciation by comparing expected text with spoken text.
 * Uses AI to evaluate each word and provide feedback.
 */
export async function analyzePronunciation(
  expected: string,
  spoken: string,
  language: string,
  apiKey: string,
  provider: ProviderType = 'anthropic',
  model: string = DEFAULT_MODELS.anthropic,
): Promise<PronunciationResult> {
  try {
    // Validate inputs
    if (!expected.trim() || !spoken.trim()) {
      return getGracefulFallback(
        'Testo vuoto: fornisci sia il testo atteso che quello pronunciato.',
      );
    }

    if (!language.trim()) {
      return getGracefulFallback(
        'Lingua non specificata: fornisci la lingua per l\'analisi.',
      );
    }

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(language);

    // Build the user message with both texts
    const userMessage = `
Testo atteso: "${expected}"
Testo pronunciato: "${spoken}"

Analizza ogni parola del testo atteso e confrontalo con la pronuncia riconosciuta.
Restituisci la risposta SOLO come JSON valido, senza markdown o altre spiegazioni.`;

    // Call the proxy
    const response = await callProxy({
      provider,
      model,
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2048,
      apiKey,
    });

    // Handle proxy errors
    if (response.error) {
      console.error('[pronunciationAnalyzer] Proxy error:', response.error, response.detail);
      return getGracefulFallback(`Errore di analisi: ${response.error}`);
    }

    // Parse the JSON response
    const parsed = parseAnalysisResponse(response.content);
    if (!parsed) {
      return getGracefulFallback(
        'Impossibile analizzare la risposta. Ritenta.',
      );
    }

    // Validate the parsed result
    const result = validateAndNormalizePronunciationResult(parsed);
    return result;
  } catch (err) {
    console.error('[pronunciationAnalyzer] Unexpected error:', err);
    return getGracefulFallback(
      `Errore inaspettato: ${(err as Error).message}`,
    );
  }
}

// ── Helper functions ────────────────────────────────────────────────

/**
 * Build the system prompt for pronunciation analysis.
 */
function buildSystemPrompt(language: string): string {
  return `You are a pronunciation analysis expert for ${language}.
Your role is to compare expected text with spoken text (from speech recognition) and analyze pronunciation accuracy.

For each word in the expected text:
1. Compare it with the corresponding word in the spoken text
2. Mark it as 'correct' if it matches, 'almost' if very similar with minor differences, or 'wrong' if significantly different
3. Provide expected and spoken phonetic representations when helpful
4. Generate an encouraging overall feedback message
5. Suggest what to practice next

IMPORTANT: You MUST respond with ONLY valid JSON, no markdown code blocks, no additional text. The JSON structure must be:
{
  "overallScore": <number 0-100>,
  "wordResults": [
    {
      "word": "<original word>",
      "status": "<correct|almost|wrong>",
      "expectedPhonetic": "<optional phonetic>",
      "spokenPhonetic": "<optional phonetic>"
    }
  ],
  "feedback": "<encouraging message about overall pronunciation>",
  "suggestion": "<specific practice suggestion>"
}`;
}

/**
 * Parse the JSON response from the AI, handling markdown code blocks.
 */
function parseAnalysisResponse(
  content: string,
): Record<string, unknown> | null {
  try {
    // Remove markdown code block if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.slice(7); // Remove ```json
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.slice(3); // Remove ```
    }
    if (cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.slice(0, -3); // Remove trailing ```
    }

    cleanedContent = cleanedContent.trim();
    const parsed = JSON.parse(cleanedContent);
    return parsed as Record<string, unknown>;
  } catch (err) {
    console.error('[pronunciationAnalyzer] JSON parse error:', err);
    return null;
  }
}

/**
 * Validate and normalize the pronunciation result from AI.
 */
function validateAndNormalizePronunciationResult(
  data: Record<string, unknown>,
): PronunciationResult {
  try {
    const overallScore = validateScore(data.overallScore);
    const wordResults = validateWordResults(data.wordResults);
    const feedback = validateString(data.feedback, 'Ottimo lavoro sulla pronuncia!');
    const suggestion = validateString(data.suggestion, 'Continua a praticare.');

    return {
      overallScore,
      wordResults,
      feedback,
      suggestion,
    };
  } catch (err) {
    console.error('[pronunciationAnalyzer] Validation error:', err);
    return getGracefulFallback('Errore nella validazione della risposta.');
  }
}

/**
 * Validate and normalize overall score (0-100).
 */
function validateScore(value: unknown): number {
  if (typeof value === 'number') {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  return 75; // Default moderate score
}

/**
 * Validate and normalize word results array.
 */
function validateWordResults(value: unknown): WordResult[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return {
        word: validateString(obj.word, 'word'),
        status: validateStatus(obj.status),
        expectedPhonetic: validateOptionalString(obj.expectedPhonetic),
        spokenPhonetic: validateOptionalString(obj.spokenPhonetic),
      };
    })
    .filter((item) => item.word !== 'word'); // Exclude default placeholders
}

/**
 * Validate pronunciation status.
 */
function validateStatus(value: unknown): 'correct' | 'almost' | 'wrong' {
  if (value === 'correct' || value === 'almost' || value === 'wrong') {
    return value;
  }
  return 'almost'; // Default to 'almost'
}

/**
 * Validate a required string.
 */
function validateString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

/**
 * Validate an optional string.
 */
function validateOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return undefined;
}

/**
 * Return a graceful fallback result on error.
 */
function getGracefulFallback(message: string): PronunciationResult {
  return {
    overallScore: 50,
    wordResults: [],
    feedback: message,
    suggestion: 'Ritenta con un input valido.',
  };
}
