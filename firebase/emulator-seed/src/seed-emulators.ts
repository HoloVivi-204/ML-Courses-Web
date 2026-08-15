import { deleteApp } from 'firebase-admin/app';

import { createLocalAdminServices } from './admin-services.js';
import { LOCAL_FIREBASE_PROJECT_ID, createLocalEmulatorEnvironment } from './environment.js';
import { seedLocalDemoAccounts } from './local-demo-accounts.js';
import { seedPublishedAdminContent } from './published-admin-content-seed.js';
import { resetAndSeedLocalEmulators } from './reset-and-seed.js';
import { createLocalSeedManifest } from './seed-manifest.js';

const environment = createLocalEmulatorEnvironment(process.env);
const services = createLocalAdminServices(environment);

try {
  await resetAndSeedLocalEmulators(services, createLocalSeedManifest());
  await seedPublishedAdminContent(services.firestore);
  const accounts = await seedLocalDemoAccounts(services.auth);

  console.log(
    JSON.stringify({
      accounts,
      projectId: LOCAL_FIREBASE_PROJECT_ID,
      reset: true,
      seeded: ['auth', 'firestore', 'storage', 'admin-content'],
      success: true,
    }),
  );
} finally {
  await deleteApp(services.app);
}
