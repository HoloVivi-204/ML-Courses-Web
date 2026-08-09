import { z } from 'zod';

import { API_ROUTE_CATALOG, type ApiRouteId } from './api-route-catalog.js';
import {
  adminContentDraftPatchRequestSchema,
  adminContentEntityTypeSchema,
  adminContentListQuerySchema,
  adminContentMetadataSchema,
  adminContentPathParamsSchema,
  adminContentPublicationScopeSchema,
  adminEntityPathParamsSchema,
  adminLifecycleRequestSchema,
  adminPublishRequestSchema,
  adminRevisionPathParamsSchema,
  avatarFinalizeRequestSchema,
  avatarUploadSessionRequestSchema,
  avatarUploadSessionResponseSchema,
  bootstrapProfileRequestSchema,
  courseEnrollmentPathParamsSchema,
  courseEnrollmentResponseSchema,
  demoCompletionRequestSchema,
  demoCompletionResponseSchema,
  demoViewPathParamsSchema,
  demoViewRequestSchema,
  demoViewResponseSchema,
  jsonObjectSchema,
  learnerProfileResponseSchema,
  learningProgressSnapshotSchema,
  localizedTextSchema,
  moduleOverviewViewPathParamsSchema,
  moduleOverviewViewResponseSchema,
  playgroundConfigCreateRequestSchema,
  playgroundConfigPathParamsSchema,
  playgroundConfigRecordSchema,
  playgroundConfigsListQuerySchema,
  playgroundConfigUpdateRequestSchema,
  playgroundRunPathParamsSchema,
  playgroundRunSaveRequestSchema,
  playgroundRunSessionCancellationPathParamsSchema,
  playgroundRunSessionRequestSchema,
  playgroundRunsListQuerySchema,
  postCompletionResponseSchema,
  postViewPathParamsSchema,
  postViewRequestSchema,
  postViewResponseSchema,
  quizAnswerValueSchema,
  quizAttemptPathParamsSchema,
  quizSubmissionPathParamsSchema,
  quizSubmissionRequestSchema,
  stableIdSchema,
  updatePreferencesRequestSchema,
} from './api-schemas.js';
import { runtimeFeatureManifestSchema } from './feature-flags.js';

export type MustApiRouteId = Extract<(typeof API_ROUTE_CATALOG)[number], { scope: 'must' }>['id'];

export interface ApiRouteContract {
  request: z.ZodType;
  response: z.ZodType;
}

export const noRequestSchema = z.undefined();
export const noContentResponseSchema = z.undefined();

export const idempotencyHeadersSchema = z
  .object({
    'idempotency-key': z.string().trim().min(1).max(200),
  })
  .strict();

export const courseEnrollmentRequestSchema = z
  .object({
    headers: idempotencyHeadersSchema,
    params: courseEnrollmentPathParamsSchema,
  })
  .strict();

export const postCompletionRequestSchema = z
  .object({
    headers: idempotencyHeadersSchema,
    params: z.object({ postId: stableIdSchema }).strict(),
  })
  .strict();

export const demoCompletionRouteRequestSchema = z
  .object({
    body: demoCompletionRequestSchema,
    headers: idempotencyHeadersSchema,
    params: z.object({ demoId: stableIdSchema }).strict(),
  })
  .strict();

export const quizAttemptRouteRequestSchema = z
  .object({ params: quizAttemptPathParamsSchema })
  .strict();

export const quizSubmissionRouteRequestSchema = z
  .object({
    body: quizSubmissionRequestSchema,
    headers: idempotencyHeadersSchema,
    params: quizSubmissionPathParamsSchema,
  })
  .strict();

const quizQuestionTypeSchema = z.enum(['multiple-choice', 'single-choice', 'true-false']);

export const quizAttemptResponseSchema = z
  .object({
    attempt: z
      .object({
        attemptId: stableIdSchema,
        attemptNumber: z.number().int().min(1),
        expiresAt: z.string().datetime(),
        passingScorePercent: z.number().min(0).max(100),
        questionCount: z.number().int().min(1).max(160),
        quizId: stableIdSchema,
        quizKind: z.enum(['module', 'post']),
        quizRevisionId: stableIdSchema,
        requiredCorrectCount: z.number().int().min(0).nullable(),
        shuffleSeed: z.string().min(1).max(512).nullable(),
      })
      .strict(),
    mastery: localizedTextSchema,
    questions: z
      .array(
        z
          .object({
            options: z
              .array(
                z
                  .object({
                    optionId: stableIdSchema,
                    text: localizedTextSchema,
                  })
                  .strict(),
              )
              .min(2)
              .max(12),
            prompt: localizedTextSchema,
            questionId: stableIdSchema,
            sourceId: stableIdSchema,
            type: quizQuestionTypeSchema,
          })
          .strict(),
      )
      .min(1)
      .max(160),
  })
  .strict();

export const quizSubmissionResponseSchema = z
  .object({
    bestScore: z.number().min(0).max(100),
    feedback: z
      .array(
        z
          .object({
            correctAnswer: quizAnswerValueSchema.optional(),
            explanation: localizedTextSchema.optional(),
            hint: localizedTextSchema.nullable(),
            hintLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
            isCorrect: z.boolean(),
            questionId: stableIdSchema,
          })
          .strict(),
      )
      .max(160),
    newlyUnlocked: z
      .array(
        z
          .object({
            id: stableIdSchema,
            type: z.enum(['algorithm', 'module', 'post']),
          })
          .strict(),
      )
      .max(160),
    passed: z.boolean(),
    score: z.number().min(0).max(100),
  })
  .strict();

export const playgroundRunSessionResponseSchema = z
  .object({
    adapterVersion: stableIdSchema.optional(),
    algorithmId: stableIdSchema,
    config: jsonObjectSchema,
    configHash: z.string().regex(/^[a-f0-9]{64}$/),
    configSchemaVersion: z.literal(1).optional(),
    datasetVersionId: stableIdSchema,
    expiresAt: z.string().datetime(),
    scenarioId: stableIdSchema,
    sessionId: stableIdSchema,
    status: z.literal('issued'),
    verificationLevel: z.literal('client-computed'),
    workerProtocolVersion: z.literal('ml-worker-v1'),
  })
  .strict();

export const playgroundRunSessionCancellationResponseSchema = z
  .object({
    sessionId: stableIdSchema,
    status: z.literal('cancelled'),
  })
  .strict();

export const playgroundRunRecordSchema = z
  .object({
    adapterVersion: stableIdSchema.optional(),
    algorithmId: stableIdSchema,
    config: jsonObjectSchema,
    configSchemaVersion: z.literal(1).optional(),
    createdAt: z.string().datetime(),
    datasetVersionId: stableIdSchema,
    durationMs: z.number().int().min(0),
    feedback: z.array(z.string().trim().min(1).max(1_000)).max(100),
    isPinned: z.literal(false),
    metrics: z.record(z.string().trim().min(1).max(160), z.number().finite().nullable()),
    runId: stableIdSchema,
    scenarioId: stableIdSchema,
    targetReached: z.null(),
    targetVersionId: z.null(),
    verificationLevel: z.literal('client-computed'),
  })
  .strict();

export const playgroundRunSaveResponseSchema = z
  .object({ run: playgroundRunRecordSchema })
  .strict();

export const playgroundRunsPageResponseSchema = z
  .object({
    nextCursor: stableIdSchema.nullable(),
    runs: z.array(playgroundRunRecordSchema).max(50),
  })
  .strict();

export const adminContentSourceReviewSchema = z
  .object({
    attribution: localizedTextSchema,
    license: z
      .object({
        id: stableIdSchema.optional(),
        name: z.string().trim().min(1).max(240),
        url: z.string().url().max(2_048),
      })
      .strict(),
    sourceId: stableIdSchema,
    title: z.string().trim().min(1).max(500),
  })
  .strict();

export const adminContentValidationManifestSchema = z
  .object({
    blockCount: z.number().int().min(0).optional(),
    problemId: stableIdSchema.optional(),
    questionCount: z.number().int().min(0).optional(),
    taskFingerprints: z.array(stableIdSchema).max(400).optional(),
  })
  .strict();

export const adminContentSummarySchema = z
  .object({
    courseId: stableIdSchema,
    draftRevisionId: stableIdSchema.nullable(),
    emergencyBlocked: z.boolean(),
    entityId: stableIdSchema,
    entityType: adminContentEntityTypeSchema,
    localeAvailability: z
      .array(z.enum(['en', 'vi']))
      .min(1)
      .max(2),
    moduleId: stableIdSchema.optional(),
    postId: stableIdSchema.optional(),
    previousPublishedRevisionId: stableIdSchema.nullable().optional(),
    preview: localizedTextSchema,
    publicationScope: adminContentPublicationScopeSchema.optional(),
    publishedRevisionId: stableIdSchema,
    sourceReview: adminContentSourceReviewSchema,
    sourceStatus: z.literal('seeded'),
    status: z.enum(['published', 'unpublished']),
    title: localizedTextSchema,
    validationManifest: adminContentValidationManifestSchema.optional(),
    validationStatus: z.enum(['not-run', 'valid']),
  })
  .strict();

export const adminContentDraftSchema = z
  .object({
    baseRevisionId: stableIdSchema,
    courseId: stableIdSchema,
    draftRevisionId: stableIdSchema,
    entityId: stableIdSchema,
    entityType: adminContentEntityTypeSchema,
    localeAvailability: z
      .array(z.enum(['en', 'vi']))
      .min(1)
      .max(2),
    metadata: adminContentMetadataSchema,
    moduleId: stableIdSchema.optional(),
    postId: stableIdSchema.optional(),
    preview: localizedTextSchema,
    revisionVersion: z.number().int().min(1),
    sourceReview: adminContentSourceReviewSchema,
    sourceStatus: z.literal('seeded'),
    status: z.literal('draft'),
    title: localizedTextSchema,
    validationManifest: adminContentValidationManifestSchema.optional(),
    validationStatus: z.enum(['not-run', 'valid']),
  })
  .strict();

export const adminContentValidationResultSchema = z
  .object({
    checks: z
      .array(
        z
          .object({
            checkId: stableIdSchema,
            message: z.string().trim().min(1).max(2_000),
            status: z.enum(['failed', 'passed']),
          })
          .strict(),
      )
      .max(100),
    revisionId: stableIdSchema,
    status: z.literal('valid'),
  })
  .strict();

export const adminContentLifecycleEventSchema = z
  .object({
    actorUid: stableIdSchema,
    createdAt: z.string().datetime(),
    entityId: stableIdSchema,
    entityType: adminContentEntityTypeSchema,
    fromRevisionId: stableIdSchema.nullable(),
    publicationScope: adminContentPublicationScopeSchema.optional(),
    reason: z.string().trim().min(1).max(240),
    requestId: z.string().uuid(),
    toRevisionId: stableIdSchema.nullable(),
    type: z.enum(['emergency-withdrawn', 'published', 'rolled-back', 'unpublished']),
  })
  .strict();

export const adminContentListResponseSchema = z
  .object({
    content: z.array(adminContentSummarySchema).max(100),
    nextCursor: stableIdSchema.nullable(),
  })
  .strict();

export const adminContentCreateDraftResponseSchema = z
  .object({
    draft: adminContentDraftSchema,
    published: adminContentSummarySchema,
  })
  .strict();

export const adminContentDraftResponseSchema = z
  .object({ draft: adminContentDraftSchema })
  .strict();

export const adminContentValidationResponseSchema = z
  .object({
    draft: adminContentDraftSchema,
    validation: adminContentValidationResultSchema,
  })
  .strict();

export const adminContentLifecycleResponseSchema = z
  .object({
    content: adminContentSummarySchema,
    lifecycleEvent: adminContentLifecycleEventSchema,
  })
  .strict();

const reportCountSchema = z.number().int().min(0);

export const adminReportSummaryResponseSchema = z
  .object({
    contentLifecycle: z
      .object({
        draftCount: reportCountSchema,
        publishedCount: reportCountSchema,
        unpublishedCount: reportCountSchema,
        validationPendingCount: reportCountSchema,
      })
      .strict(),
    generatedAt: z.string().datetime(),
    learningVerified: z
      .object({
        algorithmUnlocks: z
          .array(
            z
              .object({
                algorithmId: stableIdSchema,
                unlockedLearnerCount: reportCountSchema,
              })
              .strict(),
          )
          .max(1_000),
        courseProgress: z
          .array(
            z
              .object({
                averageProgressPercent: z.number().min(0).max(100),
                completedCount: reportCountSchema,
                courseId: stableIdSchema,
                enrolledCount: reportCountSchema,
                startedCount: reportCountSchema,
              })
              .strict(),
          )
          .max(1_000),
        learnerCount: reportCountSchema,
        moduleProgress: z
          .array(
            z
              .object({
                completedCount: reportCountSchema,
                completionRate: z.number().min(0).max(1),
                moduleId: stableIdSchema,
                startedCount: reportCountSchema,
              })
              .strict(),
          )
          .max(1_000),
        postProgress: z
          .array(
            z
              .object({
                completedCount: reportCountSchema,
                completionRate: z.number().min(0).max(1),
                postId: stableIdSchema,
                startedCount: reportCountSchema,
              })
              .strict(),
          )
          .max(1_000),
        quizSummary: z
          .object({
            averageScorePercent: z.number().min(0).max(100),
            commonWrongQuestions: z
              .array(
                z
                  .object({
                    questionId: stableIdSchema,
                    quizId: stableIdSchema,
                    wrongCount: reportCountSchema,
                  })
                  .strict(),
              )
              .max(1_000),
            passedAttemptCount: reportCountSchema,
            totalAttemptCount: reportCountSchema,
          })
          .strict(),
        verificationLevel: z.literal('server-verified'),
      })
      .strict(),
    playgroundClientReported: z
      .object({
        errorRate: z.number().min(0).max(1),
        failedRunCount: reportCountSchema,
        runCount: reportCountSchema,
        scenarioActivity: z
          .array(
            z
              .object({
                algorithmId: stableIdSchema,
                failedRunCount: reportCountSchema,
                runCount: reportCountSchema,
                scenarioId: stableIdSchema,
              })
              .strict(),
          )
          .max(1_000),
        verificationLevel: z.literal('client-computed'),
      })
      .strict(),
  })
  .strict();

const adminContentCreateDraftRequestSchema = z
  .object({ params: adminContentPathParamsSchema })
  .strict();

const adminDraftPatchRouteRequestSchema = z
  .object({
    body: adminContentDraftPatchRequestSchema,
    params: adminRevisionPathParamsSchema,
  })
  .strict();

const adminRevisionLifecycleRouteRequestSchema = z
  .object({
    body: adminLifecycleRequestSchema,
    params: adminRevisionPathParamsSchema,
  })
  .strict();

const adminPublishRouteRequestSchema = z
  .object({
    body: adminPublishRequestSchema,
    headers: idempotencyHeadersSchema,
    params: adminRevisionPathParamsSchema,
  })
  .strict();

const adminUnpublishRouteRequestSchema = z
  .object({
    body: adminLifecycleRequestSchema,
    params: adminEntityPathParamsSchema,
  })
  .strict();

const playgroundRunSessionRouteRequestSchema = z
  .object({ body: playgroundRunSessionRequestSchema })
  .strict();

const playgroundRunSessionCancellationRouteRequestSchema = z
  .object({ params: playgroundRunSessionCancellationPathParamsSchema })
  .strict();

const playgroundRunSaveRouteRequestSchema = z
  .object({
    body: playgroundRunSaveRequestSchema,
    headers: idempotencyHeadersSchema,
  })
  .strict();

const playgroundRunsListRouteRequestSchema = z
  .object({ query: playgroundRunsListQuerySchema })
  .strict();

const playgroundConfigCreateRouteRequestSchema = z
  .object({ body: playgroundConfigCreateRequestSchema })
  .strict();

const playgroundConfigListRouteRequestSchema = z
  .object({ query: playgroundConfigsListQuerySchema })
  .strict();

const playgroundConfigUpdateRouteRequestSchema = z
  .object({
    body: playgroundConfigUpdateRequestSchema,
    params: playgroundConfigPathParamsSchema,
  })
  .strict();

const playgroundConfigDeleteRouteRequestSchema = z
  .object({ params: playgroundConfigPathParamsSchema })
  .strict();

const playgroundRunDeleteRouteRequestSchema = z
  .object({ params: playgroundRunPathParamsSchema })
  .strict();

export const MUST_API_CONTRACTS = {
  systemFeatures: { request: noRequestSchema, response: runtimeFeatureManifestSchema },
  bootstrapProfile: {
    request: bootstrapProfileRequestSchema,
    response: learnerProfileResponseSchema,
  },
  updatePreferences: {
    request: updatePreferencesRequestSchema,
    response: learnerProfileResponseSchema,
  },
  createAvatarUploadSession: {
    request: avatarUploadSessionRequestSchema,
    response: avatarUploadSessionResponseSchema,
  },
  finalizeAvatarUpload: {
    request: avatarFinalizeRequestSchema,
    response: learnerProfileResponseSchema,
  },
  deleteAccount: { request: noRequestSchema, response: noContentResponseSchema },
  enrollCourse: {
    request: courseEnrollmentRequestSchema,
    response: courseEnrollmentResponseSchema,
  },
  recordModuleOverviewView: {
    request: moduleOverviewViewPathParamsSchema,
    response: moduleOverviewViewResponseSchema,
  },
  recordPostView: {
    request: z.object({ body: postViewRequestSchema, params: postViewPathParamsSchema }).strict(),
    response: postViewResponseSchema,
  },
  completePost: { request: postCompletionRequestSchema, response: postCompletionResponseSchema },
  recordDemoView: {
    request: z.object({ body: demoViewRequestSchema, params: demoViewPathParamsSchema }).strict(),
    response: demoViewResponseSchema,
  },
  completeDemo: {
    request: demoCompletionRouteRequestSchema,
    response: demoCompletionResponseSchema,
  },
  createQuizAttempt: {
    request: quizAttemptRouteRequestSchema,
    response: quizAttemptResponseSchema,
  },
  submitQuizAttempt: {
    request: quizSubmissionRouteRequestSchema,
    response: quizSubmissionResponseSchema,
  },
  getProgress: { request: noRequestSchema, response: learningProgressSnapshotSchema },
  createPlaygroundRunSession: {
    request: playgroundRunSessionRouteRequestSchema,
    response: playgroundRunSessionResponseSchema,
  },
  cancelPlaygroundRunSession: {
    request: playgroundRunSessionCancellationRouteRequestSchema,
    response: playgroundRunSessionCancellationResponseSchema,
  },
  savePlaygroundRun: {
    request: playgroundRunSaveRouteRequestSchema,
    response: playgroundRunSaveResponseSchema,
  },
  listPlaygroundRuns: {
    request: playgroundRunsListRouteRequestSchema,
    response: playgroundRunsPageResponseSchema,
  },
  deletePlaygroundRun: {
    request: playgroundRunDeleteRouteRequestSchema,
    response: noContentResponseSchema,
  },
  listPlaygroundConfigs: {
    request: playgroundConfigListRouteRequestSchema,
    response: z.object({ configs: z.array(playgroundConfigRecordSchema) }).strict(),
  },
  createPlaygroundConfig: {
    request: playgroundConfigCreateRouteRequestSchema,
    response: z.object({ config: playgroundConfigRecordSchema }).strict(),
  },
  updatePlaygroundConfig: {
    request: playgroundConfigUpdateRouteRequestSchema,
    response: z.object({ config: playgroundConfigRecordSchema }).strict(),
  },
  deletePlaygroundConfig: {
    request: playgroundConfigDeleteRouteRequestSchema,
    response: noContentResponseSchema,
  },
  listAdminContent: {
    request: z.object({ query: adminContentListQuerySchema }).strict(),
    response: adminContentListResponseSchema,
  },
  createAdminContentDraft: {
    request: adminContentCreateDraftRequestSchema,
    response: adminContentCreateDraftResponseSchema,
  },
  updateAdminContentRevision: {
    request: adminDraftPatchRouteRequestSchema,
    response: adminContentDraftResponseSchema,
  },
  validateAdminContentRevision: {
    request: z.object({ params: adminRevisionPathParamsSchema }).strict(),
    response: adminContentValidationResponseSchema,
  },
  publishAdminContentRevision: {
    request: adminPublishRouteRequestSchema,
    response: adminContentLifecycleResponseSchema,
  },
  unpublishAdminContentEntity: {
    request: adminUnpublishRouteRequestSchema,
    response: adminContentLifecycleResponseSchema,
  },
  rollbackAdminContentRevision: {
    request: adminRevisionLifecycleRouteRequestSchema,
    response: adminContentLifecycleResponseSchema,
  },
  getAdminReportSummary: { request: noRequestSchema, response: adminReportSummaryResponseSchema },
} satisfies Record<MustApiRouteId, ApiRouteContract>;

export const MUST_API_CONTRACT_ROUTE_IDS = Object.keys(MUST_API_CONTRACTS) as MustApiRouteId[];

export function getMustApiContract(routeId: ApiRouteId): ApiRouteContract | undefined {
  return MUST_API_CONTRACTS[routeId as MustApiRouteId];
}
