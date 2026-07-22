import { useEffect, useState } from 'react';
import { ArrowLeft, Clock3, MoveRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import { ContentBlockNavigation, ContentBlockRenderer } from './content-block-renderer';
import {
  hasLearningPostAccess,
  rememberLearningContentAccessGrants,
} from './learning-access-store';
import type { LearningApiClient } from './learning-api';
import { getReadablePost } from './trial-post-data';

interface TrialPostPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

export function TrialPostPage({ learningApiClient, locale }: TrialPostPageProps) {
  const { t } = useTranslation();
  const { getIdToken, status, user } = useAuth();
  const { courseId, postId } = useParams();
  const uid = user?.uid;
  const accessKey =
    status === 'authenticated' && courseId && postId && uid ? `${uid}:${courseId}:${postId}` : null;
  const [verifiedAccessKey, setVerifiedAccessKey] = useState<string | null>(null);
  const hasStoredFullAccess =
    status === 'authenticated' && hasLearningPostAccess(courseId, postId, uid);
  const hasBackendFullAccess = accessKey !== null && verifiedAccessKey === accessKey;
  const hasFullAccess = hasStoredFullAccess || hasBackendFullAccess;
  const post = getReadablePost(courseId, postId, hasFullAccess);

  useEffect(() => {
    if (
      status !== 'authenticated' ||
      !accessKey ||
      !courseId ||
      !postId ||
      !uid ||
      hasStoredFullAccess
    ) {
      return undefined;
    }

    let isActive = true;
    const activeAccessKey = accessKey;
    const activeCourseId = courseId;
    const activePostId = postId;
    const activeUid = uid;

    async function loadPostAccess() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const progressSnapshot = await learningApiClient.getProgress(idToken);

        rememberLearningContentAccessGrants({
          contentAccess: progressSnapshot.contentAccess,
          courseId: activeCourseId,
          uid: activeUid,
        });

        const hasProgressPostAccess = progressSnapshot.contentAccess.some(
          (item) => item.contentType === 'post' && item.entityId === activePostId,
        );

        if (isActive) {
          setVerifiedAccessKey(hasProgressPostAccess ? activeAccessKey : null);
        }
      } catch {
        if (isActive) {
          setVerifiedAccessKey(null);
        }
      }
    }

    void loadPostAccess();

    return () => {
      isActive = false;
    };
  }, [
    accessKey,
    courseId,
    getIdToken,
    hasStoredFullAccess,
    learningApiClient,
    postId,
    status,
    uid,
  ]);

  if (!post) {
    return <TrialPostNotFoundPage />;
  }

  const eyebrowKey = post.accessLevel === 'full' ? 'trial.fullEyebrow' : 'trial.eyebrow';
  const module = getCourse(post.courseId)?.modules?.find((item) => item.id === post.moduleId);
  const demoPath =
    post.accessLevel === 'full' && module?.demoId
      ? `/learn/${post.courseId}/demos/${module.demoId}`
      : null;
  const quizPath =
    post.accessLevel === 'full' ? `/learn/${post.courseId}/quizzes/${post.postQuizId}` : null;

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
            {demoPath ? (
              <Link className="primary-link" to={demoPath}>
                {t('trial.summary.openDemo')}
                <MoveRight aria-hidden="true" size={17} />
              </Link>
            ) : null}
            {quizPath ? (
              <Link className="secondary-link" to={quizPath}>
                {t('trial.summary.openQuiz')}
                <MoveRight aria-hidden="true" size={17} />
              </Link>
            ) : null}
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
