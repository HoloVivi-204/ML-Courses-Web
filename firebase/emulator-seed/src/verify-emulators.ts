import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { deleteApp } from 'firebase-admin/app';

import { LOCAL_STORAGE_BUCKET, createLocalAdminServices } from './admin-services.js';
import { LOCAL_FIREBASE_PROJECT_ID } from './environment.js';
import { resetAndSeedLocalEmulators } from './reset-and-seed.js';
import { createLocalSeedManifest } from './seed-manifest.js';
import { readSeedSnapshot } from './seed-snapshot.js';

const FIREBASE_REGION = 'asia-southeast1';

async function assertEmulatorHub(): Promise<void> {
  const response = await fetch('http://127.0.0.1:4400/emulators');
  assert.equal(response.status, 200);

  const emulators = (await response.json()) as Record<string, unknown>;
  for (const emulatorName of ['auth', 'firestore', 'functions', 'storage']) {
    assert.ok(emulators[emulatorName], `${emulatorName} emulator must be running.`);
  }
}

async function assertHealthEndpoint(): Promise<void> {
  const endpoint =
    `http://127.0.0.1:5001/${LOCAL_FIREBASE_PROJECT_ID}/${FIREBASE_REGION}` + '/api/api/v1/health';
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
  const emulatorKey = randomUUID();
  const baseUrl = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1`;

  const registerResponse = await fetch(`${baseUrl}/accounts:signUp?key=${emulatorKey}`, {
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(registerResponse.status, 200, 'Email/password registration must succeed.');

  const loginResponse = await fetch(`${baseUrl}/accounts:signInWithPassword?key=${emulatorKey}`, {
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(loginResponse.status, 200, 'Email/password sign-in must succeed.');

  const loginBody = (await loginResponse.json()) as { email?: unknown; idToken?: unknown };
  assert.equal(loginBody.email, email);
  assert.equal(typeof loginBody.idToken, 'string');
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

await assertEmulatorHub();
await verifyResetAndSeed();
await assertHealthEndpoint();
await assertEmailPasswordAuthentication();
await assertClientAccessDenied();

console.log(
  JSON.stringify({
    success: true,
    projectId: LOCAL_FIREBASE_PROJECT_ID,
    emulators: ['auth', 'firestore', 'functions', 'storage'],
    deterministicSeed: true,
    clientAccess: 'deny-by-default',
  }),
);
