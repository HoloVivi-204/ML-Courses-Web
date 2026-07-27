import { describe, expect, it } from 'vitest';

import {
  createReleaseContentDraftManifest,
  diffReleaseContentDrafts,
  importReleaseContentDrafts,
  type DraftContentDocumentStore,
} from './content-draft-import.js';

function createMemoryDocumentStore(): DraftContentDocumentStore {
  const documents = new Map<string, Readonly<Record<string, unknown>>>();

  return {
    async get(path) {
      return documents.get(path) ?? null;
    },
    async set(path, value) {
      documents.set(path, value);
    },
  };
}

describe('Release 1 content draft importer', () => {
  it('derives the exact locked baseline from the skeleton with pending evidence only', () => {
    const manifest = createReleaseContentDraftManifest();

    expect(manifest.counts).toEqual({
      courses: 2,
      demos: 10,
      moduleQuizQuestions: 72,
      modules: 12,
      postQuizQuestions: 54,
      posts: 18,
      quizQuestions: 126,
    });
    expect(manifest.documents.filter((document) => document.entityType === 'course')).toHaveLength(
      2,
    );
    expect(manifest.documents.filter((document) => document.entityType === 'module')).toHaveLength(
      12,
    );
    expect(manifest.documents.filter((document) => document.entityType === 'post')).toHaveLength(
      18,
    );
    expect(manifest.documents.filter((document) => document.entityType === 'demo')).toHaveLength(
      10,
    );
    expect(manifest.documents.filter((document) => document.entityType === 'quiz')).toHaveLength(
      30,
    );

    for (const document of manifest.documents) {
      expect(document.provenance).toEqual({
        candidateSourceIds: expect.any(Array),
        contentReviewStatus: 'pending-operator-review',
        externalEvidenceStatus: 'not-collected',
        importStatus: 'draft-only',
      });
      expect(document.provenance.candidateSourceIds.length).toBeGreaterThan(0);
      expect(document.publishedRevisionId).toBeUndefined();
    }

    const postDocuments = manifest.documents.filter((document) => document.entityType === 'post');
    expect(new Set(postDocuments.flatMap((document) => document.activityIds ?? [])).size).toBe(72);
  });

  it('dry-runs and upserts draft documents idempotently without a published revision field', async () => {
    const store = createMemoryDocumentStore();

    const initialDiff = await diffReleaseContentDrafts({ store });
    expect(initialDiff).toHaveLength(72);
    expect(initialDiff.every((change) => change.status === 'create')).toBe(true);

    const dryRun = await importReleaseContentDrafts({ dryRun: true, store });
    expect(dryRun).toMatchObject({ created: 72, dryRun: true, unchanged: 0, updated: 0 });

    const firstImport = await importReleaseContentDrafts({ dryRun: false, store });
    expect(firstImport).toMatchObject({ created: 72, dryRun: false, unchanged: 0, updated: 0 });

    const secondImport = await importReleaseContentDrafts({ dryRun: false, store });
    expect(secondImport).toMatchObject({ created: 0, dryRun: false, unchanged: 72, updated: 0 });
  });
});
