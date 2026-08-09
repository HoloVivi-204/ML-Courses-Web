import { getApp, getApps, initializeApp } from 'firebase-admin/app';

export function getFirebaseAdminStorageBucketName(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string | undefined {
  if (!environment.FIREBASE_STORAGE_EMULATOR_HOST?.trim()) {
    return undefined;
  }

  for (const candidate of [
    environment.GCLOUD_PROJECT,
    environment.GOOGLE_CLOUD_PROJECT,
    environment.FIREBASE_PROJECT_ID,
  ]) {
    const projectId = candidate?.trim();

    if (projectId) {
      return `${projectId}.appspot.com`;
    }
  }

  return undefined;
}

export function getFirebaseAdminApp() {
  return getApps().length > 0 ? getApp() : initializeApp();
}
