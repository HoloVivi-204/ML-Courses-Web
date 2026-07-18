import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type AuthGateway, useAuth } from './auth-context';
import { AuthProvider } from './auth-session';

function SessionProbe() {
  const { status, user } = useAuth();

  return <output>{user ? `${status}:${user.email}` : status}</output>;
}

describe('authentication session', () => {
  it('restores the Firebase session through the observer without storing a token in UI state', async () => {
    const gateway: AuthGateway = {
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
      signInWithEmail: async () => undefined,
      signInWithGoogle: async () => undefined,
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
});
