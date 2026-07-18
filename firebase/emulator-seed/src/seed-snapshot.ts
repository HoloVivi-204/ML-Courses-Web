import type { DocumentReference, Firestore } from 'firebase-admin/firestore';

import type { LocalAdminServices } from './admin-services.js';

interface FirestoreSnapshotDocument {
  data: FirebaseFirestore.DocumentData;
  path: string;
}

async function readDocumentTree(document: DocumentReference): Promise<FirestoreSnapshotDocument[]> {
  const snapshot = await document.get();
  const nestedCollections = await document.listCollections();
  const nestedDocuments: FirestoreSnapshotDocument[] = [];

  for (const collection of nestedCollections) {
    for (const nestedDocument of await collection.listDocuments()) {
      nestedDocuments.push(...(await readDocumentTree(nestedDocument)));
    }
  }

  if (!snapshot.exists) {
    return nestedDocuments;
  }

  return [{ path: snapshot.ref.path, data: snapshot.data() ?? {} }, ...nestedDocuments];
}

async function readFirestoreSnapshot(firestore: Firestore): Promise<FirestoreSnapshotDocument[]> {
  const documents: FirestoreSnapshotDocument[] = [];

  for (const collection of await firestore.listCollections()) {
    for (const document of await collection.listDocuments()) {
      documents.push(...(await readDocumentTree(document)));
    }
  }

  return documents.sort((left, right) => left.path.localeCompare(right.path));
}

export async function readSeedSnapshot(services: LocalAdminServices): Promise<unknown> {
  const authPage = await services.auth.listUsers(1_000);
  const [storageFiles] = await services.bucket.getFiles();
  const storageObjects = [];

  for (const file of storageFiles.sort((left, right) => left.name.localeCompare(right.name))) {
    const [content] = await file.download();
    const [metadata] = await file.getMetadata();

    storageObjects.push({
      path: file.name,
      content: content.toString('utf8'),
      contentType: metadata.contentType,
    });
  }

  return {
    authUsers: authPage.users
      .map(({ displayName, email, emailVerified, uid }) => ({
        displayName,
        email,
        emailVerified,
        uid,
      }))
      .sort((left, right) => left.uid.localeCompare(right.uid)),
    firestoreDocuments: await readFirestoreSnapshot(services.firestore),
    storageObjects,
  };
}
