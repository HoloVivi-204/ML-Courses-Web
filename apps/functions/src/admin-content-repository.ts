import { ApiError } from './api-error.js';

export const adminContentEntityTypes = ['course', 'module', 'post', 'demo', 'quiz'] as const;

export type AdminContentEntityType = (typeof adminContentEntityTypes)[number];

export interface LocalizedText {
  en: string;
  vi: string;
}

export interface AdminContentSummary {
  courseId: string;
  draftRevisionId: string | null;
  entityId: string;
  entityType: AdminContentEntityType;
  localeAvailability: readonly ['en', 'vi'];
  moduleId?: string | undefined;
  postId?: string | undefined;
  preview: LocalizedText;
  publishedRevisionId: string;
  sourceStatus: 'seeded';
  status: 'published';
  title: LocalizedText;
  validationStatus: 'not-run';
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
  preview: LocalizedText;
  revisionVersion: 1;
  sourceStatus: 'seeded';
  status: 'draft';
  title: LocalizedText;
  validationStatus: 'not-run';
}

export interface CreateAdminContentDraftInput {
  createdByUid: string;
  entityId: string;
  entityType: string;
}

export interface ListAdminContentInput {
  courseId?: string | undefined;
  entityType?: string | undefined;
  moduleId?: string | undefined;
}

export interface AdminContentRepository {
  createDraft(input: CreateAdminContentDraftInput): Promise<{
    data: {
      draft: AdminContentDraft;
      published: AdminContentSummary;
    };
    statusCode: 201;
  }>;
  listContent(input: ListAdminContentInput): Promise<{
    data: {
      content: readonly AdminContentSummary[];
    };
    statusCode: 200;
  }>;
}

const releaseOneAdminContent: readonly AdminContentSummary[] = [
  {
    courseId: 'course-classical-ml',
    draftRevisionId: null,
    entityId: 'course-classical-ml',
    entityType: 'course',
    localeAvailability: ['en', 'vi'],
    preview: {
      en: 'Regression, classification, clustering, and the craft of evaluating a model.',
      vi: 'Hồi quy, phân loại, phân cụm và cách đánh giá một mô hình.',
    },
    publishedRevisionId: 'course-classical-ml-rev-r1',
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
    entityId: 'course-deep-learning-basic',
    entityType: 'course',
    localeAvailability: ['en', 'vi'],
    preview: {
      en: 'From one neuron to multilayer networks, with every decision made visible.',
      vi: 'Từ một neuron đến mạng nhiều lớp, với từng quyết định được trực quan hóa.',
    },
    publishedRevisionId: 'course-deep-learning-basic-rev-r1',
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
    entityId: 'dl-m01-neuron-perceptron',
    entityType: 'module',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m01-neuron-perceptron',
    preview: {
      en: 'Build intuition for a neuron, its decision boundary, and the linear limit.',
      vi: 'Hiểu trực giác về neuron, ranh giới quyết định và giới hạn tuyến tính.',
    },
    publishedRevisionId: 'module-dl-m01-neuron-perceptron-rev-r1',
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
    entityId: 'dl-m02-mlp',
    entityType: 'module',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m02-mlp',
    preview: {
      en: 'Combine layers and activations to model patterns a straight line cannot separate.',
      vi: 'Kết hợp nhiều lớp và hàm kích hoạt để học mẫu mà đường thẳng không tách được.',
    },
    publishedRevisionId: 'module-dl-m02-mlp-rev-r1',
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
    entityId: 'dl-m03-training-generalization',
    entityType: 'module',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m03-training-generalization',
    preview: {
      en: 'Read learning curves, spot overfitting, and reason about generalisation.',
      vi: 'Đọc đường học, nhận biết overfitting và suy luận về khả năng tổng quát.',
    },
    publishedRevisionId: 'module-dl-m03-training-generalization-rev-r1',
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
    entityId: 'dl-p01-neuron-perceptron',
    entityType: 'post',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m01-neuron-perceptron',
    preview: {
      en: 'Read from a single neuron decision to the XOR limit that motivates the next model.',
      vi: 'Đọc từ một quyết định của neuron đến giới hạn XOR mở đường cho mô hình kế tiếp.',
    },
    publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'How does a neuron make a decision?',
      vi: 'Một neuron đưa ra quyết định như thế nào?',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
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
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'AND gate decision boundary',
      vi: 'Ranh giới quyết định cổng AND',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
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
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Neuron and Perceptron lesson quiz',
      vi: 'Quiz bài Neuron và Perceptron',
    },
    validationStatus: 'not-run',
  },
  {
    courseId: 'course-deep-learning-basic',
    draftRevisionId: null,
    entityId: 'quiz-module-dl-m01',
    entityType: 'quiz',
    localeAvailability: ['en', 'vi'],
    moduleId: 'dl-m01-neuron-perceptron',
    preview: {
      en: 'Module mastery quiz with 6 questions. Private feedback data stays outside inventory.',
      vi: 'Quiz mastery của module gồm 6 câu. Dữ liệu phản hồi riêng không xuất hiện trong inventory.',
    },
    publishedRevisionId: 'quiz-module-dl-m01-rev-r1',
    sourceStatus: 'seeded',
    status: 'published',
    title: {
      en: 'Perceptron module quiz',
      vi: 'Quiz module Perceptron',
    },
    validationStatus: 'not-run',
  },
];

function isAdminContentEntityType(value: string): value is AdminContentEntityType {
  return adminContentEntityTypes.includes(value as AdminContentEntityType);
}

function getContentKey(entityType: AdminContentEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function createDraftRevisionId(published: AdminContentSummary): string {
  return `draft-${published.entityType}-${published.entityId}-rev-d1`;
}

function createDraftFromPublished(published: AdminContentSummary): AdminContentDraft {
  return {
    baseRevisionId: published.publishedRevisionId,
    courseId: published.courseId,
    draftRevisionId: createDraftRevisionId(published),
    entityId: published.entityId,
    entityType: published.entityType,
    localeAvailability: ['en', 'vi'],
    ...(published.moduleId !== undefined ? { moduleId: published.moduleId } : {}),
    ...(published.postId !== undefined ? { postId: published.postId } : {}),
    preview: { ...published.preview },
    revisionVersion: 1,
    sourceStatus: 'seeded',
    status: 'draft',
    title: { ...published.title },
    validationStatus: 'not-run',
  };
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

export function createStaticAdminContentRepository(
  content: readonly AdminContentSummary[] = releaseOneAdminContent,
): AdminContentRepository {
  const draftsByContentKey = new Map<string, AdminContentDraft>();

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

      const contentKey = getContentKey(input.entityType, input.entityId);
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
    async listContent(input) {
      if (input.entityType !== undefined && !isAdminContentEntityType(input.entityType)) {
        throw new ApiError(
          400,
          'ADMIN_CONTENT_ENTITY_TYPE_INVALID',
          'The requested admin content entity type is not supported.',
        );
      }

      return {
        statusCode: 200,
        data: {
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
              return withDraftRevision(
                item,
                draftsByContentKey.get(getContentKey(item.entityType, item.entityId)),
              );
            }),
        },
      };
    },
  };
}

export function createDefaultAdminContentRepository(): AdminContentRepository {
  return createStaticAdminContentRepository();
}
