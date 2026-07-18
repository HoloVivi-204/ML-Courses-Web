import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const trialPath = '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron';

test('public learning journey is responsive and passes automated WCAG checks', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /machine learning không còn là một hộp đen/i }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chạy mô hình' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectNoWcagViolations(page);

  await page.getByRole('button', { name: 'Bật giao diện tối' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await waitForVisualState(page);
  await expectNoWcagViolations(page);

  await page.goto(trialPath);

  await expect(
    page.getByRole('heading', { name: 'Một neuron đưa ra quyết định như thế nào?' }),
  ).toBeVisible();
  await expect(page.locator('.katex').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoWcagViolations(page);
});

test('registration entry remains responsive and accessible before authentication starts', async ({
  page,
}) => {
  await page.goto('/register');

  await expect(
    page.getByRole('heading', { name: /biến câu hỏi đầu tiên thành một lộ trình/i }),
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu')).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoWcagViolations(page);
});

async function waitForVisualState(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const layout = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

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

async function expectNoWcagViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const fingerprints = results.violations.map((violation) => ({
    id: violation.id,
    nodes: violation.nodes.map((node) => ({
      messages: node.any.map((check) => check.message),
      target: node.target.join(' '),
    })),
  }));

  expect(fingerprints).toEqual([]);
}
