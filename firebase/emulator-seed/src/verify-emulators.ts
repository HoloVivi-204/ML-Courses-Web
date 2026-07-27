import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

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
  const contentModulePath = new URL(
    '../../../apps/functions/dist/admin-content-repository.js',
    import.meta.url,
  ).href;
  const repositoryModule = (await import(repositoryModulePath)) as {
    seedFirestoreAdminContentForEmulator: (input: {
      content: readonly unknown[];
      firestore: ReturnType<typeof createLocalAdminServices>['firestore'];
    }) => Promise<void>;
  };
  const contentModule = (await import(contentModulePath)) as {
    getReleaseOneAdminContentFixture: () => readonly unknown[];
  };

  await repositoryModule.seedFirestoreAdminContentForEmulator({
    content: contentModule.getReleaseOneAdminContentFixture(),
    firestore,
  });
}

interface FirestoreLifecycleRepository {
  createDraft(input: {
    createdByUid: string;
    entityId: string;
    entityType: string;
  }): Promise<{ data: { draft: { draftRevisionId: string; revisionVersion: number } } }>;
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

    const validateData = await readSuccessData(
      await requestApiJson(`/api/v1/admin/revisions/${draftRevisionId}/validate`, {
        idToken: adminToken,
        method: 'POST',
      }),
      200,
    );
    assert.equal(getRecordField(validateData, 'draft').validationStatus, 'valid');
    assert.equal(getRecordField(validateData, 'validation').status, 'valid');

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
await assertFirestoreAdminContentPersistence();
await assertClientAccessDenied();
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
    directProgressWrites: 'denied',
    adminContentLifecycle: 'verified',
  }),
);
