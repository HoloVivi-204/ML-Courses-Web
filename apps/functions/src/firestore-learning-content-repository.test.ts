import { describe, expect, it, vi } from 'vitest';

import {
  createFirestoreLearningContentRepository,
  type LearnerPostContent,
  type LearningContentAccessReader,
  type PublishedLearningContentReader,
} from './learning-content-repository.js';

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

describe('Firestore learner content repository', () => {
  it('keeps stable access while resolving the current pointer after publish and rollback', async () => {
    const accessReader = createAccessReader();
    let currentPost = createPostContent({
      revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      title: 'Published revision one',
    });
    const publishedContentReader = createPublishedContentReader(() => currentPost);
    const repository = createFirestoreLearningContentRepository({
      accessReader,
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
      uid: 'learner-01',
    });
  });

  it('fails closed when Firestore has no current content instead of falling back to static content', async () => {
    const repository = createFirestoreLearningContentRepository({
      accessReader: createAccessReader(),
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
});
