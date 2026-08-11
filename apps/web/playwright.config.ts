import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  fullyParallel: true,
  workers: 1,
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile-360',
      use: { viewport: { height: 800, width: 360 } },
    },
    {
      grep: /@cross-browser-smoke/,
      name: 'firefox-smoke',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      grep: /@cross-browser-smoke/,
      name: 'webkit-smoke',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  reporter: 'line',
  testDir: './e2e',
  use: {
    baseURL,
    contextOptions: {
      reducedMotion: 'reduce',
    },
    trace: 'retain-on-failure',
  },
});
