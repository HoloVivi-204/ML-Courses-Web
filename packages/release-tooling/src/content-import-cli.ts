import { randomUUID } from 'node:crypto';

import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { assertTrustedMutationTarget, parseTrustedCommand } from './trusted-command.js';

interface ContentDraftStore {
  get(path: string): Promise<Readonly<Record<string, unknown>> | null>;
  set(path: string, value: Readonly<Record<string, unknown>>): Promise<void>;
}

interface ContentImporterModule {
  diffReleaseContentDrafts(input: { store: ContentDraftStore }): Promise<
    readonly {
      document: { entityId: string; entityType: string; storagePath: string };
      status: 'create' | 'unchanged' | 'update';
    }[]
  >;
  importReleaseContentDrafts(input: { dryRun: boolean; store: ContentDraftStore }): Promise<{
    created: number;
    dryRun: boolean;
    inputHash: string;
    jobId: string;
    unchanged: number;
    updated: number;
  }>;
}

async function loadContentImporter(): Promise<ContentImporterModule> {
  const importerModulePath = new URL(
    '../../../firebase/emulator-seed/dist/content-draft-import.js',
    import.meta.url,
  ).href;

  return (await import(importerModulePath)) as ContentImporterModule;
}

const command = parseTrustedCommand(process.argv.slice(2));
assertTrustedMutationTarget(command);

const app = initializeApp({ projectId: command.projectId }, `content-import-${randomUUID()}`);
const firestore = getFirestore(app);
const store: ContentDraftStore = {
  async get(path) {
    const snapshot = await firestore.doc(path).get();

    return snapshot.exists ? (snapshot.data() ?? null) : null;
  },
  async set(path, value) {
    await firestore.doc(path).set(value);
  },
};

try {
  const importer = await loadContentImporter();
  const diff = await importer.diffReleaseContentDrafts({ store });
  const result = await importer.importReleaseContentDrafts({
    dryRun: command.isDryRun,
    store,
  });

  console.log(
    JSON.stringify({
      ...result,
      diff: diff.map((change) => ({
        entityId: change.document.entityId,
        entityType: change.document.entityType,
        status: change.status,
        storagePath: change.document.storagePath,
      })),
      environment: command.environment,
      projectId: command.projectId,
    }),
  );
} finally {
  await deleteApp(app);
}
