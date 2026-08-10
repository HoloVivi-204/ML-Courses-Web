import type { BuildFeatureFlag, RuntimeFeatureFlag } from './feature-flags.js';

export type ApiRouteMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST';
export type ApiRouteScope = 'must' | 'should' | 'stretch';

export interface ApiRouteDefinition {
  buildFlag?: BuildFeatureFlag | undefined;
  id: string;
  method: ApiRouteMethod;
  path: string;
  runtimeFlag?: RuntimeFeatureFlag | undefined;
  scope: ApiRouteScope;
}

export const API_ROUTE_CATALOG = [
  { id: 'systemFeatures', method: 'GET', path: '/api/v1/system/features', scope: 'must' },
  { id: 'bootstrapProfile', method: 'POST', path: '/api/v1/users/me/bootstrap', scope: 'must' },
  {
    id: 'updatePreferences',
    method: 'PATCH',
    path: '/api/v1/users/me/preferences',
    scope: 'must',
  },
  {
    id: 'createAvatarUploadSession',
    method: 'POST',
    path: '/api/v1/users/me/avatar/upload-sessions',
    scope: 'must',
  },
  {
    id: 'finalizeAvatarUpload',
    method: 'POST',
    path: '/api/v1/users/me/avatar/finalize',
    scope: 'must',
  },
  { id: 'deleteAccount', method: 'DELETE', path: '/api/v1/users/me', scope: 'must' },
  {
    id: 'enrollCourse',
    method: 'POST',
    path: '/api/v1/courses/:courseId/enrollments',
    scope: 'must',
  },
  {
    id: 'recordModuleOverviewView',
    method: 'POST',
    path: '/api/v1/module-overviews/:moduleId/views',
    scope: 'must',
  },
  {
    id: 'recordPostView',
    method: 'POST',
    path: '/api/v1/posts/:postId/views',
    scope: 'must',
  },
  {
    id: 'completePost',
    method: 'POST',
    path: '/api/v1/posts/:postId/completions',
    scope: 'must',
  },
  {
    id: 'recordDemoView',
    method: 'POST',
    path: '/api/v1/demos/:demoId/views',
    scope: 'must',
  },
  {
    id: 'completeDemo',
    method: 'POST',
    path: '/api/v1/demos/:demoId/completions',
    scope: 'must',
  },
  {
    id: 'createQuizAttempt',
    method: 'POST',
    path: '/api/v1/quizzes/:quizId/attempts',
    scope: 'must',
  },
  {
    id: 'submitQuizAttempt',
    method: 'POST',
    path: '/api/v1/quiz-attempts/:attemptId/submissions',
    scope: 'must',
  },
  { id: 'getProgress', method: 'GET', path: '/api/v1/users/me/progress', scope: 'must' },
  {
    id: 'recordLearningEvent',
    method: 'POST',
    path: '/api/v1/learning-events',
    scope: 'must',
  },
  {
    id: 'createPlaygroundRunSession',
    method: 'POST',
    path: '/api/v1/playground-run-sessions',
    scope: 'must',
  },
  {
    id: 'cancelPlaygroundRunSession',
    method: 'POST',
    path: '/api/v1/playground-run-sessions/:sessionId/cancellations',
    scope: 'must',
  },
  { id: 'savePlaygroundRun', method: 'POST', path: '/api/v1/playground-runs', scope: 'must' },
  { id: 'listPlaygroundRuns', method: 'GET', path: '/api/v1/playground-runs', scope: 'must' },
  {
    id: 'deletePlaygroundRun',
    method: 'DELETE',
    path: '/api/v1/playground-runs/:runId',
    scope: 'must',
  },
  {
    id: 'listPlaygroundConfigs',
    method: 'GET',
    path: '/api/v1/playground-configs',
    scope: 'must',
  },
  {
    id: 'createPlaygroundConfig',
    method: 'POST',
    path: '/api/v1/playground-configs',
    scope: 'must',
  },
  {
    id: 'updatePlaygroundConfig',
    method: 'PATCH',
    path: '/api/v1/playground-configs/:configId',
    scope: 'must',
  },
  {
    id: 'deletePlaygroundConfig',
    method: 'DELETE',
    path: '/api/v1/playground-configs/:configId',
    scope: 'must',
  },
  { id: 'listAdminContent', method: 'GET', path: '/api/v1/admin/content', scope: 'must' },
  {
    id: 'createAdminContentDraft',
    method: 'POST',
    path: '/api/v1/admin/content/:entityType/:entityId/drafts',
    scope: 'must',
  },
  {
    id: 'updateAdminContentRevision',
    method: 'PATCH',
    path: '/api/v1/admin/revisions/:revisionId',
    scope: 'must',
  },
  {
    id: 'validateAdminContentRevision',
    method: 'POST',
    path: '/api/v1/admin/revisions/:revisionId/validate',
    scope: 'must',
  },
  {
    id: 'getAdminContentRevisionPreview',
    method: 'GET',
    path: '/api/v1/admin/revisions/:revisionId/preview',
    scope: 'must',
  },
  {
    id: 'listAdminContentEvidence',
    method: 'GET',
    path: '/api/v1/admin/revisions/:revisionId/evidence',
    scope: 'must',
  },
  {
    id: 'attachAdminContentEvidence',
    method: 'POST',
    path: '/api/v1/admin/revisions/:revisionId/evidence/:kind',
    scope: 'must',
  },
  {
    id: 'publishAdminContentRevision',
    method: 'POST',
    path: '/api/v1/admin/revisions/:revisionId/publish',
    scope: 'must',
  },
  {
    id: 'unpublishAdminContentEntity',
    method: 'POST',
    path: '/api/v1/admin/entities/:entityId/unpublish',
    scope: 'must',
  },
  {
    id: 'rollbackAdminContentRevision',
    method: 'POST',
    path: '/api/v1/admin/revisions/:revisionId/rollback',
    scope: 'must',
  },
  {
    id: 'getAdminReportSummary',
    method: 'GET',
    path: '/api/v1/admin/reports/summary',
    scope: 'must',
  },
  {
    id: 'pinPlaygroundRun',
    method: 'PATCH',
    path: '/api/v1/playground-runs/:runId/pin',
    runtimeFlag: 'pinRuns',
    scope: 'should',
  },
  {
    id: 'updateAdminTargetPreset',
    method: 'PATCH',
    path: '/api/v1/admin/targets/:targetId/preset',
    runtimeFlag: 'targetScores',
    scope: 'should',
  },
  {
    id: 'getAdminStudentReport',
    method: 'GET',
    path: '/api/v1/admin/reports/students/:uid',
    runtimeFlag: 'studentDetailReports',
    scope: 'should',
  },
  {
    id: 'exportAdminProgressCsv',
    method: 'GET',
    path: '/api/v1/admin/reports/progress.csv',
    runtimeFlag: 'csvReports',
    scope: 'should',
  },
  {
    buildFlag: 'capstones',
    id: 'getCapstone',
    method: 'GET',
    path: '/api/v1/capstones/:capstoneId',
    scope: 'stretch',
  },
  {
    buildFlag: 'capstones',
    id: 'submitCapstone',
    method: 'POST',
    path: '/api/v1/capstones/:capstoneId/submissions',
    scope: 'stretch',
  },
] as const satisfies readonly ApiRouteDefinition[];

export type ApiRouteId = (typeof API_ROUTE_CATALOG)[number]['id'];

export const MUST_API_ROUTES = API_ROUTE_CATALOG.filter((route) => route.scope === 'must');

export const HEALTH_ROUTE = {
  method: 'GET' as const,
  path: '/api/v1/health',
};

export function buildApiPath(
  routeId: ApiRouteId,
  params: Readonly<Record<string, string>> = {},
): string {
  const route = API_ROUTE_CATALOG.find((candidate) => candidate.id === routeId);

  if (!route) {
    throw new Error(`Unknown API route ID: ${routeId}`);
  }

  return route.path.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (_placeholder, parameterName: string) => {
    const value = params[parameterName];

    if (!value || !value.trim()) {
      throw new Error(`Missing API path parameter ${parameterName} for ${routeId}.`);
    }

    return encodeURIComponent(value);
  });
}
