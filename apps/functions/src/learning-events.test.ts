import { describe, expect, it } from 'vitest';

import {
  createLearningEventDocument,
  createLearningEventId,
  normalizeLearningEventPayload,
} from './learning-events.js';

describe('learning event contract', () => {
  it('keeps a client failure event allowlisted and pseudonymous', () => {
    const payload = normalizeLearningEventPayload('playground_run_failed', {
      algorithmId: 'perceptron',
      normalizedErrorCode: 'WORKER_TIMEOUT',
      runId: 'run-01',
      scenarioId: 'pg-xor',
    });

    expect(payload).toEqual({
      algorithmId: 'perceptron',
      normalizedErrorCode: 'WORKER_TIMEOUT',
      runId: 'run-01',
      scenarioId: 'pg-xor',
    });
    expect(() =>
      normalizeLearningEventPayload('playground_run_failed', {
        ...payload,
        email: 'learner@example.test',
      }),
    ).toThrow('not allowed');
  });

  it('rejects raw quiz answers and unsupported event fields', () => {
    expect(() =>
      normalizeLearningEventPayload('module_quiz_submitted', {
        attemptNo: 1,
        passed: true,
        quizId: 'quiz-module-dl-m01',
        rawAnswer: 'secret',
        score: 100,
      }),
    ).toThrow('not allowed');
  });

  it('allows only the required external-resource fields for client attribution', () => {
    expect(
      normalizeLearningEventPayload('external_resource_opened', {
        postId: 'dl-p01-neuron-perceptron',
        resourceType: 'documentation',
        sourceId: 'source-microsoft-ml-beginners',
      }),
    ).toEqual({
      postId: 'dl-p01-neuron-perceptron',
      resourceType: 'documentation',
      sourceId: 'source-microsoft-ml-beginners',
    });
  });

  it('creates a deterministic event document with server timestamp sentinels and TTL', () => {
    const eventId = createLearningEventId({
      dedupeKey: 'run-failure-01',
      uid: 'learner-01',
    });
    const document = createLearningEventDocument({
      eventId,
      eventType: 'playground_run_failed',
      now: new Date('2026-08-11T00:00:00.000Z'),
      payload: {
        algorithmId: 'perceptron',
        normalizedErrorCode: 'WORKER_TIMEOUT',
        runId: 'run-01',
        scenarioId: 'pg-xor',
      },
      uid: 'learner-01',
      verificationLevel: 'client-computed',
    });

    expect(eventId).toMatch(/^[a-f0-9]{64}$/);
    expect(document).toMatchObject({
      eventId,
      eventType: 'playground_run_failed',
      expireAt: expect.any(Date),
      payload: {
        algorithmId: 'perceptron',
        normalizedErrorCode: 'WORKER_TIMEOUT',
        runId: 'run-01',
        scenarioId: 'pg-xor',
      },
      schemaVersion: 1,
      uidHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      verificationLevel: 'client-computed',
    });
    expect(document.createdAt).toEqual({ __type: 'serverTimestamp' });
    expect(document.occurredAt).toEqual({ __type: 'serverTimestamp' });
    expect(document.expireAt).toEqual(new Date('2027-02-07T00:00:00.000Z'));
  });
});
