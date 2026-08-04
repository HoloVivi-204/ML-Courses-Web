import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApiApp } from './api-app.js';
import {
  createStaticAdminContentRepository,
  type AdminContentSummary,
} from './admin-content-repository.js';
import type { LearningContentRepository } from './learning-content-repository.js';
import type { LearningRepository } from './learning-repository.js';
import type { PlaygroundRepository } from './playground-repository.js';

function createLearningRepository(overrides: Partial<LearningRepository>): LearningRepository {
  return {
    bootstrapLearner: async () => {
      throw new Error('Bootstrap is not part of this test.');
    },
    completeDemo: async () => {
      throw new Error('Demo completion is not part of this test.');
    },
    completePost: async () => {
      throw new Error('Post completion is not part of this test.');
    },
    recordDemoView: async () => {
      throw new Error('Demo view recording is not part of this test.');
    },
    recordModuleOverview: async () => {
      throw new Error('Module overview recording is not part of this test.');
    },
    recordPostView: async () => {
      throw new Error('Post view recording is not part of this test.');
    },
    createQuizAttempt: async () => {
      throw new Error('Quiz attempt creation is not part of this test.');
    },
    deleteLearnerAccount: async () => {
      throw new Error('Learner account deletion is not part of this test.');
    },
    enrollLearner: async () => {
      throw new Error('Enrollment is not part of this test.');
    },
    getProgress: async () => {
      throw new Error('Progress snapshot is not part of this test.');
    },
    submitQuizAttempt: async () => {
      throw new Error('Quiz submission is not part of this test.');
    },
    updateLearnerPreferences: async () => {
      throw new Error('Learner preference update is not part of this test.');
    },
    ...overrides,
  };
}

function createLearningContentRepository(
  overrides: Partial<LearningContentRepository>,
): LearningContentRepository {
  return {
    getDemoContent: async () => {
      throw new Error('Demo content is not part of this test.');
    },
    getFullPostContent: async () => {
      throw new Error('Full post content is not part of this test.');
    },
    getTrialPostContent: async () => {
      throw new Error('Trial post content is not part of this test.');
    },
    ...overrides,
  };
}

function createPlaygroundRepository(
  overrides: Partial<PlaygroundRepository>,
): PlaygroundRepository {
  return {
    cancelRunSession: async () => {
      throw new Error('Playground run session cancellation is not part of this test.');
    },
    createConfig: async () => {
      throw new Error('Playground config creation is not part of this test.');
    },
    createRunSession: async () => {
      throw new Error('Playground run session creation is not part of this test.');
    },
    deleteConfig: async () => {
      throw new Error('Playground config deletion is not part of this test.');
    },
    deleteRun: async () => {
      throw new Error('Playground run deletion is not part of this test.');
    },
    deleteLearnerPlaygroundData: async () => {
      throw new Error('Playground account cleanup is not part of this test.');
    },
    listConfigs: async () => {
      throw new Error('Playground config listing is not part of this test.');
    },
    listRuns: async () => {
      throw new Error('Playground run listing is not part of this test.');
    },
    saveRun: async () => {
      throw new Error('Playground run saving is not part of this test.');
    },
    updateConfig: async () => {
      throw new Error('Playground config update is not part of this test.');
    },
    ...overrides,
  };
}

const releaseOneContentFixture: AdminContentSummary = {
  courseId: 'course-deep-learning-basic',
  draftRevisionId: null,
  entityId: 'dl-p01-neuron-perceptron',
  entityType: 'post',
  localeAvailability: ['en', 'vi'],
  moduleId: 'dl-m01-neuron-perceptron',
  preview: {
    en: 'Seeded learner preview.',
    vi: 'Preview seeded.',
  },
  publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
  sourceReview: {
    attribution: {
      en: 'Google Machine Learning Crash Course, licensed under CC BY 4.0.',
      vi: 'Google Machine Learning Crash Course, license CC BY 4.0.',
    },
    license: {
      name: 'CC BY 4.0',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    sourceId: 'source-google-ml-crash-course',
    title: 'Google Machine Learning Crash Course',
  },
  sourceStatus: 'seeded',
  status: 'published',
  title: {
    en: 'Seeded title',
    vi: 'Tiêu đề seeded',
  },
  validationStatus: 'not-run',
};

async function setReviewedDraftSourceMetadata(app: ReturnType<typeof createApiApp>) {
  await request(app)
    .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
    .set('authorization', 'Bearer admin-id-token')
    .send({
      revisionVersion: 1,
      metadata: {
        attribution: {
          en: 'Reviewed source attribution.',
          vi: 'Attribution source reviewed.',
        },
        externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
      },
    })
    .expect(200);
}

describe('API foundation', () => {
  it('returns the canonical success envelope from the public health endpoint', async () => {
    const response = await request(createApiApp()).get('/api/v1/health').expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.body).toEqual({
      success: true,
      data: {
        service: 'api',
        status: 'ok',
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('requires App Check for non-health routes while keeping health public', async () => {
    const app = createApiApp({
      appCheckEnforcement: 'enforced',
      verifyAppCheckToken: async (token) => {
        if (token !== 'verified-app-check-token') {
          throw new Error('Invalid App Check token.');
        }
      },
    });

    await request(app).get('/api/v1/health').expect(200);

    const missingTokenResponse = await request(app).get('/api/v1/system/features').expect(401);

    expect(missingTokenResponse.body.error).toMatchObject({
      code: 'APP_CHECK_REQUIRED',
    });

    const invalidTokenResponse = await request(app)
      .get('/api/v1/system/features')
      .set('x-firebase-appcheck', 'invalid-app-check-token')
      .expect(401);

    expect(invalidTokenResponse.body.error).toMatchObject({
      code: 'APP_CHECK_INVALID',
    });

    const response = await request(app)
      .get('/api/v1/system/features')
      .set('x-firebase-appcheck', 'verified-app-check-token')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        releaseId: 'release-1',
        checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
        featureFlags: {
          capstones: false,
          csvReports: false,
          pinRuns: false,
          studentDetailReports: false,
          targetScores: false,
        },
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('fails closed with the canonical error envelope for unknown routes', async () => {
    const response = await request(createApiApp()).get('/api/v1/unknown').expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('returns full learning payloads only through the authenticated owner boundary', async () => {
    const contentReads: unknown[] = [];
    const app = createApiApp({
      learningContentRepository: createLearningContentRepository({
        getDemoContent: async (input) => {
          contentReads.push({ type: 'demo', ...input });

          return {
            statusCode: 200,
            data: {
              algorithmId: 'perceptron',
              courseId: 'course-deep-learning-basic',
              demoId: input.demoId,
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
          };
        },
        getFullPostContent: async (input) => {
          contentReads.push({ type: 'full-post', ...input });

          return {
            statusCode: 200,
            data: {
              accessLevel: 'full',
              blocks: [{ id: 'server-only-xor' }],
              courseId: 'course-deep-learning-basic',
              description: { en: 'Full', vi: 'Day du' },
              durationMinutes: 16,
              id: input.postId,
              moduleId: 'dl-m01-neuron-perceptron',
              postQuizId: 'quiz-post-dl-p01',
              revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
              title: { en: 'Full post', vi: 'Bai day du' },
            },
          };
        },
        getTrialPostContent: async (input) => {
          contentReads.push({ type: 'trial-post', ...input });

          return {
            statusCode: 200,
            data: {
              accessLevel: 'trial',
              blocks: [{ id: 'public-trial' }],
              courseId: 'course-deep-learning-basic',
              description: { en: 'Trial', vi: 'Dung thu' },
              durationMinutes: 8,
              id: input.postId,
              moduleId: 'dl-m01-neuron-perceptron',
              postQuizId: 'quiz-post-dl-p01',
              revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
              title: { en: 'Trial post', vi: 'Bai dung thu' },
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const trialResponse = await request(app)
      .get('/api/v1/posts/dl-p01-neuron-perceptron/trial-content')
      .expect(200);

    expect(trialResponse.body.data).toMatchObject({
      accessLevel: 'trial',
      blocks: [{ id: 'public-trial' }],
    });
    expect(trialResponse.headers['cache-control']).toMatch(/no-store/);

    const staleRevisionResponse = await request(app)
      .get(
        '/api/v1/posts/dl-p01-neuron-perceptron/content?revisionId=post-dl-p01-neuron-perceptron-rev-r0',
      )
      .set('authorization', 'Bearer local-id-token')
      .expect(400);

    expect(staleRevisionResponse.body.error).toMatchObject({
      code: 'CONTENT_REVISION_SELECTION_FORBIDDEN',
    });

    await request(app)
      .get('/api/v1/posts/dl-p01-neuron-perceptron/content?uid=attacker-uid')
      .expect(401);
    await request(app)
      .get('/api/v1/demos/demo-perceptron-and-gate/content?uid=attacker-uid')
      .expect(401);

    const fullPostResponse = await request(app)
      .get('/api/v1/posts/dl-p01-neuron-perceptron/content?uid=attacker-uid')
      .set('authorization', 'Bearer local-id-token')
      .expect(200);
    const demoResponse = await request(app)
      .get('/api/v1/demos/demo-perceptron-and-gate/content?uid=attacker-uid')
      .set('authorization', 'Bearer local-id-token')
      .expect(200);

    expect(fullPostResponse.body.data).toMatchObject({
      accessLevel: 'full',
      blocks: [{ id: 'server-only-xor' }],
    });
    expect(demoResponse.body.data).toMatchObject({ demoId: 'demo-perceptron-and-gate' });
    expect(fullPostResponse.headers['cache-control']).toMatch(/no-store/);
    expect(demoResponse.headers['cache-control']).toMatch(/no-store/);
    expect(contentReads).toEqual([
      { type: 'trial-post', postId: 'dl-p01-neuron-perceptron' },
      { type: 'full-post', postId: 'dl-p01-neuron-perceptron', uid: 'learner-01' },
      { type: 'demo', demoId: 'demo-perceptron-and-gate', uid: 'learner-01' },
    ]);
  });

  it('rate limits quiz submissions by the authenticated UID before grading', async () => {
    const consumedRequests: unknown[] = [];
    const app = createApiApp({
      appCheckEnforcement: 'disabled',
      learningRepository: createLearningRepository({
        submitQuizAttempt: async () => {
          throw new Error('Quiz grading must not run after the rate limit is exceeded.');
        },
      }),
      rateLimiter: {
        consume: async (input) => {
          consumedRequests.push(input);
          return { allowed: false, retryAfterSeconds: 47 };
        },
      },
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/quiz-attempts/attempt-01/submissions')
      .set('authorization', 'Bearer local-id-token')
      .send({ uid: 'attacker-uid' })
      .expect(429);

    expect(response.headers['retry-after']).toBe('47');
    expect(response.body.error.code).toBe('RATE_LIMITED');
    expect(consumedRequests).toEqual([
      expect.objectContaining({
        identity: 'learner-01',
        scope: 'quiz-submission',
      }),
    ]);
  });

  it('bootstraps the authenticated learner profile without copying email into Firestore data', async () => {
    const savedProfiles: unknown[] = [];
    const response = await request(
      createApiApp({
        learningRepository: createLearningRepository({
          bootstrapLearner: async (input) => {
            const profile = {
              schemaVersion: 1,
              uid: input.uid,
              displayName: input.displayName,
              avatarUrl: null,
              locale: 'vi',
              theme: 'system',
              status: 'active',
            };

            savedProfiles.push(profile);

            return { data: { profile }, statusCode: 201 };
          },
        }),
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
          email: 'learner@example.test',
        }),
      }),
    )
      .post('/api/v1/users/me/bootstrap')
      .set('authorization', 'Bearer local-id-token')
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      data: {
        profile: {
          schemaVersion: 1,
          uid: 'learner-01',
          displayName: 'Local Student',
          avatarUrl: null,
          locale: 'vi',
          theme: 'system',
          status: 'active',
        },
      },
      requestId: response.headers['x-request-id'],
    });
    expect(JSON.stringify(savedProfiles)).not.toContain('learner@example.test');
  });

  it('updates authenticated learner preferences without accepting extra profile fields', async () => {
    const updatedProfiles: unknown[] = [];
    const response = await request(
      createApiApp({
        learningRepository: createLearningRepository({
          updateLearnerPreferences: async (input) => {
            const profile = {
              schemaVersion: 1,
              uid: input.uid,
              displayName: input.displayName,
              avatarUrl: null,
              locale: input.locale ?? 'vi',
              theme: input.theme ?? 'system',
              status: 'active',
            };

            updatedProfiles.push(profile);

            return { data: { profile }, statusCode: 200 };
          },
        }),
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
          email: 'learner@example.test',
        }),
      }),
    )
      .patch('/api/v1/users/me/preferences')
      .set('authorization', 'Bearer local-id-token')
      .send({ locale: 'en', theme: 'dark' })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        profile: {
          schemaVersion: 1,
          uid: 'learner-01',
          displayName: 'Local Student',
          avatarUrl: null,
          locale: 'en',
          theme: 'dark',
          status: 'active',
        },
      },
      requestId: response.headers['x-request-id'],
    });
    expect(JSON.stringify(updatedProfiles)).not.toContain('learner@example.test');
  });

  it('rejects invalid learner preference values before calling the repository', async () => {
    const app = createApiApp({
      learningRepository: createLearningRepository({
        updateLearnerPreferences: async () => {
          throw new Error('Preference repository should not run for invalid values.');
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .patch('/api/v1/users/me/preferences')
      .set('authorization', 'Bearer local-id-token')
      .send({ locale: 'fr', theme: 'dark' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_REQUEST_BODY');
  });

  it('rejects unsupported learner preference fields before calling the repository', async () => {
    const app = createApiApp({
      learningRepository: createLearningRepository({
        updateLearnerPreferences: async () => {
          throw new Error('Preference repository should not run for unsupported fields.');
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .patch('/api/v1/users/me/preferences')
      .set('authorization', 'Bearer local-id-token')
      .send({ email: 'learner@example.test', locale: 'en' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_REQUEST_BODY');
  });

  it('deletes the recent authenticated learner account using only the token owner', async () => {
    const deletedAuthUsers: string[] = [];
    const deletedLearningAccounts: string[] = [];
    const deletedPlaygroundAccounts: string[] = [];
    const deletionSteps: string[] = [];
    const app = createApiApp({
      deleteAuthUser: async (uid) => {
        deletedAuthUsers.push(uid);
        deletionSteps.push(`auth:${uid}`);
      },
      learningRepository: createLearningRepository({
        deleteLearnerAccount: async (input) => {
          deletedLearningAccounts.push(input.uid);
          deletionSteps.push(`learning:${input.uid}`);

          return { data: null, statusCode: 204 };
        },
      }),
      playgroundRepository: createPlaygroundRepository({
        deleteLearnerPlaygroundData: async (input) => {
          deletedPlaygroundAccounts.push(input.uid);
          deletionSteps.push(`playground:${input.uid}`);

          return { data: null, statusCode: 204 };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
        authTime: Math.floor(Date.now() / 1000),
      }),
    });

    await request(app)
      .delete('/api/v1/users/me')
      .set('authorization', 'Bearer local-id-token')
      .expect(204);

    expect(deletedAuthUsers).toEqual(['learner-01']);
    expect(deletedLearningAccounts).toEqual(['learner-01']);
    expect(deletedPlaygroundAccounts).toEqual(['learner-01']);
    expect(deletionSteps).toEqual([
      'auth:learner-01',
      'learning:learner-01',
      'playground:learner-01',
    ]);
  });

  it('rejects learner account deletion bodies before any destructive work', async () => {
    const app = createApiApp({
      deleteAuthUser: async () => {
        throw new Error('Auth user deletion should not run when the body is unsupported.');
      },
      learningRepository: createLearningRepository({
        deleteLearnerAccount: async () => {
          throw new Error('Learning cleanup should not run when the body is unsupported.');
        },
      }),
      playgroundRepository: createPlaygroundRepository({
        deleteLearnerPlaygroundData: async () => {
          throw new Error('Playground cleanup should not run when the body is unsupported.');
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
        authTime: Math.floor(Date.now() / 1000),
      }),
    });

    const response = await request(app)
      .delete('/api/v1/users/me')
      .set('authorization', 'Bearer local-id-token')
      .send({ uid: 'attacker-uid' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_REQUEST_BODY');
  });

  it('requires recent authentication before deleting a learner account', async () => {
    const app = createApiApp({
      deleteAuthUser: async () => {
        throw new Error('Auth user deletion should not run without recent sign-in.');
      },
      learningRepository: createLearningRepository({
        deleteLearnerAccount: async () => {
          throw new Error('Learning cleanup should not run without recent sign-in.');
        },
      }),
      playgroundRepository: createPlaygroundRepository({
        deleteLearnerPlaygroundData: async () => {
          throw new Error('Playground cleanup should not run without recent sign-in.');
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
        authTime: Math.floor(Date.now() / 1000) - 301,
      }),
    });

    const response = await request(app)
      .delete('/api/v1/users/me')
      .set('authorization', 'Bearer local-id-token')
      .expect(401);

    expect(response.body.error.code).toBe('RECENT_SIGN_IN_REQUIRED');
  });

  it('continues learner data cleanup when the Firebase Auth user is already deleted', async () => {
    const cleanedUpLearners: string[] = [];
    const app = createApiApp({
      deleteAuthUser: async () => {
        const error = new Error('User not found.') as Error & { code: string };

        error.code = 'auth/user-not-found';
        throw error;
      },
      learningRepository: createLearningRepository({
        deleteLearnerAccount: async (input) => {
          cleanedUpLearners.push(`learning:${input.uid}`);

          return { data: null, statusCode: 204 };
        },
      }),
      playgroundRepository: createPlaygroundRepository({
        deleteLearnerPlaygroundData: async (input) => {
          cleanedUpLearners.push(`playground:${input.uid}`);

          return { data: null, statusCode: 204 };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
        authTime: Math.floor(Date.now() / 1000),
      }),
    });

    await request(app)
      .delete('/api/v1/users/me')
      .set('authorization', 'Bearer local-id-token')
      .expect(204);

    expect(cleanedUpLearners).toEqual(['learning:learner-01', 'playground:learner-01']);
  });

  it('requires an idempotency key before enrolling a learner', async () => {
    const app = createApiApp({
      learningRepository: createLearningRepository({
        enrollLearner: async () => {
          throw new Error('Enrollment repository should not run without an idempotency key.');
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/courses/course-deep-learning-basic/enrollments')
      .set('authorization', 'Bearer local-id-token')
      .expect(400);

    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('enrolls an authenticated learner idempotently and opens the first module overview', async () => {
    const idempotencyRecords = new Map<string, unknown>();
    const enrollmentKeys = new Set<string>();
    const app = createApiApp({
      learningRepository: createLearningRepository({
        enrollLearner: async (input: { courseId: string; idempotencyKey: string; uid: string }) => {
          const requestHash = `${input.uid}:${input.courseId}`;
          const stored = idempotencyRecords.get(input.idempotencyKey);

          if (stored) {
            return stored as {
              data: unknown;
              statusCode: 201;
            };
          }

          enrollmentKeys.add(requestHash);

          const result = {
            statusCode: 201 as const,
            data: {
              enrollment: {
                courseId: input.courseId,
                status: 'in-progress',
                progressPercent: 0,
              },
              access: {
                moduleId: 'dl-m01-neuron-perceptron',
              },
              nextPath: '/learn/course-deep-learning-basic',
            },
          };

          idempotencyRecords.set(input.idempotencyKey, result);

          return result;
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const firstResponse = await request(app)
      .post('/api/v1/courses/course-deep-learning-basic/enrollments')
      .set('authorization', 'Bearer local-id-token')
      .set('idempotency-key', '9a7939e4-498e-4646-91db-59f836a6fa2f')
      .expect(201);
    const retryResponse = await request(app)
      .post('/api/v1/courses/course-deep-learning-basic/enrollments')
      .set('authorization', 'Bearer local-id-token')
      .set('idempotency-key', '9a7939e4-498e-4646-91db-59f836a6fa2f')
      .expect(201);

    expect(firstResponse.body.data).toEqual({
      enrollment: {
        courseId: 'course-deep-learning-basic',
        status: 'in-progress',
        progressPercent: 0,
      },
      access: {
        moduleId: 'dl-m01-neuron-perceptron',
      },
      nextPath: '/learn/course-deep-learning-basic',
    });
    expect(retryResponse.body.data).toEqual(firstResponse.body.data);
    expect(enrollmentKeys).toEqual(new Set(['learner-01:course-deep-learning-basic']));
  });

  it('rejects demo completion when required steps are missing', async () => {
    const app = createApiApp({
      learningRepository: createLearningRepository({
        completeDemo: async () => {
          return {
            data: {
              error: 'This mock should not decide validation.',
            },
            statusCode: 200,
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/demos/demo-perceptron-and-gate/completions')
      .set('authorization', 'Bearer local-id-token')
      .set('idempotency-key', '31d6bb65-a49f-46ff-a213-93902164459b')
      .send({ viewedStepIds: ['and-problem', 'and-data'] })
      .expect(400);

    expect(response.body.error.code).toBe('REQUIRED_DEMO_STEPS_MISSING');
  });

  it('emits an idempotent demo completion event after all required steps are viewed', async () => {
    const completedKeys = new Set<string>();
    const app = createApiApp({
      learningRepository: createLearningRepository({
        completeDemo: async (input) => {
          completedKeys.add(`${input.uid}:${input.demoId}`);

          return {
            statusCode: 200,
            data: {
              completion: {
                demoId: input.demoId,
                status: 'completed',
              },
              event: {
                type: 'demo_completed',
                demoId: input.demoId,
                requiredStepIds: input.requiredStepIds,
                viewedStepIds: input.viewedStepIds,
              },
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/demos/demo-perceptron-and-gate/completions')
      .set('authorization', 'Bearer local-id-token')
      .set('idempotency-key', '3a39749f-d51a-4370-85db-e4f0f8c736da')
      .send({ viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'] })
      .expect(200);

    expect(response.body.data).toEqual({
      completion: {
        demoId: 'demo-perceptron-and-gate',
        status: 'completed',
      },
      event: {
        type: 'demo_completed',
        demoId: 'demo-perceptron-and-gate',
        requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
        viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
      },
    });
    expect(completedKeys).toEqual(new Set(['learner-01:demo-perceptron-and-gate']));
  });

  it('creates a quiz attempt through the authenticated learner boundary', async () => {
    const createdAttempts = new Set<string>();
    const app = createApiApp({
      learningRepository: createLearningRepository({
        createQuizAttempt: async (input) => {
          createdAttempts.add(`${input.uid}:${input.quizId}`);

          return {
            statusCode: 201,
            data: {
              attempt: {
                attemptId: 'attempt-quiz-post-dl-p01-01',
                attemptNumber: 1,
                expiresAt: '2026-07-19T13:00:00.000Z',
                passingScorePercent: 100,
                questionCount: 3,
                quizId: input.quizId,
                quizKind: 'post',
                requiredCorrectCount: 3,
                shuffleSeed: null,
              },
              mastery: {
                en: 'Answer all 3 questions correctly to complete this lesson.',
                vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
              },
              questions: [
                {
                  options: [
                    {
                      optionId: 'opt-linear-limit',
                      text: {
                        en: 'A straight-line decision boundary has a known limit.',
                        vi: 'Ranh giới quyết định thẳng có một giới hạn rõ.',
                      },
                    },
                  ],
                  prompt: {
                    en: 'What does XOR show?',
                    vi: 'XOR cho thấy điều gì?',
                  },
                  questionId: 'q-dl-p01-perceptron-role',
                  type: 'single-choice',
                },
              ],
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/quizzes/quiz-post-dl-p01/attempts')
      .set('authorization', 'Bearer local-id-token')
      .expect(201);

    expect(response.body.data.attempt).toMatchObject({
      attemptId: 'attempt-quiz-post-dl-p01-01',
      quizId: 'quiz-post-dl-p01',
      requiredCorrectCount: 3,
    });
    expect(JSON.stringify(response.body.data)).not.toMatch(
      /correctAnswer|correctOption|hint|explanation/i,
    );
    expect(createdAttempts).toEqual(new Set(['learner-01:quiz-post-dl-p01']));
  });

  it('submits a quiz attempt idempotently through the authenticated owner boundary', async () => {
    const submissions = new Set<string>();
    const app = createApiApp({
      learningRepository: createLearningRepository({
        submitQuizAttempt: async (input) => {
          submissions.add(`${input.uid}:${input.attemptId}:${input.idempotencyKey}`);

          return {
            statusCode: 200,
            data: {
              bestScore: 100,
              feedback: [
                {
                  correctAnswer: 'opt-linear-limit',
                  explanation: {
                    en: 'XOR is not linearly separable.',
                    vi: 'XOR không tách tuyến tính được.',
                  },
                  hint: null,
                  hintLevel: 0,
                  isCorrect: true,
                  questionId: 'q-dl-p01-perceptron-role',
                },
              ],
              newlyUnlocked: [{ id: 'dl-p01-neuron-perceptron', type: 'post' }],
              passed: true,
              score: 100,
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/quiz-attempts/attempt-quiz-post-dl-p01-01/submissions')
      .set('authorization', 'Bearer local-id-token')
      .set('idempotency-key', '38fd203c-e09f-40e4-a26c-50127c6b24ee')
      .send({
        answers: [{ questionId: 'q-dl-p01-perceptron-role', value: 'opt-linear-limit' }],
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      passed: true,
      score: 100,
    });
    expect(submissions).toEqual(
      new Set(['learner-01:attempt-quiz-post-dl-p01-01:38fd203c-e09f-40e4-a26c-50127c6b24ee']),
    );
  });

  it('records authenticated post block views with an allowlisted body contract', async () => {
    const recordedViews: unknown[] = [];
    const app = createApiApp({
      learningRepository: createLearningRepository({
        recordPostView: async (input) => {
          recordedViews.push(input);

          return {
            statusCode: 200,
            data: {
              postView: {
                contentViewed: false,
                postId: input.postId,
                readingPosition: input.readingPosition,
                started: true,
                viewedItemIds: input.viewedItemIds,
              },
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/posts/dl-p01-neuron-perceptron/views')
      .set('authorization', 'Bearer local-id-token')
      .send({
        readingPosition: 'weighted-sum',
        viewedItemIds: ['what-is-a-neuron', 'neuron-explanation'],
      })
      .expect(200);

    expect(response.body.data.postView).toMatchObject({
      postId: 'dl-p01-neuron-perceptron',
      readingPosition: 'weighted-sum',
    });
    expect(recordedViews).toEqual([
      {
        postId: 'dl-p01-neuron-perceptron',
        readingPosition: 'weighted-sum',
        uid: 'learner-01',
        viewedItemIds: ['what-is-a-neuron', 'neuron-explanation'],
      },
    ]);
  });

  it('records an authenticated module overview through the owner boundary', async () => {
    const app = createApiApp({
      learningRepository: createLearningRepository({
        recordModuleOverview: async (input) => ({
          statusCode: 200,
          data: {
            moduleOverview: {
              moduleId: input.moduleId,
              nextPostId: 'dl-p01-neuron-perceptron',
              status: 'completed',
            },
          },
        }),
      }),
      verifyAuthToken: async () => ({ uid: 'learner-01', displayName: 'Local Student' }),
    });

    const response = await request(app)
      .post('/api/v1/module-overviews/dl-m01-neuron-perceptron/views')
      .set('authorization', 'Bearer local-id-token')
      .expect(200);

    expect(response.body.data.moduleOverview).toMatchObject({
      moduleId: 'dl-m01-neuron-perceptron',
      nextPostId: 'dl-p01-neuron-perceptron',
    });
  });

  it('records authenticated demo views and confirms post completion through allowlisted routes', async () => {
    const demoViewCalls: unknown[] = [];
    const completionCalls: unknown[] = [];
    const app = createApiApp({
      learningRepository: createLearningRepository({
        completePost: async (input) => {
          completionCalls.push(input);
          return {
            statusCode: 200,
            data: { completion: { postId: input.postId, status: 'completed' } },
          };
        },
        recordDemoView: async (input) => {
          demoViewCalls.push(input);
          return {
            statusCode: 200,
            data: {
              demoView: { demoId: input.demoId, started: true, viewedStepIds: input.viewedStepIds },
            },
          };
        },
      }),
      verifyAuthToken: async () => ({ uid: 'learner-01', displayName: 'Local Student' }),
    });

    await request(app)
      .post('/api/v1/demos/demo-perceptron-and-gate/views')
      .set('authorization', 'Bearer local-id-token')
      .send({ viewedStepIds: ['and-problem'] })
      .expect(200);
    await request(app)
      .post('/api/v1/posts/dl-p01-neuron-perceptron/completions')
      .set('authorization', 'Bearer local-id-token')
      .set('idempotency-key', '39f43d7f-ee38-4e4e-92b6-7a1b2bfb6f7e')
      .expect(200);

    expect(demoViewCalls).toEqual([
      {
        demoId: 'demo-perceptron-and-gate',
        uid: 'learner-01',
        viewedStepIds: ['and-problem'],
      },
    ]);
    expect(completionCalls).toEqual([
      {
        idempotencyKey: '39f43d7f-ee38-4e4e-92b6-7a1b2bfb6f7e',
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      },
    ]);
  });

  it('returns the authenticated learner progress snapshot through the owner boundary', async () => {
    const progressReads = new Set<string>();
    const learningRepository = {
      ...createLearningRepository({}),
      getProgress: async (input: { uid: string }) => {
        progressReads.add(input.uid);

        return {
          statusCode: 200 as const,
          data: {
            algorithmUnlocks: [
              {
                algorithmId: 'perceptron',
                moduleId: 'dl-m01-neuron-perceptron',
              },
            ],
            contentAccess: [
              {
                contentType: 'post',
                entityId: 'dl-p01-neuron-perceptron',
              },
            ],
            enrollment: {
              courseId: 'course-deep-learning-basic',
              progressPercent: 33,
              status: 'in-progress',
            },
            modules: [
              {
                completedStepCount: 3,
                moduleId: 'dl-m01-neuron-perceptron',
                progressPercent: 100,
                requiredStepCount: 3,
                status: 'completed',
              },
            ],
          },
        };
      },
    } as LearningRepository & {
      getProgress(input: { uid: string }): Promise<{ data: unknown; statusCode: 200 }>;
    };
    const app = createApiApp({
      learningRepository,
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .get('/api/v1/users/me/progress')
      .set('authorization', 'Bearer local-id-token')
      .expect(200);

    expect(response.body.data.enrollment).toEqual({
      courseId: 'course-deep-learning-basic',
      progressPercent: 33,
      status: 'in-progress',
    });
    expect(response.body.data.algorithmUnlocks).toEqual([
      {
        algorithmId: 'perceptron',
        moduleId: 'dl-m01-neuron-perceptron',
      },
    ]);
    expect(progressReads).toEqual(new Set(['learner-01']));
  });

  it('rejects student access to the admin content inventory', async () => {
    const response = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
        }),
      }),
    )
      .get('/api/v1/admin/content')
      .set('authorization', 'Bearer local-id-token')
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ADMIN_FORBIDDEN',
        message: 'Admin access is required.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it("reports the authenticated user's own admin access without granting admin APIs", async () => {
    const learnerResponse = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
        }),
      }),
    )
      .get('/api/v1/admin/access')
      .set('authorization', 'Bearer learner-id-token')
      .expect(200);

    expect(learnerResponse.body.data).toEqual({ isAdmin: false });

    const adminResponse = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'admin-01',
          displayName: 'Operator',
          role: 'admin',
        }),
      }),
    )
      .get('/api/v1/admin/access')
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(adminResponse.body.data).toEqual({ isAdmin: true });

    const protectedApiResponse = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
        }),
      }),
    )
      .get('/api/v1/admin/content')
      .set('authorization', 'Bearer learner-id-token')
      .expect(403);

    expect(protectedApiResponse.body.error.code).toBe('ADMIN_FORBIDDEN');
  });

  it('rejects student access to the admin progress summary', async () => {
    const response = await request(
      createApiApp({
        adminReportRepository: {
          getSummary: async () => {
            throw new Error('Report repository should not run for student access.');
          },
        },
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
        }),
      }),
    )
      .get('/api/v1/admin/reports/summary')
      .set('authorization', 'Bearer local-id-token')
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ADMIN_FORBIDDEN',
        message: 'Admin access is required.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('returns an admin progress summary with separated trust domains', async () => {
    const reportReads = new Set<string>();
    const app = createApiApp({
      adminReportRepository: {
        getSummary: async (input: { actorUid: string }) => {
          reportReads.add(input.actorUid);

          return {
            statusCode: 200 as const,
            data: {
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
                moduleProgress: [
                  {
                    moduleId: 'dl-m01-neuron-perceptron',
                    startedCount: 2,
                    completedCount: 1,
                    completionRate: 0.5,
                  },
                ],
                postProgress: [
                  {
                    postId: 'dl-p01-neuron-perceptron',
                    startedCount: 3,
                    completedCount: 2,
                    completionRate: 0.67,
                  },
                ],
                quizSummary: {
                  averageScorePercent: 81,
                  passedAttemptCount: 5,
                  totalAttemptCount: 6,
                  commonWrongQuestions: [
                    {
                      quizId: 'quiz-module-dl-m01',
                      questionId: 'q-dl-m01-xor-limit',
                      wrongCount: 3,
                    },
                  ],
                },
                algorithmUnlocks: [
                  {
                    algorithmId: 'perceptron',
                    unlockedLearnerCount: 2,
                  },
                ],
              },
              playgroundClientReported: {
                verificationLevel: 'client-computed',
                runCount: 9,
                failedRunCount: 1,
                errorRate: 0.11,
                scenarioActivity: [
                  {
                    scenarioId: 'pg-xor',
                    algorithmId: 'perceptron',
                    runCount: 9,
                    failedRunCount: 1,
                  },
                ],
              },
              contentLifecycle: {
                publishedCount: 8,
                draftCount: 1,
                validationPendingCount: 1,
                unpublishedCount: 0,
              },
            },
          };
        },
      },
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    const response = await request(app)
      .get('/api/v1/admin/reports/summary')
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(response.body.data.learningVerified.verificationLevel).toBe('server-verified');
    expect(response.body.data.playgroundClientReported.verificationLevel).toBe('client-computed');
    expect(response.body.data.learningVerified.courseProgress).toEqual([
      {
        courseId: 'course-deep-learning-basic',
        enrolledCount: 3,
        startedCount: 2,
        completedCount: 1,
        averageProgressPercent: 42,
      },
    ]);
    expect(JSON.stringify(response.body.data)).not.toMatch(/email|@example|displayName/i);
    expect(reportReads).toEqual(new Set(['admin-01']));
  });

  it('lists seeded admin content without leaking quiz keys or hints', async () => {
    const response = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'admin-01',
          displayName: 'Operator',
          role: 'admin',
        }),
      }),
    )
      .get('/api/v1/admin/content')
      .query({ entityType: 'post', courseId: 'course-deep-learning-basic' })
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.content).toEqual([
      expect.objectContaining({
        entityType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        courseId: 'course-deep-learning-basic',
        moduleId: 'dl-m01-neuron-perceptron',
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        sourceReview: {
          attribution: {
            en: expect.stringContaining('Google Machine Learning Crash Course'),
            vi: expect.stringContaining('Google Machine Learning Crash Course'),
          },
          license: {
            name: 'CC BY 4.0',
            url: 'https://creativecommons.org/licenses/by/4.0/',
          },
          sourceId: 'source-google-ml-crash-course',
          title: 'Google Machine Learning Crash Course',
        },
        status: 'published',
        localeAvailability: ['en', 'vi'],
        preview: {
          en: expect.stringContaining('single neuron'),
          vi: expect.any(String),
        },
      }),
    ]);
    expect(JSON.stringify(response.body.data.content)).not.toMatch(
      /correctAnswer|answerKey|explanation|hint/i,
    );
  });

  it('returns reviewed source metadata per seeded content family without a global fallback', async () => {
    const response = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'admin-01',
          displayName: 'Operator',
          role: 'admin',
        }),
      }),
    )
      .get('/api/v1/admin/content')
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    const sourceByEntityId = new Map(
      response.body.data.content.map(
        (item: { entityId: string; sourceReview: AdminContentSummary['sourceReview'] }) => [
          item.entityId,
          item.sourceReview,
        ],
      ),
    );

    expect(sourceByEntityId.get('course-classical-ml')).toEqual(
      expect.objectContaining({
        license: {
          name: 'CC BY-NC-SA 4.0',
          url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
        },
        sourceId: 'source-mit-ocw-6036',
        title: 'MIT OpenCourseWare 6.036 Introduction to Machine Learning',
      }),
    );
    expect(sourceByEntityId.get('course-deep-learning-basic')).toEqual(
      expect.objectContaining({
        license: {
          name: 'CC BY-SA 4.0',
          url: 'https://creativecommons.org/licenses/by-sa/4.0/',
        },
        sourceId: 'source-d2l-vi',
        title: 'Dive into Deep Learning - Vietnamese',
      }),
    );
    expect(sourceByEntityId.get('dl-p01-neuron-perceptron')).toEqual(
      expect.objectContaining({
        license: {
          name: 'CC BY 4.0',
          url: 'https://creativecommons.org/licenses/by/4.0/',
        },
        sourceId: 'source-google-ml-crash-course',
        title: 'Google Machine Learning Crash Course',
      }),
    );
  });

  it('creates a draft from published seeded content without changing the published inventory', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    const createResponse = await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toEqual({
      draft: expect.objectContaining({
        baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        courseId: 'course-deep-learning-basic',
        draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        moduleId: 'dl-m01-neuron-perceptron',
        preview: {
          en: expect.stringContaining('single neuron'),
          vi: expect.any(String),
        },
        revisionVersion: 1,
        sourceReview: expect.objectContaining({
          license: {
            name: 'CC BY 4.0',
            url: 'https://creativecommons.org/licenses/by/4.0/',
          },
          sourceId: 'source-google-ml-crash-course',
          title: 'Google Machine Learning Crash Course',
        }),
        sourceStatus: 'seeded',
        status: 'draft',
        validationStatus: 'not-run',
      }),
      published: expect.objectContaining({
        draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        status: 'published',
      }),
    });
    expect(JSON.stringify(createResponse.body.data)).not.toMatch(
      /correctAnswer|answerKey|explanation|hint/i,
    );

    const inventoryResponse = await request(app)
      .get('/api/v1/admin/content')
      .query({ entityType: 'post', courseId: 'course-deep-learning-basic' })
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(inventoryResponse.body.data.content).toEqual([
      expect.objectContaining({
        draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        entityId: 'dl-p01-neuron-perceptron',
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        status: 'published',
      }),
    ]);
  });

  it('updates allowlisted draft text and metadata without changing the published inventory', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    const updateResponse = await request(app)
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 1,
        title: {
          en: 'Draft neuron decision title',
          vi: 'Tiêu đề draft neuron',
        },
        preview: {
          en: 'Draft-only learner preview copy.',
          vi: 'Bản preview chỉ nằm trong draft.',
        },
        metadata: {
          attribution: {
            en: 'Adapted from approved Release 1 sources.',
            vi: 'Biên soạn từ nguồn Release 1 đã duyệt.',
          },
          externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
        },
      })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.draft).toEqual(
      expect.objectContaining({
        draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        metadata: {
          attribution: {
            en: 'Adapted from approved Release 1 sources.',
            vi: 'Biên soạn từ nguồn Release 1 đã duyệt.',
          },
          externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
        },
        preview: {
          en: 'Draft-only learner preview copy.',
          vi: 'Bản preview chỉ nằm trong draft.',
        },
        revisionVersion: 2,
        sourceReview: expect.objectContaining({
          license: {
            name: 'CC BY 4.0',
            url: 'https://creativecommons.org/licenses/by/4.0/',
          },
          sourceId: 'source-google-ml-crash-course',
          title: 'Google Machine Learning Crash Course',
        }),
        title: {
          en: 'Draft neuron decision title',
          vi: 'Tiêu đề draft neuron',
        },
      }),
    );

    const inventoryResponse = await request(app)
      .get('/api/v1/admin/content')
      .query({ entityType: 'post', courseId: 'course-deep-learning-basic' })
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(inventoryResponse.body.data.content).toEqual([
      expect.objectContaining({
        draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        preview: {
          en: expect.stringContaining('single neuron'),
          vi: expect.any(String),
        },
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        status: 'published',
      }),
    ]);
  });

  it('rejects stale draft edits with optimistic concurrency conflict', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    await request(app)
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 1,
        title: {
          en: 'First draft title',
          vi: 'Tiêu đề draft đầu',
        },
      })
      .expect(200);

    const response = await request(app)
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 1,
        title: {
          en: 'Stale title',
          vi: 'Tiêu đề stale',
        },
      })
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ADMIN_CONTENT_DRAFT_VERSION_CONFLICT',
        message: 'The draft has changed. Reload it before saving again.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('rejects student draft edits', async () => {
    const response = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
        }),
      }),
    )
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
      .set('authorization', 'Bearer local-id-token')
      .send({
        revisionVersion: 1,
        title: {
          en: 'Student title',
          vi: 'Tiêu đề learner',
        },
      })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ADMIN_FORBIDDEN',
        message: 'Admin access is required.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('rejects structure fields outside the admin draft edit allowlist', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    const response = await request(app)
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 1,
        entityId: 'different-stable-id',
      })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_REQUEST_BODY',
        message: 'Unsupported request body fields: entityId.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('rejects unsafe external link metadata in draft edits', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    const response = await request(app)
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 1,
        metadata: {
          attribution: {
            en: 'Valid attribution',
            vi: 'Attribution hợp lệ',
          },
          externalLinkUrl: 'javascript:alert(1)',
        },
      })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_REQUEST_BODY',
        message: 'metadata.externalLinkUrl must be an HTTP(S) URL or null.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('fails draft validation when required source, license, attribution, or external link evidence is missing', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    const response = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(422);

    expect(response.body.error.code).toBe('ADMIN_CONTENT_DRAFT_VALIDATION_FAILED');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkId: 'external-link',
          status: 'failed',
        }),
      ]),
    );
  });

  it('fails draft validation when locale coverage is not exactly English and Vietnamese', async () => {
    const app = createApiApp({
      adminContentRepository: createStaticAdminContentRepository([
        {
          ...releaseOneContentFixture,
          localeAvailability: ['en', 'en'],
        } as unknown as AdminContentSummary,
      ]),
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);
    await setReviewedDraftSourceMetadata(app);

    const response = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(422);

    expect(response.body.error.code).toBe('ADMIN_CONTENT_DRAFT_VALIDATION_FAILED');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkId: 'locale-coverage',
          status: 'failed',
        }),
      ]),
    );
  });

  it('fails draft validation before publish when Release 1 hard limits are exceeded', async () => {
    const app = createApiApp({
      adminContentRepository: createStaticAdminContentRepository([
        ...Array.from({ length: 18 }, (_, index): AdminContentSummary => ({
          ...releaseOneContentFixture,
          entityId: `dl-p${String(index + 1).padStart(2, '0')}-post`,
          publishedRevisionId: `post-dl-p${String(index + 1).padStart(2, '0')}-rev-r1`,
        })),
        {
          ...releaseOneContentFixture,
          entityId: 'dl-p19-over-limit',
          publishedRevisionId: 'post-dl-p19-over-limit-rev-r1',
        },
      ]),
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-post/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);
    await request(app)
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-post-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 1,
        metadata: {
          attribution: {
            en: 'Reviewed source attribution.',
            vi: 'Attribution source reviewed.',
          },
          externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
        },
      })
      .expect(200);

    const response = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-post-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(422);

    expect(response.body.error.code).toBe('ADMIN_CONTENT_DRAFT_VALIDATION_FAILED');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkId: 'release-hard-limits',
          status: 'failed',
        }),
      ]),
    );
  });

  it('fails draft validation before publish when a demo problem id conflicts with the problem registry', async () => {
    const app = createApiApp({
      adminContentRepository: createStaticAdminContentRepository([
        {
          ...releaseOneContentFixture,
          entityId: 'demo-xor-conflict',
          entityType: 'demo',
          publishedRevisionId: 'demo-xor-conflict-rev-r1',
          validationManifest: {
            problemId: 'problem-pg-xor',
          },
        } as AdminContentSummary,
      ]),
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/demo/demo-xor-conflict/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);
    await request(app)
      .patch('/api/v1/admin/revisions/draft-demo-demo-xor-conflict-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 1,
        metadata: {
          attribution: {
            en: 'Reviewed source attribution.',
            vi: 'Attribution source reviewed.',
          },
          externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
        },
      })
      .expect(200);

    const response = await request(app)
      .post('/api/v1/admin/revisions/draft-demo-demo-xor-conflict-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(422);

    expect(response.body.error.code).toBe('ADMIN_CONTENT_DRAFT_VALIDATION_FAILED');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkId: 'problem-registry',
          status: 'failed',
        }),
      ]),
    );
  });

  it('fails draft validation before publish when task fingerprints are duplicated', async () => {
    const app = createApiApp({
      adminContentRepository: createStaticAdminContentRepository([
        {
          ...releaseOneContentFixture,
          entityId: 'dl-p01-neuron-perceptron',
          publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
          validationManifest: {
            blockCount: 12,
            taskFingerprints: ['tf-duplicate-semantic-task-v1'],
          },
        },
        {
          ...releaseOneContentFixture,
          entityId: 'quiz-post-dl-p01',
          entityType: 'quiz',
          publishedRevisionId: 'quiz-post-dl-p01-rev-r1',
          validationManifest: {
            questionCount: 3,
            taskFingerprints: ['tf-duplicate-semantic-task-v1'],
          },
        } as AdminContentSummary,
      ]),
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);
    await setReviewedDraftSourceMetadata(app);

    const response = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(422);

    expect(response.body.error.code).toBe('ADMIN_CONTENT_DRAFT_VALIDATION_FAILED');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkId: 'task-fingerprint-registry',
          status: 'failed',
        }),
      ]),
    );
  });

  it('validates and publishes a draft revision atomically without leaving a second draft pointer', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    await request(app)
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 1,
        metadata: {
          attribution: {
            en: 'Reviewed source attribution.',
            vi: 'Attribution source reviewed.',
          },
          externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
        },
      })
      .expect(200);

    const validateResponse = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(validateResponse.body.data.draft).toEqual(
      expect.objectContaining({
        draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        validationStatus: 'valid',
      }),
    );
    expect(validateResponse.body.data.validation).toEqual(
      expect.objectContaining({
        revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        status: 'valid',
      }),
    );

    const publishResponse = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/publish')
      .set('authorization', 'Bearer admin-id-token')
      .set('idempotency-key', 'publish-draft-neuron-01')
      .send({ reason: 'Reviewed localized draft copy for pilot release.' })
      .expect(200);

    expect(publishResponse.body.data.content).toEqual(
      expect.objectContaining({
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        previousPublishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        publishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        status: 'published',
        validationStatus: 'valid',
      }),
    );
    expect(publishResponse.body.data.lifecycleEvent).toEqual(
      expect.objectContaining({
        actorUid: 'admin-01',
        entityId: 'dl-p01-neuron-perceptron',
        fromRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        reason: 'Reviewed localized draft copy for pilot release.',
        toRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        type: 'published',
      }),
    );

    const retryResponse = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/publish')
      .set('authorization', 'Bearer admin-id-token')
      .set('idempotency-key', 'publish-draft-neuron-01')
      .send({ reason: 'Reviewed localized draft copy for pilot release.' })
      .expect(200);

    expect(retryResponse.body.data).toEqual(publishResponse.body.data);

    const inventoryResponse = await request(app)
      .get('/api/v1/admin/content')
      .query({ entityType: 'post', courseId: 'course-deep-learning-basic' })
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(inventoryResponse.body.data.content).toEqual([
      expect.objectContaining({
        draftRevisionId: null,
        previousPublishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        publishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        status: 'published',
      }),
    ]);
  });

  it('unpublishes a course idempotently without changing the current revision pointer', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    const unpublishResponse = await request(app)
      .post('/api/v1/admin/entities/course-deep-learning-basic/unpublish')
      .set('authorization', 'Bearer admin-id-token')
      .send({ reason: 'Pause new enrollments during pilot review.' })
      .expect(200);

    expect(unpublishResponse.body.data.content).toEqual(
      expect.objectContaining({
        draftRevisionId: null,
        entityId: 'course-deep-learning-basic',
        entityType: 'course',
        publishedRevisionId: 'course-deep-learning-basic-rev-r1',
        status: 'unpublished',
      }),
    );
    expect(unpublishResponse.body.data.lifecycleEvent).toEqual(
      expect.objectContaining({
        actorUid: 'admin-01',
        entityId: 'course-deep-learning-basic',
        fromRevisionId: 'course-deep-learning-basic-rev-r1',
        reason: 'Pause new enrollments during pilot review.',
        toRevisionId: null,
        type: 'unpublished',
      }),
    );

    const retryResponse = await request(app)
      .post('/api/v1/admin/entities/course-deep-learning-basic/unpublish')
      .set('authorization', 'Bearer admin-id-token')
      .send({ reason: 'Pause new enrollments during pilot review.' })
      .expect(200);

    expect(retryResponse.body.data.content).toEqual(unpublishResponse.body.data.content);

    const inventoryResponse = await request(app)
      .get('/api/v1/admin/content')
      .query({ entityType: 'course', courseId: 'course-deep-learning-basic' })
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(inventoryResponse.body.data.content).toEqual([
      expect.objectContaining({
        publishedRevisionId: 'course-deep-learning-basic-rev-r1',
        status: 'unpublished',
      }),
    ]);
  });

  it('rolls back the published pointer to a previous immutable revision', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);
    await setReviewedDraftSourceMetadata(app);
    await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);
    await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/publish')
      .set('authorization', 'Bearer admin-id-token')
      .set('idempotency-key', 'publish-before-rollback-01')
      .send({ reason: 'Publish draft before rollback drill.' })
      .expect(200);

    const rollbackResponse = await request(app)
      .post('/api/v1/admin/revisions/post-dl-p01-neuron-perceptron-rev-r1/rollback')
      .set('authorization', 'Bearer admin-id-token')
      .send({ reason: 'Rollback to the previous approved text revision.' })
      .expect(200);

    expect(rollbackResponse.body.data.content).toEqual(
      expect.objectContaining({
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        previousPublishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        status: 'published',
      }),
    );
    expect(rollbackResponse.body.data.content.preview.en).toContain('single neuron');
    expect(rollbackResponse.body.data.lifecycleEvent).toEqual(
      expect.objectContaining({
        actorUid: 'admin-01',
        entityId: 'dl-p01-neuron-perceptron',
        fromRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        reason: 'Rollback to the previous approved text revision.',
        toRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        type: 'rolled-back',
      }),
    );

    const inventoryResponse = await request(app)
      .get('/api/v1/admin/content')
      .query({ entityType: 'post', courseId: 'course-deep-learning-basic' })
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    expect(inventoryResponse.body.data.content).toEqual([
      expect.objectContaining({
        draftRevisionId: null,
        previousPublishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
        publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        status: 'published',
      }),
    ]);
  });

  it('blocks publish until the current draft revision has passed validation', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    const firstPublishResponse = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/publish')
      .set('authorization', 'Bearer admin-id-token')
      .set('idempotency-key', 'publish-unvalidated-01')
      .send({ reason: 'Attempt publish without validator pass.' })
      .expect(422);

    expect(firstPublishResponse.body.error.code).toBe('ADMIN_CONTENT_VALIDATION_REQUIRED');

    await setReviewedDraftSourceMetadata(app);
    await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    const editResponse = await request(app)
      .patch('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1')
      .set('authorization', 'Bearer admin-id-token')
      .send({
        revisionVersion: 2,
        title: {
          en: 'Edited after validation',
          vi: 'Tiêu đề sửa sau validation',
        },
      })
      .expect(200);

    expect(editResponse.body.data.draft).toEqual(
      expect.objectContaining({
        revisionVersion: 3,
        validationStatus: 'not-run',
      }),
    );

    const secondPublishResponse = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/publish')
      .set('authorization', 'Bearer admin-id-token')
      .set('idempotency-key', 'publish-stale-validation-01')
      .send({ reason: 'Attempt publish after editing a validated draft.' })
      .expect(422);

    expect(secondPublishResponse.body.error.code).toBe('ADMIN_CONTENT_VALIDATION_REQUIRED');
  });

  it('requires an idempotency key for admin publish', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);
    await setReviewedDraftSourceMetadata(app);
    await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/validate')
      .set('authorization', 'Bearer admin-id-token')
      .expect(200);

    const response = await request(app)
      .post('/api/v1/admin/revisions/draft-post-dl-p01-neuron-perceptron-rev-d1/publish')
      .set('authorization', 'Bearer admin-id-token')
      .send({ reason: 'Publish without required idempotency header.' })
      .expect(400);

    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('rejects unauthorized lifecycle actions and unsupported non-course unpublish scope', async () => {
    const studentResponse = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
        }),
      }),
    )
      .post('/api/v1/admin/entities/course-deep-learning-basic/unpublish')
      .set('authorization', 'Bearer local-id-token')
      .send({ reason: 'Student cannot unpublish content.' })
      .expect(403);

    expect(studentResponse.body.error.code).toBe('ADMIN_FORBIDDEN');

    const postResponse = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'admin-01',
          displayName: 'Operator',
          role: 'admin',
        }),
      }),
    )
      .post('/api/v1/admin/entities/dl-p01-neuron-perceptron/unpublish')
      .set('authorization', 'Bearer admin-id-token')
      .send({ reason: 'Unsupported standalone post unpublish.' })
      .expect(409);

    expect(postResponse.body.error.code).toBe('ADMIN_CONTENT_UNPUBLISH_SCOPE_UNSUPPORTED');
  });

  it('rejects creating a second draft for the same seeded content item', async () => {
    const app = createApiApp({
      verifyAuthToken: async () => ({
        uid: 'admin-01',
        displayName: 'Operator',
        role: 'admin',
      }),
    });

    await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(201);

    const response = await request(app)
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer admin-id-token')
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ADMIN_CONTENT_DRAFT_ALREADY_EXISTS',
        message: 'This content item already has a draft.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('rejects student draft creation for seeded admin content', async () => {
    const response = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'learner-01',
          displayName: 'Local Student',
        }),
      }),
    )
      .post('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts')
      .set('authorization', 'Bearer local-id-token')
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ADMIN_FORBIDDEN',
        message: 'Admin access is required.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('rejects unsupported admin content entity filters', async () => {
    const response = await request(
      createApiApp({
        verifyAuthToken: async () => ({
          uid: 'admin-01',
          displayName: 'Operator',
          role: 'admin',
        }),
      }),
    )
      .get('/api/v1/admin/content')
      .query({ entityType: 'source' })
      .set('authorization', 'Bearer admin-id-token')
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ADMIN_CONTENT_ENTITY_TYPE_INVALID',
        message: 'The requested admin content entity type is not supported.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('rejects admin content seeds with a second current published pointer for the same entity', () => {
    expect(() =>
      createStaticAdminContentRepository([
        releaseOneContentFixture,
        {
          ...releaseOneContentFixture,
          publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r2',
          title: {
            en: 'Conflicting current title',
            vi: 'Tiêu đề current mâu thuẫn',
          },
        },
      ]),
    ).toThrowError(
      expect.objectContaining({
        code: 'ADMIN_CONTENT_CURRENT_POINTER_DUPLICATE',
        statusCode: 500,
      }),
    );
  });

  it('rejects admin content seeds that reuse a published revision id across entities', () => {
    expect(() =>
      createStaticAdminContentRepository([
        releaseOneContentFixture,
        {
          ...releaseOneContentFixture,
          entityId: 'dl-p02-mlp-forward-activation',
          publishedRevisionId: releaseOneContentFixture.publishedRevisionId,
          title: {
            en: 'Different entity reusing a revision',
            vi: 'Entity khác dùng lại revision',
          },
        },
      ]),
    ).toThrowError(
      expect.objectContaining({
        code: 'ADMIN_CONTENT_REVISION_ID_DUPLICATE',
        statusCode: 500,
      }),
    );
  });

  it('creates a playground run session through the authenticated learner boundary', async () => {
    const createdSessions = new Set<string>();
    const app = createApiApp({
      playgroundRepository: createPlaygroundRepository({
        createRunSession: async (input) => {
          createdSessions.add(
            `${input.uid}:${input.scenarioId}:${input.algorithmId}:${input.datasetVersionId}:${input.deviceProfile}`,
          );

          return {
            statusCode: 201,
            data: {
              sessionId: 'session-pg-xor-01',
              scenarioId: 'pg-xor',
              algorithmId: 'perceptron',
              datasetVersionId: 'ds-xor-noisy-v1',
              config: {
                learningRate: 0.1,
                epochs: 100,
                trainRatio: 0.75,
                seed: 42,
              },
              configHash: '9'.repeat(64),
              expiresAt: '2026-07-19T14:00:00.000Z',
              status: 'issued',
              verificationLevel: 'client-computed',
              workerProtocolVersion: 'ml-worker-v1',
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/playground-run-sessions')
      .set('authorization', 'Bearer local-id-token')
      .send({
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        deviceProfile: 'mobile',
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      sessionId: 'session-pg-xor-01',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      verificationLevel: 'client-computed',
    });
    expect(createdSessions).toEqual(
      new Set(['learner-01:pg-xor:perceptron:ds-xor-noisy-v1:mobile']),
    );
  });

  it('cancels a playground run session through the owner boundary', async () => {
    const cancelledSessions = new Set<string>();
    const app = createApiApp({
      playgroundRepository: createPlaygroundRepository({
        cancelRunSession: async (input) => {
          cancelledSessions.add(`${input.uid}:${input.sessionId}`);

          return {
            statusCode: 200,
            data: {
              sessionId: input.sessionId,
              status: 'cancelled',
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const response = await request(app)
      .post('/api/v1/playground-run-sessions/session-pg-xor-01/cancellations')
      .set('authorization', 'Bearer local-id-token')
      .expect(200);

    expect(response.body.data).toEqual({
      sessionId: 'session-pg-xor-01',
      status: 'cancelled',
    });
    expect(cancelledSessions).toEqual(new Set(['learner-01:session-pg-xor-01']));
  });

  it('saves, lists, and deletes playground runs through the authenticated owner boundary', async () => {
    const savedRuns = new Set<string>();
    const listedRunScenarios = new Set<string>();
    const deletedRuns = new Set<string>();
    const app = createApiApp({
      playgroundRepository: createPlaygroundRepository({
        deleteRun: async (input) => {
          deletedRuns.add(`${input.uid}:${input.runId}`);

          return {
            statusCode: 204,
            data: null,
          };
        },
        listRuns: async (input) => {
          listedRunScenarios.add(`${input.uid}:${input.scenarioId}`);

          return {
            statusCode: 200,
            data: {
              runs: [
                {
                  runId: 'run-pg-xor-01',
                  scenarioId: 'pg-xor',
                  algorithmId: 'perceptron',
                  datasetVersionId: 'ds-xor-noisy-v1',
                  config: {
                    learningRate: 0.1,
                    epochs: 100,
                    trainRatio: 0.75,
                    seed: 42,
                  },
                  durationMs: 1234,
                  feedback: ['linear-limit'],
                  isPinned: false,
                  metrics: {
                    accuracy: 0.5,
                    loss: 0.5,
                    testAccuracy: 0.5,
                    trainAccuracy: 0.5,
                  },
                  createdAt: '2026-07-19T14:00:00.000Z',
                  targetReached: null,
                  targetVersionId: null,
                  verificationLevel: 'client-computed',
                },
              ],
            },
          };
        },
        saveRun: async (input) => {
          savedRuns.add(
            `${input.uid}:${input.idempotencyKey}:${input.sessionId}:${
              typeof input.result === 'object' && input.result !== null ? 'result' : 'missing'
            }`,
          );

          return {
            statusCode: 201,
            data: {
              run: {
                runId: 'run-pg-xor-01',
                scenarioId: 'pg-xor',
                algorithmId: 'perceptron',
                datasetVersionId: 'ds-xor-noisy-v1',
                config: {
                  learningRate: 0.1,
                  epochs: 100,
                  trainRatio: 0.75,
                  seed: 42,
                },
                durationMs: 1234,
                feedback: ['linear-limit'],
                isPinned: false,
                metrics: {
                  accuracy: 0.5,
                  loss: 0.5,
                  testAccuracy: 0.5,
                  trainAccuracy: 0.5,
                },
                createdAt: '2026-07-19T14:00:00.000Z',
                targetReached: null,
                targetVersionId: null,
                verificationLevel: 'client-computed',
              },
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const saveResponse = await request(app)
      .post('/api/v1/playground-runs')
      .set('authorization', 'Bearer local-id-token')
      .set('idempotency-key', '3dd0b7e9-1c02-46e6-ae31-f5b3f63b39a0')
      .send({
        sessionId: 'session-pg-xor-01',
        result: {
          runId: 'client-run-01',
          scenarioId: 'pg-xor',
          algorithmId: 'perceptron',
          datasetVersionId: 'ds-xor-noisy-v1',
          configHash: '9'.repeat(64),
          durationMs: 1234,
          metrics: {
            accuracy: 0.5,
            loss: 0.5,
            testAccuracy: 0.5,
            trainAccuracy: 0.5,
          },
        },
      })
      .expect(201);
    const listResponse = await request(app)
      .get('/api/v1/playground-runs')
      .query({ scenarioId: 'pg-xor' })
      .set('authorization', 'Bearer local-id-token')
      .expect(200);

    await request(app)
      .delete('/api/v1/playground-runs/run-pg-xor-01')
      .set('authorization', 'Bearer local-id-token')
      .expect(204);

    expect(saveResponse.body.data.run).toMatchObject({
      runId: 'run-pg-xor-01',
      verificationLevel: 'client-computed',
    });
    expect(listResponse.body.data.runs).toHaveLength(1);
    expect(savedRuns).toEqual(
      new Set(['learner-01:3dd0b7e9-1c02-46e6-ae31-f5b3f63b39a0:session-pg-xor-01:result']),
    );
    expect(listedRunScenarios).toEqual(new Set(['learner-01:pg-xor']));
    expect(deletedRuns).toEqual(new Set(['learner-01:run-pg-xor-01']));
  });

  it('creates, lists, renames, and deletes playground configs through the authenticated owner boundary', async () => {
    const createdConfigs = new Set<string>();
    const listedConfigScenarios = new Set<string>();
    const renamedConfigs = new Set<string>();
    const deletedConfigs = new Set<string>();
    const app = createApiApp({
      playgroundRepository: createPlaygroundRepository({
        createConfig: async (input) => {
          createdConfigs.add(
            `${input.uid}:${input.scenarioId}:${input.algorithmId}:${input.datasetVersionId}:${input.name}`,
          );

          return {
            statusCode: 201,
            data: {
              config: createPlaygroundConfigFixture({
                configId: 'config-pg-xor-01',
                name: input.name,
              }),
            },
          };
        },
        deleteConfig: async (input) => {
          deletedConfigs.add(`${input.uid}:${input.configId}`);

          return {
            statusCode: 204,
            data: null,
          };
        },
        listConfigs: async (input) => {
          listedConfigScenarios.add(`${input.uid}:${input.scenarioId}`);

          return {
            statusCode: 200,
            data: {
              configs: [
                createPlaygroundConfigFixture({
                  configId: 'config-pg-xor-01',
                  name: 'XOR baseline',
                }),
              ],
            },
          };
        },
        updateConfig: async (input) => {
          renamedConfigs.add(`${input.uid}:${input.configId}:${input.name ?? 'unchanged'}`);

          return {
            statusCode: 200,
            data: {
              config: createPlaygroundConfigFixture({
                configId: input.configId,
                name: input.name ?? 'XOR baseline',
              }),
            },
          };
        },
      }),
      verifyAuthToken: async () => ({
        uid: 'learner-01',
        displayName: 'Local Student',
      }),
    });

    const createResponse = await request(app)
      .post('/api/v1/playground-configs')
      .set('authorization', 'Bearer local-id-token')
      .send({
        name: 'XOR baseline',
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
      })
      .expect(201);
    const listResponse = await request(app)
      .get('/api/v1/playground-configs')
      .query({ scenarioId: 'pg-xor' })
      .set('authorization', 'Bearer local-id-token')
      .expect(200);
    const renameResponse = await request(app)
      .patch('/api/v1/playground-configs/config-pg-xor-01')
      .set('authorization', 'Bearer local-id-token')
      .send({ name: 'Renamed XOR baseline' })
      .expect(200);

    await request(app)
      .delete('/api/v1/playground-configs/config-pg-xor-01')
      .set('authorization', 'Bearer local-id-token')
      .expect(204);

    expect(createResponse.body.data.config).toMatchObject({
      configId: 'config-pg-xor-01',
      name: 'XOR baseline',
      compatibilityStatus: 'compatible',
    });
    expect(listResponse.body.data.configs).toHaveLength(1);
    expect(renameResponse.body.data.config.name).toBe('Renamed XOR baseline');
    expect(createdConfigs).toEqual(
      new Set(['learner-01:pg-xor:perceptron:ds-xor-noisy-v1:XOR baseline']),
    );
    expect(listedConfigScenarios).toEqual(new Set(['learner-01:pg-xor']));
    expect(renamedConfigs).toEqual(new Set(['learner-01:config-pg-xor-01:Renamed XOR baseline']));
    expect(deletedConfigs).toEqual(new Set(['learner-01:config-pg-xor-01']));
  });
});

function createPlaygroundConfigFixture(input: { configId: string; name: string }) {
  return {
    configId: input.configId,
    name: input.name,
    scenarioId: 'pg-xor' as const,
    algorithmId: 'perceptron' as const,
    datasetVersionId: 'ds-xor-noisy-v1' as const,
    config: {
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    },
    compatibilityStatus: 'compatible' as const,
    compatibilityReason: null,
  };
}
