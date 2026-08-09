import { describe, expect, it, vi } from 'vitest';
import type { Firestore, Transaction } from 'firebase-admin/firestore';

import {
  createFirestoreLearningContentRepository,
  type LearnerPostContent,
  type LearningContentAccessReader,
  type PublishedLearningContentReader,
} from './learning-content-repository.js';
import { ApiError } from './api-error.js';
import type { LearningContentAuthority } from './learning-content-authority.js';

function createAccessReader(): LearningContentAccessReader {
  return {
    hasStableContentAccess: vi.fn().mockResolvedValue(true),
  };
}

function createPostContent(input: { revisionId: string; title: string }): LearnerPostContent {
  return {
    accessLevel: 'full',
    blocks: [],
    courseId: 'course-deep-learning-basic',
    description: {
      en: `${input.title} description`,
      vi: `${input.title} mo ta`,
    },
    durationMinutes: 18,
    id: 'dl-p01-neuron-perceptron',
    moduleId: 'dl-m01-neuron-perceptron',
    postQuizId: 'quiz-post-dl-p01',
    revisionId: input.revisionId,
    title: {
      en: input.title,
      vi: input.title,
    },
  };
}

function createPublishedContentReader(
  getCurrentPost: () => LearnerPostContent | null,
): PublishedLearningContentReader {
  return {
    getDemoContent: vi.fn().mockResolvedValue(null),
    getPostContent: vi.fn().mockImplementation(async () => getCurrentPost()),
    getTrialPostContent: vi.fn().mockImplementation(async () => getCurrentPost()),
  };
}

function createActiveAuthority(): LearningContentAuthority {
  return {
    assertCurrentPublishedEntity: vi.fn().mockImplementation(async (input) => ({
      entityId: input.entityId,
      entityType: input.entityType,
      publishedRevisionId: `${input.entityType}-${input.entityId}-rev-r1`,
    })),
    getCurrentPublishedEntity: vi.fn().mockImplementation(async (input) => ({
      entityId: input.entityId,
      entityType: input.entityType,
      publishedRevisionId: `${input.entityType}-${input.entityId}-rev-r1`,
    })),
  };
}

function createReadTransactionFirestore() {
  const transaction = {} as Transaction;
  const runTransaction = vi.fn(
    async <T>(callback: (activeTransaction: Transaction) => Promise<T>) => callback(transaction),
  );

  return {
    firestore: { runTransaction } as unknown as Firestore,
    runTransaction,
    transaction,
  };
}

describe('Firestore learner content repository', () => {
  it('does not read protected blocks after emergency withdraw even with a stable grant', async () => {
    const { firestore } = createReadTransactionFirestore();
    const accessReader = createAccessReader();
    const publishedContentReader = createPublishedContentReader(() =>
      createPostContent({
        revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        title: 'Published revision one',
      }),
    );
    const authority: LearningContentAuthority = {
      assertCurrentPublishedEntity: vi
        .fn()
        .mockRejectedValue(
          new ApiError(403, 'CONTENT_EMERGENCY_BLOCKED', 'Content was withdrawn.'),
        ),
      getCurrentPublishedEntity: vi
        .fn()
        .mockRejectedValue(
          new ApiError(403, 'CONTENT_EMERGENCY_BLOCKED', 'Content was withdrawn.'),
        ),
    };
    const repository = createFirestoreLearningContentRepository({
      accessReader,
      authority,
      firestore,
      publishedContentReader,
    });

    await expect(
      repository.getFullPostContent({
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'CONTENT_EMERGENCY_BLOCKED',
      statusCode: 403,
    });
    expect(publishedContentReader.getPostContent).not.toHaveBeenCalled();
  });

  it('does not return a post behind an emergency-blocked module even with a stable post grant', async () => {
    const { firestore } = createReadTransactionFirestore();
    const authority = createActiveAuthority();
    vi.mocked(authority.assertCurrentPublishedEntity).mockImplementation(async (input) => {
      if (input.entityType === 'module') {
        throw new ApiError(403, 'CONTENT_EMERGENCY_BLOCKED', 'Content was withdrawn.');
      }

      return {
        entityId: input.entityId,
        entityType: input.entityType,
        publishedRevisionId: `${input.entityType}-${input.entityId}-rev-r1`,
      };
    });
    const publishedContentReader = createPublishedContentReader(() =>
      createPostContent({
        revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        title: 'Published revision one',
      }),
    );
    const repository = createFirestoreLearningContentRepository({
      accessReader: createAccessReader(),
      authority,
      firestore,
      publishedContentReader,
    });

    await expect(
      repository.getFullPostContent({
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'CONTENT_EMERGENCY_BLOCKED',
      statusCode: 403,
    });
  });

  it('keeps stable access while resolving the current pointer after publish and rollback', async () => {
    const { firestore, transaction } = createReadTransactionFirestore();
    const accessReader = createAccessReader();
    let currentPost = createPostContent({
      revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      title: 'Published revision one',
    });
    const publishedContentReader = createPublishedContentReader(() => currentPost);
    const repository = createFirestoreLearningContentRepository({
      accessReader,
      authority: createActiveAuthority(),
      firestore,
      publishedContentReader,
    });

    await expect(
      repository.getFullPostContent({
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).resolves.toMatchObject({
      data: {
        revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        title: { en: 'Published revision one' },
      },
    });

    currentPost = createPostContent({
      revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      title: 'Locally published revision two',
    });

    await expect(
      repository.getFullPostContent({
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).resolves.toMatchObject({
      data: {
        revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        title: { en: 'Locally published revision two' },
      },
    });

    currentPost = createPostContent({
      revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      title: 'Published revision one',
    });

    await expect(
      repository.getFullPostContent({
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).resolves.toMatchObject({
      data: {
        revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        title: { en: 'Published revision one' },
      },
    });

    expect(accessReader.hasStableContentAccess).toHaveBeenCalledTimes(3);
    expect(accessReader.hasStableContentAccess).toHaveBeenNthCalledWith(1, {
      contentType: 'post',
      entityId: 'dl-p01-neuron-perceptron',
      transaction,
      uid: 'learner-01',
    });
  });

  it('fails closed when Firestore has no current content instead of falling back to static content', async () => {
    const { firestore } = createReadTransactionFirestore();
    const repository = createFirestoreLearningContentRepository({
      accessReader: createAccessReader(),
      authority: createActiveAuthority(),
      firestore,
      publishedContentReader: createPublishedContentReader(() => null),
    });

    await expect(
      repository.getFullPostContent({
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'POST_CONTENT_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('reads grants, current pointers, and payloads in one Firestore transaction', async () => {
    const { firestore, runTransaction, transaction } = createReadTransactionFirestore();
    const accessReader = createAccessReader();
    const authority = createActiveAuthority();
    const publishedContentReader = createPublishedContentReader(() =>
      createPostContent({
        revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        title: 'Published revision one',
      }),
    );
    const repository = createFirestoreLearningContentRepository({
      accessReader,
      authority,
      firestore,
      publishedContentReader,
    });

    await expect(
      repository.getFullPostContent({
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).resolves.toMatchObject({ statusCode: 200 });

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(accessReader.hasStableContentAccess).toHaveBeenCalledWith({
      contentType: 'post',
      entityId: 'dl-p01-neuron-perceptron',
      transaction,
      uid: 'learner-01',
    });
    expect(authority.assertCurrentPublishedEntity).toHaveBeenCalledWith({
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      transaction,
    });
    expect(publishedContentReader.getPostContent).toHaveBeenCalledWith({
      postId: 'dl-p01-neuron-perceptron',
      transaction,
    });
  });
});
