import { describe, expect, it } from 'vitest';

import { toPasswordResetContinueUrl } from './firebase-auth-gateway';

describe('Firebase auth gateway', () => {
  it('builds password reset continue URLs only from same-origin relative paths', () => {
    expect(toPasswordResetContinueUrl('/dashboard?tab=learning')).toBe(
      `${window.location.origin}/dashboard?tab=learning`,
    );
    expect(toPasswordResetContinueUrl('https://evil.example/steal')).toBe(
      `${window.location.origin}/`,
    );
    expect(toPasswordResetContinueUrl('//evil.example/steal')).toBe(`${window.location.origin}/`);
    expect(toPasswordResetContinueUrl('/\\evil')).toBe(`${window.location.origin}/`);
  });
});
