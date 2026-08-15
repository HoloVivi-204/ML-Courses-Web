import { describe, expect, it } from 'vitest';

import { hasLocalCloudAuthDemoAdminRole } from './local-cloud-auth-demo.js';

describe('local cloud Auth demo role', () => {
  it('grants Admin only to the email selected on that local machine', () => {
    const environment = {
      FUNCTIONS_EMULATOR: 'true',
      LOCAL_CLOUD_AUTH_DEMO: 'true',
      LOCAL_DEMO_ADMIN_EMAIL: 'owner@example.com',
    };

    expect(hasLocalCloudAuthDemoAdminRole('owner@example.com', environment)).toBe(true);
    expect(hasLocalCloudAuthDemoAdminRole('visitor@example.com', environment)).toBe(false);
  });

  it('never grants the demo role outside the Functions emulator', () => {
    expect(
      hasLocalCloudAuthDemoAdminRole('owner@example.com', {
        LOCAL_CLOUD_AUTH_DEMO: 'true',
        LOCAL_DEMO_ADMIN_EMAIL: 'owner@example.com',
      }),
    ).toBe(false);
  });
});
