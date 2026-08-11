import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { deleteApp, initializeApp } from 'firebase/app';
import { getStorage, ref } from 'firebase/storage';
import { describe, expect, it } from 'vitest';

import {
  getFirebaseOptionsFromEnvironment,
  shouldUseLocalDataEmulators,
} from './firebase-auth-gateway';

describe('Firebase Auth options', () => {
  it('supplies a Storage bucket when hybrid mode keeps data services local', async () => {
    const friendDemoEnvironment = Object.fromEntries(
      readFileSync(resolve(process.cwd(), 'friend-demo.config'), 'utf8')
        .split(/\r?\n/)
        .flatMap((line) => {
          const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);

          return match ? [[match[1], match[2]]] : [];
        }),
    );
    const options = getFirebaseOptionsFromEnvironment(
      {
        VITE_FIREBASE_API_KEY: friendDemoEnvironment.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_APP_ID: friendDemoEnvironment.VITE_FIREBASE_APP_ID,
        VITE_FIREBASE_AUTH_DOMAIN: friendDemoEnvironment.VITE_FIREBASE_AUTH_DOMAIN,
        VITE_FIREBASE_PROJECT_ID: friendDemoEnvironment.VITE_FIREBASE_PROJECT_ID,
        VITE_FIREBASE_STORAGE_BUCKET: friendDemoEnvironment.VITE_FIREBASE_STORAGE_BUCKET,
      },
      false,
    );

    expect(options?.storageBucket).toBe(`${options?.projectId}.appspot.com`);

    if (!options) {
      throw new Error('Expected valid friend demo Firebase options.');
    }

    const app = initializeApp(options, 'friend-demo-storage-bucket-test');

    try {
      expect(ref(getStorage(app), 'datasets/fixture.csv').bucket).toBe(options.storageBucket);
    } finally {
      await deleteApp(app);
    }
  });

  it('accepts cloud Auth configuration without a Storage bucket', () => {
    expect(
      getFirebaseOptionsFromEnvironment(
        {
          VITE_FIREBASE_API_KEY: 'public-api-key',
          VITE_FIREBASE_APP_ID: 'public-app-id',
          VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
          VITE_FIREBASE_PROJECT_ID: 'demo-ml-learning-local',
        },
        false,
      ),
    ).toEqual({
      apiKey: 'public-api-key',
      appId: 'public-app-id',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo-ml-learning-local',
    });
  });

  it('keeps Firestore and Storage local when only Auth uses the cloud project', () => {
    expect(
      shouldUseLocalDataEmulators({
        authEmulatorEnabled: false,
        dataEmulatorSetting: 'true',
      }),
    ).toBe(true);
  });

  it('does not redirect cloud environments to local data emulators by default', () => {
    expect(
      shouldUseLocalDataEmulators({
        authEmulatorEnabled: false,
      }),
    ).toBe(false);
  });
});
