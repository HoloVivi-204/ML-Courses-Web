import { createHash } from 'node:crypto';

import { type Firestore } from 'firebase-admin/firestore';
import { describe, expect, it, vi } from 'vitest';

import {
  MAX_AVATAR_SIZE_BYTES,
  createFirestoreAvatarUploadService,
  type AvatarStorage,
  type AvatarStoredObject,
} from './avatar-upload-service.js';

interface FakeDocumentReference {
  get(): Promise<FakeDocumentSnapshot>;
  path: string;
  set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
}

interface FakeDocumentSnapshot {
  data(): Record<string, unknown> | undefined;
  exists: boolean;
}

interface FakeCollectionReference {
  listDocuments(): Promise<FakeDocumentReference[]>;
}

interface FakeTransaction {
  get(reference: FakeDocumentReference): Promise<FakeDocumentSnapshot>;
  set(
    reference: FakeDocumentReference,
    data: Record<string, unknown>,
    options?: { merge?: boolean },
  ): void;
}

const currentTime = new Date('2026-08-09T16:00:00.000Z');
const validPngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function createFakeFirestore(initialDocuments: Record<string, Record<string, unknown>> = {}) {
  const documents = new Map<string, Record<string, unknown>>(Object.entries(initialDocuments));

  function getSnapshot(path: string): FakeDocumentSnapshot {
    const data = documents.get(path);

    return {
      data: () => data,
      exists: data !== undefined,
    };
  }

  function setDocument(
    path: string,
    data: Record<string, unknown>,
    options?: { merge?: boolean },
  ): void {
    const currentData = documents.get(path) ?? {};

    documents.set(path, options?.merge ? { ...currentData, ...data } : data);
  }

  function createReference(path: string): FakeDocumentReference {
    return {
      async get() {
        return getSnapshot(path);
      },
      path,
      async set(data, options) {
        setDocument(path, data, options);
      },
    };
  }

  const firestore = {
    collection(path: string): FakeCollectionReference {
      return {
        async listDocuments() {
          const prefix = `${path}/`;

          return [...documents.keys()]
            .filter((documentPath) => {
              const suffix = documentPath.slice(prefix.length);

              return documentPath.startsWith(prefix) && suffix.length > 0 && !suffix.includes('/');
            })
            .map((documentPath) => createReference(documentPath));
        },
      };
    },
    doc(path: string): FakeDocumentReference {
      return createReference(path);
    },
    async runTransaction<TResult>(callback: (transaction: FakeTransaction) => Promise<TResult>) {
      const transaction: FakeTransaction = {
        async get(reference) {
          return reference.get();
        },
        set(reference, data, options) {
          setDocument(reference.path, data, options);
        },
      };

      return callback(transaction);
    },
  } as unknown as Firestore;

  return { documents, firestore };
}

function createAvatarUploadFixture(initialDocuments: Record<string, Record<string, unknown>> = {}) {
  const { documents, firestore } = createFakeFirestore(initialDocuments);
  let storedObject: AvatarStoredObject | null = null;
  const createDownloadUrl = vi.fn(async ({ storagePath }: { storagePath: string }) => {
    return `https://storage.example.test/v0/b/local/o/${encodeURIComponent(storagePath)}`;
  });
  const deleteObject = vi.fn(async () => {});
  const getObject = vi.fn(async () => storedObject);
  const storage: AvatarStorage = {
    createDownloadUrl,
    deleteObject,
    getObject,
  };
  const ids = [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
  ];
  const service = createFirestoreAvatarUploadService({
    createId: () => ids.shift() ?? '00000000-0000-4000-8000-000000000004',
    firestore,
    now: () => currentTime,
    storage,
  });

  return {
    createDownloadUrl,
    deleteObject,
    documents,
    getObject,
    service,
    setStoredObject(value: AvatarStoredObject | null) {
      storedObject = value;
    },
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('avatar upload service', () => {
  it('finalizes only an exact owner-bound object and persists no email field', async () => {
    const fixture = createAvatarUploadFixture();
    const uploadSession = await fixture.service.createUploadSession({
      contentType: 'image/png',
      sha256: sha256(validPngBytes),
      sizeBytes: validPngBytes.byteLength,
      uid: 'learner-01',
    });

    fixture.setStoredObject({
      bytes: validPngBytes,
      contentType: 'image/png',
      metadata: uploadSession.data.uploadSession.metadata,
      sizeBytes: validPngBytes.byteLength,
    });

    const result = await fixture.service.finalizeUpload({
      displayName: 'Local Student',
      uid: 'learner-01',
      uploadSessionId: uploadSession.data.uploadSession.uploadSessionId,
    });

    expect(result).toMatchObject({
      data: {
        profile: {
          avatarUrl:
            'https://storage.example.test/v0/b/local/o/user-avatars%2Flearner-01%2F00000000-0000-4000-8000-000000000002',
          displayName: 'Local Student',
          uid: 'learner-01',
        },
      },
      statusCode: 200,
    });
    expect(fixture.getObject).toHaveBeenCalledWith(
      'user-avatars/learner-01/00000000-0000-4000-8000-000000000002',
    );
    expect(fixture.documents.get('users/learner-01')).toMatchObject({
      avatarUrl:
        'https://storage.example.test/v0/b/local/o/user-avatars%2Flearner-01%2F00000000-0000-4000-8000-000000000002',
      displayName: 'Local Student',
    });
    expect(fixture.documents.get('users/learner-01')).not.toHaveProperty('email');
    expect(
      fixture.documents.get(
        `users/learner-01/avatarUploadSessions/${uploadSession.data.uploadSession.uploadSessionId}`,
      ),
    ).toMatchObject({
      sizeBytes: validPngBytes.byteLength,
      status: 'finalized',
    });
  });

  it('rejects a session accessed through another owner path before reading Storage', async () => {
    const fixture = createAvatarUploadFixture();
    const uploadSession = await fixture.service.createUploadSession({
      contentType: 'image/png',
      sha256: sha256(validPngBytes),
      sizeBytes: validPngBytes.byteLength,
      uid: 'learner-01',
    });

    await expect(
      fixture.service.finalizeUpload({
        displayName: 'Other Learner',
        uid: 'learner-02',
        uploadSessionId: uploadSession.data.uploadSession.uploadSessionId,
      }),
    ).rejects.toMatchObject({ code: 'AVATAR_UPLOAD_SESSION_NOT_FOUND', statusCode: 404 });
    expect(fixture.getObject).not.toHaveBeenCalled();
  });

  it('rejects a forged image MIME type even when the hash and metadata match', async () => {
    const fixture = createAvatarUploadFixture();
    const forgedBytes = new Uint8Array(Buffer.from('<svg><script>alert(1)</script></svg>'));
    const uploadSession = await fixture.service.createUploadSession({
      contentType: 'image/png',
      sha256: sha256(forgedBytes),
      sizeBytes: forgedBytes.byteLength,
      uid: 'learner-01',
    });

    fixture.setStoredObject({
      bytes: forgedBytes,
      contentType: 'image/png',
      metadata: uploadSession.data.uploadSession.metadata,
      sizeBytes: forgedBytes.byteLength,
    });

    await expect(
      fixture.service.finalizeUpload({
        displayName: 'Local Student',
        uid: 'learner-01',
        uploadSessionId: uploadSession.data.uploadSession.uploadSessionId,
      }),
    ).rejects.toMatchObject({ code: 'AVATAR_OBJECT_MIME_MISMATCH', statusCode: 422 });
  });

  it('rejects an oversize avatar before issuing an upload session', async () => {
    const fixture = createAvatarUploadFixture();

    await expect(
      fixture.service.createUploadSession({
        contentType: 'image/png',
        sha256: 'a'.repeat(64),
        sizeBytes: MAX_AVATAR_SIZE_BYTES + 1,
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({ code: 'AVATAR_SIZE_INVALID', statusCode: 422 });
  });

  it('rejects a missing Storage object and leaves the upload session retryable', async () => {
    const fixture = createAvatarUploadFixture();
    const uploadSession = await fixture.service.createUploadSession({
      contentType: 'image/png',
      sha256: sha256(validPngBytes),
      sizeBytes: validPngBytes.byteLength,
      uid: 'learner-01',
    });

    await expect(
      fixture.service.finalizeUpload({
        displayName: 'Local Student',
        uid: 'learner-01',
        uploadSessionId: uploadSession.data.uploadSession.uploadSessionId,
      }),
    ).rejects.toMatchObject({ code: 'AVATAR_OBJECT_NOT_FOUND', statusCode: 404 });
    expect(
      fixture.documents.get(
        `users/learner-01/avatarUploadSessions/${uploadSession.data.uploadSession.uploadSessionId}`,
      ),
    ).toMatchObject({ status: 'pending' });
  });

  it('cleans the current and pending owner avatar objects without touching another owner path', async () => {
    const fixture = createAvatarUploadFixture({
      'users/learner-01/avatarUploadSessions/pending-session': {
        storagePath: 'user-avatars/learner-01/00000000-0000-4000-8000-000000000002',
      },
      'users/learner-01/avatarUploadSessions/forged-session': {
        storagePath: 'user-avatars/learner-02/00000000-0000-4000-8000-000000000003',
      },
    });

    await fixture.service.deleteAccountAvatars({
      avatarUrl:
        'https://storage.example.test/v0/b/local/o/user-avatars%2Flearner-01%2F00000000-0000-4000-8000-000000000001?alt=media&token=server-token',
      uid: 'learner-01',
    });

    expect(fixture.deleteObject).toHaveBeenCalledTimes(2);
    expect(fixture.deleteObject).toHaveBeenCalledWith(
      'user-avatars/learner-01/00000000-0000-4000-8000-000000000001',
    );
    expect(fixture.deleteObject).toHaveBeenCalledWith(
      'user-avatars/learner-01/00000000-0000-4000-8000-000000000002',
    );
    expect(fixture.deleteObject).not.toHaveBeenCalledWith(
      'user-avatars/learner-02/00000000-0000-4000-8000-000000000003',
    );
  });

  it('replays a finalized session without re-reading Storage or replacing the avatar again', async () => {
    const fixture = createAvatarUploadFixture();
    const uploadSession = await fixture.service.createUploadSession({
      contentType: 'image/png',
      sha256: sha256(validPngBytes),
      sizeBytes: validPngBytes.byteLength,
      uid: 'learner-01',
    });

    fixture.setStoredObject({
      bytes: validPngBytes,
      contentType: 'image/png',
      metadata: uploadSession.data.uploadSession.metadata,
      sizeBytes: validPngBytes.byteLength,
    });

    const input = {
      displayName: 'Local Student',
      uid: 'learner-01',
      uploadSessionId: uploadSession.data.uploadSession.uploadSessionId,
    };
    const firstResult = await fixture.service.finalizeUpload(input);
    const replayResult = await fixture.service.finalizeUpload(input);

    expect(replayResult).toEqual(firstResult);
    expect(fixture.getObject).toHaveBeenCalledTimes(1);
    expect(fixture.createDownloadUrl).toHaveBeenCalledTimes(1);
  });
});
