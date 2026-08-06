import { getFirestore, type Firestore } from 'firebase-admin/firestore';

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

export interface LearningContentAccessReader {
  hasStableContentAccess(input: {
    contentType: 'demo' | 'post';
    entityId: string;
    uid: string;
  }): Promise<boolean>;
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
  return createLearningContentRepository();
}
