import { ArrowLeft, ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type CourseSummary, type Locale } from '../catalog/course-data';
import {
  LearningApiError,
  type LearningApiClient,
  type LearningCourseContent,
  type LearningModuleContent,
  type LearningCourseProgress,
  type LearningProgressSnapshot,
} from './learning-api';
import {
  getLearningCourseProgress,
  getLearningModuleProgressEntries,
  type LearningModuleProgressEntry,
} from './learning-progression';
import { formatAlgorithmName, getPlaygroundPathForAlgorithm } from './playground-link-mapping';
import { getPlaygroundLocationPath } from '../playground/playground-navigation';

interface LearningCoursePageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type EnrollmentStatus = 'failed' | 'ready' | 'syncing';

interface EnrollmentTask {
  key: string;
  promise: Promise<EnrollmentLoadResult>;
}

interface EnrollmentLoadResult {
  courseContent: LearningCourseContent;
  moduleContents: readonly LearningModuleContent[];
  progressSnapshot: LearningProgressSnapshot;
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
  const [courseContent, setCourseContent] = useState<LearningCourseContent | null>(null);
  const [moduleContents, setModuleContents] = useState<readonly LearningModuleContent[]>([]);
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
      setCourseContent(null);
      setModuleContents([]);
      setProgressSnapshot(null);

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
                moduleIds: (selectedCourse.modules ?? []).map((module) => module.id),
              });

        enrollmentTaskRef.current = enrollmentTask;
        const result = await enrollmentTask.promise;

        if (isActive) {
          setCourseContent(result.courseContent);
          setModuleContents(result.moduleContents);
          setProgressSnapshot(result.progressSnapshot);
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
  const moduleContentById = new Map(
    moduleContents.map((moduleContent) => [moduleContent.moduleId, moduleContent]),
  );
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
        <h1>
          {courseContent ? localize(courseContent.title, locale) : t('learning.enrollment.syncing')}
        </h1>
        <p>
          {courseContent
            ? localize(courseContent.description, locale)
            : t('learning.enrollment.syncing')}
        </p>

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
              moduleContent={moduleContentById.get(entry.module.id)}
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
  moduleIds: readonly string[];
}): EnrollmentTask {
  return {
    key: input.key,
    promise: (async () => {
      let continuingProgress: LearningProgressSnapshot | null = null;

      try {
        await input.learningApiClient.enrollCourse({
          courseId: input.courseId,
          idToken: input.idToken,
          idempotencyKey: input.idempotencyKey,
        });
      } catch (error) {
        if (!(error instanceof LearningApiError) || error.code !== 'CONTENT_NOT_PUBLISHED') {
          throw error;
        }

        const progressSnapshot = await input.learningApiClient.getProgress(input.idToken);

        if (!hasContinuingCourseEnrollment(progressSnapshot, input.courseId)) {
          throw error;
        }

        continuingProgress = progressSnapshot;
      }

      const [courseContent, moduleContents, progressSnapshot] = await Promise.all([
        input.learningApiClient.getCourseContent(input.courseId),
        Promise.all(
          input.moduleIds.map((moduleId) => input.learningApiClient.getModuleContent(moduleId)),
        ),
        continuingProgress ?? input.learningApiClient.getProgress(input.idToken),
      ]);

      if (
        courseContent.courseId !== input.courseId ||
        moduleContents.some(
          (moduleContent, index) =>
            moduleContent.courseId !== input.courseId ||
            moduleContent.moduleId !== input.moduleIds[index],
        )
      ) {
        throw new Error('Published learner content does not match the requested course structure.');
      }

      return { courseContent, moduleContents, progressSnapshot };
    })(),
  };
}

function hasContinuingCourseEnrollment(
  progressSnapshot: LearningProgressSnapshot,
  courseId: string,
): boolean {
  const courseProgress = getLearningCourseProgress(progressSnapshot, courseId);
  const status =
    courseProgress?.status ??
    (progressSnapshot.enrollment.courseId === courseId
      ? progressSnapshot.enrollment.status
      : 'not-enrolled');

  return status === 'in-progress' || status === 'completed';
}

function LearningModuleCard({
  course,
  entry,
  locale,
  moduleContent,
}: {
  course: CourseSummary;
  entry: LearningModuleProgressEntry;
  locale: Locale;
  moduleContent: LearningModuleContent | undefined;
}) {
  const { t } = useTranslation();
  const isLocked = entry.progress.status === 'locked';
  const stateKey = `learning.moduleRoadmap.state.${entry.progress.status}` as const;
  const cardClassName = isLocked
    ? 'learning-module-card is-locked'
    : 'learning-module-card is-open';
  const cardActionLabel = t(
    entry.progress.overviewViewed ? 'learning.moduleRoadmap.resume' : 'learning.moduleRoadmap.open',
  );
  const missingPrerequisiteNames = entry.missingPrerequisiteIds
    .map((prerequisiteId) => course.modules?.find((candidate) => candidate.id === prerequisiteId))
    .filter(
      (prerequisite): prerequisite is NonNullable<typeof prerequisite> =>
        prerequisite !== undefined,
    )
    .map((prerequisite) => localize(prerequisite.title, locale));

  const cardContent = (
    <>
      <div className="learning-module-card-index" aria-hidden="true">
        {String(entry.module.index).padStart(2, '0')}
      </div>
      <div className="learning-module-card-body">
        <div className="learning-module-card-heading">
          <div>
            <h3>
              {moduleContent
                ? localize(moduleContent.title, locale)
                : localize(entry.module.title, locale)}
            </h3>
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
        <p>
          {moduleContent
            ? localize(moduleContent.description, locale)
            : t('learning.enrollment.syncing')}
        </p>
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
            {missingPrerequisiteNames.length ? (
              <p>
                {t('learning.moduleRoadmap.missingPrerequisites', {
                  modules: missingPrerequisiteNames.join(locale === 'vi' ? ' và ' : ' and '),
                })}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="module-trial-link">
            {cardActionLabel}
            <ArrowRight aria-hidden="true" size={17} />
          </span>
        )}
      </div>
    </>
  );

  if (isLocked) {
    return (
      <article className={cardClassName} data-module-id={entry.module.id}>
        {cardContent}
      </article>
    );
  }

  return (
    <Link
      aria-label={cardActionLabel}
      className={cardClassName}
      data-module-id={entry.module.id}
      to={`/learn/${course.id}/modules/${entry.module.id}`}
    >
      {cardContent}
    </Link>
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
  const location = useLocation();
  const currentModule =
    moduleEntries.find((entry) => entry.progress.status === 'in-progress') ??
    moduleEntries.find((entry) => entry.progress.status === 'completed');
  const quizzes = courseProgress?.quizzes ?? progressSnapshot.quizzes;

  return (
    <section className="learning-progress-panel" aria-label={t('learning.progress.label')}>
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
                state={{ from: getPlaygroundLocationPath(location) }}
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
