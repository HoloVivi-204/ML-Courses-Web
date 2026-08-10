import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { getFixedDemo } from '../../../functions/src/release-demo-content.js';
import { getReadablePost } from '../../../functions/src/release-learning-content.js';
import { getReleaseLearningCatalog } from '../../../functions/src/release-learning-catalog.js';
import type { AuthGateway } from '../features/auth/auth-context';
import { getCourse } from '../features/catalog/course-data';
import {
  LearningApiError,
  type AdminContentSourceReview,
  type LearningApiClient,
  type PlaygroundConfig,
} from '../features/learning/learning-api';
import { getPublicQuizRoute } from '../features/learning/quiz-route-data';

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

function createAuthenticatedGateway(input: { role?: 'admin' | undefined } = {}): AuthGateway {
  return {
    getIdToken: vi.fn().mockResolvedValue('local-id-token'),
    observe(listener) {
      listener({
        email: 'learner@example.test',
        ...(input.role ? { role: input.role } : {}),
        uid: 'learner-01',
      });
      return () => undefined;
    },
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi.fn().mockResolvedValue(undefined),
  };
}

function createAdminContentPage<T>(content: readonly T[]) {
  return { content: [...content], nextCursor: null };
}

function createLearningApiClient(overrides: Partial<LearningApiClient> = {}): LearningApiClient {
  return {
    bootstrapProfile: vi.fn().mockResolvedValue(createLearnerProfileFixture()),
    createAvatarUploadSession: vi.fn().mockResolvedValue({
      contentType: 'image/png',
      expiresAt: '2026-08-09T16:15:00.000Z',
      metadata: {
        schemaVersion: '1',
        sha256: 'a'.repeat(64),
        sourceId: 'user-avatar',
      },
      storagePath: 'user-avatars/learner-01/avatar-01',
      uploadSessionId: 'avatar-session-01',
    }),
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
    completePost: vi.fn().mockResolvedValue({
      completion: {
        postId: 'dl-p01-neuron-perceptron',
        status: 'completed',
      },
    }),
    recordDemoView: vi.fn().mockImplementation(({ demoId, viewedStepIds }) =>
      Promise.resolve({
        demoView: {
          demoId,
          started: true,
          viewedStepIds,
        },
      }),
    ),
    recordModuleOverview: vi.fn().mockResolvedValue({
      moduleOverview: {
        moduleId: 'dl-m01-neuron-perceptron',
        nextPostId: 'dl-p01-neuron-perceptron',
        status: 'completed',
      },
    }),
    recordPostView: vi.fn().mockImplementation(({ postId, readingPosition, viewedItemIds }) => {
      const course = getReleaseLearningCatalog().courses.find((candidate) =>
        candidate.modules.some((module) => module.posts.some((post) => post.postId === postId)),
      );
      const post = course ? getReadablePost(course.courseId, postId, true) : undefined;
      const requiredBlockCount = post?.blocks.filter((block) => block.required).length ?? 0;

      return Promise.resolve({
        postView: {
          contentViewed: viewedItemIds.length >= requiredBlockCount,
          postId,
          readingPosition,
          started: true,
          viewedItemIds,
        },
      });
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
    attachAdminContentEvidence: vi.fn().mockImplementation(({ checksum, evidenceRef, kind }) =>
      Promise.resolve({
        artifactId: 'dl-p01-neuron-perceptron',
        checksum,
        evidenceRef,
        kind,
        result: 'pending',
      }),
    ),
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
    finalizeAvatarUpload: vi.fn().mockResolvedValue(createLearnerProfileFixture()),
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
      },
      enrollment: {
        courseId: 'course-deep-learning-basic',
        progressPercent: 0,
        status: 'in-progress',
      },
      nextPath: '/learn/course-deep-learning-basic',
    }),
    getCourseContent: vi.fn().mockImplementation((courseId) => {
      const course = getCourse(courseId);

      return course
        ? Promise.resolve({
            courseId,
            description: course.description,
            revisionId: `${courseId}-rev-r1`,
            title: course.title,
          })
        : Promise.reject(new Error(`Missing test course content for ${courseId}.`));
    }),
    getDemoContent: vi.fn().mockImplementation(({ demoId }) => {
      const demo = getFixedDemo(demoId);

      return demo
        ? Promise.resolve(demo)
        : Promise.reject(new Error(`Missing test demo content for ${demoId}.`));
    }),
    getFullPostContent: vi.fn().mockImplementation(({ postId }) => {
      const course = getReleaseLearningCatalog().courses.find((candidate) =>
        candidate.modules.some((module) => module.posts.some((post) => post.postId === postId)),
      );
      const post = course ? getReadablePost(course.courseId, postId, true) : undefined;

      return post
        ? Promise.resolve(post)
        : Promise.reject(new Error(`Missing test full post content for ${postId}.`));
    }),
    getModuleContent: vi.fn().mockImplementation((moduleId) => {
      const course = [
        getCourse('course-classical-ml'),
        getCourse('course-deep-learning-basic'),
      ].find((candidate) => candidate?.modules?.some((module) => module.id === moduleId));
      const module = course?.modules?.find((candidate) => candidate.id === moduleId);

      if (!course || !module) {
        return Promise.reject(new Error(`Missing test module content for ${moduleId}.`));
      }

      return Promise.resolve({
        courseId: course.id,
        description: module.description,
        moduleId,
        revisionId: `${moduleId}-rev-r1`,
        title: module.title,
      });
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
          requiredStepCount: 4,
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
    getRuntimeFeatureManifest: vi.fn().mockResolvedValue({
      checksum: 'a'.repeat(64),
      featureFlags: {
        additionalScenarioPairs: false,
        compareRuns: false,
        csvReports: false,
        demoAnimation: false,
        guidedPrediction: false,
        lessonSearch: false,
        pinRuns: false,
        quizDragDrop: false,
        quizMatching: false,
        studentDetailReports: false,
        targetScores: false,
      },
      releaseId: 'release-1',
      schemaVersion: 1,
    }),
    getQuizContent: vi.fn().mockImplementation((quizId) => {
      const quizRoute = getPublicQuizRoute(quizId);

      return quizRoute
        ? Promise.resolve({
            courseId: quizRoute.courseId,
            description: {
              en: `Mastery check for ${quizRoute.title.en}.`,
              vi: `Bài kiểm tra thành thạo cho ${quizRoute.title.vi}.`,
            },
            moduleId: quizRoute.moduleId,
            ...(quizRoute.postId ? { postId: quizRoute.postId } : {}),
            quizId,
            revisionId: `${quizId}-rev-r1`,
            title: quizRoute.title,
          })
        : Promise.reject(new Error(`Missing test quiz content for ${quizId}.`));
    }),
    getTrialPostContent: vi.fn().mockImplementation((postId) => {
      const course = getReleaseLearningCatalog().courses.find(
        (candidate) => candidate.trialPostId === postId,
      );
      const post = course ? getReadablePost(course.courseId, postId, false) : undefined;

      return post
        ? Promise.resolve(post)
        : Promise.reject(new Error(`Missing test trial post content for ${postId}.`));
    }),
    getAdminReportSummary: vi.fn().mockResolvedValue(createAdminReportSummaryFixture()),
    getAdminContentRevisionPreview: vi.fn().mockResolvedValue({
      draft: {
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
      },
      preview: {
        contentType: 'post',
        post: {
          accessLevel: 'full',
          blocks: [],
          courseId: 'course-deep-learning-basic',
          description: { en: 'Draft preview', vi: 'Preview draft' },
          durationMinutes: 8,
          id: 'dl-p01-neuron-perceptron',
          moduleId: 'dl-m01-neuron-perceptron',
          postQuizId: 'quiz-post-dl-p01',
          revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
          title: { en: 'Draft title', vi: 'Tiêu đề draft' },
        },
      },
    }),
    listAdminContent: vi.fn().mockResolvedValue({ content: [], nextCursor: null }),
    listAdminContentEvidence: vi.fn().mockResolvedValue({
      contentChecksum: 'a'.repeat(64),
      evidence: [],
    }),
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
  config?: PlaygroundConfig;
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

function createLinearModuleQuizAttemptResult() {
  return {
    attempt: {
      attemptId: 'attempt-quiz-module-cml-m02-01',
      attemptNumber: 1,
      expiresAt: '2026-07-19T13:00:00.000Z',
      passingScorePercent: 70,
      questionCount: 6,
      quizId: 'quiz-module-cml-m02',
      quizKind: 'module' as const,
      quizRevisionId: 'quiz-module-cml-m02-rev-r1',
      requiredCorrectCount: null,
      shuffleSeed: null,
    },
    mastery: {
      en: 'Score at least 70% to complete the module and unlock linear regression.',
      vi: 'Đạt ít nhất 70% để hoàn thành module và mở hồi quy tuyến tính.',
    },
    questions: [
      {
        options: [
          {
            optionId: 'opt-baseline',
            text: { en: 'Use a simple baseline first', vi: 'Dùng baseline đơn giản trước' },
          },
          {
            optionId: 'opt-memorize',
            text: { en: 'Memorise every row', vi: 'Ghi nhớ từng dòng' },
          },
        ],
        prompt: {
          en: 'What is the first modelling move in this module?',
          vi: 'Bước mô hình hóa đầu tiên trong module này là gì?',
        },
        questionId: 'q-cml-m02-baseline',
        sourceId: 'quiz-module-cml-m02-q01',
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
        requiredStepCount: 4,
        status: 'in-progress' as const,
      },
    ],
    posts: [],
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
        completedStepCount: 2,
        moduleId: 'dl-m01-neuron-perceptron',
        overviewViewed: true,
        progressPercent: 50,
        requiredStepCount: 4,
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
        completedStepCount: 3,
        moduleId: 'dl-m01-neuron-perceptron',
        overviewViewed: true,
        progressPercent: 75,
        requiredStepCount: 4,
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
        completedStepCount: 4,
        moduleId: 'dl-m01-neuron-perceptron',
        overviewViewed: true,
        progressPercent: 100,
        requiredStepCount: 4,
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

function createLinearModuleUnlockedProgressSnapshot() {
  return {
    algorithmUnlocks: [
      {
        algorithmId: 'linear-regression',
        moduleId: 'cml-m02-linear-polynomial',
      },
    ],
    contentAccess: [
      {
        contentType: 'module' as const,
        entityId: 'cml-m02-linear-polynomial',
      },
      {
        contentType: 'post' as const,
        entityId: 'cml-p03-linear-regression',
      },
      {
        contentType: 'post' as const,
        entityId: 'cml-p04-polynomial-regression',
      },
      {
        contentType: 'demo' as const,
        entityId: 'demo-linear-calibration',
      },
    ],
    demos: [
      {
        completed: true,
        demoId: 'demo-linear-calibration',
      },
    ],
    enrollment: {
      courseId: 'course-classical-ml',
      progressPercent: 22,
      status: 'in-progress' as const,
    },
    modules: [
      {
        completedStepCount: 4,
        moduleId: 'cml-m02-linear-polynomial',
        progressPercent: 100,
        requiredStepCount: 4,
        status: 'completed' as const,
      },
    ],
    posts: [
      {
        bestScore: 100,
        completed: true,
        postId: 'cml-p03-linear-regression',
        quizId: 'quiz-post-cml-p03',
        quizPassed: true,
      },
      {
        bestScore: 100,
        completed: true,
        postId: 'cml-p04-polynomial-regression',
        quizId: 'quiz-post-cml-p04',
        quizPassed: true,
      },
    ],
    quizzes: [
      {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        quizId: 'quiz-post-cml-p03',
        quizKind: 'post' as const,
      },
      {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        quizId: 'quiz-post-cml-p04',
        quizKind: 'post' as const,
      },
      {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        quizId: 'quiz-module-cml-m02',
        quizKind: 'module' as const,
      },
    ],
  };
}

function installVisibleContentBlockObserver() {
  class VisibleContentBlockObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}

    disconnect() {}

    observe(target: Element) {
      this.callback(
        [
          {
            isIntersecting: true,
            target,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    }

    takeRecords() {
      return [];
    }

    unobserve() {}
  }

  vi.stubGlobal('IntersectionObserver', VisibleContentBlockObserver);
}

function installImmediatePlaygroundWorker() {
  class ImmediatePlaygroundWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;

    postMessage(message: unknown) {
      const workerRequest = message as {
        request?: {
          algorithmId: string;
          datasetVersionId: string;
          runId: string;
          scenarioId: string;
        };
        type: string;
      };

      if (workerRequest.type === 'INIT') {
        queueMicrotask(() => {
          this.onmessage?.({ data: { backend: 'wasm', type: 'READY' } } as MessageEvent);
        });
        return;
      }

      if (workerRequest.type !== 'RUN' || !workerRequest.request) {
        return;
      }

      const request = workerRequest.request;

      queueMicrotask(() => {
        const isPcaRun =
          request.scenarioId === 'pg-country-indicators' &&
          request.algorithmId === 'pca' &&
          request.datasetVersionId === 'ds-country-indicators-v1';

        this.onmessage?.({
          data: {
            type: 'PROGRESS',
            event: isPcaRun
              ? {
                  runId: request.runId,
                  iteration: 1,
                  totalIterations: 1,
                  metric: {
                    id: 'explained-variance',
                    value: 1,
                  },
                }
              : {
                  runId: request.runId,
                  epoch: 100,
                  totalEpochs: 100,
                  loss: 0.5,
                },
          },
        } as MessageEvent);
        this.onmessage?.({
          data: {
            type: 'RESULT',
            result: isPcaRun
              ? {
                  runId: request.runId,
                  scenarioId: request.scenarioId,
                  algorithmId: request.algorithmId,
                  datasetVersionId: request.datasetVersionId,
                  chartSummary: {
                    kind: 'projection-2d',
                    components: 2,
                  },
                  determinism: 'exact',
                  feedback: [],
                  metrics: {
                    'explained-variance': 1,
                    'reconstruction-error': 0,
                  },
                  textAlternative: {
                    en: 'Two PCA components explain 100% of variance.',
                    vi: 'Hai thành phần PCA giải thích 100% phương sai.',
                  },
                }
              : {
                  runId: request.runId,
                  scenarioId: request.scenarioId,
                  algorithmId: request.algorithmId,
                  datasetVersionId: request.datasetVersionId,
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
                  textAlternative: {
                    en: 'Perceptron reaches 50% accuracy.',
                    vi: 'Perceptron đạt accuracy 50%.',
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

  it('shows the Administration navigation item when the Firebase token carries the Admin claim', async () => {
    window.history.pushState({}, '', '/');

    render(<App authGateway={createAuthenticatedGateway({ role: 'admin' })} />);

    expect(await screen.findByRole('link', { name: /quản trị|administration/i })).toHaveAttribute(
      'href',
      '/admin/content',
    );
  });

  it('does not show the Administration navigation item to a learner', async () => {
    window.history.pushState({}, '', '/');
    render(<App authGateway={createAuthenticatedGateway()} />);

    expect(
      screen.queryByRole('link', { name: /quản trị|administration/i }),
    ).not.toBeInTheDocument();
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

  it('loads and saves the learner profile preferences without copying Auth email to profile data', async () => {
    window.history.pushState({}, '', '/profile');
    const profile = {
      ...createLearnerProfileFixture(),
      createdAt: '2026-07-19T14:00:00.000Z',
    };
    const updatePreferences = vi.fn().mockResolvedValue({
      ...profile,
      locale: 'en' as const,
      theme: 'dark' as const,
    });
    const learningApiClient = createLearningApiClient({
      bootstrapProfile: vi.fn().mockResolvedValue(profile),
      updatePreferences,
    });
    const user = userEvent.setup();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('Local Student')).toBeVisible();
    expect(screen.getByText('learner@example.test')).toBeVisible();

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    await user.selectOptions(selects[0]!, 'en');
    await user.selectOptions(selects[1]!, 'dark');
    await user.click(screen.getByRole('button', { name: 'Lưu tùy chọn' }));

    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        locale: 'en',
        theme: 'dark',
      }),
    );
  });

  it('updates the display name through Firebase Auth and refreshes the verified profile', async () => {
    window.history.pushState({}, '', '/profile');
    const updateDisplayName = vi.fn().mockResolvedValue(undefined);
    const initialProfile = createLearnerProfileFixture();
    const refreshedProfile = {
      ...initialProfile,
      displayName: 'Updated Student',
    };
    const bootstrapProfile = vi
      .fn()
      .mockResolvedValueOnce(initialProfile)
      .mockResolvedValueOnce(refreshedProfile);
    const learningApiClient = createLearningApiClient({ bootstrapProfile });
    const user = userEvent.setup();
    const gateway = {
      ...createAuthenticatedGateway(),
      updateDisplayName,
    };

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    const displayNameInput = await screen.findByLabelText('Tên hiển thị');

    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'Updated Student');
    await user.click(screen.getByRole('button', { name: 'Lưu tên hiển thị' }));

    await waitFor(() => expect(updateDisplayName).toHaveBeenCalledWith('Updated Student'));
    await waitFor(() =>
      expect(bootstrapProfile).toHaveBeenLastCalledWith({
        idToken: 'local-id-token',
        locale: 'vi',
        theme: 'system',
      }),
    );
    expect(await screen.findByDisplayValue('Updated Student')).toBeVisible();
  });

  it('uploads an avatar through the server-issued session and renders only the finalized URL', async () => {
    window.history.pushState({}, '', '/profile');
    const initialProfile = createLearnerProfileFixture();
    const updatedProfile = {
      ...initialProfile,
      avatarUrl:
        'https://storage.example.test/v0/b/local/o/user-avatars%2Flearner-01%2Favatar-01?alt=media&token=server-token',
    };
    const createAvatarUploadSession = vi.fn().mockResolvedValue({
      contentType: 'image/png',
      expiresAt: '2026-08-09T16:15:00.000Z',
      metadata: {
        schemaVersion: '1',
        sha256: 'a'.repeat(64),
        sourceId: 'user-avatar',
      },
      storagePath: 'user-avatars/learner-01/avatar-01',
      uploadSessionId: 'avatar-session-01',
    });
    const finalizeAvatarUpload = vi.fn().mockResolvedValue(updatedProfile);
    const uploadAvatar = vi.fn().mockResolvedValue(undefined);
    const learningApiClient = createLearningApiClient({
      createAvatarUploadSession,
      finalizeAvatarUpload,
    });
    const user = userEvent.setup();

    render(
      <App
        authGateway={createAuthenticatedGateway()}
        avatarUploadStorageGateway={{ uploadAvatar }}
        learningApiClient={learningApiClient}
      />,
    );

    const fileInput = await screen.findByLabelText('Tải ảnh đại diện');
    const avatarFile = new File(
      [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])],
      'avatar.png',
      { type: 'image/png' },
    );

    await user.upload(fileInput, avatarFile);

    await waitFor(() =>
      expect(createAvatarUploadSession).toHaveBeenCalledWith({
        contentType: 'image/png',
        idToken: 'local-id-token',
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        sizeBytes: 9,
      }),
    );
    await waitFor(() =>
      expect(uploadAvatar).toHaveBeenCalledWith({
        file: avatarFile,
        uploadSession: expect.objectContaining({ uploadSessionId: 'avatar-session-01' }),
      }),
    );
    expect(finalizeAvatarUpload).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      uploadSessionId: 'avatar-session-01',
    });
    expect(
      await screen.findByRole('img', { name: 'Ảnh đại diện của Local Student' }),
    ).toHaveAttribute('src', updatedProfile.avatarUrl);
  });

  it('asks a password-provider learner to reauthenticate before retrying a stale deletion', async () => {
    window.history.pushState({}, '', '/profile');
    let authListener: ((user: { email: string | null; uid: string } | null) => void) | null = null;
    const reauthenticateWithPassword = vi.fn().mockResolvedValue(undefined);
    const signOut = vi.fn(async () => authListener?.(null));
    const gateway: AuthGateway = {
      ...createAuthenticatedGateway(),
      observe(listener) {
        authListener = listener;
        listener({
          email: 'learner@example.test',
          providerIds: ['password'],
          uid: 'learner-01',
        });
        return () => undefined;
      },
      reauthenticateWithPassword,
      signOut,
    };
    const deleteAccount = vi
      .fn()
      .mockRejectedValueOnce(
        new LearningApiError(
          401,
          'RECENT_SIGN_IN_REQUIRED',
          'Recent authentication is required before deleting this account.',
        ),
      )
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(
      <App authGateway={gateway} learningApiClient={createLearningApiClient({ deleteAccount })} />,
    );

    await screen.findByRole('heading', { name: 'Hồ sơ tài khoản' });
    await user.type(screen.getByLabelText('Nhập DELETE để xác nhận'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Xóa tài khoản' }));

    const passwordInput = await screen.findByLabelText('Mật khẩu để xác thực lại');

    await user.type(passwordInput, 'demo-password');
    await user.click(screen.getByRole('button', { name: 'Xác thực lại và tiếp tục xóa' }));

    await waitFor(() => expect(reauthenticateWithPassword).toHaveBeenCalledWith('demo-password'));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(2));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('keeps password reauthentication available after an invalid credential', async () => {
    window.history.pushState({}, '', '/profile');
    const reauthenticateWithPassword = vi.fn().mockRejectedValue(new Error('Invalid credentials.'));
    const gateway: AuthGateway = {
      ...createAuthenticatedGateway(),
      observe(listener) {
        listener({
          email: 'learner@example.test',
          providerIds: ['password'],
          uid: 'learner-01',
        });
        return () => undefined;
      },
      reauthenticateWithPassword,
    };
    const deleteAccount = vi
      .fn()
      .mockRejectedValueOnce(
        new LearningApiError(
          401,
          'RECENT_SIGN_IN_REQUIRED',
          'Recent authentication is required before deleting this account.',
        ),
      );
    const user = userEvent.setup();

    render(
      <App authGateway={gateway} learningApiClient={createLearningApiClient({ deleteAccount })} />,
    );

    await screen.findByRole('heading', { name: 'Hồ sơ tài khoản' });
    await user.type(screen.getByLabelText('Nhập DELETE để xác nhận'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Xóa tài khoản' }));

    const passwordInput = await screen.findByLabelText('Mật khẩu để xác thực lại');

    await user.type(passwordInput, 'incorrect-password');
    await user.click(screen.getByRole('button', { name: 'Xác thực lại và tiếp tục xóa' }));

    await waitFor(() =>
      expect(reauthenticateWithPassword).toHaveBeenCalledWith('incorrect-password'),
    );
    expect(await screen.findByLabelText('Mật khẩu để xác thực lại')).toHaveValue(
      'incorrect-password',
    );
    expect(deleteAccount).toHaveBeenCalledTimes(1);
  });

  it('offers Google reauthentication without exposing a password field to a Google-only learner', async () => {
    window.history.pushState({}, '', '/profile');
    const reauthenticateWithGoogle = vi.fn().mockResolvedValue(undefined);
    const gateway: AuthGateway = {
      ...createAuthenticatedGateway(),
      observe(listener) {
        listener({
          email: 'learner@example.test',
          providerIds: ['google.com'],
          uid: 'learner-01',
        });
        return () => undefined;
      },
      reauthenticateWithGoogle,
    };
    const deleteAccount = vi
      .fn()
      .mockRejectedValueOnce(
        new LearningApiError(
          401,
          'RECENT_SIGN_IN_REQUIRED',
          'Recent authentication is required before deleting this account.',
        ),
      )
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(
      <App authGateway={gateway} learningApiClient={createLearningApiClient({ deleteAccount })} />,
    );

    await screen.findByRole('heading', { name: 'Hồ sơ tài khoản' });
    await user.type(screen.getByLabelText('Nhập DELETE để xác nhận'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Xóa tài khoản' }));

    expect(await screen.findByRole('button', { name: 'Xác thực lại với Google' })).toBeVisible();
    expect(screen.queryByLabelText('Mật khẩu để xác thực lại')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xác thực lại với Google' }));

    await waitFor(() => expect(reauthenticateWithGoogle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(2));
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

      render(<App learningApiClient={createLearningApiClient()} />);

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

      render(<App learningApiClient={createLearningApiClient()} />);

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

    render(<App learningApiClient={createLearningApiClient()} />);

    const contents = await screen.findByRole(
      'navigation',
      { name: 'Mục lục bài học' },
      { timeout: LAZY_ROUTE_TIMEOUT_MS },
    );
    expect(contents).toBeVisible();
    expect(within(contents).getByRole('link', { name: 'Perceptron làm gì?' })).toHaveAttribute(
      'href',
      '#what-is-a-neuron',
    );
    expect(screen.getByRole('heading', { name: 'Từ feature đến lựa chọn nhị phân' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Đọc kết quả từ phép tính' })).toBeVisible();
  });

  it('keeps the trial lesson open when a guest switches to English', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    const user = userEvent.setup();

    render(<App learningApiClient={createLearningApiClient()} />);

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

    render(<App learningApiClient={createLearningApiClient()} />);

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

    render(<App learningApiClient={createLearningApiClient()} />);

    const resource = await screen.findByRole(
      'link',
      {
        name: 'Introduction to Neural Networks: Perceptron',
      },
      { timeout: LAZY_ROUTE_TIMEOUT_MS },
    );
    expect(resource).toHaveAttribute('target', '_blank');
    expect(resource).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getAllByText(/microsoft ai for beginners/i)).toHaveLength(2);
  });

  it('shows the full Perceptron/XOR lesson only to an authenticated learner', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(
      screen.getByRole('link', {
        name: /Mở tổng quan module|Tiếp tục module|Open module overview|Resume module/i,
      }),
    );
    await user.click(
      await screen.findByRole('link', {
        name: /Mở bài viết|Tiếp tục đọc|Tiếp tục bài viết|Xem lại bài viết|Ôn lại bài viết|Open post|Resume post|Review post/i,
      }),
    );

    expect(learningApiClient.recordModuleOverview).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      moduleId: 'dl-m01-neuron-perceptron',
    });

    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Nơi một lớp tuyến tính dừng lại',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();
    expect(screen.getByText('Vì sao AND được nhưng XOR không')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Where a single linear layer stops',
      }),
    ).toBeVisible();
    expect(screen.getByText('FULL LESSON')).toBeVisible();
  });

  it('renders course, module, and quiz copy from their current published learner documents', async () => {
    const user = userEvent.setup();
    const getCourseContent = vi.fn().mockResolvedValue({
      courseId: 'course-deep-learning-basic',
      description: {
        en: 'Course description from revision r2.',
        vi: 'Mô tả khóa học từ revision r2.',
      },
      revisionId: 'course-deep-learning-basic-rev-r2',
      title: {
        en: 'Course title from revision r2',
        vi: 'Tiêu đề khóa học từ revision r2',
      },
    });
    const getModuleContent = vi.fn().mockImplementation((moduleId) => {
      if (moduleId === 'dl-m01-neuron-perceptron') {
        return Promise.resolve({
          courseId: 'course-deep-learning-basic',
          description: {
            en: 'Module description from revision r2.',
            vi: 'Mô tả module từ revision r2.',
          },
          moduleId,
          revisionId: 'dl-m01-neuron-perceptron-rev-r2',
          title: {
            en: 'Module title from revision r2',
            vi: 'Tiêu đề module từ revision r2',
          },
        });
      }

      const course = getCourse('course-deep-learning-basic');
      const module = course?.modules?.find((candidate) => candidate.id === moduleId);

      if (!course || !module) {
        return Promise.reject(new Error(`Missing module fixture for ${moduleId}.`));
      }

      return Promise.resolve({
        courseId: course.id,
        description: module.description,
        moduleId,
        revisionId: `${moduleId}-rev-r1`,
        title: module.title,
      });
    });
    const getQuizContent = vi.fn().mockImplementation((quizId) => {
      if (quizId === 'quiz-post-dl-p01') {
        return Promise.resolve({
          courseId: 'course-deep-learning-basic',
          description: {
            en: 'Quiz description from revision r2.',
            vi: 'Mô tả quiz từ revision r2.',
          },
          moduleId: 'dl-m01-neuron-perceptron',
          postId: 'dl-p01-neuron-perceptron',
          quizId,
          revisionId: 'quiz-post-dl-p01-rev-r2',
          title: {
            en: 'Quiz title from revision r2',
            vi: 'Tiêu đề quiz từ revision r2',
          },
        });
      }

      const quizRoute = getPublicQuizRoute(quizId);

      return quizRoute
        ? Promise.resolve({
            courseId: quizRoute.courseId,
            description: {
              en: `Mastery check for ${quizRoute.title.en}.`,
              vi: `Bài kiểm tra thành thạo cho ${quizRoute.title.vi}.`,
            },
            moduleId: quizRoute.moduleId,
            quizId,
            revisionId: `${quizId}-rev-r1`,
            title: quizRoute.title,
          })
        : Promise.reject(new Error(`Missing quiz fixture for ${quizId}.`));
    });
    const learningApiClient = createLearningApiClient({
      getCourseContent,
      getModuleContent,
      getQuizContent,
    });

    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const courseView = render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('Tiêu đề khóa học từ revision r2')).toBeVisible();
    expect(screen.getByText('Mô tả khóa học từ revision r2.')).toBeVisible();
    expect(getCourseContent).toHaveBeenCalledWith('course-deep-learning-basic');

    courseView.unmount();
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/modules/dl-m01-neuron-perceptron',
    );
    const moduleView = render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Tiêu đề module từ revision r2' }),
    ).toBeVisible();
    expect(screen.getByText('Mô tả module từ revision r2.')).toBeVisible();
    expect(getModuleContent).toHaveBeenCalledWith('dl-m01-neuron-perceptron');

    moduleView.unmount();
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/quizzes/quiz-post-dl-p01');
    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Tiêu đề quiz từ revision r2' }),
    ).toBeVisible();
    expect(screen.getByText('Mô tả quiz từ revision r2.')).toBeVisible();
    expect(getQuizContent).toHaveBeenCalledWith('quiz-post-dl-p01');
    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));
    expect(
      await screen.findByRole('heading', { name: 'Quiz title from revision r2' }),
    ).toBeVisible();
  });

  it('keeps an existing learner in a planned-unpublished course without reopening enrollment', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const enrollCourse = vi
      .fn()
      .mockRejectedValue(
        new LearningApiError(
          403,
          'CONTENT_NOT_PUBLISHED',
          'The course is no longer accepting enrollments.',
        ),
      );
    const getProgress = vi.fn().mockResolvedValue(createUnlockedProgressSnapshot());
    const learningApiClient = createLearningApiClient({ enrollCourse, getProgress });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Học sâu cơ bản' })).toBeVisible();
    expect(enrollCourse).toHaveBeenCalledWith({
      courseId: 'course-deep-learning-basic',
      idToken: 'local-id-token',
      idempotencyKey: expect.any(String),
    });
    expect(getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.getCourseContent).toHaveBeenCalledWith('course-deep-learning-basic');
  });

  it('deduplicates course enrollment when React StrictMode replays the route effect', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const learningApiClient = createLearningApiClient();

    render(
      <StrictMode>
        <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />
      </StrictMode>,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await waitFor(() => expect(learningApiClient.enrollCourse).toHaveBeenCalledTimes(1));
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
          name: 'Nơi một lớp tuyến tính dừng lại',
        },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getByText('Vì sao AND được nhưng XOR không')).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Where a single linear layer stops',
      }),
    ).toBeVisible();
  });

  it('opens a source-pinned classical linear lesson on authenticated deep links with backend access', async () => {
    window.history.pushState({}, '', '/learn/course-classical-ml/posts/cml-p03-linear-regression');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createLinearModuleUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Đọc baseline tuyến tính qua bằng chứng phần dư' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getByText('Nguồn dùng cho bài học này')).toBeVisible();
    expect(screen.getByText('cml-p03-linear-regression')).toBeVisible();
    expect(learningApiClient.getFullPostContent).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      postId: 'cml-p03-linear-regression',
    });
    await waitFor(() =>
      expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token'),
    );
  });

  it('offers a saved reading position that survives a locale change', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        ...createInitialProgressSnapshot(),
        posts: [
          {
            bestScore: 0,
            completed: false,
            contentViewed: false,
            postId: 'dl-p01-neuron-perceptron',
            quizId: 'quiz-post-dl-p01',
            quizPassed: false,
            readingPosition: 'weighted-sum',
            started: true,
            viewedItemIds: ['what-is-a-neuron'],
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    const resumeBanner = await screen.findByRole(
      'complementary',
      { name: 'Tiếp tục phần đang đọc' },
      { timeout: LAZY_ROUTE_TIMEOUT_MS },
    );
    expect(resumeBanner).toHaveAttribute('data-reading-position', 'weighted-sum');
    expect(within(resumeBanner).getByText(/weighted-sum/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    const englishResumeBanner = await screen.findByRole('complementary', {
      name: 'Resume your reading',
    });
    expect(englishResumeBanner).toHaveAttribute('data-reading-position', 'weighted-sum');
    const savedBlock = document.getElementById('weighted-sum');
    expect(savedBlock).not.toBeNull();
    const scrollIntoView = vi.fn();
    savedBlock!.scrollIntoView = scrollIntoView;

    await user.click(
      within(englishResumeBanner).getByRole('button', { name: 'Jump to saved position' }),
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
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
            completedStepCount: 4,
            moduleId: 'dl-m01-neuron-perceptron',
            overviewViewed: true,
            progressPercent: 100,
            requiredStepCount: 4,
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
    expect(screen.getByText('Module hoàn thành: 4/4 bước')).toBeVisible();
    expect(screen.getByText('Quiz bài học: 100% · đạt · 1 lần làm')).toBeVisible();
    expect(screen.getByText('Quiz module: 100% · đạt · 1 lần làm')).toBeVisible();
    expect(screen.getByText('Perceptron đã mở')).toBeVisible();
    expect(screen.getByRole('link', { name: /Mở Playground Perceptron/i })).toHaveAttribute(
      'href',
      '/playground/pg-xor',
    );
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
  });

  it('shows a module overview CTA for every opened module and explains locked prerequisites', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        ...createUnlockedProgressSnapshot(),
        courses: [
          {
            courseId: 'course-deep-learning-basic',
            demos: [],
            modules: [
              {
                completedStepCount: 4,
                moduleId: 'dl-m01-neuron-perceptron',
                overviewViewed: true,
                progressPercent: 100,
                requiredStepCount: 4,
                status: 'completed' as const,
              },
              {
                completedStepCount: 0,
                moduleId: 'dl-m02-mlp',
                overviewViewed: false,
                progressPercent: 0,
                requiredStepCount: 4,
                status: 'in-progress' as const,
              },
              {
                completedStepCount: 0,
                moduleId: 'dl-m03-training-generalization',
                overviewViewed: false,
                progressPercent: 0,
                requiredStepCount: 4,
                status: 'locked' as const,
              },
            ],
            posts: [],
            progressPercent: 33,
            quizzes: [],
            status: 'in-progress' as const,
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    await waitFor(() =>
      expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token'),
    );
    expect(await screen.findByRole('heading', { name: 'Học sâu cơ bản' })).toBeVisible();
    expect(screen.getByRole('link', { name: /mở tổng quan module/i })).toHaveAttribute(
      'href',
      '/learn/course-deep-learning-basic/modules/dl-m02-mlp',
    );
    expect(screen.getByText('Hoàn thành dl-m02-mlp trước.')).toBeVisible();
  });

  it('opens the requested module overview and keeps its sequence links module-scoped', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/modules/dl-m02-mlp');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        ...createInitialProgressSnapshot(),
        contentAccess: [
          { contentType: 'module' as const, entityId: 'dl-m02-mlp' },
          { contentType: 'post' as const, entityId: 'dl-p02-mlp-forward-activation' },
        ],
        courses: [
          {
            courseId: 'course-deep-learning-basic',
            demos: [],
            modules: [
              {
                completedStepCount: 4,
                moduleId: 'dl-m01-neuron-perceptron',
                overviewViewed: true,
                progressPercent: 100,
                requiredStepCount: 4,
                status: 'completed' as const,
              },
              {
                completedStepCount: 0,
                moduleId: 'dl-m02-mlp',
                overviewViewed: false,
                progressPercent: 0,
                requiredStepCount: 4,
                status: 'in-progress' as const,
              },
              {
                completedStepCount: 0,
                moduleId: 'dl-m03-training-generalization',
                overviewViewed: false,
                progressPercent: 0,
                requiredStepCount: 4,
                status: 'locked' as const,
              },
            ],
            posts: [],
            progressPercent: 33,
            quizzes: [],
            status: 'in-progress' as const,
          },
        ],
      }),
      recordModuleOverview: vi.fn().mockResolvedValue({
        moduleOverview: {
          moduleId: 'dl-m02-mlp',
          nextPostId: 'dl-p02-mlp-forward-activation',
          status: 'completed' as const,
        },
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mạng nơ-ron nhiều lớp' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /mở bài viết/i })).toHaveAttribute(
      'href',
      '/learn/course-deep-learning-basic/posts/dl-p02-mlp-forward-activation',
    );
    expect(
      screen.getByText('Hoàn thành mọi bài viết trong module trước khi xem demo.'),
    ).toBeVisible();
    expect(learningApiClient.recordModuleOverview).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      moduleId: 'dl-m02-mlp',
    });
  });

  it('marks the first incomplete post as the next step after an earlier post is complete', async () => {
    window.history.pushState({}, '', '/learn/course-classical-ml/modules/cml-m01-foundations');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        ...createInitialProgressSnapshot(),
        contentAccess: [
          { contentType: 'module' as const, entityId: 'cml-m01-foundations' },
          { contentType: 'post' as const, entityId: 'cml-p01-problem-data-types' },
          { contentType: 'post' as const, entityId: 'cml-p02-train-test-metrics' },
        ],
        enrollment: {
          courseId: 'course-classical-ml',
          progressPercent: 25,
          status: 'in-progress' as const,
        },
        modules: [
          {
            completedStepCount: 2,
            moduleId: 'cml-m01-foundations',
            overviewViewed: true,
            progressPercent: 50,
            requiredStepCount: 4,
            status: 'in-progress' as const,
          },
        ],
        posts: [
          {
            bestScore: 100,
            completed: true,
            contentViewed: true,
            postId: 'cml-p01-problem-data-types',
            quizId: 'quiz-post-cml-p01',
            quizPassed: true,
            readingPosition: 'problem-data-types',
            started: true,
            viewedItemIds: ['problem-data-types'],
          },
        ],
      }),
      recordModuleOverview: vi.fn().mockResolvedValue({
        moduleOverview: {
          moduleId: 'cml-m01-foundations',
          nextPostId: 'cml-p01-problem-data-types',
          status: 'completed' as const,
        },
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    const nextPost = await screen.findByRole('link', { name: 'Mở bài viết' });
    expect(nextPost).toHaveAttribute(
      'href',
      '/learn/course-classical-ml/posts/cml-p02-train-test-metrics',
    );
    expect(nextPost).toHaveAttribute('data-next-post', 'true');
    expect(screen.getByRole('link', { name: 'Xem lại bài viết' })).not.toHaveAttribute(
      'data-next-post',
    );
  });

  it('fails closed when the backend rejects a locked module overview', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/modules/dl-m02-mlp');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn(),
      recordModuleOverview: vi.fn().mockRejectedValue(new Error('Module prerequisite missing.')),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Module bị khóa' })).toBeVisible();
    expect(screen.getByText('403 / MODULE')).toBeVisible();
    expect(learningApiClient.getProgress).not.toHaveBeenCalled();
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
    expect(screen.getByText('Module hoàn thành 4/4 bước')).toBeVisible();
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
      limit: 12,
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
    const listAdminContent = vi.fn().mockResolvedValue(
      createAdminContentPage([
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
      ]),
    );
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
    const listAdminContent = vi.fn().mockResolvedValue(
      createAdminContentPage([
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
      ]),
    );
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

  it('renders a durable draft through learner components and keeps attached evidence pending', async () => {
    window.history.pushState({}, '', '/admin/content');
    const user = userEvent.setup();
    const checksum = 'b'.repeat(64);
    const draft = {
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post' as const,
      localeAvailability: ['en', 'vi'] as const,
      metadata: {
        attribution: {
          en: 'Seed attribution',
          vi: 'Nguồn seed',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Draft runtime description',
        vi: 'Mô tả runtime draft',
      },
      revisionVersion: 1,
      sourceStatus: 'seeded' as const,
      status: 'draft' as const,
      title: {
        en: 'Learner runtime title',
        vi: 'Tiêu đề runtime learner',
      },
      validationStatus: 'not-run' as const,
    };
    const readablePost = getReadablePost(
      'course-deep-learning-basic',
      'dl-p01-neuron-perceptron',
      true,
    );

    if (!readablePost) {
      throw new Error('Expected seeded learner post content.');
    }

    let evidence = [] as Array<{
      artifactId: string;
      checksum: string;
      evidenceRef: string;
      kind: 'license';
      result: 'pending';
    }>;
    const attachAdminContentEvidence = vi.fn().mockImplementation((input) => {
      const attachedEvidence = {
        artifactId: 'dl-p01-neuron-perceptron',
        checksum: input.checksum,
        evidenceRef: input.evidenceRef,
        kind: input.kind,
        result: 'pending' as const,
      };

      evidence = [attachedEvidence];

      return Promise.resolve(attachedEvidence);
    });
    const getAdminContentRevisionPreview = vi.fn().mockResolvedValue({
      draft,
      preview: {
        contentType: 'post' as const,
        post: {
          ...readablePost,
          description: draft.preview,
          revisionId: draft.draftRevisionId,
          title: draft.title,
        },
      },
    });
    const listAdminContentEvidence = vi.fn().mockImplementation(() => {
      return Promise.resolve({ contentChecksum: checksum, evidence });
    });
    const listAdminContent = vi.fn().mockResolvedValue(
      createAdminContentPage([
        {
          courseId: 'course-deep-learning-basic',
          draftRevisionId: draft.draftRevisionId,
          entityId: 'dl-p01-neuron-perceptron',
          entityType: 'post' as const,
          localeAvailability: ['en', 'vi'] as const,
          moduleId: 'dl-m01-neuron-perceptron',
          preview: {
            en: 'Published learner copy',
            vi: 'Bản published cho learner',
          },
          publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
          sourceStatus: 'seeded' as const,
          status: 'published' as const,
          title: {
            en: 'Published title',
            vi: 'Tiêu đề published',
          },
          validationStatus: 'not-run' as const,
        },
      ]),
    );
    const learningApiClient = createLearningApiClient({
      attachAdminContentEvidence,
      getAdminContentRevisionPreview,
      listAdminContent,
      listAdminContentEvidence,
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    const learnerPreview = await screen.findByTestId(
      'admin-learner-preview-post',
      {},
      { timeout: LAZY_ROUTE_TIMEOUT_MS },
    );

    expect(
      within(learnerPreview).getByRole('heading', { name: 'Tiêu đề runtime learner' }),
    ).toBeVisible();
    expect(within(learnerPreview).getByText('Mô tả runtime draft')).toBeVisible();
    expect(
      within(learnerPreview).getByRole('heading', { name: 'Từ feature đến lựa chọn nhị phân' }),
    ).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Ngôn ngữ preview'), 'en');
    expect(
      within(learnerPreview).getByRole('heading', { name: 'Learner runtime title' }),
    ).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Giao diện preview'), 'dark');
    expect(learnerPreview).toHaveAttribute('data-preview-theme', 'dark');

    await user.type(screen.getByLabelText('Reference'), 'evidence://license-review/runtime');
    await user.click(screen.getByRole('button', { name: 'Attach pending evidence' }));

    expect(attachAdminContentEvidence).toHaveBeenCalledWith({
      checksum,
      evidenceRef: 'evidence://license-review/runtime',
      idToken: 'local-id-token',
      kind: 'license',
      revisionId: draft.draftRevisionId,
    });
    expect(await screen.findByText('evidence://license-review/runtime')).toBeVisible();
    expect(screen.getByText('pending', { exact: true })).toBeVisible();
  });

  it('lets an authenticated admin edit a draft with revision concurrency', async () => {
    window.history.pushState({}, '', '/admin/content');
    const user = userEvent.setup();
    const listAdminContent = vi.fn().mockResolvedValue(
      createAdminContentPage([
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
      ]),
    );
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
  }, 10_000);

  it('lets an authenticated admin validate and publish a draft from the content screen', async () => {
    window.history.pushState({}, '', '/admin/content');
    const user = userEvent.setup();
    const listAdminContent = vi.fn().mockResolvedValue(
      createAdminContentPage([
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
      ]),
    );
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
    expect(
      await screen.findByText(
        'Chỉ demo trên Emulator cục bộ. Thao tác này không phê duyệt publish production.',
      ),
    ).toBeVisible();
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
      publicationScope: 'emulator-demo',
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

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Playground chưa mở khóa' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    const lockedLabList = screen.getByRole('list', {
      name: 'Danh sách lab Playground đã khóa',
    });

    expect(
      within(lockedLabList).getByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();
    expect(
      within(lockedLabList).getByRole('heading', { name: 'Playground XOR: MLP' }),
    ).toBeVisible();
    expect(within(lockedLabList).getAllByText('Đã khóa')).toHaveLength(2);
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createPlaygroundRunSession).not.toHaveBeenCalled();
  });

  it('shows all ten Playground scenarios with Must access states in the catalog', async () => {
    window.history.pushState({}, '', '/playground');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Danh mục Playground' })).toBeVisible();
    expect(screen.getAllByTestId(/playground-scenario-card-/)).toHaveLength(10);
    expect(screen.getByTestId('playground-scenario-card-pg-xor')).toHaveTextContent('Đã mở');
    expect(screen.getByTestId('playground-scenario-card-pg-house-price')).toHaveTextContent(
      'Đã khóa',
    );
    expect(screen.getByTestId('playground-scenario-card-pg-house-price')).toHaveTextContent(
      'Cần hoàn thành module',
    );
    expect(screen.getAllByRole('link', { name: /Mở scenario/i })).toHaveLength(10);
  });

  it('selects a fixed dataset through the dataset button and drag-drop command', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
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
    const tray = screen.getByTestId('playground-dataset-tray');
    const datasetCard = screen.getByTestId('playground-dataset-card-ds-xor-noisy-v1');

    expect(tray).toHaveTextContent('ds-xor-noisy-v1');
    const useDatasetButton = within(datasetCard).getByRole('button', {
      name: /Sử dụng dataset/i,
    });
    await user.click(useDatasetButton);
    expect(useDatasetButton).toHaveAttribute('aria-pressed', 'true');

    const dataTransfer = {
      files: [],
      getData: vi.fn().mockReturnValue('ds-xor-noisy-v1'),
      setData: vi.fn(),
    };

    fireEvent.dragOver(tray, { dataTransfer });
    fireEvent.drop(tray, { dataTransfer });
    expect(screen.getByTestId('playground-selected-dataset')).toHaveTextContent('ds-xor-noisy-v1');
  });

  it('reshuffles a seeded dataset without starting a new run', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
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
    expect(screen.getByRole('spinbutton', { name: 'Seed' })).toHaveValue(42);

    await user.click(screen.getByRole('button', { name: 'Chia lại dữ liệu' }));

    expect(screen.getByRole('spinbutton', { name: 'Seed' })).not.toHaveValue(42);
    expect(screen.getByText('Sẵn sàng chạy')).toBeVisible();
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chạy' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Chạy' }));

    expect(await screen.findByText('Đã chạy xong')).toBeVisible();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(screen.getByTestId('playground-chart-decision-boundary')).toBeVisible();
    expect(screen.getByTestId('playground-loss-chart')).toBeVisible();
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

  it('switches pg-xor to MLP when both XOR algorithms are unlocked', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    installImmediatePlaygroundWorker();
    const user = userEvent.setup();
    const createPlaygroundRunSession = vi.fn(
      async (input: Parameters<LearningApiClient['createPlaygroundRunSession']>[0]) => ({
        sessionId: 'session-xor-mlp-01',
        scenarioId: input.scenarioId,
        algorithmId: input.algorithmId,
        datasetVersionId: input.datasetVersionId,
        config: input.config,
        configHash: '8'.repeat(64),
        expiresAt: '2026-07-19T14:00:00.000Z',
        status: 'issued' as const,
        verificationLevel: 'client-computed' as const,
        workerProtocolVersion: 'ml-worker-v1' as const,
      }),
    );
    const learningApiClient = createLearningApiClient({
      createPlaygroundRunSession,
      getProgress: vi.fn().mockResolvedValue({
        ...createUnlockedProgressSnapshot(),
        algorithmUnlocks: [
          {
            algorithmId: 'perceptron',
            moduleId: 'dl-m01-neuron-perceptron',
          },
          {
            algorithmId: 'mlp',
            moduleId: 'dl-m02-mlp',
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();

    await user.selectOptions(screen.getByRole('combobox'), 'pg-xor/mlp/ds-xor-noisy-v1');

    expect(await screen.findByRole('heading', { name: 'Playground XOR: MLP' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Hidden layers' })).toHaveValue('4');
    expect(screen.getByRole('combobox', { name: 'Activation' })).toHaveValue('tanh');

    await user.click(screen.getByRole('button', { name: 'Chạy' }));

    expect(await screen.findByText('Đã chạy xong')).toBeVisible();
    expect(learningApiClient.createPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-xor',
      algorithmId: 'mlp',
      datasetVersionId: 'ds-xor-noisy-v1',
      deviceProfile: 'desktop',
      config: {
        hiddenLayers: [4],
        activation: 'tanh',
        learningRate: 0.05,
        epochs: 300,
        trainRatio: 0.75,
        seed: 42,
      },
    });
    await waitFor(() =>
      expect(learningApiClient.savePlaygroundRun).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        idempotencyKey: expect.any(String),
        sessionId: 'session-xor-mlp-01',
        result: expect.objectContaining({
          scenarioId: 'pg-xor',
          algorithmId: 'mlp',
          datasetVersionId: 'ds-xor-noisy-v1',
          configHash: '8'.repeat(64),
        }),
      }),
    );
    vi.unstubAllGlobals();
  });

  it('runs pg-country-indicators PCA through the registry-driven playground UI', async () => {
    window.history.pushState({}, '', '/playground/pg-country-indicators');
    installImmediatePlaygroundWorker();
    const user = userEvent.setup();
    const createPlaygroundRunSession = vi.fn(
      async (input: Parameters<LearningApiClient['createPlaygroundRunSession']>[0]) => ({
        sessionId: 'session-country-pca-01',
        scenarioId: input.scenarioId,
        algorithmId: input.algorithmId,
        datasetVersionId: input.datasetVersionId,
        config: input.config,
        configHash: '7'.repeat(64),
        expiresAt: '2026-07-19T14:00:00.000Z',
        status: 'issued' as const,
        verificationLevel: 'client-computed' as const,
        workerProtocolVersion: 'ml-worker-v1' as const,
      }),
    );
    const savePlaygroundRun = vi.fn(async () => ({
      runId: 'run-country-pca-01',
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      config: {
        components: 2,
        scale: true,
      },
      durationMs: 24,
      feedback: [] as const,
      isPinned: false as const,
      metrics: {
        'explained-variance': 1,
        'reconstruction-error': 0,
      },
      createdAt: '2026-07-19T14:00:00.000Z',
      targetReached: null,
      targetVersionId: null,
      verificationLevel: 'client-computed' as const,
    }));
    const learningApiClient = createLearningApiClient({
      createPlaygroundRunSession,
      getProgress: vi.fn().mockResolvedValue({
        ...createUnlockedProgressSnapshot(),
        algorithmUnlocks: [
          {
            algorithmId: 'pca',
            moduleId: 'cml-m09-pca',
          },
        ],
      }),
      savePlaygroundRun,
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: /PCA/i })).toBeVisible();
    expect(screen.getByText('pg-country-indicators / pca')).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: 'Components' })).toHaveValue(2);

    await user.click(screen.getByRole('button', { name: 'Chạy' }));

    expect(await screen.findByText('Đã chạy xong')).toBeVisible();
    expect(screen.getByText('Explained variance')).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();
    expect(learningApiClient.listPlaygroundRuns).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-country-indicators',
    });
    expect(learningApiClient.createPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      deviceProfile: 'desktop',
      config: {
        components: 2,
        scale: true,
      },
    });
    await waitFor(() =>
      expect(learningApiClient.savePlaygroundRun).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        idempotencyKey: expect.any(String),
        sessionId: 'session-country-pca-01',
        result: expect.objectContaining({
          scenarioId: 'pg-country-indicators',
          algorithmId: 'pca',
          datasetVersionId: 'ds-country-indicators-v1',
          configHash: '7'.repeat(64),
        }),
      }),
    );
    expect(await screen.findByText('run-country-pca-01')).toBeVisible();
    vi.unstubAllGlobals();
  });

  it.each([
    {
      scenarioId: 'pg-house-price',
      algorithmId: 'linear-regression',
      datasetVersionId: 'ds-house-price-v1',
      moduleId: 'cml-m02-linear-polynomial',
      expectedConfig: {
        fitIntercept: true,
        trainRatio: 0.8,
        seed: 42,
      },
    },
    {
      scenarioId: 'pg-spam-detection',
      algorithmId: 'logistic-regression',
      datasetVersionId: 'ds-sms-spam-v1',
      moduleId: 'cml-m04-logistic-classification',
      expectedConfig: {
        learningRate: 0.05,
        epochs: 300,
        threshold: 0.5,
        trainRatio: 0.8,
        seed: 42,
      },
    },
    {
      scenarioId: 'pg-credit-risk',
      algorithmId: 'decision-tree',
      datasetVersionId: 'ds-credit-risk-v1',
      moduleId: 'cml-m06-trees-forest',
      expectedConfig: {
        maxDepth: 5,
        minSamplesLeaf: 5,
        trainRatio: 0.8,
        seed: 42,
      },
    },
    {
      scenarioId: 'pg-retail-segments',
      algorithmId: 'kmeans',
      datasetVersionId: 'ds-retail-segments-v1',
      moduleId: 'cml-m08-clustering',
      expectedConfig: {
        k: 4,
        maxIterations: 100,
        seed: 42,
      },
    },
  ])(
    'runs $scenarioId/$algorithmId through the registry default config',
    async ({ algorithmId, datasetVersionId, expectedConfig, moduleId, scenarioId }) => {
      window.history.pushState({}, '', `/playground/${scenarioId}`);
      installImmediatePlaygroundWorker();
      const user = userEvent.setup();
      const createPlaygroundRunSession = vi.fn(
        async (input: Parameters<LearningApiClient['createPlaygroundRunSession']>[0]) => ({
          sessionId: `session-${scenarioId}-${algorithmId}-01`,
          scenarioId: input.scenarioId,
          algorithmId: input.algorithmId,
          datasetVersionId: input.datasetVersionId,
          config: input.config,
          configHash: '6'.repeat(64),
          expiresAt: '2026-07-19T14:00:00.000Z',
          status: 'issued' as const,
          verificationLevel: 'client-computed' as const,
          workerProtocolVersion: 'ml-worker-v1' as const,
        }),
      );
      const learningApiClient = createLearningApiClient({
        createPlaygroundRunSession,
        getProgress: vi.fn().mockResolvedValue({
          ...createUnlockedProgressSnapshot(),
          algorithmUnlocks: [
            {
              algorithmId,
              moduleId,
            },
          ],
        }),
      });

      render(
        <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
      );

      expect(await screen.findByText(`${scenarioId} / ${algorithmId}`)).toBeVisible();
      expect(learningApiClient.listPlaygroundRuns).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        scenarioId,
      });
      expect(learningApiClient.listPlaygroundConfigs).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        scenarioId,
      });

      await user.click(screen.getByRole('button', { name: 'Chạy' }));

      expect(await screen.findByText('Đã chạy xong')).toBeVisible();
      expect(learningApiClient.createPlaygroundRunSession).toHaveBeenCalledWith({
        idToken: 'local-id-token',
        scenarioId,
        algorithmId,
        datasetVersionId,
        deviceProfile: 'desktop',
        config: expectedConfig,
      });
      await waitFor(() =>
        expect(learningApiClient.savePlaygroundRun).toHaveBeenCalledWith({
          idToken: 'local-id-token',
          idempotencyKey: expect.any(String),
          sessionId: `session-${scenarioId}-${algorithmId}-01`,
          result: expect.objectContaining({
            scenarioId,
            algorithmId,
            datasetVersionId,
            configHash: '6'.repeat(64),
          }),
        }),
      );
      vi.unstubAllGlobals();
    },
  );

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

  it('keeps a desktop-compatible config read-only when it exceeds the mobile limit', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    installMobileViewport();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
      listPlaygroundConfigs: vi.fn().mockResolvedValue([
        createSavedPlaygroundConfigFixture({
          config: {
            epochs: 500,
            learningRate: 0.1,
            seed: 42,
            trainRatio: 0.75,
          },
          configId: 'config-pg-xor-desktop-only',
          name: 'Desktop only',
        }),
      ]),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('Desktop only')).toBeVisible();
    const restoreButton = screen.getByRole('button', { name: /Khôi phục Desktop only/i });

    expect(restoreButton).toBeDisabled();
    expect(screen.getByText(/epochs must be between 10 and 200 for mobile/i)).toBeVisible();
    vi.unstubAllGlobals();
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
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Epochs' }), {
      target: { value: '200' },
    });
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
    expect(screen.getByText(/Giới hạn mobile: epochs ≤ 200/i)).toBeVisible();
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
      getFullPostContent: vi.fn().mockRejectedValue(new Error('Post access denied.')),
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
    expect(learningApiClient.getFullPostContent).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      postId: 'dl-p01-neuron-perceptron',
    });
    expect(learningApiClient.getProgress).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', {
        name: 'Nơi một lớp tuyến tính dừng lại',
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/post_dl-p01-neuron-perceptron/)).not.toBeInTheDocument();
  });

  it('does not unlock full post content from a forged session storage grant', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    sessionStorage.setItem(
      'ml-path-learning-access-grants',
      JSON.stringify([
        {
          courseId: 'course-deep-learning-basic',
          postId: 'dl-p01-neuron-perceptron',
          uid: 'learner-01',
        },
      ]),
    );
    const learningApiClient = createLearningApiClient({
      getFullPostContent: vi.fn().mockRejectedValue(new Error('Post access denied.')),
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
    expect(learningApiClient.getFullPostContent).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      postId: 'dl-p01-neuron-perceptron',
    });
    expect(learningApiClient.getProgress).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', {
        name: 'Nơi một lớp tuyến tính dừng lại',
      }),
    ).not.toBeInTheDocument();
  });

  it('does not flash cached locked content after reload when local and session storage are forged', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    const forgedCache = JSON.stringify({
      answerKey: 'forged-answer-key',
      blocks: [{ id: 'forged-block', text: 'FORGED LOCKED CONTENT' }],
      completed: true,
      score: 100,
      unlocked: ['perceptron'],
    });
    localStorage.setItem('ml-path-learning-content-cache', forgedCache);
    sessionStorage.setItem('ml-path-learning-content-cache', forgedCache);
    const learningApiClient = createLearningApiClient({
      getFullPostContent: vi.fn().mockRejectedValue(new Error('Content emergency blocked.')),
    });

    const firstLoad = render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(screen.queryByText('FORGED LOCKED CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText('forged-answer-key')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        name: /Một neuron đưa ra quyết định như thế nào/i,
      }),
    ).toBeVisible();
    firstLoad.unmount();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(screen.queryByText('FORGED LOCKED CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText('forged-answer-key')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        name: /Một neuron đưa ra quyết định như thế nào/i,
      }),
    ).toBeVisible();
    expect(learningApiClient.getFullPostContent).toHaveBeenCalledTimes(2);
    expect(learningApiClient.getProgress).not.toHaveBeenCalled();
  });

  it('keeps the fixed AND gate demo closed without a module access grant', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/demos/demo-perceptron-and-gate',
    );
    const learningApiClient = createLearningApiClient({
      getDemoContent: vi.fn().mockRejectedValue(new Error('Demo access denied.')),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Demo chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.completeDemo).not.toHaveBeenCalled();
  });

  it('keeps the fixed AND gate demo closed until backend progress grants demo access', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getDemoContent: vi.fn().mockRejectedValue(new Error('Demo access denied.')),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(
      screen.getByRole('link', {
        name: /Mở tổng quan module|Tiếp tục module|Open module overview|Resume module/i,
      }),
    );
    await user.click(
      await screen.findByRole('link', {
        name: /Mở bài viết|Tiếp tục đọc|Tiếp tục bài viết|Xem lại bài viết|Ôn lại bài viết|Open post|Resume post|Review post/i,
      }),
    );
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Nơi một lớp tuyến tính dừng lại',
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
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Demo Perceptron: cổng AND' })).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: /Bảng chân trị AND cố định có ba hàng âm/i,
      }),
    ).toBeVisible();
    expect(learningApiClient.getDemoContent).toHaveBeenCalledWith({
      demoId: 'demo-perceptron-and-gate',
      idToken: 'local-id-token',
    });
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
            completedStepCount: 2,
            moduleId: 'dl-m01-neuron-perceptron',
            overviewViewed: true,
            progressPercent: 50,
            requiredStepCount: 4,
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
    await user.click(
      screen.getByRole('link', {
        name: /Mở tổng quan module|Tiếp tục module|Open module overview|Resume module/i,
      }),
    );
    await user.click(
      await screen.findByRole('link', {
        name: /Mở bài viết|Tiếp tục đọc|Tiếp tục bài viết|Xem lại bài viết|Ôn lại bài viết|Open post|Resume post|Review post/i,
      }),
    );
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Nơi một lớp tuyến tính dừng lại',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở demo AND gate/i }));

    expect(await screen.findByRole('heading', { name: 'Demo Perceptron: cổng AND' })).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: /Bảng chân trị AND cố định có ba hàng âm/i,
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

  it('opens and completes a source-pinned classical fixed demo with backend access', async () => {
    window.history.pushState({}, '', '/learn/course-classical-ml/demos/demo-linear-calibration');
    const user = userEvent.setup();
    const completeDemo = vi.fn().mockResolvedValue({
      completion: {
        demoId: 'demo-linear-calibration',
        status: 'completed',
      },
      event: {
        demoId: 'demo-linear-calibration',
        requiredStepIds: ['linear-problem', 'linear-data', 'linear-line', 'linear-residual'],
        type: 'demo_completed',
        viewedStepIds: ['linear-problem', 'linear-data', 'linear-line', 'linear-residual'],
      },
    });
    const learningApiClient = createLearningApiClient({
      completeDemo,
      getProgress: vi.fn().mockResolvedValue(createLinearModuleUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Demo hồi quy tuyến tính: đường hiệu chuẩn cố định' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: /Thẻ bài toán nêu một quan hệ đầu vào và đầu ra số cố định để hiệu chuẩn/i,
      }),
    ).toBeVisible();
    expect(screen.getByRole('status', { name: 'Tiến độ demo' })).toHaveTextContent(
      'Bước bắt buộc 1 / 4',
    );

    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));

    expect(await screen.findByText('demo_completed: demo-linear-calibration')).toBeVisible();
    expect(completeDemo).toHaveBeenCalledWith({
      demoId: 'demo-linear-calibration',
      idToken: 'local-id-token',
      idempotencyKey: expect.any(String),
      viewedStepIds: ['linear-problem', 'linear-data', 'linear-line', 'linear-residual'],
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

  it('opens the post mastery quiz under React StrictMode after auth context settles', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/quizzes/quiz-post-dl-p01');
    const learningApiClient = createLearningApiClient();

    render(
      <StrictMode>
        <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />
      </StrictMode>,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Quiz Perceptron/XOR' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createQuizAttempt).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      quizId: 'quiz-post-dl-p01',
    });
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

  it('opens a generic classical module quiz after backend verifies posts and demo completion', async () => {
    window.history.pushState({}, '', '/learn/course-classical-ml/quizzes/quiz-module-cml-m02');
    const learningApiClient = createLearningApiClient({
      createQuizAttempt: vi.fn().mockResolvedValue(createLinearModuleQuizAttemptResult()),
      getProgress: vi.fn().mockResolvedValue(createLinearModuleUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Quiz module Hồi quy tuyến tính và đa thức' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(
      screen.getByText('Đạt ít nhất 70% để hoàn thành module và mở hồi quy tuyến tính.'),
    ).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createQuizAttempt).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      quizId: 'quiz-module-cml-m02',
    });
    expect(screen.getByTestId('quiz-attempt')).not.toHaveTextContent(
      /correctAnswer|hint|explanation/i,
    );
  });

  it('gives useful first-wrong feedback and renders hint levels one and two', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/quizzes/quiz-post-dl-p01');
    const attempt = {
      attempt: {
        attemptId: 'attempt-quiz-post-dl-p01-feedback',
        attemptNumber: 1,
        expiresAt: '2026-07-19T13:00:00.000Z',
        passingScorePercent: 100,
        questionCount: 1,
        quizId: 'quiz-post-dl-p01',
        quizKind: 'post' as const,
        quizRevisionId: 'quiz-post-dl-p01-rev-r1',
        requiredCorrectCount: 1,
        shuffleSeed: null,
      },
      mastery: {
        en: 'Answer the question to review the lesson.',
        vi: 'Trả lời câu hỏi để xem lại bài học.',
      },
      questions: [
        {
          options: [
            { optionId: 'opt-correct', text: { en: 'Correct option', vi: 'Đáp án đúng' } },
            { optionId: 'opt-wrong', text: { en: 'Wrong option', vi: 'Đáp án sai' } },
          ],
          prompt: { en: 'Which option is useful?', vi: 'Lựa chọn nào hữu ích?' },
          questionId: 'q-feedback',
          sourceId: 'source-feedback',
          type: 'single-choice' as const,
        },
      ],
    };
    const submitQuizAttempt = vi
      .fn()
      .mockResolvedValueOnce({
        bestScore: 0,
        feedback: [
          {
            hint: null,
            hintLevel: 0 as const,
            isCorrect: false,
            questionId: 'q-feedback',
          },
        ],
        newlyUnlocked: [],
        passed: false,
        score: 0,
      })
      .mockResolvedValueOnce({
        bestScore: 0,
        feedback: [
          {
            hint: {
              en: 'Start with the observable boundary.',
              vi: 'Bắt đầu từ ranh giới quan sát được.',
            },
            hintLevel: 1 as const,
            isCorrect: false,
            questionId: 'q-feedback',
          },
        ],
        newlyUnlocked: [],
        passed: false,
        score: 0,
      })
      .mockResolvedValueOnce({
        bestScore: 0,
        feedback: [
          {
            hint: {
              en: 'Compare the straight boundary with XOR.',
              vi: 'So sánh ranh giới thẳng với XOR.',
            },
            hintLevel: 2 as const,
            isCorrect: false,
            questionId: 'q-feedback',
          },
        ],
        newlyUnlocked: [],
        passed: false,
        score: 0,
      });
    const learningApiClient = createLearningApiClient({
      createQuizAttempt: vi.fn().mockResolvedValue(attempt),
      submitQuizAttempt,
    });
    const user = userEvent.setup();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    await screen.findByRole('radio', { name: 'Đáp án đúng' });
    await user.click(screen.getByRole('button', { name: /tiếng Anh/i }));
    await user.click(screen.getByRole('radio', { name: 'Correct option' }));
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));
    expect(
      await screen.findByText(/Review this concept, then try the question again\./i),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(await screen.findByRole('radio', { name: 'Correct option' }));
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));
    expect(await screen.findByText(/Hint 1: Start with the observable boundary\./i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(await screen.findByRole('radio', { name: 'Correct option' }));
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));
    expect(
      await screen.findByText(/Hint 2: Compare the straight boundary with XOR\./i),
    ).toBeVisible();
  });

  it('lets an enrolled learner pass the post mastery quiz with server-side scoring', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    installVisibleContentBlockObserver();
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(
      screen.getByRole('link', {
        name: /Mở tổng quan module|Tiếp tục module|Open module overview|Resume module/i,
      }),
    );
    await user.click(
      await screen.findByRole('link', {
        name: /Mở bài viết|Tiếp tục đọc|Tiếp tục bài viết|Xem lại bài viết|Ôn lại bài viết|Open post|Resume post|Review post/i,
      }),
    );
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Nơi một lớp tuyến tính dừng lại',
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
    expect(screen.getByText('Đáp án đúng')).toBeVisible();
    expect(screen.getByText('Giải thích')).toBeVisible();
    expect(screen.getByText('Nguồn tham khảo')).toBeVisible();
    expect(screen.getByText('act-dl-p01-neuron-perceptron-quiz-01')).toBeVisible();
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
    installVisibleContentBlockObserver();
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
      async (input: { config: PlaygroundConfig; name: string }) => {
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
      listPlaygroundRuns: vi.fn(async () => ({
        nextCursor: null,
        runs: [...savedRuns.values()],
      })),
      savePlaygroundRun,
      submitQuizAttempt,
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    expect(screen.getByText('Module hoàn thành: 0/4 bước')).toBeVisible();

    await user.click(
      screen.getByRole('link', {
        name: /Mở tổng quan module|Tiếp tục module|Open module overview|Resume module/i,
      }),
    );
    await user.click(
      await screen.findByRole('link', {
        name: /Mở bài viết|Tiếp tục đọc|Tiếp tục bài viết|Xem lại bài viết|Ôn lại bài viết|Open post|Resume post|Review post/i,
      }),
    );
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Nơi một lớp tuyến tính dừng lại',
        },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
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

    installImmediatePlaygroundWorker();
    await user.click(screen.getByRole('link', { name: /Mở Playground Perceptron/i }));

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Playground XOR: Perceptron' },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
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
  }, 15_000);
});
