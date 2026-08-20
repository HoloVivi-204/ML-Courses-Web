import { getFirestore } from 'firebase-admin/firestore';

import { runLocalAnalyticsAggregation } from './admin-report-repository.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
import { FIREBASE_REGION } from './runtime-config.js';

export const DAILY_ADMIN_REPORT_AGGREGATION_OPTIONS = {
  concurrency: 1,
  maxInstances: 1,
  memory: '512MiB',
  minInstances: 0,
  region: FIREBASE_REGION,
  retryCount: 3,
  schedule: '0 2 * * *',
  timeZone: 'Asia/Ho_Chi_Minh',
  timeoutSeconds: 540,
} as const;

export type AdminReportAggregation = () => Promise<unknown>;

export function createDailyAdminReportAggregationHandler(
  aggregateAdminReport: AdminReportAggregation,
): () => Promise<void> {
  return async () => {
    await aggregateAdminReport();
  };
}

function aggregateAdminReport(): ReturnType<typeof runLocalAnalyticsAggregation> {
  return runLocalAnalyticsAggregation(getFirestore(getFirebaseAdminApp()));
}

export const dailyAdminReportAggregationHandler =
  createDailyAdminReportAggregationHandler(aggregateAdminReport);
