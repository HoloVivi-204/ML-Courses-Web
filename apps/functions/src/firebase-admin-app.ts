import { getApp, getApps, initializeApp } from 'firebase-admin/app';

export function getFirebaseAdminApp() {
  return getApps().length > 0 ? getApp() : initializeApp();
}
