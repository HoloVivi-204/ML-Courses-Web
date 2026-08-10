import {
  getPublishedLearnerContentDocumentId,
  publishedLearnerContentDocumentSchema,
  type PublishedLearnerContentDocument,
  type PublishedLearnerContentDocumentKind,
} from '@ml-path/contracts';

import type { AdminContentEntityType, AdminContentSummary } from './admin-content-repository.js';
import type { PublishedLearnerContent } from './learning-content-repository.js';

export const PUBLISHED_LEARNER_CONTENT_COLLECTION = 'publishedLearnerContent';

export interface PublishedLearnerContentDocumentWrite {
  data: PublishedLearnerContentDocument;
  documentId: string;
}

function assertRevisionMatchesContent(input: {
  content: AdminContentSummary;
  revisionId: string;
}): void {
  if (input.revisionId !== input.content.publishedRevisionId) {
    throw new Error('Published learner content must use the current entity revision.');
  }
}

function createDocument(input: {
  content: AdminContentSummary;
  documentKind: PublishedLearnerContentDocumentKind;
  learnerContent: unknown;
}): PublishedLearnerContentDocumentWrite {
  const data = publishedLearnerContentDocumentSchema.parse({
    content: input.learnerContent,
    documentKind: input.documentKind,
    entityId: input.content.entityId,
    entityType: input.content.entityType,
    revisionId: input.content.publishedRevisionId,
    schemaVersion: 1,
  });

  return {
    data,
    documentId: getPublishedLearnerContentDocumentId({
      documentKind: data.documentKind,
      entityId: data.entityId,
    }),
  };
}

export function getPublishedLearnerContentDocumentIdsForEntity(input: {
  entityId: string;
  entityType: AdminContentEntityType;
}): readonly string[] {
  switch (input.entityType) {
    case 'course':
      return [
        getPublishedLearnerContentDocumentId({
          documentKind: 'course-summary',
          entityId: input.entityId,
        }),
      ];
    case 'demo':
      return [
        getPublishedLearnerContentDocumentId({
          documentKind: 'demo-full',
          entityId: input.entityId,
        }),
      ];
    case 'post':
      return [
        getPublishedLearnerContentDocumentId({
          documentKind: 'post-trial',
          entityId: input.entityId,
        }),
        getPublishedLearnerContentDocumentId({
          documentKind: 'post-full',
          entityId: input.entityId,
        }),
      ];
    case 'module':
      return [
        getPublishedLearnerContentDocumentId({
          documentKind: 'module-summary',
          entityId: input.entityId,
        }),
      ];
    case 'quiz':
      return [
        getPublishedLearnerContentDocumentId({
          documentKind: 'quiz-summary',
          entityId: input.entityId,
        }),
      ];
  }
}

export function createPublishedLearnerContentDocuments(input: {
  content: AdminContentSummary;
  learnerContent: PublishedLearnerContent | null;
}): readonly PublishedLearnerContentDocumentWrite[] {
  if (input.learnerContent === null) {
    return [];
  }

  if (input.learnerContent.contentType === 'course') {
    if (input.content.entityType !== 'course') {
      throw new Error('Course learner content must belong to a course entity.');
    }

    assertRevisionMatchesContent({
      content: input.content,
      revisionId: input.learnerContent.course.revisionId,
    });

    return [
      createDocument({
        content: input.content,
        documentKind: 'course-summary',
        learnerContent: input.learnerContent.course,
      }),
    ];
  }

  if (input.learnerContent.contentType === 'module') {
    if (input.content.entityType !== 'module') {
      throw new Error('Module learner content must belong to a module entity.');
    }

    assertRevisionMatchesContent({
      content: input.content,
      revisionId: input.learnerContent.module.revisionId,
    });

    return [
      createDocument({
        content: input.content,
        documentKind: 'module-summary',
        learnerContent: input.learnerContent.module,
      }),
    ];
  }

  if (input.learnerContent.contentType === 'post') {
    if (input.content.entityType !== 'post') {
      throw new Error('Post learner content must belong to a post entity.');
    }

    assertRevisionMatchesContent({
      content: input.content,
      revisionId: input.learnerContent.fullPost.revisionId,
    });

    const documents: PublishedLearnerContentDocumentWrite[] = [];

    if (input.learnerContent.trialPost) {
      assertRevisionMatchesContent({
        content: input.content,
        revisionId: input.learnerContent.trialPost.revisionId,
      });
      documents.push(
        createDocument({
          content: input.content,
          documentKind: 'post-trial',
          learnerContent: input.learnerContent.trialPost,
        }),
      );
    }

    documents.push(
      createDocument({
        content: input.content,
        documentKind: 'post-full',
        learnerContent: input.learnerContent.fullPost,
      }),
    );

    return documents;
  }

  if (input.learnerContent.contentType === 'quiz') {
    if (input.content.entityType !== 'quiz') {
      throw new Error('Quiz learner content must belong to a quiz entity.');
    }

    assertRevisionMatchesContent({
      content: input.content,
      revisionId: input.learnerContent.quiz.revisionId,
    });

    return [
      createDocument({
        content: input.content,
        documentKind: 'quiz-summary',
        learnerContent: input.learnerContent.quiz,
      }),
    ];
  }

  if (input.content.entityType !== 'demo') {
    throw new Error('Demo learner content must belong to a demo entity.');
  }

  assertRevisionMatchesContent({
    content: input.content,
    revisionId: input.learnerContent.demo.revisionId,
  });

  return [
    createDocument({
      content: input.content,
      documentKind: 'demo-full',
      learnerContent: input.learnerContent.demo,
    }),
  ];
}
