import { z } from 'zod';

export const stableIdSchema = z.string().trim().min(1).max(160);
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const learnerLocaleSchema = z.enum(['en', 'vi']);
export const learnerThemeSchema = z.enum(['dark', 'light', 'system']);
export const avatarContentTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);
export const localizedTextSchema = z
  .object({
    en: z.string().trim().min(1).max(10_000),
    vi: z.string().trim().min(1).max(10_000),
  })
  .strict();

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().max(10_000),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema).max(1_000),
    z.record(z.string().min(1).max(128), jsonValueSchema),
  ]),
);

export const jsonObjectSchema = z.record(z.string().min(1).max(128), jsonValueSchema);

const configValueSchema = z.union([
  z.string().trim().min(1).max(256),
  z.number().finite(),
  z.boolean(),
  z.array(z.union([z.string().trim().min(1).max(128), z.number().finite(), z.boolean()])).max(64),
]);

const prohibitedPlaygroundConfigKeys = new Set([
  'code',
  'executable',
  'function',
  'model',
  'modelbytes',
  'script',
  'source',
]);

export const playgroundConfigSchema = z
  .record(
    z
      .string()
      .regex(/^[A-Za-z][A-Za-z0-9]*$/)
      .max(80),
    configValueSchema,
  )
  .superRefine((config, context) => {
    for (const key of Object.keys(config)) {
      if (prohibitedPlaygroundConfigKeys.has(key.toLowerCase())) {
        context.addIssue({
          code: 'custom',
          message: `Playground config key ${key} is not allowed.`,
          path: [key],
        });
      }
    }
  });

export const bootstrapProfileRequestSchema = z
  .object({
    locale: learnerLocaleSchema.optional(),
    theme: learnerThemeSchema.optional(),
  })
  .strict();

export const updatePreferencesRequestSchema = bootstrapProfileRequestSchema.refine(
  (preferences) => preferences.locale !== undefined || preferences.theme !== undefined,
  'At least one learner preference must be provided.',
);

export const learnerProfileSchema = z
  .object({
    avatarUrl: z.string().url().nullable(),
    createdAt: z.string().datetime().optional(),
    displayName: z.string().trim().min(1).max(160),
    locale: learnerLocaleSchema,
    schemaVersion: z.literal(1),
    status: z.enum(['active', 'anonymized', 'deletion-pending']),
    theme: learnerThemeSchema,
    uid: stableIdSchema,
  })
  .strict();

export const learnerProfileResponseSchema = z.object({ profile: learnerProfileSchema }).strict();

export const avatarUploadSessionRequestSchema = z
  .object({
    contentType: avatarContentTypeSchema,
    sha256: sha256Schema,
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(2 * 1024 * 1024),
  })
  .strict();

export const avatarUploadSessionSchema = z
  .object({
    contentType: avatarContentTypeSchema,
    expiresAt: z.string().datetime(),
    metadata: z
      .object({
        schemaVersion: z.literal('1'),
        sha256: sha256Schema,
        sourceId: z.literal('user-avatar'),
      })
      .strict(),
    storagePath: z.string().regex(/^user-avatars\/[^/]+\/[0-9a-f-]{36}$/i),
    uploadSessionId: z.string().uuid(),
  })
  .strict();

export const avatarUploadSessionResponseSchema = z
  .object({ uploadSession: avatarUploadSessionSchema })
  .strict();

export const avatarFinalizeRequestSchema = z
  .object({
    uploadSessionId: stableIdSchema,
  })
  .strict();

export const courseEnrollmentPathParamsSchema = z.object({ courseId: stableIdSchema }).strict();

export const courseEnrollmentResponseSchema = z
  .object({
    access: z.object({ moduleId: stableIdSchema }).strict(),
    enrollment: z
      .object({
        courseId: stableIdSchema,
        progressPercent: z.number().int().min(0).max(100),
        status: z.literal('in-progress'),
      })
      .strict(),
    nextPath: z.string().startsWith('/'),
  })
  .strict();

export const moduleOverviewViewPathParamsSchema = z.object({ moduleId: stableIdSchema }).strict();

export const moduleOverviewViewResponseSchema = z
  .object({
    moduleOverview: z
      .object({
        moduleId: stableIdSchema,
        nextPostId: stableIdSchema,
        status: z.literal('completed'),
      })
      .strict(),
  })
  .strict();

export const postViewPathParamsSchema = z.object({ postId: stableIdSchema }).strict();
export const postViewRequestSchema = z
  .object({
    readingPosition: z.string().trim().min(1).max(160),
    viewedItemIds: z.array(stableIdSchema).min(1).max(80),
  })
  .strict()
  .transform((request) => ({
    ...request,
    viewedItemIds: [...new Set(request.viewedItemIds)],
  }));

export const postViewResponseSchema = z
  .object({
    postView: z
      .object({
        contentViewed: z.boolean(),
        postId: stableIdSchema,
        readingPosition: z.string().trim().min(1).max(160),
        started: z.boolean(),
        viewedItemIds: z.array(stableIdSchema).max(80),
      })
      .strict(),
  })
  .strict();

export const demoViewPathParamsSchema = z.object({ demoId: stableIdSchema }).strict();
export const demoViewRequestSchema = z
  .object({
    viewedStepIds: z.array(stableIdSchema).min(1).max(20),
  })
  .strict()
  .transform((request) => ({
    viewedStepIds: [...new Set(request.viewedStepIds)],
  }));

export const demoViewResponseSchema = z
  .object({
    demoView: z
      .object({
        demoId: stableIdSchema,
        started: z.boolean(),
        viewedStepIds: z.array(stableIdSchema).max(20),
      })
      .strict(),
  })
  .strict();

export const contentCompletionPathParamsSchema = z.object({ id: stableIdSchema }).strict();
export const postCompletionResponseSchema = z
  .object({
    completion: z.object({ postId: stableIdSchema, status: z.literal('completed') }).strict(),
  })
  .strict();

export const demoCompletionRequestSchema = z
  .object({ viewedStepIds: z.array(stableIdSchema).min(1).max(20) })
  .strict()
  .transform((request) => ({ viewedStepIds: [...new Set(request.viewedStepIds)] }));

export const demoCompletionResponseSchema = z
  .object({
    completion: z.object({ demoId: stableIdSchema, status: z.literal('completed') }).strict(),
    event: z
      .object({
        demoId: stableIdSchema,
        requiredStepIds: z.array(stableIdSchema).max(20),
        type: z.literal('demo_completed'),
        viewedStepIds: z.array(stableIdSchema).max(20),
      })
      .strict(),
  })
  .strict();

const finiteCoordinateSchema = z.number().finite().min(-1_000_000).max(1_000_000);

export const learningContentBlockSchema = jsonObjectSchema;
export const learningContentBlocksSchema = z.array(learningContentBlockSchema).max(400);

export const learnerPostContentSchema = z
  .object({
    accessLevel: z.enum(['full', 'trial']),
    blocks: learningContentBlocksSchema,
    courseId: stableIdSchema,
    description: localizedTextSchema,
    durationMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60),
    id: stableIdSchema,
    moduleId: stableIdSchema,
    postQuizId: stableIdSchema,
    revisionId: stableIdSchema,
    title: localizedTextSchema,
  })
  .strict();

export const learnerTrialPostContentSchema = learnerPostContentSchema.extend({
  accessLevel: z.literal('trial'),
});

export const learnerFullPostContentSchema = learnerPostContentSchema.extend({
  accessLevel: z.literal('full'),
});

export const learnerCourseContentSchema = z
  .object({
    courseId: stableIdSchema,
    description: localizedTextSchema,
    revisionId: stableIdSchema,
    title: localizedTextSchema,
  })
  .strict();

export const learnerModuleContentSchema = z
  .object({
    courseId: stableIdSchema,
    description: localizedTextSchema,
    moduleId: stableIdSchema,
    revisionId: stableIdSchema,
    title: localizedTextSchema,
  })
  .strict();

export const learnerQuizContentSchema = z
  .object({
    courseId: stableIdSchema,
    description: localizedTextSchema,
    moduleId: stableIdSchema,
    postId: stableIdSchema.optional(),
    quizId: stableIdSchema,
    revisionId: stableIdSchema,
    title: localizedTextSchema,
  })
  .strict();

export const learnerDemoContentSchema = z
  .object({
    adapterVersion: stableIdSchema.optional(),
    algorithmId: stableIdSchema,
    courseId: stableIdSchema,
    demoId: stableIdSchema,
    fixedRun: z
      .object({
        caption: localizedTextSchema.optional(),
        datasetVersionId: stableIdSchema,
        parameterValues: z
          .array(
            z
              .object({
                id: stableIdSchema,
                value: z.number().finite(),
              })
              .strict(),
          )
          .max(100),
        rows: z
          .array(
            z
              .object({
                input: z.array(z.number().finite()).min(1).max(100),
                predictedOutput: z.number().finite(),
                targetOutput: z.number().finite(),
              })
              .strict(),
          )
          .max(10_000),
      })
      .strict()
      .optional(),
    moduleId: stableIdSchema,
    problemId: stableIdSchema,
    requiredStepIds: z.array(stableIdSchema).min(1).max(100),
    resultHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    revisionId: stableIdSchema,
    seed: z.number().int().min(0).max(2_147_483_647),
    sourceIds: z.array(stableIdSchema).min(1).max(100).optional(),
    steps: z
      .array(
        z
          .object({
            durationMs: z
              .number()
              .int()
              .min(1)
              .max(10 * 60 * 1_000)
              .optional(),
            id: stableIdSchema,
            narration: localizedTextSchema,
            required: z.boolean(),
            textAlternative: localizedTextSchema,
            title: localizedTextSchema,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    title: localizedTextSchema,
    visualFixture: z
      .object({
        hash: z.string().regex(/^[a-f0-9]{64}$/),
        totalDurationMs: z
          .number()
          .int()
          .min(1)
          .max(60 * 60 * 1_000),
        version: z.literal('release-fixed-demo-visual-v1'),
      })
      .strict()
      .optional(),
    visualization: z
      .object({
        boundary: z
          .array(
            z
              .object({
                x: finiteCoordinateSchema,
                y: finiteCoordinateSchema,
              })
              .strict(),
          )
          .max(10_000),
        points: z
          .array(
            z
              .object({
                classification: z.enum(['negative', 'positive']).optional(),
                label: z.string().trim().min(1).max(160),
                positiveFromStep: z.number().int().min(0).max(100),
                x: finiteCoordinateSchema,
                y: finiteCoordinateSchema,
              })
              .strict(),
          )
          .max(10_000),
      })
      .strict(),
  })
  .strict();

export const adminContentPreviewQuestionSchema = z
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
    type: z.enum(['multiple-choice', 'single-choice', 'true-false']),
  })
  .strict();

export const adminContentRevisionPreviewSchema = z.discriminatedUnion('contentType', [
  z
    .object({
      contentType: z.literal('course'),
      course: learnerCourseContentSchema,
    })
    .strict(),
  z
    .object({
      contentType: z.literal('demo'),
      demo: learnerDemoContentSchema,
    })
    .strict(),
  z
    .object({
      contentType: z.literal('module'),
      module: learnerModuleContentSchema,
    })
    .strict(),
  z
    .object({
      contentType: z.literal('post'),
      post: learnerPostContentSchema,
    })
    .strict(),
  z
    .object({
      contentType: z.literal('quiz'),
      questions: z.array(adminContentPreviewQuestionSchema).min(1).max(160),
      quiz: learnerQuizContentSchema,
    })
    .strict(),
]);

export const publishedLearnerContentDocumentSchema = z.discriminatedUnion('documentKind', [
  z
    .object({
      content: learnerCourseContentSchema,
      documentKind: z.literal('course-summary'),
      entityId: stableIdSchema,
      entityType: z.literal('course'),
      revisionId: stableIdSchema,
      schemaVersion: z.literal(1),
    })
    .strict(),
  z
    .object({
      content: learnerModuleContentSchema,
      documentKind: z.literal('module-summary'),
      entityId: stableIdSchema,
      entityType: z.literal('module'),
      revisionId: stableIdSchema,
      schemaVersion: z.literal(1),
    })
    .strict(),
  z
    .object({
      content: learnerQuizContentSchema,
      documentKind: z.literal('quiz-summary'),
      entityId: stableIdSchema,
      entityType: z.literal('quiz'),
      revisionId: stableIdSchema,
      schemaVersion: z.literal(1),
    })
    .strict(),
  z
    .object({
      content: learnerTrialPostContentSchema,
      documentKind: z.literal('post-trial'),
      entityId: stableIdSchema,
      entityType: z.literal('post'),
      revisionId: stableIdSchema,
      schemaVersion: z.literal(1),
    })
    .strict(),
  z
    .object({
      content: learnerFullPostContentSchema,
      documentKind: z.literal('post-full'),
      entityId: stableIdSchema,
      entityType: z.literal('post'),
      revisionId: stableIdSchema,
      schemaVersion: z.literal(1),
    })
    .strict(),
  z
    .object({
      content: learnerDemoContentSchema,
      documentKind: z.literal('demo-full'),
      entityId: stableIdSchema,
      entityType: z.literal('demo'),
      revisionId: stableIdSchema,
      schemaVersion: z.literal(1),
    })
    .strict(),
]);

export type PublishedLearnerContentDocumentKind = z.infer<
  typeof publishedLearnerContentDocumentSchema
>['documentKind'];

export function getPublishedLearnerContentDocumentId(input: {
  documentKind: PublishedLearnerContentDocumentKind;
  entityId: string;
}): string {
  const entityId = stableIdSchema.parse(input.entityId);

  switch (input.documentKind) {
    case 'course-summary':
      return `course:${entityId}:summary`;
    case 'demo-full':
      return `demo:${entityId}:full`;
    case 'module-summary':
      return `module:${entityId}:summary`;
    case 'post-full':
      return `post:${entityId}:full`;
    case 'post-trial':
      return `post:${entityId}:trial`;
    case 'quiz-summary':
      return `quiz:${entityId}:summary`;
  }
}

export const quizAttemptPathParamsSchema = z.object({ quizId: stableIdSchema }).strict();
export const quizSubmissionPathParamsSchema = z.object({ attemptId: stableIdSchema }).strict();
export const quizAnswerValueSchema = z.union([
  z.string().trim().min(1).max(160),
  z.array(z.string().trim().min(1).max(160)).min(1).max(64),
]);
export const quizSubmissionRequestSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            questionId: stableIdSchema,
            value: quizAnswerValueSchema,
          })
          .strict(),
      )
      .min(1)
      .max(160),
  })
  .strict();

export const progressEnrollmentSchema = z
  .object({
    courseId: stableIdSchema,
    progressPercent: z.number().int().min(0).max(100),
    status: z.enum(['completed', 'in-progress', 'not-enrolled']),
  })
  .strict();

export const moduleProgressSchema = z
  .object({
    completedStepCount: z.number().int().min(0),
    moduleId: stableIdSchema,
    overviewViewed: z.boolean(),
    progressPercent: z.number().int().min(0).max(100),
    requiredStepCount: z.number().int().min(0),
    status: z.enum(['completed', 'in-progress', 'locked']),
  })
  .strict();

export const postProgressSchema = z
  .object({
    bestScore: z.number().min(0).max(100),
    completed: z.boolean(),
    contentViewed: z.boolean(),
    postId: stableIdSchema,
    quizId: stableIdSchema,
    quizPassed: z.boolean(),
    readingPosition: z.string().nullable(),
    started: z.boolean(),
    viewedItemIds: z.array(stableIdSchema).max(80),
  })
  .strict();

export const quizProgressSchema = z
  .object({
    attemptCount: z.number().int().min(0),
    bestScore: z.number().min(0).max(100),
    passed: z.boolean(),
    quizId: stableIdSchema,
    quizKind: z.enum(['module', 'post']),
  })
  .strict();

export const demoProgressSchema = z
  .object({ completed: z.boolean(), demoId: stableIdSchema, started: z.boolean() })
  .strict();

export const courseProgressSchema = z
  .object({
    courseId: stableIdSchema,
    demos: z.array(demoProgressSchema),
    modules: z.array(moduleProgressSchema),
    posts: z.array(postProgressSchema),
    progressPercent: z.number().int().min(0).max(100),
    quizzes: z.array(quizProgressSchema),
    status: z.enum(['completed', 'in-progress', 'not-enrolled']),
  })
  .strict();

export const learningProgressSnapshotSchema = z
  .object({
    algorithmUnlocks: z.array(
      z.object({ algorithmId: stableIdSchema, moduleId: stableIdSchema }).strict(),
    ),
    contentAccess: z.array(
      z
        .object({
          contentType: z.enum(['demo', 'module', 'post']),
          entityId: stableIdSchema,
        })
        .strict(),
    ),
    courses: z.array(courseProgressSchema).optional(),
    demos: z.array(demoProgressSchema),
    enrollment: progressEnrollmentSchema,
    modules: z.array(moduleProgressSchema),
    posts: z.array(postProgressSchema),
    quizzes: z.array(quizProgressSchema),
  })
  .strict();

export const playgroundRunSessionRequestSchema = z
  .object({
    algorithmId: stableIdSchema,
    config: playgroundConfigSchema,
    datasetVersionId: stableIdSchema,
    deviceProfile: z.enum(['desktop', 'mobile']).default('desktop'),
    scenarioId: stableIdSchema,
  })
  .strict();

export const playgroundRunSessionCancellationPathParamsSchema = z
  .object({ sessionId: stableIdSchema })
  .strict();

export const playgroundRunSaveRequestSchema = z
  .object({
    result: jsonObjectSchema,
    sessionId: stableIdSchema,
  })
  .strict();

export const playgroundRunsListQuerySchema = z
  .object({
    cursor: stableIdSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    scenarioId: stableIdSchema.optional(),
  })
  .strict();

export const playgroundConfigCreateRequestSchema = z
  .object({
    algorithmId: stableIdSchema,
    config: playgroundConfigSchema,
    datasetVersionId: stableIdSchema,
    name: z.string().trim().min(1).max(80),
    scenarioId: stableIdSchema,
  })
  .strict();

export const playgroundConfigsListQuerySchema = z.object({ scenarioId: stableIdSchema }).strict();

export const playgroundConfigUpdateRequestSchema = z
  .object({
    config: playgroundConfigSchema.optional(),
    name: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
  .refine((input) => input.config !== undefined || input.name !== undefined, {
    message: 'At least one playground config field must be provided.',
  });

export const playgroundConfigPathParamsSchema = z.object({ configId: stableIdSchema }).strict();
export const playgroundRunPathParamsSchema = z.object({ runId: stableIdSchema }).strict();

export const playgroundConfigRecordSchema = z
  .object({
    adapterVersion: stableIdSchema.optional(),
    algorithmId: stableIdSchema,
    compatibilityReason: z.string().max(500).nullable(),
    compatibilityStatus: z.enum(['compatible', 'incompatible']),
    config: playgroundConfigSchema,
    configId: stableIdSchema,
    configSchemaVersion: z.literal(1).optional(),
    datasetVersionId: stableIdSchema,
    name: z.string().trim().min(1).max(80),
    scenarioId: stableIdSchema,
  })
  .strict();

export const playgroundConfigResponseSchema = z
  .object({ config: playgroundConfigRecordSchema })
  .strict();

export const playgroundConfigsResponseSchema = z
  .object({ configs: z.array(playgroundConfigRecordSchema) })
  .strict();

export const adminContentEntityTypeSchema = z.enum(['course', 'demo', 'module', 'post', 'quiz']);
export const adminContentPublicationScopeSchema = z.enum(['emulator-demo', 'publish-quality']);
export const adminContentEvidenceKindSchema = z.enum([
  'license',
  'provenance',
  'content-review',
  'gvhd-confirmation',
]);

export const adminContentListQuerySchema = z
  .object({
    courseId: stableIdSchema.optional(),
    cursor: stableIdSchema.optional(),
    entityType: adminContentEntityTypeSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    moduleId: stableIdSchema.optional(),
  })
  .strict();

export const adminContentPathParamsSchema = z
  .object({ entityId: stableIdSchema, entityType: adminContentEntityTypeSchema })
  .strict();
export const adminRevisionPathParamsSchema = z.object({ revisionId: stableIdSchema }).strict();
export const adminRevisionEvidencePathParamsSchema = z
  .object({
    kind: adminContentEvidenceKindSchema,
    revisionId: stableIdSchema,
  })
  .strict();
export const adminEntityPathParamsSchema = z.object({ entityId: stableIdSchema }).strict();

export const adminContentMetadataSchema = z
  .object({
    attribution: localizedTextSchema,
    externalLinkUrl: z.string().url().max(2_048).nullable(),
  })
  .strict();

export const adminContentDraftPatchRequestSchema = z
  .object({
    metadata: adminContentMetadataSchema.optional(),
    preview: localizedTextSchema.optional(),
    revisionVersion: z.number().int().min(1),
    title: localizedTextSchema.optional(),
    trialPostId: stableIdSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.metadata !== undefined ||
      input.preview !== undefined ||
      input.title !== undefined ||
      input.trialPostId !== undefined,
    { message: 'At least one draft field must be provided.' },
  );

export const adminLifecycleRequestSchema = z
  .object({ reason: z.string().trim().min(1).max(240) })
  .strict();

export const adminPublishRequestSchema = z
  .object({
    publicationScope: adminContentPublicationScopeSchema.default('publish-quality'),
    reason: z.string().trim().min(1).max(240),
  })
  .strict();

export const adminContentEvidenceAttachRequestSchema = z
  .object({
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    evidenceRef: z.string().trim().min(1).max(2_048),
  })
  .strict();

export const successEnvelopeSchema = <TData extends z.ZodType>(data: TData) =>
  z
    .object({
      data,
      message: z.string().optional(),
      requestId: z.string().uuid().optional(),
      success: z.literal(true),
    })
    .strict();

export type LearnerProfile = z.infer<typeof learnerProfileSchema>;
export type AvatarUploadSessionRequest = z.infer<typeof avatarUploadSessionRequestSchema>;
export type AvatarUploadSession = z.infer<typeof avatarUploadSessionSchema>;
export type PlaygroundConfig = z.infer<typeof playgroundConfigSchema>;
export type PlaygroundConfigCreateRequest = z.infer<typeof playgroundConfigCreateRequestSchema>;
export type PlaygroundConfigUpdateRequest = z.infer<typeof playgroundConfigUpdateRequestSchema>;
export type PlaygroundConfigRecord = z.infer<typeof playgroundConfigRecordSchema>;
export type LearningProgressSnapshot = z.infer<typeof learningProgressSnapshotSchema>;
export type LearnerCourseContent = z.infer<typeof learnerCourseContentSchema>;
export type LearnerPostContent = z.infer<typeof learnerPostContentSchema>;
export type LearnerDemoContent = z.infer<typeof learnerDemoContentSchema>;
export type LearnerModuleContent = z.infer<typeof learnerModuleContentSchema>;
export type LearnerQuizContent = z.infer<typeof learnerQuizContentSchema>;
export type PublishedLearnerContentDocument = z.infer<typeof publishedLearnerContentDocumentSchema>;
