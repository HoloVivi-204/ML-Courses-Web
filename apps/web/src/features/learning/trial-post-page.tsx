import { ArrowLeft, Clock3, MoveRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { localize, type Locale } from '../catalog/course-data';
import { ContentBlockNavigation, ContentBlockRenderer } from './content-block-renderer';
import { hasLearningPostAccess } from './learning-access-store';
import { getReadablePost } from './trial-post-data';

interface TrialPostPageProps {
  locale: Locale;
}

export function TrialPostPage({ locale }: TrialPostPageProps) {
  const { t } = useTranslation();
  const { status, user } = useAuth();
  const { courseId, postId } = useParams();
  const hasFullAccess =
    status === 'authenticated' && hasLearningPostAccess(courseId, postId, user?.uid);
  const post = getReadablePost(courseId, postId, hasFullAccess);

  if (!post) {
    return <TrialPostNotFoundPage />;
  }

  const eyebrowKey = post.accessLevel === 'full' ? 'trial.fullEyebrow' : 'trial.eyebrow';

  return (
    <main className="trial-post-page page-shell">
      <Link className="breadcrumb-link" to={`/courses/${post.courseId}`}>
        <ArrowLeft aria-hidden="true" size={16} />
        {t('trial.backToCourse')}
      </Link>
      <header className="trial-post-heading">
        <div className="trial-post-kicker">
          <span className="eyebrow">{t(eyebrowKey)}</span>
          <span className="trial-post-duration">
            <Clock3 aria-hidden="true" size={15} />
            {t('trial.duration', { count: post.durationMinutes })}
          </span>
        </div>
        <h1>{localize(post.title, locale)}</h1>
        <p>{localize(post.description, locale)}</p>
        <div className="trial-post-identity" aria-label={t('trial.identityLabel')}>
          <span>{post.moduleId}</span>
          <MoveRight aria-hidden="true" size={15} />
          <strong>{post.id}</strong>
        </div>
      </header>

      <div className="trial-reading-layout">
        <aside className="trial-contents">
          <ContentBlockNavigation blocks={post.blocks} locale={locale} postId={post.id} />
        </aside>

        <article className="trial-article">
          <ContentBlockRenderer blocks={post.blocks} locale={locale} postId={post.id} />

          <footer className="trial-lesson-summary">
            <span className="eyebrow">{t('trial.summary.eyebrow')}</span>
            <h2>{t('trial.summary.title')}</h2>
            <p>{t('trial.summary.body')}</p>
            <Link className="secondary-link" to={`/courses/${post.courseId}`}>
              {t('trial.summary.back')}
              <MoveRight aria-hidden="true" size={17} />
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}

function TrialPostNotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">404 / POST</span>
      <h1>{t('trial.notFound.title')}</h1>
      <p>{t('trial.notFound.body')}</p>
      <Link className="primary-link" to="/courses">
        {t('trial.notFound.back')}
      </Link>
    </main>
  );
}
