/**
 * BarTalk v8.2.5 — Database Validation
 * Validates data before sending to Supabase to prevent bad inserts.
 */

import { ValidationError } from './errors';

// ── Constants ──────────────────────────────────────────────────────────

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50_000;
const MAX_DISPLAY_NAME_LENGTH = 100;

const VALID_SENDER_TYPES = new Set(['human', 'assistant', 'system']);
const VALID_PLANS = new Set(['free', 'pro']);
const VALID_MODES = new Set(['standard', 'consultation', 'bar_realtime']);
const VALID_STRATEGIES = new Set(['round_robin', 'random', 'smart']);
const VALID_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'groq', 'xai']);

// ── Validation Functions ───────────────────────────────────────────────

/**
 * Validates a message before DB insert.
 */
export function validateMessage(msg: {
  conversation_id: string;
  sender_type: string;
  sender_name: string;
  content: string;
}): void {
  if (!msg.conversation_id || typeof msg.conversation_id !== 'string') {
    throw new ValidationError('conversation_id obbligatorio', 'conversation_id');
  }

  if (!VALID_SENDER_TYPES.has(msg.sender_type)) {
    throw new ValidationError(
      `sender_type non valido: ${msg.sender_type}. Validi: ${[...VALID_SENDER_TYPES].join(', ')}`,
      'sender_type'
    );
  }

  if (!msg.sender_name || msg.sender_name.trim().length === 0) {
    throw new ValidationError('sender_name obbligatorio', 'sender_name');
  }

  if (!msg.content || msg.content.trim().length === 0) {
    throw new ValidationError('content non può essere vuoto', 'content');
  }

  if (msg.content.length > MAX_CONTENT_LENGTH) {
    throw new ValidationError(
      `content troppo lungo: ${msg.content.length}/${MAX_CONTENT_LENGTH} caratteri`,
      'content'
    );
  }
}

/**
 * Validates a conversation before DB insert.
 */
export function validateConversation(conv: {
  workspace_id: string;
  title: string;
  turn_index?: number;
}): void {
  if (!conv.workspace_id || typeof conv.workspace_id !== 'string') {
    throw new ValidationError('workspace_id obbligatorio', 'workspace_id');
  }

  if (!conv.title || conv.title.trim().length === 0) {
    throw new ValidationError('title obbligatorio', 'title');
  }

  if (conv.title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(
      `title troppo lungo: ${conv.title.length}/${MAX_TITLE_LENGTH} caratteri`,
      'title'
    );
  }

  if (conv.turn_index !== undefined && (conv.turn_index < 0 || !Number.isInteger(conv.turn_index))) {
    throw new ValidationError('turn_index deve essere un intero >= 0', 'turn_index');
  }
}

/**
 * Validates user profile data.
 */
export function validateProfile(profile: {
  display_name?: string;
  plan?: string;
  language?: string;
}): void {
  if (profile.display_name && profile.display_name.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new ValidationError(
      `display_name troppo lungo: ${profile.display_name.length}/${MAX_DISPLAY_NAME_LENGTH}`,
      'display_name'
    );
  }

  if (profile.plan && !VALID_PLANS.has(profile.plan)) {
    throw new ValidationError(`plan non valido: ${profile.plan}`, 'plan');
  }
}

/**
 * Validates settings data.
 */
export function validateSettings(settings: {
  conversation_mode?: string;
  turn_strategy?: string;
  temperature?: number;
  max_tokens?: number;
}): void {
  if (settings.conversation_mode && !VALID_MODES.has(settings.conversation_mode)) {
    throw new ValidationError(`conversation_mode non valido`, 'conversation_mode');
  }

  if (settings.turn_strategy && !VALID_STRATEGIES.has(settings.turn_strategy)) {
    throw new ValidationError(`turn_strategy non valido`, 'turn_strategy');
  }

  if (settings.temperature !== undefined) {
    if (settings.temperature < 0 || settings.temperature > 2) {
      throw new ValidationError('temperature deve essere tra 0 e 2', 'temperature');
    }
  }

  if (settings.max_tokens !== undefined) {
    if (settings.max_tokens < 1 || settings.max_tokens > 128_000) {
      throw new ValidationError('max_tokens deve essere tra 1 e 128000', 'max_tokens');
    }
  }
}

/**
 * Validates an API key entry.
 */
export function validateAPIKey(entry: {
  provider: string;
  encrypted_key: string;
}): void {
  if (!VALID_PROVIDERS.has(entry.provider)) {
    throw new ValidationError(`provider non valido: ${entry.provider}`, 'provider');
  }

  if (!entry.encrypted_key || entry.encrypted_key.trim().length === 0) {
    throw new ValidationError('encrypted_key obbligatorio', 'encrypted_key');
  }
}
