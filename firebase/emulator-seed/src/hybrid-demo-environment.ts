import { assertNoCloudCredentials, LOCAL_EMULATOR_HOSTS } from './environment.js';

const FIREBASE_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,62}$/;
const LOCAL_CLOUD_AUTH_DEMO_MODE = 'true';
const LOCAL_METADATA_SERVER_DETECTION = 'none';

type Environment = Readonly<Record<string, string | undefined>>;

function getProjectId(environment: Environment): string {
  const projectId = environment.FIREBASE_PROJECT_ID?.trim();

  if (!projectId || !FIREBASE_PROJECT_ID_PATTERN.test(projectId)) {
    throw new Error('FIREBASE_PROJECT_ID must identify the Firebase project for the friend demo.');
  }

  for (const variableName of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT'] as const) {
    const configuredProjectId = environment[variableName]?.trim();

    if (configuredProjectId && configuredProjectId !== projectId) {
      throw new Error(`${variableName} must match FIREBASE_PROJECT_ID for the friend demo.`);
    }
  }

  return projectId;
}

export function createHybridDemoEnvironment(environment: Environment): NodeJS.ProcessEnv {
  assertNoCloudCredentials(environment);

  if (environment.LOCAL_CLOUD_AUTH_DEMO !== LOCAL_CLOUD_AUTH_DEMO_MODE) {
    throw new Error('LOCAL_CLOUD_AUTH_DEMO must be true for the friend demo.');
  }

  if (environment.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('FIREBASE_AUTH_EMULATOR_HOST must be unset for the friend demo.');
  }

  const projectId = getProjectId(environment);
  const hybridEnvironment: NodeJS.ProcessEnv = {
    ...environment,
    APP_ENV: 'local',
    APPCHECK_ENFORCEMENT_MODE: 'disabled',
    FIREBASE_PROJECT_ID: projectId,
    FIRESTORE_EMULATOR_HOST: LOCAL_EMULATOR_HOSTS.FIRESTORE_EMULATOR_HOST,
    FIREBASE_STORAGE_EMULATOR_HOST: LOCAL_EMULATOR_HOSTS.FIREBASE_STORAGE_EMULATOR_HOST,
    GCLOUD_PROJECT: projectId,
    GOOGLE_CLOUD_PROJECT: projectId,
    LOCAL_CLOUD_AUTH_DEMO: LOCAL_CLOUD_AUTH_DEMO_MODE,
    METADATA_SERVER_DETECTION: LOCAL_METADATA_SERVER_DETECTION,
  };

  delete hybridEnvironment.FIREBASE_AUTH_EMULATOR_HOST;

  return hybridEnvironment;
}
