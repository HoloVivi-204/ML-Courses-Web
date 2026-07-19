import { ArrowLeft, FilePlus, FileText, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import type { Locale } from '../catalog/course-data';
import type {
  AdminContentDraft,
  AdminContentMetadata,
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

  async function handleCreateDraft(item: AdminContentSummary) {
    const contentKey = getContentKey(item);
    const currentDraftActionStatus =
      draftAction?.contentKey === contentKey ? draftAction.status : 'idle';

    if (currentDraftActionStatus === 'creating' || item.draftRevisionId) {
      return;
    }

    setDraftAction({ contentKey, status: 'creating' });

    try {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authenticated user is missing an ID token.');
      }

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
    const idToken = await getIdToken();

    if (!idToken) {
      throw new Error('Authenticated user is missing an ID token.');
    }

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
            onUpdateDraft={handleUpdateDraft}
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
  onUpdateDraft,
}: {
  draftActionStatus: DraftActionStatus;
  draftPreview: AdminContentDraft | null;
  item: AdminContentSummary | null;
  locale: Locale;
  onCreateDraft: (item: AdminContentSummary) => void;
  onUpdateDraft: (draft: AdminContentDraft, fields: DraftEditableFields) => Promise<void>;
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
          onUpdateDraft={onUpdateDraft}
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
  onUpdateDraft,
}: {
  draft: AdminContentDraft;
  locale: Locale;
  onUpdateDraft: (draft: AdminContentDraft, fields: DraftEditableFields) => Promise<void>;
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
