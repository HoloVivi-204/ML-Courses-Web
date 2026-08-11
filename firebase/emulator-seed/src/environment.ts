export const LOCAL_FIREBASE_PROJECT_ID = 'demo-ml-learning-local';
export const LOCAL_FUNCTIONS_DISCOVERY_TIMEOUT_SECONDS = '30';
export const LOCAL_METADATA_SERVER_DETECTION = 'none';

export const LOCAL_EMULATOR_HOSTS = Object.freeze({
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
});

const CREDENTIAL_VARIABLES = [
  'CLOUDSDK_AUTH_ACCESS_TOKEN',
  'FIREBASE_SERVICE_ACCOUNT',
  'FIREBASE_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  'GOOGLE_OAUTH_ACCESS_TOKEN',
] as const;

type Environment = Readonly<Record<string, string | undefined>>;

export interface LocalEnvironment {
  projectId: typeof LOCAL_FIREBASE_PROJECT_ID;
}

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function assertNoCloudCredentials(environment: Environment): void {
  for (const variableName of CREDENTIAL_VARIABLES) {
    if (hasValue(environment[variableName])) {
      throw new Error(`${variableName} must be unset for local Firebase commands.`);
    }
  }
}

function getCanonicalProjectId(environment: Environment): typeof LOCAL_FIREBASE_PROJECT_ID {
  const projectVariables = [
    ['FIREBASE_PROJECT_ID', environment.FIREBASE_PROJECT_ID],
    ['GCLOUD_PROJECT', environment.GCLOUD_PROJECT],
    ['GOOGLE_CLOUD_PROJECT', environment.GOOGLE_CLOUD_PROJECT],
  ] as const;
  const configuredProjects = projectVariables.filter(([, value]) => hasValue(value));

  if (configuredProjects.length === 0) {
    throw new Error('FIREBASE_PROJECT_ID must identify the canonical local demo project.');
  }

  for (const [variableName, projectId] of configuredProjects) {
    if (projectId?.trim() !== LOCAL_FIREBASE_PROJECT_ID) {
      throw new Error(`${variableName} must identify the canonical local demo project.`);
    }
  }

  return LOCAL_FIREBASE_PROJECT_ID;
}

export function assertSafeLocalEnvironment(environment: Environment): LocalEnvironment {
  assertNoCloudCredentials(environment);

  return { projectId: getCanonicalProjectId(environment) };
}

export function assertRunningEmulatorEnvironment(environment: Environment): LocalEnvironment {
  const localEnvironment = assertSafeLocalEnvironment(environment);

  for (const [variableName, expectedHost] of Object.entries(LOCAL_EMULATOR_HOSTS)) {
    if (environment[variableName] !== expectedHost) {
      throw new Error(`${variableName} must point to the canonical local emulator.`);
    }
  }

  if (environment.METADATA_SERVER_DETECTION !== LOCAL_METADATA_SERVER_DETECTION) {
    throw new Error('METADATA_SERVER_DETECTION must disable cloud metadata lookup.');
  }

  return localEnvironment;
}

export function createLocalEmulatorEnvironment(environment: Environment): NodeJS.ProcessEnv {
  const localEnvironment = {
    ...environment,
    FIREBASE_PROJECT_ID: environment.FIREBASE_PROJECT_ID ?? LOCAL_FIREBASE_PROJECT_ID,
    FUNCTIONS_DISCOVERY_TIMEOUT:
      environment.FUNCTIONS_DISCOVERY_TIMEOUT ?? LOCAL_FUNCTIONS_DISCOVERY_TIMEOUT_SECONDS,
    GCLOUD_PROJECT: environment.GCLOUD_PROJECT ?? LOCAL_FIREBASE_PROJECT_ID,
    GOOGLE_CLOUD_PROJECT: environment.GOOGLE_CLOUD_PROJECT ?? LOCAL_FIREBASE_PROJECT_ID,
    METADATA_SERVER_DETECTION:
      environment.METADATA_SERVER_DETECTION ?? LOCAL_METADATA_SERVER_DETECTION,
    FIREBASE_AUTH_EMULATOR_HOST:
      environment.FIREBASE_AUTH_EMULATOR_HOST ?? LOCAL_EMULATOR_HOSTS.FIREBASE_AUTH_EMULATOR_HOST,
    FIRESTORE_EMULATOR_HOST:
      environment.FIRESTORE_EMULATOR_HOST ?? LOCAL_EMULATOR_HOSTS.FIRESTORE_EMULATOR_HOST,
    FIREBASE_STORAGE_EMULATOR_HOST:
      environment.FIREBASE_STORAGE_EMULATOR_HOST ??
      LOCAL_EMULATOR_HOSTS.FIREBASE_STORAGE_EMULATOR_HOST,
  };

  assertRunningEmulatorEnvironment(localEnvironment);
  return localEnvironment;
}

export function applyLocalEmulatorEnvironment(
  environment: NodeJS.ProcessEnv,
  target: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  for (const [variableName, value] of Object.entries(environment)) {
    if (typeof value === 'string') {
      target[variableName] = value;
    }
  }

  return target;
}
