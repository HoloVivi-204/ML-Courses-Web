import { describe, expect, it } from 'vitest';

import { getPlaygroundPairRegistry } from './playground-adapter-registry';
import { getPlaygroundDataset, splitDatasetRows } from './playground-datasets';

describe('Playground dataset registry', () => {
  it('provides deterministic versioned datasets for every locked submission pair', () => {
    const datasetIds = new Set(
      getPlaygroundPairRegistry().map((registration) => registration.datasetVersionId),
    );

    expect([...datasetIds]).toEqual([
      'ds-xor-noisy-v1',
      'ds-house-price-v1',
      'ds-insurance-cost-v1',
      'ds-sms-spam-v1',
      'ds-credit-risk-v1',
      'ds-retail-segments-v1',
      'ds-country-indicators-v1',
    ]);

    for (const datasetVersionId of datasetIds) {
      const dataset = getPlaygroundDataset(datasetVersionId);

      expect(dataset.datasetVersionId).toBe(datasetVersionId);
      expect(dataset.rows.length).toBeGreaterThan(0);
      expect(dataset.source.kind).toBe('generated');
      expect(
        dataset.rows.every((row) => row.features.length === dataset.featureColumns.length),
      ).toBe(true);
    }
  });

  it('creates the same train/test split for the same seed and ratio', () => {
    const dataset = getPlaygroundDataset('ds-xor-noisy-v1');
    const firstSplit = splitDatasetRows(dataset, 0.75, 42);
    const secondSplit = splitDatasetRows(dataset, 0.75, 42);

    expect(firstSplit).toEqual(secondSplit);
    expect(firstSplit.trainRows).toHaveLength(300);
    expect(firstSplit.testRows).toHaveLength(100);
    expect(firstSplit.trainRows[0]?.rowId).toBe('xor-3-073');
  });
});
