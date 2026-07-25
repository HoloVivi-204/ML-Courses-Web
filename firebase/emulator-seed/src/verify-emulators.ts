import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { deleteApp } from 'firebase-admin/app';

import { LOCAL_STORAGE_BUCKET, createLocalAdminServices } from './admin-services.js';
import { LOCAL_FIREBASE_PROJECT_ID } from './environment.js';
import { resetAndSeedLocalEmulators } from './reset-and-seed.js';
import { createLocalSeedManifest } from './seed-manifest.js';
import { readSeedSnapshot } from './seed-snapshot.js';

const FIREBASE_REGION = 'asia-southeast1';
const AUTH_EMULATOR_BASE_URL = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';

function getApiEndpoint(path: string): string {
  return `http://127.0.0.1:5001/${LOCAL_FIREBASE_PROJECT_ID}/${FIREBASE_REGION}/api${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  assert.ok(isRecord(value), message);
}

function getRecordField(record: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = record[field];

  assertRecord(value, `${field} must be an object.`);

  return value;
}

function getArrayField(record: Record<string, unknown>, field: string): unknown[] {
  const value = record[field];

  assert.ok(Array.isArray(value), `${field} must be an array.`);

  return value;
}

function findRecordByField(
  records: readonly unknown[],
  field: string,
  expectedValue: string,
): Record<string, unknown> {
  const record = records.find((item) => isRecord(item) && item[field] === expectedValue);

  assertRecord(record, `${field}=${expectedValue} must exist.`);

  return record;
}

async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json()) as unknown;

  assertRecord(body, 'Response body must be a JSON object.');

  return body;
}

async function readSuccessData(
  response: Response,
  expectedStatus: number,
): Promise<Record<string, unknown>> {
  assert.equal(response.status, expectedStatus);
  const body = await readJsonObject(response);

  assert.equal(body.success, true);

  return getRecordField(body, 'data');
}

async function requestApiJson(
  path: string,
  input: {
    body?: Record<string, unknown> | undefined;
    idToken: string;
    idempotencyKey?: string | undefined;
    method?: 'GET' | 'PATCH' | 'POST' | undefined;
  },
): Promise<Response> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${input.idToken}`,
  };

  if (input.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  if (input.idempotencyKey !== undefined) {
    headers['idempotency-key'] = input.idempotencyKey;
  }

  const requestInit: RequestInit = {
    headers,
    method: input.method ?? 'GET',
  };

  if (input.body !== undefined) {
    requestInit.body = JSON.stringify(input.body);
  }

  return fetch(getApiEndpoint(path), requestInit);
}

async function registerWithEmailPassword(email: string, password: string): Promise<string> {
  const response = await fetch(
    `${AUTH_EMULATOR_BASE_URL}/accounts:signUp?key=local-emulator-api-key`,
    {
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  );
  assert.equal(response.status, 200, 'Email/password registration must succeed.');

  const body = (await response.json()) as { email?: unknown; idToken?: unknown };

  assert.equal(body.email, email);

  if (typeof body.idToken !== 'string') {
    assert.fail('Email/password registration must return an ID token.');
  }

  return body.idToken;
}

async function signInWithEmailPassword(email: string, password: string): Promise<string> {
  const response = await fetch(
    `${AUTH_EMULATOR_BASE_URL}/accounts:signInWithPassword?key=local-emulator-api-key`,
    {
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  );
  assert.equal(response.status, 200, 'Email/password sign-in must succeed.');

  const body = (await response.json()) as { email?: unknown; idToken?: unknown };

  assert.equal(body.email, email);

  if (typeof body.idToken !== 'string') {
    assert.fail('Email/password sign-in must return an ID token.');
  }

  return body.idToken;
}

async function assertEmulatorHub(): Promise<void> {
  const response = await fetch('http://127.0.0.1:4400/emulators');
  assert.equal(response.status, 200);

  const emulators = (await response.json()) as Record<string, unknown>;
  for (const emulatorName of ['auth', 'firestore', 'functions', 'storage']) {
    assert.ok(emulators[emulatorName], `${emulatorName} emulator must be running.`);
  }
}

async function assertHealthEndpoint(): Promise<void> {
  const endpoint = getApiEndpoint('/api/v1/health');
  const response = await fetch(endpoint);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/);

  const body = await response.json();
  assert.deepEqual(body, {
    success: true,
    data: { service: 'api', status: 'ok' },
    requestId: response.headers.get('x-request-id'),
  });
}

async function assertEmailPasswordAuthentication(): Promise<void> {
  const email = `learner-${randomUUID()}@example.test`;
  const password = `test-${randomUUID()}`;

  await registerWithEmailPassword(email, password);
  await signInWithEmailPassword(email, password);
}

async function assertClientAccessDenied(): Promise<void> {
  const firestoreUrl =
    `http://127.0.0.1:8080/v1/projects/${LOCAL_FIREBASE_PROJECT_ID}` +
    '/databases/(default)/documents/system/local-seed';
  const storageObject = encodeURIComponent('local-seed/manifest.json');
  const storageUrl = `http://127.0.0.1:9199/v0/b/${LOCAL_STORAGE_BUCKET}/o/${storageObject}?alt=media`;

  for (const [service, url] of [
    ['Firestore', firestoreUrl],
    ['Storage', storageUrl],
  ] as const) {
    const response = await fetch(url);
    assert.equal(response.status, 403, `${service} client access must be denied by default.`);
  }
}

async function assertDirectProgressMutationDenied(): Promise<void> {
  const baseUrl = `http://127.0.0.1:8080/v1/projects/${LOCAL_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const protectedDocumentPaths = [
    'users/local-student/algorithmUnlocks/perceptron',
    'users/local-student/contentAccess/demo_demo-perceptron-and-gate',
    'users/local-student/quizProgress/quiz-module-dl-m01',
    'playgroundRunSessions/forged-session',
    'users/local-student/playgroundRuns/forged-run',
    'users/local-student/playgroundConfigs/forged-config',
  ];

  for (const documentPath of protectedDocumentPaths) {
    const response = await fetch(`${baseUrl}/${documentPath}`, {
      body: JSON.stringify({
        fields: {
          schemaVersion: { integerValue: '1' },
          forged: { booleanValue: true },
        },
      }),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    });

    assert.equal(response.status, 403, `${documentPath} must reject direct client writes.`);
  }
}

async function verifyResetAndSeed(): Promise<void> {
  const services = createLocalAdminServices();
  const manifest = createLocalSeedManifest();

  try {
    await resetAndSeedLocalEmulators(services, manifest);
    const baselineSnapshot = await readSeedSnapshot(services);

    await services.auth.createUser({ uid: 'drift-user', email: 'drift@example.test' });
    await services.firestore.doc('drift/transient').set({ shouldBeRemoved: true });
    await services.bucket.file('drift/transient.txt').save('remove me', { resumable: false });

    await resetAndSeedLocalEmulators(services, manifest);
    assert.deepEqual(await readSeedSnapshot(services), baselineSnapshot);
  } finally {
    await deleteApp(services.app);
  }
}

async function assertAdminContentLifecycleApi(): Promise<void> {
  const services = createLocalAdminServices();
  const adminUid = `admin-${randomUUID()}`;
  const adminEmail = `${adminUid}@example.test`;
  const adminPassword = `test-${randomUUID()}`;
  const studentEmail = `student-${randomUUID()}@example.test`;
  const studentPassword = `test-${randomUUID()}`;
  const draftRevisionId = 'draft-post-dl-p01-neuron-perceptron-rev-d1';

  try {
    const studentToken = await registerWithEmailPassword(studentEmail, studentPassword);

    await services.auth.createUser({
      uid: adminUid,
      email: adminEmail,
      password: adminPassword,
    });
    await services.auth.setCustomUserClaims(adminUid, { role: 'admin' });

    const adminToken = await signInWithEmailPassword(adminEmail, adminPassword);

    const forbiddenResponse = await requestApiJson('/api/v1/admin/content', {
      idToken: studentToken,
    });
    assert.equal(forbiddenResponse.status, 403);
    const forbiddenBody = await readJsonObject(forbiddenResponse);
    assert.equal(forbiddenBody.success, false);
    assert.equal(getRecordField(forbiddenBody, 'error').code, 'ADMIN_FORBIDDEN');

    const initialInventoryData = await readSuccessData(
      await requestApiJson(
        '/api/v1/admin/content?entityType=post&courseId=course-deep-learning-basic',
        { idToken: adminToken },
      ),
      200,
    );
    const initialPost = findRecordByField(
      getArrayField(initialInventoryData, 'content'),
      'entityId',
      'dl-p01-neuron-perceptron',
    );
    assert.equal(initialPost.publishedRevisionId, 'post-dl-p01-neuron-perceptron-rev-r1');

    const createDraftData = await readSuccessData(
      await requestApiJson('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts', {
        idToken: adminToken,
        method: 'POST',
      }),
      201,
    );
    const createdDraft = getRecordField(createDraftData, 'draft');
    assert.equal(createdDraft.draftRevisionId, draftRevisionId);

    const updateDraftData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}`, {
        body: {
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
        },
        idToken: adminToken,
        method: 'PATCH',
      }),
      200,
    );
    const updatedDraft = getRecordField(updateDraftData, 'draft');
    assert.equal(updatedDraft.revisionVersion, 2);
    assert.equal(getRecordField(updatedDraft, 'preview').en, 'Draft-only learner preview copy.');

    const validateData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/validate`, {
        idToken: adminToken,
        method: 'POST',
      }),
      200,
    );
    assert.equal(getRecordField(validateData, 'draft').validationStatus, 'valid');
    assert.equal(getRecordField(validateData, 'validation').status, 'valid');

    const idempotencyKey = `publish-${randomUUID()}`;
    const publishInput = {
      body: { reason: 'Reviewed localized draft copy for pilot release.' },
      idToken: adminToken,
      idempotencyKey,
      method: 'POST' as const,
    };
    const publishData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/publish`, publishInput),
      200,
    );
    const publishedContent = getRecordField(publishData, 'content');
    assert.equal(publishedContent.draftRevisionId, null);
    assert.equal(publishedContent.entityId, 'dl-p01-neuron-perceptron');
    assert.equal(
      publishedContent.previousPublishedRevisionId,
      'post-dl-p01-neuron-perceptron-rev-r1',
    );
    assert.equal(publishedContent.publishedRevisionId, draftRevisionId);
    assert.equal(publishedContent.status, 'published');
    assert.equal(publishedContent.validationStatus, 'valid');

    const retryPublishData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/publish`, publishInput),
      200,
    );
    assert.deepEqual(retryPublishData, publishData);

    const reportData = await readSuccessData(
      await requestApiJson('/api/v1/admin/reports/summary', { idToken: adminToken }),
      200,
    );
    assert.equal(
      getRecordField(reportData, 'learningVerified').verificationLevel,
      'server-verified',
    );
    assert.equal(
      getRecordField(reportData, 'playgroundClientReported').verificationLevel,
      'client-computed',
    );
    assert.equal(typeof getRecordField(reportData, 'contentLifecycle').publishedCount, 'number');
  } finally {
    await deleteApp(services.app);
  }
}

await assertEmulatorHub();
await verifyResetAndSeed();
await assertHealthEndpoint();
await assertEmailPasswordAuthentication();
await assertAdminContentLifecycleApi();
await assertClientAccessDenied();
await assertDirectProgressMutationDenied();

console.log(
  JSON.stringify({
    success: true,
    projectId: LOCAL_FIREBASE_PROJECT_ID,
    emulators: ['auth', 'firestore', 'functions', 'storage'],
    deterministicSeed: true,
    clientAccess: 'deny-by-default',
    directProgressWrites: 'denied',
    adminContentLifecycle: 'verified',
  }),
);
