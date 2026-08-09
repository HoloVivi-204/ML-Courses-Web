import { createContext, useContext } from 'react';

import type { SafeAuthError } from './auth-service';

export interface AuthUser {
  email: string | null;
  providerIds?: readonly string[] | undefined;
  role?: 'admin' | undefined;
  uid: string;
}

export interface AuthGateway {
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  observe(
    listener: (user: AuthUser | null) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  reauthenticateWithGoogle?(): Promise<void>;
  reauthenticateWithPassword?(password: string): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  requestPasswordReset(email: string, continuePath: string): Promise<void>;
  signOut(): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  updateDisplayName?(displayName: string): Promise<void>;
}

export type AuthStatus = 'anonymous' | 'authenticated' | 'loading';

export interface AuthContextValue {
  error: SafeAuthError | null;
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  isSubmitting: boolean;
  requestPasswordReset(email: string, continuePath: string): Promise<boolean>;
  reauthenticateWithGoogle(): Promise<boolean>;
  reauthenticateWithPassword(password: string): Promise<boolean>;
  signInWithEmail(email: string, password: string): Promise<boolean>;
  signInWithGoogle(): Promise<boolean>;
  signOut(): Promise<boolean>;
  signUpWithEmail(email: string, password: string): Promise<boolean>;
  status: AuthStatus;
  updateDisplayName(displayName: string): Promise<boolean>;
  user: AuthUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
}
