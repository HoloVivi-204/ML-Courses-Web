import { describe, expect, it, vi } from 'vitest';

import { provisionLocalE2eAdmin } from './local-e2e-admin.js';

describe('provisionLocalE2eAdmin', () => {
  it('creates a unique local Auth user and assigns the Admin claim before browser login', async () => {
    const identifier = 'fixed-id';
    const expectedPassword = `local-e2e-${identifier}`;
    const createUser = vi.fn(async () => ({ uid: 'e2e-admin-fixed-id' }));
    const setCustomUserClaims = vi.fn(async () => undefined);

    const credentials = await provisionLocalE2eAdmin(
      { createUser, setCustomUserClaims },
      () => identifier,
    );

    expect(createUser).toHaveBeenCalledWith({
      email: 'e2e-admin-fixed-id@example.test',
      emailVerified: true,
      password: expectedPassword,
      uid: 'e2e-admin-fixed-id',
    });
    expect(setCustomUserClaims).toHaveBeenCalledWith('e2e-admin-fixed-id', { role: 'admin' });
    expect(credentials).toEqual({
      LOCAL_DEMO_ADMIN_EMAIL: 'e2e-admin-fixed-id@example.test',
      LOCAL_DEMO_ADMIN_PASSWORD: expectedPassword,
    });
  });
});
