import { type App, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { type Storage, getStorage } from 'firebase-admin/storage';

import {
  LOCAL_FIREBASE_PROJECT_ID,
  applyLocalEmulatorEnvironment,
  assertRunningEmulatorEnvironment,
} from './environment.js';

export const LOCAL_STORAGE_BUCKET = `${LOCAL_FIREBASE_PROJECT_ID}.appspot.com`;
export type LocalBucket = ReturnType<Storage['bucket']>;

export interface LocalAdminServices {
  app: App;
  auth: Auth;
  bucket: LocalBucket;
  firestore: Firestore;
}

export function createLocalAdminServices(
  environment: NodeJS.ProcessEnv = process.env,
): LocalAdminServices {
  const appliedEnvironment = applyLocalEmulatorEnvironment(environment);
  const { projectId } = assertRunningEmulatorEnvironment(appliedEnvironment);
  const app = initializeApp(
    {
      projectId,
      storageBucket: LOCAL_STORAGE_BUCKET,
    },
    'local-emulator-tools',
  );

  return {
    app,
    auth: getAuth(app),
    bucket: getStorage(app).bucket(),
    firestore: getFirestore(app),
  };
}
