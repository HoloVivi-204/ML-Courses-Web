import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep, join } from 'node:path';

import {
  getLockedContentScope,
  type LockedContentCourse,
  type LockedContentScope,
} from './content-scope-validator.js';

const MAX_SANITIZED_TEXT_CHARACTERS = 120_000;

type TransformUnitEntityType = 'course' | 'demo' | 'module' | 'post' | 'quiz';

interface SnapshotFile {
  byteSize: number;
  path: string;
  sha256: string;
  url: string;
}

interface StoredSourceSnapshotManifest {
  accessedAt: string;
  content: readonly SnapshotFile[];
  contentSnapshotHash: string;
  license: SnapshotFile;
  reviewStatus: 'pending-operator-review';
  robots: SnapshotFile & { status: 'allowed' | 'not-provided' };
  schemaVersion: 1;
  sourceId: string;
  terms: SnapshotFile;
}

export interface TransformSourceSnapshot {
  contentSnapshotHash: string;
  sanitizedText: string;
  sanitizedTextHash: string;
  sourceId: string;
}

export interface CourseTransformUnit {
  entityId: string;
  entityType: TransformUnitEntityType;
  moduleId?: string;
  postId?: string;
  quizKind?: 'module' | 'post';
  sourceIds: readonly string[];
  sourceSnapshotHashes: Readonly<Record<string, string>>;
}

export interface CourseTransformManifest {
  courseId: string;
  manifestHash: string;
  manifestPath: string;
  reviewStatus: 'pending-operator-review';
  schemaVersion: 1;
  sourceSnapshots: readonly TransformSourceSnapshot[];
  units: readonly CourseTransformUnit[];
}

export interface CourseTransformResult {
  manifest: CourseTransformManifest;
  manifestPath: string;
}

function createSha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSnapshotFile(value: unknown): value is SnapshotFile {
  return (
    isRecord(value) &&
    typeof value.byteSize === 'number' &&
    typeof value.path === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.url === 'string'
  );
}

function parseSourceSnapshotManifest(
  rawManifest: string,
  sourceId: string,
): StoredSourceSnapshotManifest {
  let value: unknown;

  try {
    value = JSON.parse(rawManifest);
  } catch {
    throw new Error(`Source ${sourceId} has an invalid source-manifest.json.`);
  }

  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.sourceId !== sourceId ||
    typeof value.accessedAt !== 'string' ||
    typeof value.contentSnapshotHash !== 'string' ||
    value.reviewStatus !== 'pending-operator-review' ||
    !Array.isArray(value.content) ||
    !value.content.every(isSnapshotFile) ||
    !isSnapshotFile(value.license) ||
    !isSnapshotFile(value.terms) ||
    !isRecord(value.robots) ||
    (value.robots.status !== 'allowed' && value.robots.status !== 'not-provided') ||
    !isSnapshotFile(value.robots)
  ) {
    throw new Error(`Source ${sourceId} has an invalid source snapshot manifest.`);
  }

  return {
    accessedAt: value.accessedAt,
    content: value.content,
    contentSnapshotHash: value.contentSnapshotHash,
    license: value.license,
    reviewStatus: value.reviewStatus,
    robots: { ...value.robots, status: value.robots.status },
    schemaVersion: 1,
    sourceId,
    terms: value.terms,
  };
}

function assertPathInsideDirectory(path: string, directory: string, sourceId: string): void {
  const resolvedDirectory = resolve(directory);
  const resolvedPath = resolve(path);
  const pathFromDirectory = relative(resolvedDirectory, resolvedPath);

  if (
    pathFromDirectory === '' ||
    pathFromDirectory === '..' ||
    pathFromDirectory.startsWith(`..${sep}`)
  ) {
    throw new Error(`Source ${sourceId} snapshot points outside its artifact directory.`);
  }
}

async function readAndVerifySnapshotFile(input: {
  artifactDirectory: string;
  file: SnapshotFile;
  sourceId: string;
}): Promise<Buffer> {
  assertPathInsideDirectory(input.file.path, input.artifactDirectory, input.sourceId);
  const content = await readFile(input.file.path);

  if (content.byteLength !== input.file.byteSize || createSha256(content) !== input.file.sha256) {
    throw new Error(
      `Source ${input.sourceId} snapshot checksum does not match ${input.file.path}.`,
    );
  }

  return content;
}

function createExpectedSnapshotHash(manifest: StoredSourceSnapshotManifest): string {
  return createSha256(
    JSON.stringify({
      content: manifest.content.map((item) => ({ sha256: item.sha256, url: item.url })),
      license: { sha256: manifest.license.sha256, url: manifest.license.url },
      robots: { sha256: manifest.robots.sha256, url: manifest.robots.url },
      sourceId: manifest.sourceId,
      terms: { sha256: manifest.terms.sha256, url: manifest.terms.url },
    }),
  );
}

function sanitizeSourceText(rawText: string): string {
  const textWithoutExecutableMarkup = rawText
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replaceAll(String.fromCharCode(0), ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return textWithoutExecutableMarkup.slice(0, MAX_SANITIZED_TEXT_CHARACTERS);
}

async function readLatestSourceSnapshot(input: {
  outputRoot: string;
  sourceId: string;
}): Promise<TransformSourceSnapshot> {
  const sourceDirectory = join(input.outputRoot, 'sources', input.sourceId);
  let entries: Dirent<string>[];

  try {
    entries = await readdir(sourceDirectory, { withFileTypes: true });
  } catch {
    throw new Error(`Source ${input.sourceId} has no local snapshot. Run content:fetch first.`);
  }

  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const artifactDirectory = join(sourceDirectory, entry.name);
        const manifestPath = join(artifactDirectory, 'source-manifest.json');

        try {
          const manifest = parseSourceSnapshotManifest(
            await readFile(manifestPath, 'utf8'),
            input.sourceId,
          );
          return { artifactDirectory, manifest };
        } catch {
          return null;
        }
      }),
  );
  const latestSnapshot = manifests
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((first, second) =>
      second.manifest.accessedAt.localeCompare(first.manifest.accessedAt),
    )[0];

  if (!latestSnapshot) {
    throw new Error(
      `Source ${input.sourceId} has no valid local snapshot. Run content:fetch first.`,
    );
  }

  const manifest = latestSnapshot.manifest;

  if (createExpectedSnapshotHash(manifest) !== manifest.contentSnapshotHash) {
    throw new Error(`Source ${input.sourceId} snapshot hash is not reproducible.`);
  }

  await readAndVerifySnapshotFile({
    artifactDirectory: latestSnapshot.artifactDirectory,
    file: manifest.robots,
    sourceId: input.sourceId,
  });
  await readAndVerifySnapshotFile({
    artifactDirectory: latestSnapshot.artifactDirectory,
    file: manifest.terms,
    sourceId: input.sourceId,
  });
  await readAndVerifySnapshotFile({
    artifactDirectory: latestSnapshot.artifactDirectory,
    file: manifest.license,
    sourceId: input.sourceId,
  });
  const rawContent = await Promise.all(
    manifest.content.map((file) =>
      readAndVerifySnapshotFile({
        artifactDirectory: latestSnapshot.artifactDirectory,
        file,
        sourceId: input.sourceId,
      }),
    ),
  );

  const sanitizedText = sanitizeSourceText(Buffer.concat(rawContent).toString('utf8'));

  if (!sanitizedText) {
    throw new Error(`Source ${input.sourceId} does not contain transformable text.`);
  }

  return {
    contentSnapshotHash: manifest.contentSnapshotHash,
    sanitizedText,
    sanitizedTextHash: createSha256(sanitizedText),
    sourceId: input.sourceId,
  };
}

function getCourse(scope: LockedContentScope, courseId: string): LockedContentCourse {
  const course = scope.courses.find((candidate) => candidate.courseId === courseId);

  if (!course) {
    throw new Error(`Course ${courseId} is not locked in content-skeleton.yaml.`);
  }

  return course;
}

function createTransformUnits(input: {
  course: LockedContentCourse;
  sourceSnapshotHashes: Readonly<Record<string, string>>;
}): readonly CourseTransformUnit[] {
  const units: CourseTransformUnit[] = [
    {
      entityId: input.course.courseId,
      entityType: 'course',
      sourceIds: input.course.sourceIds,
      sourceSnapshotHashes: input.sourceSnapshotHashes,
    },
  ];

  for (const module of input.course.modules) {
    units.push({
      entityId: module.moduleId,
      entityType: 'module',
      moduleId: module.moduleId,
      sourceIds: input.course.sourceIds,
      sourceSnapshotHashes: input.sourceSnapshotHashes,
    });
    units.push({
      entityId: module.moduleQuizId,
      entityType: 'quiz',
      moduleId: module.moduleId,
      quizKind: 'module',
      sourceIds: input.course.sourceIds,
      sourceSnapshotHashes: input.sourceSnapshotHashes,
    });

    if (module.demoId) {
      units.push({
        entityId: module.demoId,
        entityType: 'demo',
        moduleId: module.moduleId,
        sourceIds: input.course.sourceIds,
        sourceSnapshotHashes: input.sourceSnapshotHashes,
      });
    }

    for (const post of module.posts) {
      units.push({
        entityId: post.postId,
        entityType: 'post',
        moduleId: module.moduleId,
        postId: post.postId,
        sourceIds: input.course.sourceIds,
        sourceSnapshotHashes: input.sourceSnapshotHashes,
      });
      units.push({
        entityId: post.postQuizId,
        entityType: 'quiz',
        moduleId: module.moduleId,
        postId: post.postId,
        quizKind: 'post',
        sourceIds: input.course.sourceIds,
        sourceSnapshotHashes: input.sourceSnapshotHashes,
      });
    }
  }

  return units;
}

export async function buildCourseTransformManifest(input: {
  courseId: string;
  outputRoot: string;
  scope?: LockedContentScope;
}): Promise<CourseTransformManifest> {
  const scope = input.scope ?? getLockedContentScope();
  const course = getCourse(scope, input.courseId);
  const sourceSnapshots = await Promise.all(
    course.sourceIds.map((sourceId) =>
      readLatestSourceSnapshot({ outputRoot: input.outputRoot, sourceId }),
    ),
  );
  const sourceSnapshotHashes = Object.fromEntries(
    sourceSnapshots.map((snapshot) => [snapshot.sourceId, snapshot.contentSnapshotHash]),
  );
  const units = createTransformUnits({ course, sourceSnapshotHashes });
  const manifestPath = join(
    input.outputRoot,
    'courses',
    course.courseId,
    'transform-manifest.json',
  );
  const manifestHash = createSha256(
    JSON.stringify({
      courseId: course.courseId,
      sourceSnapshots: sourceSnapshots.map((snapshot) => ({
        contentSnapshotHash: snapshot.contentSnapshotHash,
        sanitizedTextHash: snapshot.sanitizedTextHash,
        sourceId: snapshot.sourceId,
      })),
      units,
    }),
  );
  const manifest: CourseTransformManifest = {
    courseId: course.courseId,
    manifestHash,
    manifestPath,
    reviewStatus: 'pending-operator-review',
    schemaVersion: 1,
    sourceSnapshots,
    units,
  };

  return manifest;
}

export async function createCourseTransformManifest(input: {
  courseId: string;
  outputRoot: string;
  scope?: LockedContentScope;
}): Promise<CourseTransformResult> {
  const manifest = await buildCourseTransformManifest(input);

  await mkdir(dirname(manifest.manifestPath), { recursive: true });
  await writeFile(manifest.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { manifest, manifestPath: manifest.manifestPath };
}
