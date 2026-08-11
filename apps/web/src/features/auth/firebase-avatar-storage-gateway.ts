import {
  connectStorageEmulator,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from 'firebase/storage';

import type { AvatarUploadSession } from '../learning/learning-api';
import { getConfiguredFirebaseApp, shouldUseLocalDataEmulators } from './firebase-auth-gateway';

const LOCAL_STORAGE_EMULATOR_HOST = '127.0.0.1';
const LOCAL_STORAGE_EMULATOR_PORT = 9199;
const connectedStorageEmulators = new WeakSet<FirebaseStorage>();

export interface AvatarUploadStorageGateway {
  uploadAvatar(input: { file: File; uploadSession: AvatarUploadSession }): Promise<void>;
}

export function createFirebaseAvatarUploadStorageGateway(): AvatarUploadStorageGateway {
  const app = getConfiguredFirebaseApp();

  if (!app) {
    return {
      async uploadAvatar() {
        throw new Error('Firebase Storage is not configured.');
      },
    };
  }

  const storage = getStorage(app);

  if (shouldUseLocalDataEmulators() && !connectedStorageEmulators.has(storage)) {
    connectStorageEmulator(storage, LOCAL_STORAGE_EMULATOR_HOST, LOCAL_STORAGE_EMULATOR_PORT);
    connectedStorageEmulators.add(storage);
  }

  return {
    async uploadAvatar({ file, uploadSession }) {
      if (file.type !== uploadSession.contentType) {
        throw new Error('Avatar file type does not match the server-issued upload session.');
      }

      await uploadBytes(ref(storage, uploadSession.storagePath), file, {
        contentType: uploadSession.contentType,
        customMetadata: uploadSession.metadata,
      });
    },
  };
}
