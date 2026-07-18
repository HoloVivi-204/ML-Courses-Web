import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { LOCAL_FIREBASE_PROJECT_ID, createLocalEmulatorEnvironment } from './environment.js';

const EMULATORS = 'auth,firestore,functions,storage';

type EmulatorMode = 'start' | 'verify';

function getMode(argument: string | undefined): EmulatorMode {
  if (argument === 'start' || argument === 'verify') {
    return argument;
  }

  throw new Error('Expected emulator mode to be start or verify.');
}

function runFirebaseCommand(mode: EmulatorMode, environment: NodeJS.ProcessEnv): Promise<number> {
  const firebaseCli = createRequire(import.meta.url).resolve('firebase-tools/lib/bin/firebase.js');
  const firebaseArguments = [
    firebaseCli,
    mode === 'start' ? 'emulators:start' : 'emulators:exec',
    '--project',
    LOCAL_FIREBASE_PROJECT_ID,
    '--only',
    EMULATORS,
  ];

  if (mode === 'verify') {
    firebaseArguments.push('node firebase/emulator-seed/dist/verify-emulators.js');
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

const mode = getMode(process.argv[2]);
const exitCode = await runFirebaseCommand(mode, createLocalEmulatorEnvironment(process.env));

process.exitCode = exitCode;
