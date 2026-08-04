import { describe, expect, it } from 'vitest';

import { getLockedContentScope } from './content-scope-validator.js';
import { getContentSourceRegistry } from './content-source-registry.js';

describe('content source registry', () => {
  it('covers exactly the source IDs locked by the content skeleton', () => {
    const registry = getContentSourceRegistry();
    const lockedSourceIds = getLockedContentScope().sourceIds;

    expect(registry.map((source) => source.sourceId).sort()).toEqual(lockedSourceIds);

    for (const source of registry) {
      expect(source.canonicalUrl).toMatch(/^https:\/\//);
      expect(source.contentUrls.length).toBeGreaterThan(0);
      expect(source.allowedHostnames.length).toBeGreaterThan(0);
      expect(source.license.url).toMatch(/^https:\/\//);
      expect(source.termsUrl).toMatch(/^https:\/\//);
      expect(source.reviewStatus).toBe('pending-operator-review');
    }
  });
});
