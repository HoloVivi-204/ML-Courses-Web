import {
  getToken as getFirebaseAppCheckToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';

import { getConfiguredFirebaseApp, isFirebaseEmulator } from './firebase-auth-gateway';

export interface AppCheckTokenProvider {
  getToken(): Promise<string | null>;
}

let initializedAppCheck: AppCheck | undefined;

function isTestEnvironment(): boolean {
  return import.meta.env.MODE === 'test';
}

function getAppEnvironment(): 'local' | 'staging' | 'production' {
  const environment =
    import.meta.env.VITE_APP_ENV ?? (import.meta.env.PROD ? 'production' : 'local');

  if (environment === 'local' || environment === 'staging' || environment === 'production') {
    return environment;
  }

  throw new Error('VITE_APP_ENV must be local, staging, or production.');
}

function createLocalTokenProvider(): AppCheckTokenProvider {
  return {
    async getToken() {
      return null;
    },
  };
}

function createUnavailableTokenProvider(): AppCheckTokenProvider {
  return {
    async getToken() {
      throw new Error('Firebase App Check is not configured.');
    },
  };
}

export function shouldUseLocalAppCheckProvider(input: {
  environment: 'local' | 'staging' | 'production';
  isEmulator: boolean;
  isTest: boolean;
}): boolean {
  return input.isEmulator || input.isTest || input.environment === 'local';
}

function configureDebugToken(environment: 'local' | 'staging' | 'production'): void {
  const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;

  if (!debugToken) {
    return;
  }

  if (environment === 'production') {
    throw new Error('VITE_FIREBASE_APPCHECK_DEBUG_TOKEN is not allowed in production.');
  }

  (
    globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }
  ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
}

export function createFirebaseAppCheckTokenProvider(): AppCheckTokenProvider {
  const environment = getAppEnvironment();

  if (
    shouldUseLocalAppCheckProvider({
      environment,
      isEmulator: isFirebaseEmulator(),
      isTest: isTestEnvironment(),
    })
  ) {
    return createLocalTokenProvider();
  }

  const app = getConfiguredFirebaseApp();
  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;

  if (!app || !siteKey) {
    return createUnavailableTokenProvider();
  }

  configureDebugToken(environment);
  const appCheck = (initializedAppCheck ??= initializeAppCheck(app, {
    isTokenAutoRefreshEnabled: true,
    provider: new ReCaptchaEnterpriseProvider(siteKey),
  }));

  return {
    async getToken() {
      return (await getFirebaseAppCheckToken(appCheck)).token;
    },
  };
}
