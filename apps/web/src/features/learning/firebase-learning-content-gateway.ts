import {
  getPublishedLearnerContentDocumentId,
  publishedLearnerContentDocumentSchema,
  type LearnerCourseContent,
  type LearnerDemoContent,
  type LearnerModuleContent,
  type LearnerPostContent,
  type LearnerQuizContent,
  type PublishedLearnerContentDocument,
} from '@ml-path/contracts';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

import { getConfiguredFirebaseApp, isFirebaseEmulator } from '../auth/firebase-auth-gateway';

const LOCAL_FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const LOCAL_FIRESTORE_EMULATOR_PORT = 8080;
const PUBLISHED_LEARNER_CONTENT_COLLECTION = 'publishedLearnerContent';

const connectedEmulatorAppNames = new Set<string>();

export interface LearningContentReader {
  getCourseContent(courseId: string): Promise<LearnerCourseContent>;
  getDemoContent(demoId: string): Promise<LearnerDemoContent>;
  getFullPostContent(postId: string): Promise<LearnerPostContent>;
  getModuleContent(moduleId: string): Promise<LearnerModuleContent>;
  getQuizContent(quizId: string): Promise<LearnerQuizContent>;
  getTrialPostContent(postId: string): Promise<LearnerPostContent>;
}

export class LearningContentReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningContentReadError';
  }
}

function getConfiguredFirestore(): Firestore {
  const app = getConfiguredFirebaseApp();

  if (!app) {
    throw new LearningContentReadError('Learning content is not configured for this environment.');
  }

  const firestore = getFirestore(app);

  if (isFirebaseEmulator() && !connectedEmulatorAppNames.has(app.name)) {
    connectFirestoreEmulator(
      firestore,
      LOCAL_FIRESTORE_EMULATOR_HOST,
      LOCAL_FIRESTORE_EMULATOR_PORT,
    );
    connectedEmulatorAppNames.add(app.name);
  }

  return firestore;
}

function assertExpectedDocument(input: {
  document: PublishedLearnerContentDocument;
  documentKind: PublishedLearnerContentDocument['documentKind'];
  entityId: string;
}): PublishedLearnerContentDocument {
  if (
    input.document.documentKind !== input.documentKind ||
    input.document.entityId !== input.entityId
  ) {
    throw new LearningContentReadError(
      'Learning content does not match the requested stable identifier.',
    );
  }

  return input.document;
}

async function readPublishedDocument(input: {
  documentId: string;
  documentKind: PublishedLearnerContentDocument['documentKind'];
  entityId: string;
}): Promise<PublishedLearnerContentDocument> {
  const snapshot = await getDoc(
    doc(getConfiguredFirestore(), PUBLISHED_LEARNER_CONTENT_COLLECTION, input.documentId),
  );

  if (!snapshot.exists()) {
    throw new LearningContentReadError('The requested learning content is unavailable.');
  }

  const parsed = publishedLearnerContentDocumentSchema.safeParse(snapshot.data());

  if (!parsed.success) {
    throw new LearningContentReadError(
      'Published learning content does not match the shared contract.',
    );
  }

  return assertExpectedDocument({ ...input, document: parsed.data });
}

export function createFirebaseLearningContentReader(): LearningContentReader {
  return {
    async getCourseContent(courseId) {
      const document = await readPublishedDocument({
        documentId: getPublishedLearnerContentDocumentId({
          documentKind: 'course-summary',
          entityId: courseId,
        }),
        documentKind: 'course-summary',
        entityId: courseId,
      });

      if (document.documentKind !== 'course-summary') {
        throw new LearningContentReadError('The requested content is not a course.');
      }

      return document.content;
    },
    async getDemoContent(demoId) {
      const document = await readPublishedDocument({
        documentId: getPublishedLearnerContentDocumentId({
          documentKind: 'demo-full',
          entityId: demoId,
        }),
        documentKind: 'demo-full',
        entityId: demoId,
      });

      if (document.documentKind !== 'demo-full') {
        throw new LearningContentReadError('The requested content is not a demo.');
      }

      return document.content;
    },
    async getModuleContent(moduleId) {
      const document = await readPublishedDocument({
        documentId: getPublishedLearnerContentDocumentId({
          documentKind: 'module-summary',
          entityId: moduleId,
        }),
        documentKind: 'module-summary',
        entityId: moduleId,
      });

      if (document.documentKind !== 'module-summary') {
        throw new LearningContentReadError('The requested content is not a module.');
      }

      return document.content;
    },
    async getFullPostContent(postId) {
      const document = await readPublishedDocument({
        documentId: getPublishedLearnerContentDocumentId({
          documentKind: 'post-full',
          entityId: postId,
        }),
        documentKind: 'post-full',
        entityId: postId,
      });

      if (document.documentKind !== 'post-full') {
        throw new LearningContentReadError('The requested content is not a full post.');
      }

      return document.content;
    },
    async getQuizContent(quizId) {
      const document = await readPublishedDocument({
        documentId: getPublishedLearnerContentDocumentId({
          documentKind: 'quiz-summary',
          entityId: quizId,
        }),
        documentKind: 'quiz-summary',
        entityId: quizId,
      });

      if (document.documentKind !== 'quiz-summary') {
        throw new LearningContentReadError('The requested content is not a quiz.');
      }

      return document.content;
    },
    async getTrialPostContent(postId) {
      const document = await readPublishedDocument({
        documentId: getPublishedLearnerContentDocumentId({
          documentKind: 'post-trial',
          entityId: postId,
        }),
        documentKind: 'post-trial',
        entityId: postId,
      });

      if (document.documentKind !== 'post-trial') {
        throw new LearningContentReadError('The requested content is not a trial post.');
      }

      return document.content;
    },
  };
}
