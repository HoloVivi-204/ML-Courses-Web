import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { AuthContext, type AuthContextValue } from '../auth/auth-context';
import { LearningApiError, type LearningApiClient } from './learning-api';
import { LearningDemoPage } from './learning-demo-page';

const COURSE_ID = 'course-deep-learning-basic';
const DEMO_ID = 'demo-perceptron-and-gate';
const POST_ID = 'dl-p01-neuron-perceptron';

function createAuthContextValue(): AuthContextValue {
  return {
    error: null,
    getIdToken: vi.fn().mockResolvedValue('test-id-token'),
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

describe('LearningDemoPage', () => {
  it('returns an unauthorized learner to the last lesson in the module', async () => {
    const learningApiClient = {
      getDemoContent: vi
        .fn()
        .mockRejectedValue(
          new LearningApiError(403, 'DEMO_ACCESS_REQUIRED', 'Demo access is required.'),
        ),
    } as unknown as LearningApiClient;

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={createAuthContextValue()}>
          <MemoryRouter initialEntries={[`/learn/${COURSE_ID}/demos/${DEMO_ID}`]}>
            <Routes>
              <Route
                path="/learn/:courseId/demos/:demoId"
                element={<LearningDemoPage learningApiClient={learningApiClient} locale="en" />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    await screen.findByRole('heading', { name: 'Practice is locked' });

    expect(screen.getByText(/403\s*\/\s*PRACTICE/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to lesson' })).toHaveAttribute(
      'href',
      `/learn/${COURSE_ID}/posts/${POST_ID}`,
    );
  });
});
