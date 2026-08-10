import { createHash } from 'node:crypto';

import { ApiError } from './api-error.js';
import type { AdminContentDraft } from './admin-content-repository.js';

export const requiredAdminContentEvidenceKinds = [
  'license',
  'provenance',
  'content-review',
  'gvhd-confirmation',
] as const;

export type AdminContentEvidenceKind = (typeof requiredAdminContentEvidenceKinds)[number];

export function isAdminContentEvidenceKind(value: string): value is AdminContentEvidenceKind {
  return (requiredAdminContentEvidenceKinds as readonly string[]).includes(value);
}

export interface AdminContentExternalEvidence {
  artifactId: string;
  checksum: string;
  evidenceRef: string;
  kind: AdminContentEvidenceKind;
  result: 'approved' | 'pending' | 'rejected';
  reviewedAt?: string | undefined;
  reviewedBy?: string | undefined;
}

export function createAdminContentDraftChecksum(draft: AdminContentDraft): string {
  const contentProjection = {
    baseRevisionId: draft.baseRevisionId,
    courseId: draft.courseId,
    draftRevisionId: draft.draftRevisionId,
    entityId: draft.entityId,
    entityType: draft.entityType,
    localeAvailability: [...draft.localeAvailability].sort(),
    metadata: {
      attribution: { en: draft.metadata.attribution.en, vi: draft.metadata.attribution.vi },
      externalLinkUrl: draft.metadata.externalLinkUrl,
    },
    moduleId: draft.moduleId ?? null,
    postId: draft.postId ?? null,
    preview: { en: draft.preview.en, vi: draft.preview.vi },
    sourceReview: {
      attribution: {
        en: draft.sourceReview.attribution.en,
        vi: draft.sourceReview.attribution.vi,
      },
      license: {
        name: draft.sourceReview.license.name,
        url: draft.sourceReview.license.url,
      },
      sourceId: draft.sourceReview.sourceId,
      title: draft.sourceReview.title,
    },
    sourceStatus: draft.sourceStatus,
    title: { en: draft.title.en, vi: draft.title.vi },
    validationManifest: draft.validationManifest
      ? {
          blockCount: draft.validationManifest.blockCount ?? null,
          problemId: draft.validationManifest.problemId ?? null,
          questionCount: draft.validationManifest.questionCount ?? null,
          taskFingerprints: draft.validationManifest.taskFingerprints
            ? [...draft.validationManifest.taskFingerprints]
            : [],
        }
      : null,
  };

  return createHash('sha256').update(JSON.stringify(contentProjection)).digest('hex');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isApprovedEvidence(
  value: AdminContentExternalEvidence | undefined,
  input: { artifactId: string; checksum: string },
): boolean {
  if (!value) {
    return false;
  }

  return (
    value.artifactId === input.artifactId &&
    value.checksum === input.checksum &&
    value.result === 'approved' &&
    isNonEmptyString(value.evidenceRef) &&
    isNonEmptyString(value.reviewedBy) &&
    isNonEmptyString(value.reviewedAt) &&
    !Number.isNaN(Date.parse(value.reviewedAt))
  );
}

export function assertPublishEvidenceIsComplete(input: {
  artifactId: string;
  contentChecksum: string;
  evidence: readonly AdminContentExternalEvidence[];
}): void {
  const evidenceByKind = new Map(input.evidence.map((evidence) => [evidence.kind, evidence]));
  const hasAllRequiredEvidence = requiredAdminContentEvidenceKinds.every((kind) =>
    isApprovedEvidence(evidenceByKind.get(kind), {
      artifactId: input.artifactId,
      checksum: input.contentChecksum,
    }),
  );

  if (!hasAllRequiredEvidence) {
    throw new ApiError(
      422,
      'ADMIN_CONTENT_EXTERNAL_EVIDENCE_REQUIRED',
      'External evidence is required before publish.',
    );
  }
}
