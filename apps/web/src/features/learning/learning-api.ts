export interface EnrollmentResult {
  access: {
    moduleId: string;
    postId: string;
  };
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'in-progress';
  };
  nextPath: string;
}

export interface DemoCompletionResult {
  completion: {
    demoId: string;
    status: 'completed';
  };
  event: {
    demoId: string;
    requiredStepIds: readonly string[];
    type: 'demo_completed';
    viewedStepIds: readonly string[];
  };
}

export type QuizQuestionType = 'multiple-choice' | 'single-choice' | 'true-false';

export type QuizAnswerValue = readonly string[] | string;

export interface QuizAnswer {
  questionId: string;
  value: QuizAnswerValue;
}

export interface QuizAttemptResult {
  attempt: {
    attemptId: string;
    attemptNumber: number;
    expiresAt: string;
    passingScorePercent: number;
    questionCount: number;
    quizId: string;
    quizKind: 'module' | 'post';
    quizRevisionId: string;
    requiredCorrectCount: number | null;
    shuffleSeed: string | null;
  };
  mastery: {
    en: string;
    vi: string;
  };
  questions: ReadonlyArray<{
    options: ReadonlyArray<{
      optionId: string;
      text: {
        en: string;
        vi: string;
      };
    }>;
    prompt: {
      en: string;
      vi: string;
    };
    questionId: string;
    sourceId: string;
    type: QuizQuestionType;
  }>;
}

export interface QuizSubmissionResult {
  bestScore: number;
  feedback: ReadonlyArray<{
    correctAnswer?: QuizAnswerValue;
    explanation?: {
      en: string;
      vi: string;
    };
    hint: {
      en: string;
      vi: string;
    } | null;
    hintLevel: 0 | 1 | 2;
    isCorrect: boolean;
    questionId: string;
  }>;
  newlyUnlocked: ReadonlyArray<{ id: string; type: 'algorithm' | 'module' | 'post' }>;
  passed: boolean;
  score: number;
}

export interface LearningProgressSnapshot {
  algorithmUnlocks: ReadonlyArray<{
    algorithmId: string;
    moduleId: string;
  }>;
  contentAccess: ReadonlyArray<{
    contentType: 'demo' | 'module' | 'post';
    entityId: string;
  }>;
  demos: ReadonlyArray<{
    completed: boolean;
    demoId: string;
  }>;
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'completed' | 'in-progress' | 'not-enrolled';
  };
  modules: ReadonlyArray<{
    completedStepCount: number;
    moduleId: string;
    progressPercent: number;
    requiredStepCount: number;
    status: 'completed' | 'in-progress' | 'locked';
  }>;
  posts: ReadonlyArray<{
    bestScore: number;
    completed: boolean;
    postId: string;
    quizId: string;
    quizPassed: boolean;
  }>;
  quizzes: ReadonlyArray<{
    attemptCount: number;
    bestScore: number;
    passed: boolean;
    quizId: string;
    quizKind: 'module' | 'post';
  }>;
}

export type AdminContentEntityType = 'course' | 'demo' | 'module' | 'post' | 'quiz';

export interface AdminContentMetadata {
  attribution: {
    en: string;
    vi: string;
  };
  externalLinkUrl: string | null;
}

export interface AdminContentSummary {
  courseId: string;
  draftRevisionId: string | null;
  entityId: string;
  entityType: AdminContentEntityType;
  localeAvailability: ReadonlyArray<'en' | 'vi'>;
  moduleId?: string | undefined;
  postId?: string | undefined;
  preview: {
    en: string;
    vi: string;
  };
  publishedRevisionId: string;
  sourceStatus: 'seeded';
  status: 'published';
  title: {
    en: string;
    vi: string;
  };
  validationStatus: 'not-run' | 'valid';
}

export interface AdminContentDraft {
  baseRevisionId: string;
  courseId: string;
  draftRevisionId: string;
  entityId: string;
  entityType: AdminContentEntityType;
  localeAvailability: ReadonlyArray<'en' | 'vi'>;
  moduleId?: string | undefined;
  postId?: string | undefined;
  metadata: AdminContentMetadata;
  preview: {
    en: string;
    vi: string;
  };
  revisionVersion: number;
  sourceStatus: 'seeded';
  status: 'draft';
  title: {
    en: string;
    vi: string;
  };
  validationStatus: 'not-run' | 'valid';
}

export interface UpdateAdminContentDraftInput {
  idToken: string;
  metadata: AdminContentMetadata;
  preview: {
    en: string;
    vi: string;
  };
  revisionId: string;
  revisionVersion: number;
  title: {
    en: string;
    vi: string;
  };
}

export interface PlaygroundRunSession {
  algorithmId: 'perceptron';
  config: {
    epochs: number;
    learningRate: number;
    seed: number;
    trainRatio: number;
  };
  configHash: string;
  datasetVersionId: 'ds-xor-noisy-v1';
  expiresAt: string;
  scenarioId: 'pg-xor';
  sessionId: string;
  status: 'issued';
  verificationLevel: 'client-computed';
  workerProtocolVersion: 'ml-worker-v1';
}

export interface PlaygroundRunSessionCancellation {
  sessionId: string;
  status: 'cancelled';
}

export interface PlaygroundRunRecord {
  algorithmId: 'perceptron';
  config: PlaygroundRunSession['config'];
  createdAt: string;
  datasetVersionId: 'ds-xor-noisy-v1';
  durationMs: number;
  feedback: readonly ('linear-limit' | 'non-convergence')[];
  isPinned: false;
  metrics: {
    accuracy: number;
    loss: number;
    testAccuracy: number;
    trainAccuracy: number;
  };
  runId: string;
  scenarioId: 'pg-xor';
  targetReached: null;
  targetVersionId: null;
  verificationLevel: 'client-computed';
}

export interface PlaygroundConfigRecord {
  algorithmId: 'perceptron';
  compatibilityReason: string | null;
  compatibilityStatus: 'compatible' | 'incompatible';
  config: PlaygroundRunSession['config'];
  configId: string;
  datasetVersionId: 'ds-xor-noisy-v1';
  name: string;
  scenarioId: 'pg-xor';
}

export interface LearningApiClient {
  bootstrapProfile(idToken: string): Promise<void>;
  cancelPlaygroundRunSession(input: {
    idToken: string;
    sessionId: string;
  }): Promise<PlaygroundRunSessionCancellation>;
  completeDemo(input: {
    demoId: string;
    idToken: string;
    idempotencyKey: string;
    viewedStepIds: readonly string[];
  }): Promise<DemoCompletionResult>;
  createAdminContentDraft(input: {
    entityId: string;
    entityType: AdminContentEntityType;
    idToken: string;
  }): Promise<AdminContentDraft>;
  createQuizAttempt(input: { idToken: string; quizId: string }): Promise<QuizAttemptResult>;
  enrollCourse(input: {
    courseId: string;
    idToken: string;
    idempotencyKey: string;
  }): Promise<EnrollmentResult>;
  getProgress(idToken: string): Promise<LearningProgressSnapshot>;
  listAdminContent(input: {
    courseId?: string | undefined;
    entityType?: AdminContentEntityType | undefined;
    idToken: string;
    moduleId?: string | undefined;
  }): Promise<AdminContentSummary[]>;
  updateAdminContentDraft(input: UpdateAdminContentDraftInput): Promise<AdminContentDraft>;
  createPlaygroundRunSession(input: {
    algorithmId: 'perceptron';
    config: PlaygroundRunSession['config'];
    datasetVersionId: 'ds-xor-noisy-v1';
    deviceProfile: 'desktop' | 'mobile';
    idToken: string;
    scenarioId: 'pg-xor';
  }): Promise<PlaygroundRunSession>;
  createPlaygroundConfig(input: {
    algorithmId: 'perceptron';
    config: PlaygroundRunSession['config'];
    datasetVersionId: 'ds-xor-noisy-v1';
    idToken: string;
    name: string;
    scenarioId: 'pg-xor';
  }): Promise<PlaygroundConfigRecord>;
  deletePlaygroundConfig(input: { configId: string; idToken: string }): Promise<void>;
  deletePlaygroundRun(input: { idToken: string; runId: string }): Promise<void>;
  listPlaygroundConfigs(input: {
    idToken: string;
    scenarioId: 'pg-xor';
  }): Promise<PlaygroundConfigRecord[]>;
  listPlaygroundRuns(input: {
    idToken: string;
    scenarioId: 'pg-xor';
  }): Promise<PlaygroundRunRecord[]>;
  savePlaygroundRun(input: {
    idToken: string;
    idempotencyKey: string;
    result: unknown;
    sessionId: string;
  }): Promise<PlaygroundRunRecord>;
  submitQuizAttempt(input: {
    answers: readonly QuizAnswer[];
    attemptId: string;
    idToken: string;
    idempotencyKey: string;
  }): Promise<QuizSubmissionResult>;
}

interface SuccessEnvelope<TData> {
  data: TData;
  success: true;
}

async function readSuccessEnvelope<TData>(response: Response): Promise<TData> {
  if (!response.ok) {
    throw new Error('Learning API request failed.');
  }

  const body = (await response.json()) as SuccessEnvelope<TData>;

  if (body.success !== true) {
    throw new Error('Learning API returned an invalid success envelope.');
  }

  return body.data;
}

async function ensureSuccessResponse(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error('Learning API request failed.');
  }
}

export function createFetchLearningApiClient(): LearningApiClient {
  return {
    async bootstrapProfile(idToken) {
      await readSuccessEnvelope(
        await fetch('/api/v1/users/me/bootstrap', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );
    },
    async cancelPlaygroundRunSession({ idToken, sessionId }) {
      return readSuccessEnvelope<PlaygroundRunSessionCancellation>(
        await fetch(
          `/api/v1/playground-run-sessions/${encodeURIComponent(sessionId)}/cancellations`,
          {
            headers: {
              authorization: `Bearer ${idToken}`,
            },
            method: 'POST',
          },
        ),
      );
    },
    async completeDemo({ demoId, idToken, idempotencyKey, viewedStepIds }) {
      return readSuccessEnvelope<DemoCompletionResult>(
        await fetch(`/api/v1/demos/${encodeURIComponent(demoId)}/completions`, {
          body: JSON.stringify({ viewedStepIds }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
      );
    },
    async createQuizAttempt({ idToken, quizId }) {
      return readSuccessEnvelope<QuizAttemptResult>(
        await fetch(`/api/v1/quizzes/${encodeURIComponent(quizId)}/attempts`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
      );
    },
    async createPlaygroundConfig({
      algorithmId,
      config,
      datasetVersionId,
      idToken,
      name,
      scenarioId,
    }) {
      const data = await readSuccessEnvelope<{ config: PlaygroundConfigRecord }>(
        await fetch('/api/v1/playground-configs', {
          body: JSON.stringify({
            name,
            scenarioId,
            algorithmId,
            datasetVersionId,
            config,
          }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
      );

      return data.config;
    },
    async deletePlaygroundConfig({ configId, idToken }) {
      await ensureSuccessResponse(
        await fetch(`/api/v1/playground-configs/${encodeURIComponent(configId)}`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'DELETE',
        }),
      );
    },
    async deletePlaygroundRun({ idToken, runId }) {
      await ensureSuccessResponse(
        await fetch(`/api/v1/playground-runs/${encodeURIComponent(runId)}`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'DELETE',
        }),
      );
    },
    async enrollCourse({ courseId, idToken, idempotencyKey }) {
      return readSuccessEnvelope<EnrollmentResult>(
        await fetch(`/api/v1/courses/${encodeURIComponent(courseId)}/enrollments`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
            'idempotency-key': idempotencyKey,
          },
        }),
      );
    },
    async getProgress(idToken) {
      return readSuccessEnvelope<LearningProgressSnapshot>(
        await fetch('/api/v1/users/me/progress', {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );
    },
    async listAdminContent({ courseId, entityType, idToken, moduleId }) {
      const query = new URLSearchParams();

      if (entityType !== undefined) {
        query.set('entityType', entityType);
      }

      if (courseId !== undefined) {
        query.set('courseId', courseId);
      }

      if (moduleId !== undefined) {
        query.set('moduleId', moduleId);
      }

      const queryString = query.toString();
      const data = await readSuccessEnvelope<{ content: AdminContentSummary[] }>(
        await fetch(`/api/v1/admin/content${queryString ? `?${queryString}` : ''}`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );

      return data.content;
    },
    async createAdminContentDraft({ entityId, entityType, idToken }) {
      const data = await readSuccessEnvelope<{ draft: AdminContentDraft }>(
        await fetch(
          `/api/v1/admin/content/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/drafts`,
          {
            headers: {
              authorization: `Bearer ${idToken}`,
            },
            method: 'POST',
          },
        ),
      );

      return data.draft;
    },
    async updateAdminContentDraft({
      idToken,
      metadata,
      preview,
      revisionId,
      revisionVersion,
      title,
    }) {
      const data = await readSuccessEnvelope<{ draft: AdminContentDraft }>(
        await fetch(`/api/v1/admin/revisions/${encodeURIComponent(revisionId)}`, {
          body: JSON.stringify({
            revisionVersion,
            title,
            preview,
            metadata,
          }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'PATCH',
        }),
      );

      return data.draft;
    },
    async createPlaygroundRunSession({
      algorithmId,
      config,
      datasetVersionId,
      deviceProfile,
      idToken,
      scenarioId,
    }) {
      return readSuccessEnvelope<PlaygroundRunSession>(
        await fetch('/api/v1/playground-run-sessions', {
          body: JSON.stringify({
            scenarioId,
            algorithmId,
            datasetVersionId,
            deviceProfile,
            config,
          }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
      );
    },
    async listPlaygroundConfigs({ idToken, scenarioId }) {
      const data = await readSuccessEnvelope<{ configs: PlaygroundConfigRecord[] }>(
        await fetch(`/api/v1/playground-configs?scenarioId=${encodeURIComponent(scenarioId)}`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );

      return data.configs;
    },
    async listPlaygroundRuns({ idToken, scenarioId }) {
      const data = await readSuccessEnvelope<{ runs: PlaygroundRunRecord[] }>(
        await fetch(`/api/v1/playground-runs?scenarioId=${encodeURIComponent(scenarioId)}`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );

      return data.runs;
    },
    async savePlaygroundRun({ idToken, idempotencyKey, result, sessionId }) {
      const data = await readSuccessEnvelope<{ run: PlaygroundRunRecord }>(
        await fetch('/api/v1/playground-runs', {
          body: JSON.stringify({ sessionId, result }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
      );

      return data.run;
    },
    async submitQuizAttempt({ answers, attemptId, idToken, idempotencyKey }) {
      return readSuccessEnvelope<QuizSubmissionResult>(
        await fetch(`/api/v1/quiz-attempts/${encodeURIComponent(attemptId)}/submissions`, {
          body: JSON.stringify({ answers }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
      );
    },
  };
}
