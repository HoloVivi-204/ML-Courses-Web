import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAuthRoleFromClaims, toPasswordResetContinueUrl } from './firebase-auth-gateway';

import { getFunctionsEmulatorTarget } from '../../app/functions-emulator-target';

describe('Firebase auth gateway', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it('routes the browser to the functions emulator for the cloud Auth project during demo mode', () => {
    expect(getFunctionsEmulatorTarget('ml-courses-staging-01-40939')).toBe(
      'http://127.0.0.1:5001/ml-courses-staging-01-40939/asia-southeast1/api',
    );
  });

  it('rejects an unsafe functions emulator project identifier', () => {
    expect(() => getFunctionsEmulatorTarget('demo project')).toThrow('project identifier');
  });

  it('uses only the Admin custom claim for client navigation hints', () => {
    expect(getAuthRoleFromClaims({ role: 'admin' })).toBe('admin');
    expect(getAuthRoleFromClaims({ role: 'owner' })).toBeUndefined();
    expect(getAuthRoleFromClaims({ isAdmin: true })).toBeUndefined();
  });
});
