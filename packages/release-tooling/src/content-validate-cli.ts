import { parseCourseCommand } from './content-cli-arguments.js';
import { getContentPipelineRoot } from './content-pipeline-paths.js';
import { validatePreparedCourseSourcePipeline } from './content-validate.js';

interface ReleaseContentValidatorModule {
  assertReleaseContentBaseline(): {
    counts: Readonly<Record<string, number>>;
    status: 'valid';
  };
}

async function assertReleaseContentBaseline(): Promise<{
  counts: Readonly<Record<string, number>>;
  status: 'valid';
}> {
  const modulePath = new URL(
    '../../../apps/functions/dist/release-content-validator.js',
    import.meta.url,
  ).href;
  const validator = (await import(modulePath)) as ReleaseContentValidatorModule;

  return validator.assertReleaseContentBaseline();
}

const command = parseCourseCommand(process.argv.slice(2), 'content:validate');
const result = await validatePreparedCourseSourcePipeline({
  courseId: command.courseId,
  outputRoot: getContentPipelineRoot(),
});
const baseline = await assertReleaseContentBaseline();

console.log(
  JSON.stringify({
    ...result,
    baseline,
    stage: 'source-and-content-preflight',
  }),
);
