import { createHash, randomUUID } from 'node:crypto';

import { FieldValue, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import { ApiError } from './api-error.js';
import { getFirebaseAdminApp, getFirebaseAdminStorageBucketName } from './firebase-admin-app.js';

export const AVATAR_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const AVATAR_UPLOAD_SESSION_TTL_MS = 15 * 60 * 1_000;
const AVATAR_METADATA_SCHEMA_VERSION = '1';
const AVATAR_METADATA_SOURCE_ID = 'user-avatar';

export type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[number];

export interface AvatarUploadRequest {
  contentType: AvatarContentType;
  sha256: string;
  sizeBytes: number;
}

export interface AvatarUploadSession {
  contentType: AvatarContentType;
  expiresAt: string;
  metadata: {
    schemaVersion: string;
    sha256: string;
    sourceId: string;
  };
  storagePath: string;
  uploadSessionId: string;
}

export interface AvatarStoredObject {
  bytes: Uint8Array;
  contentType: string | null;
  metadata: Readonly<Record<string, string>>;
  sizeBytes: number;
}

export interface AvatarStorage {
  createDownloadUrl(input: { storagePath: string; token: string }): Promise<string>;
  deleteObject(storagePath: string): Promise<void>;
  getObject(storagePath: string): Promise<AvatarStoredObject | null>;
}

export interface AvatarUploadService {
  createUploadSession(input: AvatarUploadRequest & { uid: string }): Promise<{
    data: { uploadSession: AvatarUploadSession };
    statusCode: 201;
  }>;
  deleteAccountAvatars(input: { avatarUrl: string | null; uid: string }): Promise<void>;
  finalizeUpload(input: { displayName: string; uid: string; uploadSessionId: string }): Promise<{
    data: { profile: AvatarProfile };
    statusCode: 200;
  }>;
}

export interface AvatarProfile {
  avatarUrl: string | null;
  createdAt?: string | undefined;
  displayName: string;
  locale: 'en' | 'vi';
  schemaVersion: 1;
  status: 'active' | 'anonymized' | 'deletion-pending';
  theme: 'dark' | 'light' | 'system';
  uid: string;
}

interface AvatarUploadServiceOptions {
  createId?: (() => string) | undefined;
  firestore?: Firestore | undefined;
  now?: (() => Date) | undefined;
  reportReplacementCleanupFailure?: (() => void) | undefined;
  storage?: AvatarStorage | undefined;
}

interface StoredAvatarUploadSession {
  contentType: AvatarContentType;
  downloadToken: string;
  expiresAt: Date;
  metadata: AvatarUploadSession['metadata'];
  sizeBytes: number;
  status: 'finalized' | 'pending';
  storagePath: string;
}

export function toAvatarUploadRequest(input: {
  contentType?: unknown;
  sha256?: unknown;
  sizeBytes?: unknown;
}): AvatarUploadRequest {
  if (!AVATAR_CONTENT_TYPES.includes(input.contentType as AvatarContentType)) {
    throw new ApiError(422, 'AVATAR_CONTENT_TYPE_INVALID', 'Avatar content type is not allowed.');
  }

  if (
    typeof input.sizeBytes !== 'number' ||
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_AVATAR_SIZE_BYTES
  ) {
    throw new ApiError(422, 'AVATAR_SIZE_INVALID', 'Avatar size must be between 1 byte and 2 MiB.');
  }

  if (typeof input.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(input.sha256)) {
    throw new ApiError(
      422,
      'AVATAR_SHA256_INVALID',
      'Avatar sha256 must be a lowercase SHA-256 hex digest.',
    );
  }

  return {
    contentType: input.contentType as AvatarContentType,
    sha256: input.sha256,
    sizeBytes: input.sizeBytes,
  };
}

export function createFirestoreAvatarUploadService(
  options: AvatarUploadServiceOptions = {},
): AvatarUploadService {
  const firestore = options.firestore ?? getFirestore(getFirebaseAdminApp());
  const createId = options.createId ?? randomUUID;
  const now = options.now ?? (() => new Date());
  const storage = options.storage ?? createFirebaseAvatarStorage();
  const reportReplacementCleanupFailure =
    options.reportReplacementCleanupFailure ??
    (() => {
      console.warn('Avatar replacement cleanup failed.');
    });

  return {
    async createUploadSession(input) {
      const request = toAvatarUploadRequest(input);
      const uploadSessionId = createId();
      const objectId = createId();
      const downloadToken = createId();

      if (!uploadSessionId || !objectId || !downloadToken) {
        throw new ApiError(
          503,
          'AVATAR_SESSION_UNAVAILABLE',
          'Avatar upload is temporarily unavailable.',
        );
      }

      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + AVATAR_UPLOAD_SESSION_TTL_MS);
      const storagePath = `user-avatars/${input.uid}/${objectId}`;
      const uploadSession: AvatarUploadSession = {
        contentType: request.contentType,
        expiresAt: expiresAt.toISOString(),
        metadata: {
          schemaVersion: AVATAR_METADATA_SCHEMA_VERSION,
          sha256: request.sha256,
          sourceId: AVATAR_METADATA_SOURCE_ID,
        },
        storagePath,
        uploadSessionId,
      };

      await firestore.doc(`users/${input.uid}/avatarUploadSessions/${uploadSessionId}`).set({
        ...uploadSession,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        downloadToken,
        schemaVersion: 1,
        sizeBytes: request.sizeBytes,
        status: 'pending',
      });

      return {
        data: { uploadSession },
        statusCode: 201,
      };
    },
    async deleteAccountAvatars(input) {
      const storagePaths = new Set<string>();
      const avatarStoragePath = input.avatarUrl
        ? getAvatarStoragePathFromUrl(input.avatarUrl, input.uid)
        : null;

      if (avatarStoragePath) {
        storagePaths.add(avatarStoragePath);
      }

      const uploadSessionRefs = await firestore
        .collection(`users/${input.uid}/avatarUploadSessions`)
        .listDocuments();
      const uploadSessions = await Promise.all(
        uploadSessionRefs.map((reference) => reference.get()),
      );

      for (const uploadSession of uploadSessions) {
        const storagePath = uploadSession.data()?.storagePath;

        if (typeof storagePath === 'string' && isAvatarStoragePathForUser(storagePath, input.uid)) {
          storagePaths.add(storagePath);
        }
      }

      await Promise.all([...storagePaths].map((storagePath) => storage.deleteObject(storagePath)));
    },
    async finalizeUpload(input) {
      const sessionRef = firestore.doc(
        `users/${input.uid}/avatarUploadSessions/${input.uploadSessionId}`,
      );
      const profileRef = firestore.doc(`users/${input.uid}`);
      const sessionSnapshot = await sessionRef.get();
      const session = toStoredAvatarUploadSession(sessionSnapshot.data() ?? {});

      if (!sessionSnapshot.exists || !session) {
        throw new ApiError(
          404,
          'AVATAR_UPLOAD_SESSION_NOT_FOUND',
          'Avatar upload session was not found.',
        );
      }

      if (session.status === 'finalized') {
        const profileSnapshot = await profileRef.get();

        return {
          data: {
            profile: toAvatarProfile(input.uid, profileSnapshot.data() ?? {}, input.displayName),
          },
          statusCode: 200,
        };
      }

      assertAvatarUploadSessionIsCurrent(session, now());
      assertAvatarStoragePathBelongsToUser(session.storagePath, input.uid);

      const storedObject = await storage.getObject(session.storagePath);

      assertStoredAvatarMatchesSession(storedObject, session);

      const avatarUrl = await storage.createDownloadUrl({
        storagePath: session.storagePath,
        token: session.downloadToken,
      });
      const finalized = await firestore.runTransaction(async (transaction) => {
        const [currentSessionSnapshot, profileSnapshot] = await Promise.all([
          transaction.get(sessionRef),
          transaction.get(profileRef),
        ]);
        const currentSession = toStoredAvatarUploadSession(currentSessionSnapshot.data() ?? {});

        if (!currentSessionSnapshot.exists || !currentSession) {
          throw new ApiError(
            404,
            'AVATAR_UPLOAD_SESSION_NOT_FOUND',
            'Avatar upload session was not found.',
          );
        }

        if (currentSession.status === 'finalized') {
          return {
            previousAvatarUrl: null,
            profile: toAvatarProfile(input.uid, profileSnapshot.data() ?? {}, input.displayName),
          };
        }

        assertAvatarUploadSessionIsCurrent(currentSession, now());
        assertAvatarStoragePathBelongsToUser(currentSession.storagePath, input.uid);

        const currentProfile = toAvatarProfile(
          input.uid,
          profileSnapshot.data() ?? {},
          input.displayName,
        );

        if (currentProfile.status !== 'active') {
          throw new ApiError(
            403,
            'ACCOUNT_DELETION_PENDING',
            'Avatar changes are unavailable while account deletion is pending.',
          );
        }

        const profile: AvatarProfile = {
          ...currentProfile,
          avatarUrl,
        };

        transaction.set(
          profileRef,
          {
            ...(profileSnapshot.exists
              ? {}
              : {
                  schemaVersion: profile.schemaVersion,
                  displayName: profile.displayName,
                  locale: profile.locale,
                  theme: profile.theme,
                  status: profile.status,
                  createdAt: FieldValue.serverTimestamp(),
                }),
            avatarUrl: profile.avatarUrl,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        transaction.set(
          sessionRef,
          {
            avatarUrl,
            finalizedAt: FieldValue.serverTimestamp(),
            status: 'finalized',
          },
          { merge: true },
        );

        return {
          previousAvatarUrl: currentProfile.avatarUrl,
          profile,
        };
      });

      if (finalized.previousAvatarUrl && finalized.previousAvatarUrl !== avatarUrl) {
        try {
          const previousAvatarStoragePath = getAvatarStoragePathFromUrl(
            finalized.previousAvatarUrl,
            input.uid,
          );

          if (previousAvatarStoragePath) {
            await storage.deleteObject(previousAvatarStoragePath);
          }
        } catch {
          // The new avatar is authoritative; old-object cleanup is best effort by contract.
          reportReplacementCleanupFailure();
        }
      }

      return {
        data: { profile: finalized.profile },
        statusCode: 200,
      };
    },
  };
}

export function createDefaultAvatarUploadService(): AvatarUploadService {
  return createFirestoreAvatarUploadService();
}

export function createFirebaseAvatarStorage(): AvatarStorage {
  const bucket = getStorage(getFirebaseAdminApp()).bucket(getFirebaseAdminStorageBucketName());

  return {
    async createDownloadUrl({ storagePath, token }) {
      await bucket.file(storagePath).setMetadata({
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      });

      return createAvatarDownloadUrl(bucket.name, storagePath, token);
    },
    async deleteObject(storagePath) {
      await bucket.file(storagePath).delete({ ignoreNotFound: true });
    },
    async getObject(storagePath) {
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();

      if (!exists) {
        return null;
      }

      const [metadata, bytes] = await Promise.all([file.getMetadata(), file.download()]);
      const storedMetadata = metadata[0];
      const content = bytes[0];

      return {
        bytes: new Uint8Array(content),
        contentType:
          typeof storedMetadata.contentType === 'string' ? storedMetadata.contentType : null,
        metadata: toStringMetadata(storedMetadata.metadata),
        sizeBytes: content.byteLength,
      };
    },
  };
}

export function assertStoredAvatarMatchesSession(
  storedObject: AvatarStoredObject | null,
  session: Pick<
    StoredAvatarUploadSession,
    'contentType' | 'metadata' | 'sizeBytes' | 'storagePath'
  >,
): void {
  if (!storedObject) {
    throw new ApiError(404, 'AVATAR_OBJECT_NOT_FOUND', 'Avatar object was not uploaded.');
  }

  if (storedObject.sizeBytes <= 0 || storedObject.sizeBytes > MAX_AVATAR_SIZE_BYTES) {
    throw new ApiError(422, 'AVATAR_OBJECT_SIZE_INVALID', 'Avatar object size is not allowed.');
  }

  if (storedObject.sizeBytes !== session.sizeBytes) {
    throw new ApiError(
      422,
      'AVATAR_OBJECT_SIZE_MISMATCH',
      'Avatar object size does not match upload session.',
    );
  }

  if (storedObject.contentType !== session.contentType) {
    throw new ApiError(
      422,
      'AVATAR_OBJECT_CONTENT_TYPE_MISMATCH',
      'Avatar object content type does not match upload session.',
    );
  }

  const detectedContentType = detectAvatarContentType(storedObject.bytes);

  if (detectedContentType !== session.contentType) {
    throw new ApiError(
      422,
      'AVATAR_OBJECT_MIME_MISMATCH',
      'Avatar object bytes do not match the declared content type.',
    );
  }

  if (
    storedObject.metadata.sha256 !== session.metadata.sha256 ||
    storedObject.metadata.schemaVersion !== session.metadata.schemaVersion ||
    storedObject.metadata.sourceId !== session.metadata.sourceId
  ) {
    throw new ApiError(
      422,
      'AVATAR_OBJECT_METADATA_MISMATCH',
      'Avatar object metadata does not match upload session.',
    );
  }

  const actualSha256 = createHash('sha256').update(storedObject.bytes).digest('hex');

  if (actualSha256 !== session.metadata.sha256) {
    throw new ApiError(
      422,
      'AVATAR_OBJECT_SHA256_MISMATCH',
      'Avatar object hash does not match upload session.',
    );
  }
}

function assertAvatarUploadSessionIsCurrent(
  session: StoredAvatarUploadSession,
  currentTime: Date,
): void {
  if (session.expiresAt.getTime() <= currentTime.getTime()) {
    throw new ApiError(409, 'AVATAR_UPLOAD_SESSION_EXPIRED', 'Avatar upload session has expired.');
  }
}

function assertAvatarStoragePathBelongsToUser(storagePath: string, uid: string): void {
  if (!isAvatarStoragePathForUser(storagePath, uid)) {
    throw new ApiError(
      403,
      'AVATAR_OBJECT_OWNER_MISMATCH',
      'Avatar object does not belong to user.',
    );
  }
}

function isAvatarStoragePathForUser(storagePath: string, uid: string): boolean {
  const expectedPrefix = `user-avatars/${uid}/`;
  const objectId = storagePath.slice(expectedPrefix.length);

  return storagePath.startsWith(expectedPrefix) && isUuid(objectId);
}

function createAvatarDownloadUrl(bucketName: string, storagePath: string, token: string): string {
  const encodedPath = encodeURIComponent(storagePath);
  const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.trim();
  const baseUrl = storageEmulatorHost
    ? `http://${storageEmulatorHost}/v0/b/${bucketName}/o/${encodedPath}`
    : `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}`;

  return `${baseUrl}?alt=media&token=${encodeURIComponent(token)}`;
}

function detectAvatarContentType(bytes: Uint8Array): AvatarContentType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function getAvatarStoragePathFromUrl(avatarUrl: string, uid: string): string | null {
  try {
    const url = new URL(avatarUrl);
    const objectPathMarker = '/o/';
    const markerIndex = url.pathname.indexOf(objectPathMarker);

    if (markerIndex < 0) {
      return null;
    }

    const storagePath = decodeURIComponent(
      url.pathname.slice(markerIndex + objectPathMarker.length),
    );

    return isAvatarStoragePathForUser(storagePath, uid) ? storagePath : null;
  } catch {
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeDisplayName(displayName: string): string {
  const trimmed = displayName.trim();

  return trimmed || 'Learner';
}

function toAvatarProfile(
  uid: string,
  data: Record<string, unknown>,
  displayName: string,
): AvatarProfile {
  const createdAt = getTimestampIso(data.createdAt);

  return {
    uid,
    schemaVersion: 1,
    displayName:
      typeof data.displayName === 'string' ? data.displayName : normalizeDisplayName(displayName),
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : null,
    locale: data.locale === 'en' ? 'en' : 'vi',
    theme: data.theme === 'dark' || data.theme === 'light' ? data.theme : 'system',
    status:
      data.status === 'deletion-pending' || data.status === 'anonymized' ? data.status : 'active',
    ...(createdAt ? { createdAt } : {}),
  };
}

function toStoredAvatarUploadSession(
  data: Record<string, unknown>,
): StoredAvatarUploadSession | null {
  const contentType = data.contentType;
  const downloadToken = data.downloadToken;
  const expiresAt = getDate(data.expiresAt);
  const metadata = data.metadata;
  const sizeBytes = data.sizeBytes;
  const status = data.status;
  const storagePath = data.storagePath;

  if (
    !AVATAR_CONTENT_TYPES.includes(contentType as AvatarContentType) ||
    typeof downloadToken !== 'string' ||
    !expiresAt ||
    !isAvatarMetadata(metadata) ||
    typeof sizeBytes !== 'number' ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_AVATAR_SIZE_BYTES ||
    (status !== 'pending' && status !== 'finalized') ||
    typeof storagePath !== 'string'
  ) {
    return null;
  }

  return {
    contentType: contentType as AvatarContentType,
    downloadToken,
    expiresAt,
    metadata,
    sizeBytes,
    status,
    storagePath,
  };
}

function getDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  return null;
}

function getTimestampIso(value: unknown): string | null {
  const date = getDate(value);

  return date ? date.toISOString() : null;
}

function isAvatarMetadata(value: unknown): value is AvatarUploadSession['metadata'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    'sha256' in value &&
    'sourceId' in value &&
    typeof value.schemaVersion === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.sourceId === 'string'
  );
}

function toStringMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}
