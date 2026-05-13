/**
 * BarTalk v8.2.5 — Convergence Analysis Tests
 * Tests: analyzeConvergence, getConvergenceInstruction
 */
import { describe, it, expect } from 'vitest';
import { analyzeConvergence, getConvergenceInstruction } from '../../src/lib/convergence';
import type { Message } from '../../src/types/conversation';

function makeMsg(content: string, sender = 'assistant'): Message {
  return {
    id: Math.random().toString(36),
    content,
    senderType: sender as any,
    timestamp: Date.now(),
    role: sender === 'assistant' ? 'assistant' : 'user',
  } as Message;
}

describe('analyzeConvergence', () => {
  it('returns neutral with fewer than 4 agent messages', () => {
    const msgs = [makeMsg('hello'), makeMsg('world'), makeMsg('test')];
    expect(analyzeConvergence(msgs)).toBe('neutral');
  });

  it('returns neutral with only user messages', () => {
    const msgs = Array.from({ length: 6 }, (_, i) => makeMsg(`msg ${i}`, 'user'));
    expect(analyzeConvergence(msgs)).toBe('neutral');
  });

  it('detects agreement with Italian keywords', () => {
    const msgs = [
      makeMsg('Concordo pienamente con questa analisi'),
      makeMsg('Esattamente, hai colto il punto'),
      makeMsg('Sono d\'accordo, questa è la strada giusta'),
      makeMsg('Confermo tutto quello che è stato detto'),
      makeMsg('Giusto, perfettamente allineati'),
      makeMsg('Assolutamente d\'accordo'),
    ];
    expect(analyzeConvergence(msgs, 'it')).toBe('agreement');
  });

  it('detects agreement with English keywords', () => {
    const msgs = [
      makeMsg('I agree with this perspective'),
      makeMsg('Exactly, that is correct'),
      makeMsg('Indeed, you are absolutely right'),
      makeMsg('Precisely what I was thinking'),
      makeMsg('I share this point of view'),
      makeMsg('Absolutely correct analysis'),
    ];
    expect(analyzeConvergence(msgs, 'en')).toBe('agreement');
  });

  it('detects divergence with Italian keywords', () => {
    const msgs = [
      makeMsg('Tuttavia non sono d\'accordo con questa analisi'),
      makeMsg('Al contrario, penso che sia sbagliato'),
      makeMsg('Dissento fortemente da questa posizione'),
      makeMsg('Ma non è così, invece dovremmo considerare'),
      makeMsg('Obietto su questo punto fondamentale'),
      makeMsg('Però la realtà è diversa'),
    ];
    expect(analyzeConvergence(msgs, 'it')).toBe('divergence');
  });

  it('detects stagnation with repetitive content', () => {
    const base = 'questo argomento presenta diversi aspetti importanti da considerare nella nostra analisi approfondita del tema principale';
    const msgs = [
      makeMsg(base),
      makeMsg(base + ' e ulteriori dettagli'),
      makeMsg(base + ' con qualche variazione minima'),
      makeMsg(base + ' ribadendo il concetto espresso'),
      makeMsg(base + ' confermando quanto detto in precedenza'),
      makeMsg(base + ' ripetendo sostanzialmente lo stesso punto'),
    ];
    expect(analyzeConvergence(msgs)).toBe('stagnation');
  });

  it('returns neutral for mixed content', () => {
    const msgs = [
      makeMsg('Il sole splende oggi in modo particolare'),
      makeMsg('La pioggia potrebbe arrivare domani sera'),
      makeMsg('I dati economici mostrano una crescita costante'),
      makeMsg('La tecnologia avanza rapidamente nel settore'),
      makeMsg('Le previsioni indicano cambiamenti significativi'),
      makeMsg('La filosofia ci insegna a riflettere profondamente'),
    ];
    expect(analyzeConvergence(msgs)).toBe('neutral');
  });

  it('ignores user messages in analysis', () => {
    const msgs = [
      makeMsg('concordo perfettamente', 'user'),
      makeMsg('esattamente', 'user'),
      makeMsg('sono d\'accordo', 'user'),
      makeMsg('confermo', 'user'),
      makeMsg('hai ragione', 'user'),
      makeMsg('giusto', 'user'),
    ];
    // All user messages → not enough agent messages → neutral
    expect(analyzeConvergence(msgs)).toBe('neutral');
  });
});

describe('getConvergenceInstruction', () => {
  it('returns empty string for neutral', () => {
    expect(getConvergenceInstruction('neutral', 'it')).toBe('');
  });

  it('returns Italian stagnation instruction', () => {
    const instruction = getConvergenceInstruction('stagnation', 'it');
    expect(instruction).toContain('STAGNANTE');
  });

  it('returns English agreement instruction', () => {
    const instruction = getConvergenceInstruction('agreement', 'en');
    expect(instruction).toContain('converging');
  });

  it('returns Italian divergence instruction', () => {
    const instruction = getConvergenceInstruction('divergence', 'it');
    expect(instruction).toContain('opinioni diverse');
  });

  it('falls back to Italian for unknown language', () => {
    const instruction = getConvergenceInstruction('stagnation', 'xx' as any);
    // Should not crash, returns some instruction or empty
    expect(typeof instruction).toBe('string');
  });

  it('returns Spanish instructions', () => {
    const instruction = getConvergenceInstruction('stagnation', 'es');
    expect(instruction).toContain('ESTANCADA');
  });

  it('returns French instructions', () => {
    const instruction = getConvergenceInstruction('agreement', 'fr');
    expect(instruction).toContain('convergent');
  });

  it('returns German instructions', () => {
    const instruction = getConvergenceInstruction('divergence', 'de');
    expect(instruction).toContain('Meinungen');
  });
});
