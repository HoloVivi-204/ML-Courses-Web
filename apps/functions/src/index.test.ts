import { describe, expect, it } from 'vitest';

import { API_FUNCTION_OPTIONS } from './index.js';

describe('API Function deployment options', () => {
  it('sets explicit cost and execution bounds', () => {
    expect(API_FUNCTION_OPTIONS).toMatchObject({
      maxInstances: 10,
      memory: '512MiB',
      minInstances: 0,
      timeoutSeconds: 60,
    });
  });
});
