import { describe, expect, it } from 'vitest';

import { ApiError } from './api-error.js';
import {
  assertPublishEvidenceIsComplete,
  createAdminContentDraftChecksum,
  createLegacyAdminContentDraftChecksum,
  requiredAdminContentEvidenceKinds,
} from './admin-content-evidence.js';
import { createReleaseOneFirestoreAdminContentSeed } from './admin-content-emulator-seed.js';
import { createDraftFromPublished } from './admin-content-repository.js';
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
  it('versions evidence identity and binds it to a normalized trial post selection', () => {
    const classicalCourse = createReleaseOneFirestoreAdminContentSeed().find(
      (record) => record.content.entityId === 'course-classical-ml',
    );

    if (!classicalCourse) {
      throw new Error('Expected the classical ML course fixture.');
    }

    const selectedDraft = createDraftFromPublished(classicalCourse.content);
    const changedSelectionDraft = {
      ...selectedDraft,
      trialPostId: 'cml-p02-linear-regression',
    };
    const legacySelectedChecksum = createLegacyAdminContentDraftChecksum(selectedDraft);
    const legacyChangedChecksum = createLegacyAdminContentDraftChecksum(changedSelectionDraft);
    const selectedChecksum = createAdminContentDraftChecksum(selectedDraft);
    const changedSelectionChecksum = createAdminContentDraftChecksum(changedSelectionDraft);
    const draftWithoutTrialPost = { ...selectedDraft };
    delete draftWithoutTrialPost.trialPostId;
    const nullTrialPostDraft = { ...selectedDraft, trialPostId: null };

    expect(legacySelectedChecksum).toBe(
      'ba77535a76a41dff9c0207a5988eaa892932ffd251a45f38a84841291d57d338',
    );
    expect(selectedChecksum).toBe(
      '55de7c244530eec8bc1fcfcf035ace14b82f76562599a950fa353166db3caa18',
    );
    expect(legacyChangedChecksum).toBe(legacySelectedChecksum);
    expect(changedSelectionChecksum).not.toBe(selectedChecksum);
    expect(createAdminContentDraftChecksum(draftWithoutTrialPost)).toBe(
      createAdminContentDraftChecksum(nullTrialPostDraft),
    );
    expect(selectedChecksum).not.toBe(legacySelectedChecksum);
  });

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

  it('does not treat a locally attached pending reference as human approval', () => {
    const attemptPublish = () =>
      assertPublishEvidenceIsComplete({
        artifactId: 'dl-p01-neuron-perceptron',
        contentChecksum: 'revision-checksum',
        evidence: requiredAdminContentEvidenceKinds.map((kind) => ({
          artifactId: 'dl-p01-neuron-perceptron',
          checksum: 'revision-checksum',
          evidenceRef: `evidence://${kind}`,
          kind,
          result: 'pending' as const,
        })),
      });

    expect(attemptPublish).toThrow(ApiError);
  });
});
