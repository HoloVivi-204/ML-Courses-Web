import { ArrowLeft, CheckCircle2, FilePlus, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import type { Locale } from '../catalog/course-data';
import type {
  AdminContentDraft,
  AdminContentMetadata,
  AdminContentSourceReview,
  AdminContentSummary,
  LearningApiClient,
  UpdateAdminContentDraftInput,
} from '../learning/learning-api';

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

function getContentKey(
  item: Pick<AdminContentSummary | AdminContentDraft, 'entityId' | 'entityType'>,
): string {
  return `${item.entityType}:${item.entityId}`;
}

function createFallbackMetadata(): AdminContentMetadata {
  return {
    attribution: {
      en: 'Seeded Release 1 source attribution pending validation.',
      vi: 'Attribution nguồn Release 1 đã seed, chờ validation.',
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
    titleEn: draft.title.en,
    titleVi: draft.title.vi,
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
        <dt>{t('admin.content.sourceId')}</dt>
        <dd>
          <code>{sourceReview.sourceId}</code>
        </dd>
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
  const [content, setContent] = useState<readonly AdminContentSummary[]>([]);
  const [draftAction, setDraftAction] = useState<DraftActionState | null>(null);
  const [draftPreviewsByKey, setDraftPreviewsByKey] = useState<
    Readonly<Record<string, AdminContentDraft>>
  >({});
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadContent() {
      setLoadStatus('loading');

      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const nextContent = await learningApiClient.listAdminContent({ idToken });

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
      reason,
      revisionId: draft.draftRevisionId,
    });

    updateContentItem(publishedContent);
    setDraftPreviewsByKey((currentDraftPreviews) => {
      const nextDraftPreviews = { ...currentDraftPreviews };
      delete nextDraftPreviews[getContentKey(publishedContent)];

      return nextDraftPreviews;
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
            item={selectedContent}
            locale={locale}
            onCreateDraft={handleCreateDraft}
            onPublishDraft={handlePublishDraft}
            onRollbackContent={handleRollbackContent}
            onUnpublishContent={handleUnpublishContent}
            onUpdateDraft={handleUpdateDraft}
            onValidateDraft={handleValidateDraft}
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
                  <strong>{item.title[locale]}</strong>
                  <code>{item.entityId}</code>
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
  item,
  locale,
  onCreateDraft,
  onPublishDraft,
  onRollbackContent,
  onUnpublishContent,
  onUpdateDraft,
  onValidateDraft,
}: {
  draftActionStatus: DraftActionStatus;
  draftPreview: AdminContentDraft | null;
  item: AdminContentSummary | null;
  locale: Locale;
  onCreateDraft: (item: AdminContentSummary) => void;
  onPublishDraft: (draft: AdminContentDraft, reason: string) => Promise<void>;
  onRollbackContent: (revisionId: string, reason: string) => Promise<void>;
  onUnpublishContent: (item: AdminContentSummary, reason: string) => Promise<void>;
  onUpdateDraft: (draft: AdminContentDraft, fields: DraftEditableFields) => Promise<void>;
  onValidateDraft: (draft: AdminContentDraft) => Promise<void>;
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
        <h3>{item.title[locale]}</h3>
        <code>{item.entityId}</code>
      </div>

      <dl className="admin-content-meta">
        <div>
          <dt>{t('admin.content.status')}</dt>
          <dd>{t(`admin.content.status.${item.status}`)}</dd>
        </div>
        <div>
          <dt>{t('admin.content.revision')}</dt>
          <dd>
            <code>{item.publishedRevisionId}</code>
          </dd>
        </div>
        {item.previousPublishedRevisionId ? (
          <div>
            <dt>{t('admin.content.previousRevision')}</dt>
            <dd>
              <code>{item.previousPublishedRevisionId}</code>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{t('admin.content.draftRevision')}</dt>
          <dd>
            {item.draftRevisionId ? (
              <code>{item.draftRevisionId}</code>
            ) : (
              t('admin.content.noDraft')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('admin.content.locales')}</dt>
          <dd>{item.localeAvailability.join(' / ')}</dd>
        </div>
        <div>
          <dt>{t('admin.content.parent')}</dt>
          <dd>{formatParentPath(item)}</dd>
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
          <h4>{item.title[locale]}</h4>
          <p>{item.preview[locale]}</p>
        </article>
        <article>
          <span>{secondaryLocale.toUpperCase()}</span>
          <h4>{item.title[secondaryLocale]}</h4>
          <p>{item.preview[secondaryLocale]}</p>
        </article>
      </div>

      {draftPreview ? (
        <DraftPreview
          draft={draftPreview}
          key={`${draftPreview.draftRevisionId}:${draftPreview.revisionVersion}`}
          locale={locale}
          onPublishDraft={onPublishDraft}
          onUpdateDraft={onUpdateDraft}
          onValidateDraft={onValidateDraft}
        />
      ) : (
        <p className="admin-content-muted">{t('admin.content.draftPreviewEmpty')}</p>
      )}
    </section>
  );
}

function DraftPreview({
  draft,
  locale,
  onPublishDraft,
  onUpdateDraft,
  onValidateDraft,
}: {
  draft: AdminContentDraft;
  locale: Locale;
  onPublishDraft: (draft: AdminContentDraft, reason: string) => Promise<void>;
  onUpdateDraft: (draft: AdminContentDraft, fields: DraftEditableFields) => Promise<void>;
  onValidateDraft: (draft: AdminContentDraft) => Promise<void>;
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
          <dt>{t('admin.content.draftRevision')}</dt>
          <dd>
            <code>{draft.draftRevisionId}</code>
          </dd>
        </div>
        <div>
          <dt>{t('admin.content.baseRevision')}</dt>
          <dd>
            <code>{draft.baseRevisionId}</code>
          </dd>
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
          <h4>{draft.title[locale]}</h4>
          <p>{draft.preview[locale]}</p>
        </article>
        <article>
          <span>{secondaryLocale.toUpperCase()}</span>
          <h4>{draft.title[secondaryLocale]}</h4>
          <p>{draft.preview[secondaryLocale]}</p>
        </article>
      </div>

      <DraftEditor draft={draft} onUpdateDraft={onUpdateDraft} />
      <DraftLifecyclePanel
        draft={draft}
        onPublishDraft={onPublishDraft}
        onValidateDraft={onValidateDraft}
      />
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

function formatParentPath(item: AdminContentSummary): string {
  const parents = [item.courseId, item.moduleId, item.postId].filter(Boolean);

  return parents.join(' / ');
}
