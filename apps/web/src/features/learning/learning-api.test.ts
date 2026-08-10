import { afterEach, describe, expect, it, vi } from 'vitest';

import { LearningApiError, createFetchLearningApiClient } from './learning-api';
import type { LearningContentReader } from './firebase-learning-content-gateway';

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

  it('uses the two server-issued avatar endpoints without accepting a client URL', async () => {
    const profile = {
      avatarUrl: 'https://storage.example.test/v0/b/local/o/user-avatars%2Flearner-01%2Favatar-01',
      displayName: 'Local Student',
      locale: 'vi',
      schemaVersion: 1,
      status: 'active',
      theme: 'system',
      uid: 'learner-01',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              uploadSession: {
                contentType: 'image/png',
                expiresAt: '2026-08-09T16:15:00.000Z',
                metadata: {
                  schemaVersion: '1',
                  sha256: 'a'.repeat(64),
                  sourceId: 'user-avatar',
                },
                storagePath: 'user-avatars/learner-01/6a3b16d9-cc56-4015-89e9-69bc83c84b8e',
                uploadSessionId: '46762d5a-5c11-4f7c-9527-bf9f344a7d4e',
              },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { profile } }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    const uploadSession = await client.createAvatarUploadSession({
      contentType: 'image/png',
      idToken: 'local-id-token',
      sha256: 'a'.repeat(64),
      sizeBytes: 67,
    });
    const finalizedProfile = await client.finalizeAvatarUpload({
      idToken: 'local-id-token',
      uploadSessionId: uploadSession.uploadSessionId,
    });

    expect(uploadSession).toMatchObject({
      storagePath: 'user-avatars/learner-01/6a3b16d9-cc56-4015-89e9-69bc83c84b8e',
      uploadSessionId: '46762d5a-5c11-4f7c-9527-bf9f344a7d4e',
    });
    expect(finalizedProfile).toEqual(profile);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/users/me/avatar/upload-sessions', {
      body: JSON.stringify({
        contentType: 'image/png',
        sha256: 'a'.repeat(64),
        sizeBytes: 67,
      }),
      headers: {
        authorization: 'Bearer local-id-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/users/me/avatar/finalize', {
      body: JSON.stringify({ uploadSessionId: '46762d5a-5c11-4f7c-9527-bf9f344a7d4e' }),
      headers: {
        authorization: 'Bearer local-id-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('exposes a stale reauthentication response to the profile recovery UI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'RECENT_SIGN_IN_REQUIRED',
              details: [],
              message: 'Recent authentication is required before deleting this account.',
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 401 },
        ),
      ),
    );

    const client = createFetchLearningApiClient();

    await expect(client.deleteAccount({ idToken: 'stale-token' })).rejects.toEqual(
      new LearningApiError(
        401,
        'RECENT_SIGN_IN_REQUIRED',
        'Recent authentication is required before deleting this account.',
      ),
    );
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
            contentAccess: [],
            algorithmUnlocks: [],
            demos: [],
            enrollment: {
              courseId: 'course-deep-learning-basic',
              progressPercent: 0,
              status: 'in-progress',
            },
            modules: [],
            posts: [],
            quizzes: [],
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

  it('loads trial and granted learning content from Firestore instead of adding product API routes', async () => {
    const contentReader = {
      getCourseContent: vi.fn().mockResolvedValue({
        courseId: 'course-deep-learning-basic',
        description: { en: 'Course summary', vi: 'Tom tat khoa hoc' },
        revisionId: 'course-deep-learning-basic-rev-r1',
        title: { en: 'Deep Learning', vi: 'Hoc sau' },
      }),
      getDemoContent: vi.fn().mockResolvedValue({
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
        visualization: { boundary: [], points: [] },
      }),
      getFullPostContent: vi.fn().mockResolvedValue({
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
      }),
      getModuleContent: vi.fn().mockResolvedValue({
        courseId: 'course-deep-learning-basic',
        description: { en: 'Module summary', vi: 'Tom tat module' },
        moduleId: 'dl-m01-neuron-perceptron',
        revisionId: 'module-dl-m01-neuron-perceptron-rev-r1',
        title: { en: 'Neuron', vi: 'Neuron' },
      }),
      getQuizContent: vi.fn().mockResolvedValue({
        courseId: 'course-deep-learning-basic',
        description: { en: 'Quiz summary', vi: 'Tom tat quiz' },
        moduleId: 'dl-m01-neuron-perceptron',
        postId: 'dl-p01-neuron-perceptron',
        quizId: 'quiz-post-dl-p01',
        revisionId: 'quiz-quiz-post-dl-p01-rev-r1',
        title: { en: 'Neuron quiz', vi: 'Quiz neuron' },
      }),
      getTrialPostContent: vi.fn().mockResolvedValue({
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
      }),
    } satisfies LearningContentReader;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient({ contentReader });

    await client.getCourseContent('course-deep-learning-basic');
    await client.getModuleContent('dl-m01-neuron-perceptron');
    await client.getQuizContent('quiz-post-dl-p01');
    await client.getTrialPostContent('dl-p01-neuron-perceptron');
    await client.getFullPostContent({
      idToken: 'local-id-token',
      postId: 'dl-p01-neuron-perceptron',
    });
    await client.getDemoContent({
      demoId: 'demo-perceptron-and-gate',
      idToken: 'local-id-token',
    });

    expect(contentReader.getCourseContent).toHaveBeenCalledWith('course-deep-learning-basic');
    expect(contentReader.getModuleContent).toHaveBeenCalledWith('dl-m01-neuron-perceptron');
    expect(contentReader.getQuizContent).toHaveBeenCalledWith('quiz-post-dl-p01');
    expect(contentReader.getTrialPostContent).toHaveBeenCalledWith('dl-p01-neuron-perceptron');
    expect(contentReader.getFullPostContent).toHaveBeenCalledWith('dl-p01-neuron-perceptron');
    expect(contentReader.getDemoContent).toHaveBeenCalledWith('demo-perceptron-and-gate');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the explicit local Emulator scope when publishing an Admin draft', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            content: {
              courseId: 'course-deep-learning-basic',
              draftRevisionId: null,
              emergencyBlocked: false,
              entityId: 'dl-p01-neuron-perceptron',
              entityType: 'post',
              localeAvailability: ['en', 'vi'],
              moduleId: 'dl-m01-neuron-perceptron',
              preview: {
                en: 'A learner-visible draft preview.',
                vi: 'Báº£n xem trÆ°á»›c cho ngÆ°á»i há»c.',
              },
              publicationScope: 'emulator-demo',
              publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r2',
              sourceReview: {
                attribution: {
                  en: 'Source attribution.',
                  vi: 'Ghi nháº­n nguá»“n.',
                },
                license: {
                  name: 'CC BY 4.0',
                  url: 'https://creativecommons.org/licenses/by/4.0/',
                },
                sourceId: 'source-google-ml-crash-course',
                title: 'Google ML Crash Course',
              },
              sourceStatus: 'seeded',
              status: 'published',
              title: {
                en: 'Neuron and Perceptron',
                vi: 'Neuron vÃ  Perceptron',
              },
              validationStatus: 'valid',
            },
            lifecycleEvent: {
              actorUid: 'admin-01',
              createdAt: '2026-08-10T02:00:00.000Z',
              entityId: 'dl-p01-neuron-perceptron',
              entityType: 'post',
              fromRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
              publicationScope: 'emulator-demo',
              reason: 'Verify the local learner revision.',
              requestId: '11111111-1111-4111-8111-111111111111',
              toRevisionId: 'post-dl-p01-neuron-perceptron-rev-r2',
              type: 'published',
            },
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

  it('loads a typed Admin learner preview and attaches pending evidence by checksum', async () => {
    const revisionId = 'draft-post-dl-p01-neuron-perceptron-rev-d1';
    const checksum = 'a'.repeat(64);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              draft: {
                baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
                courseId: 'course-deep-learning-basic',
                draftRevisionId: revisionId,
                entityId: 'dl-p01-neuron-perceptron',
                entityType: 'post',
                localeAvailability: ['en', 'vi'],
                metadata: {
                  attribution: { en: 'Source attribution', vi: 'Nguon tham khao' },
                  externalLinkUrl: null,
                },
                moduleId: 'dl-m01-neuron-perceptron',
                preview: { en: 'Draft description', vi: 'Mo ta draft' },
                revisionVersion: 1,
                sourceReview: {
                  attribution: { en: 'Source attribution', vi: 'Nguon tham khao' },
                  license: {
                    name: 'CC BY 4.0',
                    url: 'https://creativecommons.org/licenses/by/4.0/',
                  },
                  sourceId: 'source-google-ml-crash-course',
                  title: 'Google ML Crash Course',
                },
                sourceStatus: 'seeded',
                status: 'draft',
                title: { en: 'Draft post', vi: 'Bai viet draft' },
                validationStatus: 'not-run',
              },
              preview: {
                contentType: 'post',
                post: {
                  accessLevel: 'full',
                  blocks: [],
                  courseId: 'course-deep-learning-basic',
                  description: { en: 'Draft description', vi: 'Mo ta draft' },
                  durationMinutes: 8,
                  id: 'dl-p01-neuron-perceptron',
                  moduleId: 'dl-m01-neuron-perceptron',
                  postQuizId: 'quiz-post-dl-p01',
                  revisionId,
                  title: { en: 'Draft post', vi: 'Bai viet draft' },
                },
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
              evidence: {
                artifactId: 'dl-p01-neuron-perceptron',
                checksum,
                evidenceRef: 'evidence://license-review/dl-p01-neuron-perceptron',
                kind: 'license',
                result: 'pending',
              },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    const preview = await client.getAdminContentRevisionPreview({
      idToken: 'local-admin-id-token',
      revisionId,
    });
    const evidence = await client.attachAdminContentEvidence({
      checksum,
      evidenceRef: 'evidence://license-review/dl-p01-neuron-perceptron',
      idToken: 'local-admin-id-token',
      kind: 'license',
      revisionId,
    });

    expect(preview.preview).toEqual(
      expect.objectContaining({
        contentType: 'post',
      }),
    );
    expect(evidence.result).toBe('pending');
    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/v1/admin/revisions/${revisionId}/preview`, {
      headers: {
        authorization: 'Bearer local-admin-id-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/admin/revisions/${revisionId}/evidence/license`,
      {
        body: JSON.stringify({
          checksum,
          evidenceRef: 'evidence://license-review/dl-p01-neuron-perceptron',
        }),
        headers: {
          authorization: 'Bearer local-admin-id-token',
          'content-type': 'application/json',
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

  it('parses the release runtime manifest from the sole public Must route', async () => {
    const manifest = {
      checksum: 'a'.repeat(64),
      featureFlags: {
        additionalScenarioPairs: false,
        compareRuns: false,
        csvReports: false,
        demoAnimation: false,
        guidedPrediction: false,
        lessonSearch: false,
        pinRuns: false,
        quizDragDrop: false,
        quizMatching: false,
        studentDetailReports: false,
        targetScores: false,
      },
      releaseId: 'release-1',
      schemaVersion: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: manifest }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(createFetchLearningApiClient().getRuntimeFeatureManifest()).resolves.toEqual(
      manifest,
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/system/features', undefined);
  });
});
