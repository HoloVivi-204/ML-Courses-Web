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

function isLocalEmulator(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR !== 'false';
}

function getFirebaseOptions(): FirebaseOptions | null {
  if (isLocalEmulator()) {
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
    async signOut() {
      await signOut(auth);
    },
    async signUpWithEmail(email, password) {
      await createUserWithEmailAndPassword(auth, email, password);
    },
  };
}

export function createFirebaseAuthGateway(): AuthGateway {
  const options = getFirebaseOptions();

  if (!options) {
    return createUnavailableGateway();
  }

  const auth = getAuth(getFirebaseApp(options));

  if (isLocalEmulator() && !auth.emulatorConfig) {
    connectAuthEmulator(auth, LOCAL_AUTH_EMULATOR_URL, { disableWarnings: true });
  }

  return createConfiguredGateway(auth);
}
