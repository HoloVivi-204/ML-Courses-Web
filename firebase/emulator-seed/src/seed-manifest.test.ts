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
    const playgroundDatasetObjects = manifest.storageObjects.filter((object) =>
      object.path.startsWith('datasets/'),
    );

    expect(manifest.authUsers).toHaveLength(1);
    expect(manifest.authUsers[0]?.uid).toBe('local-student');
    expect(manifest.firestoreDocuments.map(({ path }) => path)).toEqual(['system/local-seed']);
    expect(manifest.storageObjects.map(({ path }) => path)).toEqual([
      'datasets/ds-country-indicators-v1/dataset.json.gz',
      'datasets/ds-country-indicators-v1/manifest.json',
      'datasets/ds-credit-risk-v1/dataset.json.gz',
      'datasets/ds-credit-risk-v1/manifest.json',
      'datasets/ds-customer-churn-v1/dataset.json.gz',
      'datasets/ds-customer-churn-v1/manifest.json',
      'datasets/ds-house-price-v1/dataset.json.gz',
      'datasets/ds-house-price-v1/manifest.json',
      'datasets/ds-insurance-cost-v1/dataset.json.gz',
      'datasets/ds-insurance-cost-v1/manifest.json',
      'datasets/ds-moons-2d-v1/dataset.json.gz',
      'datasets/ds-moons-2d-v1/manifest.json',
      'datasets/ds-retail-segments-v1/dataset.json.gz',
      'datasets/ds-retail-segments-v1/manifest.json',
      'datasets/ds-sms-spam-v1/dataset.json.gz',
      'datasets/ds-sms-spam-v1/manifest.json',
      'datasets/ds-wine-cultivar-v1/dataset.json.gz',
      'datasets/ds-wine-cultivar-v1/manifest.json',
      'datasets/ds-xor-noisy-v1/dataset.json.gz',
      'datasets/ds-xor-noisy-v1/manifest.json',
      'local-seed/manifest.json',
    ]);
    expect(playgroundDatasetObjects).toHaveLength(20);
    expect(
      playgroundDatasetObjects
        .filter((object) => object.path.endsWith('/dataset.json.gz'))
        .every(
          (object) =>
            object.contentEncoding === undefined &&
            object.contentType === 'application/gzip' &&
            object.metadata?.schemaVersion === '1' &&
            object.metadata.sourceId === 'generated-playground-baseline' &&
            /^[a-f0-9]{64}$/.test(object.metadata.sha256 ?? ''),
        ),
    ).toBe(true);
  });
});
