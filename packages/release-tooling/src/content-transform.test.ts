import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLockedContentScope } from './content-scope-validator.js';
import { createCourseTransformManifest } from './content-transform.js';
import { validatePreparedCourseSourcePipeline } from './content-validate.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmDirectory(directory);
  }
});

function createSha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'ml-content-transform-'));
  temporaryDirectories.push(directory);
  return directory;
}

function rmDirectory(directory: string): void {
  rmSync(directory, { force: true, recursive: true });
}

function writePinnedSnapshot(input: { outputRoot: string; sourceId: string; text: string }): void {
  const contentSha256 = createSha256(input.text);
  const metadataSha256 = createSha256('metadata');
  const contentUrl = `https://sources.example/${input.sourceId}/content`;
  const metadataUrl = `https://sources.example/${input.sourceId}/metadata`;
  const hash = createSha256(
    JSON.stringify({
      content: [{ sha256: contentSha256, url: contentUrl }],
      license: { sha256: metadataSha256, url: metadataUrl },
      robots: { sha256: metadataSha256, url: metadataUrl },
      sourceId: input.sourceId,
      terms: { sha256: metadataSha256, url: metadataUrl },
    }),
  );
  const artifactDirectory = join(input.outputRoot, 'sources', input.sourceId, hash);
  const contentPath = join(artifactDirectory, 'content-01.html');
  const metadataPath = join(artifactDirectory, 'metadata.txt');

  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(contentPath, input.text, 'utf8');
  writeFileSync(metadataPath, 'metadata', 'utf8');

  const metadataSnapshot = {
    byteSize: 8,
    path: metadataPath,
    sha256: metadataSha256,
    url: metadataUrl,
  };
  const manifest = {
    accessedAt: '2026-08-04T16:00:00.000Z',
    content: [
      {
        byteSize: Buffer.byteLength(input.text),
        path: contentPath,
        sha256: contentSha256,
        url: contentUrl,
      },
    ],
    contentSnapshotHash: hash,
    license: metadataSnapshot,
    manifestPath: join(artifactDirectory, 'source-manifest.json'),
    reviewStatus: 'pending-operator-review',
    robots: { ...metadataSnapshot, status: 'allowed' },
    schemaVersion: 1,
    sourceId: input.sourceId,
    terms: metadataSnapshot,
  };

  writeFileSync(manifest.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

describe('content snapshot transform', () => {
  it('creates stable course units with source hashes after sanitizing snapshot text', async () => {
    const outputRoot = createTemporaryDirectory();
    const scope = getLockedContentScope();
    const course = scope.courses.find((item) => item.courseId === 'course-classical-ml')!;

    for (const sourceId of course.sourceIds) {
      writePinnedSnapshot({
        outputRoot,
        sourceId,
        text: `<article><h1>${sourceId}</h1><p>Regression evidence.</p><script>unsafe()</script></article>`,
      });
    }

    const result = await createCourseTransformManifest({
      courseId: course.courseId,
      outputRoot,
      scope,
    });

    expect(result.manifest.courseId).toBe(course.courseId);
    expect(result.manifest.sourceSnapshots).toHaveLength(course.sourceIds.length);
    expect(result.manifest.units.filter((unit) => unit.entityType === 'post')).toHaveLength(15);
    expect(result.manifest.units.filter((unit) => unit.entityType === 'demo')).toHaveLength(8);
    expect(
      result.manifest.units.find((unit) => unit.entityId === 'cml-p03-linear-regression'),
    ).toMatchObject({
      sourceIds: course.sourceIds,
    });
    expect(result.manifest.sourceSnapshots[0]?.sanitizedText).toContain('Regression evidence.');
    expect(result.manifest.sourceSnapshots[0]?.sanitizedText).not.toContain('unsafe()');

    await expect(
      validatePreparedCourseSourcePipeline({
        courseId: course.courseId,
        outputRoot,
        scope,
      }),
    ).resolves.toEqual({
      courseId: course.courseId,
      readyForAuthoring: true,
      sourceCount: course.sourceIds.length,
      unitCount: result.manifest.units.length,
    });
  });

  it('transforms pinned local snapshots when network access is unavailable', async () => {
    const outputRoot = createTemporaryDirectory();
    const scope = getLockedContentScope();
    const course = scope.courses.find((item) => item.courseId === 'course-classical-ml')!;
    let fetchCalls = 0;

    for (const sourceId of course.sourceIds) {
      writePinnedSnapshot({
        outputRoot,
        sourceId,
        text: '<article><h1>' + sourceId + '</h1><p>Offline source evidence.</p></article>',
      });
    }

    vi.stubGlobal('fetch', async () => {
      fetchCalls += 1;
      throw new Error('Network access is unavailable.');
    });

    try {
      await expect(
        createCourseTransformManifest({
          courseId: course.courseId,
          outputRoot,
          scope,
        }),
      ).resolves.toMatchObject({
        manifest: {
          courseId: course.courseId,
          reviewStatus: 'pending-operator-review',
        },
      });
      expect(fetchCalls).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
