/**
 * Additional tests for src/lib/ttsPreprocessor.ts — buildTTSLightSection
 * (v2 tests already cover preprocessForTTS and buildTTSKnowledgeBase)
 */
import { describe, it, expect } from 'vitest';
import { buildTTSLightSection, preprocessForTTS } from '../../src/lib/ttsPreprocessor';

describe('buildTTSLightSection', () => {
  it('returns TTS-MODE instruction string', () => {
    const result = buildTTSLightSection('it');
    expect(result).toContain('[TTS-MODE]');
    expect(result).toContain('italiana');
  });

  it('adapts to English', () => {
    const result = buildTTSLightSection('en');
    expect(result).toContain('inglese');
  });

  it('adapts to French', () => {
    const result = buildTTSLightSection('fr');
    expect(result).toContain('francese');
  });

  it('adapts to German', () => {
    const result = buildTTSLightSection('de');
    expect(result).toContain('tedesca');
  });

  it('adapts to Spanish', () => {
    const result = buildTTSLightSection('es');
    expect(result).toContain('spagnola');
  });

  it('defaults to Italian', () => {
    const result = buildTTSLightSection();
    expect(result).toContain('italiana');
  });

  it('falls back to uppercase code for unknown language', () => {
    const result = buildTTSLightSection('zz');
    expect(result).toContain('ZZ');
  });

  it('contains key instructions about markdown, numbers, sigle', () => {
    const result = buildTTSLightSection('it');
    expect(result).toContain('markdown');
    expect(result).toContain('Numeri');
    expect(result).toContain('Sigle');
  });

  it('handles extended language codes by taking first 2 chars', () => {
    const result = buildTTSLightSection('en-US');
    expect(result).toContain('inglese');
  });
});

describe('preprocessForTTS — edge cases', () => {
  it('handles horizontal rules', () => {
    const result = preprocessForTTS('before\n---\nafter');
    expect(result).not.toContain('---');
    expect(result).toContain('before');
    expect(result).toContain('after');
  });

  it('handles bold+italic combined', () => {
    const result = preprocessForTTS('***important***');
    expect(result).toBe('important');
  });

  it('handles table-like content', () => {
    const result = preprocessForTTS('| col1 | col2 |');
    expect(result).not.toContain('|');
  });

  it('handles underscore bold and italic', () => {
    const result = preprocessForTTS('__bold__ and _italic_');
    expect(result).toContain('bold');
    expect(result).toContain('italic');
    expect(result).not.toContain('__');
    expect(result).not.toMatch(/_[a-z]/);
  });

  it('normalizes double colons', () => {
    const result = preprocessForTTS('key: : value');
    expect(result).not.toContain(': :');
  });

  it('removes brackets and braces', () => {
    const result = preprocessForTTS('array[0] = {value}');
    expect(result).not.toContain('[');
    expect(result).not.toContain(']');
    expect(result).not.toContain('{');
    expect(result).not.toContain('}');
  });
});
