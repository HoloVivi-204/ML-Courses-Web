import { getFirestore, type Firestore, type Transaction } from 'firebase-admin/firestore';

import type { AdminContentDraft } from './admin-content-repository.js';
import { ApiError } from './api-error.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
import {
  createFirestoreLearningContentAuthority,
  type LearningContentAuthority,
} from './learning-content-authority.js';
import {
  getFixedDemo,
  type FixedDemoManifest,
  type FixedDemoRun,
  type FixedDemoVisualization,
} from './release-demo-content.js';
import { getReadablePost, getTrialPost, type TrialPost } from './release-learning-content.js';
import { getReleaseLearningCatalog, getReleasePost } from './release-learning-catalog.js';

export interface LearnerPostContent {
  accessLevel: 'full' | 'trial';
  blocks: readonly unknown[];
  courseId: string;
  description: { en: string; vi: string };
  durationMinutes: number;
  id: string;
  moduleId: string;
  postQuizId: string;
  revisionId: string;
  title: { en: string; vi: string };
}

export interface LearnerDemoContent {
  algorithmId: string;
  courseId: string;
  demoId: string;
  fixedRun?: FixedDemoRun;
  moduleId: string;
  problemId: string;
  requiredStepIds: readonly string[];
  revisionId: string;
  seed: number;
  steps: readonly {
    id: string;
    narration: { en: string; vi: string };
    required: boolean;
    textAlternative: { en: string; vi: string };
    title: { en: string; vi: string };
  }[];
  title: { en: string; vi: string };
  visualization: FixedDemoVisualization;
}

export type PublishedLearnerContent =
  | {
      contentType: 'demo';
      demo: LearnerDemoContent;
    }
  | {
      contentType: 'post';
      fullPost: LearnerPostContent;
      trialPost: LearnerPostContent | null;
    };

export interface LearningContentAccessReader {
  hasStableContentAccess(input: {
    contentType: 'demo' | 'post';
    entityId: string;
    transaction?: Transaction | undefined;
    uid: string;
  }): Promise<boolean>;
}

export interface PublishedLearningContentReader {
  getDemoContent(input: {
    demoId: string;
    transaction?: Transaction | undefined;
  }): Promise<LearnerDemoContent | null>;
  getPostContent(input: {
    postId: string;
    transaction?: Transaction | undefined;
  }): Promise<LearnerPostContent | null>;
  getTrialPostContent(input: {
    postId: string;
    transaction?: Transaction | undefined;
  }): Promise<LearnerPostContent | null>;
}

export interface LearningContentRepository {
  getFullPostContent(input: { postId: string; uid: string }): Promise<{
    data: LearnerPostContent;
    statusCode: 200;
  }>;
  getTrialPostContent(input: { postId: string }): Promise<{
    data: LearnerPostContent;
    statusCode: 200;
  }>;
  getDemoContent(input: { demoId: string; uid: string }): Promise<{
    data: LearnerDemoContent;
    statusCode: 200;
  }>;
}

function toLearnerPostContent(post: TrialPost): LearnerPostContent {
  return {
    accessLevel: post.accessLevel,
    blocks: post.blocks,
    courseId: post.courseId,
    description: post.description,
    durationMinutes: post.durationMinutes,
    id: post.id,
    moduleId: post.moduleId,
    postQuizId: post.postQuizId,
    revisionId: `post-${post.id}-rev-r1`,
    title: post.title,
  };
}

function toLearnerDemoContent(demo: FixedDemoManifest): LearnerDemoContent {
  return {
    algorithmId: demo.algorithmId,
    courseId: demo.courseId,
    demoId: demo.demoId,
    ...(demo.fixedRun ? { fixedRun: demo.fixedRun } : {}),
    moduleId: demo.moduleId,
    problemId: demo.problemId,
    requiredStepIds: demo.requiredStepIds,
    revisionId: demo.revisionId,
    seed: demo.seed,
    steps: demo.steps,
    title: demo.title,
    visualization: demo.visualization,
  };
}

function assertPostExists(postId: string) {
  const releasePost = getReleasePost(postId);

  if (!releasePost) {
    throw new ApiError(404, 'POST_NOT_FOUND', 'The requested post was not found.');
  }

  return releasePost;
}

export function isStableContentAccessDocument(data: unknown): boolean {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }

  const document = data as Record<string, unknown>;
  const hasRevisionPin = Object.keys(document).some(
    (fieldName) => fieldName === 'revisionId' || fieldName.endsWith('RevisionId'),
  );

  return (
    !hasRevisionPin &&
    document.schemaVersion === 1 &&
    (document.contentType === 'demo' || document.contentType === 'post') &&
    typeof document.entityId === 'string' &&
    document.entityId.trim().length > 0
  );
}

function createFirestoreContentAccessReader(firestore: Firestore): LearningContentAccessReader {
  return {
    async hasStableContentAccess({ contentType, entityId, transaction, uid }) {
      const reference = firestore.doc(`users/${uid}/contentAccess/${contentType}_${entityId}`);
      const snapshot = transaction ? await transaction.get(reference) : await reference.get();
      const data = snapshot.data();

      return (
        snapshot.exists &&
        isStableContentAccessDocument(data) &&
        data?.contentType === contentType &&
        data?.entityId === entityId
      );
    },
  };
}

const ADMIN_CONTENT_REVISIONS_COLLECTION = 'adminContentRevisions';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertPostContent(value: unknown, postId: string, revisionId: string): LearnerPostContent {
  if (
    !isRecord(value) ||
    value.id !== postId ||
    value.revisionId !== revisionId ||
    !Array.isArray(value.blocks) ||
    !isRecord(value.title) ||
    !isRecord(value.description) ||
    typeof value.courseId !== 'string' ||
    typeof value.durationMinutes !== 'number' ||
    typeof value.moduleId !== 'string' ||
    typeof value.postQuizId !== 'string' ||
    (value.accessLevel !== 'full' && value.accessLevel !== 'trial')
  ) {
    throw new ApiError(
      500,
      'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
      'Published learner content data is invalid.',
    );
  }

  return value as unknown as LearnerPostContent;
}

function assertDemoContent(value: unknown, demoId: string, revisionId: string): LearnerDemoContent {
  if (
    !isRecord(value) ||
    value.demoId !== demoId ||
    value.revisionId !== revisionId ||
    !Array.isArray(value.requiredStepIds) ||
    !Array.isArray(value.steps) ||
    !isRecord(value.title) ||
    typeof value.algorithmId !== 'string' ||
    typeof value.courseId !== 'string' ||
    typeof value.moduleId !== 'string' ||
    typeof value.problemId !== 'string' ||
    typeof value.seed !== 'number' ||
    !isRecord(value.visualization)
  ) {
    throw new ApiError(
      500,
      'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
      'Published learner content data is invalid.',
    );
  }

  return value as unknown as LearnerDemoContent;
}

async function assertCurrentContentAncestors(input: {
  authority: LearningContentAuthority;
  courseId: string;
  moduleId: string;
  transaction: Transaction;
}): Promise<void> {
  await Promise.all([
    input.authority.assertCurrentPublishedEntity({
      entityId: input.courseId,
      entityType: 'course',
      transaction: input.transaction,
    }),
    input.authority.assertCurrentPublishedEntity({
      entityId: input.moduleId,
      entityType: 'module',
      transaction: input.transaction,
    }),
  ]);
}

function createFirestorePublishedLearningContentReader(
  firestore: Firestore,
  authority: LearningContentAuthority,
): PublishedLearningContentReader {
  async function getPublishedLearnerContent(input: {
    entityId: string;
    entityType: 'demo' | 'post';
    transaction?: Transaction | undefined;
  }): Promise<{
    currentEntity: { publishedRevisionId: string };
    learnerContent: PublishedLearnerContent;
  } | null> {
    const currentEntity = await authority.getCurrentPublishedEntity({
      entityId: input.entityId,
      entityType: input.entityType,
      transaction: input.transaction,
    });

    if (currentEntity === null) {
      return null;
    }

    const revisionReference = firestore
      .collection(ADMIN_CONTENT_REVISIONS_COLLECTION)
      .doc(currentEntity.publishedRevisionId);
    const revisionSnapshot = input.transaction
      ? await input.transaction.get(revisionReference)
      : await revisionReference.get();
    const revision = revisionSnapshot.data();

    if (!revisionSnapshot.exists || !isRecord(revision) || revision.state !== 'published') {
      throw new ApiError(
        500,
        'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
        'Published learner content data is invalid.',
      );
    }

    const learnerContent = revision.learnerContent;

    if (!isRecord(learnerContent) || learnerContent.contentType !== input.entityType) {
      return null;
    }

    return {
      currentEntity,
      learnerContent: learnerContent as unknown as PublishedLearnerContent,
    };
  }

  return {
    async getDemoContent({ demoId, transaction }) {
      const publishedContent = await getPublishedLearnerContent({
        entityId: demoId,
        entityType: 'demo',
        transaction,
      });

      if (!publishedContent || publishedContent.learnerContent.contentType !== 'demo') {
        return null;
      }

      return assertDemoContent(
        publishedContent.learnerContent.demo,
        demoId,
        publishedContent.currentEntity.publishedRevisionId,
      );
    },
    async getPostContent({ postId, transaction }) {
      const publishedContent = await getPublishedLearnerContent({
        entityId: postId,
        entityType: 'post',
        transaction,
      });

      if (!publishedContent || publishedContent.learnerContent.contentType !== 'post') {
        return null;
      }

      return assertPostContent(
        publishedContent.learnerContent.fullPost,
        postId,
        publishedContent.currentEntity.publishedRevisionId,
      );
    },
    async getTrialPostContent({ postId, transaction }) {
      const publishedContent = await getPublishedLearnerContent({
        entityId: postId,
        entityType: 'post',
        transaction,
      });

      if (
        !publishedContent ||
        publishedContent.learnerContent.contentType !== 'post' ||
        !publishedContent.learnerContent.trialPost
      ) {
        return null;
      }

      const courseEntity = await authority.getCurrentPublishedEntity({
        entityId: publishedContent.learnerContent.trialPost.courseId,
        entityType: 'course',
        transaction,
      });

      if (courseEntity === null) {
        return null;
      }

      return assertPostContent(
        publishedContent.learnerContent.trialPost,
        postId,
        publishedContent.currentEntity.publishedRevisionId,
      );
    },
  };
}

export function applyAdminDraftToPublishedLearnerContent(input: {
  draft: AdminContentDraft;
  learnerContent: PublishedLearnerContent | null;
}): PublishedLearnerContent | null {
  if (input.learnerContent === null) {
    return null;
  }

  if (input.learnerContent.contentType === 'post') {
    if (input.draft.entityType !== 'post') {
      throw new ApiError(
        500,
        'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
        'Published learner content data is invalid.',
      );
    }

    const updatePost = (post: LearnerPostContent): LearnerPostContent => ({
      ...post,
      description: { ...input.draft.preview },
      revisionId: input.draft.draftRevisionId,
      title: { ...input.draft.title },
    });

    return {
      contentType: 'post',
      fullPost: updatePost(input.learnerContent.fullPost),
      trialPost: input.learnerContent.trialPost ? updatePost(input.learnerContent.trialPost) : null,
    };
  }

  if (input.draft.entityType !== 'demo') {
    throw new ApiError(
      500,
      'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
      'Published learner content data is invalid.',
    );
  }

  return {
    contentType: 'demo',
    demo: {
      ...input.learnerContent.demo,
      revisionId: input.draft.draftRevisionId,
      title: { ...input.draft.title },
    },
  };
}

export function createFirestoreLearningContentRepository(
  options: {
    accessReader?: LearningContentAccessReader | undefined;
    authority?: LearningContentAuthority | undefined;
    firestore?: Firestore | undefined;
    publishedContentReader?: PublishedLearningContentReader | undefined;
  } = {},
): LearningContentRepository {
  const firestore = options.firestore ?? getFirestore(getFirebaseAdminApp());
  const accessReader = options.accessReader ?? createFirestoreContentAccessReader(firestore);
  const authority = options.authority ?? createFirestoreLearningContentAuthority(firestore);
  const publishedContentReader =
    options.publishedContentReader ??
    createFirestorePublishedLearningContentReader(firestore, authority);

  return {
    async getTrialPostContent({ postId }) {
      const trialPost = await firestore.runTransaction(async (transaction) => {
        const content = await publishedContentReader.getTrialPostContent({ postId, transaction });

        if (content) {
          await assertCurrentContentAncestors({
            authority,
            courseId: content.courseId,
            moduleId: content.moduleId,
            transaction,
          });
        }

        return content;
      });

      if (!trialPost) {
        throw new ApiError(404, 'TRIAL_POST_NOT_FOUND', 'The requested trial post was not found.');
      }

      return { statusCode: 200, data: trialPost };
    },
    async getFullPostContent({ postId, uid }) {
      return firestore.runTransaction(async (transaction) => {
        const hasAccess = await accessReader.hasStableContentAccess({
          contentType: 'post',
          entityId: postId,
          transaction,
          uid,
        });

        if (!hasAccess) {
          throw new ApiError(403, 'POST_ACCESS_REQUIRED', 'Post access is required.');
        }

        await authority.assertCurrentPublishedEntity({
          entityId: postId,
          entityType: 'post',
          transaction,
        });

        const post = await publishedContentReader.getPostContent({ postId, transaction });

        if (!post) {
          throw new ApiError(
            404,
            'POST_CONTENT_NOT_FOUND',
            'The requested post content was not found.',
          );
        }

        await assertCurrentContentAncestors({
          authority,
          courseId: post.courseId,
          moduleId: post.moduleId,
          transaction,
        });

        return { statusCode: 200 as const, data: post };
      });
    },
    async getDemoContent({ demoId, uid }) {
      return firestore.runTransaction(async (transaction) => {
        const hasAccess = await accessReader.hasStableContentAccess({
          contentType: 'demo',
          entityId: demoId,
          transaction,
          uid,
        });

        if (!hasAccess) {
          throw new ApiError(403, 'DEMO_ACCESS_REQUIRED', 'Demo access is required.');
        }

        await authority.assertCurrentPublishedEntity({
          entityId: demoId,
          entityType: 'demo',
          transaction,
        });

        const demo = await publishedContentReader.getDemoContent({ demoId, transaction });

        if (!demo) {
          throw new ApiError(404, 'DEMO_NOT_FOUND', 'Demo content was not found.');
        }

        await assertCurrentContentAncestors({
          authority,
          courseId: demo.courseId,
          moduleId: demo.moduleId,
          transaction,
        });

        return { statusCode: 200 as const, data: demo };
      });
    },
  };
}

export function createLearningContentRepository(
  options: { accessReader?: LearningContentAccessReader | undefined } = {},
): LearningContentRepository {
  const accessReader =
    options.accessReader ?? createFirestoreContentAccessReader(getFirestore(getFirebaseAdminApp()));

  return {
    async getTrialPostContent({ postId }) {
      assertPostExists(postId);
      const course = findCourseForPost(postId);

      if (course.trialPostId !== postId) {
        throw new ApiError(404, 'TRIAL_POST_NOT_FOUND', 'The requested trial post was not found.');
      }

      const trialPost = getTrialPost(course.courseId, postId);

      if (!trialPost) {
        throw new ApiError(404, 'TRIAL_POST_NOT_FOUND', 'The requested trial post was not found.');
      }

      return {
        statusCode: 200,
        data: toLearnerPostContent(trialPost),
      };
    },
    async getFullPostContent({ postId, uid }) {
      const releasePost = assertPostExists(postId);
      const hasAccess = await accessReader.hasStableContentAccess({
        contentType: 'post',
        entityId: releasePost.postId,
        uid,
      });

      if (!hasAccess) {
        throw new ApiError(403, 'POST_ACCESS_REQUIRED', 'Post access is required.');
      }

      const fullPost = getReadablePost(findCourseIdForPost(postId), releasePost.postId, true);

      if (!fullPost) {
        throw new ApiError(
          404,
          'POST_CONTENT_NOT_FOUND',
          'The requested post content was not found.',
        );
      }

      return {
        statusCode: 200,
        data: toLearnerPostContent(fullPost),
      };
    },
    async getDemoContent({ demoId, uid }) {
      const demo = getFixedDemo(demoId);

      if (!demo) {
        throw new ApiError(404, 'DEMO_NOT_FOUND', 'The requested demo was not found.');
      }

      const hasAccess = await accessReader.hasStableContentAccess({
        contentType: 'demo',
        entityId: demo.demoId,
        uid,
      });

      if (!hasAccess) {
        throw new ApiError(403, 'DEMO_ACCESS_REQUIRED', 'Demo access is required.');
      }

      return {
        statusCode: 200,
        data: toLearnerDemoContent(demo),
      };
    },
  };
}

function findCourseForPost(postId: string) {
  const course = getReleaseLearningCatalog().courses.find((candidate) =>
    candidate.modules.some((module) => module.posts.some((post) => post.postId === postId)),
  );

  if (!course) {
    throw new ApiError(404, 'POST_NOT_FOUND', 'The requested post was not found.');
  }

  return course;
}

function findCourseIdForPost(postId: string): string {
  return findCourseForPost(postId).courseId;
}

export function createDefaultLearningContentRepository(): LearningContentRepository {
  return createFirestoreLearningContentRepository();
}
