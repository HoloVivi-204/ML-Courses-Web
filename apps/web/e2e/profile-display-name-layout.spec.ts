import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const stylesPath = fileURLToPath(new URL('../src/styles.css', import.meta.url));
const applicationStyles = readFileSync(stylesPath, 'utf8');

test('stacks the display-name label, field, and save control', async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 900 });
  await page.setContent(`
    <style>${applicationStyles}</style>
    <main class="profile-page page-shell">
      <section class="profile-panel">
        <form class="profile-display-name-form">
          <label for="profile-display-name">Tên hiển thị</label>
          <input id="profile-display-name" value="Long Vũ" />
          <button type="submit">Lưu tên hiển thị</button>
        </form>
      </section>
    </main>
  `);

  const controlPositions = await page.locator('.profile-display-name-form').evaluate((form) => {
    const label = form.querySelector('label');
    const input = form.querySelector('input');
    const button = form.querySelector('button');

    if (!label || !input || !button) {
      throw new Error('Expected the display-name form controls to be rendered.');
    }

    const labelBounds = label.getBoundingClientRect();
    const inputBounds = input.getBoundingClientRect();
    const buttonBounds = button.getBoundingClientRect();

    return {
      buttonTop: buttonBounds.top,
      inputBottom: inputBounds.bottom,
      inputTop: inputBounds.top,
      labelBottom: labelBounds.bottom,
    };
  });

  expect(controlPositions.inputTop).toBeGreaterThanOrEqual(controlPositions.labelBottom);
  expect(controlPositions.buttonTop).toBeGreaterThanOrEqual(controlPositions.inputBottom);
});
