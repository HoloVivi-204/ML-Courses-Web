import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from './app';
import type { AuthGateway } from '../features/auth/auth-context';
import type {
  AdminContentSourceReview,
  LearningApiClient,
} from '../features/learning/learning-api';

const LAZY_ROUTE_TIMEOUT_MS = 5_000;
const STOP_FALLBACK_SETTLE_MS = 300;
const seedSourceReview: AdminContentSourceReview = {
  attribution: {
    en: 'Google Machine Learning Crash Course, licensed under CC BY 4.0.',
    vi: 'Google Machine Learning Crash Course, license CC BY 4.0.',
  },
  license: {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  sourceId: 'source-google-ml-crash-course',
  title: 'Google Machine Learning Crash Course',
};

function createLearnerProfileFixture(
  input: {
    locale?: 'en' | 'vi';
    theme?: 'dark' | 'light' | 'system';
  } = {},
) {
  return {
    uid: 'learner-01',
    schemaVersion: 1 as const,
    displayName: 'Local Student',
    avatarUrl: null,
    locale: input.locale ?? ('vi' as const),
    theme: input.theme ?? ('system' as const),
    status: 'active' as const,
  };
}

function createAuthenticatedGateway(): AuthGateway {
  return {
    getIdToken: vi.fn().mockResolvedValue('local-id-token'),
    observe(listener) {
      listener({ email: 'learner@example.test', uid: 'learner-01' });
      return () => undefined;
    },
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi.fn().mockResolvedValue(undefined),
  };
}

function createLearningApiClient(overrides: Partial<LearningApiClient> = {}): LearningApiClient {
  return {
    bootstrapProfile: vi.fn().mockResolvedValue(createLearnerProfileFixture()),
    cancelPlaygroundRunSession: vi.fn().mockResolvedValue({
      sessionId: 'session-pg-xor-01',
      status: 'cancelled',
    }),
    completeDemo: vi.fn().mockResolvedValue({
      completion: {
        demoId: 'demo-perceptron-and-gate',
        status: 'completed',
      },
      event: {
        demoId: 'demo-perceptron-and-gate',
        requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
        type: 'demo_completed',
        viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
      },
    }),
    createAdminContentDraft: vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Seed attribution',
          vi: 'Seed attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Draft preview',
        vi: 'Preview draft',
      },
      revisionVersion: 1,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Draft title',
        vi: 'Tiêu đề draft',
      },
      validationStatus: 'not-run',
    }),
    updateAdminContentDraft: vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Updated attribution',
          vi: 'Updated attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Updated draft preview',
        vi: 'Preview draft đã cập nhật',
      },
      revisionVersion: 2,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Updated draft title',
        vi: 'Tiêu đề draft đã cập nhật',
      },
      validationStatus: 'not-run',
    }),
    validateAdminContentDraft: vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Updated attribution',
          vi: 'Updated attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Updated draft preview',
        vi: 'Preview draft đã cập nhật',
      },
      revisionVersion: 2,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Updated draft title',
        vi: 'Tiêu đề draft đã cập nhật',
      },
      validationStatus: 'valid',
    }),
    publishAdminContentRevision: vi.fn().mockResolvedValue({
      courseId: 'course-deep-learning-basic',
      draftRevisionId: null,
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      moduleId: 'dl-m01-neuron-perceptron',
      previousPublishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      preview: {
        en: 'Updated draft preview',
        vi: 'Preview draft đã cập nhật',
      },
      publishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      sourceStatus: 'seeded',
      status: 'published',
      title: {
        en: 'Updated draft title',
        vi: 'Tiêu đề draft đã cập nhật',
      },
      validationStatus: 'valid',
    }),
    rollbackAdminContentRevision: vi.fn().mockResolvedValue({
      courseId: 'course-deep-learning-basic',
      draftRevisionId: null,
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      moduleId: 'dl-m01-neuron-perceptron',
      previousPublishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      preview: {
        en: 'Published learner copy',
        vi: 'Published learner copy VI',
      },
      publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      sourceStatus: 'seeded',
      status: 'published',
      title: {
        en: 'Published title',
        vi: 'Published title VI',
      },
      validationStatus: 'not-run',
    }),
    unpublishAdminContentEntity: vi.fn().mockResolvedValue({
      courseId: 'course-deep-learning-basic',
      draftRevisionId: null,
      entityId: 'course-deep-learning-basic',
      entityType: 'course',
      localeAvailability: ['en', 'vi'],
      preview: {
        en: 'Published course copy',
        vi: 'Published course copy VI',
      },
      publishedRevisionId: 'course-deep-learning-basic-rev-r1',
      sourceStatus: 'seeded',
      status: 'unpublished',
      title: {
        en: 'Deep Learning Basics',
        vi: 'Học sâu cơ bản',
      },
      validationStatus: 'not-run',
    }),
    createQuizAttempt: vi.fn().mockResolvedValue({
      attempt: {
        attemptId: 'attempt-quiz-post-dl-p01-01',
        attemptNumber: 1,
        expiresAt: '2026-07-19T13:00:00.000Z',
        passingScorePercent: 100,
        questionCount: 3,
        quizId: 'quiz-post-dl-p01',
        quizKind: 'post',
        quizRevisionId: 'quiz-post-dl-p01-rev-r1',
        requiredCorrectCount: 3,
        shuffleSeed: null,
      },
      mastery: {
        en: 'Answer all 3 questions correctly to complete this lesson.',
        vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
      },
      questions: [
        {
          options: [
            {
              optionId: 'opt-linear-limit',
              text: {
                en: 'A straight-line decision boundary has a known limit.',
                vi: 'Ranh giới quyết định thẳng có một giới hạn rõ.',
              },
            },
            {
              optionId: 'opt-randomness',
              text: {
                en: 'A Perceptron only fails when the seed is random.',
                vi: 'Perceptron chỉ thất bại khi seed là ngẫu nhiên.',
              },
            },
          ],
          prompt: {
            en: 'What does the XOR example show?',
            vi: 'Ví dụ XOR cho thấy điều gì?',
          },
          questionId: 'q-dl-p01-perceptron-role',
          sourceId: 'act-dl-p01-neuron-perceptron-quiz-01',
          type: 'single-choice',
        },
        {
          options: [
            {
              optionId: 'opt-weighted-sum',
              text: {
                en: 'Weighted sum with bias',
                vi: 'Tổng có trọng số kèm độ lệch',
              },
            },
            {
              optionId: 'opt-step-activation',
              text: {
                en: 'Step activation that returns 0 or 1',
                vi: 'Hàm bước trả về 0 hoặc 1',
              },
            },
            {
              optionId: 'opt-uploaded-dataset',
              text: {
                en: 'Uploaded arbitrary dataset',
                vi: 'Dataset tùy ý do người học tải lên',
              },
            },
          ],
          prompt: {
            en: 'Which two parts are in the Perceptron decision rule?',
            vi: 'Hai phần nào nằm trong quy tắc quyết định Perceptron?',
          },
          questionId: 'q-dl-p01-perceptron-parts',
          sourceId: 'act-dl-p01-neuron-perceptron-quiz-02',
          type: 'multiple-choice',
        },
        {
          options: [
            { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
            { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
          ],
          prompt: {
            en: 'True or false: AND is linearly separable.',
            vi: 'Đúng hay sai: AND tách tuyến tính được.',
          },
          questionId: 'q-dl-p01-and-linearly-separable',
          sourceId: 'act-dl-p01-neuron-perceptron-quiz-03',
          type: 'true-false',
        },
      ],
    }),
    createPlaygroundRunSession: vi.fn().mockResolvedValue({
      sessionId: 'session-pg-xor-01',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
      configHash: '9'.repeat(64),
      expiresAt: '2026-07-19T14:00:00.000Z',
      status: 'issued',
      verificationLevel: 'client-computed',
      workerProtocolVersion: 'ml-worker-v1',
    }),
    createPlaygroundConfig: vi.fn().mockResolvedValue(
      createSavedPlaygroundConfigFixture({
        configId: 'config-pg-xor-01',
        name: 'XOR baseline',
      }),
    ),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    deletePlaygroundConfig: vi.fn().mockResolvedValue(undefined),
    deletePlaygroundRun: vi.fn().mockResolvedValue(undefined),
    updatePlaygroundConfig: vi.fn().mockResolvedValue(
      createSavedPlaygroundConfigFixture({
        configId: 'config-pg-xor-01',
        name: 'XOR baseline',
      }),
    ),
    enrollCourse: vi.fn().mockResolvedValue({
      access: {
        moduleId: 'dl-m01-neuron-perceptron',
        postId: 'dl-p01-neuron-perceptron',
      },
      enrollment: {
        courseId: 'course-deep-learning-basic',
        progressPercent: 0,
        status: 'in-progress',
      },
      nextPath: '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    }),
    getProgress: vi.fn().mockResolvedValue({
      algorithmUnlocks: [],
      contentAccess: [
        {
          contentType: 'module',
          entityId: 'dl-m01-neuron-perceptron',
        },
        {
          contentType: 'post',
          entityId: 'dl-p01-neuron-perceptron',
        },
      ],
      demos: [
        {
          completed: false,
          demoId: 'demo-perceptron-and-gate',
        },
      ],
      enrollment: {
        courseId: 'course-deep-learning-basic',
        progressPercent: 0,
        status: 'in-progress',
      },
      modules: [
        {
          completedStepCount: 0,
          moduleId: 'dl-m01-neuron-perceptron',
          progressPercent: 0,
          requiredStepCount: 3,
          status: 'in-progress',
        },
      ],
      posts: [
        {
          bestScore: 0,
          completed: false,
          postId: 'dl-p01-neuron-perceptron',
          quizId: 'quiz-post-dl-p01',
          quizPassed: false,
        },
      ],
      quizzes: [
        {
          attemptCount: 0,
          bestScore: 0,
          passed: false,
          quizId: 'quiz-post-dl-p01',
          quizKind: 'post',
        },
        {
          attemptCount: 0,
          bestScore: 0,
          passed: false,
          quizId: 'quiz-module-dl-m01',
          quizKind: 'module',
        },
      ],
    }),
    getAdminReportSummary: vi.fn().mockResolvedValue(createAdminReportSummaryFixture()),
    listAdminContent: vi.fn().mockResolvedValue([]),
    listPlaygroundConfigs: vi.fn().mockResolvedValue([]),
    listPlaygroundRuns: vi.fn().mockResolvedValue([]),
    savePlaygroundRun: vi.fn().mockResolvedValue(
      createSavedPlaygroundRunFixture({
        runId: 'run-pg-xor-01',
      }),
    ),
    submitQuizAttempt: vi.fn().mockResolvedValue({
      bestScore: 100,
      feedback: [
        {
          correctAnswer: 'opt-linear-limit',
          explanation: {
            en: 'XOR is not linearly separable.',
            vi: 'XOR không tách tuyến tính được.',
          },
          hint: null,
          hintLevel: 0,
          isCorrect: true,
          questionId: 'q-dl-p01-perceptron-role',
        },
      ],
      newlyUnlocked: [{ id: 'dl-p01-neuron-perceptron', type: 'post' }],
      passed: true,
      score: 100,
    }),
    updatePreferences: vi.fn().mockResolvedValue(createLearnerProfileFixture()),
    ...overrides,
  };
}

function createAdminReportSummaryFixture() {
  return {
    generatedAt: '2026-07-23T01:00:00.000Z',
    learningVerified: {
      verificationLevel: 'server-verified' as const,
      learnerCount: 4,
      courseProgress: [
        {
          courseId: 'course-deep-learning-basic',
          enrolledCount: 3,
          startedCount: 2,
          completedCount: 1,
          averageProgressPercent: 42,
        },
      ],
      moduleProgress: [
        {
          moduleId: 'dl-m01-neuron-perceptron',
          startedCount: 2,
          completedCount: 1,
          completionRate: 0.5,
        },
      ],
      postProgress: [
        {
          postId: 'dl-p01-neuron-perceptron',
          startedCount: 3,
          completedCount: 2,
          completionRate: 0.67,
        },
      ],
      quizSummary: {
        averageScorePercent: 81,
        passedAttemptCount: 5,
        totalAttemptCount: 6,
        commonWrongQuestions: [
          {
            quizId: 'quiz-module-dl-m01',
            questionId: 'q-dl-m01-xor-limit',
            wrongCount: 3,
          },
        ],
      },
      algorithmUnlocks: [
        {
          algorithmId: 'perceptron',
          unlockedLearnerCount: 2,
        },
      ],
    },
    playgroundClientReported: {
      verificationLevel: 'client-computed' as const,
      runCount: 9,
      failedRunCount: 1,
      errorRate: 0.11,
      scenarioActivity: [
        {
          scenarioId: 'pg-xor',
          algorithmId: 'perceptron',
          runCount: 9,
          failedRunCount: 1,
        },
      ],
    },
    contentLifecycle: {
      publishedCount: 8,
      draftCount: 1,
      validationPendingCount: 1,
      unpublishedCount: 0,
    },
  };
}

function createSavedPlaygroundRunFixture(input: { runId: string }) {
  return {
    runId: input.runId,
    scenarioId: 'pg-xor' as const,
    algorithmId: 'perceptron' as const,
    datasetVersionId: 'ds-xor-noisy-v1' as const,
    config: {
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    },
    durationMs: 1234,
    feedback: ['linear-limit'] as const,
    isPinned: false as const,
    metrics: {
      accuracy: 0.5,
      loss: 0.5,
      testAccuracy: 0.5,
      trainAccuracy: 0.5,
    },
    createdAt: '2026-07-19T14:00:00.000Z',
    targetReached: null,
    targetVersionId: null,
    verificationLevel: 'client-computed' as const,
  };
}

function createSavedPlaygroundConfigFixture(input: {
  compatibilityReason?: string | null;
  compatibilityStatus?: 'compatible' | 'incompatible';
  config?: { epochs: number; learningRate: number; seed: number; trainRatio: number };
  configId: string;
  name: string;
}) {
  return {
    configId: input.configId,
    name: input.name,
    scenarioId: 'pg-xor' as const,
    algorithmId: 'perceptron' as const,
    datasetVersionId: 'ds-xor-noisy-v1' as const,
    config: input.config ?? {
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    },
    compatibilityStatus: input.compatibilityStatus ?? ('compatible' as const),
    compatibilityReason: input.compatibilityReason ?? null,
  };
}

function createModuleQuizAttemptResult() {
  return {
    attempt: {
      attemptId: 'attempt-quiz-module-dl-m01-01',
      attemptNumber: 1,
      expiresAt: '2026-07-19T13:00:00.000Z',
      passingScorePercent: 70,
      questionCount: 6,
      quizId: 'quiz-module-dl-m01',
      quizKind: 'module' as const,
      quizRevisionId: 'quiz-module-dl-m01-rev-r1',
      requiredCorrectCount: null,
      shuffleSeed: null,
    },
    mastery: {
      en: 'Score at least 70% to complete the module and unlock the Perceptron playground.',
      vi: 'Đạt ít nhất 70% để hoàn thành module và mở Playground Perceptron.',
    },
    questions: [
      {
        options: [
          {
            optionId: 'opt-boundary',
            text: { en: 'Decision boundary', vi: 'Ranh giới quyết định' },
          },
          {
            optionId: 'opt-chatbot',
            text: { en: 'Chatbot memory', vi: 'Bộ nhớ chatbot' },
          },
        ],
        prompt: {
          en: 'What does the Perceptron line represent?',
          vi: 'Đường Perceptron biểu diễn gì?',
        },
        questionId: 'q-dl-m01-boundary',
        sourceId: 'quiz-module-dl-m01-q01',
        type: 'single-choice' as const,
      },
    ],
  };
}

function createInitialProgressSnapshot() {
  return {
    algorithmUnlocks: [],
    contentAccess: [
      {
        contentType: 'module' as const,
        entityId: 'dl-m01-neuron-perceptron',
      },
      {
        contentType: 'post' as const,
        entityId: 'dl-p01-neuron-perceptron',
      },
    ],
    demos: [
      {
        completed: false,
        demoId: 'demo-perceptron-and-gate',
      },
    ],
    enrollment: {
      courseId: 'course-deep-learning-basic',
      progressPercent: 0,
      status: 'in-progress' as const,
    },
    modules: [
      {
        completedStepCount: 0,
        moduleId: 'dl-m01-neuron-perceptron',
        progressPercent: 0,
        requiredStepCount: 3,
        status: 'in-progress' as const,
      },
    ],
    posts: [
      {
        bestScore: 0,
        completed: false,
        postId: 'dl-p01-neuron-perceptron',
        quizId: 'quiz-post-dl-p01',
        quizPassed: false,
      },
    ],
    quizzes: [
      {
        attemptCount: 0,
        bestScore: 0,
        passed: false,
        quizId: 'quiz-post-dl-p01',
        quizKind: 'post' as const,
      },
      {
        attemptCount: 0,
        bestScore: 0,
        passed: false,
        quizId: 'quiz-module-dl-m01',
        quizKind: 'module' as const,
      },
    ],
  };
}

function createPostPassedProgressSnapshot() {
  return {
    ...createInitialProgressSnapshot(),
    contentAccess: [
      ...createInitialProgressSnapshot().contentAccess,
      {
        contentType: 'demo' as const,
        entityId: 'demo-perceptron-and-gate',
      },
    ],
    modules: [
      {
        completedStepCount: 1,
        moduleId: 'dl-m01-neuron-perceptron',
        progressPercent: 33,
        requiredStepCount: 3,
        status: 'in-progress' as const,
      },
    ],
    posts: [
      {
        bestScore: 100,
        completed: true,
        postId: 'dl-p01-neuron-perceptron',
        quizId: 'quiz-post-dl-p01',
        quizPassed: true,
      },
    ],
    quizzes: [
      {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        quizId: 'quiz-post-dl-p01',
        quizKind: 'post' as const,
      },
      {
        attemptCount: 0,
        bestScore: 0,
        passed: false,
        quizId: 'quiz-module-dl-m01',
        quizKind: 'module' as const,
      },
    ],
  };
}

function createDemoCompletedProgressSnapshot() {
  return {
    ...createPostPassedProgressSnapshot(),
    demos: [
      {
        completed: true,
        demoId: 'demo-perceptron-and-gate',
      },
    ],
    modules: [
      {
        completedStepCount: 2,
        moduleId: 'dl-m01-neuron-perceptron',
        progressPercent: 67,
        requiredStepCount: 3,
        status: 'in-progress' as const,
      },
    ],
  };
}

function createUnlockedProgressSnapshot() {
  return {
    algorithmUnlocks: [
      {
        algorithmId: 'perceptron',
        moduleId: 'dl-m01-neuron-perceptron',
      },
    ],
    contentAccess: [
      {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
      },
      {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
      },
      {
        contentType: 'demo',
        entityId: 'demo-perceptron-and-gate',
      },
    ],
    demos: [
      {
        completed: true,
        demoId: 'demo-perceptron-and-gate',
      },
    ],
    enrollment: {
      courseId: 'course-deep-learning-basic',
      progressPercent: 33,
      status: 'in-progress',
    },
    modules: [
      {
        completedStepCount: 3,
        moduleId: 'dl-m01-neuron-perceptron',
        progressPercent: 100,
        requiredStepCount: 3,
        status: 'completed',
      },
    ],
    posts: [
      {
        bestScore: 100,
        completed: true,
        postId: 'dl-p01-neuron-perceptron',
        quizId: 'quiz-post-dl-p01',
        quizPassed: true,
      },
    ],
    quizzes: [
      {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        quizId: 'quiz-post-dl-p01',
        quizKind: 'post',
      },
      {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        quizId: 'quiz-module-dl-m01',
        quizKind: 'module',
      },
    ],
  };
}

function installImmediatePlaygroundWorker() {
  class ImmediatePlaygroundWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;

    postMessage(message: unknown) {
      const workerRequest = message as {
        request?: { runId: string };
        type: string;
      };

      if (workerRequest.type !== 'RUN' || !workerRequest.request) {
        return;
      }

      queueMicrotask(() => {
        const runId = workerRequest.request?.runId ?? 'run-unknown';

        this.onmessage?.({
          data: {
            type: 'PROGRESS',
            event: {
              runId,
              epoch: 100,
              totalEpochs: 100,
              loss: 0.5,
            },
          },
        } as MessageEvent);
        this.onmessage?.({
          data: {
            type: 'RESULT',
            result: {
              runId,
              scenarioId: 'pg-xor',
              algorithmId: 'perceptron',
              datasetVersionId: 'ds-xor-noisy-v1',
              boundary: {
                weights: [0.1, -0.1],
                bias: 0,
              },
              determinism: 'exact',
              feedback: ['linear-limit', 'non-convergence'],
              lossCurve: [{ epoch: 100, loss: 0.5 }],
              metrics: {
                accuracy: 0.5,
                testAccuracy: 0.5,
                trainAccuracy: 0.5,
                loss: 0.5,
              },
            },
          },
        } as MessageEvent);
      });
    }

    terminate() {
      return undefined;
    }
  }

  vi.stubGlobal('Worker', ImmediatePlaygroundWorker);
}

function installNonAcknowledgingPlaygroundWorker() {
  class NonAcknowledgingPlaygroundWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;

    postMessage() {
      return undefined;
    }

    terminate() {
      return undefined;
    }
  }

  vi.stubGlobal('Worker', NonAcknowledgingPlaygroundWorker);
}

function installMobileViewport() {
  vi.stubGlobal('innerWidth', 390);
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: true,
      media: '(max-width: 767px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

describe('public learning journey', () => {
  it('does not expose the static lab preview as an interactive run control', () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(screen.queryByRole('button', { name: 'Chạy mô hình' })).not.toBeInTheDocument();
    expect(screen.getByText('Chạy mô hình')).toHaveClass('lab-run-preview');
  });

  it('lets a guest open the deep-learning roadmap from the landing page', async () => {
    window.history.pushState({}, '', '/');
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /machine learning không còn là một hộp đen/i,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /khám phá khóa học sâu cơ bản/i }));

    expect(await screen.findByRole('heading', { name: 'Học sâu cơ bản' })).toBeVisible();
    expect(screen.getByText('Neuron và Perceptron')).toBeVisible();
  });

  it('switches the public journey to English', async () => {
    window.history.pushState({}, '', '/');
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole('heading', {
        name: /machine learning is no longer a black box/i,
      }),
    ).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'en');
  });

  it('lets a guest switch to the dark theme', async () => {
    window.history.pushState({}, '', '/');
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Bật giao diện tối' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('ml-path-theme')).toBe('dark');
  });

  it('syncs authenticated locale and theme changes to learner preferences', async () => {
    window.history.pushState({}, '', '/');
    const gateway = createAuthenticatedGateway();
    const learningApiClient = createLearningApiClient();
    const user = userEvent.setup();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    await user.click(screen.getByRole('button', { name: /tiếng Anh/i }));
    await waitFor(() =>
      expect(learningApiClient.updatePreferences).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        locale: 'en',
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'Enable dark theme' }));
    await waitFor(() =>
      expect(learningApiClient.updatePreferences).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        theme: 'dark',
      }),
    );
  });

  it('lets an authenticated learner sign out from the current device', async () => {
    window.history.pushState({}, '', '/dashboard');
    let authListener: ((user: { email: string | null; uid: string } | null) => void) | null = null;
    const signOut = vi.fn(async () => authListener?.(null));
    const gateway: AuthGateway = {
      ...createAuthenticatedGateway(),
      observe(listener) {
        authListener = listener;
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
      signOut,
    };
    const learningApiClient = createLearningApiClient();
    const user = userEvent.setup();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    expect(await screen.findByRole('button', { name: 'Đăng xuất' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    expect(signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(window.location.search).toBe('?returnTo=%2Fdashboard');
  });

  it('lets an authenticated learner request account deletion from the profile route', async () => {
    window.history.pushState({}, '', '/profile');
    let authListener: ((user: { email: string | null; uid: string } | null) => void) | null = null;
    const signOut = vi.fn(async () => authListener?.(null));
    const gateway: AuthGateway = {
      ...createAuthenticatedGateway(),
      observe(listener) {
        authListener = listener;
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
      signOut,
    };
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const learningApiClient = createLearningApiClient({ deleteAccount });
    const user = userEvent.setup();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    expect(await screen.findByRole('heading', { name: 'Hồ sơ tài khoản' })).toBeVisible();
    expect(screen.getByText('learner@example.test')).toBeVisible();

    const deleteButton = screen.getByRole('button', { name: 'Xóa tài khoản' });

    expect(deleteButton).toBeDisabled();

    await user.type(screen.getByLabelText('Nhập DELETE để xác nhận'), 'DELETE');
    await user.click(deleteButton);

    await waitFor(() =>
      expect(deleteAccount).toHaveBeenCalledWith({
        idToken: 'local-id-token',
      }),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });

  it('keeps the learner signed in when account deletion fails before cleanup completes', async () => {
    window.history.pushState({}, '', '/profile');
    const signOut = vi.fn().mockResolvedValue(undefined);
    const gateway: AuthGateway = {
      ...createAuthenticatedGateway(),
      signOut,
    };
    const deleteAccount = vi.fn().mockRejectedValue(new Error('Recent sign-in required.'));
    const learningApiClient = createLearningApiClient({ deleteAccount });
    const user = userEvent.setup();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    await screen.findByRole('heading', { name: 'Hồ sơ tài khoản' });
    await user.type(screen.getByLabelText('Nhập DELETE để xác nhận'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Xóa tài khoản' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Chưa thể xóa tài khoản. Hãy đăng nhập lại rồi thử lại bằng phiên đăng nhập mới.',
    );
    expect(signOut).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/profile');
  });

  it('shows a safe not-found state for an unknown course', () => {
    window.history.pushState({}, '', '/courses/not-a-course');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Không tìm thấy khóa học' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Về danh sách khóa học' })).toHaveAttribute(
      'href',
      '/courses',
    );
  });

  it(
    'lets a guest start the designated trial lesson from the course roadmap',
    async () => {
      window.history.pushState({}, '', '/courses/course-deep-learning-basic');
      const user = userEvent.setup();

      render(<App />);

      await user.click(screen.getByRole('link', { name: /học thử neuron và perceptron/i }));

      expect(
        await screen.findByRole(
          'heading',
          {
            name: /một neuron đưa ra quyết định như thế nào/i,
          },
          { timeout: LAZY_ROUTE_TIMEOUT_MS },
        ),
      ).toBeVisible();
      expect(window.location.pathname).toBe(
        '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
      );
    },
    LAZY_ROUTE_TIMEOUT_MS,
  );

  it(
    'lets a guest change neuron inputs and observe the resulting decision',
    async () => {
      window.history.pushState(
        {},
        '',
        '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
      );
      const user = userEvent.setup();

      render(<App />);

      expect(
        await screen.findByText('Neuron chưa kích hoạt: 0', undefined, {
          timeout: LAZY_ROUTE_TIMEOUT_MS,
        }),
      ).toBeVisible();

      await user.click(screen.getByRole('button', { name: 'Đầu vào x1, hiện tại 0' }));
      await user.click(screen.getByRole('button', { name: 'Đầu vào x2, hiện tại 0' }));

      expect(screen.getByRole('status')).toHaveTextContent('Neuron kích hoạt: 1');
      expect(screen.getByText('0.7 × 1 + 0.7 × 1 − 1.0 = 0.4')).toBeVisible();
    },
    LAZY_ROUTE_TIMEOUT_MS,
  );

  it('presents the trial lesson as a navigable learning sequence', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );

    render(<App />);

    const contents = await screen.findByRole(
      'navigation',
      { name: 'Mục lục bài học' },
      { timeout: LAZY_ROUTE_TIMEOUT_MS },
    );
    expect(contents).toBeVisible();
    expect(within(contents).getByRole('link', { name: 'Một neuron làm gì?' })).toHaveAttribute(
      'href',
      '#what-is-a-neuron',
    );
    expect(screen.getByRole('heading', { name: 'Từ tín hiệu đến quyết định' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Đọc kết quả, không đoán mò' })).toBeVisible();
  });

  it('keeps the trial lesson open when a guest switches to English', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    const user = userEvent.setup();

    render(<App />);

    expect(
      await screen.findByRole(
        'heading',
        { name: /một neuron đưa ra quyết định như thế nào/i },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole(
        'heading',
        { name: 'How does a neuron make a decision?' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Lesson contents' })).toBeVisible();
    expect(window.location.pathname).toBe(
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
  });

  it('does not expose an undesignated trial lesson', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/posts/not-a-public-trial');

    render(<App />);

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Không tìm thấy bài học thử' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Về danh sách khóa học' })).toHaveAttribute(
      'href',
      '/courses',
    );
  });

  it('offers vetted further reading from the public trial lesson', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );

    render(<App />);

    const resource = await screen.findByRole(
      'link',
      {
        name: 'Neural networks: Nodes and hidden layers',
      },
      { timeout: LAZY_ROUTE_TIMEOUT_MS },
    );
    expect(resource).toHaveAttribute('target', '_blank');
    expect(resource).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/developers\.google\.com/i)).toBeVisible();
  });

  it('shows the full Perceptron/XOR lesson only to an authenticated learner', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));

    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();
    expect(screen.getByText(/post_dl-p01-neuron-perceptron/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Why does XOR break a single-layer Perceptron?',
      }),
    ).toBeVisible();
    expect(screen.getByText('FULL LESSON')).toBeVisible();
  });

  it('opens the full Perceptron/XOR lesson on authenticated deep links with backend access', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getByText(/post_dl-p01-neuron-perceptron/)).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Why does XOR break a single-layer Perceptron?',
      }),
    ).toBeVisible();
  });

  it('shows backend-verified progress and unlocked algorithms on the learning path', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        algorithmUnlocks: [
          {
            algorithmId: 'perceptron',
            moduleId: 'dl-m01-neuron-perceptron',
          },
        ],
        contentAccess: [
          {
            contentType: 'module',
            entityId: 'dl-m01-neuron-perceptron',
          },
          {
            contentType: 'post',
            entityId: 'dl-p01-neuron-perceptron',
          },
          {
            contentType: 'demo',
            entityId: 'demo-perceptron-and-gate',
          },
        ],
        demos: [
          {
            completed: true,
            demoId: 'demo-perceptron-and-gate',
          },
        ],
        enrollment: {
          courseId: 'course-deep-learning-basic',
          progressPercent: 33,
          status: 'in-progress',
        },
        modules: [
          {
            completedStepCount: 3,
            moduleId: 'dl-m01-neuron-perceptron',
            progressPercent: 100,
            requiredStepCount: 3,
            status: 'completed',
          },
        ],
        posts: [
          {
            bestScore: 100,
            completed: true,
            postId: 'dl-p01-neuron-perceptron',
            quizId: 'quiz-post-dl-p01',
            quizPassed: true,
          },
        ],
        quizzes: [
          {
            attemptCount: 1,
            bestScore: 100,
            passed: true,
            quizId: 'quiz-post-dl-p01',
            quizKind: 'post',
          },
          {
            attemptCount: 1,
            bestScore: 100,
            passed: true,
            quizId: 'quiz-module-dl-m01',
            quizKind: 'module',
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('Tiến độ đã xác minh: 33%')).toBeVisible();
    expect(screen.getByText('Module hoàn thành: 3/3 bước')).toBeVisible();
    expect(screen.getByText('Quiz bài học: 100% · đạt · 1 lần làm')).toBeVisible();
    expect(screen.getByText('Quiz module: 100% · đạt · 1 lần làm')).toBeVisible();
    expect(screen.getByText('Perceptron đã mở')).toBeVisible();
    expect(screen.getByRole('link', { name: /Mở Playground XOR/i })).toHaveAttribute(
      'href',
      '/playground/pg-xor',
    );
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
  });

  it('shows a learner dashboard with server-verified progress separate from client-computed runs', async () => {
    window.history.pushState({}, '', '/dashboard');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
      listPlaygroundRuns: vi.fn().mockResolvedValue([
        createSavedPlaygroundRunFixture({
          runId: 'run-history-01',
        }),
      ]),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Dashboard học viên' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getByText('Dữ liệu học tập server-verified')).toBeVisible();
    expect(screen.getByText('Tiến độ khóa học 33%')).toBeVisible();
    expect(screen.getByText('Module hoàn thành 3/3 bước')).toBeVisible();
    expect(screen.getByText('Quiz module: 100% · đạt · 1 lần làm')).toBeVisible();
    expect(screen.getByText('Perceptron đã mở')).toBeVisible();
    expect(screen.getByText('Hoạt động Playground client-computed')).toBeVisible();
    expect(screen.getByText('run-history-01')).toBeVisible();
    expect(screen.getByText('Độ chính xác 50%')).toBeVisible();
    expect(screen.getByText('client-computed')).toBeVisible();
    expect(
      screen.queryByText(/điểm thành tích|achievement score|overall score/i),
    ).not.toBeInTheDocument();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.listPlaygroundRuns).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-xor',
    });
  });

  it('shows an admin report summary with learning and Playground trust domains separated', async () => {
    window.history.pushState({}, '', '/admin/reports');
    const getAdminReportSummary = vi.fn().mockResolvedValue(createAdminReportSummaryFixture());
    const learningApiClient = createLearningApiClient({
      getAdminReportSummary,
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Dashboard tiến độ Admin' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getByText('Dữ liệu học tập server-verified')).toBeVisible();
    expect(screen.getByText('4 học viên')).toBeVisible();
    expect(screen.getByText('course-deep-learning-basic')).toBeVisible();
    expect(screen.getByText('3 ghi danh · 2 bắt đầu · 1 hoàn thành')).toBeVisible();
    expect(screen.getByText('Điểm quiz trung bình 81%')).toBeVisible();
    expect(screen.getByText('q-dl-m01-xor-limit · 3 câu sai')).toBeVisible();
    expect(screen.getByText('Hoạt động Playground client-computed')).toBeVisible();
    expect(screen.getByText('9 run · 1 lỗi')).toBeVisible();
    expect(screen.getByText('Tỷ lệ lỗi 11%')).toBeVisible();
    expect(screen.getByText('pg-xor · Perceptron · 9 run')).toBeVisible();
    expect(screen.getByText('Published 8 · Draft 1 · Pending 1')).toBeVisible();
    expect(
      screen.queryByText(/điểm thành tích|achievement score|overall score/i),
    ).not.toBeInTheDocument();
    expect(getAdminReportSummary).toHaveBeenCalledWith({ idToken: 'local-id-token' });
  });

  it('lets an authenticated admin preview the seeded content inventory', async () => {
    window.history.pushState({}, '', '/admin/content');
    const listAdminContent = vi.fn().mockResolvedValue([
      {
        courseId: 'course-deep-learning-basic',
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        localeAvailability: ['en', 'vi'],
        moduleId: 'dl-m01-neuron-perceptron',
        preview: {
          en: 'Read from a single neuron decision to the XOR limit.',
          vi: 'Đọc từ một quyết định của neuron đến giới hạn XOR.',
        },
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        sourceReview: seedSourceReview,
        sourceStatus: 'seeded',
        status: 'published',
        title: {
          en: 'How does a neuron make a decision?',
          vi: 'Một neuron đưa ra quyết định như thế nào?',
        },
        validationStatus: 'not-run',
      },
    ]);
    const learningApiClient = {
      ...createLearningApiClient(),
      listAdminContent,
    };

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Quản trị nội dung seed' })).toBeVisible();
    expect(await screen.findAllByText('dl-p01-neuron-perceptron')).toHaveLength(2);
    expect(await screen.findByText('post-dl-p01-neuron-perceptron-rev-r1')).toBeVisible();
    expect(await screen.findByText(/Read from a single neuron decision/i)).toBeVisible();
    expect(await screen.findByText('Google Machine Learning Crash Course')).toBeVisible();
    expect(await screen.findByText('source-google-ml-crash-course')).toBeVisible();
    expect(await screen.findByText('CC BY 4.0')).toBeVisible();
    expect(await screen.findByText('https://creativecommons.org/licenses/by/4.0/')).toBeVisible();
    expect(document.body).not.toHaveTextContent(/answerKey|correctAnswer|hint/i);
    expect(listAdminContent).toHaveBeenCalledWith({ idToken: 'local-id-token' });
  });

  it('lets an authenticated admin create and preview a draft without replacing the published preview', async () => {
    window.history.pushState({}, '', '/admin/content');
    const user = userEvent.setup();
    const listAdminContent = vi.fn().mockResolvedValue([
      {
        courseId: 'course-deep-learning-basic',
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        localeAvailability: ['en', 'vi'],
        moduleId: 'dl-m01-neuron-perceptron',
        preview: {
          en: 'Published learner copy',
          vi: 'Báº£n published cho learner',
        },
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        sourceStatus: 'seeded',
        status: 'published',
        title: {
          en: 'How does a neuron make a decision?',
          vi: 'Má»™t neuron Ä‘Æ°a ra quyáº¿t Ä‘á»‹nh nhÆ° tháº¿ nÃ o?',
        },
        validationStatus: 'not-run',
      },
    ]);
    const createAdminContentDraft = vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Seed attribution',
          vi: 'Seed attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Draft-only copy',
        vi: 'Báº£n draft riÃªng',
      },
      revisionVersion: 1,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Draft title',
        vi: 'TiÃªu Ä‘á» draft',
      },
      validationStatus: 'not-run',
    });
    const learningApiClient = {
      ...createLearningApiClient(),
      createAdminContentDraft,
      listAdminContent,
    };

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('Published learner copy')).toBeVisible();
    expect(await screen.findByText('Thiếu source/license review')).toBeVisible();
    expect(screen.queryByText('Google Machine Learning Crash Course')).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /draft/i }));

    expect(createAdminContentDraft).toHaveBeenCalledWith({
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      idToken: 'local-id-token',
    });
    expect(await screen.findAllByText('draft-post-dl-p01-neuron-perceptron-rev-d1')).toHaveLength(
      2,
    );
    expect(screen.getAllByText('Draft-only copy')).toHaveLength(2);
    expect(screen.getByText('Published learner copy')).toBeVisible();
  });

  it('lets an authenticated admin edit a draft with revision concurrency', async () => {
    window.history.pushState({}, '', '/admin/content');
    const user = userEvent.setup();
    const listAdminContent = vi.fn().mockResolvedValue([
      {
        courseId: 'course-deep-learning-basic',
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        localeAvailability: ['en', 'vi'],
        moduleId: 'dl-m01-neuron-perceptron',
        preview: {
          en: 'Published learner copy',
          vi: 'Published learner copy VI',
        },
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        sourceStatus: 'seeded',
        status: 'published',
        title: {
          en: 'Published title',
          vi: 'Published title VI',
        },
        validationStatus: 'not-run',
      },
    ]);
    const createAdminContentDraft = vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Seed attribution',
          vi: 'Seed attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Draft preview copy',
        vi: 'Draft preview copy VI',
      },
      revisionVersion: 1,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Draft title',
        vi: 'Draft title VI',
      },
      validationStatus: 'not-run',
    });
    const updateAdminContentDraft = vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Edited attribution',
          vi: 'Edited attribution VI',
        },
        externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Edited draft preview copy',
        vi: 'Edited draft preview copy VI',
      },
      revisionVersion: 2,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Edited draft title',
        vi: 'Edited draft title VI',
      },
      validationStatus: 'not-run',
    });
    const learningApiClient = {
      ...createLearningApiClient(),
      createAdminContentDraft,
      listAdminContent,
      updateAdminContentDraft,
    };

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    await user.click(await screen.findByRole('button', { name: /draft/i }));
    await user.clear(await screen.findByLabelText('Title EN'));
    await user.type(screen.getByLabelText('Title EN'), 'Edited draft title');
    await user.clear(screen.getByLabelText('Preview EN'));
    await user.type(screen.getByLabelText('Preview EN'), 'Edited draft preview copy');
    await user.clear(screen.getByLabelText('Attribution EN'));
    await user.type(screen.getByLabelText('Attribution EN'), 'Edited attribution');
    await user.type(
      screen.getByLabelText('External link URL'),
      'https://developers.google.com/machine-learning/crash-course',
    );
    await user.click(screen.getByRole('button', { name: /Save draft|Lưu draft/i }));

    expect(updateAdminContentDraft).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      metadata: {
        attribution: {
          en: 'Edited attribution',
          vi: 'Seed attribution VI',
        },
        externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
      },
      preview: {
        en: 'Edited draft preview copy',
        vi: 'Draft preview copy VI',
      },
      revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      revisionVersion: 1,
      title: {
        en: 'Edited draft title',
        vi: 'Draft title VI',
      },
    });
    expect(await screen.findAllByText('Edited draft preview copy')).toHaveLength(2);
    expect(screen.getByText('Published learner copy')).toBeVisible();
  });

  it('lets an authenticated admin validate and publish a draft from the content screen', async () => {
    window.history.pushState({}, '', '/admin/content');
    const user = userEvent.setup();
    const listAdminContent = vi.fn().mockResolvedValue([
      {
        courseId: 'course-deep-learning-basic',
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        localeAvailability: ['en', 'vi'],
        moduleId: 'dl-m01-neuron-perceptron',
        preview: {
          en: 'Published learner copy',
          vi: 'Published learner copy VI',
        },
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        sourceStatus: 'seeded',
        status: 'published',
        title: {
          en: 'Published title',
          vi: 'Published title VI',
        },
        validationStatus: 'not-run',
      },
    ]);
    const createAdminContentDraft = vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Reviewed attribution',
          vi: 'Reviewed attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Draft preview ready for publish',
        vi: 'Draft preview ready for publish VI',
      },
      revisionVersion: 1,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Draft publish title',
        vi: 'Draft publish title VI',
      },
      validationStatus: 'not-run',
    });
    const validateAdminContentDraft = vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Reviewed attribution',
          vi: 'Reviewed attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Draft preview ready for publish',
        vi: 'Draft preview ready for publish VI',
      },
      revisionVersion: 1,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Draft publish title',
        vi: 'Draft publish title VI',
      },
      validationStatus: 'valid',
    });
    const publishAdminContentRevision = vi.fn().mockResolvedValue({
      courseId: 'course-deep-learning-basic',
      draftRevisionId: null,
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      moduleId: 'dl-m01-neuron-perceptron',
      previousPublishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      preview: {
        en: 'Draft preview ready for publish',
        vi: 'Draft preview ready for publish VI',
      },
      publishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      sourceStatus: 'seeded',
      status: 'published',
      title: {
        en: 'Draft publish title',
        vi: 'Draft publish title VI',
      },
      validationStatus: 'valid',
    });
    const learningApiClient = {
      ...createLearningApiClient(),
      createAdminContentDraft,
      listAdminContent,
      publishAdminContentRevision,
      validateAdminContentDraft,
    };

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    await user.click(await screen.findByRole('button', { name: /draft/i }));
    await user.click(await screen.findByRole('button', { name: /Validate draft|Kiểm tra draft/i }));
    expect(await screen.findByText(/Draft passed validation|Draft đã qua kiểm tra/i)).toBeVisible();
    await user.clear(screen.getByLabelText(/Lifecycle reason|Lý do lifecycle/i));
    await user.type(
      screen.getByLabelText(/Lifecycle reason|Lý do lifecycle/i),
      'Reviewed localized draft copy for pilot release.',
    );
    await user.click(screen.getByRole('button', { name: /Publish draft/i }));

    expect(validateAdminContentDraft).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
    });
    expect(publishAdminContentRevision).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      idempotencyKey: expect.any(String),
      reason: 'Reviewed localized draft copy for pilot release.',
      revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
    });
    expect(await screen.findByText('Draft preview ready for publish')).toBeVisible();
    expect(screen.getByText('post-dl-p01-neuron-perceptron-rev-r1')).toBeVisible();
    expect(screen.queryByText('Published learner copy')).not.toBeInTheDocument();
  });

  it('shows a safe forbidden state when the admin inventory API rejects access', async () => {
    window.history.pushState({}, '', '/admin/content');
    const listAdminContent = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const learningApiClient = {
      ...createLearningApiClient(),
      listAdminContent,
    };

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Cần quyền Admin' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bạn cần Admin claim để xem nội dung seed.',
    );
    expect(screen.queryByText('dl-p01-neuron-perceptron')).not.toBeInTheDocument();
    expect(listAdminContent).toHaveBeenCalledWith({ idToken: 'local-id-token' });
  });

  it('keeps pg-xor Playground locked until backend progress unlocks Perceptron', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Playground chưa mở khóa' })).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createPlaygroundRunSession).not.toHaveBeenCalled();
  });

  it('runs pg-xor Perceptron through a verified run session and worker result', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    installImmediatePlaygroundWorker();
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chạy' }));

    expect(await screen.findByText('Đã chạy xong')).toBeVisible();
    expect(screen.getByText('50%')).toBeVisible();
    expect(
      screen.getByText('Giới hạn tuyến tính: một ranh giới thẳng không tách được XOR.'),
    ).toBeVisible();
    expect(
      screen.getByText('Không hội tụ: tăng epoch không xóa được mâu thuẫn XOR.'),
    ).toBeVisible();
    expect(learningApiClient.createPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      deviceProfile: 'desktop',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
    });
    await waitFor(() =>
      expect(learningApiClient.savePlaygroundRun).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        idempotencyKey: expect.any(String),
        sessionId: 'session-pg-xor-01',
        result: expect.objectContaining({
          runId: expect.any(String),
          scenarioId: 'pg-xor',
          algorithmId: 'perceptron',
          datasetVersionId: 'ds-xor-noisy-v1',
          configHash: '9'.repeat(64),
          durationMs: expect.any(Number),
        }),
      }),
    );
    expect(await screen.findByText('run-pg-xor-01')).toBeVisible();
    expect(screen.getAllByText('client-computed')).not.toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('loads saved pg-xor runs and configs, then restores a config without starting a run', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
      listPlaygroundConfigs: vi.fn().mockResolvedValue([
        createSavedPlaygroundConfigFixture({
          configId: 'config-pg-xor-01',
          name: 'XOR tuned',
          config: {
            learningRate: 0.2,
            epochs: 200,
            trainRatio: 0.8,
            seed: 7,
          },
        }),
      ]),
      listPlaygroundRuns: vi.fn().mockResolvedValue([
        createSavedPlaygroundRunFixture({
          runId: 'run-history-01',
        }),
      ]),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('Lịch sử run')).toBeVisible();
    expect(screen.getByText('run-history-01')).toBeVisible();
    expect(screen.getByText('XOR tuned')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Khôi phục/i }));

    expect(screen.getByRole('spinbutton', { name: 'Tốc độ học' })).toHaveValue(0.2);
    expect(screen.getByRole('spinbutton', { name: 'Epochs' })).toHaveValue(200);
    expect(screen.getByRole('spinbutton', { name: 'Tỷ lệ train' })).toHaveValue(0.8);
    expect(screen.getByRole('spinbutton', { name: 'Seed' })).toHaveValue(7);
    expect(learningApiClient.listPlaygroundRuns).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-xor',
    });
    expect(learningApiClient.listPlaygroundConfigs).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-xor',
    });
    expect(learningApiClient.createPlaygroundRunSession).not.toHaveBeenCalled();
  });

  it('renames and updates a saved pg-xor config without creating a duplicate', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    const user = userEvent.setup();
    const updatePlaygroundConfig = vi
      .fn()
      .mockResolvedValueOnce(
        createSavedPlaygroundConfigFixture({
          configId: 'config-pg-xor-01',
          name: 'Renamed XOR baseline',
        }),
      )
      .mockResolvedValueOnce(
        createSavedPlaygroundConfigFixture({
          configId: 'config-pg-xor-01',
          name: 'Renamed XOR baseline',
          config: {
            learningRate: 0.3,
            epochs: 150,
            trainRatio: 0.85,
            seed: 9,
          },
        }),
      );
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
      listPlaygroundConfigs: vi.fn().mockResolvedValue([
        createSavedPlaygroundConfigFixture({
          configId: 'config-pg-xor-01',
          name: 'XOR tuned',
        }),
      ]),
      updatePlaygroundConfig,
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('XOR tuned')).toBeVisible();
    const initialCard = screen.getByText('XOR tuned').closest('li');

    expect(initialCard).not.toBeNull();
    await user.clear(within(initialCard!).getByLabelText('Tên config đã lưu'));
    await user.type(
      within(initialCard!).getByLabelText('Tên config đã lưu'),
      'Renamed XOR baseline',
    );
    await user.click(within(initialCard!).getByRole('button', { name: /Đổi tên XOR tuned/i }));

    expect(await screen.findByText('Renamed XOR baseline')).toBeVisible();
    expect(screen.getAllByText('Renamed XOR baseline')).toHaveLength(1);
    expect(updatePlaygroundConfig).toHaveBeenNthCalledWith(1, {
      idToken: 'local-id-token',
      configId: 'config-pg-xor-01',
      name: 'Renamed XOR baseline',
    });

    await user.clear(screen.getByRole('spinbutton', { name: 'Tốc độ học' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Tốc độ học' }), '0.3');
    await user.clear(screen.getByRole('spinbutton', { name: 'Epochs' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Epochs' }), '150');
    await user.clear(screen.getByRole('spinbutton', { name: 'Tỷ lệ train' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Tỷ lệ train' }), '0.85');
    await user.clear(screen.getByRole('spinbutton', { name: 'Seed' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Seed' }), '9');

    const renamedCard = screen.getByText('Renamed XOR baseline').closest('li');

    expect(renamedCard).not.toBeNull();
    await user.click(
      within(renamedCard!).getByRole('button', {
        name: /Cập nhật thông số Renamed XOR baseline/i,
      }),
    );

    expect(await screen.findByText(/lr 0\.3/)).toBeVisible();
    expect(updatePlaygroundConfig).toHaveBeenNthCalledWith(2, {
      idToken: 'local-id-token',
      configId: 'config-pg-xor-01',
      name: 'Renamed XOR baseline',
      config: {
        learningRate: 0.3,
        epochs: 150,
        trainRatio: 0.85,
        seed: 9,
      },
    });
    expect(screen.getAllByText('Renamed XOR baseline')).toHaveLength(1);
    expect(learningApiClient.createPlaygroundConfig).not.toHaveBeenCalled();
  });

  it('keeps reloaded pg-xor saved artifacts owner-scoped and marks incompatible configs read-only', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
      listPlaygroundConfigs: vi.fn().mockResolvedValue([
        createSavedPlaygroundConfigFixture({
          compatibilityReason: 'Current parameter bounds no longer accept this saved config.',
          compatibilityStatus: 'incompatible',
          configId: 'config-pg-xor-legacy',
          name: 'XOR legacy',
        }),
      ]),
      listPlaygroundRuns: vi.fn().mockResolvedValue([
        createSavedPlaygroundRunFixture({
          runId: 'run-history-01',
        }),
      ]),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('run-history-01')).toBeVisible();
    expect(screen.getByText('client-computed')).toBeVisible();
    expect(screen.getByText('XOR legacy')).toBeVisible();
    expect(
      screen.getByText('Current parameter bounds no longer accept this saved config.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /Khôi phục XOR legacy/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Đổi tên XOR legacy/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cập nhật thông số XOR legacy/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Xóa run' }));
    await waitFor(() => expect(screen.queryByText('run-history-01')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Xóa' }));

    await waitFor(() => expect(screen.queryByText('XOR legacy')).not.toBeInTheDocument());
    expect(learningApiClient.deletePlaygroundRun).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      runId: 'run-history-01',
    });
    expect(learningApiClient.deletePlaygroundConfig).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      configId: 'config-pg-xor-legacy',
    });
    expect(learningApiClient.createPlaygroundRunSession).not.toHaveBeenCalled();
  });

  it('saves the current pg-xor config for later restore', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      createPlaygroundConfig: vi.fn().mockResolvedValue(
        createSavedPlaygroundConfigFixture({
          configId: 'config-pg-xor-02',
          name: 'XOR thử nghiệm',
        }),
      ),
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' });
    await user.clear(screen.getByLabelText('Tên cấu hình'));
    await user.type(screen.getByLabelText('Tên cấu hình'), 'XOR thử nghiệm');
    await user.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));

    expect(await screen.findByText('XOR thử nghiệm')).toBeVisible();
    expect(learningApiClient.createPlaygroundConfig).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      name: 'XOR thử nghiệm',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
    });
  });

  it('stops pg-xor without saving a successful worker result', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    installNonAcknowledgingPlaygroundWorker();
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chạy' }));
    await user.click(await screen.findByRole('button', { name: 'Dừng' }));

    expect(await screen.findByText('Run đã bị hủy')).toBeVisible();
    expect(screen.queryByTestId('playground-result')).not.toBeInTheDocument();
    expect(learningApiClient.cancelPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      sessionId: 'session-pg-xor-01',
    });
    expect(learningApiClient.savePlaygroundRun).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('resets pg-xor while stopping without letting the cancelled run overwrite idle state', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    installNonAcknowledgingPlaygroundWorker();
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();
    await user.clear(screen.getByRole('spinbutton', { name: 'Epochs' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Epochs' }), '200');
    await user.click(screen.getByRole('button', { name: 'Chạy' }));
    await user.click(await screen.findByRole('button', { name: 'Dừng' }));
    expect(await screen.findByText('Đang dừng worker')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByRole('spinbutton', { name: 'Epochs' })).toHaveValue(100);
    await new Promise((resolve) => {
      setTimeout(resolve, STOP_FALLBACK_SETTLE_MS);
    });
    expect(screen.getByText('Sẵn sàng chạy')).toBeVisible();
    expect(screen.queryByText('Run đã bị hủy')).not.toBeInTheDocument();
    expect(learningApiClient.cancelPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      sessionId: 'session-pg-xor-01',
    });
    expect(learningApiClient.savePlaygroundRun).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('uses mobile pg-xor limits before requesting a Perceptron run session', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    installMobileViewport();
    installImmediatePlaygroundWorker();
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();
    expect(screen.getByText('Giới hạn mobile: epochs ≤ 200')).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: 'Epochs' })).toHaveAttribute('max', '200');

    await user.clear(screen.getByRole('spinbutton', { name: 'Epochs' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Epochs' }), '201');
    await user.click(screen.getByRole('button', { name: 'Chạy' }));

    expect(await screen.findByText('epochs must be between 10 and 200 for mobile.')).toBeVisible();
    expect(learningApiClient.createPlaygroundRunSession).not.toHaveBeenCalled();
    expect(learningApiClient.savePlaygroundRun).not.toHaveBeenCalled();

    await user.clear(screen.getByRole('spinbutton', { name: 'Epochs' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Epochs' }), '200');
    await user.click(screen.getByRole('button', { name: 'Chạy' }));

    expect(await screen.findByText('Đã chạy xong')).toBeVisible();
    expect(learningApiClient.createPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      deviceProfile: 'mobile',
      config: {
        learningRate: 0.1,
        epochs: 200,
        trainRatio: 0.75,
        seed: 42,
      },
    });
    vi.unstubAllGlobals();
  });

  it('keeps full Perceptron/XOR content closed without a content access grant', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        ...createUnlockedProgressSnapshot(),
        contentAccess: [],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /Một neuron đưa ra quyết định như thế nào/i,
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();
    await waitFor(() =>
      expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token'),
    );
    expect(
      screen.queryByRole('heading', {
        name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/post_dl-p01-neuron-perceptron/)).not.toBeInTheDocument();
  });

  it('keeps the fixed AND gate demo closed without a module access grant', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/demos/demo-perceptron-and-gate',
    );
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Demo chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.completeDemo).not.toHaveBeenCalled();
  });

  it('keeps the fixed AND gate demo closed until backend progress grants demo access', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở demo AND gate/i }));

    expect(await screen.findByRole('heading', { name: 'Demo chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.completeDemo).not.toHaveBeenCalled();
  });

  it('opens the fixed AND gate demo on authenticated deep links with backend access', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/demos/demo-perceptron-and-gate',
    );
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        ...createUnlockedProgressSnapshot(),
        demos: [
          {
            completed: false,
            demoId: 'demo-perceptron-and-gate',
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Demo Perceptron: cổng AND' })).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: /Bốn điểm dữ liệu AND và một đường quyết định/i,
      }),
    ).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.completeDemo).not.toHaveBeenCalled();
  });

  it('lets an enrolled learner complete the fixed AND gate demo after required steps', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        algorithmUnlocks: [],
        contentAccess: [
          {
            contentType: 'module',
            entityId: 'dl-m01-neuron-perceptron',
          },
          {
            contentType: 'post',
            entityId: 'dl-p01-neuron-perceptron',
          },
          {
            contentType: 'demo',
            entityId: 'demo-perceptron-and-gate',
          },
        ],
        demos: [
          {
            completed: false,
            demoId: 'demo-perceptron-and-gate',
          },
        ],
        enrollment: {
          courseId: 'course-deep-learning-basic',
          progressPercent: 33,
          status: 'in-progress',
        },
        modules: [
          {
            completedStepCount: 1,
            moduleId: 'dl-m01-neuron-perceptron',
            progressPercent: 33,
            requiredStepCount: 3,
            status: 'in-progress',
          },
        ],
        posts: [
          {
            bestScore: 100,
            completed: true,
            postId: 'dl-p01-neuron-perceptron',
            quizId: 'quiz-post-dl-p01',
            quizPassed: true,
          },
        ],
        quizzes: [
          {
            attemptCount: 1,
            bestScore: 100,
            passed: true,
            quizId: 'quiz-post-dl-p01',
            quizKind: 'post',
          },
          {
            attemptCount: 0,
            bestScore: 0,
            passed: false,
            quizId: 'quiz-module-dl-m01',
            quizKind: 'module',
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở demo AND gate/i }));

    expect(await screen.findByRole('heading', { name: 'Demo Perceptron: cổng AND' })).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: /Bốn điểm dữ liệu AND và một đường quyết định/i,
      }),
    ).toBeVisible();
    expect(screen.getByRole('status', { name: 'Tiến độ demo' })).toHaveTextContent(
      'Bước bắt buộc 1 / 4',
    );

    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));

    expect(await screen.findByText('demo_completed: demo-perceptron-and-gate')).toBeVisible();
    expect(learningApiClient.completeDemo).toHaveBeenCalledWith({
      demoId: 'demo-perceptron-and-gate',
      idToken: 'local-id-token',
      idempotencyKey: expect.any(String),
      viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
    });
  });

  it('keeps the post quiz closed without a post access grant', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/quizzes/quiz-post-dl-p01');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        ...createUnlockedProgressSnapshot(),
        contentAccess: [
          {
            contentType: 'module',
            entityId: 'dl-m01-neuron-perceptron',
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Quiz chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createQuizAttempt).not.toHaveBeenCalled();
  });

  it('opens the post mastery quiz on authenticated deep links with backend access', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/quizzes/quiz-post-dl-p01');
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Quiz Perceptron/XOR' })).toBeVisible();
    expect(screen.getByText('Cần trả lời đúng cả 3 câu để hoàn thành bài.')).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createQuizAttempt).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      quizId: 'quiz-post-dl-p01',
    });
    expect(screen.getByTestId('quiz-attempt')).not.toHaveTextContent(
      /correctAnswer|hint|explanation/i,
    );
  });

  it('keeps the module quiz closed until backend progress verifies post and demo completion', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/quizzes/quiz-module-dl-m01',
    );
    sessionStorage.setItem(
      'ml-path-learning-access-grants',
      JSON.stringify([
        {
          courseId: 'course-deep-learning-basic',
          moduleId: 'dl-m01-neuron-perceptron',
          uid: 'learner-01',
        },
      ]),
    );
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Quiz chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createQuizAttempt).not.toHaveBeenCalled();
  });

  it('opens the module quiz on authenticated deep links after backend verifies post and demo completion', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/quizzes/quiz-module-dl-m01',
    );
    const learningApiClient = createLearningApiClient({
      createQuizAttempt: vi.fn().mockResolvedValue(createModuleQuizAttemptResult()),
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByText('Đạt ít nhất 70% để hoàn thành module và mở Playground Perceptron.'),
    ).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createQuizAttempt).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      quizId: 'quiz-module-dl-m01',
    });
    expect(screen.getByTestId('quiz-attempt')).not.toHaveTextContent(
      /correctAnswer|hint|explanation/i,
    );
  });

  it('lets an enrolled learner pass the post mastery quiz with server-side scoring', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở quiz bài học/i }));

    expect(await screen.findByRole('heading', { name: 'Quiz Perceptron/XOR' })).toBeVisible();
    expect(screen.getByText('Cần trả lời đúng cả 3 câu để hoàn thành bài.')).toBeVisible();
    expect(screen.getByTestId('quiz-attempt')).not.toHaveTextContent(/correctAnswer|hint/i);

    await user.click(
      screen.getByRole('radio', {
        name: 'Ranh giới quyết định thẳng có một giới hạn rõ.',
      }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Tổng có trọng số kèm độ lệch' }));
    await user.click(screen.getByRole('checkbox', { name: 'Hàm bước trả về 0 hoặc 1' }));
    await user.click(screen.getByRole('radio', { name: 'Đúng' }));
    await user.click(screen.getByRole('button', { name: 'Nộp quiz' }));

    expect(await screen.findByText('quiz_passed: quiz-post-dl-p01')).toBeVisible();
    expect(learningApiClient.submitQuizAttempt).toHaveBeenCalledWith({
      answers: [
        { questionId: 'q-dl-p01-perceptron-role', value: 'opt-linear-limit' },
        {
          questionId: 'q-dl-p01-perceptron-parts',
          value: ['opt-weighted-sum', 'opt-step-activation'],
        },
        { questionId: 'q-dl-p01-and-linearly-separable', value: 'true' },
      ],
      attemptId: 'attempt-quiz-post-dl-p01-01',
      idToken: 'local-id-token',
      idempotencyKey: expect.any(String),
    });
  });

  it('proves the learner baseline from enrollment through unlock, Playground persistence, and dashboard', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    installImmediatePlaygroundWorker();
    const user = userEvent.setup();
    const initialProgress = createInitialProgressSnapshot();
    const postPassedProgress = createPostPassedProgressSnapshot();
    const demoCompletedProgress = createDemoCompletedProgressSnapshot();
    const unlockedProgress = createUnlockedProgressSnapshot();
    const savedRuns = new Map<string, ReturnType<typeof createSavedPlaygroundRunFixture>>();
    const savedConfigs = new Map<string, ReturnType<typeof createSavedPlaygroundConfigFixture>>();
    const getProgress = vi
      .fn()
      .mockResolvedValueOnce(initialProgress)
      .mockResolvedValueOnce(initialProgress)
      .mockResolvedValueOnce(postPassedProgress)
      .mockResolvedValueOnce(demoCompletedProgress)
      .mockResolvedValueOnce(unlockedProgress)
      .mockResolvedValue(unlockedProgress);
    const baseLearningApiClient = createLearningApiClient();
    const createQuizAttempt = vi.fn((input: { idToken: string; quizId: string }) => {
      if (input.quizId === 'quiz-module-dl-m01') {
        return Promise.resolve(createModuleQuizAttemptResult());
      }

      return baseLearningApiClient.createQuizAttempt(input);
    });
    const submitQuizAttempt = vi.fn(
      (input: {
        answers: readonly { questionId: string; value: readonly string[] | string }[];
        attemptId: string;
        idToken: string;
        idempotencyKey: string;
      }) => {
        if (input.attemptId === 'attempt-quiz-module-dl-m01-01') {
          return Promise.resolve({
            bestScore: 100,
            feedback: [
              {
                correctAnswer: 'opt-boundary',
                explanation: {
                  en: 'A Perceptron line is the decision boundary.',
                  vi: 'Đường Perceptron là ranh giới quyết định.',
                },
                hint: null,
                hintLevel: 0 as const,
                isCorrect: true,
                questionId: 'q-dl-m01-boundary',
              },
            ],
            newlyUnlocked: [{ id: 'perceptron', type: 'algorithm' as const }],
            passed: true,
            score: 100,
          });
        }

        return baseLearningApiClient.submitQuizAttempt(input);
      },
    );
    const createPlaygroundConfig = vi.fn(
      async (input: {
        config: { epochs: number; learningRate: number; seed: number; trainRatio: number };
        name: string;
      }) => {
        const savedConfig = createSavedPlaygroundConfigFixture({
          config: input.config,
          configId: 'config-pg-xor-baseline',
          name: input.name,
        });

        savedConfigs.set(savedConfig.configId, savedConfig);

        return savedConfig;
      },
    );
    const savePlaygroundRun = vi.fn(async () => {
      const savedRun = createSavedPlaygroundRunFixture({ runId: 'run-pg-xor-baseline' });

      savedRuns.set(savedRun.runId, savedRun);

      return savedRun;
    });
    const learningApiClient = createLearningApiClient({
      createPlaygroundConfig,
      createQuizAttempt,
      getProgress,
      listPlaygroundConfigs: vi.fn(async () => [...savedConfigs.values()]),
      listPlaygroundRuns: vi.fn(async () => [...savedRuns.values()]),
      savePlaygroundRun,
      submitQuizAttempt,
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    expect(screen.getByText('Module hoàn thành: 0/3 bước')).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));
    expect(
      await screen.findByRole('heading', {
        name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
      }),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở quiz bài học/i }));
    expect(await screen.findByRole('heading', { name: 'Quiz Perceptron/XOR' })).toBeVisible();
    await user.click(
      screen.getByRole('radio', {
        name: 'Ranh giới quyết định thẳng có một giới hạn rõ.',
      }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Tổng có trọng số kèm độ lệch' }));
    await user.click(screen.getByRole('checkbox', { name: 'Hàm bước trả về 0 hoặc 1' }));
    await user.click(screen.getByRole('radio', { name: 'Đúng' }));
    await user.click(screen.getByRole('button', { name: 'Nộp quiz' }));

    expect(await screen.findByText('quiz_passed: quiz-post-dl-p01')).toBeVisible();
    expect(screen.queryByText('Perceptron đã mở')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Quay lại bài học' }));
    await user.click(await screen.findByRole('link', { name: /Mở demo AND gate/i }));
    expect(await screen.findByRole('heading', { name: 'Demo Perceptron: cổng AND' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));

    expect(await screen.findByText('demo_completed: demo-perceptron-and-gate')).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Mở quiz module' }));

    expect(
      await screen.findByText('Đạt ít nhất 70% để hoàn thành module và mở Playground Perceptron.'),
    ).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Ranh giới quyết định' }));
    await user.click(screen.getByRole('button', { name: 'Nộp quiz' }));

    expect(await screen.findByText('quiz_passed: quiz-module-dl-m01')).toBeVisible();
    expect(submitQuizAttempt).toHaveBeenLastCalledWith({
      answers: [{ questionId: 'q-dl-m01-boundary', value: 'opt-boundary' }],
      attemptId: 'attempt-quiz-module-dl-m01-01',
      idToken: 'local-id-token',
      idempotencyKey: expect.any(String),
    });

    window.history.pushState({}, '', '/playground/pg-xor');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(
      await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chạy' }));

    expect(await screen.findByText('run-pg-xor-baseline')).toBeVisible();
    await user.clear(screen.getByLabelText('Tên cấu hình'));
    await user.type(screen.getByLabelText('Tên cấu hình'), 'XOR baseline proof');
    await user.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));
    expect(await screen.findByText('XOR baseline proof')).toBeVisible();

    await user.clear(screen.getByRole('spinbutton', { name: 'Epochs' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Epochs' }), '120');
    await user.click(screen.getByRole('button', { name: /Khôi phục XOR baseline proof/i }));
    expect(screen.getByRole('spinbutton', { name: 'Epochs' })).toHaveValue(100);
    expect(learningApiClient.createPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      deviceProfile: 'desktop',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
    });

    await user.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard học viên' })).toBeVisible();
    expect(screen.getByText('Dữ liệu học tập server-verified')).toBeVisible();
    expect(screen.getByText('Perceptron đã mở')).toBeVisible();
    expect(screen.getByText('run-pg-xor-baseline')).toBeVisible();
    expect(screen.getByText('client-computed')).toBeVisible();

    vi.unstubAllGlobals();
  });
});
