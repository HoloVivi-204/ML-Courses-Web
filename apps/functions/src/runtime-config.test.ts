import { describe, expect, it } from 'vitest';

import { getBuildFeatureFlags, getRuntimeFeatureManifest } from './runtime-config.js';

describe('Release 1 runtime configuration', () => {
  it('exposes only the TDD runtime taxonomy through a checksummed manifest', () => {
    const manifest = getRuntimeFeatureManifest();

    expect(manifest).toMatchObject({
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
      featureFlags: {
        additionalScenarioPairs: false,
        compareRuns: false,
        csvReports: false,
        demoAnimation: false,
        guidedPrediction: false,
        lessonSearch: false,
        pinRuns: false,
        quizDragDrop: false,
        quizMatching: false,
        studentDetailReports: false,
        targetScores: false,
      },
      releaseId: 'release-1',
      schemaVersion: 1,
    });
  });

  it('keeps every Stretch build flag disabled in the Release 1 Functions artifact', () => {
    expect(getBuildFeatureFlags()).toEqual({
      advancedAnalytics: false,
      advancedCms: false,
      capstones: false,
      genericDatasetUpload: false,
    });
  });
});
