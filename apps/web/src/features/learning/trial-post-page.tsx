import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowLeft, Clock3, MoveRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import { ContentBlockNavigation, ContentBlockRenderer } from './content-block-renderer';
import {
  hasLearningPostAccess,
  rememberLearningContentAccessGrants,
} from './learning-access-store';
import type { LearningApiClient, PostViewResult } from './learning-api';
import { getReadablePost } from './trial-post-data';

interface TrialPostPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

export function TrialPostPage({ learningApiClient, locale }: TrialPostPageProps) {
  const { t } = useTranslation();
  const { getIdToken, status, user } = useAuth();
  const navigate = useNavigate();
  const { courseId, postId } = useParams();
  const uid = user?.uid;
  const accessKey =
    status === 'authenticated' && courseId && postId && uid ? `${uid}:${courseId}:${postId}` : null;
  const [verifiedAccessKey, setVerifiedAccessKey] = useState<string | null>(null);
  const [savedReadingPosition, setSavedReadingPosition] = useState<string | null>(null);
  const [postViewSyncError, setPostViewSyncError] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const postViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observedItemIdsRef = useRef(new Set<string>());
  const readingPositionRef = useRef<string | null>(null);
  const restoredReadingPositionRef = useRef<string | null>(null);
  const hasStoredFullAccess =
    status === 'authenticated' && hasLearningPostAccess(courseId, postId, uid);
  const hasBackendFullAccess = accessKey !== null && verifiedAccessKey === accessKey;
  const hasFullAccess = hasStoredFullAccess || hasBackendFullAccess;
  const post = getReadablePost(courseId, postId, hasFullAccess);

  const syncPostView = useCallback(async (): Promise<PostViewResult | null> => {
    if (
      status !== 'authenticated' ||
      !courseId ||
      !postId ||
      !uid ||
      !hasFullAccess ||
      !readingPositionRef.current ||
      observedItemIdsRef.current.size === 0
    ) {
      return null;
    }

    try {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authenticated user is missing an ID token.');
      }

      const postViewResult = await learningApiClient.recordPostView({
        idToken,
        postId,
        readingPosition: readingPositionRef.current,
        viewedItemIds: [...observedItemIdsRef.current],
      });

      observedItemIdsRef.current = new Set([
        ...observedItemIdsRef.current,
        ...postViewResult.postView.viewedItemIds,
      ]);
      return postViewResult;
    } catch {
      // Progress sync is retried as the learner continues through required blocks.
      return null;
    }
  }, [courseId, getIdToken, hasFullAccess, learningApiClient, postId, status, uid]);

  const queuePostView = useCallback(
    (blockId: string) => {
      observedItemIdsRef.current.add(blockId);
      readingPositionRef.current = blockId;

      if (postViewTimerRef.current !== null) {
        clearTimeout(postViewTimerRef.current);
      }

      postViewTimerRef.current = setTimeout(() => {
        postViewTimerRef.current = null;
        void syncPostView();
      }, 250);
    },
    [syncPostView],
  );

  useEffect(() => {
    observedItemIdsRef.current = new Set();
    readingPositionRef.current = null;
    restoredReadingPositionRef.current = null;

    if (postViewTimerRef.current !== null) {
      clearTimeout(postViewTimerRef.current);
      postViewTimerRef.current = null;
    }
  }, [accessKey]);

  useEffect(() => {
    if (status !== 'authenticated' || !accessKey || !courseId || !postId || !uid) {
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
        const savedPostProgress = progressSnapshot.posts.find(
          (item) => item.postId === activePostId,
        );

        if (isActive) {
          setVerifiedAccessKey(hasProgressPostAccess ? activeAccessKey : null);
          setSavedReadingPosition(savedPostProgress?.readingPosition ?? null);
          observedItemIdsRef.current = new Set([
            ...observedItemIdsRef.current,
            ...(savedPostProgress?.viewedItemIds ?? []),
          ]);
          readingPositionRef.current =
            savedPostProgress?.readingPosition ?? readingPositionRef.current;
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
  }, [accessKey, courseId, getIdToken, learningApiClient, postId, status, uid]);

  useEffect(() => {
    if (
      !post ||
      !hasFullAccess ||
      status !== 'authenticated' ||
      !articleRef.current ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return undefined;
    }

    const requiredBlockIds = new Set(
      post.blocks.filter((block) => block.required).map((block) => block.id),
    );
    const targets = [
      ...articleRef.current.querySelectorAll<HTMLElement>('[data-content-block-id]'),
    ].filter((element) => {
      const blockId = element.dataset.contentBlockId;

      return blockId !== undefined && requiredBlockIds.has(blockId);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const blockId = (entry.target as HTMLElement).dataset.contentBlockId;

          if (entry.isIntersecting && blockId) {
            queuePostView(blockId);
          }
        }
      },
      { threshold: 0.1 },
    );

    for (const target of targets) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasFullAccess, post, queuePostView, status]);

  useEffect(() => {
    if (
      !savedReadingPosition ||
      restoredReadingPositionRef.current === savedReadingPosition ||
      !articleRef.current
    ) {
      return;
    }

    const target = document.getElementById(savedReadingPosition);

    if (
      !target ||
      !articleRef.current.contains(target) ||
      typeof target.scrollIntoView !== 'function'
    ) {
      return;
    }

    restoredReadingPositionRef.current = savedReadingPosition;
    target.scrollIntoView({ block: 'start' });
  }, [savedReadingPosition]);

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

  async function openQuiz(event: MouseEvent<HTMLAnchorElement>) {
    if (!quizPath) {
      return;
    }

    event.preventDefault();
    setPostViewSyncError(false);

    if (postViewTimerRef.current !== null) {
      clearTimeout(postViewTimerRef.current);
      postViewTimerRef.current = null;
    }

    const postViewResult = await syncPostView();

    if (postViewResult?.postView.contentViewed) {
      navigate(quizPath);
      return;
    }

    setPostViewSyncError(true);
  }

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

        <article className="trial-article" ref={articleRef}>
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
              <Link className="secondary-link" to={quizPath} onClick={openQuiz}>
                {t('trial.summary.openQuiz')}
                <MoveRight aria-hidden="true" size={17} />
              </Link>
            ) : null}
            {postViewSyncError ? <p role="alert">{t('trial.postViewRequired')}</p> : null}
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
