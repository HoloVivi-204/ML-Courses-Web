import { describe, expect, it } from 'vitest';

import { createLocalSeedManifest } from './seed-manifest.js';

describe('local Firebase seed manifest', () => {
  it('is deterministic and contains no password or token field', () => {
    const firstManifest = createLocalSeedManifest();
    const secondManifest = createLocalSeedManifest();
    const serializedManifest = JSON.stringify(firstManifest);

    expect(secondManifest).toEqual(firstManifest);
    expect(serializedManifest).not.toMatch(/password|token|secret/i);
  });

  it('uses fixed identifiers for every seeded emulator resource', () => {
    const manifest = createLocalSeedManifest();

    expect(manifest.authUsers).toHaveLength(1);
    expect(manifest.authUsers[0]?.uid).toBe('local-student');
    expect(manifest.firestoreDocuments.map(({ path }) => path)).toEqual(['system/local-seed']);
    expect(manifest.storageObjects.map(({ path }) => path)).toEqual(['local-seed/manifest.json']);
  });
});
