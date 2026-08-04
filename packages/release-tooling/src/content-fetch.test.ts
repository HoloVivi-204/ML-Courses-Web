import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { snapshotContentSource } from './content-fetch.js';
import { getContentSource } from './content-source-registry.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'ml-content-fetch-'));
  temporaryDirectories.push(directory);
  return directory;
}

function getGoogleSourceFixture() {
  const source = getContentSource('google-ml-crash-course');

  return { ...source, contentUrls: [source.contentUrls[0]!] };
}

describe('offline content source fetch', () => {
  it('pins robots, terms, license, and allowlisted content with reproducible checksums', async () => {
    const source = getGoogleSourceFixture();
    const outputRoot = createTemporaryDirectory();
    const requestedUrls: string[] = [];
    const responses = new Map([
      ['https://developers.google.com/robots.txt', 'User-agent: *\nAllow: /\n'],
      [source.termsUrl, 'Google site terms'],
      [source.license.url, 'Creative Commons Attribution 4.0'],
      [
        source.contentUrls[0]!,
        '<article><h1>Machine learning</h1><script>ignored()</script></article>',
      ],
    ]);

    const result = await snapshotContentSource({
      fetcher: async (input) => {
        const url = String(input);
        requestedUrls.push(url);
        const body = responses.get(url);

        if (!body) {
          return new Response('not found', { status: 404 });
        }

        return new Response(body, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
          status: 200,
        });
      },
      now: () => '2026-08-04T16:00:00.000Z',
      outputRoot,
      source,
    });

    expect(requestedUrls).toEqual([
      'https://developers.google.com/robots.txt',
      source.termsUrl,
      source.license.url,
      source.contentUrls[0],
    ]);
    expect(result.manifest.sourceId).toBe(source.sourceId);
    expect(result.manifest.reviewStatus).toBe('pending-operator-review');
    expect(result.manifest.robots.status).toBe('allowed');
    expect(result.manifest.content).toHaveLength(1);
    expect(result.manifest.content[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(readFileSync(result.manifestPath, 'utf8')).toContain('google-ml-crash-course');
    expect(readFileSync(result.manifest.content[0]!.path, 'utf8')).toContain(
      '<script>ignored()</script>',
    );
  });

  it('stops before downloading source content when robots disallow the target path', async () => {
    const source = getGoogleSourceFixture();
    const outputRoot = createTemporaryDirectory();
    const requestedUrls: string[] = [];

    await expect(
      snapshotContentSource({
        fetcher: async (input) => {
          const url = String(input);
          requestedUrls.push(url);
          return new Response('User-agent: *\nDisallow: /machine-learning/crash-course\n', {
            status: 200,
          });
        },
        now: () => '2026-08-04T16:00:00.000Z',
        outputRoot,
        source,
      }),
    ).rejects.toThrow('robots.txt disallows snapshotting /machine-learning/crash-course.');

    expect(requestedUrls).toEqual(['https://developers.google.com/robots.txt']);
  });

  it('records a missing robots file without treating it as permission or a fetch failure', async () => {
    const source = getGoogleSourceFixture();
    const outputRoot = createTemporaryDirectory();

    const result = await snapshotContentSource({
      fetcher: async (input) => {
        const url = String(input);

        if (url === 'https://developers.google.com/robots.txt') {
          return new Response('not found', { status: 404 });
        }

        return new Response('snapshot', { status: 200 });
      },
      now: () => '2026-08-04T16:00:00.000Z',
      outputRoot,
      source,
    });

    expect(result.manifest.robots.status).toBe('not-provided');
    expect(result.manifest.reviewStatus).toBe('pending-operator-review');
  });

  it('validates the locked source allowlist before making any network request', async () => {
    const source = { ...getGoogleSourceFixture(), sourceId: 'unlocked-source' };
    const outputRoot = createTemporaryDirectory();
    const requestedUrls: string[] = [];

    await expect(
      snapshotContentSource({
        fetcher: async (input) => {
          requestedUrls.push(String(input));
          return new Response('unexpected request', { status: 500 });
        },
        outputRoot,
        source,
      }),
    ).rejects.toThrow('Source unlocked-source is not referenced by content-skeleton.yaml.');

    expect(requestedUrls).toEqual([]);
  });
});
