import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApiApp } from './api-app.js';
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
    createQuizAttempt: async () => {
      throw new Error('Quiz attempt creation is not part of this test.');
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

  it('enrolls an authenticated learner idempotently and opens the first module path', async () => {
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
                postId: 'dl-p01-neuron-perceptron',
              },
              nextPath: '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
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
        postId: 'dl-p01-neuron-perceptron',
      },
      nextPath: '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
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
