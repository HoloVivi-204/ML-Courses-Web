export type AppEnvironment = 'local' | 'staging' | 'production';

export interface AppCheckRuntimeConfig {
  environment: AppEnvironment;
  isEnforced: boolean;
}

function getAppEnvironment(environment: NodeJS.ProcessEnv): AppEnvironment {
  const value = environment.APP_ENV ?? 'production';

  if (value === 'local' || value === 'staging' || value === 'production') {
    return value;
  }

  throw new Error('APP_ENV must be local, staging, or production.');
}

export function getAppCheckRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppCheckRuntimeConfig {
  if (environment.FUNCTIONS_EMULATOR === 'true') {
    return { environment: 'local', isEnforced: false };
  }

  const appEnvironment = getAppEnvironment(environment);
  const mode = environment.APPCHECK_ENFORCEMENT_MODE;

  if (appEnvironment === 'production' && environment.FIREBASE_APPCHECK_DEBUG_TOKEN) {
    throw new Error('FIREBASE_APPCHECK_DEBUG_TOKEN is not allowed in production.');
  }

  if (appEnvironment === 'staging' || appEnvironment === 'production') {
    if (mode !== 'enforced') {
      throw new Error(`APPCHECK_ENFORCEMENT_MODE must be enforced in ${appEnvironment}.`);
    }

    return { environment: appEnvironment, isEnforced: true };
  }

  if (mode !== undefined && mode !== 'disabled' && mode !== 'enforced') {
    throw new Error('APPCHECK_ENFORCEMENT_MODE must be disabled or enforced.');
  }

  return { environment: appEnvironment, isEnforced: mode === 'enforced' };
}
