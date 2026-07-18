import { describe, expect, it } from 'vitest';

import { toSafeAuthError } from './auth-service';

describe('authentication error handling', () => {
  it('maps invalid credentials to a safe user-facing code without exposing provider details', () => {
    const error = toSafeAuthError({
      code: 'auth/invalid-credential',
      message: 'The supplied password is incorrect for learner@example.test.',
    });

    expect(error).toEqual({ code: 'invalid-credentials' });
    expect(JSON.stringify(error)).not.toContain('learner@example.test');
    expect(JSON.stringify(error)).not.toContain('password');
  });
});
