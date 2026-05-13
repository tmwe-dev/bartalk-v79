import { describe, it, expect } from 'vitest';
import {
  COURSE_CATALOG,
  CUSTOM_DIRECTIONS,
  buildTopicFromTemplate,
  buildCustomizationInstructions,
} from '../../src/lib/courseCatalog';
import type { CourseTemplate, CourseFocus } from '../../src/lib/courseCatalog';

describe('courseCatalog', () => {
  describe('COURSE_CATALOG', () => {
    it('should have 19 entries', () => {
      expect(COURSE_CATALOG).toHaveLength(19);
    });

    it('every template has required fields', () => {
      for (const t of COURSE_CATALOG) {
        expect(t.id).toBeTruthy();
        expect(t.title).toBeTruthy();
        expect(t.icon).toBeTruthy();
        expect(t.category).toBeTruthy();
        expect(t.availableLevels.length).toBeGreaterThan(0);
        expect(t.focuses.length).toBeGreaterThan(0);
      }
    });

    it('all template ids are unique', () => {
      const ids = COURSE_CATALOG.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('CUSTOM_DIRECTIONS', () => {
    it('has 4 directions', () => {
      expect(CUSTOM_DIRECTIONS).toHaveLength(4);
    });

    it('includes broader, narrower, practical, theoretical', () => {
      const ids = CUSTOM_DIRECTIONS.map(d => d.id);
      expect(ids).toContain('broader');
      expect(ids).toContain('narrower');
      expect(ids).toContain('practical');
      expect(ids).toContain('theoretical');
    });
  });

  describe('buildTopicFromTemplate', () => {
    const template = COURSE_CATALOG[0]; // english

    it('returns template title when no focus or freeText', () => {
      const result = buildTopicFromTemplate(template, null, null, '');
      expect(result).toBe(template.title);
    });

    it('appends focus label with dash separator', () => {
      const focus = template.focuses[0];
      const result = buildTopicFromTemplate(template, focus, null, '');
      expect(result).toBe(`${template.title} — ${focus.label}`);
    });

    it('appends freeText with colon separator', () => {
      const result = buildTopicFromTemplate(template, null, null, 'Travel situations');
      expect(result).toBe(`${template.title}: Travel situations`);
    });

    it('combines focus and freeText', () => {
      const focus = template.focuses[0];
      const result = buildTopicFromTemplate(template, focus, null, 'With slang');
      expect(result).toContain(focus.label);
      expect(result).toContain('With slang');
    });

    it('trims whitespace from freeText', () => {
      const result = buildTopicFromTemplate(template, null, null, '  hello  ');
      expect(result).toBe(`${template.title}: hello`);
    });

    it('ignores empty whitespace freeText', () => {
      const result = buildTopicFromTemplate(template, null, null, '   ');
      expect(result).toBe(template.title);
    });
  });

  describe('buildCustomizationInstructions', () => {
    const template = COURSE_CATALOG[0];

    it('returns empty string when no options set', () => {
      const result = buildCustomizationInstructions(template, null, null, '');
      expect(result).toBe('');
    });

    it('includes focus description when focus provided', () => {
      const focus = template.focuses[0];
      const result = buildCustomizationInstructions(template, focus, null, '');
      expect(result).toContain('FOCUS SPECIFICO');
      expect(result).toContain(focus.label);
      expect(result).toContain(focus.description);
    });

    it('includes direction hint when direction provided', () => {
      const result = buildCustomizationInstructions(template, null, 'practical', '');
      expect(result).toContain('DIREZIONE');
      expect(result).toContain('pratico');
    });

    it('includes user freeText instructions', () => {
      const result = buildCustomizationInstructions(template, null, null, 'Focus on verbs');
      expect(result).toContain('ISTRUZIONI AGGIUNTIVE');
      expect(result).toContain('Focus on verbs');
    });

    it('combines all options with newlines', () => {
      const focus = template.focuses[0];
      const result = buildCustomizationInstructions(template, focus, 'broader', 'Extra detail');
      expect(result).toContain('FOCUS SPECIFICO');
      expect(result).toContain('DIREZIONE');
      expect(result).toContain('ISTRUZIONI AGGIUNTIVE');
      const parts = result.split('\n');
      expect(parts.length).toBe(3);
    });
  });
});
