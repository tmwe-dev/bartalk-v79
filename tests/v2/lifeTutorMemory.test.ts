import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase before importing memory module
vi.mock('../../src/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

import {
  addMemory,
  loadAllMemoriesLocal,
  getRecentMemories,
  getMemoriesByTags,
  searchMemories,
  getMemoriesForCourse,
  clearAllMemories,
  consolidateMemories,
  touchMemory,
  getMemoryStats,
  detectContextTags,
  deleteMemory,
} from '../../src/lib/lifeTutor/memory';
import type { MemoryEntry } from '../../src/types/lifeTutor';

function makeMemoryInput(overrides: Partial<MemoryEntry> = {}) {
  return {
    content: overrides.content ?? 'Test memory content',
    summary: overrides.summary ?? 'Test summary',
    tags: overrides.tags ?? (['studio'] as MemoryEntry['tags']),
    importance: overrides.importance ?? 3,
    layer: overrides.layer ?? ('recent' as const),
    source: overrides.source ?? ('user_input' as const),
    courseId: overrides.courseId,
    emotion: overrides.emotion,
  };
}

describe('lifeTutorMemory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('addMemory', () => {
    it('adds a memory and returns it with generated fields', async () => {
      const result = await addMemory(makeMemoryInput());
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.lastAccessedAt).toBeTruthy();
      expect(result.accessCount).toBe(0);
      expect(result.content).toBe('Test memory content');
    });

    it('persists to localStorage', async () => {
      await addMemory(makeMemoryInput());
      const all = loadAllMemoriesLocal();
      expect(all).toHaveLength(1);
    });

    it('can add multiple memories sequentially', async () => {
      await addMemory(makeMemoryInput({ content: 'First' }));
      await addMemory(makeMemoryInput({ content: 'Second' }));
      const all = loadAllMemoriesLocal();
      expect(all).toHaveLength(2);
    });
  });

  describe('getRecentMemories', () => {
    it('returns empty array when no memories exist', () => {
      expect(getRecentMemories()).toEqual([]);
    });

    it('returns memories with layer=recent', async () => {
      await addMemory(makeMemoryInput({ layer: 'recent' as const }));
      const recent = getRecentMemories();
      expect(recent.length).toBeGreaterThanOrEqual(1);
    });

    it('returns max 30 memories', async () => {
      for (let i = 0; i < 35; i++) {
        await addMemory(makeMemoryInput({ content: `Mem ${i}` }));
      }
      const recent = getRecentMemories();
      expect(recent.length).toBeLessThanOrEqual(30);
    });
  });

  describe('clearAllMemories', () => {
    it('removes all memories from localStorage', async () => {
      await addMemory(makeMemoryInput());
      clearAllMemories();
      const all = loadAllMemoriesLocal();
      expect(all).toEqual([]);
    });
  });

  describe('consolidateMemories', () => {
    it('promotes old recent memories with importance >= 3 to consolidated', async () => {
      // Create a memory with old date
      await addMemory(makeMemoryInput({ importance: 4 }));
      // Manually set old createdAt
      const all = loadAllMemoriesLocal();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      all[0].createdAt = oldDate.toISOString();
      all[0].layer = 'recent';
      localStorage.setItem('bt_ltm_memories', JSON.stringify(all));

      consolidateMemories();

      const updated = loadAllMemoriesLocal();
      expect(updated[0].layer).toBe('consolidated');
    });

    it('demotes old recent memories with importance < 3 to deep', async () => {
      await addMemory(makeMemoryInput({ importance: 1 }));
      const all = loadAllMemoriesLocal();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      all[0].createdAt = oldDate.toISOString();
      all[0].layer = 'recent';
      localStorage.setItem('bt_ltm_memories', JSON.stringify(all));

      consolidateMemories();

      const updated = loadAllMemoriesLocal();
      expect(updated[0].layer).toBe('deep');
    });

    it('skips consolidation if last run was < 24h ago', async () => {
      localStorage.setItem('bt_ltm_last_consolidation', new Date().toISOString());
      await addMemory(makeMemoryInput({ importance: 4 }));
      const all = loadAllMemoriesLocal();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      all[0].createdAt = oldDate.toISOString();
      all[0].layer = 'recent';
      localStorage.setItem('bt_ltm_memories', JSON.stringify(all));

      consolidateMemories();

      const updated = loadAllMemoriesLocal();
      // Should still be 'recent' because consolidation was skipped
      expect(updated[0].layer).toBe('recent');
    });
  });

  describe('searchMemories', () => {
    it('finds memories by content text', async () => {
      await addMemory(makeMemoryInput({ content: 'I love cooking pasta' }));
      await addMemory(makeMemoryInput({ content: 'Math is hard' }));
      const results = searchMemories('pasta');
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('pasta');
    });

    it('finds memories by summary text', async () => {
      await addMemory(makeMemoryInput({ summary: 'Likes to travel' }));
      const results = searchMemories('travel');
      expect(results).toHaveLength(1);
    });

    it('is case-insensitive', async () => {
      await addMemory(makeMemoryInput({ content: 'PYTHON programming' }));
      const results = searchMemories('python');
      expect(results).toHaveLength(1);
    });
  });

  describe('getMemoriesForCourse', () => {
    it('returns only memories for the given courseId', async () => {
      await addMemory(makeMemoryInput({ courseId: 'course-1' }));
      await addMemory(makeMemoryInput({ courseId: 'course-2' }));
      const results = getMemoriesForCourse('course-1');
      expect(results).toHaveLength(1);
      expect(results[0].courseId).toBe('course-1');
    });
  });

  describe('detectContextTags', () => {
    it('detects family tags', () => {
      const tags = detectContextTags('My mamma is great');
      expect(tags).toContain('famiglia');
    });

    it('detects work tags', () => {
      const tags = detectContextTags('I have a meeting at the office');
      expect(tags).toContain('lavoro');
    });

    it('returns altro when no keywords match', () => {
      const tags = detectContextTags('xyzzy nothing here');
      expect(tags).toEqual(['altro']);
    });

    it('detects multiple tags in one text', () => {
      const tags = detectContextTags('My mamma has a problem at work, I am stressed');
      expect(tags).toContain('famiglia');
      expect(tags).toContain('lavoro');
      expect(tags).toContain('emozione');
      expect(tags).toContain('difficolta');
    });
  });

  describe('getMemoryStats', () => {
    it('returns correct stats for empty array', () => {
      const stats = getMemoryStats([]);
      expect(stats.totalMemories).toBe(0);
      expect(stats.oldestMemory).toBeNull();
      expect(stats.topTags).toEqual([]);
    });

    it('computes totalMemories and topTags', () => {
      const memories: MemoryEntry[] = [
        { id: '1', content: 'a', summary: 'a', tags: ['studio', 'lavoro'], importance: 3, layer: 'recent', source: 'user_input', createdAt: '2025-01-01', lastAccessedAt: '2025-01-01', accessCount: 0 },
        { id: '2', content: 'b', summary: 'b', tags: ['studio'], importance: 2, layer: 'recent', source: 'user_input', createdAt: '2025-01-02', lastAccessedAt: '2025-01-02', accessCount: 0 },
      ];
      const stats = getMemoryStats(memories);
      expect(stats.totalMemories).toBe(2);
      expect(stats.topTags[0]).toBe('studio');
      expect(stats.oldestMemory).toBe('2025-01-01');
    });
  });

  describe('deleteMemory', () => {
    it('removes a memory by id', async () => {
      const mem = await addMemory(makeMemoryInput());
      await deleteMemory(mem.id);
      const all = loadAllMemoriesLocal();
      expect(all).toHaveLength(0);
    });
  });

  describe('touchMemory', () => {
    it('increments accessCount and updates lastAccessedAt', async () => {
      const mem = await addMemory(makeMemoryInput());
      touchMemory(mem.id);
      const all = loadAllMemoriesLocal();
      const updated = all.find(m => m.id === mem.id);
      expect(updated?.accessCount).toBe(1);
    });
  });
});
