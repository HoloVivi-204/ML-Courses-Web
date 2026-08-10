import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../auth/auth-context';
import type { AdminReportSummary, LearningApiClient } from '../learning/learning-api';
import { createAppI18n } from '../../shared/i18n/i18n';
import { AdminReportsPage } from './admin-reports-page';

function createAuthContextValue(): AuthContextValue {
  return {
    error: null,
    getIdToken: vi.fn().mockResolvedValue('local-admin-token'),
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
    user: { email: 'admin@example.test', role: 'admin', uid: 'admin-01' },
  };
}

function createReportSummary(): AdminReportSummary {
  return {
    contentLifecycle: {
      draftCount: 0,
      publishedCount: 2,
      unpublishedCount: 0,
      validationPendingCount: 0,
    },
    generatedAt: '2026-08-11T00:00:00.000Z',
    learningVerified: {
      algorithmUnlocks: [],
      courseProgress: [
        {
          averageProgressPercent: 40,
          completedCount: 1,
          completionRate: 0.5,
          courseId: 'course-deep-learning-basic',
          enrolledCount: 2,
          startedCount: 2,
        },
      ],
      learnerCount: 2,
      moduleProgress: [],
      postProgress: [],
      quizSummary: {
        averageScorePercent: 75,
        commonWrongQuestions: [],
        passedAttemptCount: 2,
        passRate: 0.5,
        totalAttemptCount: 4,
      },
      verificationLevel: 'server-verified',
    },
    playgroundClientReported: {
      errorRate: 0.25,
      failedRunCount: 1,
      runCount: 4,
      scenarioActivity: [
        {
          algorithmId: 'perceptron',
          failedRunCount: 1,
          runCount: 4,
          scenarioId: 'pg-xor',
        },
      ],
      verificationLevel: 'client-computed',
    },
  };
}

describe('AdminReportsPage', () => {
  it('renders real course, quiz, and playground rate fields', async () => {
    const learningApiClient = {
      getAdminReportSummary: vi.fn().mockResolvedValue(createReportSummary()),
    } as unknown as LearningApiClient;
    window.localStorage.setItem('ml-path-locale', 'en');

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={createAuthContextValue()}>
          <MemoryRouter>
            <AdminReportsPage learningApiClient={learningApiClient} locale="en" />
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Server-verified learning data' }),
    ).toBeVisible();
    expect(screen.getByText('Course completion rate 50%')).toBeVisible();
    expect(screen.getByText('Quiz pass rate 50%')).toBeVisible();
    expect(screen.getByText('Error rate 25%')).toBeVisible();
    expect(screen.getByText('pg-xor · Perceptron · 4 runs')).toBeVisible();
  });
});
