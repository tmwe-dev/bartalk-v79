import { describe, it, expect } from 'vitest';
import {
  buildLaunchStatement,
  buildCompletedStatement,
  buildScoredStatement,
  buildProgressedStatement,
  buildInteractedStatement,
  buildExperiencedStatement,
} from '../../src/lib/xapiBuilder';

describe('xapiBuilder', () => {
  describe('buildLaunchStatement', () => {
    it('builds a course launch statement', () => {
      const stmt = buildLaunchStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Inglese',
      });
      expect(stmt.actor.name).toBe('Mario');
      expect(stmt.verb.id).toContain('launched');
      expect(stmt.object.id).toContain('course/c1');
      expect(stmt.object.definition?.type).toContain('course');
      expect(stmt.statementType).toBe('launched');
      expect(stmt.timestamp).toBeTruthy();
    });

    it('builds a lesson launch statement with context', () => {
      const stmt = buildLaunchStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Inglese',
        lessonIndex: 2,
        lessonTitle: 'Lesson 3',
      });
      expect(stmt.object.id).toContain('lesson/2');
      expect(stmt.object.definition?.type).toContain('lesson');
      expect(stmt.context).toBeDefined();
      expect(stmt.context?.contextActivities?.parent?.[0].id).toContain('course/c1');
    });

    it('sets actor mbox when email provided', () => {
      const stmt = buildLaunchStatement({
        actorName: 'Mario',
        actorEmail: 'mario@test.com',
        courseId: 'c1',
        courseTitle: 'Test',
      });
      expect(stmt.actor.mbox).toBe('mailto:mario@test.com');
    });

    it('sets actor account when workspaceId provided', () => {
      const stmt = buildLaunchStatement({
        actorName: 'Mario',
        workspaceId: 'ws-123',
        courseId: 'c1',
        courseTitle: 'Test',
      });
      expect(stmt.actor.account?.name).toBe('ws-123');
    });
  });

  describe('buildCompletedStatement', () => {
    it('builds a completed statement with score', () => {
      const stmt = buildCompletedStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Inglese',
        lessonIndex: 0,
        lessonTitle: 'Intro',
        score: 85,
      });
      expect(stmt.verb.id).toContain('completed');
      expect(stmt.result?.score?.raw).toBe(85);
      expect(stmt.result?.score?.scaled).toBeCloseTo(0.85);
      expect(stmt.result?.completion).toBe(true);
      expect(stmt.result?.success).toBe(true); // 85 >= 60
    });

    it('marks success as false for score < 60', () => {
      const stmt = buildCompletedStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Test',
        lessonIndex: 0,
        lessonTitle: 'Intro',
        score: 40,
      });
      expect(stmt.result?.success).toBe(false);
    });

    it('includes duration when provided', () => {
      const stmt = buildCompletedStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Test',
        lessonIndex: 0,
        lessonTitle: 'Intro',
        score: 70,
        durationSeconds: 120,
      });
      expect(stmt.result?.duration).toBe('PT2M0S');
    });
  });

  describe('buildScoredStatement', () => {
    it('uses passed verb when score >= 60', () => {
      const stmt = buildScoredStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Test',
        lessonIndex: 0,
        lessonTitle: 'Quiz 1',
        score: 80,
        totalQuestions: 10,
        correctAnswers: 8,
      });
      expect(stmt.verb.id).toContain('passed');
      expect(stmt.statementType).toBe('passed');
      expect(stmt.result?.score?.raw).toBe(8);
      expect(stmt.result?.score?.max).toBe(10);
    });

    it('uses failed verb when score < 60', () => {
      const stmt = buildScoredStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Test',
        lessonIndex: 0,
        lessonTitle: 'Quiz 1',
        score: 30,
        totalQuestions: 10,
        correctAnswers: 3,
      });
      expect(stmt.verb.id).toContain('failed');
      expect(stmt.statementType).toBe('failed');
      expect(stmt.result?.success).toBe(false);
    });
  });

  describe('buildProgressedStatement', () => {
    it('builds a progressed statement with objective info', () => {
      const stmt = buildProgressedStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Test',
        lessonIndex: 1,
        lessonTitle: 'Lesson 2',
        objectiveIndex: 2,
        objectiveText: 'Understand verbs',
        totalObjectives: 5,
      });
      expect(stmt.verb.id).toContain('progressed');
      expect(stmt.result?.score?.scaled).toBeCloseTo(3 / 5);
      expect(stmt.object.id).toContain('objective/2');
    });
  });

  describe('buildInteractedStatement', () => {
    it('builds an interacted statement with maestro info', () => {
      const stmt = buildInteractedStatement({
        actorName: 'Mario',
        courseId: 'c1',
        courseTitle: 'Test',
        lessonIndex: 0,
        maestroId: 'm1',
        maestroName: 'Prof. X',
        messageCount: 15,
        comprehensionScore: 75,
        studySessionId: 'ss1',
      });
      expect(stmt.verb.id).toContain('interacted');
      expect(stmt.result?.score?.raw).toBe(75);
      expect(stmt.maestroId).toBe('m1');
      expect(stmt.studySessionId).toBe('ss1');
    });
  });

  describe('buildExperiencedStatement', () => {
    it('builds an experienced statement for pronunciation', () => {
      const stmt = buildExperiencedStatement({
        actorName: 'Mario',
        courseId: 'c1',
        lessonIndex: 0,
        phrase: 'Hello world',
        pronunciationScore: 90,
        language: 'en-US',
      });
      expect(stmt.verb.id).toContain('experienced');
      expect(stmt.result?.score?.scaled).toBeCloseTo(0.9);
      expect(stmt.context?.language).toBe('en-US');
      expect(stmt.statementType).toBe('experienced');
    });
  });
});
