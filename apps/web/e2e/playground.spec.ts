import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

const runAuthEmulatorE2e = process.env.RUN_AUTH_EMULATOR_E2E === 'true';
const AUTH_SIGN_UP_URL =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-emulator-api-key';
const AUTH_EMULATOR_READY_URL =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects?key=local-emulator-api-key';
const API_EMULATOR_HEALTH_URL =
  'http://127.0.0.1:5001/demo-ml-learning-local/asia-southeast1/api/api/v1/health';
const FIRESTORE_DOCUMENT_BASE =
  'http://127.0.0.1:8080/v1/projects/demo-ml-learning-local/databases/%28default%29/documents';

const REPRESENTATIVE_FAMILIES = [
  { chartKind: 'actual-vs-predicted', scenarioId: 'pg-house-price' },
  { chartKind: 'confusion-matrix', scenarioId: 'pg-spam-detection' },
  { chartKind: 'cluster-plot', scenarioId: 'pg-retail-segments' },
  { chartKind: 'projection-2d', scenarioId: 'pg-country-indicators' },
  { chartKind: 'decision-boundary', scenarioId: 'pg-nonlinear-2d', expectsLoss: true },
] as const;

test.describe('Playground representative browser journeys', () => {
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

  test('runs regression, classification, clustering, PCA, and MLP on desktop and 360px', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const credentials = await createUnlockedLearner();

    await page.goto('/login?returnTo=%2Fplayground%2Fpg-house-price');
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Mật khẩu').fill(credentials.password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL('/playground/pg-house-price');

    await page.goto('/playground');
    await expect(page.locator('[data-testid^="playground-scenario-card-"]')).toHaveCount(10);
    await expect(page.getByTestId('playground-scenario-card-pg-xor')).toContainText('Đã khóa');
    await expect(page.getByTestId('playground-scenario-card-pg-house-price')).toContainText(
      'Hồi quy tuyến tính',
    );
    await expectNoHorizontalOverflow(page);
    await expectNoWcagViolations(page);

    for (const family of REPRESENTATIVE_FAMILIES) {
      await page.goto(`/playground/${family.scenarioId}`);
      await expect(page.getByTestId('playground-dataset-tray')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Chạy', exact: true })).toBeEnabled({
        timeout: 30_000,
      });
      await expect(page.getByRole('button', { name: 'Dừng', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();

      const runButton = page.getByRole('button', { name: 'Chạy', exact: true });
      if (family === REPRESENTATIVE_FAMILIES[0]) {
        await runButton.press('Enter');
      } else {
        await runButton.click();
      }
      await expect(page.getByText('Đã chạy xong', { exact: true })).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByTestId(`playground-chart-${family.chartKind}`)).toBeVisible();

      if (family.expectsLoss) {
        await expect(page.getByTestId('playground-loss-chart')).toBeVisible();
      }

      await expect(page.getByTestId('playground-selected-dataset')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoWcagViolations(page);
    }
  });
});

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

async function createUnlockedLearner(): Promise<{ email: string; password: string }> {
  const email = `playground-${randomUUID()}@example.test`;
  const password = `Test-playground-${randomUUID()}!`;
  const authResponse = await fetch(AUTH_SIGN_UP_URL, {
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  expect(authResponse.ok).toBe(true);
  const authPayload = (await authResponse.json()) as { localId?: string };

  expect(authPayload.localId).toBeTruthy();

  const unlocks = [
    ['linear-regression', 'cml-m02-linear-polynomial'],
    ['logistic-regression', 'cml-m04-logistic'],
    ['kmeans', 'cml-m08-clustering'],
    ['pca', 'cml-m09-pca'],
    ['mlp', 'dl-m02-mlp'],
  ] as const;

  for (const [algorithmId, moduleId] of unlocks) {
    const unlockResponse = await fetch(
      `${FIRESTORE_DOCUMENT_BASE}/users/${authPayload.localId}/algorithmUnlocks/${algorithmId}`,
      {
        body: JSON.stringify({
          fields: {
            algorithmId: { stringValue: algorithmId },
            moduleId: { stringValue: moduleId },
          },
        }),
        headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
        method: 'PATCH',
      },
    );

    expect(unlockResponse.ok).toBe(true);
  }

  return { email, password };
}

async function expectNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .filter((element) => {
        const bounds = element.getBoundingClientRect();

        return (
          bounds.right > viewportWidth + 1 ||
          bounds.left < -1 ||
          element.scrollWidth > viewportWidth + 1
        );
      })
      .slice(0, 12)
      .map((element) => ({
        className: element.className.toString(),
        scrollWidth: element.scrollWidth,
        tagName: element.tagName,
        width: Math.round(element.getBoundingClientRect().width),
      }));

    return {
      offenders,
      overflow: document.documentElement.scrollWidth - viewportWidth,
    };
  });

  expect(layout).toEqual({ offenders: [], overflow: 0 });
}

async function expectNoWcagViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        messages: node.any.map((check) => check.message),
        target: node.target.join(' '),
      })),
    })),
  ).toEqual([]);
}
