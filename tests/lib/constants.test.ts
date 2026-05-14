/**
 * BarTalk v8 — Tests for src/lib/constants.ts
 */
import { describe, it, expect } from 'vitest';
import { UI, DEFAULT_MODELS, TTS, ORCHESTRATOR, SKIP_MODE, RATE_LIMITS, PROXY_URL } from '../../src/lib/constants';

describe('UI constants', () => {
  it('has appName', () => {
    expect(UI.appName).toBe('BarTalk');
  });
  it('has appVersion in semver format', () => {
    expect(UI.appVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
  it('has all required text keys', () => {
    expect(UI.send).toBeTruthy();
    expect(UI.placeholder).toBeTruthy();
    expect(UI.settings).toBeTruthy();
    expect(UI.save).toBeTruthy();
    expect(UI.cancel).toBeTruthy();
    expect(UI.close).toBeTruthy();
    expect(UI.enabled).toBeTruthy();
    expect(UI.disabled).toBeTruthy();
  });
});

describe('DEFAULT_MODELS', () => {
  it('has all providers', () => {
    expect(DEFAULT_MODELS.openai).toBeTruthy();
    expect(DEFAULT_MODELS.anthropic).toBeTruthy();
    expect(DEFAULT_MODELS.gemini).toBeTruthy();
    expect(DEFAULT_MODELS.groq).toBeTruthy();
    expect(DEFAULT_MODELS.xai).toBeTruthy();
  });
  it('openai defaults to gpt-4o', () => {
    expect(DEFAULT_MODELS.openai).toBe('gpt-4o');
  });
});

describe('TTS', () => {
  it('has required fields', () => {
    expect(TTS.model).toBeTruthy();
    expect(TTS.stability).toBeGreaterThan(0);
    expect(TTS.stability).toBeLessThanOrEqual(1);
    expect(TTS.similarityBoost).toBeGreaterThan(0);
    expect(TTS.maxChars).toBeGreaterThan(0);
    expect(TTS.apiBase).toContain('elevenlabs');
  });
});

describe('ORCHESTRATOR', () => {
  it('has default temperature', () => {
    expect(ORCHESTRATOR.defaultTemperature).toBe(0.7);
  });
  it('has word range as tuple', () => {
    expect(ORCHESTRATOR.wordRange).toHaveLength(2);
    expect(ORCHESTRATOR.wordRange[0]).toBeLessThan(ORCHESTRATOR.wordRange[1]);
  });
  it('has temperature by mode', () => {
    expect(ORCHESTRATOR.temperatureByMode.standard).toBeLessThanOrEqual(1);
    expect(ORCHESTRATOR.temperatureByMode.consultation).toBeLessThanOrEqual(1);
    expect(ORCHESTRATOR.temperatureByMode.bar_realtime).toBeLessThanOrEqual(1);
  });
  it('has history slice by mode', () => {
    expect(ORCHESTRATOR.historySlice.standard).toBeGreaterThan(0);
    expect(ORCHESTRATOR.historySlice.consultation).toBeGreaterThan(0);
  });
  it('forced consultation turns is positive', () => {
    expect(ORCHESTRATOR.forcedConsultationTurns).toBeGreaterThan(0);
  });
});

describe('SKIP_MODE', () => {
  it('has reasonable limits', () => {
    expect(SKIP_MODE.maxAIMessages).toBeGreaterThan(0);
    expect(SKIP_MODE.maxTTSRequests).toBeGreaterThan(0);
    expect(SKIP_MODE.expiryDays).toBeGreaterThan(0);
    expect(SKIP_MODE.warningThresholdPercent).toBeGreaterThan(50);
    expect(SKIP_MODE.warningThresholdPercent).toBeLessThanOrEqual(100);
  });
});

describe('RATE_LIMITS', () => {
  it('has positive limits', () => {
    expect(RATE_LIMITS.aiRequestsPerMinute).toBeGreaterThan(0);
    expect(RATE_LIMITS.ttsRequestsPerMinute).toBeGreaterThan(0);
    expect(RATE_LIMITS.inputMaxChars).toBeGreaterThan(0);
  });
});

describe('PROXY_URL', () => {
  it('points to ai-proxy', () => {
    expect(PROXY_URL).toBe('/api/ai-proxy');
  });
});
