import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

import type { LocalAdminServices, LocalBucket } from './admin-services.js';
import { LOCAL_EMULATOR_HOSTS } from './environment.js';
import type { LocalSeedManifest } from './seed-manifest.js';

const FIRESTORE_EMULATOR_RESET_TIMEOUT_MS = 10_000;
const FIRESTORE_EMULATOR_RESET_MAX_ATTEMPTS = 6;
const FIRESTORE_EMULATOR_RESET_RETRY_DELAY_MS = 1_000;

export interface LocalDataEmulatorServices {
  bucket: LocalBucket;
  firestore: Firestore;
  projectId: string;
}

async function deleteAllAuthUsers(auth: Auth): Promise<void> {
  let pageToken: string | undefined;

  do {
    const page = pageToken ? await auth.listUsers(1_000, pageToken) : await auth.listUsers(1_000);
    const userIds = page.users.map(({ uid }) => uid);

    if (userIds.length > 0) {
      const deletion = await auth.deleteUsers(userIds);

      if (deletion.failureCount > 0) {
        throw new Error(`Failed to delete ${deletion.failureCount} local Auth users.`);
      }
    }

    pageToken = page.pageToken;
  } while (pageToken);
}

async function deleteAllFirestoreDocuments(projectId: string): Promise<void> {
  for (let attempt = 1; attempt <= FIRESTORE_EMULATOR_RESET_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(
      `http://${LOCAL_EMULATOR_HOSTS.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      {
        method: 'DELETE',
        signal: AbortSignal.timeout(FIRESTORE_EMULATOR_RESET_TIMEOUT_MS),
      },
    );

    if (response.ok) {
      return;
    }

    if (response.status !== 409 || attempt === FIRESTORE_EMULATOR_RESET_MAX_ATTEMPTS) {
      throw new Error(`Firestore Emulator document reset failed with HTTP ${response.status}.`);
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, FIRESTORE_EMULATOR_RESET_RETRY_DELAY_MS * 2 ** (attempt - 1));
    });
  }
}

async function deleteAllStorageObjects(bucket: LocalBucket): Promise<void> {
  await bucket.deleteFiles({ force: true });
}

async function seedAuth(auth: Auth, manifest: LocalSeedManifest): Promise<void> {
  for (const user of manifest.authUsers) {
    await auth.createUser(user);
  }
}

async function seedFirestore(firestore: Firestore, manifest: LocalSeedManifest): Promise<void> {
  for (const document of manifest.firestoreDocuments) {
    await firestore.doc(document.path).set(document.data);
  }
}

async function seedStorage(bucket: LocalBucket, manifest: LocalSeedManifest): Promise<void> {
  for (const object of manifest.storageObjects) {
    await bucket.file(object.path).save(object.content, {
      metadata: {
        contentType: object.contentType,
        ...(object.contentEncoding ? { contentEncoding: object.contentEncoding } : {}),
        ...(object.metadata ? { metadata: object.metadata } : {}),
      },
      resumable: false,
    });
  }
}

export async function resetAndSeedLocalEmulators(
  services: LocalAdminServices,
  manifest: LocalSeedManifest,
): Promise<void> {
  await deleteAllAuthUsers(services.auth);
  await seedAuth(services.auth, manifest);

  await resetAndSeedLocalDataEmulators(services, manifest);
}

export async function resetAndSeedLocalDataEmulators(
  services: LocalDataEmulatorServices,
  manifest: LocalSeedManifest,
): Promise<void> {
  await deleteAllFirestoreDocuments(services.projectId);
  await deleteAllStorageObjects(services.bucket);

  await seedFirestore(services.firestore, manifest);
  await seedStorage(services.bucket, manifest);
}
