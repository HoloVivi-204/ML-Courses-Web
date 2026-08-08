import { describe, expect, it } from 'vitest';

import { getEmulatorRunConfiguration } from './emulator-command.js';

describe('local Emulator command configuration', () => {
  it('runs authenticated browser journeys inside a fresh local Emulator session', () => {
    expect(getEmulatorRunConfiguration('e2e')).toEqual({
      command: 'emulators:exec',
      emulatorNames: 'auth,firestore,functions,storage',
      executionCommand: 'node firebase/emulator-seed/dist/run-emulator-e2e.js',
    });
  });

  it('keeps the deterministic verification command separate from browser E2E', () => {
    expect(getEmulatorRunConfiguration('verify')).toEqual({
      command: 'emulators:exec',
      emulatorNames: 'auth,firestore,functions,storage',
      executionCommand: 'node firebase/emulator-seed/dist/verify-emulators.js',
    });
  });
});
