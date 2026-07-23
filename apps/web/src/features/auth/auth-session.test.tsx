import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type AuthGateway, useAuth } from './auth-context';
import { AuthProvider } from './auth-session';

function SessionProbe() {
  const { status, user } = useAuth();

  return <output>{user ? `${status}:${user.email}` : status}</output>;
}

function PasswordResetProbe() {
  const { error, requestPasswordReset } = useAuth();
  const [completed, setCompleted] = useState(false);

  async function handleReset() {
    setCompleted(await requestPasswordReset('missing@example.test', '/dashboard'));
  }

  return (
    <>
      <button onClick={handleReset} type="button">
        Reset
      </button>
      <output>{completed ? 'completed' : (error?.code ?? 'idle')}</output>
    </>
  );
}

describe('authentication session', () => {
  it('restores the Firebase session through the observer without storing a token in UI state', async () => {
    const gateway: AuthGateway = {
      getIdToken: async () => 'local-id-token',
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
      signInWithEmail: async () => undefined,
      signInWithGoogle: async () => undefined,
      requestPasswordReset: async () => undefined,
      signOut: async () => undefined,
      signUpWithEmail: async () => undefined,
    };

    render(
      <AuthProvider gateway={gateway}>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('authenticated:learner@example.test')).toBeVisible();
    expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
  });

  it('treats a missing password reset account as a neutral completed request', async () => {
    const gateway: AuthGateway = {
      getIdToken: async () => 'local-id-token',
      observe(listener) {
        listener(null);
        return () => undefined;
      },
      signInWithEmail: async () => undefined,
      signInWithGoogle: async () => undefined,
      requestPasswordReset: vi.fn().mockRejectedValue({ code: 'auth/user-not-found' }),
      signOut: async () => undefined,
      signUpWithEmail: async () => undefined,
    };
    const user = userEvent.setup();

    render(
      <AuthProvider gateway={gateway}>
        <PasswordResetProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => expect(screen.getByText('completed')).toBeVisible());
    expect(screen.queryByText('invalid-credentials')).not.toBeInTheDocument();
  });
});
