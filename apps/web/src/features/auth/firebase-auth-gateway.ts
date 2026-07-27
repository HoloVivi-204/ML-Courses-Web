import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail as sendFirebasePasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

import type { AuthGateway, AuthUser } from './auth-context';

const FIREBASE_APP_NAME = 'ml-path-web';
const LOCAL_AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const LOCAL_FIREBASE_PROJECT_ID = 'demo-ml-learning-local';

export function isFirebaseEmulator(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR !== 'false';
}

function getFirebaseOptions(): FirebaseOptions | null {
  if (isFirebaseEmulator()) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'local-emulator-api-key',
      appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'local-emulator-app',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'localhost',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? LOCAL_FIREBASE_PROJECT_ID,
    };
  }

  const {
    VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID,
  } = import.meta.env;

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
  };
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

function toAuthUser(user: User): AuthUser {
  return { email: user.email, uid: user.uid };
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
    signInWithEmail: unavailable,
    signInWithGoogle: unavailable,
    requestPasswordReset: unavailable,
    signOut: unavailable,
    signUpWithEmail: unavailable,
  };
}

function createConfiguredGateway(auth: Auth): AuthGateway {
  const googleProvider = new GoogleAuthProvider();

  return {
    async getIdToken() {
      return auth.currentUser ? auth.currentUser.getIdToken() : null;
    },
    observe(listener, onError) {
      void getRedirectResult(auth).catch(onError);
      return onAuthStateChanged(auth, (user) => listener(user ? toAuthUser(user) : null), onError);
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
