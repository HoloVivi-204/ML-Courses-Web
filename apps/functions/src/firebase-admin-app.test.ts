import { describe, expect, it } from 'vitest';

import { getFirebaseAdminStorageBucketName } from './firebase-admin-app.js';

describe('Firebase Admin Storage configuration', () => {
  it('uses the canonical Emulator bucket without changing production configuration', () => {
    expect(
      getFirebaseAdminStorageBucketName({
        FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
        GCLOUD_PROJECT: 'demo-ml-learning-local',
      }),
    ).toBe('demo-ml-learning-local.appspot.com');

    expect(
      getFirebaseAdminStorageBucketName({
        GCLOUD_PROJECT: 'production-project',
      }),
    ).toBeUndefined();

    expect(
      getFirebaseAdminStorageBucketName({
        FIREBASE_PROJECT_ID: 'fallback-project',
        FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
        GCLOUD_PROJECT: '   ',
      }),
    ).toBe('fallback-project.appspot.com');
  });
});
