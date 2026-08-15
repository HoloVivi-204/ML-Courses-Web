import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';

import {
  createDraftFromPublished,
  createPublishedContentFromDraft,
  type AdminContentSummary,
} from './admin-content-repository.js';
import {
  createAdminContentDraftChecksum,
  createLegacyAdminContentDraftChecksum,
  requiredAdminContentEvidenceKinds,
} from './admin-content-evidence.js';
import { createReleaseOneFirestoreAdminContentSeed } from './admin-content-emulator-seed.js';
import {
  serializeStoredAdminContentDraftRevisionV1,
  serializeStoredAdminContentDraftRevisionV2,
  serializeStoredAdminContentPublishedRevisionV1,
  serializeStoredAdminContentPublishedRevisionV2,
} from './admin-content-revision-storage.js';
import {
  createFirestoreAdminContentRepository,
  seedFirestoreAdminContentForEmulator,
} from './firestore-admin-content-repository.js';

const contentFixture: AdminContentSummary = {
  courseId: 'course-deep-learning-basic',
  draftRevisionId: null,
  emergencyBlocked: false,
  entityId: 'dl-p01-neuron-perceptron',
  entityType: 'post',
  localeAvailability: ['en', 'vi'],
  moduleId: 'dl-m01-neuron-perceptron',
  preview: { en: 'Preview', vi: 'Tom tat' },
  publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
  sourceReview: {
    attribution: { en: 'Source', vi: 'Nguon' },
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    sourceId: 'source-google-ml-crash-course',
    title: 'Google Machine Learning Crash Course',
  },
  sourceStatus: 'seeded',
  status: 'published',
  title: { en: 'Neuron', vi: 'Neuron' },
  validationStatus: 'not-run',
};

type FakeDocumentValue = object;

interface FakeDocumentReference {
  readonly kind: 'document';
  readonly path: string;
  collection(name: string): FakeCollectionReference;
  get(): Promise<FakeDocumentSnapshot>;
}

interface FakeCollectionReference {
  readonly kind: 'collection';
  readonly path: string;
  doc(id?: string): FakeDocumentReference;
  get(): Promise<FakeQuerySnapshot>;
}

interface FakeDocumentSnapshot {
  data(): FakeDocumentValue | undefined;
  readonly exists: boolean;
  readonly ref: FakeDocumentReference;
}

interface FakeQuerySnapshot {
  readonly docs: readonly FakeDocumentSnapshot[];
  readonly empty: boolean;
  readonly size: number;
}

interface FakeWrite {
  readonly operation: 'create' | 'delete' | 'set' | 'update';
  readonly path: string;
  readonly value?: unknown;
}

function createFirestoreHarness(initialDocuments: Record<string, FakeDocumentValue>) {
  const documents = new Map(Object.entries(initialDocuments));
  const writes: FakeWrite[] = [];
  let generatedId = 0;

  function createSnapshot(reference: FakeDocumentReference): FakeDocumentSnapshot {
    return {
      data: () => documents.get(reference.path),
      exists: documents.has(reference.path),
      ref: reference,
    };
  }

  function createQuerySnapshot(collectionPath: string): FakeQuerySnapshot {
    const prefix = `${collectionPath}/`;
    const snapshots = [...documents.keys()]
      .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .map((path) => createDocumentReference(path))
      .map(createSnapshot);

    return {
      docs: snapshots,
      empty: snapshots.length === 0,
      size: snapshots.length,
    };
  }

  function createDocumentReference(path: string): FakeDocumentReference {
    return {
      kind: 'document',
      path,
      collection: (name) => createCollectionReference(`${path}/${name}`),
      get: async () => createSnapshot(createDocumentReference(path)),
    };
  }

  function createCollectionReference(path: string): FakeCollectionReference {
    return {
      kind: 'collection',
      path,
      doc: (id = `generated-${++generatedId}`) => createDocumentReference(`${path}/${id}`),
      get: async () => createQuerySnapshot(path),
    };
  }

  const firestore = {
    collection: (name: string) => createCollectionReference(name),
    doc: (path: string) => createDocumentReference(path),
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
      const pendingWrites: FakeWrite[] = [];
      const transaction = {
        create(reference: FakeDocumentReference, value: unknown) {
          pendingWrites.push({ operation: 'create', path: reference.path, value });
        },
        delete(reference: FakeDocumentReference) {
          pendingWrites.push({ operation: 'delete', path: reference.path });
        },
        async get(reference: FakeDocumentReference | FakeCollectionReference) {
          return reference.kind === 'document'
            ? createSnapshot(reference)
            : createQuerySnapshot(reference.path);
        },
        set(reference: FakeDocumentReference, value: unknown) {
          pendingWrites.push({ operation: 'set', path: reference.path, value });
        },
        update(reference: FakeDocumentReference, value: unknown) {
          pendingWrites.push({ operation: 'update', path: reference.path, value });
        },
      };
      const result = await callback(transaction);
      const nextDocuments = new Map(documents);

      for (const write of pendingWrites) {
        if (write.operation === 'delete') {
          nextDocuments.delete(write.path);
          continue;
        }

        if (write.operation === 'create' && nextDocuments.has(write.path)) {
          throw new Error(`Document ${write.path} already exists.`);
        }

        const value = write.value as FakeDocumentValue;
        nextDocuments.set(
          write.path,
          write.operation === 'update' ? { ...nextDocuments.get(write.path), ...value } : value,
        );
      }

      documents.clear();
      for (const [path, value] of nextDocuments) {
        documents.set(path, value);
      }
      writes.push(...pendingWrites);
      return result;
    },
  };

  return {
    firestore: firestore as unknown as Firestore,
    deleteDocument: (path: string) => documents.delete(path),
    getDocument: (path: string) => documents.get(path),
    writes,
  };
}

function createFirestoreForPersistedList(): Firestore {
  const entityCollection = {
    async get() {
      return {
        docs: [
          {
            data: () => ({
              currentContent: contentFixture,
              draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
              entityId: contentFixture.entityId,
              entityType: contentFixture.entityType,
              schemaVersion: 1,
              updatedAt: '2026-07-27T00:00:00.000Z',
            }),
            exists: true,
          },
        ],
      };
    },
  };
  const emptyCollection = {};

  return {
    collection(name: string) {
      return name === 'adminContentEntities' ? entityCollection : emptyCollection;
    },
  } as unknown as Firestore;
}

function createFirestoreForPersistedEvidenceList(): Firestore {
  const draft = createDraftFromPublished(contentFixture);
  const contentChecksum = createAdminContentDraftChecksum(draft);
  const draftSnapshot = {
    data: () =>
      serializeStoredAdminContentDraftRevisionV2({
        contentChecksum,
        createdAt: '2026-08-12T00:00:00.000Z',
        draft,
        entityKey: 'post:dl-p01-neuron-perceptron',
        learnerContent: null,
        updatedAt: '2026-08-12T00:00:00.000Z',
      }),
    exists: true,
  };
  const evidenceCollection = {
    async get() {
      return {
        docs: [
          {
            data: () => ({
              artifactId: 'dl-p01-neuron-perceptron',
              checksum: contentChecksum,
              evidenceRef: 'evidence://license-review',
              kind: 'license',
              result: 'pending',
              schemaVersion: 1,
            }),
          },
        ],
      };
    },
  };
  const revisionCollection = {
    doc() {
      return {
        collection: () => evidenceCollection,
        get: async () => draftSnapshot,
      };
    },
  };

  return {
    collection(name: string) {
      return name === 'adminContentRevisions' ? revisionCollection : {};
    },
  } as unknown as Firestore;
}

function createFirestoreForPersistedQuizPreview(): Firestore {
  const seededQuiz = createReleaseOneFirestoreAdminContentSeed().find(
    (record) =>
      record.content.entityType === 'quiz' && record.content.entityId === 'quiz-post-dl-p01',
  );

  if (!seededQuiz?.learnerContent) {
    throw new Error('Expected the seeded quiz learner content.');
  }

  const draft = {
    ...createDraftFromPublished(seededQuiz.content),
    preview: {
      en: 'Draft quiz description',
      vi: 'Mo ta quiz draft',
    },
    title: {
      en: 'Draft quiz title',
      vi: 'Tieu de quiz draft',
    },
  };
  const draftSnapshot = {
    data: () => ({
      contentChecksum: 'c'.repeat(64),
      createdAt: '2026-08-10T00:00:00.000Z',
      draft,
      entityKey: `quiz:${draft.entityId}`,
      learnerContent: seededQuiz.learnerContent,
      schemaVersion: 1,
      state: 'draft',
      updatedAt: '2026-08-10T00:00:00.000Z',
    }),
    exists: true,
  };
  const revisionCollection = {
    doc(revisionId: string) {
      if (revisionId !== draft.draftRevisionId) {
        throw new Error(`Unexpected draft revision ${revisionId}.`);
      }

      return {
        get: async () => draftSnapshot,
      };
    },
  };

  return {
    collection(name: string) {
      return name === 'adminContentRevisions' ? revisionCollection : {};
    },
  } as unknown as Firestore;
}

describe('Firestore Admin content repository', () => {
  it('omits an absent validation manifest before course revisions are serialized to Firestore', () => {
    const course = createReleaseOneFirestoreAdminContentSeed().find(
      (record) => record.content.entityType === 'course',
    );

    if (!course) {
      throw new Error('Expected a seeded course.');
    }

    const draft = createDraftFromPublished(course.content);
    const published = createPublishedContentFromDraft({
      draft,
      previousPublishedRevisionId: course.content.publishedRevisionId,
    });

    expect(draft).not.toHaveProperty('validationManifest');
    expect(published).not.toHaveProperty('validationManifest');
  });

  it('creates a new draft with persisted checksum schema v2', async () => {
    const entityKey = `${contentFixture.entityType}:${contentFixture.entityId}`;
    const now = '2026-08-12T00:00:00.000Z';
    const harness = createFirestoreHarness({
      [`adminContentEntities/${entityKey}`]: {
        currentContent: contentFixture,
        draftRevisionId: null,
        entityId: contentFixture.entityId,
        entityType: contentFixture.entityType,
        schemaVersion: 1,
        updatedAt: now,
      },
      [`adminContentRevisions/${contentFixture.publishedRevisionId}`]:
        serializeStoredAdminContentPublishedRevisionV1({
          contentChecksum: 'a'.repeat(64),
          createdAt: now,
          entityKey,
          learnerContent: null,
          publishedAt: now,
          publishedContent: contentFixture,
        }),
    });
    const repository = createFirestoreAdminContentRepository({
      firestore: harness.firestore,
      now: () => new Date(now),
    });

    const result = await repository.createDraft({
      createdByUid: 'admin-01',
      entityId: contentFixture.entityId,
      entityType: contentFixture.entityType,
    });
    const storedDraft = harness.getDocument(
      `adminContentRevisions/${result.data.draft.draftRevisionId}`,
    );

    expect(storedDraft).toMatchObject({
      contentChecksum: createAdminContentDraftChecksum(result.data.draft),
      contentChecksumVersion: 2,
      schemaVersion: 2,
      state: 'draft',
    });
  });

  it('creates a draft from a published v2 revision without leaking stored evidence metadata', async () => {
    const entityKey = `${contentFixture.entityType}:${contentFixture.entityId}`;
    const now = '2026-08-12T00:00:00.000Z';
    const harness = createFirestoreHarness({
      [`adminContentEntities/${entityKey}`]: {
        currentContent: contentFixture,
        draftRevisionId: null,
        entityId: contentFixture.entityId,
        entityType: contentFixture.entityType,
        schemaVersion: 1,
        updatedAt: now,
      },
      [`adminContentRevisions/${contentFixture.publishedRevisionId}`]:
        serializeStoredAdminContentPublishedRevisionV2({
          createdAt: now,
          entityKey,
          learnerContent: null,
          publishedAt: now,
          publishedContent: contentFixture,
          sourceDraftEvidenceChecksum: 'b'.repeat(64),
        }),
    });
    const repository = createFirestoreAdminContentRepository({ firestore: harness.firestore });

    const result = await repository.createDraft({
      createdByUid: 'admin-01',
      entityId: contentFixture.entityId,
      entityType: contentFixture.entityType,
    });

    expect(result.data.draft.baseRevisionId).toBe(contentFixture.publishedRevisionId);
    expect(result.data.draft).not.toHaveProperty('sourceDraftEvidenceChecksum');
    expect(
      harness.getDocument(`adminContentRevisions/${result.data.draft.draftRevisionId}`),
    ).toMatchObject({ schemaVersion: 2, state: 'draft' });
  });

  it('verifies legacy H1 before atomically upgrading a PATCH to draft v2', async () => {
    const classicalCourse = createReleaseOneFirestoreAdminContentSeed().find(
      (record) => record.content.entityId === 'course-classical-ml',
    );

    if (!classicalCourse) {
      throw new Error('Expected the classical ML course fixture.');
    }

    const legacyDraft = createDraftFromPublished(classicalCourse.content);
    const entityKey = `${legacyDraft.entityType}:${legacyDraft.entityId}`;
    const now = '2026-08-12T00:00:00.000Z';
    const legacyStoredDraft = serializeStoredAdminContentDraftRevisionV1({
      contentChecksum: createLegacyAdminContentDraftChecksum(legacyDraft),
      createdAt: now,
      draft: legacyDraft,
      entityKey,
      learnerContent: null,
      updatedAt: now,
    });
    const revisionPath = `adminContentRevisions/${legacyDraft.draftRevisionId}`;
    const validHarness = createFirestoreHarness({ [revisionPath]: legacyStoredDraft });
    const validRepository = createFirestoreAdminContentRepository({
      createAuditDocumentId: () => 'audit-legacy-upgrade',
      firestore: validHarness.firestore,
      now: () => new Date('2026-08-12T01:00:00.000Z'),
    });

    const result = await validRepository.updateDraft({
      actorUid: 'admin-01',
      patch: { trialPostId: 'cml-p02-linear-regression' },
      requestId: 'request-legacy-upgrade',
      revisionId: legacyDraft.draftRevisionId,
      revisionVersion: 1,
    });
    const upgradedDraft = validHarness.getDocument(revisionPath);

    expect(result.data.draft.revisionVersion).toBe(2);
    expect(upgradedDraft).toMatchObject({
      contentChecksum: createAdminContentDraftChecksum(result.data.draft),
      contentChecksumVersion: 2,
      draft: result.data.draft,
      schemaVersion: 2,
      state: 'draft',
    });
    expect(validHarness.getDocument('auditLogs/audit-legacy-upgrade')).toEqual({
      schemaVersion: 1,
      actorId: 'admin-01',
      action: 'admin-content-draft.updated',
      target: {
        entityType: 'course',
        entityId: 'course-classical-ml',
        revisionId: legacyDraft.draftRevisionId,
      },
      createdAt: '2026-08-12T01:00:00.000Z',
      requestId: 'request-legacy-upgrade',
      diff: {
        revisionVersion: { before: 1, after: 2 },
        changedFields: ['trialPostId', 'contentChecksumVersion'],
        trialPostId: {
          before: 'cml-p01-problem-data-types',
          after: 'cml-p02-linear-regression',
        },
        contentChecksumVersion: { before: 1, after: 2 },
      },
    });
    expect(validHarness.writes).toEqual([
      expect.objectContaining({ operation: 'set', path: revisionPath }),
      expect.objectContaining({
        operation: 'create',
        path: 'auditLogs/audit-legacy-upgrade',
      }),
    ]);

    const corruptHarness = createFirestoreHarness({
      [revisionPath]: { ...legacyStoredDraft, contentChecksum: '0'.repeat(64) },
    });
    const corruptRepository = createFirestoreAdminContentRepository({
      firestore: corruptHarness.firestore,
    });

    await expect(
      corruptRepository.updateDraft({
        actorUid: 'admin-01',
        patch: { trialPostId: 'cml-p02-linear-regression' },
        requestId: 'request-corrupt-legacy',
        revisionId: legacyDraft.draftRevisionId,
        revisionVersion: 1,
      }),
    ).rejects.toMatchObject({
      code: 'ADMIN_CONTENT_DATA_INTEGRITY_ERROR',
      statusCode: 500,
    });
    expect(corruptHarness.writes).toHaveLength(0);
    expect(corruptHarness.getDocument(revisionPath)).toEqual({
      ...legacyStoredDraft,
      contentChecksum: '0'.repeat(64),
    });
  });

  it('rolls back revision and audit on create collision, then commits one same-version retry', async () => {
    const classicalCourse = createReleaseOneFirestoreAdminContentSeed().find(
      (record) => record.content.entityId === 'course-classical-ml',
    );

    if (!classicalCourse) {
      throw new Error('Expected the classical ML course fixture.');
    }

    const legacyDraft = createDraftFromPublished(classicalCourse.content);
    const revisionPath = `adminContentRevisions/${legacyDraft.draftRevisionId}`;
    const legacyStoredDraft = serializeStoredAdminContentDraftRevisionV1({
      contentChecksum: createLegacyAdminContentDraftChecksum(legacyDraft),
      createdAt: '2026-08-12T00:00:00.000Z',
      draft: legacyDraft,
      entityKey: `${legacyDraft.entityType}:${legacyDraft.entityId}`,
      learnerContent: null,
      updatedAt: '2026-08-12T00:00:00.000Z',
    });
    const harness = createFirestoreHarness({
      [revisionPath]: legacyStoredDraft,
      'auditLogs/audit-collision': { immutableExistingAudit: true },
    });
    const repository = createFirestoreAdminContentRepository({
      createAuditDocumentId: () => 'audit-collision',
      firestore: harness.firestore,
      now: () => new Date('2026-08-12T02:00:00.000Z'),
    });
    const updateInput = {
      actorUid: 'admin-01',
      patch: {
        title: {
          en: 'RAW_FIRESTORE_TITLE_SENTINEL_EN',
          vi: 'RAW_FIRESTORE_TITLE_SENTINEL_VI',
        },
        trialPostId: 'cml-p02-linear-regression',
      },
      requestId: 'request-audit-collision',
      revisionId: legacyDraft.draftRevisionId,
      revisionVersion: 1,
    };

    await expect(repository.updateDraft(updateInput)).rejects.toThrow(
      'Document auditLogs/audit-collision already exists.',
    );
    expect(harness.getDocument(revisionPath)).toEqual(legacyStoredDraft);
    expect(harness.writes).toHaveLength(0);

    harness.deleteDocument('auditLogs/audit-collision');
    const retried = await repository.updateDraft(updateInput);
    const auditRecord = harness.getDocument('auditLogs/audit-collision');

    expect(retried.data.draft.revisionVersion).toBe(2);
    expect(harness.getDocument(revisionPath)).toMatchObject({
      contentChecksumVersion: 2,
      draft: retried.data.draft,
      schemaVersion: 2,
    });
    expect(auditRecord).toMatchObject({
      requestId: 'request-audit-collision',
      diff: {
        revisionVersion: { before: 1, after: 2 },
        changedFields: ['title', 'trialPostId', 'contentChecksumVersion'],
        contentChecksumVersion: { before: 1, after: 2 },
      },
    });
    expect(JSON.stringify(auditRecord)).not.toContain('RAW_FIRESTORE_TITLE_SENTINEL');
    expect(harness.writes).toEqual([
      expect.objectContaining({ operation: 'set', path: revisionPath }),
      expect.objectContaining({ operation: 'create', path: 'auditLogs/audit-collision' }),
    ]);
  });

  it('fences every evidence and publish operation on a draft v1 until Save upgrades it', async () => {
    const legacyDraft = createDraftFromPublished(contentFixture);
    const now = '2026-08-12T00:00:00.000Z';
    const revisionPath = `adminContentRevisions/${legacyDraft.draftRevisionId}`;
    const storedDraft = serializeStoredAdminContentDraftRevisionV1({
      contentChecksum: createLegacyAdminContentDraftChecksum(legacyDraft),
      createdAt: now,
      draft: legacyDraft,
      entityKey: `${legacyDraft.entityType}:${legacyDraft.entityId}`,
      learnerContent: null,
      updatedAt: now,
    });
    const attempts = [
      (repository: ReturnType<typeof createFirestoreAdminContentRepository>) =>
        repository.validateDraft({ actorUid: 'admin-01', revisionId: legacyDraft.draftRevisionId }),
      (repository: ReturnType<typeof createFirestoreAdminContentRepository>) =>
        repository.listEvidence({ revisionId: legacyDraft.draftRevisionId }),
      (repository: ReturnType<typeof createFirestoreAdminContentRepository>) =>
        repository.attachEvidence({
          actorUid: 'admin-01',
          checksum: storedDraft.contentChecksum,
          evidenceRef: 'evidence://license-review',
          kind: 'license',
          requestId: 'request-attach-v1',
          revisionId: legacyDraft.draftRevisionId,
        }),
      (repository: ReturnType<typeof createFirestoreAdminContentRepository>) =>
        repository.publishRevision({
          actorUid: 'admin-01',
          idempotencyKey: 'publish-v1',
          reason: 'V1 drafts must be upgraded before publish.',
          requestId: 'request-publish-v1',
          revisionId: legacyDraft.draftRevisionId,
        }),
    ];

    for (const attempt of attempts) {
      const harness = createFirestoreHarness({ [revisionPath]: storedDraft });
      const repository = createFirestoreAdminContentRepository({ firestore: harness.firestore });

      await expect(attempt(repository)).rejects.toMatchObject({
        code: 'ADMIN_CONTENT_DRAFT_CHECKSUM_UPGRADE_REQUIRED',
        statusCode: 409,
      });
      expect(harness.writes).toHaveLength(0);
    }
  });

  it('publishes draft v2 with immutable source evidence metadata only', async () => {
    const now = '2026-08-12T02:00:00.000Z';
    const draft = {
      ...createDraftFromPublished(contentFixture),
      validationStatus: 'valid' as const,
    };
    const entityKey = `${draft.entityType}:${draft.entityId}`;
    const checksum = createAdminContentDraftChecksum(draft);
    const revisionPath = `adminContentRevisions/${draft.draftRevisionId}`;
    const initialDocuments: Record<string, FakeDocumentValue> = {
      [`adminContentEntities/${entityKey}`]: {
        currentContent: contentFixture,
        draftRevisionId: draft.draftRevisionId,
        entityId: draft.entityId,
        entityType: draft.entityType,
        schemaVersion: 1,
        updatedAt: now,
      },
      [revisionPath]: serializeStoredAdminContentDraftRevisionV2({
        contentChecksum: checksum,
        createdAt: '2026-08-12T01:00:00.000Z',
        draft,
        entityKey,
        learnerContent: null,
        updatedAt: '2026-08-12T01:00:00.000Z',
      }),
    };

    for (const kind of requiredAdminContentEvidenceKinds) {
      initialDocuments[`${revisionPath}/externalEvidence/${kind}`] = {
        artifactId: draft.entityId,
        checksum,
        evidenceRef: `evidence://${kind}`,
        kind,
        result: 'approved',
        reviewedAt: '2026-08-12T01:30:00.000Z',
        reviewedBy: 'operator-01',
        schemaVersion: 1,
      };
    }

    const harness = createFirestoreHarness(initialDocuments);
    const repository = createFirestoreAdminContentRepository({
      firestore: harness.firestore,
      now: () => new Date(now),
    });

    const result = await repository.publishRevision({
      actorUid: 'admin-01',
      idempotencyKey: 'publish-v2',
      reason: 'Publish a validated evidence-bound draft.',
      requestId: 'request-publish-v2',
      revisionId: draft.draftRevisionId,
    });
    const storedPublished = harness.getDocument(revisionPath);

    expect(storedPublished).toEqual({
      createdAt: '2026-08-12T01:00:00.000Z',
      entityKey,
      learnerContent: null,
      publishedAt: now,
      publishedContent: result.data.content,
      schemaVersion: 2,
      sourceDraftEvidenceChecksum: checksum,
      sourceDraftEvidenceChecksumVersion: 2,
      state: 'published',
    });
    expect(storedPublished).not.toHaveProperty('contentChecksum');
    expect(storedPublished).not.toHaveProperty('contentChecksumVersion');
    expect(result.data.content).not.toHaveProperty('sourceDraftEvidenceChecksum');
  });

  it('rejects a tampered draft v2 before reading evidence or writing publish state', async () => {
    const draft = {
      ...createDraftFromPublished(contentFixture),
      validationStatus: 'valid' as const,
    };
    const revisionPath = `adminContentRevisions/${draft.draftRevisionId}`;
    const storedDraft = serializeStoredAdminContentDraftRevisionV2({
      contentChecksum: createAdminContentDraftChecksum(draft),
      createdAt: '2026-08-12T00:00:00.000Z',
      draft: { ...draft, title: { ...draft.title, en: 'Tampered after checksum' } },
      entityKey: `${draft.entityType}:${draft.entityId}`,
      learnerContent: null,
      updatedAt: '2026-08-12T00:00:00.000Z',
    });
    const harness = createFirestoreHarness({ [revisionPath]: storedDraft });
    const verifyPublishEvidence = vi.fn();
    const repository = createFirestoreAdminContentRepository({
      firestore: harness.firestore,
      verifyPublishEvidence,
    });

    await expect(
      repository.publishRevision({
        actorUid: 'admin-01',
        idempotencyKey: 'tampered-v2',
        reason: 'Tampered content must fail closed.',
        requestId: 'request-tampered-v2',
        revisionId: draft.draftRevisionId,
      }),
    ).rejects.toMatchObject({
      code: 'ADMIN_CONTENT_DATA_INTEGRITY_ERROR',
      statusCode: 500,
    });
    expect(verifyPublishEvidence).not.toHaveBeenCalled();
    expect(harness.writes).toHaveLength(0);
  });

  it('does not accept legacy H1 evidence after a draft is upgraded to H2', async () => {
    const now = '2026-08-12T03:00:00.000Z';
    const draft = {
      ...createDraftFromPublished(contentFixture),
      title: { ...contentFixture.title, en: 'Updated evidence identity' },
      validationStatus: 'valid' as const,
    };
    const entityKey = `${draft.entityType}:${draft.entityId}`;
    const revisionPath = `adminContentRevisions/${draft.draftRevisionId}`;
    const legacyChecksum = createLegacyAdminContentDraftChecksum(draft);
    const currentChecksum = createAdminContentDraftChecksum(draft);
    const initialDocuments: Record<string, FakeDocumentValue> = {
      [`adminContentEntities/${entityKey}`]: {
        currentContent: contentFixture,
        draftRevisionId: draft.draftRevisionId,
        entityId: draft.entityId,
        entityType: draft.entityType,
        schemaVersion: 1,
        updatedAt: now,
      },
      [revisionPath]: serializeStoredAdminContentDraftRevisionV2({
        contentChecksum: currentChecksum,
        createdAt: now,
        draft,
        entityKey,
        learnerContent: null,
        updatedAt: now,
      }),
    };

    for (const kind of requiredAdminContentEvidenceKinds) {
      initialDocuments[`${revisionPath}/externalEvidence/${kind}`] = {
        artifactId: draft.entityId,
        checksum: legacyChecksum,
        evidenceRef: `evidence://${kind}`,
        kind,
        result: 'approved',
        reviewedAt: now,
        reviewedBy: 'operator-01',
        schemaVersion: 1,
      };
    }

    const harness = createFirestoreHarness(initialDocuments);
    const repository = createFirestoreAdminContentRepository({ firestore: harness.firestore });

    expect(currentChecksum).not.toBe(legacyChecksum);
    await expect(
      repository.publishRevision({
        actorUid: 'admin-01',
        idempotencyKey: 'legacy-evidence-replay',
        reason: 'Legacy evidence cannot authorize a v2 draft.',
        requestId: 'request-legacy-evidence-replay',
        revisionId: draft.draftRevisionId,
      }),
    ).rejects.toMatchObject({
      code: 'ADMIN_CONTENT_EXTERNAL_EVIDENCE_REQUIRED',
      statusCode: 422,
    });
    expect(harness.writes).toHaveLength(0);
  });

  it('rolls back through either published storage version without changing the public model', async () => {
    const now = '2026-08-12T04:00:00.000Z';
    const entityKey = `${contentFixture.entityType}:${contentFixture.entityId}`;
    const targetContent: AdminContentSummary = {
      ...contentFixture,
      previousPublishedRevisionId: null,
      publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r0',
      title: { en: 'Earlier neuron', vi: 'Neuron truoc do' },
    };
    const commonTargetFields = {
      createdAt: '2026-08-11T00:00:00.000Z',
      entityKey,
      learnerContent: null,
      publishedAt: '2026-08-11T01:00:00.000Z',
      publishedContent: targetContent,
    };
    const targetRevisions = [
      serializeStoredAdminContentPublishedRevisionV1({
        ...commonTargetFields,
        contentChecksum: 'c'.repeat(64),
      }),
      serializeStoredAdminContentPublishedRevisionV2({
        ...commonTargetFields,
        sourceDraftEvidenceChecksum: 'd'.repeat(64),
      }),
    ];

    for (const targetRevision of targetRevisions) {
      const harness = createFirestoreHarness({
        [`adminContentEntities/${entityKey}`]: {
          currentContent: contentFixture,
          draftRevisionId: null,
          entityId: contentFixture.entityId,
          entityType: contentFixture.entityType,
          schemaVersion: 1,
          updatedAt: now,
        },
        [`adminContentRevisions/${targetContent.publishedRevisionId}`]: targetRevision,
      });
      const repository = createFirestoreAdminContentRepository({
        firestore: harness.firestore,
        now: () => new Date(now),
      });

      const result = await repository.rollbackRevision({
        actorUid: 'admin-01',
        reason: 'Restore the earlier published revision.',
        requestId: `request-rollback-v${targetRevision.schemaVersion}`,
        revisionId: targetContent.publishedRevisionId,
      });

      expect(result.data.content).toMatchObject({
        publishedRevisionId: targetContent.publishedRevisionId,
        title: targetContent.title,
      });
      expect(result.data.content).not.toHaveProperty('contentChecksum');
      expect(result.data.content).not.toHaveProperty('sourceDraftEvidenceChecksum');
    }
  });

  it('rejects an Emulator-only publication outside the Emulator before a transaction starts', async () => {
    const repository = createFirestoreAdminContentRepository({
      firestore: {
        collection: vi.fn().mockReturnValue({}),
      } as unknown as Firestore,
      isEmulator: () => false,
    });

    await expect(
      repository.publishRevision({
        actorUid: 'admin-01',
        idempotencyKey: 'emulator-demo-key',
        publicationScope: 'emulator-demo',
        reason: 'Attempt an Emulator-only publish outside the Emulator.',
        requestId: 'request-emulator-demo',
        revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      }),
    ).rejects.toMatchObject({
      code: 'ADMIN_CONTENT_EMULATOR_PUBLISH_ONLY',
      statusCode: 403,
    });
  });

  it('reads the durable draft pointer rather than a process-local repository', async () => {
    const repository = createFirestoreAdminContentRepository({
      firestore: createFirestoreForPersistedList(),
    });

    const result = await repository.listContent({ entityType: 'post' });

    expect(result.data.content).toEqual([
      {
        ...contentFixture,
        draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      },
    ]);
    expect(result.data.nextCursor).toBeNull();
  });

  it('projects durable evidence without leaking persistence-only fields', async () => {
    const repository = createFirestoreAdminContentRepository({
      firestore: createFirestoreForPersistedEvidenceList(),
    });

    const result = await repository.listEvidence({
      revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
    });

    expect(result.data).toEqual({
      contentChecksum: createAdminContentDraftChecksum(createDraftFromPublished(contentFixture)),
      evidence: [
        {
          artifactId: 'dl-p01-neuron-perceptron',
          checksum: createAdminContentDraftChecksum(createDraftFromPublished(contentFixture)),
          evidenceRef: 'evidence://license-review',
          kind: 'license',
          result: 'pending',
        },
      ],
    });
  });

  it('rebuilds a quiz learner preview from the persisted draft without answer material', async () => {
    const repository = createFirestoreAdminContentRepository({
      firestore: createFirestoreForPersistedQuizPreview(),
    });

    const result = await repository.getRevisionPreview({
      revisionId: 'draft-quiz-quiz-post-dl-p01-rev-d1',
    });

    expect(result.data.draft.title).toEqual({
      en: 'Draft quiz title',
      vi: 'Tieu de quiz draft',
    });
    expect(result.data.preview).toMatchObject({
      contentType: 'quiz',
      quiz: {
        description: { en: 'Draft quiz description', vi: 'Mo ta quiz draft' },
        revisionId: 'draft-quiz-quiz-post-dl-p01-rev-d1',
        title: { en: 'Draft quiz title', vi: 'Tieu de quiz draft' },
      },
    });

    if (result.data.preview.contentType !== 'quiz') {
      throw new Error('Expected a quiz preview.');
    }

    expect(result.data.preview.questions).not.toHaveLength(0);
    expect(result.data.preview.questions[0]).not.toHaveProperty('correctAnswer');
    expect(result.data.preview.questions[0]).not.toHaveProperty('explanation');
    expect(result.data.preview.questions[0]).not.toHaveProperty('hints');
  });

  it('rejects the Emulator seed helper outside the Emulator Suite before a write', async () => {
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', '');

    await expect(
      seedFirestoreAdminContentForEmulator({
        content: [],
        firestore: {} as Firestore,
      }),
    ).rejects.toThrow('Firestore Admin content seed is restricted to the Emulator Suite.');

    vi.unstubAllEnvs();
  });
});
