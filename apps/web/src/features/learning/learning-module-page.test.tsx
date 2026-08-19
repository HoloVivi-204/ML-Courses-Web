import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { AuthContext, type AuthContextValue } from '../auth/auth-context';
import {
  LearningApiError,
  type LearningApiClient,
  type LearningProgressSnapshot,
} from './learning-api';
import { LearningModulePage } from './learning-module-page';

const COURSE_ID = 'course-classical-ml';
const MODULE_ID = 'cml-m01-foundations';
const FIRST_POST_ID = 'cml-p01-problem-data-types';
const MODULE_QUIZ_ID = 'quiz-module-cml-m01';
const DEEP_COURSE_ID = 'course-deep-learning-basic';
const DEEP_MODULE_ID = 'dl-m02-mlp';
const DEEP_POST_ID = 'dl-p02-mlp-forward-activation';
const DEEP_DEMO_ID = 'demo-mlp-checkerboard';
const DEEP_MODULE_QUIZ_ID = 'quiz-module-dl-m02';

function createAuthContextValue(): AuthContextValue {
  return {
    error: null,
    getIdToken: vi.fn().mockResolvedValue('learner-id-token'),
    isSubmitting: false,
    reauthenticateWithGoogle: vi.fn().mockResolvedValue(true),
    reauthenticateWithPassword: vi.fn().mockResolvedValue(true),
    requestPasswordReset: vi.fn().mockResolvedValue(true),
    signInWithEmail: vi.fn().mockResolvedValue(true),
    signInWithGoogle: vi.fn().mockResolvedValue(true),
    signOut: vi.fn().mockResolvedValue(true),
    signUpWithEmail: vi.fn().mockResolvedValue(true),
    updateDisplayName: vi.fn().mockResolvedValue(true),
    status: 'authenticated',
    user: { email: 'learner@example.test', uid: 'learner-01' },
  };
}

function createProgressSnapshot() {
  return {
    algorithmUnlocks: [],
    contentAccess: [
      { contentType: 'module' as const, entityId: MODULE_ID },
      { contentType: 'post' as const, entityId: FIRST_POST_ID },
    ],
    demos: [],
    enrollment: {
      courseId: COURSE_ID,
      progressPercent: 0,
      status: 'in-progress' as const,
    },
    modules: [
      {
        completedStepCount: 1,
        moduleId: MODULE_ID,
        overviewViewed: true,
        progressPercent: 25,
        requiredStepCount: 4,
        status: 'in-progress' as const,
      },
    ],
    posts: [
      {
        bestScore: 0,
        completed: false,
        contentViewed: false,
        postId: FIRST_POST_ID,
        quizId: 'quiz-post-cml-p01',
        quizPassed: false,
        readingPosition: null,
        started: false,
        viewedItemIds: [],
      },
    ],
    quizzes: [],
  };
}

function createMultiCourseProgressSnapshot(): LearningProgressSnapshot {
  return {
    algorithmUnlocks: [],
    contentAccess: [
      { contentType: 'module', entityId: DEEP_MODULE_ID },
      { contentType: 'post', entityId: DEEP_POST_ID },
      { contentType: 'demo', entityId: DEEP_DEMO_ID },
    ],
    courses: [
      {
        courseId: COURSE_ID,
        demos: [],
        modules: [],
        posts: [],
        progressPercent: 0,
        quizzes: [],
        status: 'in-progress',
      },
      {
        courseId: DEEP_COURSE_ID,
        demos: [{ completed: true, demoId: DEEP_DEMO_ID, started: true }],
        modules: [
          {
            completedStepCount: 3,
            moduleId: DEEP_MODULE_ID,
            overviewViewed: true,
            progressPercent: 75,
            requiredStepCount: 4,
            status: 'in-progress',
          },
        ],
        posts: [
          {
            bestScore: 100,
            completed: true,
            contentViewed: true,
            postId: DEEP_POST_ID,
            quizId: 'quiz-post-dl-p02',
            quizPassed: true,
            readingPosition: 'end',
            started: true,
            viewedItemIds: ['intro'],
          },
        ],
        progressPercent: 75,
        quizzes: [],
        status: 'in-progress',
      },
    ],
    demos: [],
    enrollment: {
      courseId: COURSE_ID,
      progressPercent: 0,
      status: 'in-progress',
    },
    modules: [],
    posts: [],
    quizzes: [],
  };
}

describe('LearningModulePage', () => {
  it('enrolls a learner before opening a module from a public course page', async () => {
    const callOrder: string[] = [];
    const enrollCourse = vi.fn().mockImplementation(async () => {
      callOrder.push('enroll');

      return {
        access: { moduleId: MODULE_ID },
        enrollment: { courseId: COURSE_ID, progressPercent: 0, status: 'in-progress' as const },
        nextPath: `/learn/${COURSE_ID}`,
      };
    });
    const recordModuleOverview = vi.fn().mockImplementation(async () => {
      callOrder.push('module-overview');

      if (enrollCourse.mock.calls.length === 0) {
        throw new LearningApiError(403, 'MODULE_ACCESS_REQUIRED', 'Module access is required.');
      }

      return {
        moduleOverview: {
          moduleId: MODULE_ID,
          nextPostId: FIRST_POST_ID,
          status: 'completed' as const,
        },
      };
    });
    const learningApiClient = {
      enrollCourse,
      getModuleContent: vi.fn().mockResolvedValue({
        courseId: COURSE_ID,
        description: { en: 'Foundations', vi: 'Nền tảng' },
        moduleId: MODULE_ID,
        revisionId: `${MODULE_ID}-revision`,
        title: { en: 'Problems, data and metrics', vi: 'Bài toán, dữ liệu và metric' },
      }),
      getProgress: vi.fn().mockResolvedValue(createProgressSnapshot()),
      getQuizContent: vi.fn().mockResolvedValue({
        courseId: COURSE_ID,
        description: { en: 'Module quiz', vi: 'Quiz module' },
        moduleId: MODULE_ID,
        quizId: MODULE_QUIZ_ID,
        revisionId: `${MODULE_QUIZ_ID}-revision`,
        title: { en: 'Module quiz', vi: 'Quiz module' },
      }),
      recordModuleOverview,
    } as unknown as LearningApiClient;

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={createAuthContextValue()}>
          <MemoryRouter initialEntries={[`/learn/${COURSE_ID}/modules/${MODULE_ID}`]}>
            <Routes>
              <Route
                path="/learn/:courseId/modules/:moduleId"
                element={<LearningModulePage learningApiClient={learningApiClient} locale="en" />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Problems, data and metrics' }),
    ).toBeVisible();
    expect(callOrder).toEqual(['enroll', 'module-overview']);
  });

  it('uses the current course demo progress when multiple enrollments exist', async () => {
    const learningApiClient = {
      getModuleContent: vi.fn().mockResolvedValue({
        courseId: DEEP_COURSE_ID,
        description: { en: 'Multilayer perceptrons', vi: 'Mạng nơ-ron nhiều lớp' },
        moduleId: DEEP_MODULE_ID,
        revisionId: `${DEEP_MODULE_ID}-revision`,
        title: { en: 'Multilayer Perceptrons', vi: 'Mạng nơ-ron nhiều lớp' },
      }),
      getProgress: vi.fn().mockResolvedValue(createMultiCourseProgressSnapshot()),
      getQuizContent: vi.fn().mockResolvedValue({
        courseId: DEEP_COURSE_ID,
        description: { en: 'Module quiz', vi: 'Quiz module' },
        moduleId: DEEP_MODULE_ID,
        quizId: DEEP_MODULE_QUIZ_ID,
        revisionId: `${DEEP_MODULE_QUIZ_ID}-revision`,
        title: { en: 'Module quiz', vi: 'Quiz module' },
      }),
      recordModuleOverview: vi.fn().mockResolvedValue({
        moduleOverview: {
          moduleId: DEEP_MODULE_ID,
          nextPostId: DEEP_POST_ID,
          status: 'completed' as const,
        },
      }),
    } as unknown as LearningApiClient;

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={createAuthContextValue()}>
          <MemoryRouter initialEntries={[`/learn/${DEEP_COURSE_ID}/modules/${DEEP_MODULE_ID}`]}>
            <Routes>
              <Route
                path="/learn/:courseId/modules/:moduleId"
                element={<LearningModulePage learningApiClient={learningApiClient} locale="en" />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    expect(await screen.findByRole('link', { name: 'Làm quiz module' })).toHaveAttribute(
      'href',
      `/learn/${DEEP_COURSE_ID}/quizzes/${DEEP_MODULE_QUIZ_ID}`,
    );
  });
});
