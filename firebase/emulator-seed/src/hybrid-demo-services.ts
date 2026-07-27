import { type App, initializeApp } from 'firebase-admin/app';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { type Storage, getStorage } from 'firebase-admin/storage';

import { createHybridDemoEnvironment } from './hybrid-demo-environment.js';

export type HybridDemoBucket = ReturnType<Storage['bucket']>;

export interface HybridDemoServices {
  app: App;
  bucket: HybridDemoBucket;
  firestore: Firestore;
}

export function createHybridDemoServices(
  environment: NodeJS.ProcessEnv = process.env,
): HybridDemoServices {
  const configuredEnvironment = createHybridDemoEnvironment(environment);
  const projectId = configuredEnvironment.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID must be configured for the friend demo.');
  }

  const app = initializeApp(
    {
      projectId,
      storageBucket: `${projectId}.appspot.com`,
    },
    'friend-demo-tools',
  );

  return {
    app,
    bucket: getStorage(app).bucket(),
    firestore: getFirestore(app),
  };
}
