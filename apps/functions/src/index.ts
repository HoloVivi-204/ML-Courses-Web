import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { createApiApp } from './api-app.js';
import {
  dailyAdminReportAggregationHandler,
  DAILY_ADMIN_REPORT_AGGREGATION_OPTIONS,
} from './admin-report-scheduler.js';
import { FIREBASE_REGION } from './runtime-config.js';

export const API_FUNCTION_OPTIONS = {
  maxInstances: 10,
  memory: '512MiB',
  minInstances: 0,
  region: FIREBASE_REGION,
  timeoutSeconds: 60,
} as const;

export const api = onRequest(API_FUNCTION_OPTIONS, createApiApp());

export const dailyAdminReportAggregation = onSchedule(
  DAILY_ADMIN_REPORT_AGGREGATION_OPTIONS,
  dailyAdminReportAggregationHandler,
);
