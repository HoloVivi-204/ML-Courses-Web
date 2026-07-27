import { describe, expect, it } from 'vitest';

import { getAppCheckRuntimeConfig } from './api-security-config.js';

describe('App Check runtime configuration', () => {
  it('fails closed when staging does not enforce App Check', () => {
    expect(() =>
      getAppCheckRuntimeConfig({
        APP_ENV: 'staging',
        APPCHECK_ENFORCEMENT_MODE: 'disabled',
      }),
    ).toThrow('APPCHECK_ENFORCEMENT_MODE must be enforced in staging.');
  });

  it('fails closed when production configuration is missing or includes a debug token', () => {
    expect(() => getAppCheckRuntimeConfig({ APP_ENV: 'production' })).toThrow(
      'APPCHECK_ENFORCEMENT_MODE must be enforced in production.',
    );

    const debugToken = 'local-debug-token';

    try {
      getAppCheckRuntimeConfig({
        APP_ENV: 'production',
        APPCHECK_ENFORCEMENT_MODE: 'enforced',
        FIREBASE_APPCHECK_DEBUG_TOKEN: debugToken,
      });
      expect.fail('Expected production debug token validation to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('FIREBASE_APPCHECK_DEBUG_TOKEN');
      expect((error as Error).message).not.toContain(debugToken);
    }
  });
});
