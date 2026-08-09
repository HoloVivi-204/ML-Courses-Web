import { z } from 'zod';

export const RUNTIME_FEATURE_FLAGS = [
  'pinRuns',
  'compareRuns',
  'targetScores',
  'guidedPrediction',
  'csvReports',
  'studentDetailReports',
  'lessonSearch',
  'quizMatching',
  'quizDragDrop',
  'demoAnimation',
  'additionalScenarioPairs',
] as const;

export const BUILD_FEATURE_FLAGS = [
  'capstones',
  'advancedCms',
  'genericDatasetUpload',
  'advancedAnalytics',
] as const;

export type RuntimeFeatureFlag = (typeof RUNTIME_FEATURE_FLAGS)[number];
export type BuildFeatureFlag = (typeof BUILD_FEATURE_FLAGS)[number];

export const runtimeFeatureFlagsSchema = z
  .object({
    pinRuns: z.boolean(),
    compareRuns: z.boolean(),
    targetScores: z.boolean(),
    guidedPrediction: z.boolean(),
    csvReports: z.boolean(),
    studentDetailReports: z.boolean(),
    lessonSearch: z.boolean(),
    quizMatching: z.boolean(),
    quizDragDrop: z.boolean(),
    demoAnimation: z.boolean(),
    additionalScenarioPairs: z.boolean(),
  })
  .strict();

export const buildFeatureFlagsSchema = z
  .object({
    capstones: z.boolean(),
    advancedCms: z.boolean(),
    genericDatasetUpload: z.boolean(),
    advancedAnalytics: z.boolean(),
  })
  .strict();

export const runtimeFeatureManifestPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    releaseId: z.string().trim().min(1).max(128),
    featureFlags: runtimeFeatureFlagsSchema,
  })
  .strict();

export const runtimeFeatureManifestSchema = runtimeFeatureManifestPayloadSchema
  .extend({
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type RuntimeFeatureFlags = z.infer<typeof runtimeFeatureFlagsSchema>;
export type BuildFeatureFlags = z.infer<typeof buildFeatureFlagsSchema>;
export type RuntimeFeatureManifestPayload = z.infer<typeof runtimeFeatureManifestPayloadSchema>;
export type RuntimeFeatureManifest = z.infer<typeof runtimeFeatureManifestSchema>;

export function createDisabledRuntimeFeatureFlags(): RuntimeFeatureFlags {
  return {
    pinRuns: false,
    compareRuns: false,
    targetScores: false,
    guidedPrediction: false,
    csvReports: false,
    studentDetailReports: false,
    lessonSearch: false,
    quizMatching: false,
    quizDragDrop: false,
    demoAnimation: false,
    additionalScenarioPairs: false,
  };
}

export function createDisabledBuildFeatureFlags(): BuildFeatureFlags {
  return {
    capstones: false,
    advancedCms: false,
    genericDatasetUpload: false,
    advancedAnalytics: false,
  };
}

export function serializeRuntimeFeatureManifestPayload(
  input: RuntimeFeatureManifestPayload,
): string {
  const payload = runtimeFeatureManifestPayloadSchema.parse(input);

  return JSON.stringify({
    schemaVersion: payload.schemaVersion,
    releaseId: payload.releaseId,
    featureFlags: Object.fromEntries(
      RUNTIME_FEATURE_FLAGS.map((flag) => [flag, payload.featureFlags[flag]]),
    ),
  });
}
