/**
 * Tests for src/lib/i18n.ts
 */
import { describe, it, expect, vi } from 'vitest';

// Mock React context
vi.mock('../../src/context/SettingsContext', () => ({
  useSettingsContext: vi.fn(() => ({ language: 'it' })),
}));
vi.mock('../../src/lib/supabase', () => ({ supabase: null }));

import { getT, FULLY_TRANSLATED_LANGS, isFullyTranslated } from '../../src/lib/i18n';

describe('i18n', () => {
  describe('getT', () => {
    it('returns Italian translation for known key', () => {
      const t = getT('it');
      expect(t('settings')).toBe('Impostazioni');
    });

    it('returns English translation for known key', () => {
      const t = getT('en');
      expect(t('settings')).toBe('Settings');
    });

    it('falls back to English when language has no translation for key', () => {
      const t = getT('xx'); // non-existent language
      // Should fall through to en, then it
      const result = t('settings');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns the key itself when no translation exists', () => {
      const t = getT('it');
      expect(t('nonexistent_key_xyz')).toBe('nonexistent_key_xyz');
    });

    it('returns Spanish translations correctly', () => {
      const t = getT('es');
      expect(t('save')).toBe('Guardar');
    });

    it('returns French translations correctly', () => {
      const t = getT('fr');
      const result = t('save');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles empty string language', () => {
      const t = getT('');
      // Should fall back to en or it
      const result = t('settings');
      expect(typeof result).toBe('string');
    });

    it('translations for common keys are different per language', () => {
      const tIt = getT('it');
      const tEn = getT('en');
      expect(tIt('save')).not.toBe(tEn('save'));
    });
  });

  describe('FULLY_TRANSLATED_LANGS', () => {
    it('includes Italian', () => {
      expect(FULLY_TRANSLATED_LANGS).toContain('it');
    });

    it('includes English', () => {
      expect(FULLY_TRANSLATED_LANGS).toContain('en');
    });

    it('includes many languages', () => {
      expect(FULLY_TRANSLATED_LANGS.length).toBeGreaterThanOrEqual(20);
    });

    it('contains only 2-letter codes', () => {
      for (const lang of FULLY_TRANSLATED_LANGS) {
        expect(lang).toMatch(/^[a-z]{2}$/);
      }
    });
  });

  describe('isFullyTranslated', () => {
    it('returns true for Italian', () => {
      expect(isFullyTranslated('it')).toBe(true);
    });

    it('returns true for English', () => {
      expect(isFullyTranslated('en')).toBe(true);
    });

    it('returns false for unknown language', () => {
      expect(isFullyTranslated('xx')).toBe(false);
    });

    it('returns true for Asian languages', () => {
      expect(isFullyTranslated('zh')).toBe(true);
      expect(isFullyTranslated('ja')).toBe(true);
      expect(isFullyTranslated('ko')).toBe(true);
    });

    it('returns true for Arabic', () => {
      expect(isFullyTranslated('ar')).toBe(true);
    });
  });
});
