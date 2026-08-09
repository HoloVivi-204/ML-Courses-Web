import { describe, expect, it } from 'vitest';

import { WEB_BUILD_FEATURE_FLAGS } from './release-build-flags';

describe('Release 1 Web build feature flags', () => {
  it('keeps every Stretch build capability disabled in the baseline artifact', () => {
    expect(WEB_BUILD_FEATURE_FLAGS).toEqual({
      advancedAnalytics: false,
      advancedCms: false,
      capstones: false,
      genericDatasetUpload: false,
    });
  });
});
