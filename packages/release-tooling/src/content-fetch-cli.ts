import { parseFetchSourceCommand } from './content-cli-arguments.js';
import { snapshotContentSource } from './content-fetch.js';
import { getContentPipelineRoot } from './content-pipeline-paths.js';
import { getContentSource } from './content-source-registry.js';

const command = parseFetchSourceCommand(process.argv.slice(2));
const result = await snapshotContentSource({
  outputRoot: getContentPipelineRoot(),
  source: getContentSource(command.sourceId),
});

console.log(
  JSON.stringify({
    contentSnapshotHash: result.manifest.contentSnapshotHash,
    manifestPath: result.manifestPath,
    reviewStatus: result.manifest.reviewStatus,
    sourceId: result.manifest.sourceId,
  }),
);
