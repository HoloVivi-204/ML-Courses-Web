import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { createHybridDemoEnvironment } from './hybrid-demo-environment.js';

const HYBRID_DEMO_EMULATORS = 'firestore,functions,storage';

function runHybridDemoEmulators(environment: NodeJS.ProcessEnv): Promise<number> {
  const projectId = environment.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID must be configured for the friend demo.');
  }

  const firebaseCli = createRequire(import.meta.url).resolve('firebase-tools/lib/bin/firebase.js');
  const childProcess = spawn(
    process.execPath,
    [firebaseCli, 'emulators:start', '--project', projectId, '--only', HYBRID_DEMO_EMULATORS],
    {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit',
    },
  );

  return new Promise((resolve, reject) => {
    childProcess.once('error', reject);
    childProcess.once('exit', (exitCode) => resolve(exitCode ?? 1));
  });
}

const exitCode = await runHybridDemoEmulators(createHybridDemoEnvironment(process.env));

process.exitCode = exitCode;
