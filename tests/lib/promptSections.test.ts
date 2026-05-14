/**
 * Tests for src/lib/promptSections.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  loadPromptSections,
  savePromptSections,
  addPromptSection,
  updatePromptSection,
  deletePromptSection,
  resolveActiveSections,
  buildSectionsBlock,
  EXAMPLE_SECTIONS,
} from '../../src/lib/promptSections';
import type { PromptSection } from '../../src/lib/promptSections';

const makeSection = (overrides: Partial<PromptSection> = {}): PromptSection => ({
  id: 's1',
  type: 'rules',
  title: 'Test Rule',
  content: 'Test content',
  tags: [],
  priority: 1,
  enabled: true,
  createdAt: '2024-01-01',
  ...overrides,
});

describe('promptSections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadPromptSections / savePromptSections', () => {
    it('returns empty array initially', () => {
      expect(loadPromptSections()).toEqual([]);
    });

    it('round-trips sections', () => {
      const sections = [makeSection()];
      savePromptSections(sections);
      expect(loadPromptSections()).toEqual(sections);
    });

    it('handles corrupted localStorage', () => {
      localStorage.setItem('bartalk_prompt_sections', 'corrupted');
      expect(loadPromptSections()).toEqual([]);
    });
  });

  describe('addPromptSection', () => {
    it('adds section to storage', () => {
      addPromptSection(makeSection({ id: 's1' }));
      expect(loadPromptSections()).toHaveLength(1);
    });

    it('adds multiple sections', () => {
      addPromptSection(makeSection({ id: 's1' }));
      addPromptSection(makeSection({ id: 's2' }));
      expect(loadPromptSections()).toHaveLength(2);
    });
  });

  describe('updatePromptSection', () => {
    it('updates existing section', () => {
      addPromptSection(makeSection({ id: 's1', title: 'Old' }));
      updatePromptSection('s1', { title: 'New' });
      expect(loadPromptSections()[0].title).toBe('New');
    });

    it('does nothing for non-existent id', () => {
      addPromptSection(makeSection({ id: 's1' }));
      updatePromptSection('s99', { title: 'New' });
      expect(loadPromptSections()[0].title).toBe('Test Rule');
    });

    it('preserves other fields', () => {
      addPromptSection(makeSection({ id: 's1', title: 'Title', content: 'Content' }));
      updatePromptSection('s1', { title: 'Updated' });
      expect(loadPromptSections()[0].content).toBe('Content');
    });
  });

  describe('deletePromptSection', () => {
    it('removes section', () => {
      addPromptSection(makeSection({ id: 's1' }));
      deletePromptSection('s1');
      expect(loadPromptSections()).toHaveLength(0);
    });

    it('does nothing for non-existent id', () => {
      addPromptSection(makeSection({ id: 's1' }));
      deletePromptSection('s99');
      expect(loadPromptSections()).toHaveLength(1);
    });
  });

  describe('resolveActiveSections', () => {
    it('returns empty when no sections exist', () => {
      expect(resolveActiveSections('hello')).toEqual([]);
    });

    it('includes enabled rules sections always', () => {
      addPromptSection(makeSection({ id: 's1', type: 'rules', enabled: true }));
      const result = resolveActiveSections('anything');
      expect(result).toHaveLength(1);
    });

    it('includes enabled context sections always', () => {
      addPromptSection(makeSection({ id: 's1', type: 'context', enabled: true }));
      const result = resolveActiveSections('anything');
      expect(result).toHaveLength(1);
    });

    it('excludes disabled sections', () => {
      addPromptSection(makeSection({ id: 's1', type: 'rules', enabled: false }));
      expect(resolveActiveSections('anything')).toHaveLength(0);
    });

    it('includes topic sections only when tag matches', () => {
      addPromptSection(makeSection({
        id: 's1', type: 'topic', enabled: true,
        tags: ['economia', 'finanza'],
      }));
      expect(resolveActiveSections('parliamo di economia')).toHaveLength(1);
      expect(resolveActiveSections('parliamo di sport')).toHaveLength(0);
    });

    it('tag matching is case-insensitive', () => {
      addPromptSection(makeSection({
        id: 's1', type: 'topic', enabled: true,
        tags: ['Economia'],
      }));
      expect(resolveActiveSections('parliamo di economia')).toHaveLength(1);
    });

    it('sorts by priority', () => {
      addPromptSection(makeSection({ id: 's2', type: 'rules', priority: 5 }));
      addPromptSection(makeSection({ id: 's1', type: 'rules', priority: 1 }));
      const result = resolveActiveSections('test');
      expect(result[0].priority).toBe(1);
      expect(result[1].priority).toBe(5);
    });
  });

  describe('buildSectionsBlock', () => {
    it('returns empty string when no active sections', () => {
      expect(buildSectionsBlock('hello')).toBe('');
    });

    it('builds formatted block with sections', () => {
      addPromptSection(makeSection({ id: 's1', type: 'rules', title: 'Format', content: 'Use bullets' }));
      const block = buildSectionsBlock('test');
      expect(block).toContain('REGOLE PERSONALIZZATE');
      expect(block).toContain('Format');
      expect(block).toContain('Use bullets');
      expect(block).toContain('FINE REGOLE');
    });

    it('uses correct emoji for each type', () => {
      addPromptSection(makeSection({ id: 's1', type: 'rules', title: 'R' }));
      addPromptSection(makeSection({ id: 's2', type: 'context', title: 'C' }));
      const block = buildSectionsBlock('test');
      expect(block).toContain('\u{1F4CB}'); // rules emoji
      expect(block).toContain('\u{1F4D6}'); // context emoji
    });
  });

  describe('EXAMPLE_SECTIONS', () => {
    it('has 3 example sections', () => {
      expect(EXAMPLE_SECTIONS).toHaveLength(3);
    });

    it('covers all types', () => {
      const types = EXAMPLE_SECTIONS.map(s => s.type);
      expect(types).toContain('rules');
      expect(types).toContain('topic');
      expect(types).toContain('context');
    });

    it('all examples are disabled by default', () => {
      expect(EXAMPLE_SECTIONS.every(s => !s.enabled)).toBe(true);
    });
  });
});
