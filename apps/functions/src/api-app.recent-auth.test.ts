import { describe, expect, it } from 'vitest';

import { getRecentAuthenticationWindowSeconds } from './api-app.js';

describe('account deletion recent-authentication window', () => {
  it('allows a short window only inside the Functions Emulator', () => {
    expect(
      getRecentAuthenticationWindowSeconds({
        API_ACCOUNT_DELETION_RECENT_AUTH_WINDOW_SECONDS: '1',
        FUNCTIONS_EMULATOR: 'true',
      }),
    ).toBe(1);

    expect(
      getRecentAuthenticationWindowSeconds({
        API_ACCOUNT_DELETION_RECENT_AUTH_WINDOW_SECONDS: '1',
      }),
    ).toBe(5 * 60);
  });
});
