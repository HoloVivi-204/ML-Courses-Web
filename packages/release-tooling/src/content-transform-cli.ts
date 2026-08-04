import { parseCourseCommand } from './content-cli-arguments.js';
import { getContentPipelineRoot } from './content-pipeline-paths.js';
import { createCourseTransformManifest } from './content-transform.js';

const command = parseCourseCommand(process.argv.slice(2), 'content:transform');
const result = await createCourseTransformManifest({
  courseId: command.courseId,
  outputRoot: getContentPipelineRoot(),
});

console.log(
  JSON.stringify({
    courseId: result.manifest.courseId,
    manifestHash: result.manifest.manifestHash,
    manifestPath: result.manifestPath,
    reviewStatus: result.manifest.reviewStatus,
    unitCount: result.manifest.units.length,
  }),
);
