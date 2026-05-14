/**
 * Tests for src/lib/structuredPrompts.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({ supabase: null }));
vi.mock('../../src/lib/dbSync', () => ({
  pushSystemPrompts: vi.fn().mockResolvedValue(undefined),
  pushPersonalitySections: vi.fn().mockResolvedValue(undefined),
  pushComposedPrompts: vi.fn().mockResolvedValue(undefined),
}));

import {
  loadSystemPrompts,
  saveSystemPrompt,
  loadPersonalitySections,
  savePersonalitySection,
  deletePersonalitySection,
  loadComposedPrompts,
  saveComposedPrompt,
  getActiveComposedPromptId,
  setActiveComposedPromptId,
  loadCumulativeSummary,
  saveCumulativeSummary,
  composePromptForAgent,
} from '../../src/lib/structuredPrompts';

describe('structuredPrompts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadSystemPrompts', () => {
    it('returns default prompt when nothing saved', () => {
      const prompts = loadSystemPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0].id).toBe('default');
      expect(prompts[0].isDefault).toBe(true);
    });

    it('returns saved prompts', () => {
      const custom = [{ id: 'p1', name: 'Custom', content: 'Custom content', isDefault: false, createdAt: '' }];
      localStorage.setItem('bartalk_system_prompts', JSON.stringify(custom));
      expect(loadSystemPrompts()).toEqual(custom);
    });
  });

  describe('saveSystemPrompt', () => {
    it('adds new prompt', () => {
      saveSystemPrompt({ id: 'p1', name: 'Test', content: 'Content', isDefault: false, createdAt: '' });
      const prompts = loadSystemPrompts();
      expect(prompts.find(p => p.id === 'p1')).toBeDefined();
    });

    it('updates existing prompt', () => {
      saveSystemPrompt({ id: 'p1', name: 'V1', content: 'Old', isDefault: false, createdAt: '' });
      saveSystemPrompt({ id: 'p1', name: 'V2', content: 'New', isDefault: false, createdAt: '' });
      const prompts = loadSystemPrompts();
      const p = prompts.find(p => p.id === 'p1');
      expect(p?.name).toBe('V2');
      expect(p?.content).toBe('New');
    });
  });

  describe('loadPersonalitySections / savePersonalitySection / deletePersonalitySection', () => {
    it('returns empty array initially', () => {
      expect(loadPersonalitySections()).toEqual([]);
    });

    it('saves and loads personality section', () => {
      const section = {
        id: 's1', agentId: 'a1', name: 'Test', content: 'Be creative',
        isActive: true, createdAt: '',
      };
      savePersonalitySection(section);
      expect(loadPersonalitySections()).toEqual([section]);
    });

    it('deletes personality section', () => {
      savePersonalitySection({
        id: 's1', agentId: 'a1', name: 'Test', content: 'Be creative',
        isActive: true, createdAt: '',
      });
      deletePersonalitySection('s1');
      expect(loadPersonalitySections()).toEqual([]);
    });
  });

  describe('loadComposedPrompts / saveComposedPrompt', () => {
    it('returns empty array initially', () => {
      expect(loadComposedPrompts()).toEqual([]);
    });

    it('saves and loads composed prompt', () => {
      const prompt = {
        id: 'c1', name: 'Composed', systemPromptId: 'default',
        personalitySectionIds: ['s1'], createdAt: '', updatedAt: '',
      };
      saveComposedPrompt(prompt);
      const loaded = loadComposedPrompts();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('c1');
    });

    it('updates updatedAt on save', () => {
      const prompt = {
        id: 'c1', name: 'Composed', systemPromptId: 'default',
        personalitySectionIds: [], createdAt: '', updatedAt: 'old',
      };
      saveComposedPrompt(prompt);
      // Save again to trigger update
      saveComposedPrompt({ ...prompt, name: 'Updated' });
      const loaded = loadComposedPrompts();
      expect(loaded[0].updatedAt).not.toBe('old');
    });
  });

  describe('getActiveComposedPromptId / setActiveComposedPromptId', () => {
    it('returns null initially', () => {
      expect(getActiveComposedPromptId()).toBeNull();
    });

    it('sets and gets active prompt id', () => {
      setActiveComposedPromptId('c1');
      expect(getActiveComposedPromptId()).toBe('c1');
    });

    it('clears active prompt id with null', () => {
      setActiveComposedPromptId('c1');
      setActiveComposedPromptId(null);
      expect(getActiveComposedPromptId()).toBeNull();
    });
  });

  describe('loadCumulativeSummary / saveCumulativeSummary', () => {
    it('returns null for unknown conversation', () => {
      expect(loadCumulativeSummary('unknown')).toBeNull();
    });

    it('saves and loads summary', () => {
      const summary = {
        conversationId: 'conv-1',
        summary: 'Summary text',
        messageCount: 10,
        updatedAt: '',
      };
      saveCumulativeSummary(summary);
      expect(loadCumulativeSummary('conv-1')).toEqual(summary);
    });

    it('updates existing summary', () => {
      saveCumulativeSummary({ conversationId: 'conv-1', summary: 'V1', messageCount: 5, updatedAt: '' });
      saveCumulativeSummary({ conversationId: 'conv-1', summary: 'V2', messageCount: 10, updatedAt: '' });
      expect(loadCumulativeSummary('conv-1')?.summary).toBe('V2');
    });
  });

  describe('composePromptForAgent', () => {
    it('returns default system prompt for agent without config', () => {
      const prompt = composePromptForAgent('a1');
      expect(prompt).toContain('BarTalk');
    });

    it('includes agent-specific personality sections', () => {
      savePersonalitySection({
        id: 's1', agentId: 'a1', name: 'Bold', content: 'Be bold and daring',
        isActive: true, createdAt: '',
      });
      const prompt = composePromptForAgent('a1');
      expect(prompt).toContain('Be bold and daring');
    });

    it('excludes inactive personality sections', () => {
      savePersonalitySection({
        id: 's1', agentId: 'a1', name: 'Inactive', content: 'Should not appear',
        isActive: false, createdAt: '',
      });
      const prompt = composePromptForAgent('a1');
      expect(prompt).not.toContain('Should not appear');
    });

    it('includes cumulative summary when available', () => {
      saveCumulativeSummary({
        conversationId: 'conv-1',
        summary: 'Previous discussion about AI',
        messageCount: 20,
        updatedAt: '',
      });
      const prompt = composePromptForAgent('a1', null, 'conv-1');
      expect(prompt).toContain('Previous discussion about AI');
    });

    it('includes composed prompt sections', () => {
      saveSystemPrompt({ id: 'custom', name: 'Custom', content: 'Custom system', isDefault: false, createdAt: '' });
      savePersonalitySection({
        id: 's1', agentId: '', name: 'Section', content: 'Extra section content',
        isActive: true, createdAt: '',
      });
      saveComposedPrompt({
        id: 'c1', name: 'Composed', systemPromptId: 'custom',
        personalitySectionIds: ['s1'], additionalContext: 'Extra context',
        createdAt: '', updatedAt: '',
      });
      const prompt = composePromptForAgent('a1', 'c1');
      expect(prompt).toContain('Custom system');
      expect(prompt).toContain('Extra section content');
      expect(prompt).toContain('Extra context');
    });
  });
});
