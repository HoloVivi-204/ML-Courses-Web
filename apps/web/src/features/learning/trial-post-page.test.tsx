import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { AuthContext, type AuthContextValue } from '../auth/auth-context';
import type { LearningApiClient, LearningPostContent } from './learning-api';
import { TrialPostPage } from './trial-post-page';

const COURSE_ID = 'course-deep-learning-basic';
const MODULE_ID = 'dl-m01-neuron-perceptron';
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

function createPost(accessLevel: LearningPostContent['accessLevel']): LearningPostContent {
  return {
    accessLevel,
    blocks: [],
    courseId: COURSE_ID,
    description: { en: 'A lesson description.', vi: 'Mô tả bài học.' },
    durationMinutes: 12,
    id: POST_ID,
    moduleId: MODULE_ID,
    postQuizId: 'quiz-post-dl-p01',
    revisionId: 'post-dl-p01-revision',
    title: { en: 'A lesson', vi: 'Một bài học' },
  };
}

describe('TrialPostPage', () => {
  it('returns a full-access learner to the lesson list in the current module', async () => {
    const learningApiClient = {
      getFullPostContent: vi.fn().mockResolvedValue(createPost('full')),
      getProgress: vi.fn().mockResolvedValue({ contentAccess: [], posts: [] }),
      getTrialPostContent: vi.fn().mockResolvedValue(createPost('trial')),
    } as unknown as LearningApiClient;

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={createAuthContextValue()}>
          <MemoryRouter initialEntries={[`/learn/${COURSE_ID}/posts/${POST_ID}`]}>
            <Routes>
              <Route
                path="/learn/:courseId/posts/:postId"
                element={<TrialPostPage learningApiClient={learningApiClient} locale="vi" />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    const backLink = await screen.findByRole('link', {
      name: 'Trở về danh sách các bài trong module',
    });

    expect(backLink).toHaveAttribute('href', `/learn/${COURSE_ID}/modules/${MODULE_ID}`);
  });

  it('hides practice CTA until the learner has demo access', async () => {
    const learningApiClient = {
      getFullPostContent: vi.fn().mockResolvedValue(createPost('full')),
      getProgress: vi.fn().mockResolvedValue({ contentAccess: [], posts: [] }),
      getTrialPostContent: vi.fn().mockResolvedValue(createPost('trial')),
    } as unknown as LearningApiClient;

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={createAuthContextValue()}>
          <MemoryRouter initialEntries={[`/learn/${COURSE_ID}/posts/${POST_ID}`]}>
            <Routes>
              <Route
                path="/learn/:courseId/posts/:postId"
                element={<TrialPostPage learningApiClient={learningApiClient} locale="en" />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    await screen.findByRole('heading', { name: 'A lesson' });

    await waitFor(() => {
      expect(learningApiClient.getProgress).toHaveBeenCalledWith('test-id-token');
      expect(screen.queryByRole('link', { name: /practice|thực hành/i })).not.toBeInTheDocument();
    });
  });

  it('shows practice CTA after the learner receives demo access', async () => {
    const learningApiClient = {
      getFullPostContent: vi.fn().mockResolvedValue(createPost('full')),
      getProgress: vi.fn().mockResolvedValue({
        contentAccess: [{ contentType: 'demo', entityId: 'demo-perceptron-and-gate' }],
        posts: [],
      }),
      getTrialPostContent: vi.fn().mockResolvedValue(createPost('trial')),
    } as unknown as LearningApiClient;

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={createAuthContextValue()}>
          <MemoryRouter initialEntries={[`/learn/${COURSE_ID}/posts/${POST_ID}`]}>
            <Routes>
              <Route
                path="/learn/:courseId/posts/:postId"
                element={<TrialPostPage learningApiClient={learningApiClient} locale="en" />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    await screen.findByRole('heading', { name: 'A lesson' });

    const practiceLink = await screen.findByRole('link', { name: /practice|thực hành/i });

    expect(practiceLink).toHaveAttribute(
      'href',
      `/learn/${COURSE_ID}/demos/demo-perceptron-and-gate`,
    );
  });
});
