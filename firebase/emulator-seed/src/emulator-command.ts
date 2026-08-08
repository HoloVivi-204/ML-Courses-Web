export type EmulatorMode = 'e2e' | 'start' | 'verify';

interface EmulatorRunConfiguration {
  command: 'emulators:exec' | 'emulators:start';
  emulatorNames: 'auth,firestore,functions,storage';
  executionCommand?: string;
}

const EMULATOR_NAMES = 'auth,firestore,functions,storage' as const;

export function getEmulatorMode(argument: string | undefined): EmulatorMode {
  if (argument === 'e2e' || argument === 'start' || argument === 'verify') {
    return argument;
  }

  throw new Error('Expected emulator mode to be e2e, start, or verify.');
}

export function getEmulatorRunConfiguration(mode: EmulatorMode): EmulatorRunConfiguration {
  if (mode === 'start') {
    return { command: 'emulators:start', emulatorNames: EMULATOR_NAMES };
  }

  if (mode === 'e2e') {
    return {
      command: 'emulators:exec',
      emulatorNames: EMULATOR_NAMES,
      executionCommand: 'node firebase/emulator-seed/dist/run-emulator-e2e.js',
    };
  }

  return {
    command: 'emulators:exec',
    emulatorNames: EMULATOR_NAMES,
    executionCommand: 'node firebase/emulator-seed/dist/verify-emulators.js',
  };
}
