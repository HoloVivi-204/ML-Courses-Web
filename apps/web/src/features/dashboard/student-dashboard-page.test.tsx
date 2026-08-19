import { render, screen } from '@testing-library/react';
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
            missingConditions: undefined,
            moduleId: 'cml-m01-foundations',
            overviewViewed: false,
            progressPercent: 100,
            requiredStepCount: 4,
            status: 'completed',
          },
        ],
        posts: [],
        progressPercent: 100,
        quizzes: [],
        status: 'completed',
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
  it('prioritizes the active course and hides secondary progress details', async () => {
    const listPlaygroundRuns = vi.fn();
    const learningApiClient = {
      getProgress: vi.fn().mockResolvedValue(createProgressSnapshot()),
      listPlaygroundRuns,
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

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Deep Learning Basics' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Other courses' })).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Classical Machine Learning' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Your courses' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('25%')).toBeVisible();
    expect(screen.getByText('1 of 11 steps')).toBeVisible();
    expect(screen.getByText('Current module')).toBeVisible();
    expect(screen.getByText('Module 1 · Neurons and Perceptrons')).toBeVisible();
    expect(screen.getByText('Next up')).toBeVisible();
    expect(screen.getByText('Lesson 1')).toBeVisible();
    expect(screen.getByText('3 modules · 3 lessons · 4 hours')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Continue learning' })).toHaveAttribute(
      'href',
      '/learn/course-deep-learning-basic',
    );
    expect(listPlaygroundRuns).not.toHaveBeenCalled();
    expect(screen.queryByText('not started')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Playground activity by scenario' }),
    ).not.toBeInTheDocument();
  });
});
