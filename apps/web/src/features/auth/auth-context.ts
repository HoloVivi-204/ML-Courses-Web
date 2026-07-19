import { createContext, useContext } from 'react';

import type { SafeAuthError } from './auth-service';

export interface AuthUser {
  email: string | null;
  uid: string;
}

export interface AuthGateway {
  getIdToken(): Promise<string | null>;
  observe(
    listener: (user: AuthUser | null) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  signInWithEmail(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
}

export type AuthStatus = 'anonymous' | 'authenticated' | 'loading';

export interface AuthContextValue {
  error: SafeAuthError | null;
  getIdToken(): Promise<string | null>;
  isSubmitting: boolean;
  signInWithEmail(email: string, password: string): Promise<boolean>;
  signInWithGoogle(): Promise<boolean>;
  signOut(): Promise<boolean>;
  signUpWithEmail(email: string, password: string): Promise<boolean>;
  status: AuthStatus;
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
