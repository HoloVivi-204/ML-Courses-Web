import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApiApp } from './api-app.js';

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
        learningRepository: {
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
          enrollLearner: async () => {
            throw new Error('Enrollment is not part of this test.');
          },
          completeDemo: async () => {
            throw new Error('Demo completion is not part of this test.');
          },
        },
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
      learningRepository: {
        bootstrapLearner: async () => {
          throw new Error('Bootstrap is not part of this test.');
        },
        completeDemo: async () => {
          throw new Error('Demo completion is not part of this test.');
        },
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
      },
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
      learningRepository: {
        bootstrapLearner: async () => {
          throw new Error('Bootstrap is not part of this test.');
        },
        completeDemo: async () => {
          return {
            data: {
              error: 'This mock should not decide validation.',
            },
            statusCode: 200,
          };
        },
        enrollLearner: async () => {
          throw new Error('Enrollment is not part of this test.');
        },
      },
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
      learningRepository: {
        bootstrapLearner: async () => {
          throw new Error('Bootstrap is not part of this test.');
        },
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
        enrollLearner: async () => {
          throw new Error('Enrollment is not part of this test.');
        },
      },
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
});
