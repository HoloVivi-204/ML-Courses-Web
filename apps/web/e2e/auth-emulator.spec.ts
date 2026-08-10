import { randomUUID } from 'node:crypto';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Response } from '@playwright/test';

const runAuthEmulatorE2e = process.env.RUN_AUTH_EMULATOR_E2E === 'true';
const AUTH_EMULATOR_READY_URL =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects?key=local-emulator-api-key';
const API_EMULATOR_HEALTH_URL =
  'http://127.0.0.1:5001/demo-ml-learning-local/asia-southeast1/api/api/v1/health';
const AUTH_SIGN_UP_URL = AUTH_EMULATOR_READY_URL.replace('/v1/projects?', '/v1/accounts:signUp?');
const EMULATOR_FLOW_TIMEOUT_MS = 30_000;
const configuredLocalAdminEmail = process.env.LOCAL_DEMO_ADMIN_EMAIL?.trim();
const configuredLocalAdminPassword = process.env.LOCAL_DEMO_ADMIN_PASSWORD?.trim();

test.use({ actionTimeout: EMULATOR_FLOW_TIMEOUT_MS });

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

test.describe('Firebase local Emulator journey', () => {
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
    test.setTimeout(60_000);

    const email = `learner-${randomUUID()}@example.test`;
    const password = `test-${randomUUID()}`;

    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

    await expect(page).toHaveURL('/', { timeout: EMULATOR_FLOW_TIMEOUT_MS });
  });

  test('persists profile changes, requires reauthentication, and deletes the local account', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const email = `profile-${randomUUID()}@example.test`;
    const password = `test-${randomUUID()}`;
    const displayName = 'Avatar Lifecycle Learner';
    const avatarBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9jE8UAAAAASUVORK5CYII=',
      'base64',
    );

    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page).toHaveURL('/', { timeout: EMULATOR_FLOW_TIMEOUT_MS });

    await page.goto('/profile');
    await expect(page.locator('main.profile-page')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await page.locator('#profile-display-name').fill(displayName);
    await page.locator('.profile-display-name-form button[type="submit"]').click();
    await expect(page.locator('#profile-display-name')).toHaveValue(displayName);

    await page.locator('#profile-avatar-upload').setInputFiles({
      buffer: avatarBytes,
      mimeType: 'image/png',
      name: 'avatar.png',
    });
    const avatarImage = page.locator('.profile-avatar img');

    await expect(avatarImage).toBeVisible({ timeout: EMULATOR_FLOW_TIMEOUT_MS });
    const avatarUrl = await avatarImage.getAttribute('src');

    expect(avatarUrl).toMatch(/127\.0\.0\.1:9199\/v0\/b\/demo-ml-learning-local\.appspot\.com/);
    await page.locator('#profile-locale').selectOption('en');
    await page.locator('#profile-theme').selectOption('dark');
    await page.locator('.profile-preferences-form button[type="submit"]').click();
    await expect(page.locator('#profile-locale')).toHaveValue('en');
    await expect(page.locator('#profile-theme')).toHaveValue('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('#profile-display-name')).toHaveValue(displayName);
    await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', avatarUrl ?? '');
    await expect(page.locator('#profile-locale')).toHaveValue('en');
    await expect(page.locator('#profile-theme')).toHaveValue('dark');

    await page.waitForTimeout(1_500);
    await page.locator('#account-delete-confirmation').fill('DELETE');
    await page.locator('.profile-delete-button').click();
    await expect(page.locator('#profile-reauthentication-password')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await page.locator('#profile-reauthentication-password').fill(password);
    await page.locator('.profile-reauthentication form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fprofile$/, {
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
  });

  test('runs the learner baseline from auth to dashboard through local emulators', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const email = `learner-${randomUUID()}@example.test`;
    const password = `test-${randomUUID()}`;

    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /machine learning không còn là một hộp đen/i }),
    ).toBeVisible();

    await page.goto('/playground/pg-xor');
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fplayground%2Fpg-xor/);

    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page).toHaveURL('/', { timeout: EMULATOR_FLOW_TIMEOUT_MS });

    await page.goto('/learn/course-deep-learning-basic');
    await expect(page.getByText(/Enrollment đã sẵn sàng/i)).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await page.getByRole('link', { name: /Mở tổng quan module|Tiếp tục module/i }).click();
    await page.getByRole('link', { name: /Mở bài viết|Tiếp tục đọc|Xem lại bài viết/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Một neuron đưa ra quyết định như thế nào?' }),
    ).toBeVisible();

    const postContentViewed = waitForPostContentViewed(page, 'dl-p01-neuron-perceptron');
    await viewAllRequiredPostBlocks(page);
    await postContentViewed;
    await page.getByRole('link', { name: /Mở quiz bài học/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Quiz Quyết định của Neuron và Perceptron' }),
    ).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await answerPostQuiz(page);
    await page.getByRole('button', { name: 'Nộp quiz' }).click();
    await expect(page.getByText('quiz_passed: quiz-post-dl-p01')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });

    await returnToModuleOverview(page);
    const perceptronDemoLink = page.getByRole('link', {
      name: /Mở demo AND gate|Xem demo|Open AND gate demo|View demo/i,
    });
    await expect(perceptronDemoLink).toBeVisible({ timeout: EMULATOR_FLOW_TIMEOUT_MS });
    await perceptronDemoLink.click();
    await expect(page.getByRole('heading', { name: 'Demo Perceptron: cổng AND' })).toBeVisible();
    await page.getByRole('button', { name: 'Bước tiếp theo' }).click();
    await page.getByRole('button', { name: 'Bước tiếp theo' }).click();
    await page.getByRole('button', { name: 'Bước tiếp theo' }).click();
    await expect(page.getByText('demo_completed: demo-perceptron-and-gate')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });

    await page.getByRole('link', { name: 'Mở quiz module' }).click();
    await expect(
      page.getByText('Đạt ít nhất 70% để hoàn thành module và mở Playground Perceptron.'),
    ).toBeVisible({ timeout: EMULATOR_FLOW_TIMEOUT_MS });
    await answerModuleQuiz(page);
    await page.getByRole('button', { name: 'Nộp quiz' }).click();
    await expect(page.getByText('quiz_passed: quiz-module-dl-m01')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });

    await page.getByRole('link', { name: /Mở Playground Perceptron/i }).click();
    await expect(page.getByRole('heading', { name: 'Playground XOR: Perceptron' })).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await page.getByRole('button', { name: 'Chạy' }).click();
    await expect(page.getByText('Đã chạy xong')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });

    const savedRunId = await page.locator('.playground-history-card strong').first().textContent();
    const savedRunIdText = savedRunId ?? '';

    expect(savedRunIdText).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    await page.getByLabel('Tên cấu hình').fill('XOR emulator baseline');
    await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
    await expect(page.getByText('XOR emulator baseline')).toBeVisible();

    await page.getByRole('spinbutton', { name: 'Epochs' }).fill('120');
    await page.getByRole('button', { name: /Khôi phục XOR emulator baseline/i }).click();
    await expect(page.getByRole('spinbutton', { name: 'Epochs' })).toHaveValue('100');

    await expectNoHorizontalOverflow(page);
    await expectNoWcagViolations(page);
    await page.getByRole('link', { name: /Lộ trình khóa học|Course roadmap/i }).click();
    await page
      .locator('[data-module-id="dl-m02-mlp"]')
      .getByRole('link', {
        name: /Mở tổng quan module|Tiếp tục module|Open module overview|Resume module/i,
      })
      .click();
    await expect(
      page.getByRole('heading', { exact: true, name: 'Mạng nơ-ron nhiều lớp' }),
    ).toBeVisible({ timeout: EMULATOR_FLOW_TIMEOUT_MS });
    await expectNoHorizontalOverflow(page);
    await expectNoWcagViolations(page);

    await completePostFromModuleOverview(page, 'dl-p02-mlp-forward-activation', [
      'opt-affine-collapse',
      ['opt-hidden-affine', 'opt-nonlinear-activation'],
      'true',
    ]);
    await page.getByRole('link', { name: /Xem demo|View demo/i }).click();
    await completeDemo(page, 'demo-mlp-checkerboard');
    await page
      .getByRole('link', {
        name: /Mở quiz module|Làm quiz module|Open (?:the )?module quiz|Take (?:the )?module quiz/i,
      })
      .click();
    await answerQuizByOptionIds(page, [
      'opt-hidden-representation',
      'opt-one-affine-map',
      'opt-positive-pass-negative-zero',
      'opt-nonlinear-hidden-step',
      ['opt-hidden-h', 'opt-output-o'],
      'true',
    ]);
    await page.getByRole('button', { name: /Nộp quiz|Submit quiz/i }).click();
    await expect(page.getByText('quiz_passed: quiz-module-dl-m02')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await page.getByRole('link', { name: /Mở Playground MLP|Open MLP Playground/i }).click();
    await expect(page).toHaveURL(/\/playground\/pg-nonlinear-2d/);

    await page.getByRole('button', { name: 'Chuyển sang tiếng Anh' }).click();
    await expect(page.getByRole('heading', { name: /Nonlinear 2D Playground: MLP/i })).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await expectNoHorizontalOverflow(page);
    await expectNoWcagViolations(page);

    await page.getByRole('link', { name: 'ML Path' }).click();
    await page.getByRole('link', { name: 'View full catalog' }).click();
    await page
      .getByRole('link', { name: /Explore the Classical Machine Learning course/i })
      .click();
    await page.getByRole('link', { name: 'Open my learning path' }).click();
    await expect(page.getByText(/Enrollment ready/i)).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await page
      .locator('[data-module-id="cml-m01-foundations"]')
      .getByRole('link', { name: /Open module overview|Resume module/i })
      .click();
    await completePostFromModuleOverview(page, 'cml-p01-problem-data-types', [
      'opt-queue-label',
      ['opt-delivery-delay', 'opt-ticket-routing'],
      'true',
    ]);
    await completePostFromModuleOverview(page, 'cml-p02-train-test-metrics', [
      'opt-heldout-evidence',
      ['opt-error-consequence', 'opt-error-types'],
      'false',
    ]);
    await page
      .getByRole('link', {
        name: /Open (?:the )?module quiz|Take (?:the )?module quiz/i,
      })
      .click();
    await answerQuizByOptionIds(page, [
      'opt-known-outcome',
      ['opt-paired-answers', 'opt-check-against-label'],
      'true',
      'opt-generalisation-evidence',
      ['opt-false-positive-cost', 'opt-false-negative-cost'],
      'opt-eighty-five-percent',
    ]);
    await page.getByRole('button', { name: /Submit quiz/i }).click();
    await expect(page.getByText('quiz_passed: quiz-module-cml-m01')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await returnToModuleOverview(page);
    await page.getByRole('link', { name: /Back to course roadmap/i }).click();
    await page
      .locator('[data-module-id="cml-m02-linear-polynomial"]')
      .getByRole('link', { name: /Open module overview|Resume module/i })
      .click();
    await completePostFromModuleOverview(page, 'cml-p03-linear-regression', [
      'opt-observed-minus-predicted',
      ['opt-square-gaps', 'opt-emphasise-large-miss'],
      'true',
    ]);
    await completePostFromModuleOverview(page, 'cml-p04-polynomial-regression', [
      'opt-squared-input',
      ['opt-same-split', 'opt-heldout-error'],
      'false',
    ]);
    await page.getByRole('link', { name: /View demo/i }).click();
    await completeDemo(page, 'demo-linear-calibration');
    await page
      .getByRole('link', {
        name: /Open (?:the )?module quiz|Take (?:the )?module quiz/i,
      })
      .click();
    await answerQuizByOptionIds(page, [
      'opt-numerical-estimate',
      'true',
      ['opt-transform-first', 'opt-repeat-transform'],
      'opt-new-example-evidence',
      ['opt-prediction-seven', 'opt-residual-plus-one'],
      'opt-not-guaranteed',
    ]);
    await page.getByRole('button', { name: /Submit quiz/i }).click();
    await expect(page.getByText('quiz_passed: quiz-module-cml-m02')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await page.getByRole('link', { name: /Open Linear Regression Playground/i }).click();
    await expect(page).toHaveURL(/\/playground\/pg-house-price/);
    await expectNoHorizontalOverflow(page);
    await expectNoWcagViolations(page);
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveCount(1);

    await page.getByRole('button', { name: 'Switch to Vietnamese' }).click();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard học viên' })).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await expect(page.getByText('Dữ liệu học tập server-verified')).toBeVisible();
    await expect(page.getByText('Perceptron đã mở')).toBeVisible();
    await expect(page.getByText(savedRunIdText)).toBeVisible();
    await expect(page.getByText('client-computed', { exact: true })).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await expectNoWcagViolations(page);

    await page.goto('/profile');
    await expect(page.locator('main.profile-page')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await expect(page.locator('#profile-locale')).toHaveValue('vi');
    await expect(page.locator('#profile-theme')).toHaveValue('system');
    await page.locator('#profile-locale').selectOption('en');
    await page.locator('#profile-theme').selectOption('dark');
    await page.locator('.profile-preferences-form button[type="submit"]').click();
    await expect(page.locator('.profile-success')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await expect(page.locator('#profile-locale')).toHaveValue('en');
    await expect(page.locator('#profile-theme')).toHaveValue('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectNoHorizontalOverflow(page);
    await expectNoWcagViolations(page);

    await page.reload();
    await expect(page.locator('#profile-locale')).toHaveValue('en');
    await expect(page.locator('#profile-theme')).toHaveValue('dark');
  });

  test('renders an Emulator-backed Admin report for the configured local admin', async ({
    page,
  }) => {
    test.skip(
      !configuredLocalAdminEmail || !configuredLocalAdminPassword,
      'Set LOCAL_DEMO_ADMIN_EMAIL and LOCAL_DEMO_ADMIN_PASSWORD to exercise the local Admin report journey.',
    );
    test.setTimeout(60_000);

    const authResponse = await fetch(AUTH_SIGN_UP_URL, {
      body: JSON.stringify({
        email: configuredLocalAdminEmail,
        password: configuredLocalAdminPassword,
        returnSecureToken: true,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    if (!authResponse.ok) {
      const authPayload = (await authResponse.json()) as { error?: { message?: string } };

      expect(authPayload.error?.message).toBe('EMAIL_EXISTS');
    }

    await page.goto('/login');
    await page.locator('#auth-email').fill(configuredLocalAdminEmail ?? '');
    await page.locator('#auth-password').fill(configuredLocalAdminPassword ?? '');
    await page.locator('.auth-submit').click();
    await expect(page).toHaveURL('/', { timeout: EMULATOR_FLOW_TIMEOUT_MS });

    await page.goto('/admin/reports');
    await expect(page.locator('main.admin-reports-page')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await expect(page.locator('.admin-report-panel-verified')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await expect(page.locator('.admin-report-panel-client')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await expect(page.getByText(/server-verified/)).toBeVisible();
    await expect(page.getByText('client-computed', { exact: true })).toBeVisible();
    await expect(page.getByTestId('admin-report-learner-count')).toHaveAttribute(
      'data-count',
      '14',
    );
    const deepLearningCourse = page.getByTestId('admin-report-course-course-deep-learning-basic');
    await expect(deepLearningCourse).toHaveAttribute('data-average-progress-percent', '67');
    await expect(deepLearningCourse).toHaveAttribute('data-completion-rate', '0');
    await expect(deepLearningCourse).toHaveAttribute('data-enrolled-count', '2');
    await expect(page.getByTestId('admin-report-quiz-average')).toHaveAttribute(
      'data-average-score-percent',
      '100',
    );
    const quizAttempts = page.getByTestId('admin-report-quiz-attempts');
    await expect(quizAttempts).toHaveAttribute('data-passed-attempt-count', '20');
    await expect(quizAttempts).toHaveAttribute('data-total-attempt-count', '20');
    await expect(page.getByTestId('admin-report-quiz-pass-rate')).toHaveAttribute(
      'data-pass-rate',
      '1',
    );
    const playgroundSummary = page.getByTestId('admin-report-playground-summary');
    await expect(playgroundSummary).toHaveAttribute('data-failed-run-count', '0');
    await expect(playgroundSummary).toHaveAttribute('data-run-count', '40');
    await expect(page.getByTestId('admin-report-playground-error-rate')).toHaveAttribute(
      'data-error-rate',
      '0',
    );
    await expectNoHorizontalOverflow(page);
    await expectNoWcagViolations(page);
  });
});

async function expectNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

  expect(layout.overflow).toBe(0);
}

async function expectNoWcagViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target.join(' ')),
    })),
  ).toEqual([]);
}

async function viewAllRequiredPostBlocks(page: Page) {
  const blocks = page.locator('[data-content-block-id]');
  const blockCount = await blocks.count();

  expect(blockCount).toBeGreaterThan(0);

  for (let index = 0; index < blockCount; index += 1) {
    const block = blocks.nth(index);

    await block.evaluate((element) => {
      element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
    });
    await expect(block).toBeInViewport({ ratio: 0.1 });
    await page.waitForTimeout(350);
  }

  await page.waitForTimeout(700);
}

function waitForPostContentViewed(page: Page, postId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let lastPayload: unknown;
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Post ${postId} did not become content-viewed within 15 seconds. Last response: ${JSON.stringify(lastPayload)}`,
        ),
      );
    }, 15_000);

    function cleanup() {
      clearTimeout(timeout);
      page.off('response', handleResponse);
    }

    async function handleResponse(candidate: Response) {
      if (
        candidate.request().method() !== 'POST' ||
        candidate.status() !== 200 ||
        !candidate.url().includes(`/api/v1/posts/${postId}/views`)
      ) {
        return;
      }

      try {
        lastPayload = await candidate.json();
        const payload = lastPayload as {
          data?: { postView?: { contentViewed?: boolean } };
          success?: boolean;
        };

        if (payload.success === true && payload.data?.postView?.contentViewed === true) {
          cleanup();
          resolve();
        }
      } catch {
        // Continue waiting for the response that confirms all required blocks.
      }
    }

    page.on('response', handleResponse);
  });
}

async function answerPostQuiz(page: Page) {
  await page
    .getByRole('group', { name: /Ví dụ XOR cho thấy điều gì/i })
    .getByRole('radio', { name: 'Ranh giới quyết định thẳng có một giới hạn rõ.' })
    .check();
  await page
    .getByRole('group', { name: /Hai phần nào nằm trong quy tắc quyết định/i })
    .getByRole('checkbox', { name: 'Tổng có trọng số kèm độ lệch' })
    .check();
  await page
    .getByRole('group', { name: /Hai phần nào nằm trong quy tắc quyết định/i })
    .getByRole('checkbox', { name: 'Hàm bước trả về 0 hoặc 1' })
    .check();
  await page
    .getByRole('group', { name: /cổng AND có thể được tách bằng một ranh giới thẳng/i })
    .getByRole('radio', { name: 'Đúng' })
    .check();
}

async function answerModuleQuiz(page: Page) {
  await page
    .getByRole('group', { name: /Đường Perceptron biểu diễn gì/i })
    .getByRole('radio', { name: 'Ranh giới quyết định' })
    .check();
  await page
    .getByRole('group', { name: /Giá trị nào là đầu vào mô hình/i })
    .getByRole('checkbox', { name: 'x1' })
    .check();
  await page
    .getByRole('group', { name: /Giá trị nào là đầu vào mô hình/i })
    .getByRole('checkbox', { name: 'x2' })
    .check();
  await page
    .getByRole('group', { name: /XOR tách tuyến tính được/i })
    .getByRole('radio', { name: 'Sai' })
    .check();
  await page
    .getByRole('group', { name: /Độ lệch có vai trò gì/i })
    .getByRole('radio', { name: 'Nó dịch điểm quyết định.' })
    .check();
  await page
    .getByRole('group', { name: /Nhận định nào so sánh đúng AND và XOR/i })
    .getByRole('checkbox', { name: 'AND tách tuyến tính được.' })
    .check();
  await page
    .getByRole('group', { name: /Nhận định nào so sánh đúng AND và XOR/i })
    .getByRole('checkbox', { name: 'XOR không tách tuyến tính được.' })
    .check();
  await page
    .getByRole('group', { name: /thất bại XOR gợi ý cần hidden layer/i })
    .getByRole('radio', { name: 'Đúng' })
    .check();
}

type QuizAnswer = string | readonly string[];

async function answerQuizByOptionIds(page: Page, answers: readonly QuizAnswer[]) {
  const questions = page.locator('fieldset.quiz-question-card');

  await expect(questions).toHaveCount(answers.length);

  for (let questionIndex = 0; questionIndex < answers.length; questionIndex += 1) {
    const question = questions.nth(questionIndex);
    const optionIds = Array.isArray(answers[questionIndex])
      ? answers[questionIndex]
      : [answers[questionIndex]];

    for (const optionId of optionIds) {
      const option = question.locator(`input[value="${optionId}"]`);

      await expect(option).toHaveCount(1);
      await option.check();
    }
  }
}

async function completePostFromModuleOverview(
  page: Page,
  postId: string,
  answers: readonly QuizAnswer[],
) {
  const nextPost = page.locator(`a[data-next-post="true"][href*="${postId}"]`);

  await expect(nextPost).toHaveCount(1, { timeout: EMULATOR_FLOW_TIMEOUT_MS });
  await nextPost.click();
  const postContentViewed = waitForPostContentViewed(page, postId);

  await expect(page.locator('[data-content-block-id]').first()).toBeVisible({
    timeout: EMULATOR_FLOW_TIMEOUT_MS,
  });

  await viewAllRequiredPostBlocks(page);
  await postContentViewed;
  await page.getByRole('link', { name: /Mở quiz bài học|Open (?:the )?lesson quiz/i }).click();
  await expect(page.locator('.learning-quiz-page')).toBeVisible({
    timeout: EMULATOR_FLOW_TIMEOUT_MS,
  });
  await answerQuizByOptionIds(page, answers);
  const submissionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/v1/quiz-attempts/') &&
      response.url().endsWith('/submissions'),
  );
  await page.getByRole('button', { name: /Nộp quiz|Submit quiz/i }).click();
  const submission = await submissionResponse;
  const submissionBody = await submission.text();
  let submissionPayload: { data?: { passed?: boolean } } = {};

  try {
    submissionPayload = JSON.parse(submissionBody) as { data?: { passed?: boolean } };
  } catch {
    // Preserve the raw response in the diagnostic below.
  }

  if (!submission.ok() || submissionPayload.data?.passed !== true) {
    throw new Error(
      `Quiz submission failed (${submission.status()}): ${submissionBody || '<empty response>'}`,
    );
  }

  await expect(page.getByText(/quiz_passed: quiz-post-/)).toBeVisible({
    timeout: EMULATOR_FLOW_TIMEOUT_MS,
  });
  await returnToModuleOverview(page);
}

async function completeDemo(page: Page, demoId: string) {
  const nextButton = page.getByRole('button', { name: /Bước tiếp theo|Next step/i });
  const completionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith(`/api/v1/demos/${demoId}/completions`),
  );

  for (let step = 0; step < 3; step += 1) {
    await nextButton.click();
  }

  const response = await completionResponse;
  const responseBody = await response.text();

  if (!response.ok()) {
    throw new Error(
      `Demo completion failed (${response.status()}): ${responseBody || '<empty response>'}`,
    );
  }

  await expect(page.getByText(`demo_completed: ${demoId}`)).toBeVisible({
    timeout: EMULATOR_FLOW_TIMEOUT_MS,
  });
}

async function returnToModuleOverview(page: Page) {
  await page.getByRole('link', { name: /Quay lại bài học|Back to lesson/i }).click();
  await page.getByRole('link', { name: /Về tổng quan module|Back to module overview/i }).click();
}
