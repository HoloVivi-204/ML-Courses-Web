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

  it('uses the published MLP block IDs instead of synthesizing a generic manifest', () => {
    expect(getPostViewManifest('dl-p02-mlp-forward-activation')).toEqual({
      postId: 'dl-p02-mlp-forward-activation',
      requiredBlockIds: [
        'mlp-hidden-representation',
        'mlp-forward-chain',
        'mlp-affine-collapse',
        'mlp-checkerboard-target',
        'mlp-checkerboard-table',
        'mlp-activation-role',
        'mlp-relu-operation',
        'mlp-activation-cause-effect',
        'mlp-checkerboard-example',
        'mlp-output-predictor',
        'mlp-before-after-activation',
      ],
    });
  });

  it('returns no manifest for an unknown post', () => {
    expect(getPostViewManifest('post-unknown')).toBeNull();
  });
});
