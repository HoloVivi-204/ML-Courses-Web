import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationDirectory = fileURLToPath(new URL('.', import.meta.url));
const rootDirectory = resolve(migrationDirectory, '..', '..');
const checkpointArgumentIndex = process.argv.indexOf('--checkpoint');
const checkpointPath =
  checkpointArgumentIndex >= 0 ? process.argv[checkpointArgumentIndex + 1] : undefined;

if (!process.argv.includes('--dry-run')) {
  throw new Error('This Release 1 migration only supports --dry-run in local validation.');
}

if (checkpointArgumentIndex >= 0 && !checkpointPath) {
  throw new Error('--checkpoint requires a local file path.');
}

const [seedModule, migrationModule] = await Promise.all([
  import(new URL('../../apps/functions/dist/admin-content-emulator-seed.js', import.meta.url).href),
  import(
    new URL('../../apps/functions/dist/release-one-content-migration.js', import.meta.url).href
  ),
]);
const report = migrationModule.createReleaseOneContentMigrationDryRun({
  content: seedModule.createReleaseOneFirestoreAdminContentSeed(),
});
const output = {
  dryRun: true,
  ...report,
  writes: report.writes.map(({ documentId }) => documentId),
};

if (checkpointPath) {
  const resolvedCheckpointPath = resolve(rootDirectory, checkpointPath);
  const relativeCheckpointPath = relative(rootDirectory, resolvedCheckpointPath);

  if (relativeCheckpointPath.startsWith('..') || relativeCheckpointPath === '') {
    throw new Error('The local migration checkpoint must stay inside the repository.');
  }

  mkdirSync(dirname(resolvedCheckpointPath), { recursive: true });
  writeFileSync(resolvedCheckpointPath, `${JSON.stringify(report.checkpoint, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(output, null, 2));

if (!report.isValid) {
  process.exitCode = 1;
}
