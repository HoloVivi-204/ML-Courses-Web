import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import { getFunctionsEmulatorTarget } from './src/app/functions-emulator-target';

const require = createRequire(import.meta.url);
const libsvmWasmModuleId = '@libsvm-js/libsvm-js/out/wasm/libsvm';
const libsvmWasmVirtualModuleId = '\0libsvm-worker-compatible';
const libsvmWasmEntryPath = require.resolve('@libsvm-js/libsvm-js/out/wasm/libsvm.js');

function libsvmWorkerCompatibilityPlugin(): Plugin {
  const browserBranchCheck = 'if (typeof window === "undefined") {';
  const browserLocateFileStatement = 'return new URL(url, path).href;';
  const workerCompatibleBranchCheck =
    'if (typeof WorkerGlobalScope === "undefined" && typeof window === "undefined") {';

  return {
    enforce: 'pre',
    name: 'libsvm-worker-compatibility',
    resolveId(source) {
      if (source !== libsvmWasmModuleId && source !== `${libsvmWasmModuleId}.js`) {
        return null;
      }

      return libsvmWasmVirtualModuleId;
    },
    load(id) {
      if (id !== libsvmWasmVirtualModuleId) {
        return null;
      }

      const source = readFileSync(libsvmWasmEntryPath, 'utf8');

      if (!source.includes(browserBranchCheck)) {
        this.error(
          'The LibSVM Worker compatibility transform no longer matches its package source.',
        );
      }

      if (!source.includes(browserLocateFileStatement)) {
        this.error('The LibSVM Worker WASM URL transform no longer matches its package source.');
      }

      const workerCompatibleSource = source
        .replace(browserBranchCheck, workerCompatibleBranchCheck)
        .replace(
          browserLocateFileStatement,
          'return url === "libsvm.wasm" ? libsvmWasmUrl : new URL(url, path).href;',
        );

      return [
        "import libsvmWasmUrl from '@libsvm-js/libsvm-js/out/wasm/libsvm.wasm?url';",
        'const module = { exports: {} };',
        'const exports = module.exports;',
        workerCompatibleSource,
        'export default module.exports;',
      ].join('\n');
    },
  };
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss(), libsvmWorkerCompatibilityPlugin()],
    worker: {
      plugins: () => [libsvmWorkerCompatibilityPlugin()],
    },
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
