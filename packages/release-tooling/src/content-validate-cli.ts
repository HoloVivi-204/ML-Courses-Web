import { parseCourseCommand } from './content-cli-arguments.js';
import { getContentPipelineRoot } from './content-pipeline-paths.js';
import { validatePreparedCourseSourcePipeline } from './content-validate.js';

const command = parseCourseCommand(process.argv.slice(2), 'content:validate');
const result = await validatePreparedCourseSourcePipeline({
  courseId: command.courseId,
  outputRoot: getContentPipelineRoot(),
});

console.log(
  JSON.stringify({
    ...result,
    stage: 'source-preflight',
  }),
);
