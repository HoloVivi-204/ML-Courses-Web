import { describe, expect, it } from 'vitest';

import {
  assertProjectConfirmation,
  assertTrustedMutationTarget,
  parseTrustedCommand,
} from './trusted-command.js';

describe('trusted release commands', () => {
  it('rejects a production apply when the project confirmation differs', () => {
    const command = parseTrustedCommand([
      '--env',
      'production',
      '--project',
      'ml-courses-production',
      '--apply',
      '--confirm-project',
      'ml-courses-staging',
    ]);

    expect(() => assertTrustedMutationTarget(command, {})).toThrow(
      '--confirm-project must exactly match --project for production.',
    );
  });

  it('requires explicit dry-run mode when apply is absent', () => {
    const command = parseTrustedCommand(['--env', 'staging', '--project', 'ml-courses-staging']);

    expect(() => assertTrustedMutationTarget(command, {})).toThrow(
      'Specify --dry-run or --apply explicitly.',
    );
  });

  it('rejects an environment project mismatch before an apply can start', () => {
    const command = parseTrustedCommand([
      '--env',
      'staging',
      '--project',
      'ml-courses-staging',
      '--apply',
    ]);

    expect(() =>
      assertTrustedMutationTarget(command, { GOOGLE_CLOUD_PROJECT: 'different-project' }),
    ).toThrow('GOOGLE_CLOUD_PROJECT must match --project.');
  });

  it('requires explicit project confirmation for an Admin claim target', () => {
    const command = parseTrustedCommand([
      '--env',
      'staging',
      '--project',
      'ml-courses-staging',
      '--apply',
      '--uid',
      'admin-uid',
    ]);

    expect(() => assertProjectConfirmation(command)).toThrow(
      '--confirm-project must exactly match --project.',
    );
  });
});
