import { deleteApp } from 'firebase-admin/app';

import { createLocalAdminServices } from './admin-services.js';
import { LOCAL_FIREBASE_PROJECT_ID, createLocalEmulatorEnvironment } from './environment.js';
import { seedPublishedAdminContent } from './published-admin-content-seed.js';
import { resetAndSeedLocalEmulators } from './reset-and-seed.js';
import { createLocalSeedManifest } from './seed-manifest.js';

const environment = createLocalEmulatorEnvironment(process.env);
const services = createLocalAdminServices(environment);

try {
  await resetAndSeedLocalEmulators(services, createLocalSeedManifest());
  await seedPublishedAdminContent(services.firestore);
} finally {
  await deleteApp(services.app);
}

console.log(
  JSON.stringify({
    success: true,
    projectId: LOCAL_FIREBASE_PROJECT_ID,
    reset: true,
    seeded: ['auth', 'firestore', 'storage', 'admin-content'],
  }),
);
