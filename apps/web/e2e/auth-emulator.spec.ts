import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

const runAuthEmulatorE2e = process.env.RUN_AUTH_EMULATOR_E2E === 'true';
const AUTH_EMULATOR_READY_URL =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects?key=local-emulator-api-key';
const API_EMULATOR_HEALTH_URL =
  'http://127.0.0.1:5001/demo-ml-learning-local/asia-southeast1/api/api/v1/health';
const EMULATOR_FLOW_TIMEOUT_MS = 30_000;

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
      page.getByRole('heading', { name: 'Vì sao XOR làm Perceptron một lớp thất bại?' }),
    ).toBeVisible();

    await viewAllRequiredPostBlocks(page);
    const postContentViewed = waitForPostContentViewed(page, 'dl-p01-neuron-perceptron');
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
  });
});

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
    (candidate) =>
      candidate.request().method() === 'POST' &&
      candidate.url().includes(`/api/v1/posts/${postId}/views`),
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
