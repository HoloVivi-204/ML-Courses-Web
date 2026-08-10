import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import type {
  LearningApiClient,
  LearningModuleContent,
  LearningProgressSnapshot,
  LearningQuizContent,
} from './learning-api';
import {
  getLearningCourseProgress,
  getLearningModuleProgressEntries,
} from './learning-progression';

interface LearningModulePageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type ModuleLoadStatus = 'failed' | 'loading' | 'ready';

interface ModuleLoadTask {
  key: string;
  promise: Promise<ModuleLoadResult>;
}

interface ModuleLoadResult {
  moduleContent: LearningModuleContent;
  moduleQuizContent: LearningQuizContent;
  nextPostId: string;
  progressSnapshot: LearningProgressSnapshot;
}

export function LearningModulePage({ learningApiClient, locale }: LearningModulePageProps) {
  const { t } = useTranslation();
  const { getIdToken, user } = useAuth();
  const { courseId, moduleId } = useParams();
  const course = getCourse(courseId);
  const module = course?.modules?.find((candidate) => candidate.id === moduleId);
  const routeKey = courseId && moduleId ? `${courseId}:${moduleId}` : null;
  const loadTaskRef = useRef<ModuleLoadTask | null>(null);
  const [loadStatus, setLoadStatus] = useState<ModuleLoadStatus>('loading');
  const [loadedRouteKey, setLoadedRouteKey] = useState<string | null>(null);
  const [moduleContent, setModuleContent] = useState<LearningModuleContent | null>(null);
  const [moduleQuizContent, setModuleQuizContent] = useState<LearningQuizContent | null>(null);
  const [progressSnapshot, setProgressSnapshot] = useState<LearningProgressSnapshot | null>(null);
  const [nextPostId, setNextPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!routeKey || !course || !module || !user) {
      return undefined;
    }

    let isActive = true;
    const activeModule = module;
    const activeRouteKey = routeKey;
    const taskKey = `${user.uid}:${activeRouteKey}`;
    const existingTask = loadTaskRef.current;
    const loadTask =
      existingTask?.key === taskKey
        ? existingTask
        : createModuleLoadTask({
            idToken: getIdToken,
            key: taskKey,
            learningApiClient,
            courseId: course.id,
            moduleId: activeModule.id,
            moduleQuizId: getModuleQuizId(activeModule.id),
            postIds: activeModule.postIds,
          });

    loadTaskRef.current = loadTask;

    loadTask.promise
      .then((result) => {
        if (isActive) {
          setLoadedRouteKey(activeRouteKey);
          setModuleContent(result.moduleContent);
          setModuleQuizContent(result.moduleQuizContent);
          setProgressSnapshot(result.progressSnapshot);
          setNextPostId(result.nextPostId);
          setLoadStatus('ready');
        }
      })
      .catch(() => {
        if (isActive) {
          setLoadedRouteKey(activeRouteKey);
          setLoadStatus('failed');
        }
      });

    return () => {
      isActive = false;
    };
  }, [course, getIdToken, learningApiClient, module, routeKey, user]);

  if (!course || !module || !routeKey) {
    return <LearningModuleNotFoundPage />;
  }

  if (loadStatus === 'loading' || loadedRouteKey !== routeKey) {
    return (
      <main className="route-loading page-shell" role="status">
        {t('learning.moduleOverview.loading')}
      </main>
    );
  }

  if (loadStatus === 'failed' || !moduleContent || !moduleQuizContent || !progressSnapshot) {
    return <LearningModuleLockedPage courseId={course.id} />;
  }

  const moduleProgressEntry = getLearningModuleProgressEntries(course, progressSnapshot).find(
    (entry) => entry.module.id === module.id,
  );

  if (!moduleProgressEntry || moduleProgressEntry.progress.status === 'locked') {
    return <LearningModuleLockedPage courseId={course.id} />;
  }

  const courseProgress = getLearningCourseProgress(progressSnapshot, course.id);
  const contentAccess = new Set(
    progressSnapshot.contentAccess.map((item) => `${item.contentType}:${item.entityId}`),
  );
  const postProgressById = new Map(
    (courseProgress?.posts ?? progressSnapshot.posts).map((post) => [post.postId, post]),
  );
  const moduleQuizId = getModuleQuizId(module.id);
  const completedPosts = module.postIds.every(
    (postId) => postProgressById.get(postId)?.completed === true,
  );
  const demoCompleted = module.demoId
    ? progressSnapshot.demos.some((demo) => demo.demoId === module.demoId && demo.completed)
    : true;
  const isModuleQuizOpen = completedPosts && demoCompleted;
  const firstIncompletePostId = module.postIds.find(
    (postId) => postProgressById.get(postId)?.completed !== true,
  );

  return (
    <main className="learning-module-page page-shell">
      <Link className="breadcrumb-link" to={`/learn/${course.id}`}>
        <ArrowLeft aria-hidden="true" size={16} />
        {t('learning.moduleOverview.back')}
      </Link>

      <header className="learning-module-heading">
        <div className="learning-module-heading-kicker">
          <span className="eyebrow">{t('learning.moduleOverview.eyebrow')}</span>
          <span className="module-state open">
            <Sparkles aria-hidden="true" size={14} />
            {t(`learning.moduleRoadmap.state.${moduleProgressEntry.progress.status}`)}
          </span>
        </div>
        <code>{module.id}</code>
        <h1>{localize(moduleContent.title, locale)}</h1>
        <p>{localize(moduleContent.description, locale)}</p>
        <p className="learning-module-progress-summary">
          {t('learning.moduleOverview.progress', {
            completed: moduleProgressEntry.progress.completedStepCount,
            percent: moduleProgressEntry.progress.progressPercent,
            required: moduleProgressEntry.progress.requiredStepCount,
          })}
        </p>
      </header>

      <section
        aria-labelledby="learning-module-sequence-title"
        className="learning-module-sequence"
      >
        <div className="learning-module-sequence-heading">
          <span className="eyebrow">{t('learning.moduleOverview.sequenceEyebrow')}</span>
          <h2 id="learning-module-sequence-title">{t('learning.moduleOverview.sequenceTitle')}</h2>
          <p>{t('learning.moduleOverview.sequenceIntro')}</p>
        </div>

        <ol className="learning-module-step-list">
          {module.postIds.map((postId, index) => {
            const isPostOpen = contentAccess.has(`post:${postId}`);
            const postProgress = postProgressById.get(postId);
            const isResume = postProgress?.started === true && postProgress.completed !== true;
            const isNextPost = postId === (firstIncompletePostId ?? nextPostId);

            return (
              <li className="learning-module-step-card" key={postId}>
                <span className="learning-module-step-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <span className="eyebrow">{t('learning.moduleOverview.postLabel')}</span>
                  <h3>{postId}</h3>
                  {isPostOpen ? (
                    <Link
                      className="module-trial-link"
                      data-next-post={isNextPost ? 'true' : undefined}
                      to={`/learn/${course.id}/posts/${postId}`}
                    >
                      {postProgress?.completed
                        ? t('learning.moduleOverview.reviewPost')
                        : isResume
                          ? t('learning.moduleOverview.resumePost')
                          : t('learning.moduleOverview.openPost')}
                      <ArrowRight aria-hidden="true" size={17} />
                    </Link>
                  ) : (
                    <LockedCondition
                      body={t('learning.moduleOverview.postLockedReason')}
                      title={t('learning.moduleOverview.lockedTitle')}
                    />
                  )}
                </div>
                {postProgress?.completed ? (
                  <CheckCircle2 aria-label={t('learning.moduleOverview.completed')} size={19} />
                ) : null}
              </li>
            );
          })}

          {module.demoId ? (
            <li className="learning-module-step-card" key={module.demoId}>
              <span className="learning-module-step-number">DEMO</span>
              <div>
                <span className="eyebrow">{t('learning.moduleOverview.demoLabel')}</span>
                <h3>{module.demoId}</h3>
                {contentAccess.has(`demo:${module.demoId}`) ? (
                  <Link
                    className="module-trial-link"
                    to={`/learn/${course.id}/demos/${module.demoId}`}
                  >
                    {t('learning.moduleOverview.openDemo')}
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                ) : (
                  <LockedCondition
                    body={t('learning.moduleOverview.demoLockedReason')}
                    title={t('learning.moduleOverview.lockedTitle')}
                  />
                )}
              </div>
            </li>
          ) : null}

          <li className="learning-module-step-card" key={moduleQuizId}>
            <span className="learning-module-step-number">QUIZ</span>
            <div>
              <span className="eyebrow">{t('learning.moduleOverview.quizLabel')}</span>
              <h3>{localize(moduleQuizContent.title, locale)}</h3>
              <p>{localize(moduleQuizContent.description, locale)}</p>
              {isModuleQuizOpen ? (
                <Link
                  className="module-trial-link"
                  to={`/learn/${course.id}/quizzes/${moduleQuizId}`}
                >
                  {t('learning.moduleOverview.openQuiz')}
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              ) : (
                <LockedCondition
                  body={t('learning.moduleOverview.quizLockedReason')}
                  title={t('learning.moduleOverview.lockedTitle')}
                />
              )}
            </div>
          </li>
        </ol>
      </section>
    </main>
  );
}

function createModuleLoadTask(input: {
  courseId: string;
  idToken: () => Promise<string | null>;
  key: string;
  learningApiClient: LearningApiClient;
  moduleId: string;
  moduleQuizId: string;
  postIds: readonly string[];
}): ModuleLoadTask {
  return {
    key: input.key,
    promise: (async () => {
      const idToken = await input.idToken();

      if (!idToken) {
        throw new Error('Authenticated user is missing an ID token.');
      }

      const moduleOverview = await input.learningApiClient.recordModuleOverview({
        idToken,
        moduleId: input.moduleId,
      });

      if (
        moduleOverview.moduleOverview.moduleId !== input.moduleId ||
        !input.postIds.includes(moduleOverview.moduleOverview.nextPostId)
      ) {
        throw new Error('The module overview response does not match the requested module.');
      }

      const [moduleContent, moduleQuizContent, progressSnapshot] = await Promise.all([
        input.learningApiClient.getModuleContent(input.moduleId),
        input.learningApiClient.getQuizContent(input.moduleQuizId),
        input.learningApiClient.getProgress(idToken),
      ]);

      if (
        moduleContent.courseId !== input.courseId ||
        moduleContent.moduleId !== input.moduleId ||
        moduleQuizContent.courseId !== input.courseId ||
        moduleQuizContent.moduleId !== input.moduleId ||
        moduleQuizContent.quizId !== input.moduleQuizId ||
        moduleQuizContent.postId !== undefined
      ) {
        throw new Error('Published learner content does not match the requested module structure.');
      }

      return {
        moduleContent,
        moduleQuizContent,
        nextPostId: moduleOverview.moduleOverview.nextPostId,
        progressSnapshot,
      };
    })(),
  };
}

function getModuleQuizId(moduleId: string): string {
  const stablePrefix = /^(cml|dl)-m\d{2}/.exec(moduleId)?.[0];

  return stablePrefix ? `quiz-module-${stablePrefix}` : `quiz-module-${moduleId}`;
}

function LockedCondition({ body, title }: { body: string; title: string }) {
  return (
    <div className="learning-module-condition" role="note">
      <LockKeyhole aria-hidden="true" size={15} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}

function LearningModuleLockedPage({ courseId }: { courseId: string }) {
  const { t } = useTranslation();

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">403 / MODULE</span>
      <h1>{t('learning.moduleOverview.lockedPageTitle')}</h1>
      <p>{t('learning.moduleOverview.lockedPageBody')}</p>
      <Link className="primary-link" to={`/learn/${courseId}`}>
        {t('learning.moduleOverview.back')}
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </main>
  );
}

function LearningModuleNotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">404 / MODULE</span>
      <h1>{t('learning.notFound.title')}</h1>
      <p>{t('learning.notFound.body')}</p>
      <Link className="primary-link" to="/courses">
        {t('learning.notFound.back')}
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </main>
  );
}
