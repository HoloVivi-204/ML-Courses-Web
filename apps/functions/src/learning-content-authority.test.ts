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
});
