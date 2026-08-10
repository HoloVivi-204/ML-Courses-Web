import { describe, expect, it } from 'vitest';

import {
  createFirestoreLearningContentAuthority,
  type LearningContentAuthority,
} from './learning-content-authority.js';

function createFirestore(documents: Record<string, Record<string, unknown>>) {
  return {
    collection(collectionId: string) {
      return {
        doc(documentId: string) {
          const document = documents[`${collectionId}/${documentId}`];

          return {
            async get() {
              return {
                data: () => document,
                exists: document !== undefined,
              };
            },
          };
        },
      };
    },
  };
}

function createAuthority(currentContent: Record<string, unknown>): LearningContentAuthority {
  return createFirestoreLearningContentAuthority(
    createFirestore({
      'adminContentEntities/post:dl-p01-neuron-perceptron': {
        currentContent,
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        schemaVersion: 1,
      },
    }) as never,
  );
}

function createCourseAuthority(currentContent: Record<string, unknown>): LearningContentAuthority {
  return createFirestoreLearningContentAuthority(
    createFirestore({
      'adminContentEntities/course:course-deep-learning-basic': {
        currentContent,
        draftRevisionId: null,
        entityId: 'course-deep-learning-basic',
        entityType: 'course',
        schemaVersion: 1,
      },
    }) as never,
  );
}

describe('Firestore learning content authority', () => {
  it('resolves only the current published revision with an explicit active flag', async () => {
    const authority = createAuthority({
      emergencyBlocked: false,
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      status: 'published',
    });

    await expect(
      authority.getCurrentPublishedEntity({
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
      }),
    ).resolves.toEqual({
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
    });
  });

  it('fails closed when emergency withdraw blocks the stable entity', async () => {
    const authority = createAuthority({
      emergencyBlocked: true,
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      status: 'published',
    });

    await expect(
      authority.getCurrentPublishedEntity({
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
      }),
    ).rejects.toMatchObject({
      code: 'CONTENT_EMERGENCY_BLOCKED',
      statusCode: 403,
    });
  });

  it('fails closed when a persisted entity omits emergency state', async () => {
    const authority = createAuthority({
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      status: 'published',
    });

    await expect(
      authority.getCurrentPublishedEntity({
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
      }),
    ).rejects.toMatchObject({
      code: 'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
      statusCode: 500,
    });
  });

  it('keeps the current course pointer available only to an explicit planned-unpublish read', async () => {
    const authority = createCourseAuthority({
      emergencyBlocked: false,
      entityId: 'course-deep-learning-basic',
      entityType: 'course',
      publishedRevisionId: 'course-deep-learning-basic-rev-r1',
      status: 'unpublished',
    });

    await expect(
      authority.getCurrentPublishedEntity({
        entityId: 'course-deep-learning-basic',
        entityType: 'course',
      }),
    ).resolves.toBeNull();
    await expect(
      authority.getCurrentPublishedEntity({
        allowUnpublishedCourse: true,
        entityId: 'course-deep-learning-basic',
        entityType: 'course',
      }),
    ).resolves.toEqual({
      entityId: 'course-deep-learning-basic',
      entityType: 'course',
      publishedRevisionId: 'course-deep-learning-basic-rev-r1',
    });
  });
});
