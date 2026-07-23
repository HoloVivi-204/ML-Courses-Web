import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { toSafeAuthError, type SafeAuthError } from './auth-service';
import {
  AuthContext,
  type AuthContextValue,
  type AuthGateway,
  type AuthStatus,
  type AuthUser,
} from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
  gateway: AuthGateway;
}

export function AuthProvider({ children, gateway }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<SafeAuthError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return gateway.observe(
      (nextUser) => {
        setUser(nextUser);
        setStatus(nextUser ? 'authenticated' : 'anonymous');
      },
      (caughtError) => {
        setError(toSafeAuthError(caughtError));
        setStatus('anonymous');
      },
    );
  }, [gateway]);

  async function run(action: () => Promise<void>): Promise<boolean> {
    setError(null);
    setIsSubmitting(true);

    try {
      await action();
      return true;
    } catch (caughtError) {
      setError(toSafeAuthError(caughtError));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runPasswordReset(action: () => Promise<void>): Promise<boolean> {
    setError(null);
    setIsSubmitting(true);

    try {
      await action();
      return true;
    } catch (caughtError) {
      if (isMissingResetAccount(caughtError)) {
        return true;
      }

      setError(toSafeAuthError(caughtError));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      getIdToken: () => gateway.getIdToken(),
      isSubmitting,
      requestPasswordReset: (email, continuePath) =>
        runPasswordReset(() => gateway.requestPasswordReset(email, continuePath)),
      signInWithEmail: (email, password) => run(() => gateway.signInWithEmail(email, password)),
      signInWithGoogle: () => run(() => gateway.signInWithGoogle()),
      signOut: () => run(() => gateway.signOut()),
      signUpWithEmail: (email, password) => run(() => gateway.signUpWithEmail(email, password)),
      status,
      user,
    }),
    [error, gateway, isSubmitting, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isMissingResetAccount(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/user-not-found'
  );
}
