import {
  createFirebaseAppCheckTokenProvider,
  type AppCheckTokenProvider,
} from '../auth/firebase-app-check-gateway';

export type LearnerLocalePreference = 'en' | 'vi';
export type LearnerThemePreference = 'dark' | 'light' | 'system';

export interface LearnerProfile {
  avatarUrl: string | null;
  displayName: string;
  locale: LearnerLocalePreference;
  schemaVersion: 1;
  status: 'active' | 'anonymized' | 'deletion-pending';
  theme: LearnerThemePreference;
  uid: string;
}

export interface EnrollmentResult {
  access: {
    moduleId: string;
  };
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'in-progress';
  };
  nextPath: string;
}

export interface ModuleOverviewResult {
  moduleOverview: {
    moduleId: string;
    nextPostId: string;
    status: 'completed';
  };
}

export interface DemoViewResult {
  demoView: {
    demoId: string;
    started: boolean;
    viewedStepIds: readonly string[];
  };
}

export interface PostCompletionResult {
  completion: {
    postId: string;
    status: 'completed';
  };
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

export interface PostViewResult {
  postView: {
    contentViewed: boolean;
    postId: string;
    readingPosition: string;
    started: boolean;
    viewedItemIds: readonly string[];
  };
}

export interface LearningPostContent {
  accessLevel: 'full' | 'trial';
  blocks: readonly unknown[];
  courseId: string;
  description: {
    en: string;
    vi: string;
  };
  durationMinutes: number;
  id: string;
  moduleId: string;
  postQuizId: string;
  revisionId: string;
  title: {
    en: string;
    vi: string;
  };
}

export interface LearningDemoContent {
  algorithmId: string;
  courseId: string;
  demoId: string;
  fixedRun?: LearningDemoFixedRun;
  moduleId: string;
  problemId: string;
  requiredStepIds: readonly string[];
  revisionId: string;
  seed: number;
  steps: readonly LearningDemoStep[];
  title: {
    en: string;
    vi: string;
  };
  visualization: LearningDemoVisualization;
}

export interface LearningDemoVisualization {
  boundary: readonly {
    x: number;
    y: number;
  }[];
  points: readonly {
    classification?: 'negative' | 'positive';
    label: string;
    positiveFromStep: number;
    x: number;
    y: number;
  }[];
}

export interface LearningDemoFixedRun {
  datasetVersionId: string;
  parameterValues: readonly {
    id: string;
    value: number;
  }[];
  rows: readonly {
    input: readonly number[];
    predictedOutput: number;
    targetOutput: number;
  }[];
}

export interface LearningDemoStep {
  id: string;
  narration: {
    en: string;
    vi: string;
  };
  required: boolean;
  textAlternative: {
    en: string;
    vi: string;
  };
  title: {
    en: string;
    vi: string;
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
    started?: boolean | undefined;
  }>;
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'completed' | 'in-progress' | 'not-enrolled';
  };
  modules: ReadonlyArray<{
    completedStepCount: number;
    moduleId: string;
    overviewViewed?: boolean | undefined;
    progressPercent: number;
    requiredStepCount: number;
    status: 'completed' | 'in-progress' | 'locked';
  }>;
  posts: ReadonlyArray<{
    bestScore: number;
    completed: boolean;
    contentViewed?: boolean | undefined;
    postId: string;
    quizId: string;
    quizPassed: boolean;
    readingPosition?: string | null | undefined;
    started?: boolean | undefined;
    viewedItemIds?: readonly string[] | undefined;
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

export interface AdminContentSourceReview {
  attribution: {
    en: string;
    vi: string;
  };
  license: {
    name: string;
    url: string;
  };
  sourceId: string;
  title: string;
}

export interface AdminContentSummary {
  courseId: string;
  draftRevisionId: string | null;
  entityId: string;
  entityType: AdminContentEntityType;
  localeAvailability: ReadonlyArray<'en' | 'vi'>;
  moduleId?: string | undefined;
  postId?: string | undefined;
  previousPublishedRevisionId?: string | null | undefined;
  preview: {
    en: string;
    vi: string;
  };
  publishedRevisionId: string;
  sourceReview?: AdminContentSourceReview | undefined;
  sourceStatus: 'seeded';
  status: 'published' | 'unpublished';
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
  sourceReview?: AdminContentSourceReview | undefined;
  sourceStatus: 'seeded';
  status: 'draft';
  title: {
    en: string;
    vi: string;
  };
  validationStatus: 'not-run' | 'valid';
}

export interface AdminReportSummary {
  contentLifecycle: {
    draftCount: number;
    publishedCount: number;
    unpublishedCount: number;
    validationPendingCount: number;
  };
  generatedAt: string;
  learningVerified: {
    algorithmUnlocks: ReadonlyArray<{
      algorithmId: string;
      unlockedLearnerCount: number;
    }>;
    courseProgress: ReadonlyArray<{
      averageProgressPercent: number;
      completedCount: number;
      courseId: string;
      enrolledCount: number;
      startedCount: number;
    }>;
    learnerCount: number;
    moduleProgress: ReadonlyArray<{
      completedCount: number;
      completionRate: number;
      moduleId: string;
      startedCount: number;
    }>;
    postProgress: ReadonlyArray<{
      completedCount: number;
      completionRate: number;
      postId: string;
      startedCount: number;
    }>;
    quizSummary: {
      averageScorePercent: number;
      commonWrongQuestions: ReadonlyArray<{
        questionId: string;
        quizId: string;
        wrongCount: number;
      }>;
      passedAttemptCount: number;
      totalAttemptCount: number;
    };
    verificationLevel: 'server-verified';
  };
  playgroundClientReported: {
    errorRate: number;
    failedRunCount: number;
    runCount: number;
    scenarioActivity: ReadonlyArray<{
      algorithmId: string;
      failedRunCount: number;
      runCount: number;
      scenarioId: string;
    }>;
    verificationLevel: 'client-computed';
  };
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

export interface AdminContentDraftRevisionInput {
  idToken: string;
  revisionId: string;
}

export interface AdminContentPublishRevisionInput extends AdminContentDraftRevisionInput {
  idempotencyKey: string;
  reason: string;
}

export interface AdminContentRollbackRevisionInput extends AdminContentDraftRevisionInput {
  reason: string;
}

export interface AdminContentUnpublishEntityInput {
  entityId: string;
  idToken: string;
  reason: string;
}

export type PlaygroundConfig = Record<string, unknown>;
export type PlaygroundMetrics = Record<string, number | null>;

export interface PlaygroundRunSession {
  adapterVersion?: string | undefined;
  algorithmId: string;
  config: PlaygroundConfig;
  configHash: string;
  configSchemaVersion?: 1 | undefined;
  datasetVersionId: string;
  expiresAt: string;
  scenarioId: string;
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
  adapterVersion?: string | undefined;
  algorithmId: string;
  config: PlaygroundRunSession['config'];
  configSchemaVersion?: 1 | undefined;
  createdAt: string;
  datasetVersionId: string;
  durationMs: number;
  feedback: readonly string[];
  isPinned: false;
  metrics: PlaygroundMetrics;
  runId: string;
  scenarioId: string;
  targetReached: null;
  targetVersionId: null;
  verificationLevel: 'client-computed';
}

export interface PlaygroundConfigRecord {
  adapterVersion?: string | undefined;
  algorithmId: string;
  compatibilityReason: string | null;
  compatibilityStatus: 'compatible' | 'incompatible';
  config: PlaygroundRunSession['config'];
  configId: string;
  configSchemaVersion?: 1 | undefined;
  datasetVersionId: string;
  name: string;
  scenarioId: string;
}

export interface LearningApiClient {
  bootstrapProfile(input: {
    idToken: string;
    locale: LearnerLocalePreference;
    theme: LearnerThemePreference;
  }): Promise<LearnerProfile>;
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
  completePost(input: {
    idToken: string;
    idempotencyKey: string;
    postId: string;
  }): Promise<PostCompletionResult>;
  recordDemoView(input: {
    demoId: string;
    idToken: string;
    viewedStepIds: readonly string[];
  }): Promise<DemoViewResult>;
  recordModuleOverview(input: { idToken: string; moduleId: string }): Promise<ModuleOverviewResult>;
  recordPostView(input: {
    idToken: string;
    postId: string;
    readingPosition: string;
    viewedItemIds: readonly string[];
  }): Promise<PostViewResult>;
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
  getAdminAccess?(idToken: string): Promise<boolean>;
  getDemoContent(input: { demoId: string; idToken: string }): Promise<LearningDemoContent>;
  getFullPostContent(input: { idToken: string; postId: string }): Promise<LearningPostContent>;
  getProgress(idToken: string): Promise<LearningProgressSnapshot>;
  getTrialPostContent(postId: string): Promise<LearningPostContent>;
  getAdminReportSummary(input: { idToken: string }): Promise<AdminReportSummary>;
  listAdminContent(input: {
    courseId?: string | undefined;
    entityType?: AdminContentEntityType | undefined;
    idToken: string;
    moduleId?: string | undefined;
  }): Promise<AdminContentSummary[]>;
  publishAdminContentRevision(
    input: AdminContentPublishRevisionInput,
  ): Promise<AdminContentSummary>;
  rollbackAdminContentRevision(
    input: AdminContentRollbackRevisionInput,
  ): Promise<AdminContentSummary>;
  unpublishAdminContentEntity(
    input: AdminContentUnpublishEntityInput,
  ): Promise<AdminContentSummary>;
  updateAdminContentDraft(input: UpdateAdminContentDraftInput): Promise<AdminContentDraft>;
  validateAdminContentDraft(input: AdminContentDraftRevisionInput): Promise<AdminContentDraft>;
  createPlaygroundRunSession(input: {
    algorithmId: string;
    config: PlaygroundRunSession['config'];
    datasetVersionId: string;
    deviceProfile: 'desktop' | 'mobile';
    idToken: string;
    scenarioId: string;
  }): Promise<PlaygroundRunSession>;
  createPlaygroundConfig(input: {
    algorithmId: string;
    config: PlaygroundRunSession['config'];
    datasetVersionId: string;
    idToken: string;
    name: string;
    scenarioId: string;
  }): Promise<PlaygroundConfigRecord>;
  deleteAccount(input: { idToken: string }): Promise<void>;
  deletePlaygroundConfig(input: { configId: string; idToken: string }): Promise<void>;
  deletePlaygroundRun(input: { idToken: string; runId: string }): Promise<void>;
  updatePlaygroundConfig(input: {
    config?: PlaygroundRunSession['config'] | undefined;
    configId: string;
    idToken: string;
    name?: string | undefined;
  }): Promise<PlaygroundConfigRecord>;
  listPlaygroundConfigs(input: {
    idToken: string;
    scenarioId: string;
  }): Promise<PlaygroundConfigRecord[]>;
  listPlaygroundRuns(input: {
    idToken: string;
    scenarioId: string;
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
  updatePreferences(input: {
    idToken: string;
    locale?: LearnerLocalePreference | undefined;
    theme?: LearnerThemePreference | undefined;
  }): Promise<LearnerProfile>;
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

export function createFetchLearningApiClient(
  options: {
    appCheckTokenProvider?: AppCheckTokenProvider | undefined;
  } = {},
): LearningApiClient {
  const appCheckTokenProvider =
    options.appCheckTokenProvider ?? createFirebaseAppCheckTokenProvider();
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const appCheckToken = await appCheckTokenProvider.getToken();

    if (!appCheckToken) {
      return globalThis.fetch(input, init);
    }

    const headers = new Headers(init?.headers);

    headers.set('x-firebase-appcheck', appCheckToken);
    return globalThis.fetch(input, {
      ...init,
      headers: Object.fromEntries(headers.entries()),
    });
  };

  return {
    async bootstrapProfile({ idToken, locale, theme }) {
      const data = await readSuccessEnvelope<{ profile: LearnerProfile }>(
        await fetch('/api/v1/users/me/bootstrap', {
          body: JSON.stringify({
            locale,
            theme,
          }),
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
        }),
      );

      return data.profile;
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
    async completePost({ idToken, idempotencyKey, postId }) {
      return readSuccessEnvelope<PostCompletionResult>(
        await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/completions`, {
          headers: {
            authorization: `Bearer ${idToken}`,
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
      );
    },
    async recordDemoView({ demoId, idToken, viewedStepIds }) {
      return readSuccessEnvelope<DemoViewResult>(
        await fetch(`/api/v1/demos/${encodeURIComponent(demoId)}/views`, {
          body: JSON.stringify({ viewedStepIds }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
      );
    },
    async recordModuleOverview({ idToken, moduleId }) {
      return readSuccessEnvelope<ModuleOverviewResult>(
        await fetch(`/api/v1/module-overviews/${encodeURIComponent(moduleId)}/views`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
      );
    },
    async recordPostView({ idToken, postId, readingPosition, viewedItemIds }) {
      return readSuccessEnvelope<PostViewResult>(
        await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/views`, {
          body: JSON.stringify({ readingPosition, viewedItemIds }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
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
    async deleteAccount({ idToken }) {
      await ensureSuccessResponse(
        await fetch('/api/v1/users/me', {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'DELETE',
        }),
      );
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
    async updatePlaygroundConfig({ config, configId, idToken, name }) {
      const body: { config?: PlaygroundRunSession['config']; name?: string } = {};

      if (name !== undefined) {
        body.name = name;
      }

      if (config !== undefined) {
        body.config = config;
      }

      const data = await readSuccessEnvelope<{ config: PlaygroundConfigRecord }>(
        await fetch(`/api/v1/playground-configs/${encodeURIComponent(configId)}`, {
          body: JSON.stringify(body),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'PATCH',
        }),
      );

      return data.config;
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
    async getDemoContent({ demoId, idToken }) {
      return readSuccessEnvelope<LearningDemoContent>(
        await fetch(`/api/v1/demos/${encodeURIComponent(demoId)}/content`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );
    },
    async getFullPostContent({ idToken, postId }) {
      return readSuccessEnvelope<LearningPostContent>(
        await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/content`, {
          headers: {
            authorization: `Bearer ${idToken}`,
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
    async getTrialPostContent(postId) {
      return readSuccessEnvelope<LearningPostContent>(
        await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/trial-content`),
      );
    },
    async getAdminAccess(idToken) {
      const data = await readSuccessEnvelope<{ isAdmin: boolean }>(
        await fetch('/api/v1/admin/access', {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );

      return data.isAdmin;
    },
    async getAdminReportSummary({ idToken }) {
      return readSuccessEnvelope<AdminReportSummary>(
        await fetch('/api/v1/admin/reports/summary', {
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
    async validateAdminContentDraft({ idToken, revisionId }) {
      const data = await readSuccessEnvelope<{ draft: AdminContentDraft }>(
        await fetch(`/api/v1/admin/revisions/${encodeURIComponent(revisionId)}/validate`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
      );

      return data.draft;
    },
    async publishAdminContentRevision({ idToken, idempotencyKey, reason, revisionId }) {
      const data = await readSuccessEnvelope<{ content: AdminContentSummary }>(
        await fetch(`/api/v1/admin/revisions/${encodeURIComponent(revisionId)}/publish`, {
          body: JSON.stringify({ reason }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
      );

      return data.content;
    },
    async rollbackAdminContentRevision({ idToken, reason, revisionId }) {
      const data = await readSuccessEnvelope<{ content: AdminContentSummary }>(
        await fetch(`/api/v1/admin/revisions/${encodeURIComponent(revisionId)}/rollback`, {
          body: JSON.stringify({ reason }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
      );

      return data.content;
    },
    async unpublishAdminContentEntity({ entityId, idToken, reason }) {
      const data = await readSuccessEnvelope<{ content: AdminContentSummary }>(
        await fetch(`/api/v1/admin/entities/${encodeURIComponent(entityId)}/unpublish`, {
          body: JSON.stringify({ reason }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
      );

      return data.content;
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
    async updatePreferences({ idToken, locale, theme }) {
      const body: {
        locale?: LearnerLocalePreference;
        theme?: LearnerThemePreference;
      } = {};

      if (locale !== undefined) {
        body.locale = locale;
      }

      if (theme !== undefined) {
        body.theme = theme;
      }

      const data = await readSuccessEnvelope<{ profile: LearnerProfile }>(
        await fetch('/api/v1/users/me/preferences', {
          body: JSON.stringify(body),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'PATCH',
        }),
      );

      return data.profile;
    },
  };
}
