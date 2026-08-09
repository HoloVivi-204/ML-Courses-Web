import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCAL_FIREBASE_PROJECT_ID, createLocalEmulatorEnvironment } from './environment.js';
import {
  getEmulatorMode,
  getEmulatorRunConfiguration,
  type EmulatorMode,
} from './emulator-command.js';
import { configureFirebaseCliEnvironment } from './firebase-cli-environment.js';

function runFirebaseCommand(mode: EmulatorMode, environment: NodeJS.ProcessEnv): Promise<number> {
  const firebaseCli = createRequire(import.meta.url).resolve('firebase-tools/lib/bin/firebase.js');
  const configuration = getEmulatorRunConfiguration(mode);
  const firebaseArguments = [
    firebaseCli,
    configuration.command,
    '--project',
    LOCAL_FIREBASE_PROJECT_ID,
    '--only',
    configuration.emulatorNames,
  ];

  if (configuration.executionCommand) {
    firebaseArguments.push(configuration.executionCommand);
  }

  return new Promise((resolve, reject) => {
    const childProcess = spawn(process.execPath, firebaseArguments, {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit',
    });

    childProcess.once('error', reject);
    childProcess.once('exit', (exitCode) => resolve(exitCode ?? 1));
  });
}

const mode = getEmulatorMode(process.argv[2]);
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const environment = configureFirebaseCliEnvironment(
  createLocalEmulatorEnvironment(process.env),
  join(repositoryRoot, '.runtime'),
);
const runEnvironment =
  mode === 'e2e'
    ? {
        ...environment,
        // The local authenticated journey traverses both courses in one learner session.
        API_RATE_LIMIT_QUIZ_SUBMISSION_MAX: environment.API_RATE_LIMIT_QUIZ_SUBMISSION_MAX ?? '20',
        // This affects only the Functions Emulator so the browser journey can prove reauthentication.
        API_ACCOUNT_DELETION_RECENT_AUTH_WINDOW_SECONDS:
          environment.API_ACCOUNT_DELETION_RECENT_AUTH_WINDOW_SECONDS ?? '1',
      }
    : environment;
const exitCode = await runFirebaseCommand(mode, runEnvironment);

process.exitCode = exitCode;
