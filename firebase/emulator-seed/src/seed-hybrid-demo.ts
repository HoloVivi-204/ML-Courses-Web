import { deleteApp } from 'firebase-admin/app';

import { createHybridDemoEnvironment } from './hybrid-demo-environment.js';
import { createHybridDemoServices } from './hybrid-demo-services.js';
import { resetAndSeedLocalDataEmulators } from './reset-and-seed.js';
import { createLocalSeedManifest } from './seed-manifest.js';

const environment = createHybridDemoEnvironment(process.env);

Object.assign(process.env, environment);
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

const services = createHybridDemoServices(process.env);

try {
  await resetAndSeedLocalDataEmulators(services, createLocalSeedManifest());

  const [contentSeedModule, repositoryModule] = await Promise.all([
    import(
      new URL('../../../apps/functions/dist/admin-content-emulator-seed.js', import.meta.url).href
    ),
    import(
      new URL('../../../apps/functions/dist/firestore-admin-content-repository.js', import.meta.url)
        .href
    ),
  ]);

  await repositoryModule.seedFirestoreAdminContentForEmulator({
    content: contentSeedModule.createReleaseOneFirestoreAdminContentSeed(),
    firestore: services.firestore,
  });
} finally {
  await deleteApp(services.app);
}

console.log(
  JSON.stringify({
    success: true,
    projectId: environment.FIREBASE_PROJECT_ID,
    seeded: ['firestore', 'storage', 'admin-content'],
  }),
);
