import { describe, expect, it } from 'vitest';

import { hasLocalCloudAuthDemoAdminRole } from './local-cloud-auth-demo.js';

describe('local cloud Auth demo role', () => {
  it('grants Admin to every configured email and keeps the legacy single-email setting', () => {
    const environment = {
      FUNCTIONS_EMULATOR: 'true',
      LOCAL_CLOUD_AUTH_DEMO: 'true',
      LOCAL_DEMO_ADMIN_EMAIL: 'legacy-owner@example.com',
      LOCAL_DEMO_ADMIN_EMAILS: 'owner@example.com, SECOND@example.com ',
    };

    expect(hasLocalCloudAuthDemoAdminRole('owner@example.com', environment)).toBe(true);
    expect(hasLocalCloudAuthDemoAdminRole('second@example.com', environment)).toBe(true);
    expect(hasLocalCloudAuthDemoAdminRole('legacy-owner@example.com', environment)).toBe(true);
    expect(hasLocalCloudAuthDemoAdminRole('visitor@example.com', environment)).toBe(false);
  });

  it('never grants the demo role outside the Functions emulator', () => {
    expect(
      hasLocalCloudAuthDemoAdminRole('owner@example.com', {
        LOCAL_CLOUD_AUTH_DEMO: 'true',
        LOCAL_DEMO_ADMIN_EMAILS: 'owner@example.com,second@example.com',
      }),
    ).toBe(false);
  });
});
