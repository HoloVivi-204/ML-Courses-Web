import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { AuthContext, type AuthContextValue } from '../auth/auth-context';
import type { LearningApiClient, LearningProgressSnapshot } from '../learning/learning-api';
import { StudentDashboardPage } from './student-dashboard-page';

function createAuthContextValue(): AuthContextValue {
  return {
    error: null,
    getIdToken: vi.fn().mockResolvedValue('local-id-token'),
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

function createProgressSnapshot(): LearningProgressSnapshot {
  return {
    algorithmUnlocks: [],
    contentAccess: [],
    courseCatalog: [
      {
        courseId: 'course-classical-ml',
        demos: [],
        modules: [
          {
            completedStepCount: 0,
            missingConditions: ['overview:cml-m01-foundations', 'post:cml-p01-problem-data-types'],
            moduleId: 'cml-m01-foundations',
            overviewViewed: false,
            progressPercent: 0,
            requiredStepCount: 4,
            status: 'locked',
          },
        ],
        posts: [],
        progressPercent: 0,
        quizzes: [],
        status: 'not-enrolled',
      },
      {
        courseId: 'course-deep-learning-basic',
        demos: [],
        modules: [
          {
            completedStepCount: 1,
            moduleId: 'dl-m01-neuron-perceptron',
            overviewViewed: true,
            progressPercent: 25,
            requiredStepCount: 4,
            status: 'in-progress',
          },
          {
            completedStepCount: 0,
            moduleId: 'dl-m02-mlp',
            overviewViewed: false,
            progressPercent: 0,
            requiredStepCount: 4,
            status: 'in-progress',
          },
          {
            completedStepCount: 0,
            moduleId: 'dl-m03-training-generalization',
            overviewViewed: false,
            progressPercent: 0,
            requiredStepCount: 3,
            status: 'in-progress',
          },
        ],
        posts: [
          {
            bestScore: 0.5,
            completed: false,
            contentViewed: true,
            postId: 'dl-p01-neuron-perceptron',
            quizId: 'quiz-post-dl-p01',
            quizPassed: false,
            readingPosition: 'decision-boundary',
            started: true,
            viewedItemIds: ['intro'],
          },
          {
            bestScore: 0,
            completed: false,
            contentViewed: false,
            postId: 'dl-p02-mlp-forward-activation',
            quizId: 'quiz-post-dl-p02',
            quizPassed: false,
            readingPosition: null,
            started: false,
            viewedItemIds: [],
          },
          {
            bestScore: 0,
            completed: false,
            contentViewed: false,
            postId: 'dl-p03-backprop-overfitting',
            quizId: 'quiz-post-dl-p03',
            quizPassed: false,
            readingPosition: null,
            started: false,
            viewedItemIds: [],
          },
        ],
        progressPercent: 25,
        quizzes: [
          {
            attemptCount: 2,
            bestScore: 0.5,
            passed: false,
            quizId: 'quiz-post-dl-p01',
            quizKind: 'post',
          },
        ],
        status: 'in-progress',
      },
    ],
    demos: [],
    enrollment: {
      courseId: 'course-deep-learning-basic',
      progressPercent: 25,
      status: 'in-progress',
    },
    modules: [],
    playgroundActivity: [
      {
        algorithmId: 'perceptron',
        failedRunCount: 1,
        runCount: 2,
        scenarioId: 'pg-xor',
      },
      {
        algorithmId: 'mlp',
        failedRunCount: 0,
        runCount: 0,
        scenarioId: 'pg-nonlinear-2d',
      },
    ],
    posts: [],
    quizzes: [],
  };
}

describe('StudentDashboardPage', () => {
  it('renders enrolled courses, missing conditions, and scenario activity', async () => {
    const learningApiClient = {
      getProgress: vi.fn().mockResolvedValue(createProgressSnapshot()),
      listPlaygroundRuns: vi.fn().mockResolvedValue({ nextCursor: null, runs: [] }),
    } as unknown as LearningApiClient;
    window.localStorage.setItem('ml-path-locale', 'en');

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={createAuthContextValue()}>
          <MemoryRouter>
            <StudentDashboardPage learningApiClient={learningApiClient} locale="en" />
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    expect(await screen.findByText('1 enrolled courses')).toBeVisible();
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Classical Machine Learning' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Deep Learning Basics' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open learning path' })).toHaveAttribute(
      'href',
      '/learn/course-deep-learning-basic',
    );
    expect(
      screen.queryByText(
        'Next conditions: overview:cml-m01-foundations, post:cml-p01-problem-data-types',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText((text) => text.startsWith('Perceptron') && text.includes('2 runs')),
    ).toBeVisible();
    expect(screen.getAllByText('not started')).toHaveLength(2);
    expect(
      within(screen.getByRole('region', { name: 'Playground activity by scenario' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(1);
  });
});
