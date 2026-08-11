import { describe, expect, it } from 'vitest';

import { LOCAL_FUNCTIONS_DISCOVERY_TIMEOUT_SECONDS } from './environment.js';
import { createHybridDemoEnvironment } from './hybrid-demo-environment.js';

describe('hybrid demo environment', () => {
  it('uses cloud Auth while keeping data services on local emulators', () => {
    expect(
      createHybridDemoEnvironment({
        FIREBASE_PROJECT_ID: 'ml-courses-staging-01-40939',
        LOCAL_CLOUD_AUTH_DEMO: 'true',
      }),
    ).toMatchObject({
      APP_ENV: 'local',
      APPCHECK_ENFORCEMENT_MODE: 'disabled',
      FIREBASE_PROJECT_ID: 'ml-courses-staging-01-40939',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
      FUNCTIONS_DISCOVERY_TIMEOUT: LOCAL_FUNCTIONS_DISCOVERY_TIMEOUT_SECONDS,
      LOCAL_CLOUD_AUTH_DEMO: 'true',
    });
  });

  it('refuses to start if Auth would be routed to the local Auth emulator', () => {
    expect(() =>
      createHybridDemoEnvironment({
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        FIREBASE_PROJECT_ID: 'ml-courses-staging-01-40939',
        LOCAL_CLOUD_AUTH_DEMO: 'true',
      }),
    ).toThrow('FIREBASE_AUTH_EMULATOR_HOST');
  });

  it('keeps an explicit Functions discovery timeout for the friend demo', () => {
    expect(
      createHybridDemoEnvironment({
        FIREBASE_PROJECT_ID: 'ml-courses-staging-01-40939',
        FUNCTIONS_DISCOVERY_TIMEOUT: '45',
        LOCAL_CLOUD_AUTH_DEMO: 'true',
      }),
    ).toMatchObject({ FUNCTIONS_DISCOVERY_TIMEOUT: '45' });
  });

  it('refuses cloud credentials in a friend demo', () => {
    expect(() =>
      createHybridDemoEnvironment({
        FIREBASE_PROJECT_ID: 'ml-courses-staging-01-40939',
        GOOGLE_APPLICATION_CREDENTIALS: 'never-read.json',
        LOCAL_CLOUD_AUTH_DEMO: 'true',
      }),
    ).toThrow('GOOGLE_APPLICATION_CREDENTIALS');
  });
});
