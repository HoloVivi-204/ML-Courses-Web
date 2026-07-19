import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApiApp } from './api-app.js';
import type { LearningRepository } from './learning-repository.js';

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
    submitQuizAttempt: async () => {
      throw new Error('Quiz submission is not part of this test.');
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
});
