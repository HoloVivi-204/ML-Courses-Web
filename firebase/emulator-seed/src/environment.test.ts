import { describe, expect, it } from 'vitest';

import {
  LOCAL_EMULATOR_HOSTS,
  LOCAL_FIREBASE_PROJECT_ID,
  LOCAL_METADATA_SERVER_DETECTION,
  applyLocalEmulatorEnvironment,
  assertRunningEmulatorEnvironment,
  assertSafeLocalEnvironment,
  createLocalEmulatorEnvironment,
} from './environment.js';

describe('local Firebase environment guard', () => {
  it('accepts the canonical demo project without cloud credentials', () => {
    expect(
      assertSafeLocalEnvironment({
        FIREBASE_PROJECT_ID: LOCAL_FIREBASE_PROJECT_ID,
      }),
    ).toEqual({ projectId: LOCAL_FIREBASE_PROJECT_ID });
  });

  it.each(['ml-learning-production', '', 'demo-other-project'])(
    'rejects non-canonical project ID %j',
    (projectId) => {
      expect(() =>
        assertSafeLocalEnvironment({
          FIREBASE_PROJECT_ID: projectId,
        }),
      ).toThrow('FIREBASE_PROJECT_ID');
    },
  );

  it.each(['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN'])(
    'rejects credential variable %s without exposing its value',
    (variableName) => {
      const credentialValue = 'must-not-appear-in-errors';

      try {
        assertSafeLocalEnvironment({
          FIREBASE_PROJECT_ID: LOCAL_FIREBASE_PROJECT_ID,
          [variableName]: credentialValue,
        });
        expect.fail('Expected environment validation to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(variableName);
        expect((error as Error).message).not.toContain(credentialValue);
      }
    },
  );

  it('requires every emulator host before reset or seed can run', () => {
    expect(
      assertRunningEmulatorEnvironment({
        FIREBASE_PROJECT_ID: LOCAL_FIREBASE_PROJECT_ID,
        GCLOUD_PROJECT: LOCAL_FIREBASE_PROJECT_ID,
        METADATA_SERVER_DETECTION: LOCAL_METADATA_SERVER_DETECTION,
        ...LOCAL_EMULATOR_HOSTS,
      }),
    ).toEqual({ projectId: LOCAL_FIREBASE_PROJECT_ID });

    expect(() =>
      assertRunningEmulatorEnvironment({
        FIREBASE_PROJECT_ID: LOCAL_FIREBASE_PROJECT_ID,
        GCLOUD_PROJECT: LOCAL_FIREBASE_PROJECT_ID,
      }),
    ).toThrow('FIREBASE_AUTH_EMULATOR_HOST');
  });

  it('disables Google Cloud metadata lookup while emulators are running', () => {
    expect(() =>
      assertRunningEmulatorEnvironment({
        FIREBASE_PROJECT_ID: LOCAL_FIREBASE_PROJECT_ID,
        GCLOUD_PROJECT: LOCAL_FIREBASE_PROJECT_ID,
        METADATA_SERVER_DETECTION: 'assume-present',
        ...LOCAL_EMULATOR_HOSTS,
      }),
    ).toThrow('METADATA_SERVER_DETECTION');
  });

  it('creates a complete canonical environment for local tools', () => {
    expect(createLocalEmulatorEnvironment({})).toMatchObject({
      FIREBASE_PROJECT_ID: LOCAL_FIREBASE_PROJECT_ID,
      GCLOUD_PROJECT: LOCAL_FIREBASE_PROJECT_ID,
      GOOGLE_CLOUD_PROJECT: LOCAL_FIREBASE_PROJECT_ID,
      METADATA_SERVER_DETECTION: LOCAL_METADATA_SERVER_DETECTION,
      ...LOCAL_EMULATOR_HOSTS,
    });
  });

  it('applies the validated local emulator hosts to the Admin SDK process environment', () => {
    const target = {} as NodeJS.ProcessEnv;

    applyLocalEmulatorEnvironment(createLocalEmulatorEnvironment({}), target);

    expect(target).toMatchObject({
      FIREBASE_PROJECT_ID: LOCAL_FIREBASE_PROJECT_ID,
      GCLOUD_PROJECT: LOCAL_FIREBASE_PROJECT_ID,
      METADATA_SERVER_DETECTION: LOCAL_METADATA_SERVER_DETECTION,
      ...LOCAL_EMULATOR_HOSTS,
    });
  });
});
