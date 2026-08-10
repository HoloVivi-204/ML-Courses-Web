import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

import { deleteApp } from 'firebase-admin/app';

import { LOCAL_STORAGE_BUCKET, createLocalAdminServices } from './admin-services.js';
import {
  createReleaseContentDraftManifest,
  importReleaseContentDrafts,
} from './content-draft-import.js';
import { LOCAL_FIREBASE_PROJECT_ID } from './environment.js';
import { resetAndSeedLocalEmulators } from './reset-and-seed.js';
import { createLocalSeedManifest } from './seed-manifest.js';
import { readSeedSnapshot } from './seed-snapshot.js';

const FIREBASE_REGION = 'asia-southeast1';
const AUTH_EMULATOR_BASE_URL = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FIRESTORE_DOCUMENTS_BASE_URL =
  `http://127.0.0.1:8080/v1/projects/${LOCAL_FIREBASE_PROJECT_ID}` +
  '/databases/(default)/documents';
const VALID_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9jE8UAAAAASUVORK5CYII=',
  'base64',
);

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

function getStringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];

  assert.ok(typeof value === 'string', `${field} must be a string.`);

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
  const body = await readJsonObject(response);

  assert.equal(response.status, expectedStatus, JSON.stringify(body));

  assert.equal(body.success, true);

  return getRecordField(body, 'data');
}

async function requestApiJson(
  path: string,
  input: {
    body?: Record<string, unknown> | undefined;
    idToken: string;
    idempotencyKey?: string | undefined;
    method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | undefined;
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

async function requestFirestoreDocument(input: {
  documentPath: string;
  idToken?: string | undefined;
}): Promise<Response> {
  return fetch(`${FIRESTORE_DOCUMENTS_BASE_URL}/${input.documentPath}`, {
    ...(input.idToken ? { headers: { authorization: `Bearer ${input.idToken}` } } : {}),
  });
}

function decodeFirestoreValue(value: unknown): unknown {
  assertRecord(value, 'Firestore value must be an object.');

  if (typeof value.stringValue === 'string') {
    return value.stringValue;
  }
  if (typeof value.integerValue === 'string') {
    return Number(value.integerValue);
  }
  if (typeof value.doubleValue === 'number') {
    return value.doubleValue;
  }
  if (typeof value.booleanValue === 'boolean') {
    return value.booleanValue;
  }
  if ('nullValue' in value) {
    return null;
  }
  if (typeof value.timestampValue === 'string') {
    return value.timestampValue;
  }
  if (isRecord(value.mapValue)) {
    const fields = value.mapValue.fields;

    if (!isRecord(fields)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(fields).map(([field, nestedValue]) => [
        field,
        decodeFirestoreValue(nestedValue),
      ]),
    );
  }
  if (isRecord(value.arrayValue)) {
    const values = value.arrayValue.values;

    return Array.isArray(values) ? values.map(decodeFirestoreValue) : [];
  }

  throw new Error('Unsupported Firestore REST value in local Emulator verification.');
}

async function readFirestoreDocument(
  response: Response,
  expectedStatus: number,
): Promise<Record<string, unknown>> {
  assert.equal(response.status, expectedStatus);
  const body = await readJsonObject(response);
  const fields = getRecordField(body, 'fields');
  const decoded = decodeFirestoreValue({ mapValue: { fields } });

  assertRecord(decoded, 'Firestore document must decode to an object.');

  return decoded;
}

async function requestAvatarStorageUpload(input: {
  idToken: string;
  storagePath: string;
}): Promise<Response> {
  const boundary = `avatar-rule-${randomUUID()}`;
  const sha256 = createHash('sha256').update(VALID_PNG_BYTES).digest('hex');
  const metadata = JSON.stringify({
    contentType: 'image/png',
    metadata: {
      schemaVersion: '1',
      sha256,
      sourceId: 'user-avatar',
    },
    name: input.storagePath,
  });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: image/png\r\n\r\n`,
    ),
    VALID_PNG_BYTES,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  return fetch(
    `http://127.0.0.1:9199/v0/b/${LOCAL_STORAGE_BUCKET}/o?name=${encodeURIComponent(input.storagePath)}`,
    {
      body,
      headers: {
        Authorization: `Firebase ${input.idToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'X-Goog-Upload-Protocol': 'multipart',
      },
      method: 'POST',
    },
  );
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

async function assertProfileAvatarAccountLifecycle(): Promise<void> {
  const services = createLocalAdminServices();
  const email = `profile-lifecycle-${randomUUID()}@example.test`;
  const password = `test-${randomUUID()}`;

  try {
    const idToken = await registerWithEmailPassword(email, password);
    const uid = (await services.auth.getUserByEmail(email)).uid;
    const otherEmail = `avatar-other-${randomUUID()}@example.test`;
    await registerWithEmailPassword(otherEmail, `test-${randomUUID()}`);
    const otherUid = (await services.auth.getUserByEmail(otherEmail)).uid;
    const crossOwnerUpload = await requestAvatarStorageUpload({
      idToken,
      storagePath: `user-avatars/${otherUid}/${randomUUID()}`,
    });

    assert.equal(
      crossOwnerUpload.status,
      403,
      'Storage Rules must reject cross-owner avatar writes.',
    );
    const bootstrapResponse = await requestApiJson('/api/v1/users/me/bootstrap', {
      body: { locale: 'vi', theme: 'system' },
      idToken,
      method: 'POST',
    });

    await readSuccessData(bootstrapResponse, 201);

    const sha256 = createHash('sha256').update(VALID_PNG_BYTES).digest('hex');
    const uploadSessionData = await readSuccessData(
      await requestApiJson('/api/v1/users/me/avatar/upload-sessions', {
        body: { contentType: 'image/png', sha256, sizeBytes: VALID_PNG_BYTES.byteLength },
        idToken,
        method: 'POST',
      }),
      201,
    );
    const uploadSession = getRecordField(uploadSessionData, 'uploadSession');
    const storagePath = getStringField(uploadSession, 'storagePath');
    const uploadMetadata = getRecordField(uploadSession, 'metadata');

    await services.bucket.file(storagePath).save(VALID_PNG_BYTES, {
      metadata: {
        contentType: getStringField(uploadSession, 'contentType'),
        metadata: {
          schemaVersion: getStringField(uploadMetadata, 'schemaVersion'),
          sha256: getStringField(uploadMetadata, 'sha256'),
          sourceId: getStringField(uploadMetadata, 'sourceId'),
        },
      },
      resumable: false,
    });

    const finalizedData = await readSuccessData(
      await requestApiJson('/api/v1/users/me/avatar/finalize', {
        body: { uploadSessionId: getStringField(uploadSession, 'uploadSessionId') },
        idToken,
        method: 'POST',
      }),
      200,
    );
    const finalizedProfile = getRecordField(finalizedData, 'profile');

    assert.match(getStringField(finalizedProfile, 'avatarUrl'), /user-avatars%2F/);

    const learnerDocuments = [
      'algorithmUnlocks/perceptron',
      'contentAccess/post_dl-p01-neuron-perceptron',
      'demoCompletions/demo-perceptron-and-gate',
      'demoViews/demo-perceptron-and-gate',
      'enrollments/course-deep-learning-basic',
      'idempotencyKeys/delete-lifecycle',
      'moduleCompletions/dl-m01-neuron-perceptron',
      'moduleProgress/dl-m01-neuron-perceptron',
      'postCompletions/dl-p01-neuron-perceptron',
      'postViews/dl-p01-neuron-perceptron',
      'quizAttempts/attempt-lifecycle',
      'quizProgress/quiz-module-dl-m01',
      'playgroundConfigs/config-lifecycle',
      'playgroundRuns/run-lifecycle',
    ];

    await Promise.all(
      learnerDocuments.map((documentPath) =>
        services.firestore.doc(`users/${uid}/${documentPath}`).set({ schemaVersion: 1 }),
      ),
    );
    const playgroundRunSessionPath = `playgroundRunSessions/${randomUUID()}`;

    await services.firestore.doc(playgroundRunSessionPath).set({ schemaVersion: 1, uid });
    assert.equal((await services.bucket.file(storagePath).exists())[0], true);

    const deletionResponse = await requestApiJson('/api/v1/users/me', {
      idToken,
      method: 'DELETE',
    });

    assert.equal(deletionResponse.status, 204);
    await assert.rejects(services.auth.getUser(uid), { code: 'auth/user-not-found' });

    const profileSnapshot = await services.firestore.doc(`users/${uid}`).get();

    assert.equal(profileSnapshot.exists, true);
    assert.equal(profileSnapshot.get('status'), 'anonymized');
    assert.equal(profileSnapshot.get('avatarUrl'), null);
    assert.equal(profileSnapshot.get('email'), undefined);
    assert.equal((await services.bucket.file(storagePath).exists())[0], false);
    assert.equal((await services.firestore.doc(playgroundRunSessionPath).get()).exists, false);

    for (const documentPath of learnerDocuments) {
      assert.equal(
        (await services.firestore.doc(`users/${uid}/${documentPath}`).get()).exists,
        false,
        `${documentPath} must be deleted with the account.`,
      );
    }
  } finally {
    await deleteApp(services.app);
  }
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

async function requestDatasetStorageObject(input: {
  idToken?: string | undefined;
  path: string;
}): Promise<Response> {
  const storageObject = encodeURIComponent(input.path);

  return fetch(`http://127.0.0.1:9199/v0/b/${LOCAL_STORAGE_BUCKET}/o/${storageObject}?alt=media`, {
    ...(input.idToken ? { headers: { Authorization: `Firebase ${input.idToken}` } } : {}),
  });
}

async function assertPlaygroundDatasetStorageRules(): Promise<void> {
  const services = createLocalAdminServices();
  const datasetVersionId = 'ds-credit-risk-v1';
  const manifestPath = `datasets/${datasetVersionId}/manifest.json`;
  const datasetPath = `datasets/${datasetVersionId}/dataset.json.gz`;
  const email = `dataset-reader-${randomUUID()}@example.test`;
  const password = `test-${randomUUID()}`;

  try {
    const unauthenticatedResponse = await requestDatasetStorageObject({ path: manifestPath });
    assert.equal(unauthenticatedResponse.status, 403);

    const idToken = await registerWithEmailPassword(email, password);
    const manifestResponse = await requestDatasetStorageObject({ idToken, path: manifestPath });
    assert.equal(manifestResponse.status, 200);
    const manifest = await readJsonObject(manifestResponse);
    assert.equal(manifest.datasetVersionId, datasetVersionId);
    assert.equal(manifest.datasetPath, datasetPath);

    const datasetResponse = await requestDatasetStorageObject({ idToken, path: datasetPath });
    assert.equal(datasetResponse.status, 200);
    assert.ok((await datasetResponse.arrayBuffer()).byteLength > 0);

    const [metadata] = await services.bucket.file(datasetPath).getMetadata();
    assert.equal(metadata.contentEncoding, undefined);
    assert.equal(metadata.contentType, 'application/gzip');
    assert.equal(metadata.metadata?.schemaVersion, '1');
    assert.equal(metadata.metadata?.sourceId, 'generated-playground-baseline');
    const sha256 = metadata.metadata?.sha256;

    if (typeof sha256 !== 'string') {
      assert.fail('Dataset object metadata must include a SHA-256 string.');
    }

    assert.match(sha256, /^[a-f0-9]{64}$/);
  } finally {
    await deleteApp(services.app);
  }
}

async function assertDirectProgressMutationDenied(): Promise<void> {
  const baseUrl = `http://127.0.0.1:8080/v1/projects/${LOCAL_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const protectedDocumentPaths = [
    'users/local-student/algorithmUnlocks/perceptron',
    'users/local-student/contentAccess/demo_demo-perceptron-and-gate',
    'users/local-student/quizProgress/quiz-module-dl-m01',
    'adminContentLifecycleEvents/forged-event',
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

async function assertDirectLearnerContentRules(): Promise<void> {
  const services = createLocalAdminServices();
  const otherUid = `content-other-${randomUUID()}`;
  const ownerEmail = `content-owner-${randomUUID()}@example.test`;
  const ownerPassword = `test-${randomUUID()}`;
  const postId = 'dl-p01-neuron-perceptron';
  const demoId = 'demo-perceptron-and-gate';

  try {
    await seedAdminContentLifecycleRepository(services.firestore);
    const ownerToken = await registerWithEmailPassword(ownerEmail, ownerPassword);
    const ownerUid = (await services.auth.getUserByEmail(ownerEmail)).uid;
    const postAccessPath = `users/${ownerUid}/contentAccess/post_${postId}`;
    const demoAccessPath = `users/${ownerUid}/contentAccess/demo_${demoId}`;
    const trialData = await readFirestoreDocument(
      await requestFirestoreDocument({
        documentPath: `publishedLearnerContent/post:${postId}:trial`,
      }),
      200,
    );
    const trialContent = getRecordField(trialData, 'content');

    assert.equal(trialContent.accessLevel, 'trial');
    assert.equal(JSON.stringify(trialData).includes('xor-linear-limit'), false);

    const unauthenticatedResponse = await requestFirestoreDocument({
      documentPath: `publishedLearnerContent/post:${postId}:full`,
    });
    assert.equal(unauthenticatedResponse.status, 403);

    const missingGrantResponse = await requestFirestoreDocument({
      documentPath: `publishedLearnerContent/post:${postId}:full`,
      idToken: ownerToken,
    });
    assert.equal(missingGrantResponse.status, 403);

    await services.firestore.doc(`users/${otherUid}/contentAccess/post_${postId}`).set({
      contentType: 'post',
      entityId: postId,
      schemaVersion: 1,
    });
    const wrongUidResponse = await requestFirestoreDocument({
      documentPath: `publishedLearnerContent/post:${postId}:full`,
      idToken: ownerToken,
    });
    assert.equal(wrongUidResponse.status, 403);

    await services.firestore.doc(postAccessPath).set({
      contentType: 'post',
      entityId: postId,
      revisionId: 'post-dl-p01-neuron-perceptron-rev-r0',
      schemaVersion: 1,
    });
    const revisionPinnedGrantResponse = await requestFirestoreDocument({
      documentPath: `publishedLearnerContent/post:${postId}:full`,
      idToken: ownerToken,
    });
    assert.equal(revisionPinnedGrantResponse.status, 403);

    await services.firestore.doc(postAccessPath).set({
      contentType: 'post',
      entityId: postId,
      schemaVersion: 1,
    });
    const fullPostData = await readFirestoreDocument(
      await requestFirestoreDocument({
        documentPath: `publishedLearnerContent/post:${postId}:full`,
        idToken: ownerToken,
      }),
      200,
    );
    const fullPostContent = getRecordField(fullPostData, 'content');

    assert.equal(fullPostContent.accessLevel, 'full');
    assert.equal(JSON.stringify(fullPostData).includes('xor-linear-limit'), true);
    assert.equal(
      /answerKey|correctAnswer|correctOption/i.test(JSON.stringify(fullPostContent)),
      false,
    );

    await services.firestore.doc(postAccessPath).delete();
    const replayAfterRevocationResponse = await requestFirestoreDocument({
      documentPath: `publishedLearnerContent/post:${postId}:full`,
      idToken: ownerToken,
    });
    assert.equal(replayAfterRevocationResponse.status, 403);

    const missingDemoGrantResponse = await requestFirestoreDocument({
      documentPath: `publishedLearnerContent/demo:${demoId}:full`,
      idToken: ownerToken,
    });
    assert.equal(missingDemoGrantResponse.status, 403);

    await services.firestore.doc(demoAccessPath).set({
      contentType: 'demo',
      entityId: demoId,
      schemaVersion: 1,
    });
    const demoData = await readFirestoreDocument(
      await requestFirestoreDocument({
        documentPath: `publishedLearnerContent/demo:${demoId}:full`,
        idToken: ownerToken,
      }),
      200,
    );
    const demoContent = getRecordField(demoData, 'content');

    assert.equal(demoContent.demoId, demoId);
    assert.ok(Array.isArray(demoContent.steps));
    assert.ok(isRecord(demoContent.visualization));
  } finally {
    await deleteApp(services.app);
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

async function assertDraftContentImport(): Promise<void> {
  const services = createLocalAdminServices();
  const manifest = createReleaseContentDraftManifest();
  const firstDraft = manifest.documents[0];

  if (!firstDraft) {
    assert.fail('The content draft manifest must contain at least one document.');
  }

  const store = {
    async get(path: string): Promise<Readonly<Record<string, unknown>> | null> {
      const snapshot = await services.firestore.doc(path).get();

      return snapshot.exists ? (snapshot.data() ?? null) : null;
    },
    async set(path: string, value: Readonly<Record<string, unknown>>): Promise<void> {
      await services.firestore.doc(path).set(value);
    },
  };

  try {
    const publishedPointer = services.firestore.doc('publishedContent/current-pointer');
    await publishedPointer.set({ publishedRevisionId: 'published-sentinel-rev-r1' });

    const dryRun = await importReleaseContentDrafts({ dryRun: true, store });
    assert.equal(dryRun.created, 72);
    assert.equal(dryRun.updated, 0);
    assert.equal((await services.firestore.doc(firstDraft.storagePath).get()).exists, false);

    const firstImport = await importReleaseContentDrafts({ dryRun: false, store });
    assert.equal(firstImport.created, 72);
    assert.equal(firstImport.updated, 0);
    assert.equal(firstImport.unchanged, 0);

    const secondImport = await importReleaseContentDrafts({ dryRun: false, store });
    assert.equal(secondImport.created, 0);
    assert.equal(secondImport.updated, 0);
    assert.equal(secondImport.unchanged, 72);

    const importedDraft = await services.firestore.doc(firstDraft.storagePath).get();
    assert.equal(importedDraft.get('contentHash'), firstDraft.contentHash);
    assert.equal(importedDraft.get('publishedRevisionId'), undefined);
    assert.equal(
      (await publishedPointer.get()).get('publishedRevisionId'),
      'published-sentinel-rev-r1',
    );
  } finally {
    await deleteApp(services.app);
  }
}

async function seedAdminContentLifecycleRepository(
  firestore: ReturnType<typeof createLocalAdminServices>['firestore'],
): Promise<void> {
  const repositoryModulePath = new URL(
    '../../../apps/functions/dist/firestore-admin-content-repository.js',
    import.meta.url,
  ).href;
  const contentSeedModulePath = new URL(
    '../../../apps/functions/dist/admin-content-emulator-seed.js',
    import.meta.url,
  ).href;
  const repositoryModule = (await import(repositoryModulePath)) as {
    seedFirestoreAdminContentForEmulator: (input: {
      content: readonly unknown[];
      firestore: ReturnType<typeof createLocalAdminServices>['firestore'];
    }) => Promise<void>;
  };
  const contentSeedModule = (await import(contentSeedModulePath)) as {
    createReleaseOneFirestoreAdminContentSeed: () => readonly unknown[];
  };

  await repositoryModule.seedFirestoreAdminContentForEmulator({
    content: contentSeedModule.createReleaseOneFirestoreAdminContentSeed(),
    firestore,
  });
}

interface FirestoreLifecycleRepository {
  createDraft(input: {
    createdByUid: string;
    entityId: string;
    entityType: string;
  }): Promise<{ data: { draft: { draftRevisionId: string; revisionVersion: number } } }>;
  emergencyWithdrawEntity(input: {
    actorUid: string;
    entityId: string;
    entityType: string;
    reason: string;
    requestId: string;
  }): Promise<{
    data: {
      content: { emergencyBlocked: boolean; publishedRevisionId: string };
      lifecycleEvent: Record<string, unknown>;
    };
  }>;
  listContent(input: { entityType?: string }): Promise<{
    data: {
      content: Array<{
        draftRevisionId: string | null;
        entityId: string;
        publishedRevisionId: string;
        status: string;
      }>;
    };
  }>;
  publishRevision(input: {
    actorUid: string;
    idempotencyKey: string;
    reason: string;
    requestId: string;
    revisionId: string;
  }): Promise<{
    data: {
      content: { publishedRevisionId: string };
      lifecycleEvent: Record<string, unknown>;
    };
  }>;
  rollbackRevision(input: {
    actorUid: string;
    reason: string;
    requestId: string;
    revisionId: string;
  }): Promise<unknown>;
  unpublishEntity(input: {
    actorUid: string;
    entityId: string;
    reason: string;
    requestId: string;
  }): Promise<{ data: { lifecycleEvent: Record<string, unknown> } }>;
  updateDraft(input: {
    actorUid: string;
    patch: Record<string, unknown>;
    revisionId: string;
    revisionVersion: number;
  }): Promise<unknown>;
  validateDraft(input: { actorUid: string; revisionId: string }): Promise<unknown>;
}

async function createFirestoreLifecycleRepositoryForVerification(
  firestore: ReturnType<typeof createLocalAdminServices>['firestore'],
): Promise<FirestoreLifecycleRepository> {
  const repositoryModulePath = new URL(
    '../../../apps/functions/dist/firestore-admin-content-repository.js',
    import.meta.url,
  ).href;
  const repositoryModule = (await import(repositoryModulePath)) as {
    createFirestoreAdminContentRepository: (input: {
      firestore: ReturnType<typeof createLocalAdminServices>['firestore'];
      verifyPublishEvidence: () => void;
    }) => FirestoreLifecycleRepository;
  };

  // The API default above proves missing evidence fails closed. This test double only isolates
  // transaction and persistence behavior after an external verifier has accepted evidence.
  return repositoryModule.createFirestoreAdminContentRepository({
    firestore,
    verifyPublishEvidence: () => undefined,
  });
}

async function prepareValidatedDraftForPersistenceTest(
  repository: FirestoreLifecycleRepository,
): Promise<string> {
  const created = await repository.createDraft({
    createdByUid: 'admin-persistence-test',
    entityId: 'dl-p01-neuron-perceptron',
    entityType: 'post',
  });
  const revisionId = created.data.draft.draftRevisionId;

  await repository.updateDraft({
    actorUid: 'admin-persistence-test',
    patch: {
      metadata: {
        attribution: {
          en: 'Verified source attribution for transaction testing.',
          vi: 'Attribution nguon cho kiem thu transaction.',
        },
        externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
      },
      preview: {
        en: 'Durable Firestore draft preview.',
        vi: 'Preview draft Firestore ben vung.',
      },
      title: {
        en: 'Durable neuron decision',
        vi: 'Quyet dinh neuron ben vung',
      },
    },
    revisionId,
    revisionVersion: created.data.draft.revisionVersion,
  });
  await repository.validateDraft({ actorUid: 'admin-persistence-test', revisionId });

  return revisionId;
}

async function assertFirestoreAdminContentPersistence(): Promise<void> {
  const services = createLocalAdminServices();

  try {
    await resetAndSeedLocalEmulators(services, createLocalSeedManifest());
    await seedAdminContentLifecycleRepository(services.firestore);

    const firstRepository = await createFirestoreLifecycleRepositoryForVerification(
      services.firestore,
    );
    const draftRevisionId = await prepareValidatedDraftForPersistenceTest(firstRepository);
    const restartedRepository = await createFirestoreLifecycleRepositoryForVerification(
      services.firestore,
    );
    const persistedDraft = (
      await restartedRepository.listContent({ entityType: 'post' })
    ).data.content.find((content) => content.entityId === 'dl-p01-neuron-perceptron');
    assert.ok(persistedDraft, 'Restart-equivalent repository must retain the draft pointer.');
    assert.equal(persistedDraft.draftRevisionId, draftRevisionId);

    const publishInput = {
      actorUid: 'admin-persistence-test',
      idempotencyKey: 'publish-persistence-test',
      reason: 'Verify Firestore transaction persistence.',
      requestId: 'request-persistence-test',
      revisionId: draftRevisionId,
    };
    const concurrentPublishRequests = [
      { repository: firstRepository, input: publishInput },
      {
        repository: restartedRepository,
        input: {
          ...publishInput,
          idempotencyKey: 'publish-persistence-test-concurrent',
          requestId: 'request-persistence-test-concurrent',
        },
      },
    ] as const;
    const concurrentResults = await Promise.allSettled(
      concurrentPublishRequests.map(({ input, repository }) => repository.publishRevision(input)),
    );
    assert.equal(
      concurrentResults.filter((result) => result.status === 'fulfilled').length,
      1,
      'Concurrent publish must commit exactly one current revision.',
    );

    const committedPublish = concurrentResults.find(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<FirestoreLifecycleRepository['publishRevision']>>
      > => result.status === 'fulfilled',
    );
    assert.ok(committedPublish, 'One concurrent publish result must be available.');
    const committedRequest = concurrentPublishRequests[concurrentResults.indexOf(committedPublish)];
    assert.ok(committedRequest, 'The successful publish request must be available.');
    const publishedRevisionId = committedPublish.value.data.content.publishedRevisionId;
    const afterPublishRepository = await createFirestoreLifecycleRepositoryForVerification(
      services.firestore,
    );
    const persistedPublish = (
      await afterPublishRepository.listContent({ entityType: 'post' })
    ).data.content.find((content) => content.entityId === 'dl-p01-neuron-perceptron');
    assert.ok(persistedPublish, 'Restart-equivalent repository must retain the published pointer.');
    assert.equal(persistedPublish.draftRevisionId, null);
    assert.equal(persistedPublish.publishedRevisionId, publishedRevisionId);

    const idempotentRetry = await afterPublishRepository.publishRevision(committedRequest.input);
    assert.equal(idempotentRetry.data.content.publishedRevisionId, publishedRevisionId);
    await assert.rejects(
      afterPublishRepository.publishRevision({
        ...committedRequest.input,
        reason: 'Conflicting publish request.',
      }),
      (error: unknown) => isRecord(error) && error.code === 'IDEMPOTENCY_CONFLICT',
    );
    const idempotencyRecords = await services.firestore
      .collection('adminContentPublishIdempotency')
      .get();
    assert.equal(idempotencyRecords.size, 1);
    assert.ok(idempotencyRecords.docs[0]?.get('expireAt'));

    const staleDraftRevisionId =
      await prepareValidatedDraftForPersistenceTest(afterPublishRepository);
    await services.firestore.doc('users/learner-progress/summary/current').set({ completed: true });
    await afterPublishRepository.rollbackRevision({
      actorUid: 'admin-persistence-test',
      reason: 'Verify pointer rollback only.',
      requestId: 'request-rollback-test',
      revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
    });
    assert.equal(
      (await services.firestore.doc('users/learner-progress/summary/current').get()).get(
        'completed',
      ),
      true,
    );
    await assert.rejects(
      afterPublishRepository.publishRevision({
        actorUid: 'admin-persistence-test',
        idempotencyKey: 'publish-stale-revision-test',
        reason: 'Reject a draft whose base pointer is stale.',
        requestId: 'request-stale-revision-test',
        revisionId: staleDraftRevisionId,
      }),
      (error: unknown) => isRecord(error) && error.code === 'ADMIN_CONTENT_DRAFT_STALE',
    );

    const unpublished = await afterPublishRepository.unpublishEntity({
      actorUid: 'admin-persistence-test',
      entityId: 'course-deep-learning-basic',
      reason: 'Verify durable planned unpublish.',
      requestId: 'request-unpublish-test',
    });
    const afterUnpublishRepository = await createFirestoreLifecycleRepositoryForVerification(
      services.firestore,
    );
    const unpublishedCourse = (
      await afterUnpublishRepository.listContent({ entityType: 'course' })
    ).data.content.find((content) => content.entityId === 'course-deep-learning-basic');
    assert.ok(unpublishedCourse, 'The course entity must persist after unpublish.');
    assert.equal(unpublishedCourse.status, 'unpublished');
    const repeatUnpublish = await afterUnpublishRepository.unpublishEntity({
      actorUid: 'admin-persistence-test',
      entityId: 'course-deep-learning-basic',
      reason: 'Verify durable planned unpublish.',
      requestId: 'request-unpublish-retry-test',
    });
    assert.deepEqual(repeatUnpublish.data.lifecycleEvent, unpublished.data.lifecycleEvent);

    const auditEvents = await services.firestore.collection('adminContentLifecycleEvents').get();
    assert.equal(auditEvents.size, 3);
    for (const event of auditEvents.docs) {
      assert.equal(typeof event.get('actorUid'), 'string');
      assert.equal(typeof event.get('reason'), 'string');
      assert.equal(typeof event.get('requestId'), 'string');
      assert.match(String(event.get('createdAt')), /^\d{4}-\d{2}-\d{2}T/);
    }
  } finally {
    await deleteApp(services.app);
  }
}

async function assertAdminRevisionTypeLifecycleApi(input: {
  adminToken: string;
  entityId: string;
  entityType: 'course' | 'demo' | 'module' | 'quiz';
  initialRevisionId: string;
  learnerDocumentPath: string;
  studentToken: string;
}): Promise<void> {
  const learnerBeforePublish = await readFirestoreDocument(
    await requestFirestoreDocument({
      documentPath: input.learnerDocumentPath,
      idToken: input.studentToken,
    }),
    200,
  );
  const initialTitle = getRecordField(getRecordField(learnerBeforePublish, 'content'), 'title').en;
  const createDraftData = await readSuccessData(
    await requestApiJson(`/api/v1/admin/content/${input.entityType}/${input.entityId}/drafts`, {
      idToken: input.adminToken,
      method: 'POST',
    }),
    201,
  );
  const createdDraft = getRecordField(createDraftData, 'draft');
  const draftRevisionId = getStringField(createdDraft, 'draftRevisionId');
  const title = `Emulator learner ${input.entityType} revision`;

  await readSuccessData(
    await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}`, {
      body: {
        metadata: {
          attribution: {
            en: `Verified ${input.entityType} attribution for the local Emulator.`,
            vi: `Attribution ${input.entityType} da kiem tra tren Emulator cuc bo.`,
          },
          externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
        },
        preview: {
          en: `Draft learner ${input.entityType} preview.`,
          vi: `Preview ${input.entityType} draft cho learner.`,
        },
        revisionVersion: 1,
        title: {
          en: title,
          vi: `Ban ${input.entityType} cho learner`,
        },
      },
      idToken: input.adminToken,
      method: 'PATCH',
    }),
    200,
  );

  const previewData = await readSuccessData(
    await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/preview`, {
      idToken: input.adminToken,
    }),
    200,
  );
  const learnerPreview = getRecordField(previewData, 'preview');
  assert.equal(learnerPreview.contentType, input.entityType);

  const previewPayloadKey = input.entityType;
  const previewPayload = getRecordField(learnerPreview, previewPayloadKey);
  assert.equal(getRecordField(previewPayload, 'title').en, title);

  if (input.entityType === 'quiz') {
    assert.equal(JSON.stringify(learnerPreview).includes('correctAnswer'), false);
    assert.equal(JSON.stringify(learnerPreview).includes('explanation'), false);
    assert.equal(JSON.stringify(learnerPreview).includes('hints'), false);
  }

  await readSuccessData(
    await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/validate`, {
      idToken: input.adminToken,
      method: 'POST',
    }),
    200,
  );
  const publishedData = await readSuccessData(
    await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/publish`, {
      body: {
        publicationScope: 'emulator-demo',
        reason: `Publish the ${input.entityType} revision in the local Emulator only.`,
      },
      idToken: input.adminToken,
      idempotencyKey: `emulator-${input.entityType}-publish-${randomUUID()}`,
      method: 'POST',
    }),
    200,
  );
  assert.equal(getRecordField(publishedData, 'content').publicationScope, 'emulator-demo');

  const learnerAfterPublish = await readFirestoreDocument(
    await requestFirestoreDocument({
      documentPath: input.learnerDocumentPath,
      idToken: input.studentToken,
    }),
    200,
  );
  assert.equal(getRecordField(getRecordField(learnerAfterPublish, 'content'), 'title').en, title);

  await readSuccessData(
    await requestApiJson(`/api/v1/admin/revisions/${input.initialRevisionId}/rollback`, {
      body: {
        reason: `Restore the original ${input.entityType} learner revision in the Emulator.`,
      },
      idToken: input.adminToken,
      method: 'POST',
    }),
    200,
  );
  const learnerAfterRollback = await readFirestoreDocument(
    await requestFirestoreDocument({
      documentPath: input.learnerDocumentPath,
      idToken: input.studentToken,
    }),
    200,
  );
  assert.equal(
    getRecordField(getRecordField(learnerAfterRollback, 'content'), 'title').en,
    initialTitle,
  );
}

async function assertAdminContentLifecycleApi(): Promise<void> {
  const services = createLocalAdminServices();
  const adminUid = `admin-${randomUUID()}`;
  const adminEmail = `${adminUid}@example.test`;
  const adminPassword = `test-${randomUUID()}`;
  const studentEmail = `student-${randomUUID()}@example.test`;
  const studentPassword = `test-${randomUUID()}`;

  try {
    await seedAdminContentLifecycleRepository(services.firestore);
    const studentToken = await registerWithEmailPassword(studentEmail, studentPassword);
    const studentUid = (await services.auth.getUserByEmail(studentEmail)).uid;
    const courseId = 'course-deep-learning-basic';
    const demoId = 'demo-perceptron-and-gate';
    const postId = 'dl-p01-neuron-perceptron';
    const postAccessPath = `users/${studentUid}/contentAccess/post_${postId}`;
    const demoAccessPath = `users/${studentUid}/contentAccess/demo_${demoId}`;
    const courseEnrollmentPath = `users/${studentUid}/enrollments/${courseId}`;
    const postProgressPath = `users/${studentUid}/postProgress/${postId}`;

    await Promise.all([
      services.firestore.doc(postAccessPath).set({
        contentType: 'post',
        entityId: postId,
        schemaVersion: 1,
      }),
      services.firestore.doc(demoAccessPath).set({
        contentType: 'demo',
        entityId: demoId,
        schemaVersion: 1,
      }),
      services.firestore.doc(courseEnrollmentPath).set({
        courseId,
        progressPercent: 33,
        schemaVersion: 1,
        status: 'in-progress',
      }),
      services.firestore.doc(postProgressPath).set({
        completed: true,
        schemaVersion: 1,
      }),
      services.firestore.doc(`users/${studentUid}/postViews/${postId}`).set({
        contentViewed: true,
        postId,
        schemaVersion: 1,
        started: true,
      }),
    ]);

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

    await assertAdminRevisionTypeLifecycleApi({
      adminToken,
      entityId: courseId,
      entityType: 'course',
      initialRevisionId: 'course-deep-learning-basic-rev-r1',
      learnerDocumentPath: `publishedLearnerContent/course:${courseId}:summary`,
      studentToken,
    });
    await assertAdminRevisionTypeLifecycleApi({
      adminToken,
      entityId: 'dl-m01-neuron-perceptron',
      entityType: 'module',
      initialRevisionId: 'module-dl-m01-neuron-perceptron-rev-r1',
      learnerDocumentPath: 'publishedLearnerContent/module:dl-m01-neuron-perceptron:summary',
      studentToken,
    });
    await assertAdminRevisionTypeLifecycleApi({
      adminToken,
      entityId: demoId,
      entityType: 'demo',
      initialRevisionId: 'demo-perceptron-and-gate-rev-r1',
      learnerDocumentPath: `publishedLearnerContent/demo:${demoId}:full`,
      studentToken,
    });
    await assertAdminRevisionTypeLifecycleApi({
      adminToken,
      entityId: 'quiz-post-dl-p01',
      entityType: 'quiz',
      initialRevisionId: 'quiz-quiz-post-dl-p01-rev-r1',
      learnerDocumentPath: 'publishedLearnerContent/quiz:quiz-post-dl-p01:summary',
      studentToken,
    });

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

    const learnerBeforeDraft = await readFirestoreDocument(
      await requestFirestoreDocument({
        documentPath: `publishedLearnerContent/post:${postId}:full`,
        idToken: studentToken,
      }),
      200,
    );
    const initialLearnerTitle = getRecordField(
      getRecordField(learnerBeforeDraft, 'content'),
      'title',
    ).en;

    const createDraftData = await readSuccessData(
      await requestApiJson('/api/v1/admin/content/post/dl-p01-neuron-perceptron/drafts', {
        idToken: adminToken,
        method: 'POST',
      }),
      201,
    );
    const createdDraft = getRecordField(createDraftData, 'draft');
    assert.equal(typeof createdDraft.draftRevisionId, 'string');
    const draftRevisionId = String(createdDraft.draftRevisionId);

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

    const postPreviewData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/preview`, {
        idToken: adminToken,
      }),
      200,
    );
    const postPreview = getRecordField(postPreviewData, 'preview');
    assert.equal(postPreview.contentType, 'post');
    assert.equal(
      getRecordField(getRecordField(postPreview, 'post'), 'title').en,
      'Draft neuron decision title',
    );

    const validateData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/validate`, {
        idToken: adminToken,
        method: 'POST',
      }),
      200,
    );
    assert.equal(getRecordField(validateData, 'draft').validationStatus, 'valid');
    assert.equal(getRecordField(validateData, 'validation').status, 'valid');

    const evidenceBeforeAttach = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/evidence`, {
        idToken: adminToken,
      }),
      200,
    );
    const evidenceChecksum = getStringField(evidenceBeforeAttach, 'contentChecksum');
    assert.equal(getArrayField(evidenceBeforeAttach, 'evidence').length, 0);

    const attachedEvidenceData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/evidence/license`, {
        body: {
          checksum: evidenceChecksum,
          evidenceRef: 'emulator://evidence/license-draft-neuron',
        },
        idToken: adminToken,
        method: 'POST',
      }),
      200,
    );
    assert.equal(getRecordField(attachedEvidenceData, 'evidence').result, 'pending');

    const evidenceAfterAttach = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/evidence`, {
        idToken: adminToken,
      }),
      200,
    );
    const pendingLicenseEvidence = findRecordByField(
      getArrayField(evidenceAfterAttach, 'evidence'),
      'kind',
      'license',
    );
    assert.equal(pendingLicenseEvidence.result, 'pending');
    assert.equal(pendingLicenseEvidence.checksum, evidenceChecksum);

    const publishResponse = await requestApiJson(
      `/api/v1/admin/revisions/${draftRevisionId}/publish`,
      {
        body: { reason: 'Reviewed localized draft copy for pilot release.' },
        idToken: adminToken,
        idempotencyKey: `publish-${randomUUID()}`,
        method: 'POST',
      },
    );
    assert.equal(publishResponse.status, 422);
    const publishFailure = await readJsonObject(publishResponse);
    assert.equal(
      getRecordField(publishFailure, 'error').code,
      'ADMIN_CONTENT_EXTERNAL_EVIDENCE_REQUIRED',
    );

    const localPublishData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/publish`, {
        body: {
          publicationScope: 'emulator-demo',
          reason: 'Publish the validated revision for the local Emulator demo only.',
        },
        idToken: adminToken,
        idempotencyKey: `emulator-demo-publish-${randomUUID()}`,
        method: 'POST',
      }),
      200,
    );
    const locallyPublishedContent = getRecordField(localPublishData, 'content');
    assert.equal(locallyPublishedContent.publicationScope, 'emulator-demo');

    const learnerAfterLocalPublish = await readFirestoreDocument(
      await requestFirestoreDocument({
        documentPath: `publishedLearnerContent/post:${postId}:full`,
        idToken: studentToken,
      }),
      200,
    );
    assert.equal(
      getRecordField(getRecordField(learnerAfterLocalPublish, 'content'), 'title').en,
      'Draft neuron decision title',
    );

    await readSuccessData(
      await requestApiJson(
        '/api/v1/admin/revisions/post-dl-p01-neuron-perceptron-rev-r1/rollback',
        {
          body: { reason: 'Return the Emulator learner view to the previous revision.' },
          idToken: adminToken,
          method: 'POST',
        },
      ),
      200,
    );

    const learnerAfterRollback = await readFirestoreDocument(
      await requestFirestoreDocument({
        documentPath: `publishedLearnerContent/post:${postId}:full`,
        idToken: studentToken,
      }),
      200,
    );
    assert.equal(
      getRecordField(getRecordField(learnerAfterRollback, 'content'), 'title').en,
      initialLearnerTitle,
    );
    assert.equal((await services.firestore.doc(postProgressPath).get()).get('completed'), true);

    const openAttemptData = await readSuccessData(
      await requestApiJson('/api/v1/quizzes/quiz-post-dl-p01/attempts', {
        idToken: studentToken,
        method: 'POST',
      }),
      201,
    );
    const openAttempt = getRecordField(openAttemptData, 'attempt');
    const openAttemptId = String(openAttempt.attemptId);
    const dependentModuleAttemptPath = `users/${studentUid}/quizAttempts/attempt-dependent-module`;
    await services.firestore.doc(dependentModuleAttemptPath).set({
      quizId: 'quiz-module-dl-m01',
      schemaVersion: 1,
      status: 'in-progress',
    });

    const plannedUnpublishData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/entities/${courseId}/unpublish`, {
        body: { reason: 'Keep current learners active while the course is temporarily hidden.' },
        idToken: adminToken,
        method: 'POST',
      }),
      200,
    );
    assert.equal(getRecordField(plannedUnpublishData, 'content').status, 'unpublished');
    assert.equal(
      getRecordField(plannedUnpublishData, 'content').publishedRevisionId,
      'course-deep-learning-basic-rev-r1',
    );
    assert.equal(getRecordField(plannedUnpublishData, 'lifecycleEvent').type, 'unpublished');

    for (const learnerDocumentPath of [
      `publishedLearnerContent/course:${courseId}:summary`,
      'publishedLearnerContent/module:dl-m01-neuron-perceptron:summary',
      `publishedLearnerContent/post:${postId}:full`,
      `publishedLearnerContent/demo:${demoId}:full`,
      'publishedLearnerContent/quiz:quiz-post-dl-p01:summary',
    ]) {
      await readFirestoreDocument(
        await requestFirestoreDocument({
          documentPath: learnerDocumentPath,
          idToken: studentToken,
        }),
        200,
      );
    }

    const continuedPostViewData = await readSuccessData(
      await requestApiJson(`/api/v1/posts/${postId}/views`, {
        body: {
          readingPosition: 'what-is-a-neuron',
          viewedItemIds: ['what-is-a-neuron'],
        },
        idToken: studentToken,
        method: 'POST',
      }),
      200,
    );
    assert.equal(
      getRecordField(continuedPostViewData, 'postView').readingPosition,
      'what-is-a-neuron',
    );
    const continuingEnrollment = await services.firestore.doc(courseEnrollmentPath).get();
    assert.equal(continuingEnrollment.get('status'), 'in-progress');
    assert.equal(continuingEnrollment.get('progressPercent'), 33);

    const lateJoinerToken = await registerWithEmailPassword(
      `late-joiner-${randomUUID()}@example.test`,
      `test-${randomUUID()}`,
    );
    const refusedEnrollment = await requestApiJson(`/api/v1/courses/${courseId}/enrollments`, {
      idToken: lateJoinerToken,
      idempotencyKey: `refused-enrollment-${randomUUID()}`,
      method: 'POST',
    });
    assert.equal(refusedEnrollment.status, 403);
    assert.equal(
      getRecordField(await readJsonObject(refusedEnrollment), 'error').code,
      'CONTENT_NOT_PUBLISHED',
    );

    const publicEmergencyResponse = await requestApiJson(
      `/api/v1/admin/content/post/${postId}/emergency-withdraw`,
      {
        body: { reason: 'This route must remain unavailable.' },
        idToken: adminToken,
        method: 'POST',
      },
    );
    assert.equal(publicEmergencyResponse.status, 404);

    const emergencyRepository = await createFirestoreLifecycleRepositoryForVerification(
      services.firestore,
    );
    const emergencyWithdraw = await emergencyRepository.emergencyWithdrawEntity({
      actorUid: adminUid,
      entityId: postId,
      entityType: 'post',
      reason: 'Withdraw an unsafe lesson revision immediately.',
      requestId: 'request-emergency-withdraw-test',
    });
    const emergencyContent = emergencyWithdraw.data.content;
    const emergencyLifecycleEvent = emergencyWithdraw.data.lifecycleEvent;
    assert.equal(emergencyContent.emergencyBlocked, true);
    assert.equal(emergencyContent.publishedRevisionId, 'post-dl-p01-neuron-perceptron-rev-r1');
    assert.equal(emergencyLifecycleEvent.type, 'emergency-withdrawn');
    assert.equal(
      (await services.firestore.doc(`users/${studentUid}/quizAttempts/${openAttemptId}`).get()).get(
        'status',
      ),
      'invalidated',
    );
    assert.equal(
      (await services.firestore.doc(dependentModuleAttemptPath).get()).get('status'),
      'invalidated',
    );
    assert.equal((await services.firestore.doc(postProgressPath).get()).get('completed'), true);

    const blockedContentResponse = await requestFirestoreDocument({
      documentPath: `publishedLearnerContent/post:${postId}:full`,
      idToken: studentToken,
    });
    assert.equal(blockedContentResponse.status, 403);

    const blockedTrialResponse = await requestFirestoreDocument({
      documentPath: `publishedLearnerContent/post:${postId}:trial`,
    });
    assert.equal(blockedTrialResponse.status, 403);

    const blockedNewAttemptResponse = await requestApiJson(
      '/api/v1/quizzes/quiz-post-dl-p01/attempts',
      {
        idToken: studentToken,
        method: 'POST',
      },
    );
    assert.equal(blockedNewAttemptResponse.status, 403);
    assert.equal(
      getRecordField(await readJsonObject(blockedNewAttemptResponse), 'error').code,
      'CONTENT_EMERGENCY_BLOCKED',
    );

    const blockedCompletionIdempotencyKey = 'post-emergency-completion-bypass';
    const blockedCompletionResponse = await requestApiJson(`/api/v1/posts/${postId}/completions`, {
      idToken: studentToken,
      idempotencyKey: blockedCompletionIdempotencyKey,
      method: 'POST',
    });
    assert.equal(blockedCompletionResponse.status, 403);
    assert.equal(
      getRecordField(await readJsonObject(blockedCompletionResponse), 'error').code,
      'CONTENT_EMERGENCY_BLOCKED',
    );
    assert.equal(
      (
        await services.firestore
          .doc(`users/${studentUid}/idempotencyKeys/${blockedCompletionIdempotencyKey}`)
          .get()
      ).exists,
      false,
    );

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
await assertProfileAvatarAccountLifecycle();
await assertDirectLearnerContentRules();
await assertAdminContentLifecycleApi();
await assertFirestoreAdminContentPersistence();
await assertClientAccessDenied();
await assertPlaygroundDatasetStorageRules();
await assertDirectProgressMutationDenied();
await assertDraftContentImport();

console.log(
  JSON.stringify({
    success: true,
    projectId: LOCAL_FIREBASE_PROJECT_ID,
    emulators: ['auth', 'firestore', 'functions', 'storage'],
    deterministicSeed: true,
    draftContentImport: 'idempotent-draft-only',
    clientAccess: 'deny-by-default',
    playgroundDatasetStorage: 'authenticated-read-and-integrity-metadata-verified',
    directProgressWrites: 'denied',
    adminContentLifecycle: 'verified',
    emergencyWithdraw: 'verified',
    profileAvatarAccountLifecycle: 'verified',
    protectedLearningContent: 'verified',
  }),
);
