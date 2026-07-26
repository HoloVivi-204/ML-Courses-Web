import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const routeShellBudgetBytes = 450 * 1024;
const distDirectory = resolve(import.meta.dirname, '..', 'dist');
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
