/**
 * Tests for src/lib/fileManager.ts
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

import {
  validateFile,
  validateFileCount,
  readFileAsAttachment,
  explorationCardToFile,
  SUPPORTED_TYPES,
  MAX_FILE_SIZE_SUPABASE,
  MAX_FILE_SIZE_LOCAL,
  MAX_FILES_PER_TASK,
  formatFileSize,
  isTextFile,
  getFileExtension,
  uploadToSupabase,
  deleteFromSupabase,
} from '../../src/lib/fileManager';

describe('fileManager', () => {
  describe('getFileExtension', () => {
    it('returns extension with dot', () => {
      expect(getFileExtension('file.txt')).toBe('.txt');
    });

    it('returns empty string for no extension', () => {
      expect(getFileExtension('file')).toBe('');
    });

    it('returns last extension for multiple dots', () => {
      expect(getFileExtension('my.file.json')).toBe('.json');
    });

    it('lowercases extension', () => {
      expect(getFileExtension('FILE.TXT')).toBe('.txt');
    });
  });

  describe('isTextFile', () => {
    it('returns true for .txt', () => {
      expect(isTextFile('file.txt')).toBe(true);
    });

    it('returns true for .json', () => {
      expect(isTextFile('data.json')).toBe(true);
    });

    it('returns true for .ts', () => {
      expect(isTextFile('index.ts')).toBe(true);
    });

    it('returns false for .png', () => {
      expect(isTextFile('image.png')).toBe(false);
    });

    it('returns false for .pdf', () => {
      expect(isTextFile('doc.pdf')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    });

    it('formats fractional KB', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('constants', () => {
    it('SUPPORTED_TYPES includes common text types', () => {
      expect(SUPPORTED_TYPES).toContain('.txt');
      expect(SUPPORTED_TYPES).toContain('.json');
      expect(SUPPORTED_TYPES).toContain('.ts');
    });

    it('SUPPORTED_TYPES includes image types', () => {
      expect(SUPPORTED_TYPES).toContain('.png');
      expect(SUPPORTED_TYPES).toContain('.jpg');
    });

    it('MAX_FILE_SIZE_SUPABASE is 10MB', () => {
      expect(MAX_FILE_SIZE_SUPABASE).toBe(10 * 1024 * 1024);
    });

    it('MAX_FILE_SIZE_LOCAL is 500KB', () => {
      expect(MAX_FILE_SIZE_LOCAL).toBe(500 * 1024);
    });

    it('MAX_FILES_PER_TASK is 20', () => {
      expect(MAX_FILES_PER_TASK).toBe(20);
    });
  });

  describe('validateFile', () => {
    const makeFile = (name: string, size: number): File => {
      return new File(['x'.repeat(size)], name, { type: 'text/plain' });
    };

    it('accepts valid text file in DB mode', () => {
      const result = validateFile(makeFile('test.txt', 100), true);
      expect(result.valid).toBe(true);
    });

    it('rejects unsupported type', () => {
      const result = validateFile(makeFile('test.exe', 100), true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('.exe');
    });

    it('rejects file too large for DB mode', () => {
      const result = validateFile(makeFile('test.txt', 11 * 1024 * 1024), true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('troppo grande');
    });

    it('rejects file too large for local mode', () => {
      const result = validateFile(makeFile('test.txt', 600 * 1024), false);
      expect(result.valid).toBe(false);
    });

    it('rejects non-text file in local mode', () => {
      const result = validateFile(makeFile('image.png', 100), false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('solo file di testo');
    });

    it('accepts text file in local mode', () => {
      const result = validateFile(makeFile('test.txt', 100), false);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFileCount', () => {
    it('accepts count below limit', () => {
      expect(validateFileCount(5).valid).toBe(true);
    });

    it('rejects count at limit', () => {
      expect(validateFileCount(20).valid).toBe(false);
    });

    it('rejects count above limit', () => {
      expect(validateFileCount(25).valid).toBe(false);
    });
  });

  describe('readFileAsAttachment', () => {
    it('reads text file content', async () => {
      const file = new File(['Hello world'], 'test.txt', { type: 'text/plain' });
      const attachment = await readFileAsAttachment(file);
      expect(attachment.name).toBe('test.txt');
      expect(attachment.content).toBe('Hello world');
      expect(attachment.size).toBe(file.size);
      expect(attachment.id).toMatch(/^file_/);
    });

    it('returns placeholder for binary files', async () => {
      const file = new File([new Uint8Array([0, 1, 2])], 'image.png', { type: 'image/png' });
      const attachment = await readFileAsAttachment(file);
      expect(attachment.content).toContain('File binario');
    });
  });

  describe('explorationCardToFile', () => {
    it('converts card to markdown file', () => {
      const card = {
        id: 'card-1',
        title: 'Test Card',
        snippet: 'Short snippet',
        fullContent: 'Full content here',
        source: 'web',
        type: 'article' as const,
        timestamp: '2024-01-01',
        agentName: 'Albert',
        url: '',
        relevanceScore: 0.9,
      };
      const file = explorationCardToFile(card);
      expect(file.name).toMatch(/\.md$/);
      expect(file.content).toContain('# Test Card');
      expect(file.content).toContain('Full content here');
      expect(file.content).toContain('Albert');
      expect(file.type).toBe('text/markdown');
    });

    it('uses snippet when no fullContent', () => {
      const card = {
        id: 'card-1',
        title: 'Test',
        snippet: 'Snippet text',
        source: 'manual',
        type: 'note' as const,
        timestamp: '2024-01-01',
        url: '',
        relevanceScore: 0.5,
      };
      const file = explorationCardToFile(card);
      expect(file.content).toContain('Snippet text');
    });
  });

  describe('uploadToSupabase', () => {
    it('returns null when supabase not configured', async () => {
      const file = new File(['test'], 'test.txt');
      const result = await uploadToSupabase(file, 'ws-1', 'task-1');
      expect(result).toBeNull();
    });
  });

  describe('deleteFromSupabase', () => {
    it('returns false when supabase not configured', async () => {
      const result = await deleteFromSupabase('some/path');
      expect(result).toBe(false);
    });
  });
});
