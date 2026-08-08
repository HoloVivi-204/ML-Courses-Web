import { join } from 'node:path';

export function configureFirebaseCliEnvironment(
  environment: NodeJS.ProcessEnv,
  runtimeDirectory: string,
): NodeJS.ProcessEnv {
  return {
    ...environment,
    XDG_CONFIG_HOME: environment.XDG_CONFIG_HOME || join(runtimeDirectory, 'firebase-tools-config'),
    npm_config_offline: environment.npm_config_offline || 'true',
  };
}
