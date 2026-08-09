import { ArrowLeft, ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type CourseSummary, type Locale } from '../catalog/course-data';
import type {
  LearningApiClient,
  LearningCourseProgress,
  LearningProgressSnapshot,
} from './learning-api';
import {
  getLearningCourseProgress,
  getLearningModuleProgressEntries,
  type LearningModuleProgressEntry,
} from './learning-progression';
import { formatAlgorithmName, getPlaygroundPathForAlgorithm } from './playground-link-mapping';

interface LearningCoursePageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type EnrollmentStatus = 'failed' | 'ready' | 'syncing';

interface EnrollmentTask {
  key: string;
  promise: Promise<LearningProgressSnapshot>;
}

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function LearningCoursePage({ learningApiClient, locale }: LearningCoursePageProps) {
  const { t } = useTranslation();
  const { getIdToken, user } = useAuth();
  const { courseId } = useParams();
  const course = getCourse(courseId);
  const idempotencyKey = useRef(createIdempotencyKey());
  const enrollmentTaskRef = useRef<EnrollmentTask | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('syncing');
  const [progressSnapshot, setProgressSnapshot] = useState<LearningProgressSnapshot | null>(null);

  useEffect(() => {
    if (!course) {
      return undefined;
    }

    const selectedCourse = course;
    let isActive = true;
    let enrollmentTask: EnrollmentTask | null = null;

    async function enroll() {
      setEnrollmentStatus('syncing');

      try {
        const idToken = await getIdToken();

        if (!idToken || !user) {
          throw new Error('Authenticated user is missing an ID token or user identity.');
        }

        const taskKey = `${user.uid}:${selectedCourse.id}`;
        const existingTask = enrollmentTaskRef.current;
        enrollmentTask =
          existingTask?.key === taskKey
            ? existingTask
            : createEnrollmentTask({
                courseId: selectedCourse.id,
                idToken,
                idempotencyKey: idempotencyKey.current,
                key: taskKey,
                learningApiClient,
              });

        enrollmentTaskRef.current = enrollmentTask;
        const nextProgressSnapshot = await enrollmentTask.promise;

        if (isActive) {
          setProgressSnapshot(nextProgressSnapshot);
          setEnrollmentStatus('ready');
        }
      } catch {
        if (enrollmentTaskRef.current === enrollmentTask) {
          enrollmentTaskRef.current = null;
        }

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

  if (!course) {
    return <LearningCourseNotFoundPage />;
  }

  const moduleEntries = progressSnapshot
    ? getLearningModuleProgressEntries(course, progressSnapshot)
    : [];
  const courseProgress = progressSnapshot
    ? getLearningCourseProgress(progressSnapshot, course.id)
    : undefined;

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

        {progressSnapshot ? (
          <VerifiedProgressPanel
            courseProgress={courseProgress}
            moduleEntries={moduleEntries}
            progressSnapshot={progressSnapshot}
          />
        ) : null}
      </section>

      <section aria-labelledby="learning-module-roadmap-title" className="learning-module-roadmap">
        <div className="learning-module-roadmap-heading">
          <div>
            <span className="eyebrow">{t('learning.moduleRoadmap.eyebrow')}</span>
            <h2 id="learning-module-roadmap-title">{t('learning.moduleRoadmap.title')}</h2>
          </div>
          <p>{t('learning.moduleRoadmap.intro')}</p>
        </div>

        <div className="learning-module-list">
          {moduleEntries.map((entry) => (
            <LearningModuleCard
              course={course}
              entry={entry}
              key={entry.module.id}
              locale={locale}
            />
          ))}
        </div>

        {!moduleEntries.length && enrollmentStatus === 'ready' ? (
          <p className="learning-sync-state" role="status">
            {t('learning.moduleRoadmap.empty')}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function createEnrollmentTask(input: {
  courseId: string;
  idToken: string;
  idempotencyKey: string;
  key: string;
  learningApiClient: LearningApiClient;
}): EnrollmentTask {
  return {
    key: input.key,
    promise: (async () => {
      await input.learningApiClient.enrollCourse({
        courseId: input.courseId,
        idToken: input.idToken,
        idempotencyKey: input.idempotencyKey,
      });

      return input.learningApiClient.getProgress(input.idToken);
    })(),
  };
}

function LearningModuleCard({
  course,
  entry,
  locale,
}: {
  course: CourseSummary;
  entry: LearningModuleProgressEntry;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const isLocked = entry.progress.status === 'locked';
  const stateKey = `learning.moduleRoadmap.state.${entry.progress.status}` as const;

  return (
    <article
      className={isLocked ? 'learning-module-card is-locked' : 'learning-module-card'}
      data-module-id={entry.module.id}
    >
      <div className="learning-module-card-index" aria-hidden="true">
        {String(entry.module.index).padStart(2, '0')}
      </div>
      <div className="learning-module-card-body">
        <div className="learning-module-card-heading">
          <div>
            <code>{entry.module.id}</code>
            <h3>{localize(entry.module.title, locale)}</h3>
          </div>
          <span className={isLocked ? 'module-state' : 'module-state open'}>
            {isLocked ? (
              <LockKeyhole aria-hidden="true" size={14} />
            ) : (
              <Sparkles aria-hidden="true" size={14} />
            )}
            {t(stateKey)}
          </span>
        </div>
        <p>{localize(entry.module.description, locale)}</p>
        <div className="learning-module-card-progress">
          <span>
            {t('learning.moduleRoadmap.progress', {
              completed: entry.progress.completedStepCount,
              percent: entry.progress.progressPercent,
              required: entry.progress.requiredStepCount,
            })}
          </span>
          <div aria-hidden="true" className="learning-module-progress-track">
            <span style={{ width: `${entry.progress.progressPercent}%` }} />
          </div>
        </div>

        {isLocked ? (
          <div className="learning-module-lock" role="note">
            <strong>{t('learning.moduleRoadmap.lockedTitle')}</strong>
            <p>{t('learning.moduleRoadmap.lockedReason')}</p>
            {entry.missingPrerequisiteIds.length ? (
              <ul>
                {entry.missingPrerequisiteIds.map((prerequisiteId) => (
                  <li key={prerequisiteId}>
                    {t('learning.moduleRoadmap.missingPrerequisite', {
                      moduleId: prerequisiteId,
                    })}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <Link className="module-trial-link" to={`/learn/${course.id}/modules/${entry.module.id}`}>
            {t(
              entry.progress.overviewViewed
                ? 'learning.moduleRoadmap.resume'
                : 'learning.moduleRoadmap.open',
            )}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        )}
      </div>
    </article>
  );
}

function VerifiedProgressPanel({
  courseProgress,
  moduleEntries,
  progressSnapshot,
}: {
  courseProgress: LearningCourseProgress | undefined;
  moduleEntries: readonly LearningModuleProgressEntry[];
  progressSnapshot: LearningProgressSnapshot;
}) {
  const { i18n, t } = useTranslation();
  const currentModule =
    moduleEntries.find((entry) => entry.progress.status === 'in-progress') ??
    moduleEntries.find((entry) => entry.progress.status === 'completed');
  const quizzes = courseProgress?.quizzes ?? progressSnapshot.quizzes;
  const progressPercent =
    courseProgress?.progressPercent ?? progressSnapshot.enrollment.progressPercent;

  return (
    <section className="learning-progress-panel" aria-label={t('learning.progress.label')}>
      <p>{t('learning.progress.verified', { percent: progressPercent })}</p>
      {currentModule ? (
        <p>
          {t('learning.progress.moduleSteps', {
            completed: currentModule.progress.completedStepCount,
            required: currentModule.progress.requiredStepCount,
          })}
        </p>
      ) : null}
      {quizzes.length ? (
        <ul aria-label={t('learning.progress.quiz.label')} className="learning-progress-quiz-list">
          {quizzes.map((quiz) => (
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
      {progressSnapshot.algorithmUnlocks.length ? (
        <>
          <ul className="learning-progress-algorithm-list">
            {progressSnapshot.algorithmUnlocks.map((unlock) => (
              <li key={unlock.algorithmId}>
                {t('learning.progress.algorithmUnlocked', {
                  algorithm: formatAlgorithmName(unlock.algorithmId),
                })}
              </li>
            ))}
          </ul>
          {progressSnapshot.algorithmUnlocks
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
                {t('learning.progress.openPlayground', {
                  algorithm: formatAlgorithmName(unlock.algorithmId),
                })}
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

function LearningCourseNotFoundPage() {
  const { t } = useTranslation();

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
