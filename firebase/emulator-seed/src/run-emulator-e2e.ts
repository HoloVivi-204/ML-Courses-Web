import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteApp } from 'firebase-admin/app';

import { createLocalAdminServices } from './admin-services.js';
import { createLocalEmulatorEnvironment } from './environment.js';
import { provisionLocalE2eAdmin } from './local-e2e-admin.js';

interface ChildProcessInput {
  arguments: readonly string[];
  command: string;
  cwd: string;
  environment: NodeJS.ProcessEnv;
}

function runChildProcess({
  arguments: childArguments,
  command,
  cwd,
  environment,
}: ChildProcessInput): Promise<void> {
  const childProcess = spawn(command, childArguments, {
    cwd,
    env: environment,
    stdio: 'inherit',
  });

  return new Promise<void>((resolve, reject) => {
    childProcess.once('error', reject);
    childProcess.once('exit', (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(`Local Emulator E2E command failed with exit code ${exitCode ?? 1}.`));
    });
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function startViteServer(cwd: string, environment: NodeJS.ProcessEnv): ChildProcess {
  const viteCli = join(cwd, 'node_modules', 'vite', 'bin', 'vite.js');

  return spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', '4173'], {
    cwd,
    env: environment,
    stdio: 'inherit',
  });
}

async function waitForViteServer(viteServer: ChildProcess): Promise<void> {
  const url = 'http://127.0.0.1:4173';

  for (let attempt = 1; attempt <= 45; attempt += 1) {
    if (viteServer.exitCode !== null) {
      throw new Error(`Vite exited before the authenticated browser checks started.`);
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });

      if (response.ok) {
        return;
      }
    } catch {
      // Vite has not finished listening yet.
    }

    await delay(1_000);
  }

  throw new Error(`Vite did not become ready at ${url} within 45 seconds.`);
}

async function stopViteServer(viteServer: ChildProcess): Promise<void> {
  if (viteServer.exitCode !== null) {
    return;
  }

  viteServer.kill();
  await Promise.race([
    new Promise<void>((resolve) => viteServer.once('exit', () => resolve())),
    delay(5_000),
  ]);

  if (viteServer.exitCode === null) {
    viteServer.kill('SIGKILL');
  }
}

async function createLocalE2eAdminEnvironment(
  environment: NodeJS.ProcessEnv,
): Promise<NodeJS.ProcessEnv> {
  const services = createLocalAdminServices(environment);

  try {
    const credentials = await provisionLocalE2eAdmin({
      createUser: (input) => services.auth.createUser(input),
      setCustomUserClaims: (uid, claims) => services.auth.setCustomUserClaims(uid, claims),
    });

    return { ...environment, ...credentials };
  } finally {
    await deleteApp(services.app);
  }
}

const environment = createLocalEmulatorEnvironment(process.env);
const webDirectory = fileURLToPath(new URL('../../../apps/web/', import.meta.url));
const webRequire = createRequire(new URL('../../../apps/web/package.json', import.meta.url));
const playwrightCli = webRequire.resolve('@playwright/test/cli');
const seededEnvironment = {
  ...environment,
  PATH: [dirname(process.execPath), environment.PATH].filter(Boolean).join(delimiter),
};

console.log('Seeding local Emulator data for authenticated browser checks.');
await runChildProcess({
  arguments: [fileURLToPath(new URL('./seed-emulators.js', import.meta.url))],
  command: process.execPath,
  cwd: process.cwd(),
  environment: seededEnvironment,
});

const browserEnvironment = await createLocalE2eAdminEnvironment(seededEnvironment);

console.log('Starting a fresh Vite server for authenticated browser checks.');
const viteServer = startViteServer(webDirectory, browserEnvironment);

console.log('Running authenticated Playwright journeys on desktop and 360px.');
try {
  await waitForViteServer(viteServer);
  await runChildProcess({
    arguments: [playwrightCli, 'test'],
    command: process.execPath,
    cwd: webDirectory,
    environment: {
      ...browserEnvironment,
      RUN_AUTH_EMULATOR_E2E: 'true',
    },
  });
} finally {
  await stopViteServer(viteServer);
}

console.log('Authenticated Emulator browser checks passed.');
