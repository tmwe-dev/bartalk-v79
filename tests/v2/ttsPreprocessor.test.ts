/**
 * BarTalk v8.2.5 — TTS Preprocessor Tests
 * Tests: preprocessForTTS, buildTTSKnowledgeBase
 */
import { describe, it, expect } from 'vitest';
import { preprocessForTTS, buildTTSKnowledgeBase } from '../../src/lib/ttsPreprocessor';

describe('preprocessForTTS', () => {
  it('returns empty string for empty input', () => {
    expect(preprocessForTTS('')).toBe('');
    expect(preprocessForTTS('   ')).toBe('');
  });

  it('strips markdown headers', () => {
    const result = preprocessForTTS('## Titolo Importante');
    expect(result).not.toContain('#');
    expect(result).toContain('Titolo Importante');
  });

  it('strips bold markdown', () => {
    expect(preprocessForTTS('questo è **grassetto** qui')).toContain('grassetto');
    expect(preprocessForTTS('questo è **grassetto** qui')).not.toContain('**');
  });

  it('strips italic markdown', () => {
    expect(preprocessForTTS('questo è *corsivo* qui')).toContain('corsivo');
    expect(preprocessForTTS('questo è *corsivo* qui')).not.toContain('*corsivo*');
  });

  it('strips strikethrough', () => {
    const result = preprocessForTTS('~~cancellato~~ testo');
    expect(result).not.toContain('~~');
    expect(result).toContain('cancellato');
  });

  it('removes code blocks', () => {
    const result = preprocessForTTS('prima ```const x = 1;``` dopo');
    expect(result).not.toContain('const');
    expect(result).toContain('prima');
    expect(result).toContain('dopo');
  });

  it('strips inline code', () => {
    const result = preprocessForTTS('usa `npm install` per installare');
    expect(result).not.toContain('`');
    expect(result).toContain('npm install');
  });

  it('removes image markdown', () => {
    const result = preprocessForTTS('ecco ![immagine](url.png) e testo');
    expect(result).not.toContain('![');
    expect(result).not.toContain('url.png');
  });

  it('converts links to text only', () => {
    const result = preprocessForTTS('visita [Google](https://google.com)');
    expect(result).toContain('Google');
    expect(result).not.toContain('https://');
  });

  it('converts bullet lists to pauses', () => {
    const result = preprocessForTTS('- primo\n- secondo\n- terzo');
    expect(result).not.toContain('-');
    expect(result).toContain('primo');
  });

  it('converts numbered lists to pauses', () => {
    const result = preprocessForTTS('1. primo\n2. secondo');
    expect(result).toContain('primo');
    expect(result).toContain('secondo');
  });

  it('strips blockquotes', () => {
    const result = preprocessForTTS('> citazione importante');
    expect(result).not.toContain('>');
    expect(result).toContain('citazione importante');
  });

  it('strips emoji', () => {
    const result = preprocessForTTS('ciao 😀 mondo 🌍');
    expect(result).not.toMatch(/[\u{1F600}-\u{1F64F}]/u);
    expect(result).toContain('ciao');
    expect(result).toContain('mondo');
  });

  it('normalizes multiple exclamation marks', () => {
    const result = preprocessForTTS('fantastico!!!');
    expect(result).toBe('fantastico!');
  });

  it('normalizes multiple question marks', () => {
    const result = preprocessForTTS('davvero???');
    expect(result).toBe('davvero?');
  });

  it('converts parentheses to pauses', () => {
    const result = preprocessForTTS('il gatto (nero) dorme');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
    expect(result).toContain('gatto');
    expect(result).toContain('nero');
  });

  it('removes quotes', () => {
    const result = preprocessForTTS('disse "ciao" al mondo');
    expect(result).not.toContain('"');
    expect(result).toContain('ciao');
  });

  it('collapses multiple spaces', () => {
    const result = preprocessForTTS('troppi    spazi    qui');
    expect(result).not.toContain('    ');
  });

  it('handles complex markdown documents', () => {
    const markdown = `# Titolo

## Sezione 1

Testo con **grassetto** e *corsivo*.

- Punto 1
- Punto 2

> Citazione

\`\`\`
codice
\`\`\`

Visita [link](https://example.com).`;

    const result = preprocessForTTS(markdown);
    expect(result).not.toContain('#');
    expect(result).not.toContain('**');
    expect(result).not.toContain('`');
    expect(result).not.toContain('https://');
    expect(result).toContain('Titolo');
    expect(result).toContain('Sezione');
  });
});

describe('buildTTSKnowledgeBase', () => {
  it('returns TTS instructions string', () => {
    const kb = buildTTSKnowledgeBase('it');
    expect(kb).toContain('[TTS-MODE]');
    expect(kb).toContain('italiana');
  });

  it('adapts to English language', () => {
    const kb = buildTTSKnowledgeBase('en');
    expect(kb).toContain('inglese');
  });

  it('adapts to French language', () => {
    const kb = buildTTSKnowledgeBase('fr');
    expect(kb).toContain('francese');
  });

  it('contains rules for symbols', () => {
    const kb = buildTTSKnowledgeBase('it');
    expect(kb).toContain('SIMBOLI');
  });

  it('contains rules for numbers', () => {
    const kb = buildTTSKnowledgeBase('it');
    expect(kb).toContain('NUMERI');
  });

  it('falls back for unknown language code', () => {
    const kb = buildTTSKnowledgeBase('zz');
    expect(kb).toContain('ZZ');  // falls back to code.toUpperCase()
  });

  it('defaults to Italian', () => {
    const kb = buildTTSKnowledgeBase();
    expect(kb).toContain('italiana');
  });
});
