import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import type { Locale } from '../catalog/course-data';
import type { AdminContentSummary, LearningApiClient } from '../learning/learning-api';

interface AdminContentPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type LoadStatus = 'failed' | 'loading' | 'ready';

function getContentKey(item: AdminContentSummary): string {
  return `${item.entityType}:${item.entityId}`;
}

export function AdminContentPage({ learningApiClient, locale }: AdminContentPageProps) {
  const { t } = useTranslation();
  const { getIdToken } = useAuth();
  const [content, setContent] = useState<readonly AdminContentSummary[]>([]);
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
          <ContentPreview item={selectedContent} locale={locale} />
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

function ContentPreview({ item, locale }: { item: AdminContentSummary | null; locale: Locale }) {
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
    </section>
  );
}

function formatParentPath(item: AdminContentSummary): string {
  const parents = [item.courseId, item.moduleId, item.postId].filter(Boolean);

  return parents.join(' / ');
}
