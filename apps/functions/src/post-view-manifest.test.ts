import { describe, expect, it } from 'vitest';

import { getPostViewManifest } from './post-view-manifest.js';

describe('post view manifest', () => {
  it('tracks every required block in the published Perceptron lesson', () => {
    expect(getPostViewManifest('dl-p01-neuron-perceptron')).toEqual({
      postId: 'dl-p01-neuron-perceptron',
      requiredBlockIds: [
        'what-is-a-neuron',
        'neuron-explanation',
        'neuron-insight',
        'weighted-sum',
        'weight-explanation',
        'weighted-sum-formula',
        'try-it',
        'read-result',
        'xor-linear-limit',
        'xor-truth-table',
        'and-linearly-separable',
      ],
    });
  });

  it('returns no manifest for an unknown post', () => {
    expect(getPostViewManifest('post-unknown')).toBeNull();
  });
});
