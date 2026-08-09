import { createDisabledBuildFeatureFlags, type BuildFeatureFlags } from '@ml-path/contracts';

export const WEB_BUILD_FEATURE_FLAGS: Readonly<BuildFeatureFlags> = Object.freeze(
  createDisabledBuildFeatureFlags(),
);
