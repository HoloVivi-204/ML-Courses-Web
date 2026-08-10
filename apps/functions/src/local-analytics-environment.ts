const LOCAL_FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const LOCAL_METADATA_SERVER_DETECTION = 'none';
const CLOUD_CREDENTIAL_VARIABLES = [
  'CLOUDSDK_AUTH_ACCESS_TOKEN',
  'FIREBASE_SERVICE_ACCOUNT',
  'FIREBASE_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  'GOOGLE_OAUTH_ACCESS_TOKEN',
] as const;

type Environment = Readonly<Record<string, string | undefined>>;

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function assertLocalAnalyticsEnvironment(environment: Environment): void {
  for (const variableName of CLOUD_CREDENTIAL_VARIABLES) {
    if (hasValue(environment[variableName])) {
      throw new Error(`${variableName} must be unset for local analytics aggregation.`);
    }
  }

  const projectValues = [
    environment.FIREBASE_PROJECT_ID,
    environment.GCLOUD_PROJECT,
    environment.GOOGLE_CLOUD_PROJECT,
  ].filter(hasValue);

  if (projectValues.length === 0 || new Set(projectValues).size !== 1) {
    throw new Error('A single Firebase project ID must be configured for local analytics.');
  }

  if (environment.FIRESTORE_EMULATOR_HOST !== LOCAL_FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      `FIRESTORE_EMULATOR_HOST must point to ${LOCAL_FIRESTORE_EMULATOR_HOST} for local analytics.`,
    );
  }

  if (environment.METADATA_SERVER_DETECTION !== LOCAL_METADATA_SERVER_DETECTION) {
    throw new Error('METADATA_SERVER_DETECTION must disable cloud metadata lookup.');
  }
}
