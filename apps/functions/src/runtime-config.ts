import { createHash } from 'node:crypto';

export const FIREBASE_REGION = 'asia-southeast1';

const runtimeFeatureManifestSource = {
  releaseId: 'release-1',
  featureFlags: {
    capstones: false,
    csvReports: false,
    pinRuns: false,
    studentDetailReports: false,
    targetScores: false,
  },
} as const;

export type RuntimeFeatureManifest = typeof runtimeFeatureManifestSource & {
  checksum: string;
};

const runtimeFeatureManifestChecksum = createHash('sha256')
  .update(JSON.stringify(runtimeFeatureManifestSource))
  .digest('hex');

export function getRuntimeFeatureManifest(): RuntimeFeatureManifest {
  return {
    ...runtimeFeatureManifestSource,
    featureFlags: { ...runtimeFeatureManifestSource.featureFlags },
    checksum: runtimeFeatureManifestChecksum,
  };
}
