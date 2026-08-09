import { readFileSync } from 'node:fs';

import { validateFirestoreIndexMigrationDryRun } from './firestore-index-contract.js';

const configuration = JSON.parse(
  readFileSync(new URL('../../firestore.indexes.json', import.meta.url), 'utf8'),
) as unknown;
const report = validateFirestoreIndexMigrationDryRun({ configuration, pinRunsEnabled: false });

console.log(JSON.stringify({ dryRun: true, ...report }, null, 2));

if (!report.isValid) {
  process.exitCode = 1;
}
