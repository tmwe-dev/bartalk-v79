/**
 * BarTalk v8 — Tests for src/lib/voiceSuggester.ts
 */
import { describe, it, expect } from 'vitest';
import { suggestVoicesForLanguage } from '../../src/lib/voiceSuggester';
import type { ElevenLabsVoice } from '../../src/lib/voiceSuggester';

vi.mock('../../src/lib/constants', () => ({
  TTS: { apiBase: 'https://api.elevenlabs.io/v1' },
}));

const mockVoices: ElevenLabsVoice[] = [
  { voice_id: 'v1', name: 'Marco', labels: { language: 'italian', gender: 'male', accent: 'italian' } },
  { voice_id: 'v2', name: 'Giulia', labels: { language: 'italian', gender: 'female', accent: 'italian' } },
  { voice_id: 'v3', name: 'Roberto', labels: { language: 'italian', gender: 'male', accent: 'italian' } },
  { voice_id: 'v4', name: 'Lucia', labels: { language: 'italian', gender: 'female', accent: 'italian' } },
  { voice_id: 'v5', name: 'John', labels: { language: 'english', gender: 'male', accent: 'american' } },
  { voice_id: 'v6', name: 'Sarah', labels: { language: 'english', gender: 'female', accent: 'british' } },
];

const agents = ['albert', 'archimede', 'pitagora', 'newton'];
const twoAgents = ['albert', 'archimede'];

describe('suggestVoicesForLanguage', () => {
  it('returns suggestions for available language with 2 agents', () => {
    const result = suggestVoicesForLanguage('it', mockVoices, twoAgents);
    expect(result).toHaveLength(2);
    expect(result[0].agentName).toBe('albert');
    expect(result[0].voiceId).toBeTruthy();
  });

  it('returns empty when not enough voices', () => {
    const result = suggestVoicesForLanguage('en', mockVoices, agents);
    // Only 2 English voices for 4 agents
    expect(result).toHaveLength(0);
  });

  it('handles ISO code normalization for 2 agents', () => {
    const result = suggestVoicesForLanguage('italian', mockVoices, twoAgents);
    expect(result).toHaveLength(2);
  });

  it('handles ISO code for 2 agents', () => {
    const result = suggestVoicesForLanguage('it', mockVoices, twoAgents);
    expect(result).toHaveLength(2);
  });

  it('returns empty for unknown language', () => {
    const result = suggestVoicesForLanguage('swahili', mockVoices, agents);
    expect(result).toHaveLength(0);
  });

  it('returns empty when voices array is empty', () => {
    const result = suggestVoicesForLanguage('it', [], agents);
    expect(result).toHaveLength(0);
  });

  it('returns empty when agents array is empty', () => {
    const result = suggestVoicesForLanguage('it', mockVoices, []);
    expect(result).toHaveLength(0);
  });

  it('maps each suggestion to the correct agent', () => {
    const result = suggestVoicesForLanguage('it', mockVoices, twoAgents);
    result.forEach((s, i) => {
      expect(s.agentName).toBe(twoAgents[i]);
      expect(s.voiceName).toBeTruthy();
    });
  });

  it('handles voices without labels', () => {
    const noLabelVoices: ElevenLabsVoice[] = [
      { voice_id: 'x1', name: 'NoLabel1' },
      { voice_id: 'x2', name: 'NoLabel2' },
    ];
    const result = suggestVoicesForLanguage('it', noLabelVoices, ['agent1']);
    expect(result).toHaveLength(0);
  });
});
