import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFetchLearningApiClient } from './learning-api';

describe('fetch learning API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('bootstraps the learner profile with the current local preferences', async () => {
    const profile = {
      uid: 'learner-01',
      schemaVersion: 1,
      displayName: 'Local Student',
      avatarUrl: null,
      locale: 'en',
      theme: 'dark',
      status: 'active',
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            profile,
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 201,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    const result = await client.bootstrapProfile({
      idToken: 'local-id-token',
      locale: 'en',
      theme: 'dark',
    });

    expect(result).toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me/bootstrap', {
      body: JSON.stringify({
        locale: 'en',
        theme: 'dark',
      }),
      headers: {
        authorization: 'Bearer local-id-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('patches authenticated learner preferences with the owner bearer token', async () => {
    const profile = {
      uid: 'learner-01',
      schemaVersion: 1,
      displayName: 'Local Student',
      avatarUrl: null,
      locale: 'en',
      theme: 'system',
      status: 'active',
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            profile,
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    const result = await client.updatePreferences({
      idToken: 'local-id-token',
      locale: 'en',
      theme: 'system',
    });

    expect(result).toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me/preferences', {
      body: JSON.stringify({
        locale: 'en',
        theme: 'system',
      }),
      headers: {
        authorization: 'Bearer local-id-token',
        'content-type': 'application/json',
      },
      method: 'PATCH',
    });
  });

  it('fetches the admin report summary with the admin bearer token', async () => {
    const reportSummary = {
      generatedAt: '2026-07-23T01:00:00.000Z',
      learningVerified: {
        verificationLevel: 'server-verified',
        learnerCount: 4,
        courseProgress: [
          {
            courseId: 'course-deep-learning-basic',
            enrolledCount: 3,
            startedCount: 2,
            completedCount: 1,
            averageProgressPercent: 42,
          },
        ],
        moduleProgress: [],
        postProgress: [],
        quizSummary: {
          averageScorePercent: 81,
          passedAttemptCount: 5,
          totalAttemptCount: 6,
          commonWrongQuestions: [],
        },
        algorithmUnlocks: [],
      },
      playgroundClientReported: {
        verificationLevel: 'client-computed',
        runCount: 9,
        failedRunCount: 1,
        errorRate: 0.11,
        scenarioActivity: [],
      },
      contentLifecycle: {
        publishedCount: 8,
        draftCount: 1,
        validationPendingCount: 1,
        unpublishedCount: 0,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: reportSummary,
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    const result = await client.getAdminReportSummary({ idToken: 'admin-id-token' });

    expect(result).toEqual(reportSummary);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/reports/summary', {
      headers: {
        authorization: 'Bearer admin-id-token',
      },
    });
  });

  it('patches an owner saved Playground config with a name and current parameters', async () => {
    const updatedConfig = {
      configId: 'config-pg-xor-01',
      name: 'Renamed XOR baseline',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.3,
        epochs: 150,
        trainRatio: 0.85,
        seed: 9,
      },
      compatibilityStatus: 'compatible',
      compatibilityReason: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            config: updatedConfig,
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    const result = await client.updatePlaygroundConfig({
      idToken: 'local-id-token',
      configId: 'config-pg-xor-01',
      name: 'Renamed XOR baseline',
      config: {
        learningRate: 0.3,
        epochs: 150,
        trainRatio: 0.85,
        seed: 9,
      },
    });

    expect(result).toEqual(updatedConfig);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/playground-configs/config-pg-xor-01', {
      body: JSON.stringify({
        name: 'Renamed XOR baseline',
        config: {
          learningRate: 0.3,
          epochs: 150,
          trainRatio: 0.85,
          seed: 9,
        },
      }),
      headers: {
        authorization: 'Bearer local-id-token',
        'content-type': 'application/json',
      },
      method: 'PATCH',
    });
  });
});
