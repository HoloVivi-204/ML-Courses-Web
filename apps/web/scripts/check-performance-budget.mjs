import { readFile, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const routeShellBudgetBytes = 450 * 1024;
const distDirectory = resolve(import.meta.dirname, '..', 'dist');
const forbiddenLearningBundleMarkers = [
  'A single affine transformation makes a strong linear assumption.',
  'answerKey:',
  '"answerKey":',
  'correctAnswer:"opt-',
  'correctAnswer:["opt-',
  'correctAnswer:"true"',
  'correctAnswer:"false"',
  '"correctAnswer":"opt-',
  '"correctAnswer":["opt-',
  '"correctAnswer":"true"',
  '"correctAnswer":"false"',
  'correctOption:',
  '"correctOption":',
  'xor-linear-limit',
];

async function listBuildTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listBuildTextFiles(entryPath);
      }

      return ['.css', '.html', '.js'].includes(extname(entry.name)) ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat();
}

const indexHtml = await readFile(resolve(distDirectory, 'index.html'), 'utf8');
const assetPaths = [...indexHtml.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map(
  (match) => match[1],
);

if (assetPaths.length === 0) {
  throw new Error('Built index.html does not reference any route-shell assets.');
}

const assets = await Promise.all(
  assetPaths.map(async (assetPath) => {
    const content = await readFile(resolve(distDirectory, `.${assetPath}`));

    return {
      assetPath,
      gzipBytes: gzipSync(content).byteLength,
    };
  }),
);
const gzipBytes = assets.reduce((total, asset) => total + asset.gzipBytes, 0);

for (const asset of assets) {
  process.stdout.write(`${asset.assetPath}: ${asset.gzipBytes} B gzip\n`);
}

process.stdout.write(`Route-shell gzip: ${gzipBytes} B / ${routeShellBudgetBytes} B\n`);

if (gzipBytes > routeShellBudgetBytes) {
  throw new Error(
    `Route-shell gzip budget exceeded by ${gzipBytes - routeShellBudgetBytes} B. Lazy chunks are excluded.`,
  );
}

const buildTextFiles = await listBuildTextFiles(distDirectory);
const forbiddenMarkerMatches = [];

for (const filePath of buildTextFiles) {
  const content = await readFile(filePath, 'utf8');

  for (const marker of forbiddenLearningBundleMarkers) {
    if (content.includes(marker)) {
      forbiddenMarkerMatches.push(`${filePath}: ${marker}`);
    }
  }
}

if (forbiddenMarkerMatches.length > 0) {
  throw new Error(
    `Locked learning content or answer data leaked into the public bundle:\n${forbiddenMarkerMatches.join('\n')}`,
  );
}

process.stdout.write('Learning bundle security: no locked-content or answer-key markers found.\n');
