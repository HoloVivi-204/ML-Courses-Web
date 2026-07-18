import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../app/app';
import type { AuthGateway } from './auth-context';

function createGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
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
});
