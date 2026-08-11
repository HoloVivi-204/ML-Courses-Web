import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getViteEnvironmentDirectory } from '../../vite-environment';

describe('Vite environment directory', () => {
  it('loads friend-demo variables from the ignored runtime directory', () => {
    const webRoot = resolve('apps/web');

    expect(getViteEnvironmentDirectory('friend-demo', webRoot)).toBe(
      resolve(webRoot, '../../.runtime/friend-demo-web'),
    );
  });

  it('keeps regular Vite modes scoped to the web app directory', () => {
    const webRoot = resolve('apps/web');

    expect(getViteEnvironmentDirectory('development', webRoot)).toBe(webRoot);
  });
});
