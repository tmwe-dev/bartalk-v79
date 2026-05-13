/**
 * Tests for src/lib/sanitize.ts — input sanitization and validation
 */
import { describe, it, expect } from 'vitest';
import {
  INPUT_LIMITS,
  sanitizeText,
  validateUserMessage,
  sanitizeMessages,
} from '../../src/lib/sanitize';

// ── sanitizeText ──────────────────────────────────────────────────────

describe('sanitizeText', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(null as any)).toBe('');
    expect(sanitizeText(undefined as any)).toBe('');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('collapses multiple spaces to single', () => {
    expect(sanitizeText('hello    world')).toBe('hello world');
  });

  it('preserves single newlines', () => {
    const result = sanitizeText('hello\nworld');
    expect(result).toContain('\n');
  });

  it('reduces more than 3 consecutive newlines', () => {
    const result = sanitizeText('hello\n\n\n\n\nworld');
    expect(result).toBe('hello\n\n\nworld');
  });

  it('removes zero-width characters', () => {
    // Zero-width chars are simply removed, not replaced with space
    const result = sanitizeText('hel​lo‌wor‍ld﻿');
    expect(result).not.toContain('​'); // no ZWSP
    expect(result).not.toContain('‌'); // no ZWNJ
    expect(result).not.toContain('‍'); // no ZWJ
    expect(result).not.toContain('﻿'); // no BOM
    expect(result).toBe('helloworld');
  });

  it('removes bidirectional control characters', () => {
    // ‎ = LRM, ‏ = RLM
    const result = sanitizeText('hello‎world‏');
    expect(result).toBe('helloworld');
  });

  it('handles normal text unchanged', () => {
    expect(sanitizeText('Hello, World!')).toBe('Hello, World!');
  });

  it('preserves tabs as spaces', () => {
    // Tabs are whitespace but not \n, so collapsed to single space
    const result = sanitizeText('hello\tworld');
    expect(result).toBe('hello world');
  });
});

// ── validateUserMessage ───────────────────────────────────────────────

describe('validateUserMessage', () => {
  it('rejects empty/null input', () => {
    expect(validateUserMessage('')).toEqual({
      valid: false,
      sanitized: '',
      error: 'Il messaggio non può essere vuoto.',
    });
    expect(validateUserMessage(null as any).valid).toBe(false);
    expect(validateUserMessage(undefined as any).valid).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(validateUserMessage(123 as any).valid).toBe(false);
  });

  it('rejects whitespace-only input', () => {
    const result = validateUserMessage('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('troppo corto');
  });

  it('accepts valid message', () => {
    const result = validateUserMessage('Hello World');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Hello World');
    expect(result.error).toBeUndefined();
  });

  it('sanitizes message before validation', () => {
    const result = validateUserMessage('  Hello​ World  ');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Hello World');
  });

  it('rejects message exceeding max length', () => {
    const longMsg = 'a'.repeat(INPUT_LIMITS.maxMessageLength + 1);
    const result = validateUserMessage(longMsg);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('troppo lungo');
  });

  it('accepts message at exactly max length', () => {
    const exactMsg = 'a'.repeat(INPUT_LIMITS.maxMessageLength);
    const result = validateUserMessage(exactMsg);
    expect(result.valid).toBe(true);
  });

  it('accepts single character', () => {
    const result = validateUserMessage('a');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('a');
  });
});

// ── sanitizeMessages ──────────────────────────────────────────────────

describe('sanitizeMessages', () => {
  it('returns empty array for non-array input', () => {
    expect(sanitizeMessages(null as any)).toEqual([]);
    expect(sanitizeMessages(undefined as any)).toEqual([]);
    expect(sanitizeMessages('not array' as any)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(sanitizeMessages([])).toEqual([]);
  });

  it('sanitizes message content', () => {
    const result = sanitizeMessages([
      { role: 'user', content: '  hello​  world  ' },
    ]);
    expect(result).toEqual([{ role: 'user', content: 'hello world' }]);
  });

  it('filters out empty messages after sanitization', () => {
    const result = sanitizeMessages([
      { role: 'user', content: 'valid' },
      { role: 'user', content: '' },
      { role: 'user', content: '   ' },
      { role: 'assistant', content: 'also valid' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('valid');
    expect(result[1].content).toBe('also valid');
  });

  it('limits to maxHistoryMessages', () => {
    const messages = Array.from({ length: 150 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`,
    }));
    const result = sanitizeMessages(messages);
    expect(result.length).toBeLessThanOrEqual(INPUT_LIMITS.maxHistoryMessages);
    // Should keep the LAST 100
    expect(result[0].content).toBe('Message 50');
  });

  it('truncates individual message content to max length', () => {
    const longContent = 'x'.repeat(INPUT_LIMITS.maxMessageLength + 500);
    const result = sanitizeMessages([{ role: 'user', content: longContent }]);
    expect(result[0].content.length).toBeLessThanOrEqual(INPUT_LIMITS.maxMessageLength);
  });

  it('preserves role field', () => {
    const result = sanitizeMessages([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'user message' },
      { role: 'assistant', content: 'response' },
    ]);
    expect(result.map(m => m.role)).toEqual(['system', 'user', 'assistant']);
  });
});

// ── INPUT_LIMITS ──────────────────────────────────────────────────────

describe('INPUT_LIMITS', () => {
  it('has expected limits', () => {
    expect(INPUT_LIMITS.maxMessageLength).toBe(16000);
    expect(INPUT_LIMITS.minMessageLength).toBe(1);
    expect(INPUT_LIMITS.maxHistoryMessages).toBe(100);
    expect(INPUT_LIMITS.maxSystemPromptLength).toBe(16384);
  });
});
