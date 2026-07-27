import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

import { getFunctionsEmulatorTarget } from './src/app/functions-emulator-target';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          changeOrigin: true,
          target: getFunctionsEmulatorTarget(environment.VITE_FUNCTIONS_EMULATOR_PROJECT_ID),
        },
      },
    },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      maxWorkers: 1,
      pool: 'threads',
      setupFiles: './src/test/setup.ts',
      css: true,
      fileParallelism: false,
      coverage: {
        include: ['src/**/*.{ts,tsx}'],
        thresholds: {
          lines: 80,
        },
      },
    },
  };
});
