import { describe, expect, it } from 'vitest';

import {
  adminContentListQuerySchema,
  avatarUploadSessionRequestSchema,
  getPublishedLearnerContentDocumentId,
  playgroundConfigCreateRequestSchema,
  runtimeFeatureManifestSchema,
} from './index.js';

describe('Release 1 shared API schemas', () => {
  it('rejects untrusted avatar fields before either Web or Functions consumes them', () => {
    expect(
      avatarUploadSessionRequestSchema.safeParse({
        contentType: 'image/svg+xml',
        sha256: 'A'.repeat(64),
        sizeBytes: 2 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
    expect(
      avatarUploadSessionRequestSchema.safeParse({
        contentType: 'image/png',
        sha256: 'a'.repeat(64),
        sizeBytes: 512,
        avatarUrl: 'https://attacker.example/avatar.png',
      }).success,
    ).toBe(false);
  });

  it('defines a bounded saved-config request instead of accepting arbitrary code or an unnamed config', () => {
    expect(
      playgroundConfigCreateRequestSchema.parse({
        algorithmId: 'perceptron',
        config: { learningRate: 0.1, maxEpochs: 50 },
        datasetVersionId: 'ds-xor-noisy-v1',
        name: '  XOR starter  ',
        scenarioId: 'pg-xor',
      }),
    ).toEqual({
      algorithmId: 'perceptron',
      config: { learningRate: 0.1, maxEpochs: 50 },
      datasetVersionId: 'ds-xor-noisy-v1',
      name: 'XOR starter',
      scenarioId: 'pg-xor',
    });
    expect(
      playgroundConfigCreateRequestSchema.safeParse({
        algorithmId: 'perceptron',
        config: { executable: '() => fetch("https://attacker.example")' },
        datasetVersionId: 'ds-xor-noisy-v1',
        name: '',
        scenarioId: 'pg-xor',
      }).success,
    ).toBe(false);
  });

  it('defines admin filters, pagination, and the shared feature-manifest checksum shape', () => {
    expect(
      adminContentListQuerySchema.parse({
        courseId: 'course-deep-learning-basic',
        cursor: 'post:dl-p01-neuron-perceptron',
        entityType: 'post',
        limit: '25',
      }),
    ).toEqual({
      courseId: 'course-deep-learning-basic',
      cursor: 'post:dl-p01-neuron-perceptron',
      entityType: 'post',
      limit: 25,
    });
    expect(
      runtimeFeatureManifestSchema.parse({
        checksum: 'a'.repeat(64),
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
      }),
    ).toMatchObject({ releaseId: 'release-1', schemaVersion: 1 });
  });

  it('uses one stable document-id contract for direct learner-content reads', () => {
    expect(
      getPublishedLearnerContentDocumentId({
        documentKind: 'post-trial',
        entityId: 'dl-p01-neuron-perceptron',
      }),
    ).toBe('post:dl-p01-neuron-perceptron:trial');
    expect(
      getPublishedLearnerContentDocumentId({
        documentKind: 'demo-full',
        entityId: 'demo-perceptron-and-gate',
      }),
    ).toBe('demo:demo-perceptron-and-gate:full');
  });
});
