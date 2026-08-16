import { ArrowLeft, CheckCircle2, FilePlus, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import { lazy, type FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAuth } from '../auth/auth-context';
import type { Locale } from '../catalog/course-data';
import type {
  AdminContentDraft,
  AdminContentEvidenceKind,
  AdminContentEvidenceState,
  AdminContentMetadata,
  AdminContentRevisionPreview,
  AdminContentSourceReview,
  AdminContentSummary,
  LearningApiClient,
  UpdateAdminContentDraftInput,
} from '../learning/learning-api';
import { formatUserFacingTitle } from '../../shared/user-facing-labels';
import { type Theme, useTheme } from '../../shared/theme/use-theme';

const AdminLearnerRevisionPreview = lazy(async () => {
  const module = await import('./admin-learner-revision-preview');

  return { default: module.AdminLearnerRevisionPreview };
});

interface AdminContentPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type LoadStatus = 'failed' | 'loading' | 'ready';
type DraftActionStatus = 'creating' | 'failed' | 'idle';
type DraftEditableFields = Pick<UpdateAdminContentDraftInput, 'metadata' | 'preview' | 'title'>;
type LifecycleActionStatus =
  'failed' | 'idle' | 'publishing' | 'rolling-back' | 'succeeded' | 'unpublishing' | 'validating';
type DraftSaveStatus = 'failed' | 'idle' | 'saved' | 'saving';
type PreviewLoadStatus = 'failed' | 'idle' | 'loading' | 'ready';

interface DraftActionState {
  contentKey: string;
  status: DraftActionStatus;
}

interface DraftFormState {
  attributionEn: string;
  attributionVi: string;
  externalLinkUrl: string;
  previewEn: string;
  previewVi: string;
  titleEn: string;
  titleVi: string;
}

interface LearnerPreviewState {
  preview: AdminContentRevisionPreview;
  revisionVersion: number;
}

function getContentKey(
  item: Pick<AdminContentSummary | AdminContentDraft, 'entityId' | 'entityType'>,
): string {
  return `${item.entityType}:${item.entityId}`;
}

function getDraftPreviewTarget(
  contentKey: string | null,
  draftRevisionId: string | null | undefined,
): { contentKey: string; draftRevisionId: string } | null {
  if (contentKey === null || draftRevisionId === null || draftRevisionId === undefined) {
    return null;
  }

  return { contentKey, draftRevisionId };
}

function createFallbackMetadata(): AdminContentMetadata {
  return {
    attribution: {
      en: 'Add source attribution before publishing.',
      vi: 'Hãy bổ sung thông tin ghi nguồn trước khi xuất bản.',
    },
    externalLinkUrl: null,
  };
}

function getDraftMetadata(draft: AdminContentDraft): AdminContentMetadata {
  return draft.metadata ?? createFallbackMetadata();
}

function createDraftFormState(draft: AdminContentDraft): DraftFormState {
  const metadata = getDraftMetadata(draft);

  return {
    attributionEn: metadata.attribution.en,
    attributionVi: metadata.attribution.vi,
    externalLinkUrl: metadata.externalLinkUrl ?? '',
    previewEn: draft.preview.en,
    previewVi: draft.preview.vi,
    titleEn: formatUserFacingTitle(draft.title.en),
    titleVi: formatUserFacingTitle(draft.title.vi),
  };
}

function createDraftEditableFields(formState: DraftFormState): DraftEditableFields {
  return {
    metadata: {
      attribution: {
        en: formState.attributionEn,
        vi: formState.attributionVi,
      },
      externalLinkUrl: formState.externalLinkUrl.trim() || null,
    },
    preview: {
      en: formState.previewEn,
      vi: formState.previewVi,
    },
    title: {
      en: formState.titleEn,
      vi: formState.titleVi,
    },
  };
}

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

function SourceReviewMeta({
  locale,
  sourceReview,
}: {
  locale: Locale;
  sourceReview?: AdminContentSourceReview | undefined;
}) {
  const { t } = useTranslation();

  if (!sourceReview) {
    return (
      <div>
        <dt>{t('admin.content.sourceReview')}</dt>
        <dd>{t('admin.content.sourceReviewMissing')}</dd>
      </div>
    );
  }

  return (
    <>
      <div>
        <dt>{t('admin.content.sourceTitle')}</dt>
        <dd>{sourceReview.title}</dd>
      </div>
      <div>
        <dt>{t('admin.content.license')}</dt>
        <dd>{sourceReview.license.name}</dd>
      </div>
      <div>
        <dt>{t('admin.content.licenseUrl')}</dt>
        <dd>{sourceReview.license.url}</dd>
      </div>
      <div>
        <dt>{t('admin.content.sourceAttribution')}</dt>
        <dd>{sourceReview.attribution[locale]}</dd>
      </div>
    </>
  );
}

export function AdminContentPage({ learningApiClient, locale }: AdminContentPageProps) {
  const { t } = useTranslation();
  const { getIdToken } = useAuth();
  const { theme } = useTheme();
  const [content, setContent] = useState<readonly AdminContentSummary[]>([]);
  const [draftAction, setDraftAction] = useState<DraftActionState | null>(null);
  const [draftPreviewsByKey, setDraftPreviewsByKey] = useState<
    Readonly<Record<string, AdminContentDraft>>
  >({});
  const [learnerPreviewsByKey, setLearnerPreviewsByKey] = useState<
    Readonly<Record<string, LearnerPreviewState>>
  >({});
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [previewLocale, setPreviewLocale] = useState<Locale>(locale);
  const [previewLoadStatusesByKey, setPreviewLoadStatusesByKey] = useState<
    Readonly<Record<string, PreviewLoadStatus>>
  >({});
  const [previewTheme, setPreviewTheme] = useState<Theme>(theme);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const loadDraftEvidence = useCallback(
    async (revisionId: string): Promise<AdminContentEvidenceState> => {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authenticated user is missing an ID token.');
      }

      return learningApiClient.listAdminContentEvidence({ idToken, revisionId });
    },
    [getIdToken, learningApiClient],
  );

  const attachDraftEvidence = useCallback(
    async (input: {
      checksum: string;
      evidenceRef: string;
      kind: AdminContentEvidenceKind;
      revisionId: string;
    }) => {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authenticated user is missing an ID token.');
      }

      return learningApiClient.attachAdminContentEvidence({ ...input, idToken });
    },
    [getIdToken, learningApiClient],
  );

  useEffect(() => {
    let isActive = true;

    async function loadContent() {
      setLoadStatus('loading');

      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const page = await learningApiClient.listAdminContent({ idToken });
        const nextContent = page.content;

        if (isActive) {
          setContent(nextContent);
          setSelectedKey(nextContent[0] ? getContentKey(nextContent[0]) : null);
          setLoadStatus('ready');
        }
      } catch {
        if (isActive) {
          setContent([]);
          setSelectedKey(null);
          setLoadStatus('failed');
        }
      }
    }

    void loadContent();

    return () => {
      isActive = false;
    };
  }, [getIdToken, learningApiClient]);

  const selectedContent = useMemo(() => {
    return content.find((item) => getContentKey(item) === selectedKey) ?? content[0] ?? null;
  }, [content, selectedKey]);

  const selectedContentKey = selectedContent ? getContentKey(selectedContent) : null;
  const selectedDraftActionStatus =
    draftAction?.contentKey === selectedContentKey ? draftAction.status : 'idle';
  const selectedDraftPreview =
    selectedContentKey !== null ? (draftPreviewsByKey[selectedContentKey] ?? null) : null;
  const selectedLearnerPreview =
    selectedContentKey !== null ? (learnerPreviewsByKey[selectedContentKey] ?? null) : null;
  const selectedPreviewLoadStatus =
    selectedContentKey !== null ? (previewLoadStatusesByKey[selectedContentKey] ?? 'idle') : 'idle';

  useEffect(() => {
    const previewTarget = getDraftPreviewTarget(
      selectedContentKey,
      selectedContent?.draftRevisionId,
    );

    if (previewTarget === null) {
      return undefined;
    }

    const { contentKey, draftRevisionId } = previewTarget;

    if (
      selectedDraftPreview?.draftRevisionId === draftRevisionId &&
      selectedLearnerPreview?.revisionVersion === selectedDraftPreview.revisionVersion
    ) {
      return undefined;
    }

    let isActive = true;

    async function loadDraftPreview() {
      setPreviewLoadStatusesByKey((currentStatuses) => ({
        ...currentStatuses,
        [contentKey]: 'loading',
      }));

      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const state = await learningApiClient.getAdminContentRevisionPreview({
          idToken,
          revisionId: draftRevisionId,
        });

        if (!isActive) {
          return;
        }

        setDraftPreviewsByKey((currentDraftPreviews) => {
          const existingDraft = currentDraftPreviews[contentKey];

          if (
            existingDraft?.draftRevisionId === state.draft.draftRevisionId &&
            existingDraft.revisionVersion >= state.draft.revisionVersion
          ) {
            return currentDraftPreviews;
          }

          return {
            ...currentDraftPreviews,
            [contentKey]: state.draft,
          };
        });
        setLearnerPreviewsByKey((currentPreviews) => ({
          ...currentPreviews,
          [contentKey]: {
            preview: state.preview,
            revisionVersion: state.draft.revisionVersion,
          },
        }));
        setPreviewLoadStatusesByKey((currentStatuses) => ({
          ...currentStatuses,
          [contentKey]: 'ready',
        }));
      } catch {
        if (isActive) {
          setPreviewLoadStatusesByKey((currentStatuses) => ({
            ...currentStatuses,
            [contentKey]: 'failed',
          }));
        }
      }
    }

    void loadDraftPreview();

    return () => {
      isActive = false;
    };
  }, [
    getIdToken,
    learningApiClient,
    selectedContentKey,
    selectedContent?.draftRevisionId,
    selectedDraftPreview,
    selectedLearnerPreview,
  ]);

  async function getRequiredIdToken(): Promise<string> {
    const idToken = await getIdToken();

    if (!idToken) {
      throw new Error('Authenticated user is missing an ID token.');
    }

    return idToken;
  }

  function updateContentItem(updatedContent: AdminContentSummary): void {
    setContent((currentContent) => {
      return currentContent.map((contentItem) => {
        if (getContentKey(contentItem) !== getContentKey(updatedContent)) {
          return contentItem;
        }

        return updatedContent;
      });
    });
  }

  async function handleCreateDraft(item: AdminContentSummary) {
    const contentKey = getContentKey(item);
    const currentDraftActionStatus =
      draftAction?.contentKey === contentKey ? draftAction.status : 'idle';

    if (currentDraftActionStatus === 'creating' || item.draftRevisionId) {
      return;
    }

    setDraftAction({ contentKey, status: 'creating' });

    try {
      const idToken = await getRequiredIdToken();

      const draft = await learningApiClient.createAdminContentDraft({
        entityId: item.entityId,
        entityType: item.entityType,
        idToken,
      });

      setDraftPreviewsByKey((currentDraftPreviews) => {
        return {
          ...currentDraftPreviews,
          [contentKey]: draft,
        };
      });
      setContent((currentContent) => {
        return currentContent.map((contentItem) => {
          if (getContentKey(contentItem) !== contentKey) {
            return contentItem;
          }

          return {
            ...contentItem,
            draftRevisionId: draft.draftRevisionId,
          };
        });
      });
      setDraftAction(null);
    } catch {
      setDraftPreviewsByKey((currentDraftPreviews) => {
        const nextDraftPreviews = { ...currentDraftPreviews };
        delete nextDraftPreviews[contentKey];

        return nextDraftPreviews;
      });
      setLearnerPreviewsByKey((currentPreviews) => {
        const nextPreviews = { ...currentPreviews };
        delete nextPreviews[contentKey];

        return nextPreviews;
      });
      setDraftAction({ contentKey, status: 'failed' });
    }
  }

  async function handleUpdateDraft(
    draft: AdminContentDraft,
    fields: DraftEditableFields,
  ): Promise<void> {
    const idToken = await getRequiredIdToken();

    const updatedDraft = await learningApiClient.updateAdminContentDraft({
      ...fields,
      idToken,
      revisionId: draft.draftRevisionId,
      revisionVersion: draft.revisionVersion,
    });

    setDraftPreviewsByKey((currentDraftPreviews) => {
      return {
        ...currentDraftPreviews,
        [getContentKey(updatedDraft)]: updatedDraft,
      };
    });
  }

  async function handleValidateDraft(draft: AdminContentDraft): Promise<void> {
    const idToken = await getRequiredIdToken();
    const validatedDraft = await learningApiClient.validateAdminContentDraft({
      idToken,
      revisionId: draft.draftRevisionId,
    });

    setDraftPreviewsByKey((currentDraftPreviews) => {
      return {
        ...currentDraftPreviews,
        [getContentKey(validatedDraft)]: validatedDraft,
      };
    });
  }

  async function handlePublishDraft(draft: AdminContentDraft, reason: string): Promise<void> {
    const idToken = await getRequiredIdToken();
    const publishedContent = await learningApiClient.publishAdminContentRevision({
      idToken,
      idempotencyKey: createIdempotencyKey(),
      publicationScope: 'emulator-demo',
      reason,
      revisionId: draft.draftRevisionId,
    });

    updateContentItem(publishedContent);
    setDraftPreviewsByKey((currentDraftPreviews) => {
      const nextDraftPreviews = { ...currentDraftPreviews };
      delete nextDraftPreviews[getContentKey(publishedContent)];

      return nextDraftPreviews;
    });
    setLearnerPreviewsByKey((currentPreviews) => {
      const nextPreviews = { ...currentPreviews };
      delete nextPreviews[getContentKey(publishedContent)];

      return nextPreviews;
    });
  }

  async function handleUnpublishContent(item: AdminContentSummary, reason: string): Promise<void> {
    const idToken = await getRequiredIdToken();
    const unpublishedContent = await learningApiClient.unpublishAdminContentEntity({
      entityId: item.entityId,
      idToken,
      reason,
    });

    updateContentItem(unpublishedContent);
  }

  async function handleRollbackContent(revisionId: string, reason: string): Promise<void> {
    const idToken = await getRequiredIdToken();
    const rolledBackContent = await learningApiClient.rollbackAdminContentRevision({
      idToken,
      reason,
      revisionId,
    });

    updateContentItem(rolledBackContent);
  }

  return (
    <main className="admin-content-page page-shell">
      <Link className="breadcrumb-link" to="/">
        <ArrowLeft aria-hidden="true" size={16} />
        {t('admin.content.back')}
      </Link>

      <section className="admin-content-hero">
        <div>
          <span className="eyebrow">{t('admin.content.eyebrow')}</span>
          <h1>{t('admin.content.title')}</h1>
          <p>{t('admin.content.intro')}</p>
          <Link className="breadcrumb-link" to="/admin/reports">
            {t('admin.content.reports')}
          </Link>
        </div>
        <div className="admin-content-guard" aria-label={t('admin.content.guardLabel')}>
          <ShieldCheck aria-hidden="true" size={22} />
          <span>{t('admin.content.guard')}</span>
        </div>
      </section>

      {loadStatus === 'loading' ? (
        <section className="admin-content-state" role="status">
          {t('admin.content.loading')}
        </section>
      ) : null}

      {loadStatus === 'failed' ? (
        <section className="admin-content-error" role="alert">
          <h2>{t('admin.content.forbiddenTitle')}</h2>
          <p>{t('admin.content.forbidden')}</p>
        </section>
      ) : null}

      {loadStatus === 'ready' ? (
        <section className="admin-content-grid">
          <ContentInventoryList
            content={content}
            locale={locale}
            selectedKey={selectedContent ? getContentKey(selectedContent) : null}
            onSelect={setSelectedKey}
          />
          <ContentPreview
            draftActionStatus={selectedDraftActionStatus}
            draftPreview={selectedDraftPreview}
            learnerPreview={selectedLearnerPreview?.preview ?? null}
            item={selectedContent}
            locale={locale}
            onCreateDraft={handleCreateDraft}
            onAttachEvidence={attachDraftEvidence}
            onLoadEvidence={loadDraftEvidence}
            onPublishDraft={handlePublishDraft}
            onRollbackContent={handleRollbackContent}
            onUnpublishContent={handleUnpublishContent}
            onUpdateDraft={handleUpdateDraft}
            onValidateDraft={handleValidateDraft}
            previewLocale={previewLocale}
            previewLoadStatus={selectedPreviewLoadStatus}
            previewTheme={previewTheme}
            setPreviewLocale={setPreviewLocale}
            setPreviewTheme={setPreviewTheme}
          />
        </section>
      ) : null}
    </main>
  );
}

function ContentInventoryList({
  content,
  locale,
  onSelect,
  selectedKey,
}: {
  content: readonly AdminContentSummary[];
  locale: Locale;
  onSelect: (key: string) => void;
  selectedKey: string | null;
}) {
  const { t } = useTranslation();

  return (
    <section className="admin-content-list" aria-label={t('admin.content.inventory')}>
      <div className="admin-content-panel-heading">
        <FileText aria-hidden="true" size={18} />
        <h2>{t('admin.content.inventory')}</h2>
      </div>

      {content.length ? (
        <ul>
          {content.map((item) => {
            const key = getContentKey(item);

            return (
              <li key={key}>
                <button
                  aria-pressed={key === selectedKey}
                  className={
                    key === selectedKey ? 'admin-content-card is-active' : 'admin-content-card'
                  }
                  onClick={() => onSelect(key)}
                  type="button"
                >
                  <span>{t(`admin.content.entity.${item.entityType}`)}</span>
                  <strong>{formatUserFacingTitle(item.title[locale])}</strong>
                  {item.draftRevisionId ? <em>{t('admin.content.draftBadge')}</em> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="admin-content-muted">{t('admin.content.empty')}</p>
      )}
    </section>
  );
}

function ContentPreview({
  draftActionStatus,
  draftPreview,
  learnerPreview,
  item,
  locale,
  onAttachEvidence,
  onCreateDraft,
  onLoadEvidence,
  onPublishDraft,
  onRollbackContent,
  onUnpublishContent,
  onUpdateDraft,
  onValidateDraft,
  previewLocale,
  previewLoadStatus,
  previewTheme,
  setPreviewLocale,
  setPreviewTheme,
}: {
  draftActionStatus: DraftActionStatus;
  draftPreview: AdminContentDraft | null;
  learnerPreview: AdminContentRevisionPreview | null;
  item: AdminContentSummary | null;
  locale: Locale;
  onAttachEvidence: (input: {
    checksum: string;
    evidenceRef: string;
    kind: AdminContentEvidenceKind;
    revisionId: string;
  }) => Promise<unknown>;
  onCreateDraft: (item: AdminContentSummary) => void;
  onLoadEvidence: (revisionId: string) => Promise<AdminContentEvidenceState>;
  onPublishDraft: (draft: AdminContentDraft, reason: string) => Promise<void>;
  onRollbackContent: (revisionId: string, reason: string) => Promise<void>;
  onUnpublishContent: (item: AdminContentSummary, reason: string) => Promise<void>;
  onUpdateDraft: (draft: AdminContentDraft, fields: DraftEditableFields) => Promise<void>;
  onValidateDraft: (draft: AdminContentDraft) => Promise<void>;
  previewLocale: Locale;
  previewLoadStatus: PreviewLoadStatus;
  previewTheme: Theme;
  setPreviewLocale: (locale: Locale) => void;
  setPreviewTheme: (theme: Theme) => void;
}) {
  const { t } = useTranslation();

  if (!item) {
    return (
      <section className="admin-content-preview">
        <h2>{t('admin.content.preview')}</h2>
        <p className="admin-content-muted">{t('admin.content.empty')}</p>
      </section>
    );
  }

  const secondaryLocale: Locale = locale === 'vi' ? 'en' : 'vi';

  return (
    <section className="admin-content-preview">
      <div className="admin-content-panel-heading">
        <ShieldCheck aria-hidden="true" size={18} />
        <h2>{t('admin.content.preview')}</h2>
      </div>

      <div className="admin-content-preview-title">
        <span>{t(`admin.content.entity.${item.entityType}`)}</span>
        <h3>{formatUserFacingTitle(item.title[locale])}</h3>
      </div>

      <dl className="admin-content-meta">
        <div>
          <dt>{t('admin.content.status')}</dt>
          <dd>{t(`admin.content.status.${item.status}`)}</dd>
        </div>
        {item.publicationScope ? (
          <div>
            <dt>{t('admin.content.publicationScope')}</dt>
            <dd>{t(`admin.content.publicationScope.${item.publicationScope}`)}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('admin.content.draftRevision')}</dt>
          <dd>
            {item.draftRevisionId ? t('admin.content.draftExists') : t('admin.content.noDraft')}
          </dd>
        </div>
        <div>
          <dt>{t('admin.content.locales')}</dt>
          <dd>{item.localeAvailability.join(' / ')}</dd>
        </div>
        <div>
          <dt>{t('admin.content.source')}</dt>
          <dd>{item.sourceStatus}</dd>
        </div>
        <SourceReviewMeta locale={locale} sourceReview={item.sourceReview} />
        <div>
          <dt>{t('admin.content.validation')}</dt>
          <dd>{item.validationStatus}</dd>
        </div>
      </dl>

      <div className="admin-content-actions">
        <button
          className="admin-content-draft-button"
          disabled={draftActionStatus === 'creating' || item.draftRevisionId !== null}
          onClick={() => onCreateDraft(item)}
          type="button"
        >
          <FilePlus aria-hidden="true" size={16} />
          {draftActionStatus === 'creating'
            ? t('admin.content.draftCreating')
            : item.draftRevisionId
              ? t('admin.content.draftExists')
              : t('admin.content.createDraft')}
        </button>
        {draftActionStatus === 'failed' ? (
          <p className="admin-content-inline-error" role="alert">
            {t('admin.content.draftFailed')}
          </p>
        ) : null}
      </div>

      <PublishedLifecyclePanel
        item={item}
        onRollbackContent={onRollbackContent}
        onUnpublishContent={onUnpublishContent}
      />

      <div className="admin-content-preview-copy">
        <article>
          <span>{locale.toUpperCase()}</span>
          <h4>{formatUserFacingTitle(item.title[locale])}</h4>
          <p>{item.preview[locale]}</p>
        </article>
        <article>
          <span>{secondaryLocale.toUpperCase()}</span>
          <h4>{formatUserFacingTitle(item.title[secondaryLocale])}</h4>
          <p>{item.preview[secondaryLocale]}</p>
        </article>
      </div>

      {draftPreview ? (
        <DraftPreview
          draft={draftPreview}
          key={`${draftPreview.draftRevisionId}:${draftPreview.revisionVersion}`}
          locale={locale}
          learnerPreview={learnerPreview}
          onAttachEvidence={onAttachEvidence}
          onLoadEvidence={onLoadEvidence}
          onPublishDraft={onPublishDraft}
          onUpdateDraft={onUpdateDraft}
          onValidateDraft={onValidateDraft}
          previewLocale={previewLocale}
          previewLoadStatus={previewLoadStatus}
          previewTheme={previewTheme}
          setPreviewLocale={setPreviewLocale}
          setPreviewTheme={setPreviewTheme}
        />
      ) : (
        <p className="admin-content-muted">{t('admin.content.draftPreviewEmpty')}</p>
      )}
    </section>
  );
}

function DraftPreview({
  draft,
  learnerPreview,
  locale,
  onAttachEvidence,
  onLoadEvidence,
  onPublishDraft,
  onUpdateDraft,
  onValidateDraft,
  previewLocale,
  previewLoadStatus,
  previewTheme,
  setPreviewLocale,
  setPreviewTheme,
}: {
  draft: AdminContentDraft;
  learnerPreview: AdminContentRevisionPreview | null;
  locale: Locale;
  onAttachEvidence: (input: {
    checksum: string;
    evidenceRef: string;
    kind: AdminContentEvidenceKind;
    revisionId: string;
  }) => Promise<unknown>;
  onLoadEvidence: (revisionId: string) => Promise<AdminContentEvidenceState>;
  onPublishDraft: (draft: AdminContentDraft, reason: string) => Promise<void>;
  onUpdateDraft: (draft: AdminContentDraft, fields: DraftEditableFields) => Promise<void>;
  onValidateDraft: (draft: AdminContentDraft) => Promise<void>;
  previewLocale: Locale;
  previewLoadStatus: PreviewLoadStatus;
  previewTheme: Theme;
  setPreviewLocale: (locale: Locale) => void;
  setPreviewTheme: (theme: Theme) => void;
}) {
  const { t } = useTranslation();
  const secondaryLocale: Locale = locale === 'vi' ? 'en' : 'vi';
  const metadata = getDraftMetadata(draft);

  return (
    <section className="admin-content-draft-preview" aria-label={t('admin.content.draftPreview')}>
      <div className="admin-content-panel-heading">
        <FilePlus aria-hidden="true" size={18} />
        <h3>{t('admin.content.draftPreview')}</h3>
      </div>

      <dl className="admin-content-meta">
        <div>
          <dt>{t('admin.content.status')}</dt>
          <dd>{t('admin.content.status.draft')}</dd>
        </div>
        <div>
          <dt>{t('admin.content.revisionVersion')}</dt>
          <dd>{draft.revisionVersion}</dd>
        </div>
        <div>
          <dt>{t('admin.content.attribution')}</dt>
          <dd>{metadata.attribution[locale]}</dd>
        </div>
        <div>
          <dt>{t('admin.content.externalLink')}</dt>
          <dd>{metadata.externalLinkUrl ?? t('admin.content.noExternalLink')}</dd>
        </div>
        <SourceReviewMeta locale={locale} sourceReview={draft.sourceReview} />
      </dl>

      <div className="admin-content-preview-copy">
        <article>
          <span>{locale.toUpperCase()}</span>
          <h4>{formatUserFacingTitle(draft.title[locale])}</h4>
          <p>{draft.preview[locale]}</p>
        </article>
        <article>
          <span>{secondaryLocale.toUpperCase()}</span>
          <h4>{formatUserFacingTitle(draft.title[secondaryLocale])}</h4>
          <p>{draft.preview[secondaryLocale]}</p>
        </article>
      </div>

      <DraftLearnerPreviewPanel
        learnerPreview={learnerPreview}
        locale={locale}
        previewLocale={previewLocale}
        previewLoadStatus={previewLoadStatus}
        previewTheme={previewTheme}
        setPreviewLocale={setPreviewLocale}
        setPreviewTheme={setPreviewTheme}
      />

      <DraftEvidencePanel
        draft={draft}
        onAttachEvidence={onAttachEvidence}
        onLoadEvidence={onLoadEvidence}
      />

      <DraftEditor draft={draft} onUpdateDraft={onUpdateDraft} />
      <DraftLifecyclePanel
        draft={draft}
        onPublishDraft={onPublishDraft}
        onValidateDraft={onValidateDraft}
      />
    </section>
  );
}

function DraftLearnerPreviewPanel({
  learnerPreview,
  locale,
  previewLocale,
  previewLoadStatus,
  previewTheme,
  setPreviewLocale,
  setPreviewTheme,
}: {
  learnerPreview: AdminContentRevisionPreview | null;
  locale: Locale;
  previewLocale: Locale;
  previewLoadStatus: PreviewLoadStatus;
  previewTheme: Theme;
  setPreviewLocale: (locale: Locale) => void;
  setPreviewTheme: (theme: Theme) => void;
}) {
  const copy =
    locale === 'vi'
      ? {
          failed: 'Không thể tải learner preview. Hãy thử lại sau.',
          language: 'Ngôn ngữ preview',
          loading: 'Đang tải learner preview…',
          theme: 'Giao diện preview',
          title: 'Learner runtime preview',
        }
      : {
          failed: 'The learner preview could not be loaded. Try again later.',
          language: 'Preview language',
          loading: 'Loading learner preview…',
          theme: 'Preview theme',
          title: 'Learner runtime preview',
        };

  return (
    <section className="admin-content-runtime-preview" aria-label={copy.title}>
      <div className="admin-content-panel-heading">
        <ShieldCheck aria-hidden="true" size={18} />
        <h3>{copy.title}</h3>
      </div>

      <div className="admin-content-preview-controls">
        <label>
          <span>{copy.language}</span>
          <select
            aria-label={copy.language}
            onChange={(event) => setPreviewLocale(event.target.value as Locale)}
            value={previewLocale}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          <span>{copy.theme}</span>
          <select
            aria-label={copy.theme}
            onChange={(event) => setPreviewTheme(event.target.value as Theme)}
            value={previewTheme}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      {previewLoadStatus === 'loading' ? <p role="status">{copy.loading}</p> : null}
      {previewLoadStatus === 'failed' ? <p role="alert">{copy.failed}</p> : null}
      {learnerPreview ? (
        <Suspense fallback={<p role="status">{copy.loading}</p>}>
          <AdminLearnerRevisionPreview
            locale={previewLocale}
            preview={learnerPreview}
            theme={previewTheme}
          />
        </Suspense>
      ) : null}
    </section>
  );
}

const requiredEvidenceKinds: readonly AdminContentEvidenceKind[] = [
  'license',
  'provenance',
  'content-review',
  'gvhd-confirmation',
];

type EvidencePanelStatus = 'attaching' | 'failed' | 'loading' | 'ready';

function DraftEvidencePanel({
  draft,
  onAttachEvidence,
  onLoadEvidence,
}: {
  draft: AdminContentDraft;
  onAttachEvidence: (input: {
    checksum: string;
    evidenceRef: string;
    kind: AdminContentEvidenceKind;
    revisionId: string;
  }) => Promise<unknown>;
  onLoadEvidence: (revisionId: string) => Promise<AdminContentEvidenceState>;
}) {
  const { t } = useTranslation();
  const [checksum, setChecksum] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [evidenceState, setEvidenceState] = useState<AdminContentEvidenceState | null>(null);
  const [kind, setKind] = useState<AdminContentEvidenceKind>('license');
  const [status, setStatus] = useState<EvidencePanelStatus>('loading');

  useEffect(() => {
    let isActive = true;

    async function loadEvidence() {
      setStatus('loading');

      try {
        const nextEvidenceState = await onLoadEvidence(draft.draftRevisionId);

        if (isActive) {
          setChecksum(nextEvidenceState.contentChecksum);
          setEvidenceState(nextEvidenceState);
          setStatus('ready');
        }
      } catch {
        if (isActive) {
          setStatus('failed');
        }
      }
    }

    void loadEvidence();

    return () => {
      isActive = false;
    };
  }, [draft.draftRevisionId, onLoadEvidence]);

  const evidenceByKind = new Map(
    evidenceState?.evidence.map((evidence) => [evidence.kind, evidence]),
  );

  async function attachEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!checksum.trim() || !evidenceRef.trim()) {
      return;
    }

    setStatus('attaching');

    try {
      await onAttachEvidence({
        checksum: checksum.trim(),
        evidenceRef: evidenceRef.trim(),
        kind,
        revisionId: draft.draftRevisionId,
      });
      const nextEvidenceState = await onLoadEvidence(draft.draftRevisionId);

      setChecksum(nextEvidenceState.contentChecksum);
      setEvidenceRef('');
      setEvidenceState(nextEvidenceState);
      setStatus('ready');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <section className="admin-content-evidence-panel" aria-label={t('admin.content.evidence')}>
      <div className="admin-content-panel-heading">
        <ShieldCheck aria-hidden="true" size={18} />
        <h3>{t('admin.content.evidence')}</h3>
      </div>
      <p className="admin-content-emulator-notice" role="note">
        {t('admin.content.evidenceNotice')}
      </p>

      <dl className="admin-content-evidence-list">
        {requiredEvidenceKinds.map((requiredKind) => {
          const evidence = evidenceByKind.get(requiredKind);

          return (
            <div key={requiredKind}>
              <dt>{requiredKind}</dt>
              <dd data-evidence-status={evidence?.result ?? 'missing'}>
                {evidence ? evidence.result : 'missing'}
              </dd>
            </div>
          );
        })}
      </dl>

      <form className="admin-content-evidence-form" onSubmit={attachEvidence}>
        <label>
          <span>Evidence type</span>
          <select
            onChange={(event) => setKind(event.target.value as AdminContentEvidenceKind)}
            value={kind}
          >
            {requiredEvidenceKinds.map((requiredKind) => (
              <option key={requiredKind} value={requiredKind}>
                {requiredKind}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Reference</span>
          <input
            onChange={(event) => setEvidenceRef(event.target.value)}
            placeholder="evidence://review/reference"
            required
            type="text"
            value={evidenceRef}
          />
        </label>
        <label className="admin-content-evidence-checksum">
          <span>Draft checksum</span>
          <input
            onChange={(event) => setChecksum(event.target.value)}
            pattern="[a-f0-9]{64}"
            required
            type="text"
            value={checksum}
          />
        </label>
        <button
          className="admin-content-secondary-button"
          disabled={status === 'attaching' || status === 'loading'}
          type="submit"
        >
          {status === 'attaching' ? 'Attaching evidence…' : 'Attach pending evidence'}
        </button>
      </form>

      {status === 'loading' ? <p role="status">Loading evidence…</p> : null}
      {status === 'failed' ? (
        <p className="admin-content-inline-error" role="alert">
          Evidence could not be loaded or attached. Check the checksum and retry.
        </p>
      ) : null}
    </section>
  );
}

function DraftLifecyclePanel({
  draft,
  onPublishDraft,
  onValidateDraft,
}: {
  draft: AdminContentDraft;
  onPublishDraft: (draft: AdminContentDraft, reason: string) => Promise<void>;
  onValidateDraft: (draft: AdminContentDraft) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('Reviewed localized draft copy for pilot release.');
  const [status, setStatus] = useState<LifecycleActionStatus>('idle');
  const canPublish = draft.validationStatus === 'valid';
  const isBusy = status === 'publishing' || status === 'validating';

  async function validateDraft() {
    setStatus('validating');

    try {
      await onValidateDraft(draft);
      setStatus('succeeded');
    } catch {
      setStatus('failed');
    }
  }

  async function publishDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canPublish || !reason.trim()) {
      return;
    }

    setStatus('publishing');

    try {
      await onPublishDraft(draft, reason.trim());
      setStatus('succeeded');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <form className="admin-content-lifecycle-form" onSubmit={publishDraft}>
      <div className="admin-content-panel-heading">
        <CheckCircle2 aria-hidden="true" size={18} />
        <h3>{t('admin.content.lifecycle')}</h3>
      </div>

      <p className="admin-content-emulator-notice" role="note">
        {t('admin.content.emulatorDemoOnly')}
      </p>

      <label>
        <span>{t('admin.content.lifecycleReason')}</span>
        <textarea
          onChange={(event) => setReason(event.target.value)}
          required
          rows={2}
          value={reason}
        />
      </label>

      <div className="admin-content-actions">
        <button
          className="admin-content-secondary-button"
          disabled={isBusy}
          onClick={validateDraft}
          type="button"
        >
          {status === 'validating'
            ? t('admin.content.validatingDraft')
            : t('admin.content.validateDraft')}
        </button>
        <button
          className="admin-content-draft-button"
          disabled={!canPublish || isBusy || !reason.trim()}
          type="submit"
        >
          {status === 'publishing'
            ? t('admin.content.publishingDraft')
            : t('admin.content.publishDraft')}
        </button>
      </div>

      {canPublish ? (
        <p className="admin-content-save-state" role="status">
          {t('admin.content.draftValid')}
        </p>
      ) : (
        <p className="admin-content-muted">{t('admin.content.publishRequiresValidation')}</p>
      )}
      {status === 'failed' ? (
        <p className="admin-content-inline-error" role="alert">
          {t('admin.content.lifecycleFailed')}
        </p>
      ) : null}
    </form>
  );
}

function PublishedLifecyclePanel({
  item,
  onRollbackContent,
  onUnpublishContent,
}: {
  item: AdminContentSummary;
  onRollbackContent: (revisionId: string, reason: string) => Promise<void>;
  onUnpublishContent: (item: AdminContentSummary, reason: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('Planned lifecycle change for pilot review.');
  const [status, setStatus] = useState<LifecycleActionStatus>('idle');
  const canRollback = Boolean(item.previousPublishedRevisionId);
  const canUnpublish = item.entityType === 'course' && item.status === 'published';
  const isBusy = status === 'rolling-back' || status === 'unpublishing';

  if (!canRollback && !canUnpublish) {
    return null;
  }

  async function unpublishContent() {
    if (!canUnpublish || !reason.trim()) {
      return;
    }

    setStatus('unpublishing');

    try {
      await onUnpublishContent(item, reason.trim());
      setStatus('succeeded');
    } catch {
      setStatus('failed');
    }
  }

  async function rollbackContent() {
    if (!item.previousPublishedRevisionId || !reason.trim()) {
      return;
    }

    setStatus('rolling-back');

    try {
      await onRollbackContent(item.previousPublishedRevisionId, reason.trim());
      setStatus('succeeded');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <section className="admin-content-lifecycle-form" aria-label={t('admin.content.lifecycle')}>
      <div className="admin-content-panel-heading">
        <RotateCcw aria-hidden="true" size={18} />
        <h3>{t('admin.content.lifecycle')}</h3>
      </div>

      <label>
        <span>{t('admin.content.lifecycleReason')}</span>
        <textarea
          onChange={(event) => setReason(event.target.value)}
          required
          rows={2}
          value={reason}
        />
      </label>

      <div className="admin-content-actions">
        {canUnpublish ? (
          <button
            className="admin-content-secondary-button"
            disabled={isBusy || !reason.trim()}
            onClick={unpublishContent}
            type="button"
          >
            {status === 'unpublishing'
              ? t('admin.content.unpublishing')
              : t('admin.content.unpublish')}
          </button>
        ) : null}
        {canRollback ? (
          <button
            className="admin-content-secondary-button"
            disabled={isBusy || !reason.trim()}
            onClick={rollbackContent}
            type="button"
          >
            {status === 'rolling-back'
              ? t('admin.content.rollingBack')
              : t('admin.content.rollback')}
          </button>
        ) : null}
      </div>

      {status === 'succeeded' ? (
        <p className="admin-content-save-state" role="status">
          {t('admin.content.lifecycleSaved')}
        </p>
      ) : null}
      {status === 'failed' ? (
        <p className="admin-content-inline-error" role="alert">
          {t('admin.content.lifecycleFailed')}
        </p>
      ) : null}
    </section>
  );
}

function DraftEditor({
  draft,
  onUpdateDraft,
}: {
  draft: AdminContentDraft;
  onUpdateDraft: (draft: AdminContentDraft, fields: DraftEditableFields) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<DraftFormState>(() => createDraftFormState(draft));
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveStatus('saving');

    try {
      await onUpdateDraft(draft, createDraftEditableFields(formState));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('failed');
    }
  }

  function updateField(field: keyof DraftFormState, value: string) {
    setFormState((currentFormState) => {
      return {
        ...currentFormState,
        [field]: value,
      };
    });
  }

  return (
    <form className="admin-content-draft-form" onSubmit={handleSubmit}>
      <div className="admin-content-panel-heading">
        <FileText aria-hidden="true" size={18} />
        <h3>{t('admin.content.editor')}</h3>
      </div>

      <div className="admin-content-form-grid">
        <label>
          <span>Title EN</span>
          <input
            onChange={(event) => updateField('titleEn', event.target.value)}
            required
            type="text"
            value={formState.titleEn}
          />
        </label>
        <label>
          <span>Title VI</span>
          <input
            onChange={(event) => updateField('titleVi', event.target.value)}
            required
            type="text"
            value={formState.titleVi}
          />
        </label>
        <label>
          <span>Preview EN</span>
          <textarea
            onChange={(event) => updateField('previewEn', event.target.value)}
            required
            rows={3}
            value={formState.previewEn}
          />
        </label>
        <label>
          <span>Preview VI</span>
          <textarea
            onChange={(event) => updateField('previewVi', event.target.value)}
            required
            rows={3}
            value={formState.previewVi}
          />
        </label>
        <label>
          <span>Attribution EN</span>
          <textarea
            onChange={(event) => updateField('attributionEn', event.target.value)}
            required
            rows={2}
            value={formState.attributionEn}
          />
        </label>
        <label>
          <span>Attribution VI</span>
          <textarea
            onChange={(event) => updateField('attributionVi', event.target.value)}
            required
            rows={2}
            value={formState.attributionVi}
          />
        </label>
        <label className="admin-content-form-wide">
          <span>External link URL</span>
          <input
            onChange={(event) => updateField('externalLinkUrl', event.target.value)}
            placeholder="https://example.com/source"
            type="url"
            value={formState.externalLinkUrl}
          />
        </label>
      </div>

      <div className="admin-content-actions">
        <button
          className="admin-content-draft-button"
          disabled={saveStatus === 'saving'}
          type="submit"
        >
          {saveStatus === 'saving' ? t('admin.content.savingDraft') : t('admin.content.saveDraft')}
        </button>
        {saveStatus === 'saved' ? (
          <p className="admin-content-save-state" role="status">
            {t('admin.content.draftSaved')}
          </p>
        ) : null}
        {saveStatus === 'failed' ? (
          <p className="admin-content-inline-error" role="alert">
            {t('admin.content.draftSaveFailed')}
          </p>
        ) : null}
      </div>
    </form>
  );
}
