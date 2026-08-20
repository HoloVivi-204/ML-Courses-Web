import { describe, expect, it, vi } from 'vitest';

import {
  createDailyAdminReportAggregationHandler,
  DAILY_ADMIN_REPORT_AGGREGATION_OPTIONS,
} from './admin-report-scheduler.js';
import { dailyAdminReportAggregation } from './index.js';
import { FIREBASE_REGION } from './runtime-config.js';

describe('daily Admin report scheduler', () => {
  it('declares a bounded daily schedule in the project region and Vietnam timezone', () => {
    expect(DAILY_ADMIN_REPORT_AGGREGATION_OPTIONS).toEqual({
      concurrency: 1,
      maxInstances: 1,
      memory: '512MiB',
      minInstances: 0,
      region: FIREBASE_REGION,
      retryCount: 3,
      schedule: '0 2 * * *',
      timeZone: 'Asia/Ho_Chi_Minh',
      timeoutSeconds: 540,
    });
  });

  it('runs the shared aggregation operation once per schedule invocation', async () => {
    const aggregateAdminReport = vi.fn().mockResolvedValue(undefined);
    const handler = createDailyAdminReportAggregationHandler(aggregateAdminReport);

    await handler();

    expect(aggregateAdminReport).toHaveBeenCalledOnce();
  });

  it('propagates aggregation failures for Cloud Scheduler retries', async () => {
    const aggregationFailure = new Error('Firestore is unavailable');
    const handler = createDailyAdminReportAggregationHandler(async () => {
      throw aggregationFailure;
    });

    await expect(handler()).rejects.toBe(aggregationFailure);
  });

  it('exports the scheduler-triggered Function', () => {
    expect(dailyAdminReportAggregation.__endpoint.scheduleTrigger).toMatchObject({
      retryConfig: {
        retryCount: 3,
      },
      schedule: '0 2 * * *',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  });
});
