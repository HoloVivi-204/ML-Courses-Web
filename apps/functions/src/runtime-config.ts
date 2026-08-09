import { createHash } from 'node:crypto';

import {
  createDisabledBuildFeatureFlags,
  createDisabledRuntimeFeatureFlags,
  runtimeFeatureManifestSchema,
  serializeRuntimeFeatureManifestPayload,
  type BuildFeatureFlags,
  type RuntimeFeatureManifest,
  type RuntimeFeatureManifestPayload,
} from '@ml-path/contracts';

export const FIREBASE_REGION = 'asia-southeast1';

const runtimeFeatureManifestSource = {
  schemaVersion: 1,
  releaseId: 'release-1',
  featureFlags: createDisabledRuntimeFeatureFlags(),
} satisfies RuntimeFeatureManifestPayload;

const buildFeatureFlags = createDisabledBuildFeatureFlags();

const runtimeFeatureManifestChecksum = createHash('sha256')
  .update(serializeRuntimeFeatureManifestPayload(runtimeFeatureManifestSource))
  .digest('hex');

export function getRuntimeFeatureManifest(): RuntimeFeatureManifest {
  return runtimeFeatureManifestSchema.parse({
    ...runtimeFeatureManifestSource,
    featureFlags: { ...runtimeFeatureManifestSource.featureFlags },
    checksum: runtimeFeatureManifestChecksum,
  });
}

export function getBuildFeatureFlags(): BuildFeatureFlags {
  return { ...buildFeatureFlags };
}
