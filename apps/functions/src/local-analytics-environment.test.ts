import { describe, expect, it } from 'vitest';

import { assertLocalAnalyticsEnvironment } from './local-analytics-environment.js';

function createLocalEnvironment(): Record<string, string> {
  return {
    FIREBASE_PROJECT_ID: 'demo-ml-learning-local',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    GCLOUD_PROJECT: 'demo-ml-learning-local',
    GOOGLE_CLOUD_PROJECT: 'demo-ml-learning-local',
    METADATA_SERVER_DETECTION: 'none',
  };
}

describe('local analytics environment', () => {
  it('accepts a credential-free Firestore Emulator environment', () => {
    expect(() => assertLocalAnalyticsEnvironment(createLocalEnvironment())).not.toThrow();
  });

  it('rejects missing or non-local Firestore transport', () => {
    const environment = createLocalEnvironment();
    delete environment.FIRESTORE_EMULATOR_HOST;

    expect(() => assertLocalAnalyticsEnvironment(environment)).toThrow('FIRESTORE_EMULATOR_HOST');
  });

  it('rejects cloud credentials and conflicting project IDs', () => {
    const credentialEnvironment = {
      ...createLocalEnvironment(),
      FIREBASE_TOKEN: 'must-not-be-used',
    };
    const conflictingEnvironment = {
      ...createLocalEnvironment(),
      GCLOUD_PROJECT: 'different-project',
    };

    expect(() => assertLocalAnalyticsEnvironment(credentialEnvironment)).toThrow('FIREBASE_TOKEN');
    expect(() => assertLocalAnalyticsEnvironment(conflictingEnvironment)).toThrow(
      'single Firebase project ID',
    );
  });
});
