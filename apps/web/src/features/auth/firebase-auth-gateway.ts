import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
  sendPasswordResetEmail as sendFirebasePasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';

import type { AuthGateway, AuthUser } from './auth-context';

const FIREBASE_APP_NAME = 'ml-path-web';
const LOCAL_AUTH_EMULATOR_URL = 'http://localhost:9099';
const LOCAL_FIREBASE_PROJECT_ID = 'demo-ml-learning-local';

interface FirebaseEnvironment {
  VITE_APP_ENV?: string;
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_USE_DATA_EMULATORS?: string;
  VITE_FIREBASE_USE_EMULATOR?: string;
  VITE_LOCAL_CLOUD_AUTH_DEMO?: string;
  VITE_LOCAL_DEMO_ADMIN_EMAIL?: string;
}

export interface LocalDataEmulatorConfiguration {
  authEmulatorEnabled: boolean;
  dataEmulatorSetting?: string;
}

export function isFirebaseEmulator(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR !== 'false';
}

export function shouldUseLocalDataEmulators(
  configuration: LocalDataEmulatorConfiguration = {
    authEmulatorEnabled: isFirebaseEmulator(),
    dataEmulatorSetting: import.meta.env.VITE_FIREBASE_USE_DATA_EMULATORS,
  },
): boolean {
  return configuration.authEmulatorEnabled || configuration.dataEmulatorSetting === 'true';
}

export function getFirebaseOptionsFromEnvironment(
  environment: FirebaseEnvironment,
  useEmulator: boolean,
): FirebaseOptions | null {
  if (useEmulator) {
    const projectId = environment.VITE_FIREBASE_PROJECT_ID ?? LOCAL_FIREBASE_PROJECT_ID;

    return {
      apiKey: environment.VITE_FIREBASE_API_KEY ?? 'local-emulator-api-key',
      appId: environment.VITE_FIREBASE_APP_ID ?? 'local-emulator-app',
      authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN ?? 'localhost',
      projectId,
      storageBucket: `${projectId}.appspot.com`,
    };
  }

  const {
    VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET,
  } = environment;

  if (
    !VITE_FIREBASE_API_KEY ||
    !VITE_FIREBASE_APP_ID ||
    !VITE_FIREBASE_AUTH_DOMAIN ||
    !VITE_FIREBASE_PROJECT_ID
  ) {
    return null;
  }

  return {
    apiKey: VITE_FIREBASE_API_KEY,
    appId: VITE_FIREBASE_APP_ID,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    ...(VITE_FIREBASE_STORAGE_BUCKET ? { storageBucket: VITE_FIREBASE_STORAGE_BUCKET } : {}),
  };
}

function getFirebaseOptions(): FirebaseOptions | null {
  return getFirebaseOptionsFromEnvironment(
    {
      VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
      VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
      VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    },
    isFirebaseEmulator(),
  );
}

function getFirebaseApp(options: FirebaseOptions): FirebaseApp {
  return getApps().some((app) => app.name === FIREBASE_APP_NAME)
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(options, FIREBASE_APP_NAME);
}

export function getConfiguredFirebaseApp(): FirebaseApp | null {
  const options = getFirebaseOptions();

  return options ? getFirebaseApp(options) : null;
}

export function getAuthRoleFromClaims(
  claims: Readonly<Record<string, unknown>>,
): 'admin' | undefined {
  return claims.role === 'admin' ? 'admin' : undefined;
}

async function toAuthUser(user: User): Promise<AuthUser> {
  const providerIds = user.providerData
    .map((provider) => provider.providerId)
    .filter((providerId): providerId is string => Boolean(providerId));
  const tokenResult = await user.getIdTokenResult();
  const normalizedLocalAdminEmail =
    import.meta.env.VITE_LOCAL_DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const normalizedUserEmail = user.email?.trim().toLowerCase();
  const isConfiguredLocalAdmin =
    import.meta.env.DEV &&
    import.meta.env.VITE_APP_ENV === 'local' &&
    import.meta.env.VITE_LOCAL_CLOUD_AUTH_DEMO === 'true' &&
    import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'false' &&
    import.meta.env.VITE_FIREBASE_USE_DATA_EMULATORS === 'true' &&
    Boolean(normalizedLocalAdminEmail) &&
    normalizedLocalAdminEmail === normalizedUserEmail;
  const role =
    getAuthRoleFromClaims(tokenResult.claims) ?? (isConfiguredLocalAdmin ? 'admin' : undefined);

  return {
    email: user.email,
    ...(providerIds.length > 0 ? { providerIds } : {}),
    ...(role ? { role } : {}),
    uid: user.uid,
  };
}

function isPopupBlocked(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/popup-blocked'
  );
}

function shouldUseRedirect(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

export function toPasswordResetContinueUrl(continuePath: string): string {
  const fallbackUrl = new URL('/', window.location.origin).href;

  if (
    !continuePath.startsWith('/') ||
    continuePath.startsWith('//') ||
    continuePath.includes('\\')
  ) {
    return fallbackUrl;
  }

  try {
    const continueUrl = new URL(continuePath, window.location.origin);

    if (
      continueUrl.origin !== window.location.origin ||
      continueUrl.protocol !== window.location.protocol
    ) {
      return fallbackUrl;
    }

    return continueUrl.href;
  } catch {
    return fallbackUrl;
  }
}

function createUnavailableGateway(): AuthGateway {
  const unavailable = async (): Promise<void> => {
    throw { code: 'auth/unavailable' };
  };

  return {
    getIdToken: async () => null,
    observe(listener) {
      listener(null);
      return () => undefined;
    },
    reauthenticateWithGoogle: unavailable,
    reauthenticateWithPassword: unavailable,
    signInWithEmail: unavailable,
    signInWithGoogle: unavailable,
    requestPasswordReset: unavailable,
    signOut: unavailable,
    signUpWithEmail: unavailable,
    updateDisplayName: unavailable,
  };
}

function createConfiguredGateway(auth: Auth): AuthGateway {
  const googleProvider = new GoogleAuthProvider();

  return {
    async getIdToken(forceRefresh = false) {
      return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null;
    },
    observe(listener, onError) {
      void getRedirectResult(auth).catch(onError);
      return onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            listener(null);
            return;
          }

          void toAuthUser(user)
            .then(listener)
            .catch((error: unknown) => onError?.(error));
        },
        onError,
      );
    },
    async reauthenticateWithGoogle() {
      if (!auth.currentUser) {
        throw { code: 'auth/unavailable' };
      }

      try {
        await reauthenticateWithPopup(auth.currentUser, googleProvider);
        await auth.currentUser.getIdToken(true);
      } catch (error) {
        if (!isPopupBlocked(error)) {
          throw error;
        }

        await reauthenticateWithRedirect(auth.currentUser, googleProvider);
      }
    },
    async reauthenticateWithPassword(password) {
      if (!auth.currentUser?.email) {
        throw { code: 'auth/unavailable' };
      }

      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);

      await reauthenticateWithCredential(auth.currentUser, credential);
      await auth.currentUser.getIdToken(true);
    },
    async signInWithEmail(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signInWithGoogle() {
      if (shouldUseRedirect()) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        if (!isPopupBlocked(error)) {
          throw error;
        }

        await signInWithRedirect(auth, googleProvider);
      }
    },
    async requestPasswordReset(email, continuePath) {
      await sendFirebasePasswordResetEmail(auth, email, {
        handleCodeInApp: false,
        url: toPasswordResetContinueUrl(continuePath),
      });
    },
    async signOut() {
      await signOut(auth);
    },
    async signUpWithEmail(email, password) {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    async updateDisplayName(displayName) {
      if (!auth.currentUser) {
        throw { code: 'auth/unavailable' };
      }

      await updateProfile(auth.currentUser, { displayName });
      await auth.currentUser.getIdToken(true);
    },
  };
}

export function createFirebaseAuthGateway(): AuthGateway {
  const app = getConfiguredFirebaseApp();

  if (!app) {
    return createUnavailableGateway();
  }

  const auth = getAuth(app);

  if (isFirebaseEmulator() && !auth.emulatorConfig) {
    connectAuthEmulator(auth, LOCAL_AUTH_EMULATOR_URL, { disableWarnings: true });
  }

  return createConfiguredGateway(auth);
}
