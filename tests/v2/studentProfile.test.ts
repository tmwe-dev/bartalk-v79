import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadStudentProfile,
  saveStudentProfile,
  createDefaultProfile,
  updateStudentProfile,
  loadMaestroMemory,
  saveMaestroMemory,
  createDefaultMemory,
  updateMemoryFromInteraction,
  createStudySession,
  saveStudySession,
  loadStudySession,
  getSessionsForCourse,
  buildStudentContext,
} from '../../src/lib/studentProfile';
import type { StudentProfile, MaestroMemory } from '../../src/types/maestro';

describe('studentProfile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createDefaultProfile', () => {
    it('creates a profile with the given name', () => {
      const profile = createDefaultProfile('Alice');
      expect(profile.name).toBe('Alice');
      expect(profile.id).toBeTruthy();
      expect(profile.learningStyle).toBe('reading');
      expect(profile.techComfort).toBe('medium');
      expect(profile.nativeLanguage).toBe('it');
      expect(profile.goals).toEqual([]);
      expect(profile.createdAt).toBeTruthy();
    });
  });

  describe('save/load StudentProfile', () => {
    it('returns null when no profile saved', () => {
      expect(loadStudentProfile()).toBeNull();
    });

    it('round-trips save and load', () => {
      const profile = createDefaultProfile('Bob');
      saveStudentProfile(profile);
      const loaded = loadStudentProfile();
      expect(loaded?.name).toBe('Bob');
      expect(loaded?.id).toBe(profile.id);
    });
  });

  describe('updateStudentProfile', () => {
    it('creates a new profile if none exists', () => {
      const result = updateStudentProfile({ name: 'Charlie' });
      expect(result.name).toBe('Charlie');
      const loaded = loadStudentProfile();
      expect(loaded?.name).toBe('Charlie');
    });

    it('merges updates into existing profile', () => {
      const profile = createDefaultProfile('Dana');
      saveStudentProfile(profile);
      const updated = updateStudentProfile({ goals: ['Learn Python'] });
      expect(updated.name).toBe('Dana');
      expect(updated.goals).toEqual(['Learn Python']);
    });

    it('sets an updatedAt timestamp', () => {
      const profile = createDefaultProfile('Eve');
      saveStudentProfile(profile);
      const updated = updateStudentProfile({ notes: 'Test' });
      expect(updated.updatedAt).toBeTruthy();
      expect(updated.notes).toBe('Test');
    });
  });

  describe('MaestroMemory', () => {
    it('creates default memory with correct defaults', () => {
      const mem = createDefaultMemory('course-1', 'maestro-1');
      expect(mem.courseId).toBe('course-1');
      expect(mem.maestroId).toBe('maestro-1');
      expect(mem.totalInteractions).toBe(0);
      expect(mem.successStreak).toBe(0);
      expect(mem.lastEmotionalState).toBe('focused');
    });

    it('saves and loads maestro memory', () => {
      const mem = createDefaultMemory('c1', 'm1');
      saveMaestroMemory(mem);
      const loaded = loadMaestroMemory('c1', 'm1');
      expect(loaded?.id).toBe(mem.id);
    });

    it('returns null for non-existent memory', () => {
      expect(loadMaestroMemory('nope', 'nope')).toBeNull();
    });
  });

  describe('updateMemoryFromInteraction', () => {
    it('increments totalInteractions and updates emotion', () => {
      const mem = createDefaultMemory('c1', 'm1');
      const updated = updateMemoryFromInteraction(mem, 'happy');
      expect(updated.totalInteractions).toBe(1);
      expect(updated.lastEmotionalState).toBe('happy');
    });

    it('adds mastered concept and increments streak', () => {
      const mem = createDefaultMemory('c1', 'm1');
      const updated = updateMemoryFromInteraction(mem, 'focused', {
        masteredConcept: 'Verbs',
      });
      expect(updated.masteredConcepts).toContain('Verbs');
      expect(updated.successStreak).toBe(1);
    });

    it('removes mastered concept from conceptsToReinforce', () => {
      const mem = createDefaultMemory('c1', 'm1');
      mem.conceptsToReinforce = ['Verbs', 'Nouns'];
      const updated = updateMemoryFromInteraction(mem, 'focused', {
        masteredConcept: 'Verbs',
      });
      expect(updated.conceptsToReinforce).not.toContain('Verbs');
      expect(updated.conceptsToReinforce).toContain('Nouns');
    });

    it('resets streak when conceptToReinforce is added', () => {
      const mem = createDefaultMemory('c1', 'm1');
      mem.successStreak = 5;
      const updated = updateMemoryFromInteraction(mem, 'confused', {
        conceptToReinforce: 'Adjectives',
      });
      expect(updated.successStreak).toBe(0);
      expect(updated.conceptsToReinforce).toContain('Adjectives');
    });

    it('adds teacher notes, limited to 50', () => {
      const mem = createDefaultMemory('c1', 'm1');
      mem.teacherNotes = Array.from({ length: 49 }, (_, i) => `Note ${i}`);
      const updated = updateMemoryFromInteraction(mem, 'focused', {
        newNotes: ['New note 1', 'New note 2'],
      });
      expect(updated.teacherNotes).toHaveLength(50);
    });
  });

  describe('StudySession', () => {
    it('creates a session with correct fields', () => {
      const session = createStudySession('c1', 0, 'm1');
      expect(session.courseId).toBe('c1');
      expect(session.lessonIndex).toBe(0);
      expect(session.maestroId).toBe('m1');
      expect(session.status).toBe('active');
      expect(session.messages).toEqual([]);
    });

    it('saves and loads a session', () => {
      const session = createStudySession('c1', 0, 'm1');
      saveStudySession(session);
      const loaded = loadStudySession(session.id);
      expect(loaded?.id).toBe(session.id);
    });

    it('getSessionsForCourse filters by courseId', () => {
      const s1 = createStudySession('c1', 0, 'm1');
      const s2 = createStudySession('c2', 0, 'm1');
      saveStudySession(s1);
      saveStudySession(s2);
      const results = getSessionsForCourse('c1');
      expect(results).toHaveLength(1);
      expect(results[0].courseId).toBe('c1');
    });
  });

  describe('buildStudentContext', () => {
    it('includes student name in context', () => {
      const profile = createDefaultProfile('Test Student');
      const context = buildStudentContext(profile, null);
      expect(context).toContain('Test Student');
      expect(context).toContain('PROFILO STUDENTE');
    });

    it('includes memory info when provided', () => {
      const profile = createDefaultProfile('Test');
      const memory = createDefaultMemory('c1', 'm1');
      memory.totalInteractions = 5;
      memory.masteredConcepts = ['Variables'];
      const context = buildStudentContext(profile, memory);
      expect(context).toContain('MEMORIA DEL MAESTRO');
      expect(context).toContain('Variables');
    });
  });
});
