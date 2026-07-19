import { describe, expect, it } from 'vitest';

import {
  createQuizAttemptPayload,
  gradeQuizSubmission,
  type StoredQuestionWrongCounts,
} from './quiz-manifest.js';

describe('quiz manifest', () => {
  it('creates a post quiz attempt payload without answer keys, explanations or locked hints', () => {
    const attemptPayload = createQuizAttemptPayload({
      attemptId: 'attempt-01',
      attemptNumber: 1,
      expiresAtIso: '2026-07-19T13:00:00.000Z',
      quizId: 'quiz-post-dl-p01',
      shuffleSeed: null,
    });

    expect(attemptPayload.attempt).toMatchObject({
      attemptId: 'attempt-01',
      attemptNumber: 1,
      passingScorePercent: 100,
      questionCount: 3,
      quizId: 'quiz-post-dl-p01',
      quizKind: 'post',
      requiredCorrectCount: 3,
    });
    expect(attemptPayload.questions.map((question) => question.type)).toEqual([
      'single-choice',
      'multiple-choice',
      'true-false',
    ]);
    expect(JSON.stringify(attemptPayload)).not.toMatch(
      /correctAnswer|correctOption|correctOptionIds|hint|explanation/i,
    );
  });

  it('creates a module quiz attempt payload with six baseline questions and a 70 percent threshold', () => {
    const attemptPayload = createQuizAttemptPayload({
      attemptId: 'attempt-module-01',
      attemptNumber: 1,
      expiresAtIso: '2026-07-19T13:00:00.000Z',
      quizId: 'quiz-module-dl-m01',
      shuffleSeed: null,
    });

    expect(attemptPayload.attempt).toMatchObject({
      attemptId: 'attempt-module-01',
      passingScorePercent: 70,
      questionCount: 6,
      quizId: 'quiz-module-dl-m01',
      quizKind: 'module',
      requiredCorrectCount: null,
    });
    expect(new Set(attemptPayload.questions.map((question) => question.type))).toEqual(
      new Set(['single-choice', 'multiple-choice', 'true-false']),
    );
    expect(JSON.stringify(attemptPayload)).not.toMatch(
      /correctAnswer|correctOption|correctOptionIds|hint|explanation/i,
    );
  });

  it('keeps author order for the first attempt and shuffles later attempts deterministically', () => {
    const firstAttempt = createQuizAttemptPayload({
      attemptId: 'attempt-01',
      attemptNumber: 1,
      expiresAtIso: '2026-07-19T13:00:00.000Z',
      quizId: 'quiz-post-dl-p01',
      shuffleSeed: null,
    });
    const secondAttempt = createQuizAttemptPayload({
      attemptId: 'attempt-02',
      attemptNumber: 2,
      expiresAtIso: '2026-07-19T13:00:00.000Z',
      quizId: 'quiz-post-dl-p01',
      shuffleSeed: 'learner-01:quiz-post-dl-p01:2',
    });
    const repeatedSecondAttempt = createQuizAttemptPayload({
      attemptId: 'attempt-03',
      attemptNumber: 2,
      expiresAtIso: '2026-07-19T13:00:00.000Z',
      quizId: 'quiz-post-dl-p01',
      shuffleSeed: 'learner-01:quiz-post-dl-p01:2',
    });

    expect(firstAttempt.questions.map((question) => question.questionId)).toEqual([
      'q-dl-p01-perceptron-role',
      'q-dl-p01-perceptron-parts',
      'q-dl-p01-and-linearly-separable',
    ]);
    expect(secondAttempt.questions.map((question) => question.questionId)).not.toEqual(
      firstAttempt.questions.map((question) => question.questionId),
    );
    expect(secondAttempt.questions.map((question) => question.questionId)).toEqual(
      repeatedSecondAttempt.questions.map((question) => question.questionId),
    );
  });

  it('grades a post quiz without partial multiple-choice score or answer leakage before pass', () => {
    const result = gradeQuizSubmission({
      answers: [
        { questionId: 'q-dl-p01-perceptron-role', value: 'opt-linear-limit' },
        { questionId: 'q-dl-p01-perceptron-parts', value: ['opt-weighted-sum'] },
        { questionId: 'q-dl-p01-and-linearly-separable', value: 'true' },
      ],
      previousWrongCounts: {},
      quizId: 'quiz-post-dl-p01',
      questionIds: [
        'q-dl-p01-perceptron-role',
        'q-dl-p01-perceptron-parts',
        'q-dl-p01-and-linearly-separable',
      ],
    });

    expect(result.score).toBe(66.67);
    expect(result.passed).toBe(false);
    expect(result.feedback).toContainEqual({
      hint: null,
      hintLevel: 0,
      isCorrect: false,
      questionId: 'q-dl-p01-perceptron-parts',
    });
    expect(JSON.stringify(result)).not.toMatch(/correctAnswer|explanation/i);
  });

  it('opens hint levels across retries without exposing the answer key before pass', () => {
    const previousWrongCounts: StoredQuestionWrongCounts = {
      'q-dl-p01-perceptron-parts': 1,
    };
    const result = gradeQuizSubmission({
      answers: [
        { questionId: 'q-dl-p01-perceptron-role', value: 'opt-linear-limit' },
        { questionId: 'q-dl-p01-perceptron-parts', value: ['opt-weighted-sum'] },
        { questionId: 'q-dl-p01-and-linearly-separable', value: 'true' },
      ],
      previousWrongCounts,
      quizId: 'quiz-post-dl-p01',
      questionIds: [
        'q-dl-p01-perceptron-role',
        'q-dl-p01-perceptron-parts',
        'q-dl-p01-and-linearly-separable',
      ],
    });

    expect(result.feedback).toContainEqual({
      hint: {
        en: 'A Perceptron first computes a score, then turns that score into a 0/1 decision.',
        vi: 'Perceptron trước hết tính một điểm số, rồi biến điểm số đó thành quyết định 0/1.',
      },
      hintLevel: 1,
      isCorrect: false,
      questionId: 'q-dl-p01-perceptron-parts',
    });
    expect(JSON.stringify(result)).not.toMatch(/correctAnswer|explanation/i);
  });

  it('returns explanations and correct answers only after the learner passes', () => {
    const result = gradeQuizSubmission({
      answers: [
        { questionId: 'q-dl-p01-perceptron-role', value: 'opt-linear-limit' },
        {
          questionId: 'q-dl-p01-perceptron-parts',
          value: ['opt-weighted-sum', 'opt-step-activation'],
        },
        { questionId: 'q-dl-p01-and-linearly-separable', value: 'true' },
      ],
      previousWrongCounts: {},
      quizId: 'quiz-post-dl-p01',
      questionIds: [
        'q-dl-p01-perceptron-role',
        'q-dl-p01-perceptron-parts',
        'q-dl-p01-and-linearly-separable',
      ],
    });

    expect(result).toMatchObject({
      passed: true,
      score: 100,
    });
    expect(result.feedback).toContainEqual(
      expect.objectContaining({
        correctAnswer: ['opt-weighted-sum', 'opt-step-activation'],
        explanation: {
          en: expect.stringContaining('weighted sum'),
          vi: expect.stringContaining('tổng có trọng số'),
        },
        questionId: 'q-dl-p01-perceptron-parts',
      }),
    );
  });
});
