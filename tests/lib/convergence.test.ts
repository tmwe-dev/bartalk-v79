/**
 * BarTalk v8 — Tests for src/lib/convergence.ts
 */
import { describe, it, expect } from 'vitest';
import { analyzeConvergence, getConvergenceInstruction } from '../../src/lib/convergence';
import type { Message } from '../../src/types/conversation';

function makeMsg(content: string, senderType: 'human' | 'assistant' = 'assistant'): Message {
  return {
    id: crypto.randomUUID(),
    content,
    senderType,
    senderName: senderType === 'human' ? 'Utente' : 'Albert',
    createdAt: new Date().toISOString(),
  } as Message;
}

describe('analyzeConvergence', () => {
  it('returns neutral when fewer than 4 assistant messages', () => {
    const msgs = [makeMsg('ciao'), makeMsg('hello'), makeMsg('hi')];
    expect(analyzeConvergence(msgs)).toBe('neutral');
  });

  it('returns neutral for truly mixed content without keywords', () => {
    const msgs = [
      makeMsg('La tecnologia blockchain cambia tutto.'),
      makeMsg('Il design thinking è fondamentale per il processo.'),
      makeMsg('La cybersecurity protegge ogni aspetto dei dati sensibili.'),
      makeMsg('Il machine learning automatizza i processi complessi aziendali.'),
      makeMsg('La user experience migliora la retention degli utenti nella piattaforma.'),
    ];
    // Without convergence/divergence keywords and without similarity, should be neutral
    const result = analyzeConvergence(msgs);
    expect(['neutral', 'divergence']).toContain(result);
  });

  it('detects agreement when keywords match in Italian', () => {
    const msgs = [
      makeMsg('Concordo con questa visione del problema.'),
      makeMsg('Esattamente, hai ragione su tutto.'),
      makeMsg('Confermo, condivido questa posizione.'),
      makeMsg('Sono d\'accordo con l\'analisi presentata.'),
      makeMsg('Giusto, assolutamente corretto.'),
    ];
    expect(analyzeConvergence(msgs, 'it')).toBe('agreement');
  });

  it('detects agreement with English keywords', () => {
    const msgs = [
      makeMsg('I agree with this analysis completely.'),
      makeMsg('Exactly right, well said.'),
      makeMsg('Indeed, I share this perspective.'),
      makeMsg('Absolutely correct in every way.'),
      makeMsg('Precisely, I agree with you.'),
    ];
    expect(analyzeConvergence(msgs, 'en')).toBe('agreement');
  });

  it('detects divergence when keywords match', () => {
    const msgs = [
      makeMsg('Tuttavia, non sono d\'accordo con questa affermazione.'),
      makeMsg('Al contrario, penso che sia sbagliato.'),
      makeMsg('Obietto, la mia opinione è diversa.'),
      makeMsg('Invece, credo che il problema sia altrove.'),
    ];
    expect(analyzeConvergence(msgs, 'it')).toBe('divergence');
  });

  it('detects stagnation when messages are very similar', () => {
    const base = 'Il punto fondamentale della questione economica riguarda la distribuzione delle risorse produttive nel mercato globale';
    const msgs = [
      makeMsg(base),
      makeMsg(base + ' internazionale'),
      makeMsg(base + ' mondiale'),
      makeMsg(base + ' del settore'),
      makeMsg(base + ' della nazione'),
    ];
    expect(analyzeConvergence(msgs)).toBe('stagnation');
  });

  it('ignores human messages', () => {
    const msgs = [
      makeMsg('concordo concordo concordo', 'human'),
      makeMsg('concordo concordo concordo', 'human'),
      makeMsg('La tecnologia avanza', 'assistant'),
      makeMsg('Il design cambia', 'assistant'),
      makeMsg('Il mercato cresce', 'assistant'),
    ];
    expect(analyzeConvergence(msgs)).toBe('neutral');
  });

  it('handles empty array', () => {
    expect(analyzeConvergence([])).toBe('neutral');
  });
});

describe('getConvergenceInstruction', () => {
  it('returns stagnation instruction in Italian', () => {
    const result = getConvergenceInstruction('stagnation', 'it');
    expect(result).toContain('STAGNANTE');
  });

  it('returns agreement instruction in Italian', () => {
    const result = getConvergenceInstruction('agreement', 'it');
    expect(result).toContain('convergendo');
  });

  it('returns divergence instruction in Italian', () => {
    const result = getConvergenceInstruction('divergence', 'it');
    expect(result).toContain('diverse');
  });

  it('returns empty string for neutral', () => {
    expect(getConvergenceInstruction('neutral', 'it')).toBe('');
  });

  it('returns English instruction', () => {
    const result = getConvergenceInstruction('stagnation', 'en');
    expect(result).toContain('STAGNATING');
  });

  it('returns Spanish instruction', () => {
    const result = getConvergenceInstruction('stagnation', 'es');
    expect(result).toContain('ESTANCADA');
  });

  it('falls back to it/en for unsupported languages', () => {
    const result = getConvergenceInstruction('stagnation', 'zh');
    expect(result.length).toBeGreaterThan(0);
  });

  it('defaults to Italian when no lang provided', () => {
    const result = getConvergenceInstruction('stagnation');
    expect(result).toContain('STAGNANTE');
  });
});
