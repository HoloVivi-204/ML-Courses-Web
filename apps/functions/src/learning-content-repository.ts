import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import type { AdminContentDraft } from './admin-content-repository.js';
import { ApiError } from './api-error.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
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
    uid: string;
  }): Promise<boolean>;
}

export interface PublishedLearningContentReader {
  getDemoContent(input: { demoId: string }): Promise<LearnerDemoContent | null>;
  getPostContent(input: { postId: string }): Promise<LearnerPostContent | null>;
  getTrialPostContent(input: { postId: string }): Promise<LearnerPostContent | null>;
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
    async hasStableContentAccess({ contentType, entityId, uid }) {
      const snapshot = await firestore
        .doc(`users/${uid}/contentAccess/${contentType}_${entityId}`)
        .get();
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

const ADMIN_CONTENT_ENTITIES_COLLECTION = 'adminContentEntities';
const ADMIN_CONTENT_REVISIONS_COLLECTION = 'adminContentRevisions';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getAdminContentEntityDocumentId(
  entityType: 'course' | 'demo' | 'post',
  entityId: string,
): string {
  return `${entityType}:${entityId}`;
}

function getPublishedRevisionId(input: {
  entityData: unknown;
  entityId: string;
  entityType: 'course' | 'demo' | 'post';
}): string | null {
  if (!isRecord(input.entityData) || !isRecord(input.entityData.currentContent)) {
    throw new ApiError(
      500,
      'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
      'Published learner content data is invalid.',
    );
  }

  const currentContent = input.entityData.currentContent;

  if (
    currentContent.entityId !== input.entityId ||
    currentContent.entityType !== input.entityType ||
    typeof currentContent.publishedRevisionId !== 'string'
  ) {
    throw new ApiError(
      500,
      'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
      'Published learner content data is invalid.',
    );
  }

  return currentContent.status === 'published' ? currentContent.publishedRevisionId : null;
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

function createFirestorePublishedLearningContentReader(
  firestore: Firestore,
): PublishedLearningContentReader {
  async function getPublishedLearnerContent(input: {
    entityId: string;
    entityType: 'demo' | 'post';
  }): Promise<PublishedLearnerContent | null> {
    const entitySnapshot = await firestore
      .collection(ADMIN_CONTENT_ENTITIES_COLLECTION)
      .doc(getAdminContentEntityDocumentId(input.entityType, input.entityId))
      .get();

    if (!entitySnapshot.exists) {
      return null;
    }

    const revisionId = getPublishedRevisionId({
      entityData: entitySnapshot.data(),
      entityId: input.entityId,
      entityType: input.entityType,
    });

    if (revisionId === null) {
      return null;
    }

    const revisionSnapshot = await firestore
      .collection(ADMIN_CONTENT_REVISIONS_COLLECTION)
      .doc(revisionId)
      .get();
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

    return learnerContent as unknown as PublishedLearnerContent;
  }

  return {
    async getDemoContent({ demoId }) {
      const learnerContent = await getPublishedLearnerContent({
        entityId: demoId,
        entityType: 'demo',
      });

      if (!learnerContent || learnerContent.contentType !== 'demo') {
        return null;
      }

      return assertDemoContent(learnerContent.demo, demoId, learnerContent.demo.revisionId);
    },
    async getPostContent({ postId }) {
      const learnerContent = await getPublishedLearnerContent({
        entityId: postId,
        entityType: 'post',
      });

      if (!learnerContent || learnerContent.contentType !== 'post') {
        return null;
      }

      return assertPostContent(learnerContent.fullPost, postId, learnerContent.fullPost.revisionId);
    },
    async getTrialPostContent({ postId }) {
      const learnerContent = await getPublishedLearnerContent({
        entityId: postId,
        entityType: 'post',
      });

      if (!learnerContent || learnerContent.contentType !== 'post' || !learnerContent.trialPost) {
        return null;
      }

      const courseSnapshot = await firestore
        .collection(ADMIN_CONTENT_ENTITIES_COLLECTION)
        .doc(getAdminContentEntityDocumentId('course', learnerContent.trialPost.courseId))
        .get();

      if (!courseSnapshot.exists) {
        return null;
      }

      const courseRevisionId = getPublishedRevisionId({
        entityData: courseSnapshot.data(),
        entityId: learnerContent.trialPost.courseId,
        entityType: 'course',
      });

      if (courseRevisionId === null) {
        return null;
      }

      return assertPostContent(
        learnerContent.trialPost,
        postId,
        learnerContent.trialPost.revisionId,
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
    firestore?: Firestore | undefined;
    publishedContentReader?: PublishedLearningContentReader | undefined;
  } = {},
): LearningContentRepository {
  const firestore = options.firestore ?? getFirestore(getFirebaseAdminApp());
  const accessReader = options.accessReader ?? createFirestoreContentAccessReader(firestore);
  const publishedContentReader =
    options.publishedContentReader ?? createFirestorePublishedLearningContentReader(firestore);

  return {
    async getTrialPostContent({ postId }) {
      const trialPost = await publishedContentReader.getTrialPostContent({ postId });

      if (!trialPost) {
        throw new ApiError(404, 'TRIAL_POST_NOT_FOUND', 'The requested trial post was not found.');
      }

      return { statusCode: 200, data: trialPost };
    },
    async getFullPostContent({ postId, uid }) {
      const hasAccess = await accessReader.hasStableContentAccess({
        contentType: 'post',
        entityId: postId,
        uid,
      });

      if (!hasAccess) {
        throw new ApiError(403, 'POST_ACCESS_REQUIRED', 'Post access is required.');
      }

      const post = await publishedContentReader.getPostContent({ postId });

      if (!post) {
        throw new ApiError(
          404,
          'POST_CONTENT_NOT_FOUND',
          'The requested post content was not found.',
        );
      }

      return { statusCode: 200, data: post };
    },
    async getDemoContent({ demoId, uid }) {
      const hasAccess = await accessReader.hasStableContentAccess({
        contentType: 'demo',
        entityId: demoId,
        uid,
      });

      if (!hasAccess) {
        throw new ApiError(403, 'DEMO_ACCESS_REQUIRED', 'Demo access is required.');
      }

      const demo = await publishedContentReader.getDemoContent({ demoId });

      if (!demo) {
        throw new ApiError(404, 'DEMO_NOT_FOUND', 'The requested demo was not found.');
      }

      return { statusCode: 200, data: demo };
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
