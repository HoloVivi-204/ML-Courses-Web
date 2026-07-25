import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

const runAuthEmulatorE2e = process.env.RUN_AUTH_EMULATOR_E2E === 'true';
const AUTH_EMULATOR_READY_URL =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects?key=local-emulator-api-key';
const API_EMULATOR_HEALTH_URL =
  'http://127.0.0.1:5001/demo-ml-learning-local/asia-southeast1/api/api/v1/health';

async function areLocalAuthDependenciesReady(): Promise<boolean> {
  try {
    const [authResponse, apiResponse] = await Promise.all([
      fetch(AUTH_EMULATOR_READY_URL),
      fetch(API_EMULATOR_HEALTH_URL),
    ]);

    return authResponse.ok && apiResponse.ok;
  } catch {
    return false;
  }
}

test.describe('Firebase Authentication Emulator', () => {
  test.skip(
    !runAuthEmulatorE2e,
    'Set RUN_AUTH_EMULATOR_E2E=true with the local Auth and Functions emulators running.',
  );

  test.beforeEach(async () => {
    await expect
      .poll(areLocalAuthDependenciesReady, {
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
