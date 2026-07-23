export type SafeAuthErrorCode =
  | 'account-exists'
  | 'invalid-email'
  | 'invalid-credentials'
  | 'network'
  | 'popup-blocked'
  | 'rate-limited'
  | 'unavailable';

export interface SafeAuthError {
  code: SafeAuthErrorCode;
}

interface AuthErrorLike {
  code?: unknown;
}

const safeErrorCodes: Readonly<Record<string, SafeAuthErrorCode>> = {
  'auth/email-already-in-use': 'account-exists',
  'auth/invalid-email': 'invalid-email',
  'auth/invalid-credential': 'invalid-credentials',
  'auth/invalid-login-credentials': 'invalid-credentials',
  'auth/user-not-found': 'invalid-credentials',
  'auth/wrong-password': 'invalid-credentials',
  'auth/network-request-failed': 'network',
  'auth/popup-blocked': 'popup-blocked',
  'auth/too-many-requests': 'rate-limited',
};

function isAuthErrorLike(error: unknown): error is AuthErrorLike {
  return typeof error === 'object' && error !== null;
}

export function toSafeAuthError(error: unknown): SafeAuthError {
  const code = isAuthErrorLike(error) && typeof error.code === 'string' ? error.code : '';

  return { code: safeErrorCodes[code] ?? 'unavailable' };
}
