import { randomUUID } from 'node:crypto';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const runAuthEmulatorE2e = process.env.RUN_AUTH_EMULATOR_E2E === 'true';
const AUTH_EMULATOR_READY_URL =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects?key=local-emulator-api-key';
const API_EMULATOR_HEALTH_URL =
  'http://127.0.0.1:5001/demo-ml-learning-local/asia-southeast1/api/api/v1/health';
const AUTH_SIGN_UP_URL = AUTH_EMULATOR_READY_URL.replace('/v1/projects?', '/v1/accounts:signUp?');
const EMULATOR_FLOW_TIMEOUT_MS = 30_000;
const configuredLocalAdminEmail = process.env.LOCAL_DEMO_ADMIN_EMAIL?.trim();
const configuredLocalAdminPassword = process.env.LOCAL_DEMO_ADMIN_PASSWORD?.trim();

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

  test('runs the learner baseline from auth to dashboard through local emulators', async ({
    page,
  }) => {
    test.setTimeout(120_000);

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
    await page.getByRole('button', { name: /Mở tổng quan module/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Một neuron đưa ra quyết định như thế nào?' }),
    ).toBeVisible();

    const postContentViewed = waitForPostContentViewed(page, 'dl-p01-neuron-perceptron');
    await viewAllRequiredPostBlocks(page);
    await page.getByRole('link', { name: /Mở quiz bài học/i }).click();
    await postContentViewed;
    await expect(page.getByRole('heading', { name: 'Quiz Perceptron/XOR' })).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });
    await answerPostQuiz(page);
    await page.getByRole('button', { name: 'Nộp quiz' }).click();
    await expect(page.getByText('quiz_passed: quiz-post-dl-p01')).toBeVisible({
      timeout: EMULATOR_FLOW_TIMEOUT_MS,
    });

    await page.getByRole('link', { name: 'Quay lại bài học' }).click();
    await page.getByRole('link', { name: /Mở demo AND gate/i }).click();
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

    await page.goto('/playground/pg-xor');
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
    await expect(page.locator('.admin-report-panel-verified')).toBeVisible();
    await expect(page.locator('.admin-report-panel-client')).toBeVisible();
    await expect(page.getByText(/server-verified/)).toBeVisible();
    await expect(page.getByText('client-computed', { exact: true })).toBeVisible();
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
    await blocks.nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
  }

  await page.waitForTimeout(400);
}

async function waitForPostContentViewed(page: Page, postId: string) {
  const response = await page.waitForResponse(
    async (candidate) => {
      if (
        candidate.request().method() !== 'POST' ||
        !candidate.url().includes(`/api/v1/posts/${postId}/views`)
      ) {
        return false;
      }

      try {
        const payload = (await candidate.json()) as {
          data?: { postView?: { contentViewed?: boolean } };
          success?: boolean;
        };

        return (
          candidate.status() === 200 &&
          payload.success === true &&
          payload.data?.postView?.contentViewed === true
        );
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );
  const payload = (await response.json()) as {
    data?: { postView?: { contentViewed?: boolean } };
    success?: boolean;
  };

  expect(response.status()).toBe(200);
  expect(payload.success).toBe(true);
  expect(payload.data?.postView?.contentViewed).toBe(true);
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
