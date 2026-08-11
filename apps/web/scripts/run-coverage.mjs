import { spawn } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const vitestCli = resolve(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs');
const reportDirectory = resolve(process.cwd(), '.runtime', 'vitest-coverage-reports');
const appTestFile = 'src/app/app.test.tsx';
const referenceAdaptersTestFile = 'src/features/playground/playground-reference-adapters.test.ts';
const learnerBaselineTestPattern =
  'proves the learner baseline from enrollment through unlock, Playground persistence, and dashboard';
const deterministicGoldenFixtureTestPattern =
  'returns deterministic results for every implemented Must golden fixture pair';
const expensiveReferenceAdapterTestPatterns = [
  'runs pg-nonlinear-2d MLP through the registry and matches the golden fixture',
  'runs pg-spam-detection logistic regression through the registry and matches the golden fixture',
  'runs pg-credit-risk logistic regression through the registry and matches the golden fixture',
  'runs pg-xor MLP through the registry and matches the golden fixture',
];
const tensorflowGoldenFixtureTestPatterns = [
  expensiveReferenceAdapterTestPatterns[0],
  expensiveReferenceAdapterTestPatterns[3],
];

function escapeRegex(pattern) {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runVitest(arguments_, environment) {
  const childProcess = spawn(process.execPath, [vitestCli, ...arguments_], {
    cwd: process.cwd(),
    env: environment,
    stdio: 'inherit',
  });

  return new Promise((resolve, reject) => {
    childProcess.once('error', reject);
    childProcess.once('exit', (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(`Vitest exited with code ${exitCode ?? 1}.`));
    });
  });
}

function findTestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findTestFiles(entryPath);
    }

    if (!/\.test\.(?:ts|tsx)$/.test(entry.name)) {
      return [];
    }

    return [relative(process.cwd(), entryPath).split(sep).join('/')];
  });
}

async function runCoverageShard(label, testFiles, environment, cleanCoverage) {
  await runVitest(
    [
      'run',
      '--coverage',
      `--coverage.clean=${cleanCoverage}`,
      '--coverage.thresholds.lines=0',
      '--reporter=blob',
      '--outputFile',
      join(reportDirectory, `${label}.json`),
      ...testFiles,
    ],
    environment,
  );
}

rmSync(reportDirectory, { force: true, recursive: true });

await runVitest(['run', appTestFile, '--testNamePattern', learnerBaselineTestPattern], process.env);

await runVitest(
  ['run', referenceAdaptersTestFile, '--testNamePattern', deterministicGoldenFixtureTestPattern],
  process.env,
);

for (const testPattern of tensorflowGoldenFixtureTestPatterns) {
  await runVitest(
    ['run', referenceAdaptersTestFile, '--testNamePattern', testPattern],
    process.env,
  );
}

const coverageEnvironment = {
  ...process.env,
  ML_PATH_V8_COVERAGE_PROFILING: 'true',
};
const otherTestFiles = findTestFiles(resolve(process.cwd(), 'src'))
  .filter((testFile) => testFile !== appTestFile && testFile !== referenceAdaptersTestFile)
  .sort();
const nonLearnerBaselineTestPattern = `^(?!.*(${escapeRegex(learnerBaselineTestPattern)})).*$`;
const coverageReferenceAdapterTestPattern = `^(?!.*(${[
  deterministicGoldenFixtureTestPattern,
  ...expensiveReferenceAdapterTestPatterns,
]
  .map(escapeRegex)
  .join('|')})).*$`;

await runCoverageShard(
  'app',
  [appTestFile, '--testNamePattern', nonLearnerBaselineTestPattern],
  coverageEnvironment,
  true,
);
await runCoverageShard(
  'reference-adapters-standard',
  [referenceAdaptersTestFile, '--testNamePattern', coverageReferenceAdapterTestPattern],
  coverageEnvironment,
  false,
);

for (const [index, testPattern] of expensiveReferenceAdapterTestPatterns.entries()) {
  await runCoverageShard(
    `reference-adapters-expensive-${index + 1}`,
    [referenceAdaptersTestFile, '--testNamePattern', testPattern],
    coverageEnvironment,
    false,
  );
}

await runCoverageShard('other', otherTestFiles, coverageEnvironment, false);
await runVitest(
  ['--merge-reports', reportDirectory, '--coverage', '--coverage.clean=false'],
  process.env,
);
