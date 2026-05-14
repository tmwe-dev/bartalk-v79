/**
 * BarTalk v8 — Tests for src/lib/utils.ts
 */
import { describe, it, expect } from 'vitest';
import { generateId, now, truncate, stripHtml, formatDuration, formatTime, sleep, cn } from '../../src/lib/utils';

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });
  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()));
    expect(ids.size).toBe(20);
  });
});

describe('now', () => {
  it('returns a valid ISO string', () => {
    const result = now();
    expect(new Date(result).toISOString()).toBe(result);
  });
});

describe('truncate', () => {
  it('returns text as-is when shorter than maxLen', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
  it('truncates and adds ellipsis when longer', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });
  it('returns text as-is when equal to maxLen', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });
  it('handles string without tags', () => {
    expect(stripHtml('plain text')).toBe('plain text');
  });
  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });
  it('handles self-closing tags', () => {
    expect(stripHtml('line1<br/>line2')).toBe('line1line2');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds for values under 1000', () => {
    expect(formatDuration(500)).toBe('500ms');
  });
  it('formats seconds for values over 1000', () => {
    expect(formatDuration(1500)).toBe('1.5s');
  });
  it('formats exactly 1000ms as 1.0s', () => {
    expect(formatDuration(1000)).toBe('1.0s');
  });
  it('formats 0ms', () => {
    expect(formatDuration(0)).toBe('0ms');
  });
});

describe('formatTime', () => {
  it('returns a time string', () => {
    const result = formatTime('2025-01-15T14:30:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('sleep', () => {
  it('resolves after the given time', async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });
  it('filters out falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
  it('returns empty string when all falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
