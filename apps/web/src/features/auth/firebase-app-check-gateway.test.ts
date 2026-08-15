import { describe, expect, it } from 'vitest';

import { shouldUseLocalAppCheckProvider } from './firebase-app-check-gateway';

describe('Firebase App Check gateway', () => {
  it('skips App Check only for a local cloud-Auth demo', () => {
    expect(
      shouldUseLocalAppCheckProvider({
        environment: 'local',
        isEmulator: false,
        isTest: false,
      }),
    ).toBe(true);
  });

  it('keeps App Check enabled for cloud staging and production', () => {
    expect(
      shouldUseLocalAppCheckProvider({
        environment: 'staging',
        isEmulator: false,
        isTest: false,
      }),
    ).toBe(false);
    expect(
      shouldUseLocalAppCheckProvider({
        environment: 'production',
        isEmulator: false,
        isTest: false,
      }),
    ).toBe(false);
  });
});
