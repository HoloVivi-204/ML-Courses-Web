import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../app/app';
import type { AuthGateway } from './auth-context';

function createLearningApiClient() {
  return {
    bootstrapProfile: vi.fn().mockResolvedValue(undefined),
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
  };
}

function createGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getIdToken: vi.fn().mockResolvedValue('local-id-token'),
    observe(listener) {
      listener(null);
      return () => undefined;
    },
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('authentication routes', () => {
  it('lets a guest register with email and password without displaying the password afterward', async () => {
    window.history.pushState({}, '', '/register');
    const gateway = createGateway();
    const user = userEvent.setup();
    const password = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    render(<App authGateway={gateway} />);

    await user.type(await screen.findByLabelText('Email'), 'learner@example.test');
    await user.type(screen.getByLabelText('Mật khẩu'), password);
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(gateway.signUpWithEmail).toHaveBeenCalledWith('learner@example.test', password);
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('shows a safe sign-in error instead of the provider message', async () => {
    window.history.pushState({}, '', '/login');
    const password = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const providerMessage = 'The password for learner@example.test is not valid.';
    const gateway = createGateway({
      signInWithEmail: vi.fn().mockRejectedValue({
        code: 'auth/invalid-credential',
        message: providerMessage,
      }),
    });
    const user = userEvent.setup();

    render(<App authGateway={gateway} />);

    await user.type(await screen.findByLabelText('Email'), 'learner@example.test');
    await user.type(screen.getByLabelText('Mật khẩu'), password);
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu chưa đúng.');
    expect(screen.queryByText(providerMessage)).not.toBeInTheDocument();
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('starts the Google flow through the same session gateway', async () => {
    window.history.pushState({}, '', '/login');
    const gateway = createGateway();
    const user = userEvent.setup();

    render(<App authGateway={gateway} />);

    await user.click(await screen.findByRole('button', { name: 'Tiếp tục với Google' }));

    expect(gateway.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('redirects a guest from the protected learning route to sign in with a safe return path', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const gateway = createGateway();

    render(<App authGateway={gateway} />);

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(window.location.search).toBe('?returnTo=%2Flearn%2Fcourse-deep-learning-basic');
  });

  it('returns an authenticated learner to the requested relative learning path', async () => {
    window.history.pushState({}, '', '/login?returnTo=%2Flearn%2Fcourse-deep-learning-basic');
    const gateway = createGateway({
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
    });
    const learningApiClient = createLearningApiClient();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    await waitFor(() => expect(window.location.pathname).toBe('/learn/course-deep-learning-basic'));
    expect(learningApiClient.bootstrapProfile).toHaveBeenCalledWith('local-id-token');
  });

  it('drops an absolute external return URL after authentication', async () => {
    window.history.pushState({}, '', '/login?returnTo=https%3A%2F%2Fevil.example%2Fsteal');
    const gateway = createGateway({
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
    });
    const learningApiClient = createLearningApiClient();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(window.location.href).not.toContain('evil.example');
  });

  it('enrolls an authenticated learner before opening the protected course path', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const gateway = createGateway({
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
    });
    const learningApiClient = createLearningApiClient();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    expect(await screen.findByRole('heading', { name: /Neuron và Perceptron/i })).toBeVisible();
    await waitFor(() =>
      expect(learningApiClient.enrollCourse).toHaveBeenCalledWith({
        courseId: 'course-deep-learning-basic',
        idToken: 'local-id-token',
        idempotencyKey: expect.any(String),
      }),
    );
  });
});
