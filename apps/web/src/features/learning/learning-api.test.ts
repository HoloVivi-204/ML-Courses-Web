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

    const client = createFetchLearningApiClient({
      appCheckTokenProvider: {
        getToken: async () => 'verified-app-check-token',
      },
    });
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
        'x-firebase-appcheck': 'verified-app-check-token',
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

  it('loads a bounded playground run page across scenarios with a cursor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            nextCursor: 'next-cursor',
            runs: [],
          },
        }),
        {
          headers: { 'content-type': 'application/json' },
          status: 200,
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    const result = await client.listPlaygroundRuns({
      cursor: 'cursor+01',
      idToken: 'local-id-token',
      limit: 2,
      scenarioId: 'pg-xor',
    });

    expect(result).toEqual({ nextCursor: 'next-cursor', runs: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/playground-runs?scenarioId=pg-xor&limit=2&cursor=cursor%2B01',
      {
        headers: {
          authorization: 'Bearer local-id-token',
        },
      },
    );
  });

  it('adds the App Check token to protected read requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            profile: {
              uid: 'learner-01',
              schemaVersion: 1,
              displayName: 'Local Student',
              avatarUrl: null,
              locale: 'vi',
              theme: 'system',
              status: 'active',
            },
            courseProgress: [],
            moduleProgress: [],
            postProgress: [],
            quizAttempts: [],
            algorithmUnlocks: [],
          },
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient({
      appCheckTokenProvider: {
        getToken: async () => 'verified-app-check-token',
      },
    });

    await client.getProgress('local-id-token');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me/progress', {
      headers: {
        authorization: 'Bearer local-id-token',
        'x-firebase-appcheck': 'verified-app-check-token',
      },
    });
  });

  it('loads trial and protected learning content from separate Functions endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessLevel: 'trial',
              blocks: [],
              courseId: 'course-deep-learning-basic',
              description: { en: 'Trial', vi: 'Dung thu' },
              durationMinutes: 8,
              id: 'dl-p01-neuron-perceptron',
              moduleId: 'dl-m01-neuron-perceptron',
              postQuizId: 'quiz-post-dl-p01',
              revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
              title: { en: 'Trial', vi: 'Dung thu' },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessLevel: 'full',
              blocks: [{ id: 'server-only-xor' }],
              courseId: 'course-deep-learning-basic',
              description: { en: 'Full', vi: 'Day du' },
              durationMinutes: 16,
              id: 'dl-p01-neuron-perceptron',
              moduleId: 'dl-m01-neuron-perceptron',
              postQuizId: 'quiz-post-dl-p01',
              revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
              title: { en: 'Full', vi: 'Day du' },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              algorithmId: 'perceptron',
              courseId: 'course-deep-learning-basic',
              demoId: 'demo-perceptron-and-gate',
              moduleId: 'dl-m01-neuron-perceptron',
              problemId: 'problem-demo-perceptron-and-gate',
              requiredStepIds: ['and-problem'],
              revisionId: 'demo-perceptron-and-gate-rev-r1',
              seed: 42,
              steps: [],
              title: { en: 'Demo', vi: 'Demo' },
              visualization: {
                boundary: [],
                points: [],
              },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient({
      appCheckTokenProvider: {
        getToken: async () => 'verified-app-check-token',
      },
    });

    await client.getTrialPostContent('dl-p01-neuron-perceptron');
    await client.getFullPostContent({
      idToken: 'local-id-token',
      postId: 'dl-p01-neuron-perceptron',
    });
    await client.getDemoContent({
      demoId: 'demo-perceptron-and-gate',
      idToken: 'local-id-token',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/posts/dl-p01-neuron-perceptron/trial-content',
      {
        headers: {
          'x-firebase-appcheck': 'verified-app-check-token',
        },
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/posts/dl-p01-neuron-perceptron/content', {
      headers: {
        authorization: 'Bearer local-id-token',
        'x-firebase-appcheck': 'verified-app-check-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/demos/demo-perceptron-and-gate/content', {
      headers: {
        authorization: 'Bearer local-id-token',
        'x-firebase-appcheck': 'verified-app-check-token',
      },
    });
  });

  it('sends the explicit local Emulator scope when publishing an Admin draft', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            content: {},
          },
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();

    await client.publishAdminContentRevision({
      idToken: 'local-admin-id-token',
      idempotencyKey: 'publish-draft-local-01',
      publicationScope: 'emulator-demo',
      reason: 'Verify the local learner revision.',
      revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/publish',
      {
        body: JSON.stringify({
          publicationScope: 'emulator-demo',
          reason: 'Verify the local learner revision.',
        }),
        headers: {
          authorization: 'Bearer local-admin-id-token',
          'content-type': 'application/json',
          'idempotency-key': 'publish-draft-local-01',
        },
        method: 'POST',
      },
    );
  });

  it('deletes the authenticated learner account with the owner bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();

    await client.deleteAccount({ idToken: 'local-id-token' });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me', {
      headers: {
        authorization: 'Bearer local-id-token',
      },
      method: 'DELETE',
    });
  });

  it('records required lesson block views and the current reading position', async () => {
    const postView = {
      contentViewed: false,
      postId: 'dl-p01-neuron-perceptron',
      readingPosition: 'weighted-sum',
      started: true,
      viewedItemIds: ['what-is-a-neuron', 'neuron-explanation', 'weighted-sum'],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { postView },
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
    const result = await client.recordPostView({
      idToken: 'local-id-token',
      postId: 'dl-p01-neuron-perceptron',
      readingPosition: 'weighted-sum',
      viewedItemIds: ['what-is-a-neuron', 'neuron-explanation', 'weighted-sum'],
    });

    expect(result).toEqual({ postView });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/posts/dl-p01-neuron-perceptron/views', {
      body: JSON.stringify({
        readingPosition: 'weighted-sum',
        viewedItemIds: ['what-is-a-neuron', 'neuron-explanation', 'weighted-sum'],
      }),
      headers: {
        authorization: 'Bearer local-id-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('records a module overview before opening its first lesson', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            moduleOverview: {
              moduleId: 'dl-m01-neuron-perceptron',
              nextPostId: 'dl-p01-neuron-perceptron',
              status: 'completed',
            },
          },
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    await client.recordModuleOverview({
      idToken: 'local-id-token',
      moduleId: 'dl-m01-neuron-perceptron',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/module-overviews/dl-m01-neuron-perceptron/views',
      {
        headers: { authorization: 'Bearer local-id-token' },
        method: 'POST',
      },
    );
  });

  it('records demo views and confirms post completion with the authenticated API contract', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              demoView: {
                demoId: 'demo-perceptron-and-gate',
                started: true,
                viewedStepIds: ['and-problem'],
              },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              completion: { postId: 'dl-p01-neuron-perceptron', status: 'completed' },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    await client.recordDemoView({
      demoId: 'demo-perceptron-and-gate',
      idToken: 'local-id-token',
      viewedStepIds: ['and-problem'],
    });
    await client.completePost({
      idToken: 'local-id-token',
      idempotencyKey: '52c0b84a-6f5e-4d93-a69b-6129f8ea5f20',
      postId: 'dl-p01-neuron-perceptron',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/demos/demo-perceptron-and-gate/views', {
      body: JSON.stringify({ viewedStepIds: ['and-problem'] }),
      headers: {
        authorization: 'Bearer local-id-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/posts/dl-p01-neuron-perceptron/completions',
      {
        headers: {
          authorization: 'Bearer local-id-token',
          'idempotency-key': '52c0b84a-6f5e-4d93-a69b-6129f8ea5f20',
        },
        method: 'POST',
      },
    );
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

  it("reads the current user's admin access from the server", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            isAdmin: true,
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

    await expect(client.getAdminAccess!('admin-id-token')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/access', {
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
