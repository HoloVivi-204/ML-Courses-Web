import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import {
  rememberLearningAccessGrant,
  rememberLearningContentAccessGrants,
} from './learning-access-store';
import type { LearningApiClient, LearningProgressSnapshot } from './learning-api';
import { formatAlgorithmName, getPlaygroundPathForAlgorithm } from './playground-link-mapping';

interface LearningCoursePageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type EnrollmentStatus = 'failed' | 'ready' | 'syncing';

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function LearningCoursePage({ learningApiClient, locale }: LearningCoursePageProps) {
  const { t } = useTranslation();
  const { getIdToken, user } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const course = getCourse(courseId);
  const firstModule = course?.modules?.[0];
  const idempotencyKey = useRef(createIdempotencyKey());
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('syncing');
  const [overviewStatus, setOverviewStatus] = useState<EnrollmentStatus>('ready');
  const [progressSnapshot, setProgressSnapshot] = useState<LearningProgressSnapshot | null>(null);

  useEffect(() => {
    if (!course) {
      return undefined;
    }

    const selectedCourse = course;
    let isActive = true;

    async function enroll() {
      setEnrollmentStatus('syncing');

      try {
        const idToken = await getIdToken();

        if (!idToken || !user) {
          throw new Error('Authenticated user is missing an ID token or user identity.');
        }

        const enrollmentResult = await learningApiClient.enrollCourse({
          courseId: selectedCourse.id,
          idToken,
          idempotencyKey: idempotencyKey.current,
        });

        rememberLearningAccessGrant({
          courseId: selectedCourse.id,
          moduleId: enrollmentResult.access.moduleId,
          uid: user.uid,
        });

        const nextProgressSnapshot = await learningApiClient.getProgress(idToken);

        rememberLearningContentAccessGrants({
          contentAccess: nextProgressSnapshot.contentAccess,
          courseId: selectedCourse.id,
          uid: user.uid,
        });

        if (isActive) {
          setProgressSnapshot(nextProgressSnapshot);
          setEnrollmentStatus('ready');
        }
      } catch {
        if (isActive) {
          setEnrollmentStatus('failed');
        }
      }
    }

    void enroll();

    return () => {
      isActive = false;
    };
  }, [course, getIdToken, learningApiClient, user]);

  if (!course || !firstModule) {
    return (
      <main className="not-found page-shell">
        <span aria-hidden="true">404 / LEARNING</span>
        <h1>{t('learning.notFound.title')}</h1>
        <p>{t('learning.notFound.body')}</p>
        <Link className="primary-link" to="/courses">
          {t('learning.notFound.back')}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </main>
    );
  }

  async function openFirstModuleOverview() {
    if (!course || !firstModule) {
      return;
    }

    setOverviewStatus('syncing');

    try {
      const idToken = await getIdToken();

      if (!idToken || !user) {
        throw new Error('Authenticated user is missing an ID token or user identity.');
      }

      const result = await learningApiClient.recordModuleOverview({
        idToken,
        moduleId: firstModule.id,
      });

      rememberLearningAccessGrant({
        courseId: course.id,
        moduleId: result.moduleOverview.moduleId,
        postId: result.moduleOverview.nextPostId,
        uid: user.uid,
      });
      setOverviewStatus('ready');
      navigate(`/learn/${course.id}/posts/${result.moduleOverview.nextPostId}`);
    } catch {
      setOverviewStatus('failed');
    }
  }

  return (
    <main className="learning-course-page page-shell">
      <Link className="breadcrumb-link" to={`/courses/${course.id}`}>
        <ArrowLeft aria-hidden="true" size={16} />
        {t('learning.backToCourse')}
      </Link>

      <section className="learning-course-card">
        <span className="eyebrow">{t('learning.eyebrow')}</span>
        <h1>{t('learning.title', { title: localize(course.title, locale) })}</h1>
        <p>{t('learning.intro')}</p>

        <p className="learning-sync-state" role="status">
          {t(`learning.enrollment.${enrollmentStatus}`)}
        </p>

        {progressSnapshot ? <VerifiedProgressPanel progressSnapshot={progressSnapshot} /> : null}

        <div className="learning-open-module">
          <span className="module-state open">
            <Sparkles aria-hidden="true" size={14} />
            {t('learning.firstModuleState')}
          </span>
          <h2>{localize(firstModule.title, locale)}</h2>
          <p>{localize(firstModule.description, locale)}</p>
          <button
            className="primary-link"
            disabled={enrollmentStatus !== 'ready' || overviewStatus === 'syncing'}
            onClick={() => void openFirstModuleOverview()}
            type="button"
          >
            {t('learning.openModuleOverview')}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          {overviewStatus === 'failed' ? (
            <p className="learning-sync-state" role="status">
              {t('learning.overview.failed')}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function VerifiedProgressPanel({
  progressSnapshot,
}: {
  progressSnapshot: LearningProgressSnapshot;
}) {
  const { i18n, t } = useTranslation();
  const firstModule = progressSnapshot.modules[0];
  const unlockedAlgorithms = progressSnapshot.algorithmUnlocks;

  return (
    <section className="learning-progress-panel" aria-label={t('learning.progress.label')}>
      <p>
        {t('learning.progress.verified', { percent: progressSnapshot.enrollment.progressPercent })}
      </p>
      {firstModule ? (
        <p>
          {t('learning.progress.moduleSteps', {
            completed: firstModule.completedStepCount,
            required: firstModule.requiredStepCount,
          })}
        </p>
      ) : null}
      {progressSnapshot.quizzes.length ? (
        <ul aria-label={t('learning.progress.quiz.label')} className="learning-progress-quiz-list">
          {progressSnapshot.quizzes.map((quiz) => (
            <li className={quiz.passed ? 'is-passed' : ''} key={quiz.quizId}>
              {t(`learning.progress.quiz.${quiz.quizKind}`, {
                attempts: formatQuizAttemptCount(quiz.attemptCount, i18n.resolvedLanguage),
                score: formatQuizScore(quiz.bestScore),
                status: t(
                  quiz.passed
                    ? 'learning.progress.quiz.passed'
                    : 'learning.progress.quiz.notPassed',
                ),
              })}
            </li>
          ))}
        </ul>
      ) : null}
      {unlockedAlgorithms.length ? (
        <>
          <ul className="learning-progress-algorithm-list">
            {unlockedAlgorithms.map((unlock) => (
              <li key={unlock.algorithmId}>
                {t('learning.progress.algorithmUnlocked', {
                  algorithm: formatAlgorithmName(unlock.algorithmId),
                })}
              </li>
            ))}
          </ul>
          {unlockedAlgorithms
            .map((unlock) => ({
              algorithmId: unlock.algorithmId,
              playgroundPath: getPlaygroundPathForAlgorithm(unlock.algorithmId),
            }))
            .filter((unlock) => unlock.playgroundPath !== null)
            .map((unlock) => (
              <Link
                className="module-trial-link"
                key={unlock.algorithmId}
                to={unlock.playgroundPath!}
              >
                {t('learning.progress.openPlayground')}: {formatAlgorithmName(unlock.algorithmId)}
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            ))}
        </>
      ) : null}
    </section>
  );
}

function formatQuizAttemptCount(attemptCount: number, resolvedLanguage: string | undefined) {
  if (resolvedLanguage === 'vi') {
    return `${attemptCount} lần làm`;
  }

  return attemptCount === 1 ? `${attemptCount} attempt` : `${attemptCount} attempts`;
}

function formatQuizScore(score: number) {
  if (Number.isInteger(score)) {
    return `${score}`;
  }

  return score.toFixed(2).replace(/\.?0+$/, '');
}
