import type { AdminContentSourceReview, AdminContentSummary } from './admin-content-repository.js';
import type { DraftProvenance } from './content-source-trace.js';
import type { FirestoreAdminContentSeed } from './firestore-admin-content-repository.js';
import type {
  LearnerCourseContent,
  LearnerDemoContent,
  LearnerModuleContent,
  LearnerPostContent,
  LearnerQuizContent,
  PublishedLearnerContent,
} from './learning-content-repository.js';
import { getFixedDemo, type FixedDemoManifest } from './release-demo-content.js';
import {
  getReleaseLearningCatalog,
  type ReleaseLearningCourse,
  type ReleaseLearningModule,
  type ReleaseLearningPost,
} from './release-learning-catalog.js';
import { getReadablePost, getTrialPost, type TrialPost } from './release-learning-content.js';
import { getQuizManifest } from './quiz-manifest.js';

function copyForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(copyForFirestore) as T;
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, nestedValue]) =>
        nestedValue === undefined ? [] : [[key, copyForFirestore(nestedValue)]],
      ),
    ) as T;
  }

  return value;
}

function createPendingSourceReview(input: {
  provenance: DraftProvenance | undefined;
  title: string;
}): AdminContentSourceReview {
  const sourceSnapshot =
    input.provenance?.sourceTrace?.kind === 'snapshot-pinned'
      ? input.provenance.sourceTrace.sourceSnapshots[0]
      : undefined;

  if (sourceSnapshot) {
    return {
      attribution: { ...sourceSnapshot.attribution },
      license: { ...sourceSnapshot.license },
      sourceId: sourceSnapshot.sourceId,
      title: sourceSnapshot.sourceName,
    };
  }

  const sourceId = input.provenance?.candidateSourceIds[0] ?? 'seeded-source-trace';

  return {
    attribution: {
      en: `Seeded source trace for ${input.title}; external source review remains pending.`,
      vi: `Dấu vết nguồn đã seed cho ${input.title}; review nguồn bên ngoài vẫn đang chờ.`,
    },
    license: {
      name: 'Pending external source review',
      url: 'https://example.invalid/pending-source-review',
    },
    sourceId,
    title: input.title,
  };
}

function createSummary(input: {
  courseId: string;
  entityId: string;
  entityType: AdminContentSummary['entityType'];
  moduleId?: string;
  postId?: string;
  preview: { en: string; vi: string };
  publishedRevisionId: string;
  sourceReview: AdminContentSourceReview;
  title: { en: string; vi: string };
  trialPostId?: string | undefined;
  validationManifest?: AdminContentSummary['validationManifest'];
}): AdminContentSummary {
  return {
    courseId: input.courseId,
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: input.entityId,
    entityType: input.entityType,
    localeAvailability: ['en', 'vi'],
    ...(input.moduleId ? { moduleId: input.moduleId } : {}),
    ...(input.postId ? { postId: input.postId } : {}),
    publicationScope: 'emulator-demo',
    preview: { ...input.preview },
    publishedRevisionId: input.publishedRevisionId,
    sourceReview: input.sourceReview,
    sourceStatus: 'seeded',
    status: 'published',
    title: { ...input.title },
    ...(input.trialPostId ? { trialPostId: input.trialPostId } : {}),
    ...(input.validationManifest ? { validationManifest: input.validationManifest } : {}),
    validationStatus: 'not-run',
  };
}

function createPostRevisionId(postId: string): string {
  return `post-${postId}-rev-r1`;
}

function createModuleRevisionId(moduleId: string): string {
  return `module-${moduleId}-rev-r1`;
}

function createQuizRevisionId(quizId: string): string {
  return `quiz-${quizId}-rev-r1`;
}

function toLearnerPostContent(post: TrialPost, revisionId: string): LearnerPostContent {
  return copyForFirestore({
    accessLevel: post.accessLevel,
    blocks: post.blocks,
    courseId: post.courseId,
    description: post.description,
    durationMinutes: post.durationMinutes,
    id: post.id,
    moduleId: post.moduleId,
    postQuizId: post.postQuizId,
    revisionId,
    title: post.title,
  });
}

function toLearnerDemoContent(demo: FixedDemoManifest): LearnerDemoContent {
  return copyForFirestore({
    adapterVersion: demo.adapterVersion,
    algorithmId: demo.algorithmId,
    courseId: demo.courseId,
    demoId: demo.demoId,
    ...(demo.fixedRun ? { fixedRun: demo.fixedRun } : {}),
    moduleId: demo.moduleId,
    problemId: demo.problemId,
    requiredStepIds: demo.requiredStepIds,
    resultHash: demo.resultHash,
    revisionId: demo.revisionId,
    seed: demo.seed,
    sourceIds: demo.sourceIds,
    steps: demo.steps,
    title: demo.title,
    visualFixture: demo.visualFixture,
    visualization: demo.visualization,
  });
}

function toLearnerCourseContent(content: AdminContentSummary): LearnerCourseContent {
  if (content.entityType !== 'course') {
    throw new Error(`Expected course content, received ${content.entityType}.`);
  }

  return copyForFirestore({
    courseId: content.courseId,
    description: content.preview,
    revisionId: content.publishedRevisionId,
    title: content.title,
  });
}

function toLearnerModuleContent(content: AdminContentSummary): LearnerModuleContent {
  if (content.entityType !== 'module' || !content.moduleId) {
    throw new Error(`Expected module content, received ${content.entityType}.`);
  }

  return copyForFirestore({
    courseId: content.courseId,
    description: content.preview,
    moduleId: content.moduleId,
    revisionId: content.publishedRevisionId,
    title: content.title,
  });
}

function toLearnerQuizContent(content: AdminContentSummary): LearnerQuizContent {
  if (content.entityType !== 'quiz' || !content.moduleId) {
    throw new Error(`Expected quiz content, received ${content.entityType}.`);
  }

  return copyForFirestore({
    courseId: content.courseId,
    description: content.preview,
    moduleId: content.moduleId,
    ...(content.postId ? { postId: content.postId } : {}),
    quizId: content.entityId,
    revisionId: content.publishedRevisionId,
    title: content.title,
  });
}

function getFullPost(courseId: string, postId: string): TrialPost {
  const post = getReadablePost(courseId, postId, true);

  if (!post) {
    throw new Error(`Missing lesson ${postId}.`);
  }

  return post;
}

function getModuleSourceReview(course: ReleaseLearningCourse, module: ReleaseLearningModule) {
  const firstPost = module.posts[0];

  if (!firstPost) {
    throw new Error(`Module ${module.moduleId} has no post for source review.`);
  }

  const post = getFullPost(course.courseId, firstPost.postId);

  return createPendingSourceReview({ provenance: post.provenance, title: post.title.en });
}

function createPostSeed(input: {
  course: ReleaseLearningCourse;
  module: ReleaseLearningModule;
  post: ReleaseLearningPost;
}): FirestoreAdminContentSeed {
  const fullPost = getFullPost(input.course.courseId, input.post.postId);
  const trialPost = getTrialPost(input.course.courseId, input.post.postId) ?? null;
  const revisionId = createPostRevisionId(input.post.postId);
  const sourceReview = createPendingSourceReview({
    provenance: fullPost.provenance,
    title: fullPost.title.en,
  });
  const learnerContent: PublishedLearnerContent = {
    contentType: 'post',
    fullPost: toLearnerPostContent(fullPost, revisionId),
    trialPost: trialPost ? toLearnerPostContent(trialPost, revisionId) : null,
  };

  return {
    content: createSummary({
      courseId: input.course.courseId,
      entityId: input.post.postId,
      entityType: 'post',
      moduleId: input.module.moduleId,
      preview: fullPost.description,
      publishedRevisionId: revisionId,
      sourceReview,
      title: fullPost.title,
      validationManifest: {
        blockCount: fullPost.blocks.length,
        taskFingerprints: [fullPost.taskFingerprint],
      },
    }),
    learnerContent,
  };
}

function createDemoSeed(input: {
  course: ReleaseLearningCourse;
  module: ReleaseLearningModule;
}): FirestoreAdminContentSeed | null {
  if (!input.module.demoId) {
    return null;
  }

  const demo = getFixedDemo(input.module.demoId);

  if (!demo) {
    throw new Error(`Missing fixed practice demo ${input.module.demoId}.`);
  }

  const sourceReview = createPendingSourceReview({
    provenance: demo.draftProvenance,
    title: demo.title.en,
  });
  const firstPostId = input.module.posts[0]?.postId;

  return {
    content: createSummary({
      courseId: input.course.courseId,
      entityId: demo.demoId,
      entityType: 'demo',
      moduleId: input.module.moduleId,
      ...(firstPostId ? { postId: firstPostId } : {}),
      preview: demo.learningObjective ?? demo.title,
      publishedRevisionId: demo.revisionId,
      sourceReview,
      title: demo.title,
      validationManifest: {
        problemId: demo.problemId,
        taskFingerprints: [demo.taskFingerprint],
      },
    }),
    learnerContent: {
      contentType: 'demo',
      demo: toLearnerDemoContent(demo),
    },
  };
}

function createModuleQuizSeed(input: {
  course: ReleaseLearningCourse;
  module: ReleaseLearningModule;
  sourceReview: AdminContentSourceReview;
}): FirestoreAdminContentSeed {
  const quiz = getQuizManifest(input.module.moduleQuizId);
  const questionCount = quiz.questions.length;

  if (questionCount !== input.module.moduleQuizQuestionCount) {
    throw new Error(`Module quiz ${quiz.quizId} does not match the locked question count.`);
  }

  const content = createSummary({
    courseId: input.course.courseId,
    entityId: input.module.moduleQuizId,
    entityType: 'quiz',
    moduleId: input.module.moduleId,
    preview: {
      en: `${questionCount}-question module assessment.`,
      vi: `Đánh giá module gồm ${questionCount} câu hỏi.`,
    },
    publishedRevisionId: createQuizRevisionId(input.module.moduleQuizId),
    sourceReview: input.sourceReview,
    title: {
      en: `${input.module.title.en} module quiz`,
      vi: `Quiz module ${input.module.title.vi}`,
    },
    validationManifest: {
      questionCount,
      taskFingerprints: quiz.questions.map((question) => question.taskFingerprint),
    },
  });

  return {
    content,
    learnerContent: {
      contentType: 'quiz',
      quiz: toLearnerQuizContent(content),
    },
  };
}

function createPostQuizSeed(input: {
  course: ReleaseLearningCourse;
  module: ReleaseLearningModule;
  post: ReleaseLearningPost;
  sourceReview: AdminContentSourceReview;
}): FirestoreAdminContentSeed {
  const quiz = getQuizManifest(input.post.postQuizId);
  const questionCount = quiz.questions.length;

  if (questionCount !== 3) {
    throw new Error(`Post quiz ${quiz.quizId} must contain exactly three questions.`);
  }

  const content = createSummary({
    courseId: input.course.courseId,
    entityId: input.post.postQuizId,
    entityType: 'quiz',
    moduleId: input.module.moduleId,
    postId: input.post.postId,
    preview: {
      en: 'Three-question post mastery quiz.',
      vi: 'Quiz nắm vững bài học gồm ba câu hỏi.',
    },
    publishedRevisionId: createQuizRevisionId(input.post.postQuizId),
    sourceReview: input.sourceReview,
    title: {
      en: `${input.post.title.en} quiz`,
      vi: `Quiz ${input.post.title.vi}`,
    },
    validationManifest: {
      questionCount,
      taskFingerprints: quiz.questions.map((question) => question.taskFingerprint),
    },
  });

  return {
    content,
    learnerContent: {
      contentType: 'quiz',
      quiz: toLearnerQuizContent(content),
    },
  };
}

export function createReleaseOneFirestoreAdminContentSeed(): readonly FirestoreAdminContentSeed[] {
  const seed: FirestoreAdminContentSeed[] = [];

  for (const course of getReleaseLearningCatalog().courses) {
    const firstModule = course.modules[0];

    if (!firstModule) {
      throw new Error(`Course ${course.courseId} has no module.`);
    }

    const courseSourceReview = getModuleSourceReview(course, firstModule);
    const courseContent = createSummary({
      courseId: course.courseId,
      entityId: course.courseId,
      entityType: 'course',
      preview: {
        en: `Course with ${course.modules.length} modules in a structured learning path.`,
        vi: `Khóa học gồm ${course.modules.length} module theo lộ trình có cấu trúc.`,
      },
      publishedRevisionId: course.courseRevisionId,
      sourceReview: courseSourceReview,
      title: course.title,
      trialPostId: course.trialPostId,
    });
    seed.push({
      content: courseContent,
      learnerContent: {
        contentType: 'course',
        course: toLearnerCourseContent(courseContent),
      },
    });

    for (const module of course.modules) {
      const sourceReview = getModuleSourceReview(course, module);
      const moduleContent = createSummary({
        courseId: course.courseId,
        entityId: module.moduleId,
        entityType: 'module',
        moduleId: module.moduleId,
        preview: {
          en: `Structured module with ${module.posts.length} lesson(s).`,
          vi: `Module có cấu trúc gồm ${module.posts.length} bài học.`,
        },
        publishedRevisionId: createModuleRevisionId(module.moduleId),
        sourceReview,
        title: module.title,
      });
      seed.push({
        content: moduleContent,
        learnerContent: {
          contentType: 'module',
          module: toLearnerModuleContent(moduleContent),
        },
      });

      seed.push(createModuleQuizSeed({ course, module, sourceReview }));
      const demoSeed = createDemoSeed({ course, module });

      if (demoSeed) {
        seed.push(demoSeed);
      }

      for (const post of module.posts) {
        seed.push(createPostSeed({ course, module, post }));
        seed.push(createPostQuizSeed({ course, module, post, sourceReview }));
      }
    }
  }

  return seed;
}
