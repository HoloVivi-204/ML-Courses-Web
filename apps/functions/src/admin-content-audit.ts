import type {
  AdminContentDraft,
  AdminContentEntityType,
  AdminContentValidationStatus,
  LocalizedText,
} from './admin-content-repository.js';

export const adminContentDraftUpdatedAction = 'admin-content-draft.updated' as const;

export type AdminContentDraftAuditChangedField =
  | 'title'
  | 'preview'
  | 'metadata.attribution'
  | 'metadata.externalLinkUrl'
  | 'trialPostId'
  | 'validationStatus'
  | 'contentChecksumVersion';

export interface AdminContentDraftUpdateAuditRecord {
  schemaVersion: 1;
  actorId: string;
  action: typeof adminContentDraftUpdatedAction;
  target: {
    entityType: AdminContentEntityType;
    entityId: string;
    revisionId: string;
  };
  createdAt: string;
  requestId: string;
  diff: {
    revisionVersion: { before: number; after: number };
    changedFields: readonly AdminContentDraftAuditChangedField[];
    trialPostId?: { before: string | null; after: string | null } | undefined;
    validationStatus?:
      { before: AdminContentValidationStatus; after: AdminContentValidationStatus } | undefined;
    contentChecksumVersion?: { before: 1; after: 2 } | undefined;
  };
}

export interface CreateAdminContentDraftUpdateAuditRecordInput {
  actorId: string;
  after: AdminContentDraft;
  before: AdminContentDraft;
  contentChecksumVersionBefore: 1 | 2;
  createdAt: string;
  requestId: string;
}

function isLocalizedTextEqual(left: LocalizedText, right: LocalizedText): boolean {
  return left.en === right.en && left.vi === right.vi;
}

export function createAdminContentDraftUpdateAuditRecord(
  input: CreateAdminContentDraftUpdateAuditRecordInput,
): AdminContentDraftUpdateAuditRecord {
  const changedFields: AdminContentDraftAuditChangedField[] = [];
  const beforeTrialPostId = input.before.trialPostId ?? null;
  const afterTrialPostId = input.after.trialPostId ?? null;
  const hasTrialPostIdChanged = beforeTrialPostId !== afterTrialPostId;
  const hasValidationStatusChanged = input.before.validationStatus !== input.after.validationStatus;
  const hasChecksumVersionChanged = input.contentChecksumVersionBefore === 1;

  if (!isLocalizedTextEqual(input.before.title, input.after.title)) {
    changedFields.push('title');
  }
  if (!isLocalizedTextEqual(input.before.preview, input.after.preview)) {
    changedFields.push('preview');
  }
  if (!isLocalizedTextEqual(input.before.metadata.attribution, input.after.metadata.attribution)) {
    changedFields.push('metadata.attribution');
  }
  if (input.before.metadata.externalLinkUrl !== input.after.metadata.externalLinkUrl) {
    changedFields.push('metadata.externalLinkUrl');
  }
  if (hasTrialPostIdChanged) {
    changedFields.push('trialPostId');
  }
  if (hasValidationStatusChanged) {
    changedFields.push('validationStatus');
  }
  if (hasChecksumVersionChanged) {
    changedFields.push('contentChecksumVersion');
  }

  return {
    schemaVersion: 1,
    actorId: input.actorId,
    action: adminContentDraftUpdatedAction,
    target: {
      entityType: input.before.entityType,
      entityId: input.before.entityId,
      revisionId: input.before.draftRevisionId,
    },
    createdAt: input.createdAt,
    requestId: input.requestId,
    diff: {
      revisionVersion: {
        before: input.before.revisionVersion,
        after: input.after.revisionVersion,
      },
      changedFields,
      ...(hasTrialPostIdChanged
        ? { trialPostId: { before: beforeTrialPostId, after: afterTrialPostId } }
        : {}),
      ...(hasValidationStatusChanged
        ? {
            validationStatus: {
              before: input.before.validationStatus,
              after: input.after.validationStatus,
            },
          }
        : {}),
      ...(hasChecksumVersionChanged
        ? { contentChecksumVersion: { before: 1 as const, after: 2 as const } }
        : {}),
    },
  };
}
