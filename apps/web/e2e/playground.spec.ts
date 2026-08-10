import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';

import { expect, test, type Locator, type Page } from '@playwright/test';

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
  {
    algorithmLabel: 'Support vector machine',
    chartKind: 'confusion-matrix',
    scenarioId: 'pg-credit-risk',
  },
] as const;

const REPRESENTATIVE_ALGORITHM_UNLOCKS = [
  ['linear-regression', 'cml-m02-linear-polynomial'],
  ['logistic-regression', 'cml-m04-logistic-classification'],
  ['kmeans', 'cml-m08-clustering'],
  ['pca', 'cml-m09-pca'],
  ['mlp', 'dl-m02-mlp'],
  ['svm', 'cml-m07-svm'],
] as const;

const DEFAULT_SCENARIOS = [
  { algorithmId: 'linear-regression', scenarioId: 'pg-house-price' },
  { algorithmId: 'polynomial-regression', scenarioId: 'pg-insurance-cost' },
  { algorithmId: 'logistic-regression', scenarioId: 'pg-spam-detection' },
  { algorithmId: 'knn', scenarioId: 'pg-customer-churn' },
  { algorithmId: 'decision-tree', scenarioId: 'pg-credit-risk' },
  { algorithmId: 'naive-bayes', scenarioId: 'pg-wine-cultivar' },
  { algorithmId: 'kmeans', scenarioId: 'pg-retail-segments' },
  { algorithmId: 'pca', scenarioId: 'pg-country-indicators' },
  { algorithmId: 'perceptron', scenarioId: 'pg-xor' },
  { algorithmId: 'mlp', scenarioId: 'pg-nonlinear-2d' },
] as const;

const DEFAULT_ALGORITHM_UNLOCKS = [
  ['linear-regression', 'cml-m02-linear-polynomial'],
  ['polynomial-regression', 'cml-m02-linear-polynomial'],
  ['logistic-regression', 'cml-m04-logistic-classification'],
  ['knn', 'cml-m05-knn-naive-bayes'],
  ['decision-tree', 'cml-m06-trees-forest'],
  ['naive-bayes', 'cml-m05-knn-naive-bayes'],
  ['kmeans', 'cml-m08-clustering'],
  ['pca', 'cml-m09-pca'],
  ['perceptron', 'dl-m01-neuron-perceptron'],
  ['mlp', 'dl-m02-mlp'],
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

      if ('algorithmLabel' in family) {
        await page.getByRole('combobox').selectOption({ label: family.algorithmLabel });
      }
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
      await expectPlotlyChartReady(page.getByTestId(`playground-chart-${family.chartKind}`));

      if ('algorithmLabel' in family) {
        await expect(page.getByTestId('playground-result')).toContainText('100%');
      }

      if (family.expectsLoss) {
        await expect(page.getByTestId('playground-loss-chart')).toBeVisible();
      }

      await expect(page.getByTestId('playground-selected-dataset')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoWcagViolations(page);
    }
  });

  test('runs verified credit-risk SVM bytes in the browser Worker', async ({ page }) => {
    test.setTimeout(90_000);

    const credentials = await createUnlockedLearner();

    await page.goto('/login?returnTo=%2Fplayground%2Fpg-credit-risk');
    await page.locator("input[type='email']").fill(credentials.email);
    await page.locator("input[type='password']").fill(credentials.password);
    await page.locator("form button[type='submit']").click();
    await expect(page).toHaveURL('/playground/pg-credit-risk');

    await page.getByRole('combobox').selectOption({ label: 'Support vector machine' });
    const runButton = page.locator('.playground-run-actions > button').first();

    await expect(runButton).toBeEnabled({ timeout: 30_000 });
    await runButton.click();
    await expect(page.locator('.status-completed')).toBeVisible({ timeout: 15_000 });
    await expectPlotlyChartReady(page.getByTestId('playground-chart-confusion-matrix'));
  });

  test('evicts corrupt browser dataset cache bytes before a verified rerun', async ({ page }) => {
    const credentials = await createUnlockedLearner();

    await page.goto('/login?returnTo=%2Fplayground%2Fpg-house-price');
    await page.locator("input[type='email']").fill(credentials.email);
    await page.locator("input[type='password']").fill(credentials.password);
    await page.locator("form button[type='submit']").click();
    await expect(page).toHaveURL('/playground/pg-house-price');

    const runButton = page.locator('.playground-run-actions > button').first();
    await expect(runButton).toBeEnabled({ timeout: 30_000 });

    const corruptedEntryCount = await page.evaluate(async () => {
      const cache = await caches.open('ml-playground-datasets-v1');
      const requests = await cache.keys();

      await Promise.all(
        requests.map((request) =>
          cache.put(
            request,
            new Response(new Uint8Array([1, 2, 3]), {
              headers: { 'content-type': 'application/octet-stream' },
            }),
          ),
        ),
      );

      return requests.length;
    });
    expect(corruptedEntryCount).toBeGreaterThan(0);

    await page.reload();
    await expect(page.getByTestId('playground-dataset-tray')).toBeVisible();
    await expect(runButton).toBeEnabled({ timeout: 30_000 });

    const cachedByteLengths = await page.evaluate(async () => {
      const cache = await caches.open('ml-playground-datasets-v1');
      const requests = await cache.keys();

      return Promise.all(
        requests.map(async (request) =>
          (await cache.match(request))?.arrayBuffer().then((bytes) => bytes.byteLength),
        ),
      );
    });
    expect(
      cachedByteLengths.every((byteLength) => typeof byteLength === 'number' && byteLength > 3),
    ).toBe(true);

    await runButton.click();
    await expect(page.locator('.status-completed')).toBeVisible({ timeout: 30_000 });
    await expectPlotlyChartReady(page.getByTestId('playground-chart-actual-vs-predicted'));
  });

  test('stops an active Worker run without saving success and can rerun', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    const savedRunRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());

      if (request.method() === 'POST' && url.pathname === '/api/v1/playground-runs') {
        savedRunRequests.push(request.url());
      }
    });

    const credentials = await createUnlockedLearner();

    await page.goto('/login?returnTo=%2Fplayground%2Fpg-nonlinear-2d');
    await page.locator("input[type='email']").fill(credentials.email);
    await page.locator("input[type='password']").fill(credentials.password);
    await page.locator("form button[type='submit']").click();
    await expect(page).toHaveURL('/playground/pg-nonlinear-2d');

    const runButton = page.locator('.playground-run-actions > button').first();
    const stopButton = page.locator('.playground-run-actions > button').nth(1);
    const epochs = testInfo.project.name === 'chromium-mobile-360' ? 500 : 1_000;
    await page.getByRole('spinbutton', { name: 'Epochs' }).fill(String(epochs));
    await expect(runButton).toBeEnabled({ timeout: 30_000 });
    await runButton.click();
    await expect(stopButton).toBeEnabled();
    await expect(page.getByText(new RegExp(`^Epoch \\d+/${epochs}`))).toBeVisible({
      timeout: 30_000,
    });
    await stopButton.click();
    await expect(page.locator('.status-cancelled')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('playground-result')).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(savedRunRequests).toEqual([]);

    await expect(runButton).toBeEnabled();
    await runButton.click();
    await expect(page.locator('.status-completed')).toBeVisible({ timeout: 60_000 });
    await expectPlotlyChartReady(page.getByTestId('playground-chart-decision-boundary'));
    expect(savedRunRequests).toHaveLength(1);
  });

  test('runs all ten default scenarios with verified dataset bytes', async ({ page }) => {
    test.setTimeout(300_000);

    const credentials = await createUnlockedLearner(DEFAULT_ALGORITHM_UNLOCKS);

    await page.goto('/login?returnTo=%2Fplayground%2Fpg-house-price');
    await page.locator("input[type='email']").fill(credentials.email);
    await page.locator("input[type='password']").fill(credentials.password);
    await page.locator("form button[type='submit']").click();
    await expect(page).toHaveURL('/playground/pg-house-price');

    for (const scenario of DEFAULT_SCENARIOS) {
      await page.goto(`/playground/${scenario.scenarioId}`);
      await expect(page.getByTestId('playground-dataset-tray')).toBeVisible();
      await expect(page.locator('.playground-identity code')).toHaveText(
        `${scenario.scenarioId} / ${scenario.algorithmId}`,
      );

      const runButton = page.locator('.playground-run-actions > button').first();

      await expect(runButton).toBeEnabled({ timeout: 30_000 });
      await runButton.click();
      await expect(page.locator('.status-completed')).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId('playground-result')).toBeVisible();
      await expectPlotlyChartReady(page.locator('[data-testid^="playground-chart-"]').first());
      await expectNoHorizontalOverflow(page);
    }

    await expectNoWcagViolations(page);
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

async function createUnlockedLearner(
  unlocks: readonly (readonly [string, string])[] = REPRESENTATIVE_ALGORITHM_UNLOCKS,
): Promise<{ email: string; password: string }> {
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

async function expectPlotlyChartReady(chart: Locator) {
  await expect(chart).toHaveAttribute('data-plotly-state', 'ready', { timeout: 30_000 });
  await expect(chart).toHaveClass(/js-plotly-plot/, { timeout: 30_000 });
  await expect(chart.locator('.plot-container.plotly')).toBeVisible({ timeout: 30_000 });
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
