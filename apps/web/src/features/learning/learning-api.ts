import {
  adminContentListQuerySchema,
  avatarFinalizeRequestSchema,
  avatarUploadSessionRequestSchema,
  avatarUploadSessionResponseSchema,
  bootstrapProfileRequestSchema,
  buildApiPath,
  demoViewRequestSchema,
  demoViewResponseSchema,
  learnerProfileResponseSchema,
  learningProgressSnapshotSchema,
  MUST_API_CONTRACTS,
  moduleOverviewViewResponseSchema,
  playgroundConfigCreateRequestSchema,
  playgroundConfigResponseSchema,
  playgroundConfigsListQuerySchema,
  playgroundConfigsResponseSchema,
  playgroundConfigUpdateRequestSchema,
  postViewRequestSchema,
  postViewResponseSchema,
  type RuntimeFeatureManifest,
  updatePreferencesRequestSchema,
} from '@ml-path/contracts';

import {
  createFirebaseAppCheckTokenProvider,
  type AppCheckTokenProvider,
} from '../auth/firebase-app-check-gateway';
import {
  createFirebaseLearningContentReader,
  type LearningContentReader,
} from './firebase-learning-content-gateway';

export type LearnerLocalePreference = 'en' | 'vi';
export type LearnerThemePreference = 'dark' | 'light' | 'system';

export interface LearnerProfile {
  avatarUrl: string | null;
  createdAt?: string | undefined;
  displayName: string;
  locale: LearnerLocalePreference;
  schemaVersion: 1;
  status: 'active' | 'anonymized' | 'deletion-pending';
  theme: LearnerThemePreference;
  uid: string;
}

export type AvatarContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface AvatarUploadSession {
  contentType: AvatarContentType;
  expiresAt: string;
  metadata: {
    schemaVersion: string;
    sha256: string;
    sourceId: string;
  };
  storagePath: string;
  uploadSessionId: string;
}

export class LearningApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LearningApiError';
  }
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
  adapterVersion?: string | undefined;
  algorithmId: string;
  courseId: string;
  demoId: string;
  fixedRun?: LearningDemoFixedRun | undefined;
  moduleId: string;
  problemId: string;
  requiredStepIds: readonly string[];
  resultHash?: string | undefined;
  revisionId: string;
  seed: number;
  sourceIds?: readonly string[] | undefined;
  steps: readonly LearningDemoStep[];
  title: {
    en: string;
    vi: string;
  };
  visualFixture?:
    | {
        hash: string;
        totalDurationMs: number;
        version: 'release-fixed-demo-visual-v1';
      }
    | undefined;
  visualization: LearningDemoVisualization;
}

export interface LearningDemoVisualization {
  boundary: readonly {
    x: number;
    y: number;
  }[];
  points: readonly {
    classification?: 'negative' | 'positive' | undefined;
    label: string;
    positiveFromStep: number;
    x: number;
    y: number;
  }[];
}

export interface LearningDemoFixedRun {
  caption?:
    | {
        en: string;
        vi: string;
      }
    | undefined;
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
  durationMs?: number | undefined;
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
    correctAnswer?: QuizAnswerValue | undefined;
    explanation?:
      | {
          en: string;
          vi: string;
        }
      | undefined;
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

export interface LearningModuleProgress {
  completedStepCount: number;
  moduleId: string;
  overviewViewed: boolean;
  progressPercent: number;
  requiredStepCount: number;
  status: 'completed' | 'in-progress' | 'locked';
}

export interface LearningPostProgress {
  bestScore: number;
  completed: boolean;
  contentViewed: boolean;
  postId: string;
  quizId: string;
  quizPassed: boolean;
  readingPosition: string | null;
  started: boolean;
  viewedItemIds: readonly string[];
}

export interface LearningQuizProgress {
  attemptCount: number;
  bestScore: number;
  passed: boolean;
  quizId: string;
  quizKind: 'module' | 'post';
}

export interface LearningDemoProgress {
  completed: boolean;
  demoId: string;
  started: boolean;
}

export interface LearningCourseProgress {
  courseId: string;
  demos: ReadonlyArray<LearningDemoProgress>;
  modules: ReadonlyArray<LearningModuleProgress>;
  posts: ReadonlyArray<LearningPostProgress>;
  progressPercent: number;
  quizzes: ReadonlyArray<LearningQuizProgress>;
  status: 'completed' | 'in-progress' | 'not-enrolled';
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
  courses?: ReadonlyArray<LearningCourseProgress> | undefined;
  demos: ReadonlyArray<LearningDemoProgress>;
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'completed' | 'in-progress' | 'not-enrolled';
  };
  modules: ReadonlyArray<LearningModuleProgress>;
  posts: ReadonlyArray<LearningPostProgress>;
  quizzes: ReadonlyArray<LearningQuizProgress>;
}

export type AdminContentEntityType = 'course' | 'demo' | 'module' | 'post' | 'quiz';
export type AdminContentPublicationScope = 'emulator-demo' | 'publish-quality';

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
    id?: string | undefined;
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
  publicationScope?: AdminContentPublicationScope | undefined;
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
  trialPostId?: string | null | undefined;
  validationStatus: 'not-run' | 'valid';
}

export interface AdminContentPage {
  content: AdminContentSummary[];
  nextCursor: string | null;
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
  trialPostId?: string | null | undefined;
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
  trialPostId?: string | null | undefined;
}

export interface AdminContentDraftRevisionInput {
  idToken: string;
  revisionId: string;
}

export interface AdminContentPublishRevisionInput extends AdminContentDraftRevisionInput {
  idempotencyKey: string;
  publicationScope: AdminContentPublicationScope;
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

export interface PlaygroundRunPage {
  nextCursor: string | null;
  runs: PlaygroundRunRecord[];
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
  createAvatarUploadSession(input: {
    contentType: AvatarContentType;
    idToken: string;
    sha256: string;
    sizeBytes: number;
  }): Promise<AvatarUploadSession>;
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
  getDemoContent(input: { demoId: string; idToken: string }): Promise<LearningDemoContent>;
  getFullPostContent(input: { idToken: string; postId: string }): Promise<LearningPostContent>;
  getProgress(idToken: string): Promise<LearningProgressSnapshot>;
  getRuntimeFeatureManifest(): Promise<RuntimeFeatureManifest>;
  getTrialPostContent(postId: string): Promise<LearningPostContent>;
  getAdminReportSummary(input: { idToken: string }): Promise<AdminReportSummary>;
  listAdminContent(input: {
    courseId?: string | undefined;
    cursor?: string | undefined;
    entityType?: AdminContentEntityType | undefined;
    idToken: string;
    limit?: number | undefined;
    moduleId?: string | undefined;
  }): Promise<AdminContentPage>;
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
  finalizeAvatarUpload(input: {
    idToken: string;
    uploadSessionId: string;
  }): Promise<LearnerProfile>;
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
    cursor?: string | undefined;
    idToken: string;
    limit?: number | undefined;
    scenarioId?: string | undefined;
  }): Promise<PlaygroundRunPage>;
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

interface ContractSchema<TValue> {
  safeParse(value: unknown): { data: TValue; success: true } | { error: unknown; success: false };
}

interface ErrorEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

async function createLearningApiError(response: Response): Promise<LearningApiError> {
  let body: ErrorEnvelope | undefined;

  try {
    body = (await response.json()) as ErrorEnvelope;
  } catch {
    // Use the generic client-safe error when the response is not JSON.
  }

  const code =
    typeof body?.error?.code === 'string' ? body.error.code : 'LEARNING_API_REQUEST_FAILED';
  const message =
    typeof body?.error?.message === 'string' ? body.error.message : 'Learning API request failed.';

  return new LearningApiError(response.status, code, message);
}

async function readSuccessEnvelope<TData>(
  response: Response,
  schema?: ContractSchema<TData>,
): Promise<TData> {
  if (!response.ok) {
    throw await createLearningApiError(response);
  }

  const body = (await response.json()) as SuccessEnvelope<unknown>;

  if (body.success !== true) {
    throw new Error('Learning API returned an invalid success envelope.');
  }

  if (!schema) {
    return body.data as TData;
  }

  const parsed = schema.safeParse(body.data);

  if (!parsed.success) {
    throw new Error('Learning API returned data that does not match the shared contract.');
  }

  return parsed.data;
}

async function ensureSuccessResponse(response: Response): Promise<void> {
  if (!response.ok) {
    throw await createLearningApiError(response);
  }
}

export function createFetchLearningApiClient(
  options: {
    appCheckTokenProvider?: AppCheckTokenProvider | undefined;
    contentReader?: LearningContentReader | undefined;
  } = {},
): LearningApiClient {
  const appCheckTokenProvider =
    options.appCheckTokenProvider ?? createFirebaseAppCheckTokenProvider();
  const contentReader = options.contentReader ?? createFirebaseLearningContentReader();
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
      const requestBody = bootstrapProfileRequestSchema.parse({ locale, theme });
      const data = await readSuccessEnvelope<{ profile: LearnerProfile }>(
        await fetch(buildApiPath('bootstrapProfile'), {
          body: JSON.stringify(requestBody),
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
        }),
        learnerProfileResponseSchema,
      );

      return data.profile;
    },
    async createAvatarUploadSession({ contentType, idToken, sha256, sizeBytes }) {
      const requestBody = avatarUploadSessionRequestSchema.parse({
        contentType,
        sha256,
        sizeBytes,
      });
      const data = await readSuccessEnvelope<{ uploadSession: AvatarUploadSession }>(
        await fetch(buildApiPath('createAvatarUploadSession'), {
          body: JSON.stringify(requestBody),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
        avatarUploadSessionResponseSchema,
      );

      return data.uploadSession;
    },
    async cancelPlaygroundRunSession({ idToken, sessionId }) {
      return readSuccessEnvelope<PlaygroundRunSessionCancellation>(
        await fetch(buildApiPath('cancelPlaygroundRunSession', { sessionId }), {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.cancelPlaygroundRunSession.response,
      );
    },
    async completeDemo({ demoId, idToken, idempotencyKey, viewedStepIds }) {
      return readSuccessEnvelope<DemoCompletionResult>(
        await fetch(buildApiPath('completeDemo', { demoId }), {
          body: JSON.stringify({ viewedStepIds }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.completeDemo.response,
      );
    },
    async completePost({ idToken, idempotencyKey, postId }) {
      return readSuccessEnvelope<PostCompletionResult>(
        await fetch(buildApiPath('completePost', { postId }), {
          headers: {
            authorization: `Bearer ${idToken}`,
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.completePost.response,
      );
    },
    async recordDemoView({ demoId, idToken, viewedStepIds }) {
      const requestBody = demoViewRequestSchema.parse({ viewedStepIds });
      return readSuccessEnvelope<DemoViewResult>(
        await fetch(buildApiPath('recordDemoView', { demoId }), {
          body: JSON.stringify(requestBody),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
        demoViewResponseSchema,
      );
    },
    async recordModuleOverview({ idToken, moduleId }) {
      return readSuccessEnvelope<ModuleOverviewResult>(
        await fetch(buildApiPath('recordModuleOverviewView', { moduleId }), {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
        moduleOverviewViewResponseSchema,
      );
    },
    async recordPostView({ idToken, postId, readingPosition, viewedItemIds }) {
      const requestBody = postViewRequestSchema.parse({ readingPosition, viewedItemIds });
      return readSuccessEnvelope<PostViewResult>(
        await fetch(buildApiPath('recordPostView', { postId }), {
          body: JSON.stringify(requestBody),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
        postViewResponseSchema,
      );
    },
    async createQuizAttempt({ idToken, quizId }) {
      return readSuccessEnvelope<QuizAttemptResult>(
        await fetch(buildApiPath('createQuizAttempt', { quizId }), {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.createQuizAttempt.response,
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
      const requestBody = playgroundConfigCreateRequestSchema.parse({
        algorithmId,
        config,
        datasetVersionId,
        name,
        scenarioId,
      });
      const data = await readSuccessEnvelope<{ config: PlaygroundConfigRecord }>(
        await fetch(buildApiPath('createPlaygroundConfig'), {
          body: JSON.stringify(requestBody),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
        playgroundConfigResponseSchema,
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
    async finalizeAvatarUpload({ idToken, uploadSessionId }) {
      const requestBody = avatarFinalizeRequestSchema.parse({ uploadSessionId });
      const data = await readSuccessEnvelope<{ profile: LearnerProfile }>(
        await fetch(buildApiPath('finalizeAvatarUpload'), {
          body: JSON.stringify(requestBody),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
        learnerProfileResponseSchema,
      );

      return data.profile;
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
      const requestBody = playgroundConfigUpdateRequestSchema.parse({ config, name });
      const serializedRequestBody = {
        ...(requestBody.name !== undefined ? { name: requestBody.name } : {}),
        ...(requestBody.config !== undefined ? { config: requestBody.config } : {}),
      };

      const data = await readSuccessEnvelope<{ config: PlaygroundConfigRecord }>(
        await fetch(buildApiPath('updatePlaygroundConfig', { configId }), {
          body: JSON.stringify(serializedRequestBody),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'PATCH',
        }),
        playgroundConfigResponseSchema,
      );

      return data.config;
    },
    async enrollCourse({ courseId, idToken, idempotencyKey }) {
      return readSuccessEnvelope<EnrollmentResult>(
        await fetch(buildApiPath('enrollCourse', { courseId }), {
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
            'idempotency-key': idempotencyKey,
          },
        }),
        MUST_API_CONTRACTS.enrollCourse.response,
      );
    },
    async getDemoContent({ demoId }) {
      return contentReader.getDemoContent(demoId);
    },
    async getFullPostContent({ postId }) {
      return contentReader.getFullPostContent(postId);
    },
    async getProgress(idToken) {
      return readSuccessEnvelope<LearningProgressSnapshot>(
        await fetch(buildApiPath('getProgress'), {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
        learningProgressSnapshotSchema,
      );
    },
    async getRuntimeFeatureManifest() {
      return readSuccessEnvelope<RuntimeFeatureManifest>(
        await fetch(buildApiPath('systemFeatures')),
        MUST_API_CONTRACTS.systemFeatures.response,
      );
    },
    async getTrialPostContent(postId) {
      return contentReader.getTrialPostContent(postId);
    },
    async getAdminReportSummary({ idToken }) {
      return readSuccessEnvelope<AdminReportSummary>(
        await fetch(buildApiPath('getAdminReportSummary'), {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
        MUST_API_CONTRACTS.getAdminReportSummary.response,
      );
    },
    async listAdminContent({ courseId, cursor, entityType, idToken, limit, moduleId }) {
      const queryInput = adminContentListQuerySchema.parse({
        courseId,
        cursor,
        entityType,
        limit,
        moduleId,
      });
      const query = new URLSearchParams();

      if (queryInput.entityType !== undefined) {
        query.set('entityType', queryInput.entityType);
      }

      if (queryInput.courseId !== undefined) {
        query.set('courseId', queryInput.courseId);
      }

      if (queryInput.moduleId !== undefined) {
        query.set('moduleId', queryInput.moduleId);
      }

      if (queryInput.cursor !== undefined) {
        query.set('cursor', queryInput.cursor);
      }

      if (queryInput.limit !== undefined) {
        query.set('limit', String(queryInput.limit));
      }

      const queryString = query.toString();
      return readSuccessEnvelope<AdminContentPage>(
        await fetch(`${buildApiPath('listAdminContent')}${queryString ? `?${queryString}` : ''}`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
        MUST_API_CONTRACTS.listAdminContent.response,
      );
    },
    async createAdminContentDraft({ entityId, entityType, idToken }) {
      const data = await readSuccessEnvelope<{ draft: AdminContentDraft }>(
        await fetch(buildApiPath('createAdminContentDraft', { entityId, entityType }), {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.createAdminContentDraft.response,
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
      trialPostId,
    }) {
      const data = await readSuccessEnvelope<{ draft: AdminContentDraft }>(
        await fetch(buildApiPath('updateAdminContentRevision', { revisionId }), {
          body: JSON.stringify({
            revisionVersion,
            title,
            preview,
            metadata,
            ...(trialPostId !== undefined ? { trialPostId } : {}),
          }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'PATCH',
        }),
        MUST_API_CONTRACTS.updateAdminContentRevision.response,
      );

      return data.draft;
    },
    async validateAdminContentDraft({ idToken, revisionId }) {
      const data = await readSuccessEnvelope<{ draft: AdminContentDraft }>(
        await fetch(buildApiPath('validateAdminContentRevision', { revisionId }), {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.validateAdminContentRevision.response,
      );

      return data.draft;
    },
    async publishAdminContentRevision({
      idToken,
      idempotencyKey,
      publicationScope,
      reason,
      revisionId,
    }) {
      const data = await readSuccessEnvelope<{ content: AdminContentSummary }>(
        await fetch(buildApiPath('publishAdminContentRevision', { revisionId }), {
          body: JSON.stringify({ publicationScope, reason }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.publishAdminContentRevision.response,
      );

      return data.content;
    },
    async rollbackAdminContentRevision({ idToken, reason, revisionId }) {
      const data = await readSuccessEnvelope<{ content: AdminContentSummary }>(
        await fetch(buildApiPath('rollbackAdminContentRevision', { revisionId }), {
          body: JSON.stringify({ reason }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.rollbackAdminContentRevision.response,
      );

      return data.content;
    },
    async unpublishAdminContentEntity({ entityId, idToken, reason }) {
      const data = await readSuccessEnvelope<{ content: AdminContentSummary }>(
        await fetch(buildApiPath('unpublishAdminContentEntity', { entityId }), {
          body: JSON.stringify({ reason }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.unpublishAdminContentEntity.response,
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
        await fetch(buildApiPath('createPlaygroundRunSession'), {
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
        MUST_API_CONTRACTS.createPlaygroundRunSession.response,
      );
    },
    async listPlaygroundConfigs({ idToken, scenarioId }) {
      const query = playgroundConfigsListQuerySchema.parse({ scenarioId });
      const data = await readSuccessEnvelope<{ configs: PlaygroundConfigRecord[] }>(
        await fetch(
          `${buildApiPath('listPlaygroundConfigs')}?scenarioId=${encodeURIComponent(query.scenarioId)}`,
          {
            headers: {
              authorization: `Bearer ${idToken}`,
            },
          },
        ),
        playgroundConfigsResponseSchema,
      );

      return data.configs;
    },
    async listPlaygroundRuns({ cursor, idToken, limit, scenarioId }) {
      const query = new URLSearchParams();

      if (scenarioId !== undefined) {
        query.set('scenarioId', scenarioId);
      }

      if (limit !== undefined) {
        query.set('limit', String(limit));
      }

      if (cursor !== undefined) {
        query.set('cursor', cursor);
      }

      const queryString = query.toString();
      const data = await readSuccessEnvelope<PlaygroundRunPage>(
        await fetch(
          `${buildApiPath('listPlaygroundRuns')}${queryString ? `?${queryString}` : ''}`,
          {
            headers: {
              authorization: `Bearer ${idToken}`,
            },
          },
        ),
        MUST_API_CONTRACTS.listPlaygroundRuns.response,
      );

      return data;
    },
    async savePlaygroundRun({ idToken, idempotencyKey, result, sessionId }) {
      const data = await readSuccessEnvelope<{ run: PlaygroundRunRecord }>(
        await fetch(buildApiPath('savePlaygroundRun'), {
          body: JSON.stringify({ sessionId, result }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.savePlaygroundRun.response,
      );

      return data.run;
    },
    async submitQuizAttempt({ answers, attemptId, idToken, idempotencyKey }) {
      return readSuccessEnvelope<QuizSubmissionResult>(
        await fetch(buildApiPath('submitQuizAttempt', { attemptId }), {
          body: JSON.stringify({ answers }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
        MUST_API_CONTRACTS.submitQuizAttempt.response,
      );
    },
    async updatePreferences({ idToken, locale, theme }) {
      const requestBody = updatePreferencesRequestSchema.parse({ locale, theme });

      const data = await readSuccessEnvelope<{ profile: LearnerProfile }>(
        await fetch(buildApiPath('updatePreferences'), {
          body: JSON.stringify(requestBody),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
          },
          method: 'PATCH',
        }),
        learnerProfileResponseSchema,
      );

      return data.profile;
    },
  };
}
