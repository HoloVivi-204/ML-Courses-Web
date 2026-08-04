import { readFile } from 'node:fs/promises';

import type { LockedContentScope } from './content-scope-validator.js';
import { buildCourseTransformManifest } from './content-transform.js';

export interface ContentSourcePreflightResult {
  courseId: string;
  readyForAuthoring: true;
  sourceCount: number;
  unitCount: number;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStoredManifestHash(rawManifest: string, courseId: string): string {
  let value: unknown;

  try {
    value = JSON.parse(rawManifest);
  } catch {
    throw new Error(`Course ${courseId} has an invalid transform manifest.`);
  }

  if (
    !isRecord(value) ||
    value.courseId !== courseId ||
    value.schemaVersion !== 1 ||
    value.reviewStatus !== 'pending-operator-review' ||
    typeof value.manifestHash !== 'string'
  ) {
    throw new Error(`Course ${courseId} has an invalid transform manifest.`);
  }

  return value.manifestHash;
}

export async function validatePreparedCourseSourcePipeline(input: {
  courseId: string;
  outputRoot: string;
  scope?: LockedContentScope;
}): Promise<ContentSourcePreflightResult> {
  const expectedManifest = await buildCourseTransformManifest(input);
  let storedManifest: string;

  try {
    storedManifest = await readFile(expectedManifest.manifestPath, 'utf8');
  } catch {
    throw new Error(
      `Course ${input.courseId} has no transform manifest. Run content:transform first.`,
    );
  }

  if (parseStoredManifestHash(storedManifest, input.courseId) !== expectedManifest.manifestHash) {
    throw new Error(`Course ${input.courseId} transform manifest is stale or has been modified.`);
  }

  return {
    courseId: input.courseId,
    readyForAuthoring: true,
    sourceCount: expectedManifest.sourceSnapshots.length,
    unitCount: expectedManifest.units.length,
  };
}
