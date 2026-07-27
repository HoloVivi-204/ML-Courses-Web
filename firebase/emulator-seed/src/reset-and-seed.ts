import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

import type { LocalAdminServices, LocalBucket } from './admin-services.js';
import type { LocalSeedManifest } from './seed-manifest.js';

export interface LocalDataEmulatorServices {
  bucket: LocalBucket;
  firestore: Firestore;
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

async function deleteAllFirestoreDocuments(firestore: Firestore): Promise<void> {
  const collections = await firestore.listCollections();

  for (const collection of collections) {
    await firestore.recursiveDelete(collection);
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
      metadata: { contentType: object.contentType },
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
  await deleteAllFirestoreDocuments(services.firestore);
  await deleteAllStorageObjects(services.bucket);

  await seedFirestore(services.firestore, manifest);
  await seedStorage(services.bucket, manifest);
}
