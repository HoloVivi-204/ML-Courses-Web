import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

const runAuthEmulatorE2e = process.env.RUN_AUTH_EMULATOR_E2E === 'true';
const AUTH_EMULATOR_READY_URL =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects?key=local-emulator-api-key';

async function isAuthEmulatorReady(): Promise<boolean> {
  try {
    await fetch(AUTH_EMULATOR_READY_URL);
    return true;
  } catch {
    return false;
  }
}

test.describe('Firebase Authentication Emulator', () => {
  test.skip(!runAuthEmulatorE2e, 'Set RUN_AUTH_EMULATOR_E2E=true with the local emulator running.');

  test.beforeEach(async () => {
    await expect
      .poll(isAuthEmulatorReady, {
        intervals: [250, 500, 1_000],
        timeout: 30_000,
      })
      .toBe(true);
  });

  test('registers a new learner through the browser and restores the authenticated route', async ({
    page,
  }) => {
    const email = `learner-${randomUUID()}@example.test`;
    const password = `test-${randomUUID()}`;

    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

    await expect(page).toHaveURL('/');
  });
});
