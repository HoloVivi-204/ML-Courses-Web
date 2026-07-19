import { ArrowLeft, FilePlus, FileText, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import type { Locale } from '../catalog/course-data';
import type {
  AdminContentDraft,
  AdminContentSummary,
  LearningApiClient,
} from '../learning/learning-api';

interface AdminContentPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type LoadStatus = 'failed' | 'loading' | 'ready';
type DraftActionStatus = 'creating' | 'failed' | 'idle';

interface DraftActionState {
  contentKey: string;
  status: DraftActionStatus;
}

function getContentKey(item: AdminContentSummary): string {
  return `${item.entityType}:${item.entityId}`;
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
}: {
  draftActionStatus: DraftActionStatus;
  draftPreview: AdminContentDraft | null;
  item: AdminContentSummary | null;
  locale: Locale;
  onCreateDraft: (item: AdminContentSummary) => void;
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
        <DraftPreview draft={draftPreview} locale={locale} />
      ) : (
        <p className="admin-content-muted">{t('admin.content.draftPreviewEmpty')}</p>
      )}
    </section>
  );
}

function DraftPreview({ draft, locale }: { draft: AdminContentDraft; locale: Locale }) {
  const { t } = useTranslation();
  const secondaryLocale: Locale = locale === 'vi' ? 'en' : 'vi';

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
    </section>
  );
}

function formatParentPath(item: AdminContentSummary): string {
  const parents = [item.courseId, item.moduleId, item.postId].filter(Boolean);

  return parents.join(' / ');
}
