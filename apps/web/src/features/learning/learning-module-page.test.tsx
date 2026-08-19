import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { AuthContext, type AuthContextValue } from '../auth/auth-context';
import { LearningApiError, type LearningApiClient } from './learning-api';
import { LearningModulePage } from './learning-module-page';

const COURSE_ID = 'course-classical-ml';
const MODULE_ID = 'cml-m01-foundations';
const FIRST_POST_ID = 'cml-p01-problem-data-types';
const MODULE_QUIZ_ID = 'quiz-module-cml-m01';

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
});
