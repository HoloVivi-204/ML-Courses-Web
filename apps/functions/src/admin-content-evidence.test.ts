import { describe, expect, it } from 'vitest';

import { ApiError } from './api-error.js';
import {
  assertPublishEvidenceIsComplete,
  createAdminContentDraftChecksum,
} from './admin-content-evidence.js';
import type { AdminContentDraft } from './admin-content-repository.js';

const draftFixture: AdminContentDraft = {
  baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
  courseId: 'course-deep-learning-basic',
  draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
  entityId: 'dl-p01-neuron-perceptron',
  entityType: 'post',
  localeAvailability: ['en', 'vi'],
  metadata: {
    attribution: { en: 'Source attribution', vi: 'Nguon tham khao' },
    externalLinkUrl: 'https://example.test/source',
  },
  moduleId: 'dl-m01-neuron-perceptron',
  preview: { en: 'Preview', vi: 'Tom tat' },
  revisionVersion: 1,
  sourceReview: {
    attribution: { en: 'Source attribution', vi: 'Nguon tham khao' },
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    sourceId: 'source-google-ml-crash-course',
    title: 'Google Machine Learning Crash Course',
  },
  sourceStatus: 'seeded',
  status: 'draft',
  title: { en: 'Neuron', vi: 'Neuron' },
  validationStatus: 'not-run',
};

describe('Admin content publish evidence', () => {
  it('rejects candidate metadata when required external evidence is missing', () => {
    const attemptPublish = () =>
      assertPublishEvidenceIsComplete({
        artifactId: 'dl-p01-neuron-perceptron',
        contentChecksum: 'revision-checksum',
        evidence: [],
      });

    expect(attemptPublish).toThrow(ApiError);
    expect(attemptPublish).toThrow('External evidence is required before publish.');
  });

  it('binds external evidence to the exact draft content', () => {
    const originalChecksum = createAdminContentDraftChecksum(draftFixture);
    const changedChecksum = createAdminContentDraftChecksum({
      ...draftFixture,
      title: { en: 'Changed neuron', vi: 'Neuron da sua' },
    });

    expect(changedChecksum).not.toBe(originalChecksum);
  });
});
