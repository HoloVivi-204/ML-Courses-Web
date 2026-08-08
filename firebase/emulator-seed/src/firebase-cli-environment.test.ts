import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { configureFirebaseCliEnvironment } from './firebase-cli-environment.js';

describe('configureFirebaseCliEnvironment', () => {
  it('isolates Firebase CLI settings and skips nonessential npm registry lookups', () => {
    const runtimeDirectory = join('D:', 'demo', '.runtime');

    expect(configureFirebaseCliEnvironment({}, runtimeDirectory)).toMatchObject({
      XDG_CONFIG_HOME: join(runtimeDirectory, 'firebase-tools-config'),
      npm_config_offline: 'true',
    });
  });

  it('keeps explicit caller overrides', () => {
    expect(
      configureFirebaseCliEnvironment(
        {
          XDG_CONFIG_HOME: 'D:/custom-config',
          npm_config_offline: 'false',
        },
        'D:/demo/.runtime',
      ),
    ).toMatchObject({
      XDG_CONFIG_HOME: 'D:/custom-config',
      npm_config_offline: 'false',
    });
  });
});
