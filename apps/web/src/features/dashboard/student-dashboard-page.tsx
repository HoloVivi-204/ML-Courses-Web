import { Activity, ArrowRight, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import {
  formatAlgorithmName,
  formatLessonLabel,
  formatPracticeLabel,
  formatScenarioName,
} from '../../shared/user-facing-labels';
import type {
  LearningApiClient,
  LearningCourseProgress,
  LearningProgressSnapshot,
  PlaygroundRunRecord,
} from '../learning/learning-api';

interface StudentDashboardPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

interface DashboardData {
  nextRunsCursor: string | null;
  progressSnapshot: LearningProgressSnapshot;
  runs: PlaygroundRunRecord[];
}

type DashboardStatus = 'failed' | 'loading' | 'ready';

export function StudentDashboardPage({ learningApiClient, locale }: StudentDashboardPageProps) {
  const { t } = useTranslation();
  const { getIdToken, user } = useAuth();
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingMoreRuns, setIsLoadingMoreRuns] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        const idToken = await getIdToken();

        if (!idToken || !user) {
          throw new Error('Authenticated dashboard request is missing identity.');
        }

        const [progressSnapshot, runsPage] = await Promise.all([
          learningApiClient.getProgress(idToken),
          learningApiClient.listPlaygroundRuns({
            idToken,
            limit: 12,
          }),
        ]);

        const normalizedRunsPage = Array.isArray(runsPage)
          ? { nextCursor: null, runs: runsPage }
          : runsPage;

        if (isActive) {
          setDashboardData({
            nextRunsCursor: normalizedRunsPage.nextCursor,
            progressSnapshot,
            runs: normalizedRunsPage.runs,
          });
          setStatus('ready');
        }
      } catch {
        if (isActive) {
          setStatus('failed');
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [getIdToken, learningApiClient, user]);

  async function loadMoreRuns() {
    if (!dashboardData?.nextRunsCursor || isLoadingMoreRuns) {
      return;
    }

    setIsLoadingMoreRuns(true);

    try {
      const idToken = await getIdToken();

      if (!idToken) {
        return;
      }

      const nextPage = await learningApiClient.listPlaygroundRuns({
        cursor: dashboardData.nextRunsCursor,
        idToken,
        limit: 12,
      });
      const normalizedNextPage = Array.isArray(nextPage)
        ? { nextCursor: null, runs: nextPage }
        : nextPage;

      setDashboardData((current) =>
        current
          ? {
              ...current,
              nextRunsCursor: normalizedNextPage.nextCursor,
              runs: [...current.runs, ...normalizedNextPage.runs],
            }
          : current,
      );
    } finally {
      setIsLoadingMoreRuns(false);
    }
  }

  if (status === 'loading') {
    return (
      <main className="student-dashboard-page page-shell" role="status">
        {t('dashboard.loading')}
      </main>
    );
  }

  if (status === 'failed' || !dashboardData) {
    return (
      <main className="student-dashboard-page page-shell">
        <p className="dashboard-error" role="alert">
          {t('dashboard.error')}
        </p>
      </main>
    );
  }

  return (
    <main className="student-dashboard-page page-shell">
      <section className="student-dashboard-heading">
        <span className="eyebrow">{t('dashboard.eyebrow')}</span>
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.intro')}</p>
      </section>

      <div className="dashboard-trust-grid">
        <VerifiedLearningPanel locale={locale} progressSnapshot={dashboardData.progressSnapshot} />
        <ClientComputedRunsPanel
          isLoadingMore={isLoadingMoreRuns}
          locale={locale}
          nextCursor={dashboardData.nextRunsCursor}
          onLoadMore={loadMoreRuns}
          runs={dashboardData.runs}
        />
      </div>
    </main>
  );
}

function VerifiedLearningPanel({
  locale,
  progressSnapshot,
}: {
  locale: Locale;
  progressSnapshot: LearningProgressSnapshot;
}) {
  const { t } = useTranslation();
  const courses = getDashboardCourses(progressSnapshot);
  const playgroundActivity = progressSnapshot.playgroundActivity ?? [];

  return (
    <section className="dashboard-panel dashboard-panel-verified">
      <div className="dashboard-panel-heading">
        <ShieldCheck aria-hidden="true" size={22} />
        <div>
          <h2>{t('dashboard.verified.title')}</h2>
          <p>
            {t('dashboard.verified.courseCount', { count: formatCount(courses.length, locale) })}
          </p>
        </div>
      </div>

      <div className="dashboard-course-list">
        {courses.map((courseProgress) => (
          <CourseProgressCard
            courseProgress={courseProgress}
            key={courseProgress.courseId}
            locale={locale}
          />
        ))}
      </div>

      {progressSnapshot.algorithmUnlocks.length ? (
        <ul className="dashboard-chip-list" aria-label={t('dashboard.verified.unlockLabel')}>
          {progressSnapshot.algorithmUnlocks.map((unlock) => (
            <li key={unlock.algorithmId}>
              {t('dashboard.verified.algorithmUnlocked', {
                algorithm: formatAlgorithmName(unlock.algorithmId, locale),
              })}
            </li>
          ))}
        </ul>
      ) : (
        <p className="dashboard-muted">{t('dashboard.verified.noUnlocks')}</p>
      )}

      {playgroundActivity.length ? (
        <section
          className="dashboard-verified-activity"
          aria-label={t('dashboard.verified.activityLabel')}
        >
          <h3>{t('dashboard.verified.activityTitle')}</h3>
          <ul className="dashboard-list">
            {playgroundActivity.map((activity) => (
              <li key={`${activity.scenarioId}:${activity.algorithmId}`}>
                <span>{formatScenarioName(activity.scenarioId, locale)}</span>
                <span>
                  {t('dashboard.verified.activityCounts', {
                    algorithm: formatAlgorithmName(activity.algorithmId, locale),
                    failedRunCount: formatCount(activity.failedRunCount, locale),
                    runCount: formatCount(activity.runCount, locale),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function CourseProgressCard({
  courseProgress,
  locale,
}: {
  courseProgress: LearningCourseProgress;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const course = getCourse(courseProgress.courseId);
  const completedStepCount = courseProgress.modules.reduce(
    (total, moduleProgress) => total + moduleProgress.completedStepCount,
    0,
  );
  const requiredStepCount = courseProgress.modules.reduce(
    (total, moduleProgress) => total + moduleProgress.requiredStepCount,
    0,
  );

  return (
    <article className="dashboard-course-card">
      <div className="dashboard-course-heading">
        <div>
          <h3>
            {course ? localize(course.title, locale) : locale === 'vi' ? 'Khóa học' : 'Course'}
          </h3>
          <p>
            {t('dashboard.verified.courseProgress', {
              progressPercent: formatPercentNumber(courseProgress.progressPercent, locale),
            })}
          </p>
        </div>
        <span className="dashboard-status-badge">
          {t(`dashboard.verified.courseStatus.${courseProgress.status}`)}
        </span>
      </div>

      <p className="dashboard-course-step-summary">
        {t('dashboard.verified.moduleSteps', {
          completed: formatCount(completedStepCount, locale),
          required: formatCount(requiredStepCount, locale),
        })}
      </p>

      <ul className="dashboard-module-list" aria-label={t('dashboard.verified.moduleLabel')}>
        {courseProgress.modules.map((moduleProgress) => {
          const module = course?.modules?.find(
            (candidate) => candidate.id === moduleProgress.moduleId,
          );
          const modulePosts = courseProgress.posts.filter((postProgress) =>
            module?.postIds.includes(postProgress.postId),
          );

          return (
            <li key={moduleProgress.moduleId}>
              <div className="dashboard-progress-row">
                <span>{module ? localize(module.title, locale) : 'Module'}</span>
                <strong>{formatProgressPercent(moduleProgress.progressPercent, locale)}</strong>
              </div>
              {moduleProgress.missingConditions?.length ? (
                <p className="dashboard-muted">
                  {t('dashboard.verified.missingConditions', {
                    conditions: formatMissingConditions(
                      moduleProgress.missingConditions,
                      course,
                      locale,
                    ),
                  })}
                </p>
              ) : null}
              {modulePosts.length ? (
                <ul className="dashboard-post-list" aria-label={t('dashboard.verified.postLabel')}>
                  {modulePosts.map((postProgress) => {
                    const postIndex = module?.postIds.indexOf(postProgress.postId) ?? -1;

                    return (
                      <li key={postProgress.postId}>
                        <span>
                          {postIndex >= 0
                            ? formatLessonLabel(postIndex + 1, locale)
                            : locale === 'vi'
                              ? 'Bài học'
                              : 'Lesson'}
                        </span>
                        <span>
                          {t(
                            postProgress.completed
                              ? 'dashboard.verified.post.completed'
                              : 'dashboard.verified.post.inProgress',
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      {courseProgress.quizzes.length ? (
        <ul className="dashboard-list" aria-label={t('dashboard.verified.quizLabel')}>
          {courseProgress.quizzes.map((quiz) => (
            <li key={quiz.quizId}>
              <BookOpenCheck aria-hidden="true" size={17} />
              <span>
                {t(`dashboard.verified.quiz.${quiz.quizKind}`, {
                  attempts: t(
                    quiz.attemptCount === 1
                      ? 'dashboard.verified.quiz.attempts.one'
                      : 'dashboard.verified.quiz.attempts.other',
                    { count: formatCount(quiz.attemptCount, locale) },
                  ),
                  score: formatQuizScoreForLocale(quiz.bestScore, locale),
                  status: t(
                    quiz.passed
                      ? 'dashboard.verified.quiz.passed'
                      : 'dashboard.verified.quiz.notPassed',
                  ),
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        className="module-trial-link dashboard-course-action"
        to={`/learn/${courseProgress.courseId}`}
      >
        {t('dashboard.verified.openCourse')}
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </article>
  );
}

function ClientComputedRunsPanel({
  isLoadingMore,
  locale,
  nextCursor,
  onLoadMore,
  runs,
}: {
  isLoadingMore: boolean;
  locale: Locale;
  nextCursor: string | null;
  onLoadMore: () => Promise<void>;
  runs: readonly PlaygroundRunRecord[];
}) {
  const { t } = useTranslation();

  return (
    <section className="dashboard-panel dashboard-panel-client">
      <div className="dashboard-panel-heading">
        <Activity aria-hidden="true" size={22} />
        <div>
          <h2>{t('dashboard.client.title')}</h2>
          <p>{t('dashboard.client.runCount', { count: formatCount(runs.length, locale) })}</p>
        </div>
      </div>

      {runs.length ? (
        <ul className="dashboard-run-list">
          {runs.map((run, runIndex) => (
            <li key={run.runId}>
              <div>
                <strong>{t('dashboard.client.runLabel', { number: runIndex + 1 })}</strong>
                <span>{t('verification.client')}</span>
              </div>
              <p>
                {t('dashboard.client.accuracy', {
                  accuracy: formatOptionalPercentForLocale(
                    run.metrics.accuracy,
                    locale,
                    t('dashboard.client.notAvailable'),
                  ),
                })}
              </p>
              <p>
                {t('dashboard.client.duration', {
                  duration: new Intl.NumberFormat(getIntlLocale(locale)).format(run.durationMs),
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dashboard-muted">{t('dashboard.client.empty')}</p>
      )}

      <div className="dashboard-client-actions">
        {nextCursor ? (
          <button disabled={isLoadingMore} onClick={() => void onLoadMore()} type="button">
            {isLoadingMore ? t('dashboard.client.loadingMore') : t('dashboard.client.loadMore')}
          </button>
        ) : null}
        <Link className="module-trial-link" to="/playground">
          {t('dashboard.client.openPlayground')}
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>
    </section>
  );
}

function getDashboardCourses(progressSnapshot: LearningProgressSnapshot): LearningCourseProgress[] {
  const enrolledCatalogCourses = (progressSnapshot.courseCatalog ?? []).filter(
    (courseProgress) => courseProgress.status !== 'not-enrolled',
  );

  if (enrolledCatalogCourses.length) {
    return enrolledCatalogCourses;
  }

  const enrolledCourses = (progressSnapshot.courses ?? []).filter(
    (courseProgress) => courseProgress.status !== 'not-enrolled',
  );

  if (enrolledCourses.length) {
    return enrolledCourses;
  }

  if (progressSnapshot.enrollment.status === 'not-enrolled') {
    return [];
  }

  return [
    {
      courseId: progressSnapshot.enrollment.courseId,
      demos: progressSnapshot.demos,
      modules: progressSnapshot.modules,
      posts: progressSnapshot.posts,
      progressPercent: progressSnapshot.enrollment.progressPercent,
      quizzes: progressSnapshot.quizzes,
      status: progressSnapshot.enrollment.status,
    },
  ];
}

function getIntlLocale(locale: Locale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

function formatMissingConditions(
  conditions: readonly string[] | undefined,
  course: ReturnType<typeof getCourse>,
  locale: Locale,
): string {
  if (!conditions?.length) {
    return locale === 'vi' ? 'các bước còn lại' : 'the remaining steps';
  }

  return conditions
    .map((condition) => {
      const [kind, value] = condition.split(':', 2);

      if (kind === 'overview') {
        return locale === 'vi' ? 'tổng quan module' : 'module overview';
      }

      if (kind === 'post') {
        const index =
          course?.modules?.flatMap((module) => module.postIds).indexOf(value ?? '') ?? -1;

        return index >= 0
          ? formatLessonLabel(index + 1, locale)
          : locale === 'vi'
            ? 'bài học'
            : 'lesson';
      }

      if (kind === 'demo') {
        return formatPracticeLabel(locale);
      }

      if (kind === 'quiz') {
        return locale === 'vi' ? 'quiz' : 'quiz';
      }

      if (kind === 'module') {
        const module = course?.modules?.find((candidate) => candidate.id === value);

        return module
          ? localize(module.title, locale)
          : locale === 'vi'
            ? 'module trước'
            : 'previous module';
      }

      return locale === 'vi' ? 'bước tiếp theo' : 'the next step';
    })
    .join(', ');
}

function formatPercent(value: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(value);
}

function formatPercentNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatProgressPercent(value: number, locale: Locale): string {
  return `${formatPercentNumber(value, locale)}%`;
}

function formatOptionalPercentForLocale(
  value: number | null | undefined,
  locale: Locale,
  fallback: string,
): string {
  return typeof value === 'number' ? formatPercent(value, locale) : fallback;
}

function formatQuizScoreForLocale(score: number, locale: Locale): string {
  if (locale === 'en') {
    return formatQuizScore(score);
  }

  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 2,
  }).format(score);
}

function formatQuizScore(score: number) {
  if (Number.isInteger(score)) {
    return `${score}`;
  }

  return score.toFixed(2).replace(/\.?0+$/, '');
}
