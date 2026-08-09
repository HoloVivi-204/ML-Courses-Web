import { ApiError } from './api-error.js';

export const adminContentEntityTypes = ['course', 'module', 'post', 'demo', 'quiz'] as const;

export type AdminContentEntityType = (typeof adminContentEntityTypes)[number];

export const adminContentPublicationScopes = ['emulator-demo', 'publish-quality'] as const;

export type AdminContentPublicationScope = (typeof adminContentPublicationScopes)[number];

export interface LocalizedText {
  en: string;
  vi: string;
}

export interface AdminContentMetadata {
  attribution: LocalizedText;
  externalLinkUrl: string | null;
}

export interface AdminContentSourceReview {
  attribution: LocalizedText;
  license: {
    id?: string | undefined;
    name: string;
    url: string;
  };
  sourceId: string;
  title: string;
}

export interface AdminContentValidationManifest {
  blockCount?: number | undefined;
  problemId?: string | undefined;
  questionCount?: number | undefined;
  taskFingerprints?: readonly string[] | undefined;
}

export type AdminContentValidationStatus = 'not-run' | 'valid';

export interface AdminContentValidationCheck {
  checkId: string;
  message: string;
  status: 'failed' | 'passed';
}

export interface AdminContentValidationResult {
  checks: readonly AdminContentValidationCheck[];
  revisionId: string;
  status: 'valid';
}

export interface AdminContentLifecycleEvent {
  actorUid: string;
  createdAt: string;
  entityId: string;
  entityType: AdminContentEntityType;
  fromRevisionId: string | null;
  reason: string;
  requestId: string;
  toRevisionId: string | null;
  type: 'emergency-withdrawn' | 'published' | 'rolled-back' | 'unpublished';
  publicationScope?: AdminContentPublicationScope | undefined;
}

export interface AdminContentSummary {
  courseId: string;
  draftRevisionId: string | null;
  emergencyBlocked: boolean;
  entityId: string;
  entityType: AdminContentEntityType;
  localeAvailability: readonly ['en', 'vi'];
  moduleId?: string | undefined;
  postId?: string | undefined;
  publicationScope?: AdminContentPublicationScope | undefined;
  previousPublishedRevisionId?: string | null | undefined;
  preview: LocalizedText;
  publishedRevisionId: string;
  sourceReview: AdminContentSourceReview;
  sourceStatus: 'seeded';
  status: 'published' | 'unpublished';
  title: LocalizedText;
  validationManifest?: AdminContentValidationManifest | undefined;
  validationStatus: AdminContentValidationStatus;
}

export interface AdminContentDraft {
  baseRevisionId: string;
  courseId: string;
  draftRevisionId: string;
  entityId: string;
  entityType: AdminContentEntityType;
  localeAvailability: readonly ['en', 'vi'];
  moduleId?: string | undefined;
  postId?: string | undefined;
  metadata: AdminContentMetadata;
  preview: LocalizedText;
  revisionVersion: number;
  sourceReview: AdminContentSourceReview;
  sourceStatus: 'seeded';
  status: 'draft';
  title: LocalizedText;
  validationManifest?: AdminContentValidationManifest | undefined;
  validationStatus: AdminContentValidationStatus;
}

export interface CreateAdminContentDraftInput {
  createdByUid: string;
  entityId: string;
  entityType: string;
}

export interface AdminContentDraftPatch {
  metadata?: AdminContentMetadata | undefined;
  preview?: LocalizedText | undefined;
  title?: LocalizedText | undefined;
}

export interface UpdateAdminContentDraftInput {
  actorUid: string;
  patch: AdminContentDraftPatch;
  revisionId: string;
  revisionVersion: number;
}

export interface ValidateAdminContentDraftInput {
  actorUid: string;
  revisionId: string;
}

export interface PublishAdminContentRevisionInput {
  actorUid: string;
  idempotencyKey: string;
  reason: string;
  revisionId: string;
  requestId: string;
  publicationScope?: AdminContentPublicationScope | undefined;
}

export interface UnpublishAdminContentEntityInput {
  actorUid: string;
  entityId: string;
  reason: string;
  requestId: string;
}

export interface EmergencyWithdrawAdminContentEntityInput {
  actorUid: string;
  entityId: string;
  entityType: string;
  reason: string;
  requestId: string;
}

export interface RollbackAdminContentRevisionInput {
  actorUid: string;
  reason: string;
  revisionId: string;
  requestId: string;
}

export interface ListAdminContentInput {
  courseId?: string | undefined;
  cursor?: string | undefined;
  entityType?: string | undefined;
  limit?: number | undefined;
  moduleId?: string | undefined;
}

export interface PublishAdminContentRevisionResult {
  data: {
    content: AdminContentSummary;
    lifecycleEvent: AdminContentLifecycleEvent;
  };
  statusCode: 200;
}

export interface AdminContentLifecycleResult {
  data: {
    content: AdminContentSummary;
    lifecycleEvent: AdminContentLifecycleEvent;
  };
  statusCode: 200;
}

export interface AdminContentRepository {
  createDraft(input: CreateAdminContentDraftInput): Promise<{
    data: {
      draft: AdminContentDraft;
      published: AdminContentSummary;
    };
    statusCode: 201;
  }>;
  emergencyWithdrawEntity(
    input: EmergencyWithdrawAdminContentEntityInput,
  ): Promise<AdminContentLifecycleResult>;
  listContent(input: ListAdminContentInput): Promise<{
    data: {
      content: readonly AdminContentSummary[];
      nextCursor: string | null;
    };
    statusCode: 200;
  }>;
  publishRevision(
    input: PublishAdminContentRevisionInput,
  ): Promise<PublishAdminContentRevisionResult>;
  rollbackRevision(input: RollbackAdminContentRevisionInput): Promise<AdminContentLifecycleResult>;
  unpublishEntity(input: UnpublishAdminContentEntityInput): Promise<AdminContentLifecycleResult>;
  updateDraft(input: UpdateAdminContentDraftInput): Promise<{
    data: {
      draft: AdminContentDraft;
    };
    statusCode: 200;
  }>;
  validateDraft(input: ValidateAdminContentDraftInput): Promise<{
    data: {
      draft: AdminContentDraft;
      validation: AdminContentValidationResult;
    };
    statusCode: 200;
  }>;
}

const DEFAULT_ADMIN_CONTENT_PAGE_SIZE = 25;

export function getAdminContentCursor(input: {
  entityId: string;
  entityType: AdminContentEntityType;
}): string {
  return `${input.entityType}:${input.entityId}`;
}

export function paginateAdminContent<
  T extends {
    entityId: string;
    entityType: AdminContentEntityType;
  },
>(input: {
  content: readonly T[];
  cursor?: string | undefined;
  limit?: number | undefined;
}): { content: readonly T[]; nextCursor: string | null } {
  const orderedContent = [...input.content].sort((left, right) =>
    getAdminContentCursor(left).localeCompare(getAdminContentCursor(right)),
  );
  const eligibleContent = input.cursor
    ? orderedContent.filter((item) => getAdminContentCursor(item) > input.cursor!)
    : orderedContent;
  const limit = input.limit ?? DEFAULT_ADMIN_CONTENT_PAGE_SIZE;
  const content = eligibleContent.slice(0, limit);
  const hasMore = eligibleContent.length > content.length;

  return {
    content,
    nextCursor: hasMore ? getAdminContentCursor(content[content.length - 1]!) : null,
  };
}

const releaseOneSourceReviews: Record<
  'd2lVi' | 'googleMlcc' | 'mitOcw6036',
  AdminContentSourceReview
> = {
  d2lVi: {
    attribution: {
      en: 'Dive into Deep Learning Vietnamese edition, licensed under CC BY-SA 4.0.',
      vi: 'Dive into Deep Learning bản tiếng Việt, license CC BY-SA 4.0.',
    },
    license: {
      name: 'CC BY-SA 4.0',
      url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    sourceId: 'source-d2l-vi',
    title: 'Dive into Deep Learning - Vietnamese',
  },
  googleMlcc: {
    attribution: {
      en: 'Google Machine Learning Crash Course, licensed under CC BY 4.0.',
      vi: 'Google Machine Learning Crash Course, license CC BY 4.0.',
    },
    license: {
      name: 'CC BY 4.0',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    sourceId: 'source-google-ml-crash-course',
    title: 'Google Machine Learning Crash Course',
  },
  mitOcw6036: {
    attribution: {
      en: 'MIT OpenCourseWare 6.036 Introduction to Machine Learning, licensed under CC BY-NC-SA 4.0.',
      vi: 'MIT OpenCourseWare 6.036 Introduction to Machine Learning, license CC BY-NC-SA 4.0.',
    },
    license: {
      name: 'CC BY-NC-SA 4.0',
      url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    },
    sourceId: 'source-mit-ocw-6036',
    title: 'MIT OpenCourseWare 6.036 Introduction to Machine Learning',
  },
};

const releaseOneContentHardLimits = {
  courses: 2,
  demos: 10,
  modules: 13,
  postBlockCount: 12,
  posts: 18,
  quizQuestions: 160,
} as const;

const releaseOnePlaygroundProblemIds = new Set([
  'problem-pg-house-price',
  'problem-pg-insurance-cost',
  'problem-pg-spam-detection',
  'problem-pg-customer-churn',
  'problem-pg-credit-risk',
  'problem-pg-wine-cultivar',
  'problem-pg-retail-segments',
  'problem-pg-country-indicators',
  'problem-pg-xor',
  'problem-pg-moons-2d',
]);

const releaseOneAdminContent: readonly AdminContentSummary[] = [
  {
    courseId: 'course-classical-ml',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'course-classical-ml',
    entityType: 'course',
    localeAvailability: ['en', 'vi'],
    preview: {
      en: 'Regression, classification, clustering, and the craft of evaluating a model.',
      vi: 'Hồi quy, phân loại, phân cụm và cách đánh giá một mô hình.',
    },
    publishedRevisionId: 'course-classical-ml-rev-r1',
    sourceReview: releaseOneSourceReviews.mitOcw6036,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Classical Machine Learning',
      vi: 'Học máy cổ điển',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'course-deep-learning-basic',
    entityType: 'course',
    localeAvailability: ['en', 'vi'],
    preview: {
      en: 'From one neuron to multilayer networks, with every decision made visible.',
      vi: 'Từ một neuron đến mạng nhiều lớp, với từng quyết định được trực quan hóa.',
    },
    publishedRevisionId: 'course-deep-learning-basic-rev-r1',
    sourceReview: releaseOneSourceReviews.d2lVi,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Deep Learning Basics',
      vi: 'Học sâu cơ bản',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'dl-m01-neuron-perceptron',
    entityType: 'module',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m01-neuron-perceptron',
    preview: {
      en: 'Build intuition for a neuron, its decision boundary, and the linear limit.',
      vi: 'Hiểu trực giác về neuron, ranh giới quyết định và giới hạn tuyến tính.',
    },
    publishedRevisionId: 'module-dl-m01-neuron-perceptron-rev-r1',
    sourceReview: releaseOneSourceReviews.googleMlcc,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Neurons and Perceptrons',
      vi: 'Neuron và Perceptron',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'dl-m02-mlp',
    entityType: 'module',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m02-mlp',
    preview: {
      en: 'Combine layers and activations to model patterns a straight line cannot separate.',
      vi: 'Kết hợp nhiều lớp và hàm kích hoạt để học mẫu mà đường thẳng không tách được.',
    },
    publishedRevisionId: 'module-dl-m02-mlp-rev-r1',
    sourceReview: releaseOneSourceReviews.d2lVi,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Multilayer Perceptrons',
      vi: 'Mạng nơ-ron nhiều lớp',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'dl-m03-training-generalization',
    entityType: 'module',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m03-training-generalization',
    preview: {
      en: 'Read learning curves, spot overfitting, and reason about generalisation.',
      vi: 'Đọc đường học, nhận biết overfitting và suy luận về khả năng tổng quát.',
    },
    publishedRevisionId: 'module-dl-m03-training-generalization-rev-r1',
    sourceReview: releaseOneSourceReviews.googleMlcc,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Training and generalisation',
      vi: 'Huấn luyện và khả năng tổng quát',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'dl-p01-neuron-perceptron',
    entityType: 'post',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m01-neuron-perceptron',
    preview: {
      en: 'Read from a single neuron decision to the XOR limit that motivates the next model.',
      vi: 'Đọc từ một quyết định của neuron đến giới hạn XOR mở đường cho mô hình kế tiếp.',
    },
    publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
    sourceReview: releaseOneSourceReviews.googleMlcc,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'How does a neuron make a decision?',
      vi: 'Một neuron đưa ra quyết định như thế nào?',
    },
    validationManifest: {
      blockCount: 12,
      taskFingerprints: ['tf-dl-p01-neuron-perceptron-example-v1'],
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'demo-perceptron-and-gate',
    entityType: 'demo',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m01-neuron-perceptron',
    postId: 'dl-p01-neuron-perceptron',
    preview: {
      en: 'Inspect a fixed AND gate boundary with a Perceptron and no live random sampling.',
      vi: 'Quan sát ranh giới AND cố định bằng Perceptron, không lấy mẫu ngẫu nhiên live.',
    },
    publishedRevisionId: 'demo-perceptron-and-gate-rev-r1',
    sourceReview: releaseOneSourceReviews.googleMlcc,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'AND gate decision boundary',
      vi: 'Ranh giới quyết định cổng AND',
    },
    validationManifest: {
      problemId: 'problem-demo-perceptron-and-gate',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'quiz-post-dl-p01',
    entityType: 'quiz',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m01-neuron-perceptron',
    postId: 'dl-p01-neuron-perceptron',
    preview: {
      en: 'Post mastery quiz with 3 questions. Private scoring data stays server-only.',
      vi: 'Quiz mastery của bài học gồm 3 câu. Dữ liệu chấm riêng chỉ nằm phía server.',
    },
    publishedRevisionId: 'quiz-post-dl-p01-rev-r1',
    sourceReview: releaseOneSourceReviews.googleMlcc,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Neuron and Perceptron lesson quiz',
      vi: 'Quiz bài Neuron và Perceptron',
    },
    validationManifest: {
      questionCount: 3,
      taskFingerprints: [
        'tf-dl-p01-neuron-perceptron-quiz-01-v1',
        'tf-dl-p01-neuron-perceptron-quiz-02-v1',
        'tf-dl-p01-neuron-perceptron-quiz-03-v1',
      ],
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: 'quiz-module-dl-m01',
    entityType: 'quiz',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m01-neuron-perceptron',
    preview: {
      en: 'Module mastery quiz with 6 questions. Private feedback data stays outside inventory.',
      vi: 'Quiz mastery của module gồm 6 câu. Dữ liệu phản hồi riêng không xuất hiện trong inventory.',
    },
    publishedRevisionId: 'quiz-module-dl-m01-rev-r1',
    sourceReview: releaseOneSourceReviews.googleMlcc,
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Perceptron module quiz',
      vi: 'Quiz module Perceptron',
    },
    validationManifest: {
      questionCount: 6,
      taskFingerprints: [
        'tf-dl-m01-neuron-perceptron-quiz-01-v1',
        'tf-dl-m01-neuron-perceptron-quiz-02-v1',
        'tf-dl-m01-neuron-perceptron-quiz-03-v1',
        'tf-dl-m01-neuron-perceptron-quiz-04-v1',
        'tf-dl-m01-neuron-perceptron-quiz-05-v1',
        'tf-dl-m01-neuron-perceptron-quiz-06-v1',
      ],
    },
    validationStatus: 'not-run',
  },
];

export function getReleaseOneAdminContentFixture(): readonly AdminContentSummary[] {
  return releaseOneAdminContent;
}

export function isAdminContentEntityType(value: string): value is AdminContentEntityType {
  return adminContentEntityTypes.includes(value as AdminContentEntityType);
}

export function isAdminContentPublicationScope(
  value: string,
): value is AdminContentPublicationScope {
  return adminContentPublicationScopes.includes(value as AdminContentPublicationScope);
}

export function getAdminContentKey(entityType: AdminContentEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function createDraftRevisionId(published: AdminContentSummary): string {
  return `draft-${published.entityType}-${published.entityId}-rev-d1`;
}

function cloneValidationManifest(
  manifest: AdminContentValidationManifest | undefined,
): AdminContentValidationManifest | undefined {
  if (manifest === undefined) {
    return undefined;
  }

  return {
    ...(manifest.blockCount !== undefined ? { blockCount: manifest.blockCount } : {}),
    ...(manifest.problemId !== undefined ? { problemId: manifest.problemId } : {}),
    ...(manifest.questionCount !== undefined ? { questionCount: manifest.questionCount } : {}),
    ...(manifest.taskFingerprints !== undefined
      ? { taskFingerprints: [...manifest.taskFingerprints] }
      : {}),
  };
}

function createSeededAdminContentMetadata(): AdminContentMetadata {
  return {
    attribution: {
      en: 'Seeded Release 1 source attribution pending validation.',
      vi: 'Attribution nguồn Release 1 đã seed, chờ validation.',
    },
    externalLinkUrl: null,
  };
}

export function createDraftFromPublished(published: AdminContentSummary): AdminContentDraft {
  return {
    baseRevisionId: published.publishedRevisionId,
    courseId: published.courseId,
    draftRevisionId: createDraftRevisionId(published),
    entityId: published.entityId,
    entityType: published.entityType,
    localeAvailability: published.localeAvailability,
    ...(published.moduleId !== undefined ? { moduleId: published.moduleId } : {}),
    ...(published.postId !== undefined ? { postId: published.postId } : {}),
    metadata: createSeededAdminContentMetadata(),
    preview: { ...published.preview },
    revisionVersion: 1,
    sourceReview: published.sourceReview,
    sourceStatus: 'seeded',
    status: 'draft',
    title: { ...published.title },
    validationManifest: cloneValidationManifest(published.validationManifest),
    validationStatus: 'not-run',
  };
}

export function hasDraftPatchValue(patch: AdminContentDraftPatch): boolean {
  return patch.title !== undefined || patch.preview !== undefined || patch.metadata !== undefined;
}

export function applyDraftPatch(
  draft: AdminContentDraft,
  patch: AdminContentDraftPatch,
): AdminContentDraft {
  return {
    ...draft,
    ...(patch.metadata !== undefined
      ? {
          metadata: {
            attribution: { ...patch.metadata.attribution },
            externalLinkUrl: patch.metadata.externalLinkUrl,
          },
        }
      : {}),
    ...(patch.preview !== undefined ? { preview: { ...patch.preview } } : {}),
    revisionVersion: draft.revisionVersion + 1,
    ...(patch.title !== undefined ? { title: { ...patch.title } } : {}),
    validationStatus: 'not-run',
  };
}

function hasLocalizedText(value: LocalizedText): boolean {
  return Boolean(value.en.trim()) && Boolean(value.vi.trim());
}

function hasHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function hasSourceReview(value: AdminContentSourceReview): boolean {
  return (
    Boolean(value.sourceId.trim()) &&
    Boolean(value.title.trim()) &&
    hasLocalizedText(value.attribution) &&
    Boolean(value.license.name.trim()) &&
    hasHttpUrl(value.license.url)
  );
}

function createValidationCheck(input: {
  checkId: string;
  isPassed: boolean;
  message: string;
}): AdminContentValidationCheck {
  return {
    checkId: input.checkId,
    message: input.message,
    status: input.isPassed ? 'passed' : 'failed',
  };
}

function hasExactSupportedLocales(value: readonly string[]): boolean {
  return value.length === 2 && value.includes('en') && value.includes('vi');
}

function countContentByType(
  content: readonly AdminContentSummary[],
  entityType: AdminContentEntityType,
): number {
  return content.filter((item) => item.entityType === entityType).length;
}

function getTotalQuizQuestionCount(content: readonly AdminContentSummary[]): number {
  return content.reduce((total, item) => total + (item.validationManifest?.questionCount ?? 0), 0);
}

function hasPostBlockCountsWithinLimit(content: readonly AdminContentSummary[]): boolean {
  return content.every(
    (item) =>
      item.entityType !== 'post' ||
      (item.validationManifest?.blockCount !== undefined &&
        item.validationManifest.blockCount <= releaseOneContentHardLimits.postBlockCount),
  );
}

function hasQuizQuestionCounts(content: readonly AdminContentSummary[]): boolean {
  return content.every(
    (item) => item.entityType !== 'quiz' || item.validationManifest?.questionCount !== undefined,
  );
}

function hasReleaseOneHardLimits(content: readonly AdminContentSummary[]): boolean {
  return (
    countContentByType(content, 'course') <= releaseOneContentHardLimits.courses &&
    countContentByType(content, 'demo') <= releaseOneContentHardLimits.demos &&
    countContentByType(content, 'module') <= releaseOneContentHardLimits.modules &&
    countContentByType(content, 'post') <= releaseOneContentHardLimits.posts &&
    getTotalQuizQuestionCount(content) <= releaseOneContentHardLimits.quizQuestions &&
    hasQuizQuestionCounts(content) &&
    hasPostBlockCountsWithinLimit(content)
  );
}

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function getDemoProblemIds(content: readonly AdminContentSummary[]): readonly string[] {
  return content
    .filter((item) => item.entityType === 'demo')
    .map((item) => item.validationManifest?.problemId?.trim() ?? '')
    .filter(Boolean);
}

function hasValidProblemRegistry(content: readonly AdminContentSummary[]): boolean {
  const demoProblemIds = getDemoProblemIds(content);

  return (
    demoProblemIds.length === countContentByType(content, 'demo') &&
    hasUniqueValues(demoProblemIds) &&
    demoProblemIds.every((problemId) => !releaseOnePlaygroundProblemIds.has(problemId))
  );
}

function getTaskFingerprints(content: readonly AdminContentSummary[]): readonly string[] {
  return content.flatMap((item) => item.validationManifest?.taskFingerprints ?? []);
}

function hasValidTaskFingerprintRegistry(content: readonly AdminContentSummary[]): boolean {
  const taskFingerprints = getTaskFingerprints(content).map((fingerprint) => fingerprint.trim());

  const contentHasRequiredFingerprints = content.every((item) => {
    if (item.entityType !== 'post' && item.entityType !== 'quiz') {
      return true;
    }

    const fingerprints = item.validationManifest?.taskFingerprints ?? [];

    if (item.entityType === 'post') {
      return fingerprints.length > 0;
    }

    return (
      item.validationManifest?.questionCount !== undefined &&
      fingerprints.length === item.validationManifest.questionCount
    );
  });

  return (
    contentHasRequiredFingerprints &&
    taskFingerprints.every(Boolean) &&
    hasUniqueValues(taskFingerprints)
  );
}

function createValidationChecks(input: {
  draft: AdminContentDraft;
  publishCandidateContent: readonly AdminContentSummary[];
}): readonly AdminContentValidationCheck[] {
  const { draft, publishCandidateContent } = input;

  return [
    createValidationCheck({
      checkId: 'locale-coverage',
      isPassed: hasExactSupportedLocales(draft.localeAvailability),
      message: 'Draft must include both English and Vietnamese locales.',
    }),
    createValidationCheck({
      checkId: 'localized-title',
      isPassed: hasLocalizedText(draft.title),
      message: 'Draft title must be present in both locales.',
    }),
    createValidationCheck({
      checkId: 'localized-preview',
      isPassed: hasLocalizedText(draft.preview),
      message: 'Draft preview must be present in both locales.',
    }),
    createValidationCheck({
      checkId: 'source-status',
      isPassed: draft.sourceStatus === 'seeded',
      message: 'Draft must come from the Release 1 seeded source pipeline.',
    }),
    createValidationCheck({
      checkId: 'source-license',
      isPassed: hasSourceReview(draft.sourceReview),
      message: 'Draft must keep a reviewed source and license reference.',
    }),
    createValidationCheck({
      checkId: 'attribution',
      isPassed: hasLocalizedText(draft.metadata.attribution),
      message: 'Draft attribution must be present in both locales.',
    }),
    createValidationCheck({
      checkId: 'external-link',
      isPassed:
        typeof draft.metadata.externalLinkUrl === 'string' &&
        hasHttpUrl(draft.metadata.externalLinkUrl),
      message: 'Draft external source link must be present and use HTTP(S).',
    }),
    createValidationCheck({
      checkId: 'release-hard-limits',
      isPassed: hasReleaseOneHardLimits(publishCandidateContent),
      message:
        'Publish candidate must stay within Release 1 hard limits for modules, posts, blocks, quizzes, and demos.',
    }),
    createValidationCheck({
      checkId: 'problem-registry',
      isPassed: hasValidProblemRegistry(publishCandidateContent),
      message:
        'Demo problem IDs must be present and unique outside the Playground problem registry.',
    }),
    createValidationCheck({
      checkId: 'task-fingerprint-registry',
      isPassed: hasValidTaskFingerprintRegistry(publishCandidateContent),
      message: 'Example and quiz task fingerprints must be present and unique.',
    }),
  ];
}

export function createValidationResult(input: {
  draft: AdminContentDraft;
  publishCandidateContent: readonly AdminContentSummary[];
}): AdminContentValidationResult {
  const checks = createValidationChecks(input);
  const failedChecks = checks.filter((check) => check.status === 'failed');

  if (failedChecks.length > 0) {
    throw new ApiError(
      422,
      'ADMIN_CONTENT_DRAFT_VALIDATION_FAILED',
      'Draft validation failed.',
      failedChecks,
    );
  }

  return {
    checks,
    revisionId: input.draft.draftRevisionId,
    status: 'valid',
  };
}

export function createPublishedContentFromDraft(input: {
  draft: AdminContentDraft;
  publicationScope?: AdminContentPublicationScope | undefined;
  previousPublishedRevisionId: string;
}): AdminContentSummary {
  return {
    courseId: input.draft.courseId,
    draftRevisionId: null,
    emergencyBlocked: false,
    entityId: input.draft.entityId,
    entityType: input.draft.entityType,
    localeAvailability: input.draft.localeAvailability,
    ...(input.draft.moduleId !== undefined ? { moduleId: input.draft.moduleId } : {}),
    ...(input.draft.postId !== undefined ? { postId: input.draft.postId } : {}),
    publicationScope: input.publicationScope ?? 'publish-quality',
    previousPublishedRevisionId: input.previousPublishedRevisionId,
    preview: { ...input.draft.preview },
    publishedRevisionId: input.draft.draftRevisionId,
    sourceReview: input.draft.sourceReview,
    sourceStatus: input.draft.sourceStatus,
    status: 'published',
    title: { ...input.draft.title },
    validationManifest: cloneValidationManifest(input.draft.validationManifest),
    validationStatus: 'valid',
  };
}

export function createAdminContentLifecycleEvent(input: {
  actorUid: string;
  createdAt?: string | undefined;
  entityId: string;
  entityType: AdminContentEntityType;
  fromRevisionId: string | null;
  reason: string;
  requestId: string;
  toRevisionId: string | null;
  type: AdminContentLifecycleEvent['type'];
  publicationScope?: AdminContentPublicationScope | undefined;
}): AdminContentLifecycleEvent {
  return {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function createPublishRequestHash(input: PublishAdminContentRevisionInput): string {
  return JSON.stringify({
    operation: 'admin-content-publish',
    actorUid: input.actorUid,
    publicationScope: input.publicationScope ?? 'publish-quality',
    revisionId: input.revisionId,
    reason: input.reason,
  });
}

export function getAdminContentIdempotencyRecordKey(input: {
  actorUid: string;
  idempotencyKey: string;
}): string {
  return `${input.actorUid}:${input.idempotencyKey}`;
}

function withDraftRevision(
  published: AdminContentSummary,
  draft: AdminContentDraft | undefined,
): AdminContentSummary {
  return {
    ...published,
    draftRevisionId: draft?.draftRevisionId ?? null,
  };
}

function assertReleaseOnePublishedRevisionLimits(content: readonly AdminContentSummary[]): void {
  const contentKeys = new Set<string>();
  const publishedRevisionIds = new Set<string>();

  for (const item of content) {
    const contentKey = getAdminContentKey(item.entityType, item.entityId);

    if (contentKeys.has(contentKey)) {
      throw new ApiError(
        500,
        'ADMIN_CONTENT_CURRENT_POINTER_DUPLICATE',
        'Release 1 supports exactly one current published pointer per content entity.',
      );
    }

    if (publishedRevisionIds.has(item.publishedRevisionId)) {
      throw new ApiError(
        500,
        'ADMIN_CONTENT_REVISION_ID_DUPLICATE',
        'Published revision IDs must be unique across Release 1 content.',
      );
    }

    contentKeys.add(contentKey);
    publishedRevisionIds.add(item.publishedRevisionId);
  }
}

export function createStaticAdminContentRepository(
  content: readonly AdminContentSummary[] = releaseOneAdminContent,
): AdminContentRepository {
  assertReleaseOnePublishedRevisionLimits(content);

  const draftsByContentKey = new Map<string, AdminContentDraft>();
  const publishedByContentKey = new Map<string, AdminContentSummary>();
  const publishedRevisionsByRevisionId = new Map<string, AdminContentSummary>(
    content.map((item) => [item.publishedRevisionId, item]),
  );
  const publishIdempotencyRecords = new Map<
    string,
    {
      requestHash: string;
      result: PublishAdminContentRevisionResult;
    }
  >();

  function findDraftByRevisionId(revisionId: string): AdminContentDraft | undefined {
    return [...draftsByContentKey.values()].find((draft) => draft.draftRevisionId === revisionId);
  }

  function findCurrentPublishedContent(
    entityType: AdminContentEntityType,
    entityId: string,
  ): AdminContentSummary | undefined {
    const contentKey = getAdminContentKey(entityType, entityId);

    return (
      publishedByContentKey.get(contentKey) ??
      content.find((item) => item.entityType === entityType && item.entityId === entityId)
    );
  }

  function findCurrentContentByEntityId(entityId: string): AdminContentSummary | undefined {
    const seededContent = content.find((item) => item.entityId === entityId);

    if (seededContent === undefined) {
      return undefined;
    }

    return (
      publishedByContentKey.get(
        getAdminContentKey(seededContent.entityType, seededContent.entityId),
      ) ?? seededContent
    );
  }

  function listCurrentPublishedContent(): readonly AdminContentSummary[] {
    return content.map(
      (item) =>
        publishedByContentKey.get(getAdminContentKey(item.entityType, item.entityId)) ?? item,
    );
  }

  function createPublishCandidateContent(
    draft: AdminContentDraft,
    currentPublishedContent: AdminContentSummary,
  ): readonly AdminContentSummary[] {
    const draftContentKey = getAdminContentKey(draft.entityType, draft.entityId);
    const draftPublishedContent = createPublishedContentFromDraft({
      draft,
      previousPublishedRevisionId: currentPublishedContent.publishedRevisionId,
    });

    return listCurrentPublishedContent().map((item) =>
      getAdminContentKey(item.entityType, item.entityId) === draftContentKey
        ? draftPublishedContent
        : item,
    );
  }

  return {
    async createDraft(input) {
      if (!input.createdByUid) {
        throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      }

      if (!isAdminContentEntityType(input.entityType)) {
        throw new ApiError(
          400,
          'ADMIN_CONTENT_ENTITY_TYPE_INVALID',
          'The requested admin content entity type is not supported.',
        );
      }

      const contentKey = getAdminContentKey(input.entityType, input.entityId);
      const existingDraft = draftsByContentKey.get(contentKey);

      if (existingDraft !== undefined) {
        throw new ApiError(
          409,
          'ADMIN_CONTENT_DRAFT_ALREADY_EXISTS',
          'This content item already has a draft.',
        );
      }

      const published = content.find(
        (item) => item.entityType === input.entityType && item.entityId === input.entityId,
      );

      if (published === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_NOT_FOUND',
          'The requested admin content item was not found.',
        );
      }

      const draft = createDraftFromPublished(published);
      draftsByContentKey.set(contentKey, draft);

      return {
        statusCode: 201,
        data: {
          draft,
          published: withDraftRevision(published, draft),
        },
      };
    },
    async publishRevision(input) {
      if (!input.actorUid) {
        throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      }

      if (!input.idempotencyKey) {
        throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
      }

      const requestHash = createPublishRequestHash(input);
      const idempotencyRecordKey = getAdminContentIdempotencyRecordKey(input);
      const existingIdempotencyRecord = publishIdempotencyRecords.get(idempotencyRecordKey);

      if (existingIdempotencyRecord !== undefined) {
        if (existingIdempotencyRecord.requestHash !== requestHash) {
          throw new ApiError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'This Idempotency-Key was used for a different request.',
          );
        }

        return existingIdempotencyRecord.result;
      }

      const draft = findDraftByRevisionId(input.revisionId);

      if (draft === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_DRAFT_NOT_FOUND',
          'The requested draft revision was not found.',
        );
      }

      if (draft.validationStatus !== 'valid') {
        throw new ApiError(
          422,
          'ADMIN_CONTENT_VALIDATION_REQUIRED',
          'Draft validation must pass before publish.',
        );
      }

      const currentPublishedContent = findCurrentPublishedContent(draft.entityType, draft.entityId);

      if (currentPublishedContent === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_NOT_FOUND',
          'The requested admin content item was not found.',
        );
      }

      const publishedContent = createPublishedContentFromDraft({
        draft,
        publicationScope: input.publicationScope,
        previousPublishedRevisionId: currentPublishedContent.publishedRevisionId,
      });
      const lifecycleEvent = createAdminContentLifecycleEvent({
        actorUid: input.actorUid,
        entityId: draft.entityId,
        entityType: draft.entityType,
        fromRevisionId: currentPublishedContent.publishedRevisionId,
        reason: input.reason,
        requestId: input.requestId,
        toRevisionId: publishedContent.publishedRevisionId,
        type: 'published',
        publicationScope: publishedContent.publicationScope,
      });
      const result: PublishAdminContentRevisionResult = {
        statusCode: 200,
        data: {
          content: publishedContent,
          lifecycleEvent,
        },
      };

      publishedByContentKey.set(
        getAdminContentKey(draft.entityType, draft.entityId),
        publishedContent,
      );
      publishedRevisionsByRevisionId.set(publishedContent.publishedRevisionId, publishedContent);
      draftsByContentKey.delete(getAdminContentKey(draft.entityType, draft.entityId));
      publishIdempotencyRecords.set(idempotencyRecordKey, {
        requestHash,
        result,
      });

      return result;
    },
    async rollbackRevision(input) {
      if (!input.actorUid) {
        throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      }

      const targetRevision = publishedRevisionsByRevisionId.get(input.revisionId);

      if (targetRevision === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_REVISION_NOT_FOUND',
          'The requested published revision was not found.',
        );
      }

      const currentContent = findCurrentPublishedContent(
        targetRevision.entityType,
        targetRevision.entityId,
      );

      if (currentContent === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_NOT_FOUND',
          'The requested admin content item was not found.',
        );
      }

      if (currentContent.publishedRevisionId === targetRevision.publishedRevisionId) {
        throw new ApiError(
          409,
          'ADMIN_CONTENT_ROLLBACK_NOT_REQUIRED',
          'The requested revision is already the current published revision.',
        );
      }

      const rolledBackContent: AdminContentSummary = {
        ...targetRevision,
        draftRevisionId: null,
        emergencyBlocked: false,
        previousPublishedRevisionId: currentContent.publishedRevisionId,
        status: 'published',
      };
      const lifecycleEvent = createAdminContentLifecycleEvent({
        actorUid: input.actorUid,
        entityId: targetRevision.entityId,
        entityType: targetRevision.entityType,
        fromRevisionId: currentContent.publishedRevisionId,
        reason: input.reason,
        requestId: input.requestId,
        toRevisionId: targetRevision.publishedRevisionId,
        type: 'rolled-back',
        publicationScope: rolledBackContent.publicationScope,
      });

      publishedByContentKey.set(
        getAdminContentKey(rolledBackContent.entityType, rolledBackContent.entityId),
        rolledBackContent,
      );

      return {
        statusCode: 200,
        data: {
          content: rolledBackContent,
          lifecycleEvent,
        },
      };
    },
    async emergencyWithdrawEntity(input) {
      if (!input.actorUid) {
        throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      }

      if (!isAdminContentEntityType(input.entityType)) {
        throw new ApiError(
          400,
          'ADMIN_CONTENT_ENTITY_TYPE_INVALID',
          'The requested admin content entity type is not supported.',
        );
      }

      if (!['demo', 'post', 'quiz'].includes(input.entityType)) {
        throw new ApiError(
          409,
          'ADMIN_CONTENT_EMERGENCY_WITHDRAW_SCOPE_UNSUPPORTED',
          'Emergency withdraw only supports demo, post, and quiz content.',
        );
      }

      const currentContent = findCurrentPublishedContent(input.entityType, input.entityId);

      if (currentContent === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_NOT_FOUND',
          'The requested admin content item was not found.',
        );
      }

      const content: AdminContentSummary = {
        ...currentContent,
        emergencyBlocked: true,
      };
      const lifecycleEvent = createAdminContentLifecycleEvent({
        actorUid: input.actorUid,
        entityId: content.entityId,
        entityType: content.entityType,
        fromRevisionId: currentContent.publishedRevisionId,
        reason: input.reason,
        requestId: input.requestId,
        toRevisionId: currentContent.publishedRevisionId,
        type: 'emergency-withdrawn',
        publicationScope: content.publicationScope,
      });

      publishedByContentKey.set(getAdminContentKey(content.entityType, content.entityId), content);

      return {
        statusCode: 200,
        data: { content, lifecycleEvent },
      };
    },
    async unpublishEntity(input) {
      if (!input.actorUid) {
        throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      }

      const currentContent = findCurrentContentByEntityId(input.entityId);

      if (currentContent === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_NOT_FOUND',
          'The requested admin content item was not found.',
        );
      }

      if (currentContent.entityType !== 'course') {
        throw new ApiError(
          409,
          'ADMIN_CONTENT_UNPUBLISH_SCOPE_UNSUPPORTED',
          'Release 1 only supports planned course unpublish from this endpoint.',
        );
      }

      const unpublishedContent: AdminContentSummary = {
        ...currentContent,
        status: 'unpublished',
      };
      const lifecycleEvent = createAdminContentLifecycleEvent({
        actorUid: input.actorUid,
        entityId: currentContent.entityId,
        entityType: currentContent.entityType,
        fromRevisionId: currentContent.publishedRevisionId,
        reason: input.reason,
        requestId: input.requestId,
        toRevisionId: null,
        type: 'unpublished',
        publicationScope: unpublishedContent.publicationScope,
      });

      publishedByContentKey.set(
        getAdminContentKey(unpublishedContent.entityType, unpublishedContent.entityId),
        unpublishedContent,
      );

      return {
        statusCode: 200,
        data: {
          content: unpublishedContent,
          lifecycleEvent,
        },
      };
    },
    async updateDraft(input) {
      if (!input.actorUid) {
        throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      }

      const existingDraft = findDraftByRevisionId(input.revisionId);

      if (existingDraft === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_DRAFT_NOT_FOUND',
          'The requested draft revision was not found.',
        );
      }

      if (!hasDraftPatchValue(input.patch)) {
        throw new ApiError(
          400,
          'ADMIN_CONTENT_DRAFT_PATCH_EMPTY',
          'At least one allowlisted draft field is required.',
        );
      }

      if (existingDraft.revisionVersion !== input.revisionVersion) {
        throw new ApiError(
          409,
          'ADMIN_CONTENT_DRAFT_VERSION_CONFLICT',
          'The draft has changed. Reload it before saving again.',
        );
      }

      const updatedDraft = applyDraftPatch(existingDraft, input.patch);
      draftsByContentKey.set(
        getAdminContentKey(updatedDraft.entityType, updatedDraft.entityId),
        updatedDraft,
      );

      return {
        statusCode: 200,
        data: {
          draft: updatedDraft,
        },
      };
    },
    async validateDraft(input) {
      if (!input.actorUid) {
        throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      }

      const existingDraft = findDraftByRevisionId(input.revisionId);

      if (existingDraft === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_DRAFT_NOT_FOUND',
          'The requested draft revision was not found.',
        );
      }

      const currentPublishedContent = findCurrentPublishedContent(
        existingDraft.entityType,
        existingDraft.entityId,
      );

      if (currentPublishedContent === undefined) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_NOT_FOUND',
          'The requested admin content item was not found.',
        );
      }

      const validation = createValidationResult({
        draft: existingDraft,
        publishCandidateContent: createPublishCandidateContent(
          existingDraft,
          currentPublishedContent,
        ),
      });
      const validatedDraft: AdminContentDraft = {
        ...existingDraft,
        validationStatus: 'valid',
      };

      draftsByContentKey.set(
        getAdminContentKey(validatedDraft.entityType, validatedDraft.entityId),
        validatedDraft,
      );

      return {
        statusCode: 200,
        data: {
          draft: validatedDraft,
          validation,
        },
      };
    },
    async listContent(input) {
      if (input.entityType !== undefined && !isAdminContentEntityType(input.entityType)) {
        throw new ApiError(
          400,
          'ADMIN_CONTENT_ENTITY_TYPE_INVALID',
          'The requested admin content entity type is not supported.',
        );
      }

      const page = paginateAdminContent({
        content: content
          .filter((item) => {
            if (input.entityType !== undefined && item.entityType !== input.entityType) {
              return false;
            }

            if (input.courseId !== undefined && item.courseId !== input.courseId) {
              return false;
            }

            if (input.moduleId !== undefined && item.moduleId !== input.moduleId) {
              return false;
            }

            return true;
          })
          .map((item) => {
            const currentPublishedContent =
              publishedByContentKey.get(getAdminContentKey(item.entityType, item.entityId)) ?? item;

            return withDraftRevision(
              currentPublishedContent,
              draftsByContentKey.get(getAdminContentKey(item.entityType, item.entityId)),
            );
          }),
        cursor: input.cursor,
        limit: input.limit,
      });

      return {
        statusCode: 200,
        data: {
          content: page.content,
          nextCursor: page.nextCursor,
        },
      };
    },
  };
}
