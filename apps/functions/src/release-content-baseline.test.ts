import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getDemoCompletionSeed } from './demo-manifest.js';
import { getReleaseLearningCatalog } from './release-learning-catalog.js';
import { getReleaseQuizManifests } from './quiz-manifest.js';

function readLockedSkeleton() {
  return readFileSync(new URL('../../../content-skeleton.yaml', import.meta.url), 'utf8');
}

function getExpectedCount(skeleton: string, key: string): number {
  const match = new RegExp(`^\\s*${key}: (\\d+)$`, 'm').exec(skeleton);

  if (!match?.[1]) {
    throw new Error(`Locked skeleton is missing ${key}.`);
  }

  return Number(match[1]);
}

function getStableIds(skeleton: string, expression: RegExp): string[] {
  return [...skeleton.matchAll(expression)].map((match) => match[1]!);
}

describe('Release 1 content baseline contract', () => {
  it('matches the locked 2/12/18/10/126 skeleton with stable quiz and demo references', () => {
    const skeleton = readLockedSkeleton();
    const catalog = getReleaseLearningCatalog();
    const modules = catalog.courses.flatMap((course) => course.modules);
    const posts = modules.flatMap((module) => module.posts);
    const demos = modules.filter((module) => module.demoId !== null);
    const quizzes = getReleaseQuizManifests();

    expect(catalog.courses).toHaveLength(getExpectedCount(skeleton, 'courses'));
    expect(modules).toHaveLength(getExpectedCount(skeleton, 'modules'));
    expect(posts).toHaveLength(getExpectedCount(skeleton, 'posts'));
    expect(demos).toHaveLength(getExpectedCount(skeleton, 'demos'));
    expect(quizzes.reduce((total, quiz) => total + quiz.questions.length, 0)).toBe(
      getExpectedCount(skeleton, 'quizQuestions'),
    );
    expect(catalog.courses.map((course) => course.courseId)).toEqual(
      getStableIds(skeleton, /^ {2}- courseId: ([a-z0-9-]+)$/gm),
    );

    for (const course of catalog.courses) {
      expect(course.sourceReviewStatus).toBe('pending-operator-review');
      expect(course.sourceCandidateIds.length).toBeGreaterThan(0);
    }

    expect(modules.map((module) => module.moduleId)).toEqual(
      getStableIds(skeleton, /^ {6}- moduleId: ([a-z0-9-]+)$/gm),
    );
    expect(posts.map((post) => post.postId)).toEqual(
      getStableIds(skeleton, /^ {10}- postId: ([a-z0-9-]+)$/gm),
    );
    expect(demos.map((module) => module.demoId)).toEqual(
      getStableIds(skeleton, /^ {8}demoId: ([a-z0-9-]+)$/gm).filter((demoId) => demoId !== 'null'),
    );
    expect(quizzes.map((quiz) => quiz.quizId).sort()).toEqual(
      [
        ...getStableIds(skeleton, /^ {8}moduleQuizId: ([a-z0-9-]+)$/gm),
        ...getStableIds(skeleton, /^ {12}postQuizId: ([a-z0-9-]+)$/gm),
      ].sort(),
    );

    for (const quiz of quizzes) {
      expect(quiz.mastery.en.trim()).not.toHaveLength(0);
      expect(quiz.mastery.vi.trim()).not.toHaveLength(0);
      expect(quiz.draftProvenance).toEqual({
        candidateSourceIds: expect.any(Array),
        contentReviewStatus: 'pending-operator-review',
        externalEvidenceStatus: 'not-collected',
        importStatus: 'draft-only',
      });

      for (const question of quiz.questions) {
        expect(question.prompt.en.trim()).not.toHaveLength(0);
        expect(question.prompt.vi.trim()).not.toHaveLength(0);
        expect(question.explanation.en.trim()).not.toHaveLength(0);
        expect(question.explanation.vi.trim()).not.toHaveLength(0);
        expect(question.hints[0].en.trim()).not.toHaveLength(0);
        expect(question.hints[0].vi.trim()).not.toHaveLength(0);
        expect(question.hints[1].en.trim()).not.toHaveLength(0);
        expect(question.hints[1].vi.trim()).not.toHaveLength(0);
        expect(question.options.length).toBeGreaterThanOrEqual(2);
      }
    }

    for (const post of posts) {
      const quiz = quizzes.find((item) => item.quizId === post.postQuizId);

      expect(quiz).toMatchObject({
        postId: post.postId,
        questionCount: 3,
        quizKind: 'post',
      });
      expect(quiz?.questions.map((question) => question.sourceId)).toEqual([
        `act-${post.postId}-quiz-01`,
        `act-${post.postId}-quiz-02`,
        `act-${post.postId}-quiz-03`,
      ]);
    }

    for (const module of modules) {
      const quiz = quizzes.find((item) => item.quizId === module.moduleQuizId);

      expect(quiz).toMatchObject({
        moduleId: module.moduleId,
        questionCount: module.moduleQuizQuestionCount,
        quizKind: 'module',
      });

      if (module.demoId) {
        expect(getDemoCompletionSeed(module.demoId)).toMatchObject({
          demoId: module.demoId,
          moduleId: module.moduleId,
        });
      }
    }
  });
});
