import type { Firestore } from 'firebase-admin/firestore';

export interface PublishedAdminContentSeedDependencies {
  createReleaseOneFirestoreAdminContentSeed: () => readonly unknown[];
  seedFirestoreAdminContentForEmulator: (input: {
    content: readonly unknown[];
    firestore: Firestore;
  }) => Promise<void>;
}

export type LoadPublishedAdminContentSeedDependencies =
  () => Promise<PublishedAdminContentSeedDependencies>;

async function loadPublishedAdminContentSeedDependencies(): Promise<PublishedAdminContentSeedDependencies> {
  const [contentSeedModule, repositoryModule] = await Promise.all([
    import(
      new URL('../../../apps/functions/dist/admin-content-emulator-seed.js', import.meta.url).href
    ),
    import(
      new URL('../../../apps/functions/dist/firestore-admin-content-repository.js', import.meta.url)
        .href
    ),
  ]);

  return {
    createReleaseOneFirestoreAdminContentSeed:
      contentSeedModule.createReleaseOneFirestoreAdminContentSeed,
    seedFirestoreAdminContentForEmulator: repositoryModule.seedFirestoreAdminContentForEmulator,
  };
}

export async function seedPublishedAdminContent(
  firestore: Firestore,
  loadDependencies: LoadPublishedAdminContentSeedDependencies = loadPublishedAdminContentSeedDependencies,
): Promise<void> {
  const dependencies = await loadDependencies();

  await dependencies.seedFirestoreAdminContentForEmulator({
    content: dependencies.createReleaseOneFirestoreAdminContentSeed(),
    firestore,
  });
}
