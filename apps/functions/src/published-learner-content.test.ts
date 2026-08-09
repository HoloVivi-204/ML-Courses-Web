import { describe, expect, it } from 'vitest';

import type { AdminContentSummary } from './admin-content-repository.js';
import {
  createPublishedLearnerContentDocuments,
  getPublishedLearnerContentDocumentIdsForEntity,
} from './published-learner-content.js';

const postSummary: AdminContentSummary = {
  courseId: 'course-deep-learning-basic',
  draftRevisionId: null,
  emergencyBlocked: false,
  entityId: 'dl-p01-neuron-perceptron',
  entityType: 'post',
  localeAvailability: ['en', 'vi'],
  moduleId: 'dl-m01-neuron-perceptron',
  preview: { en: 'Preview', vi: 'Tom tat' },
  publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
  sourceReview: {
    attribution: { en: 'Source', vi: 'Nguon' },
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    sourceId: 'source-google-ml-crash-course',
    title: 'Google Machine Learning Crash Course',
  },
  sourceStatus: 'seeded',
  status: 'published',
  title: { en: 'Neuron', vi: 'Neuron' },
  validationStatus: 'not-run',
};

function createPost(accessLevel: 'full' | 'trial') {
  return {
    accessLevel,
    blocks: [{ id: 'intro', kind: 'markdown', text: 'A neuron starts with a weighted sum.' }],
    courseId: postSummary.courseId,
    description: postSummary.preview,
    durationMinutes: 8,
    id: postSummary.entityId,
    moduleId: 'dl-m01-neuron-perceptron',
    postQuizId: 'quiz-post-dl-p01',
    revisionId: postSummary.publishedRevisionId,
    title: postSummary.title,
  };
}

describe('published learner content documents', () => {
  it('splits public trial content from full content so a trial read cannot include a full post', () => {
    const documents = createPublishedLearnerContentDocuments({
      content: postSummary,
      learnerContent: {
        contentType: 'post',
        fullPost: createPost('full'),
        trialPost: createPost('trial'),
      },
    });

    expect(documents).toEqual([
      expect.objectContaining({
        documentId: 'post:dl-p01-neuron-perceptron:trial',
        data: expect.objectContaining({
          content: expect.objectContaining({ accessLevel: 'trial' }),
          documentKind: 'post-trial',
        }),
      }),
      expect.objectContaining({
        documentId: 'post:dl-p01-neuron-perceptron:full',
        data: expect.objectContaining({
          content: expect.objectContaining({ accessLevel: 'full' }),
          documentKind: 'post-full',
        }),
      }),
    ]);
    expect(JSON.stringify(documents[0])).not.toContain('fullPost');
  });

  it('returns every possible document id for an entity so publication can remove stale trial data', () => {
    expect(
      getPublishedLearnerContentDocumentIdsForEntity({
        entityId: postSummary.entityId,
        entityType: 'post',
      }),
    ).toEqual(['post:dl-p01-neuron-perceptron:trial', 'post:dl-p01-neuron-perceptron:full']);
  });
});
