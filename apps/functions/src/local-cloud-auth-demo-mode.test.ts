import { describe, expect, it } from 'vitest';

import { isLocalCloudAuthDemo, shouldCheckIdTokenRevocation } from './local-cloud-auth-demo.js';

describe('local cloud Auth demo mode', () => {
  it('skips remote token revocation checks only for the local Functions demo', () => {
    expect(
      isLocalCloudAuthDemo({
        FUNCTIONS_EMULATOR: 'true',
        LOCAL_CLOUD_AUTH_DEMO: 'true',
      }),
    ).toBe(true);
    expect(
      shouldCheckIdTokenRevocation({
        FUNCTIONS_EMULATOR: 'true',
        LOCAL_CLOUD_AUTH_DEMO: 'true',
      }),
    ).toBe(false);
    expect(
      shouldCheckIdTokenRevocation({
        LOCAL_CLOUD_AUTH_DEMO: 'true',
      }),
    ).toBe(true);
  });
});
