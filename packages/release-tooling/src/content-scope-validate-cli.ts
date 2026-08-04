import { parseScopeValidationCommand } from './content-cli-arguments.js';
import { getLockedContentScope } from './content-scope-validator.js';
import { assertContentSourceRegistryMatchesScope } from './content-source-registry.js';

parseScopeValidationCommand(process.argv.slice(2));

const scope = getLockedContentScope();
assertContentSourceRegistryMatchesScope(scope);

console.log(
  JSON.stringify({
    counts: scope.counts,
    courses: scope.courses.map((course) => course.courseId),
    sourceIds: scope.sourceIds,
    valid: true,
  }),
);
