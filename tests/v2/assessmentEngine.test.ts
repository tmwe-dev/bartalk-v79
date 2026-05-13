import { describe, it, expect } from 'vitest';
import {
  evaluateAnswers,
  getScoreInfo,
  shouldUnlockNext,
  getFeedbackMessage,
  getDetailedResults,
  PASS_THRESHOLD,
  SCORE_LABELS,
} from '../../src/lib/assessmentEngine';
import type { AssessmentQuestion } from '../../src/types/courses';

// Helper to create questions
function makeQuestions(count: number): AssessmentQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${i}`,
    question: `Question ${i}?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: `Explanation for q${i}`,
  }));
}

describe('assessmentEngine', () => {
  describe('PASS_THRESHOLD', () => {
    it('should be 50', () => {
      expect(PASS_THRESHOLD).toBe(50);
    });
  });

  describe('SCORE_LABELS', () => {
    it('should have 4 tiers ordered descending by min', () => {
      expect(SCORE_LABELS).toHaveLength(4);
      expect(SCORE_LABELS[0].min).toBe(90);
      expect(SCORE_LABELS[3].min).toBe(0);
    });
  });

  describe('evaluateAnswers', () => {
    it('returns 100 for empty questions array', () => {
      expect(evaluateAnswers([], [])).toBe(100);
    });

    it('returns 100 when all answers are correct', () => {
      const questions = makeQuestions(4);
      const answers = [0, 0, 0, 0]; // all correctIndex=0
      expect(evaluateAnswers(questions, answers)).toBe(100);
    });

    it('returns 0 when all answers are wrong', () => {
      const questions = makeQuestions(4);
      const answers = [1, 1, 1, 1]; // none correct
      expect(evaluateAnswers(questions, answers)).toBe(0);
    });

    it('returns 50 when half correct', () => {
      const questions = makeQuestions(4);
      const answers = [0, 0, 1, 1]; // 2/4 correct
      expect(evaluateAnswers(questions, answers)).toBe(50);
    });

    it('rounds correctly for non-integer percentages', () => {
      const questions = makeQuestions(3);
      const answers = [0, 1, 1]; // 1/3 = 33.33...
      expect(evaluateAnswers(questions, answers)).toBe(33);
    });

    it('handles single question correctly', () => {
      const questions = makeQuestions(1);
      expect(evaluateAnswers(questions, [0])).toBe(100);
      expect(evaluateAnswers(questions, [2])).toBe(0);
    });
  });

  describe('getScoreInfo', () => {
    it('returns Eccellente for score >= 90', () => {
      expect(getScoreInfo(95).label).toBe('Eccellente');
      expect(getScoreInfo(90).label).toBe('Eccellente');
    });

    it('returns Buono for score 70-89', () => {
      expect(getScoreInfo(70).label).toBe('Buono');
      expect(getScoreInfo(89).label).toBe('Buono');
    });

    it('returns Sufficiente for score 50-69', () => {
      expect(getScoreInfo(50).label).toBe('Sufficiente');
      expect(getScoreInfo(69).label).toBe('Sufficiente');
    });

    it('returns Da rivedere for score < 50', () => {
      expect(getScoreInfo(49).label).toBe('Da rivedere');
      expect(getScoreInfo(0).label).toBe('Da rivedere');
    });
  });

  describe('shouldUnlockNext', () => {
    it('returns true for score >= 50', () => {
      expect(shouldUnlockNext(50)).toBe(true);
      expect(shouldUnlockNext(100)).toBe(true);
    });

    it('returns false for score < 50', () => {
      expect(shouldUnlockNext(49)).toBe(false);
      expect(shouldUnlockNext(0)).toBe(false);
    });
  });

  describe('getFeedbackMessage', () => {
    it('contains lesson title in message', () => {
      const msg = getFeedbackMessage(95, 'Lezione 1');
      expect(msg).toContain('Lezione 1');
    });

    it('returns different messages for different score tiers', () => {
      const msg90 = getFeedbackMessage(95, 'L1');
      const msg70 = getFeedbackMessage(75, 'L1');
      const msg50 = getFeedbackMessage(55, 'L1');
      const msg0 = getFeedbackMessage(30, 'L1');
      // All distinct
      const msgs = new Set([msg90, msg70, msg50, msg0]);
      expect(msgs.size).toBe(4);
    });
  });

  describe('getDetailedResults', () => {
    it('returns correct/incorrect flags for each question', () => {
      const questions = makeQuestions(3);
      const answers = [0, 1, 0]; // correct, wrong, correct
      const results = getDetailedResults(questions, answers);
      expect(results).toHaveLength(3);
      expect(results[0].isCorrect).toBe(true);
      expect(results[1].isCorrect).toBe(false);
      expect(results[2].isCorrect).toBe(true);
    });

    it('includes question text and explanation', () => {
      const questions = makeQuestions(1);
      const results = getDetailedResults(questions, [0]);
      expect(results[0].question).toBe('Question 0?');
      expect(results[0].explanation).toBe('Explanation for q0');
    });

    it('returns dash for undefined answer index', () => {
      const questions = makeQuestions(2);
      const answers: number[] = []; // no answers provided
      const results = getDetailedResults(questions, answers);
      expect(results[0].userAnswer).toBe('—');
    });
  });
});
