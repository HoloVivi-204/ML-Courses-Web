import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowLeft, Clock3, MoveRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import { ContentBlockNavigation, ContentBlockRenderer } from './content-block-renderer';
import type { ExternalResource } from './content-block-types';
import type { LearningApiClient, LearningPostContent, PostViewResult } from './learning-api';

interface TrialPostPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

interface PostContentLoadState {
  fullStatus: 'failed' | 'idle' | 'loading' | 'ready';
  routeKey: string;
  trialStatus: 'failed' | 'loading' | 'ready';
}

interface PostViewSyncState {
  pending: boolean;
  promise: Promise<PostViewResult | null> | null;
  routeKey: string | null;
}

function isRequiredContentBlock(value: unknown): value is { id: string; required: boolean } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'required' in value &&
    typeof value.id === 'string' &&
    value.required === true
  );
}

export function TrialPostPage({ learningApiClient, locale }: TrialPostPageProps) {
  const { t } = useTranslation();
  const { getIdToken, status, user } = useAuth();
  const navigate = useNavigate();
  const { courseId, postId } = useParams();
  const uid = user?.uid;
  const routeKey = courseId && postId ? `${courseId}:${postId}` : null;
  const [loadedTrialPost, setLoadedTrialPost] = useState<{
    post: LearningPostContent;
    routeKey: string;
  } | null>(null);
  const [loadedFullPost, setLoadedFullPost] = useState<{
    post: LearningPostContent;
    routeKey: string;
    uid: string;
  } | null>(null);
  const [postContentLoadState, setPostContentLoadState] = useState<PostContentLoadState | null>(
    null,
  );
  const [savedReadingPosition, setSavedReadingPosition] = useState<string | null>(null);
  const [postViewSyncError, setPostViewSyncError] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const postViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observedItemIdsRef = useRef(new Set<string>());
  const readingPositionRef = useRef<string | null>(null);
  const restoredReadingPositionRef = useRef<string | null>(null);
  const postViewSyncStateRef = useRef<PostViewSyncState>({
    pending: false,
    promise: null,
    routeKey: null,
  });
  const trialPost = loadedTrialPost?.routeKey === routeKey ? loadedTrialPost.post : null;
  const fullPost =
    status === 'authenticated' &&
    loadedFullPost?.routeKey === routeKey &&
    loadedFullPost.uid === uid
      ? loadedFullPost.post
      : null;
  const post = fullPost ?? trialPost;
  const hasFullAccess = post?.accessLevel === 'full';
  const currentLoadState =
    postContentLoadState?.routeKey === routeKey ? postContentLoadState : null;
  const isTrialLoading =
    routeKey !== null &&
    !trialPost &&
    (currentLoadState === null || currentLoadState.trialStatus === 'loading');
  const isFullLoading =
    status === 'authenticated' &&
    routeKey !== null &&
    !fullPost &&
    (currentLoadState === null ||
      (currentLoadState.fullStatus !== 'failed' && currentLoadState.fullStatus !== 'ready'));
  const isContentLoading = !post && (isTrialLoading || isFullLoading);

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

    const syncState = postViewSyncStateRef.current;

    if (syncState.routeKey !== routeKey) {
      syncState.pending = false;
      syncState.promise = null;
      syncState.routeKey = routeKey;
    }

    syncState.pending = true;

    if (syncState.promise) {
      return syncState.promise;
    }

    const syncPromise = (async () => {
      let latestPostViewResult: PostViewResult | null = null;

      while (syncState.pending && syncState.routeKey === routeKey) {
        syncState.pending = false;
        const readingPosition = readingPositionRef.current;
        const viewedItemIds = [...observedItemIdsRef.current];

        if (!readingPosition || viewedItemIds.length === 0) {
          return latestPostViewResult;
        }

        try {
          const idToken = await getIdToken();

          if (!idToken) {
            throw new Error('Authenticated user is missing an ID token.');
          }

          if (syncState.routeKey !== routeKey) {
            return null;
          }

          const postViewResult = await learningApiClient.recordPostView({
            idToken,
            postId,
            readingPosition,
            viewedItemIds,
          });

          if (syncState.routeKey !== routeKey) {
            return null;
          }

          observedItemIdsRef.current = new Set([
            ...observedItemIdsRef.current,
            ...postViewResult.postView.viewedItemIds,
          ]);
          latestPostViewResult = postViewResult;
        } catch {
          // Progress sync is retried as the learner continues through required blocks.
          if (!syncState.pending) {
            return null;
          }
        }
      }

      return latestPostViewResult;
    })();

    syncState.promise = syncPromise;
    void syncPromise.then(
      () => {
        if (syncState.promise === syncPromise) {
          syncState.promise = null;
        }
      },
      () => {
        if (syncState.promise === syncPromise) {
          syncState.promise = null;
        }
      },
    );

    return syncPromise;
  }, [courseId, getIdToken, hasFullAccess, learningApiClient, postId, routeKey, status, uid]);

  const recordExternalResourceOpen = useCallback(
    (resource: ExternalResource) => {
      if (status !== 'authenticated' || !postId) {
        return;
      }

      void (async () => {
        try {
          const idToken = await getIdToken();

          if (!idToken) {
            return;
          }

          await learningApiClient.recordLearningEvent({
            eventType: 'external_resource_opened',
            idToken,
            idempotencyKey: `external-resource-opened-${postId}-${resource.sourceId}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
            payload: {
              postId,
              resourceType: resource.resourceType,
              sourceId: resource.sourceId,
            },
          });
        } catch {
          // Analytics failure must not block opening the resource.
        }
      })();
    },
    [getIdToken, learningApiClient, postId, status],
  );

  const restoreSavedReadingPosition = useCallback(() => {
    if (!savedReadingPosition || !articleRef.current) {
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
    postViewSyncStateRef.current.pending = false;
    postViewSyncStateRef.current.promise = null;
    postViewSyncStateRef.current.routeKey = routeKey;

    if (postViewTimerRef.current !== null) {
      clearTimeout(postViewTimerRef.current);
      postViewTimerRef.current = null;
    }
  }, [routeKey]);

  useEffect(() => {
    if (!routeKey || !courseId || !postId) {
      return undefined;
    }

    let isActive = true;
    const activeCourseId = courseId;
    const activePostId = postId;
    const activeRouteKey = routeKey;

    async function loadTrialPost() {
      try {
        const trialPost = await learningApiClient.getTrialPostContent(activePostId);

        if (trialPost.courseId !== activeCourseId) {
          throw new Error('The trial post does not belong to the requested course.');
        }

        if (isActive) {
          setLoadedTrialPost({ post: trialPost, routeKey: activeRouteKey });
          setPostContentLoadState((currentState) =>
            currentState?.routeKey === activeRouteKey
              ? { ...currentState, trialStatus: 'ready' }
              : {
                  fullStatus: 'idle',
                  routeKey: activeRouteKey,
                  trialStatus: 'ready',
                },
          );
        }
      } catch {
        if (isActive) {
          setPostContentLoadState((currentState) =>
            currentState?.routeKey === activeRouteKey
              ? { ...currentState, trialStatus: 'failed' }
              : {
                  fullStatus: 'idle',
                  routeKey: activeRouteKey,
                  trialStatus: 'failed',
                },
          );
        }
      }
    }

    void loadTrialPost();

    return () => {
      isActive = false;
    };
  }, [courseId, learningApiClient, postId, routeKey]);

  useEffect(() => {
    if (status !== 'authenticated' || !routeKey || !courseId || !postId || !uid) {
      return undefined;
    }

    let isActive = true;
    const activeCourseId = courseId;
    const activePostId = postId;
    const activeRouteKey = routeKey;
    const activeUid = uid;

    async function loadFullPost() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const fullPost = await learningApiClient.getFullPostContent({
          idToken,
          postId: activePostId,
        });

        if (fullPost.courseId !== activeCourseId || fullPost.accessLevel !== 'full') {
          throw new Error('The full post response is not valid for this route.');
        }

        if (isActive) {
          setLoadedFullPost({ post: fullPost, routeKey: activeRouteKey, uid: activeUid });
          setPostContentLoadState((currentState) =>
            currentState?.routeKey === activeRouteKey
              ? { ...currentState, fullStatus: 'ready' }
              : {
                  fullStatus: 'ready',
                  routeKey: activeRouteKey,
                  trialStatus: 'loading',
                },
          );
        }
      } catch {
        if (isActive) {
          setPostContentLoadState((currentState) =>
            currentState?.routeKey === activeRouteKey
              ? { ...currentState, fullStatus: 'failed' }
              : {
                  fullStatus: 'failed',
                  routeKey: activeRouteKey,
                  trialStatus: 'loading',
                },
          );
        }
      }
    }

    void loadFullPost();

    return () => {
      isActive = false;
    };
  }, [courseId, getIdToken, learningApiClient, postId, routeKey, status, uid]);

  useEffect(() => {
    if (status !== 'authenticated' || !post || !hasFullAccess || !postId || !uid) {
      return undefined;
    }

    let isActive = true;
    const activePostId = postId;

    async function loadSavedPostProgress() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const progressSnapshot = await learningApiClient.getProgress(idToken);
        const savedPostProgress = progressSnapshot.posts.find(
          (item) => item.postId === activePostId,
        );

        if (isActive) {
          setSavedReadingPosition(savedPostProgress?.readingPosition ?? null);
          observedItemIdsRef.current = new Set([
            ...observedItemIdsRef.current,
            ...(savedPostProgress?.viewedItemIds ?? []),
          ]);
          readingPositionRef.current =
            savedPostProgress?.readingPosition ?? readingPositionRef.current;
        }
      } catch {
        // Full content remains readable after authorization; progress can be retried by later activity.
      }
    }

    void loadSavedPostProgress();

    return () => {
      isActive = false;
    };
  }, [getIdToken, hasFullAccess, learningApiClient, post, postId, status, uid]);

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
      post.blocks.filter(isRequiredContentBlock).map((block) => block.id),
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
    restoredReadingPositionRef.current = null;
  }, [locale]);

  useEffect(() => {
    if (
      !savedReadingPosition ||
      restoredReadingPositionRef.current === savedReadingPosition ||
      !articleRef.current
    ) {
      return;
    }

    restoreSavedReadingPosition();
  }, [locale, restoreSavedReadingPosition, savedReadingPosition]);

  if (isContentLoading) {
    return (
      <main className="route-loading page-shell" role="status">
        {t('route.loading')}
      </main>
    );
  }

  if (!post) {
    return <TrialPostNotFoundPage />;
  }

  const eyebrowKey = post.accessLevel === 'full' ? 'trial.fullEyebrow' : 'trial.eyebrow';
  const module = getCourse(post.courseId)?.modules?.find((item) => item.id === post.moduleId);
  const backToLearningPath =
    hasFullAccess && module
      ? {
          label: 'trial.backToModule' as const,
          path: `/learn/${post.courseId}/modules/${post.moduleId}`,
        }
      : {
          label: 'trial.backToCourse' as const,
          path: `/courses/${post.courseId}`,
        };
  const demoPath =
    post.accessLevel === 'full' && module?.demoId
      ? `/learn/${post.courseId}/demos/${module.demoId}`
      : null;
  const quizPath =
    post.accessLevel === 'full' ? `/learn/${post.courseId}/quizzes/${post.postQuizId}` : null;
  const summaryBackPath = hasFullAccess ? `/learn/${post.courseId}` : `/courses/${post.courseId}`;
  const summaryBackLabel = hasFullAccess ? 'trial.summary.back' : 'trial.backToCourse';

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
      <Link className="breadcrumb-link" to={backToLearningPath.path}>
        <ArrowLeft aria-hidden="true" size={16} />
        {t(backToLearningPath.label)}
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
          <span>{module ? localize(module.title, locale) : t('trial.moduleLabel')}</span>
          <MoveRight aria-hidden="true" size={15} />
          <strong>{localize(post.title, locale)}</strong>
        </div>
      </header>

      {hasFullAccess && savedReadingPosition ? (
        <aside
          aria-label={t('trial.resumeReading.title')}
          className="trial-resume-banner"
          data-reading-position={savedReadingPosition}
        >
          <div>
            <strong>{t('trial.resumeReading.title')}</strong>
            <p>{t('trial.resumeReading.body', { position: savedReadingPosition })}</p>
          </div>
          <button className="secondary-link" onClick={restoreSavedReadingPosition} type="button">
            {t('trial.resumeReading.cta')}
          </button>
        </aside>
      ) : null}

      <div className="trial-reading-layout">
        <aside className="trial-contents">
          <ContentBlockNavigation blocks={post.blocks} locale={locale} postId={post.id} />
        </aside>

        <article className="trial-article" ref={articleRef}>
          <ContentBlockRenderer
            blocks={post.blocks}
            locale={locale}
            onOpenResource={recordExternalResourceOpen}
            postId={post.id}
          />

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
            <Link className="secondary-link" to={summaryBackPath}>
              {t(summaryBackLabel)}
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
      <span aria-hidden="true">404 / LESSON</span>
      <h1>{t('trial.notFound.title')}</h1>
      <p>{t('trial.notFound.body')}</p>
      <Link className="primary-link" to="/courses">
        {t('trial.notFound.back')}
      </Link>
    </main>
  );
}
