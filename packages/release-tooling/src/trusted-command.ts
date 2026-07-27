export const releaseTargetEnvironments = ['local', 'staging', 'production'] as const;

export type ReleaseTargetEnvironment = (typeof releaseTargetEnvironments)[number];

export interface TrustedCommand {
  confirmProjectId?: string | undefined;
  environment: ReleaseTargetEnvironment;
  isApply: boolean;
  isDryRun: boolean;
  projectId: string;
  uid?: string | undefined;
}

type Environment = Readonly<Record<string, string | undefined>>;

const SERVICE_ACCOUNT_ENVIRONMENT_VARIABLES = [
  'FIREBASE_SERVICE_ACCOUNT',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
] as const;

function getRequiredArgumentValue(argumentsByName: Map<string, string>, name: string): string {
  const value = argumentsByName.get(name);

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function isReleaseTargetEnvironment(value: string): value is ReleaseTargetEnvironment {
  return releaseTargetEnvironments.includes(value as ReleaseTargetEnvironment);
}

function readArguments(argv: readonly string[]): {
  flags: Set<string>;
  values: Map<string, string>;
} {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument?.startsWith('--')) {
      throw new Error(`Unexpected argument: ${argument ?? ''}`);
    }

    if (argument === '--apply' || argument === '--dry-run') {
      flags.add(argument);
      continue;
    }

    if (
      argument !== '--confirm-project' &&
      argument !== '--env' &&
      argument !== '--project' &&
      argument !== '--uid'
    ) {
      throw new Error(`Unsupported argument: ${argument}`);
    }

    const value = argv[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires a value.`);
    }

    if (values.has(argument)) {
      throw new Error(`${argument} must be specified once.`);
    }

    values.set(argument, value);
    index += 1;
  }

  return { flags, values };
}

function assertNoServiceAccountEnvironment(environment: Environment): void {
  for (const variableName of SERVICE_ACCOUNT_ENVIRONMENT_VARIABLES) {
    if (environment[variableName]?.trim()) {
      throw new Error(`${variableName} is not accepted by trusted release tooling.`);
    }
  }
}

function assertEnvironmentProjectMatches(command: TrustedCommand, environment: Environment): void {
  for (const variableName of [
    'FIREBASE_PROJECT_ID',
    'GCLOUD_PROJECT',
    'GOOGLE_CLOUD_PROJECT',
  ] as const) {
    const environmentProjectId = environment[variableName]?.trim();

    if (environmentProjectId && environmentProjectId !== command.projectId) {
      throw new Error(`${variableName} must match --project.`);
    }
  }
}

function assertCanonicalLocalTarget(command: TrustedCommand, environment: Environment): void {
  if (command.environment !== 'local') {
    return;
  }

  if (command.projectId !== 'demo-ml-learning-local') {
    throw new Error('Local tooling must target demo-ml-learning-local.');
  }

  if (environment.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') {
    throw new Error('Local tooling requires the canonical Firestore Emulator host.');
  }
}

export function parseTrustedCommand(argv: readonly string[]): TrustedCommand {
  const { flags, values } = readArguments(argv);
  const environment = getRequiredArgumentValue(values, '--env');

  if (!isReleaseTargetEnvironment(environment)) {
    throw new Error('--env must be local, staging, or production.');
  }

  return {
    confirmProjectId: values.get('--confirm-project'),
    environment,
    isApply: flags.has('--apply'),
    isDryRun: flags.has('--dry-run'),
    projectId: getRequiredArgumentValue(values, '--project'),
    uid: values.get('--uid'),
  };
}

export function assertTrustedMutationTarget(
  command: TrustedCommand,
  environment: Environment = process.env,
): void {
  assertNoServiceAccountEnvironment(environment);
  assertEnvironmentProjectMatches(command, environment);

  if (command.isApply === command.isDryRun) {
    throw new Error('Specify --dry-run or --apply explicitly.');
  }

  if (command.environment === 'production' && command.confirmProjectId !== command.projectId) {
    throw new Error('--confirm-project must exactly match --project for production.');
  }

  assertCanonicalLocalTarget(command, environment);
}

export function assertProjectConfirmation(command: TrustedCommand): void {
  if (command.confirmProjectId !== command.projectId) {
    throw new Error('--confirm-project must exactly match --project.');
  }
}
