import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationDirectory = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(migrationDirectory, '..', '..');

function readJsonFile(pathValue) {
  try {
    return JSON.parse(readFileSync(pathValue, 'utf8'));
  } catch {
    throw new Error('A local checksum-v2 migration JSON file is malformed or unreadable.');
  }
}

function writeJsonAtomically(pathValue, value) {
  mkdirSync(dirname(pathValue), { recursive: true });
  const temporaryPath = `${pathValue}.${process.pid}.${Date.now()}.tmp`;

  try {
    writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    renameSync(temporaryPath, pathValue);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

try {
  const migrationModule = await import(
    new URL('../../apps/functions/dist/admin-content-checksum-v2-migration.js', import.meta.url)
      .href
  );
  const argumentsValue = migrationModule.parseAdminContentChecksumV2MigrationArguments(
    process.argv.slice(2),
  );
  const pathFileSystem = { exists: existsSync, realpath: realpathSync.native };
  const inputPath = migrationModule.resolveAdminContentChecksumV2MigrationPath({
    pathValue: argumentsValue.inputPath,
    pathFileSystem,
    repoRoot,
  });
  const resumeFromPath = argumentsValue.resumeFromPath
    ? migrationModule.resolveAdminContentChecksumV2MigrationPath({
        pathValue: argumentsValue.resumeFromPath,
        pathFileSystem,
        repoRoot,
      })
    : undefined;
  const checkpointPath = argumentsValue.checkpointPath
    ? migrationModule.resolveAdminContentChecksumV2MigrationPath({
        pathValue: argumentsValue.checkpointPath,
        pathFileSystem,
        repoRoot,
      })
    : undefined;

  if (resumeFromPath && !existsSync(resumeFromPath)) {
    throw new Error('The checksum-v2 migration resume checkpoint does not exist.');
  }
  if (
    checkpointPath &&
    existsSync(checkpointPath) &&
    (!resumeFromPath || checkpointPath !== resumeFromPath)
  ) {
    throw new Error('Refusing to overwrite a checkpoint that is not the explicit resume file.');
  }

  const records = migrationModule.parseAdminContentChecksumV2MigrationInput(
    readJsonFile(inputPath),
  );
  const checkpoint = resumeFromPath ? readJsonFile(resumeFromPath) : undefined;
  const report = migrationModule.createAdminContentChecksumV2MigrationDryRun({
    records,
    ...(checkpoint === undefined ? {} : { checkpoint }),
    ...(argumentsValue.maxDocuments === undefined
      ? {}
      : { maxDocuments: argumentsValue.maxDocuments }),
  });
  const isCompletedResume =
    checkpoint !== undefined && report.checkpoint.completed && report.batchOutcomes.length === 0;

  if (checkpointPath && !isCompletedResume) {
    writeJsonAtomically(checkpointPath, report.checkpoint);
  }

  console.log(JSON.stringify(report, null, 2));
  if (!report.isValid) {
    process.exitCode = 1;
  }
} catch (error) {
  const message =
    error instanceof Error ? error.message : 'Checksum-v2 migration preflight failed.';
  console.error(message);
  process.exitCode = 1;
}
