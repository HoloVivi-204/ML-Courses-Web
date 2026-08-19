import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import { formatLessonLabel, formatPracticeLabel } from '../../shared/user-facing-labels';
import type {
  LearningApiClient,
  LearningCourseProgress,
  LearningProgressSnapshot,
} from '../learning/learning-api';

interface StudentDashboardPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

interface DashboardData {
  progressSnapshot: LearningProgressSnapshot;
}

type DashboardStatus = 'failed' | 'loading' | 'ready';

export function StudentDashboardPage({ learningApiClient, locale }: StudentDashboardPageProps) {
  const { t } = useTranslation();
  const { getIdToken, user } = useAuth();
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        const idToken = await getIdToken();

        if (!idToken || !user) {
          throw new Error('Authenticated dashboard request is missing identity.');
        }

        const progressSnapshot = await learningApiClient.getProgress(idToken);

        if (isActive) {
          setDashboardData({ progressSnapshot });
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

  const courses = getDashboardCourses(dashboardData.progressSnapshot);
  const primaryCourse = getPrimaryDashboardCourse(courses);
  const otherCourses = primaryCourse
    ? courses.filter((courseProgress) => courseProgress.courseId !== primaryCourse.courseId)
    : [];

  return (
    <main className="student-dashboard-page page-shell">
      <header className="student-dashboard-heading">
        <span className="eyebrow">{t('dashboard.eyebrow')}</span>
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.intro')}</p>
      </header>

      {primaryCourse ? (
        <FocusCourseCard courseProgress={primaryCourse} locale={locale} />
      ) : (
        <EmptyDashboardCard />
      )}

      {otherCourses.length ? (
        <section
          aria-labelledby="dashboard-other-courses-title"
          className="dashboard-other-courses"
        >
          <div className="dashboard-section-heading">
            <h2 className="dashboard-section-title" id="dashboard-other-courses-title">
              {t('dashboard.courses.heading')}
            </h2>
          </div>
          <div className="dashboard-compact-course-list">
            {otherCourses.map((courseProgress) => (
              <CompactCourseCard
                courseProgress={courseProgress}
                key={courseProgress.courseId}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function FocusCourseCard({
  courseProgress,
  locale,
}: {
  courseProgress: LearningCourseProgress;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const course = getCourse(courseProgress.courseId);
  const progressPercent = getProgressValue(courseProgress.progressPercent);
  const { completedStepCount, requiredStepCount } = getCourseStepSummary(courseProgress);
  const nextCondition = getNextDashboardCondition(courseProgress);
  const isComplete = courseProgress.status === 'completed' || progressPercent >= 100;
  const nextStep = nextCondition
    ? formatMissingConditions([nextCondition], course, locale)
    : isComplete
      ? t('dashboard.focus.completed')
      : t('dashboard.focus.nextFallback');
  const title = course ? localize(course.title, locale) : t('dashboard.courses.fallbackTitle');

  return (
    <section aria-labelledby="dashboard-focus-title" className="dashboard-focus-card">
      <div className="dashboard-focus-header">
        <div className="dashboard-focus-mark" aria-hidden="true">
          <BookOpen size={23} />
        </div>
        <div className="dashboard-focus-heading">
          <span className="eyebrow">{t('dashboard.focus.eyebrow')}</span>
          <h2 id="dashboard-focus-title">{title}</h2>
          <p>{t(`dashboard.focus.status.${courseProgress.status}`)}</p>
        </div>
        <strong className="dashboard-focus-percent">
          {formatProgressPercent(progressPercent, locale)}
        </strong>
      </div>

      <div
        aria-label={t('dashboard.focus.progressLabel')}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progressPercent}
        className="dashboard-focus-progress"
        role="progressbar"
      >
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="dashboard-focus-meta">
        <span>
          {t('dashboard.focus.steps', {
            completed: formatCount(completedStepCount, locale),
            required: formatCount(requiredStepCount, locale),
          })}
        </span>
        <span>
          {isComplete ? <CheckCircle2 size={15} /> : null}
          {isComplete ? ` ${nextStep}` : t('dashboard.focus.next', { step: nextStep })}
        </span>
      </div>

      <Link
        className="primary-link dashboard-focus-action"
        to={`/learn/${courseProgress.courseId}`}
      >
        {t('dashboard.focus.cta')}
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </section>
  );
}

function CompactCourseCard({
  courseProgress,
  locale,
}: {
  courseProgress: LearningCourseProgress;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const course = getCourse(courseProgress.courseId);
  const progressPercent = getProgressValue(courseProgress.progressPercent);
  const title = course ? localize(course.title, locale) : t('dashboard.courses.fallbackTitle');

  return (
    <article className="dashboard-compact-course">
      <div className="dashboard-compact-course-heading">
        <div>
          <h3>{title}</h3>
          <p>{t(`dashboard.focus.status.${courseProgress.status}`)}</p>
        </div>
        <strong>{formatProgressPercent(progressPercent, locale)}</strong>
      </div>
      <div className="dashboard-compact-progress" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>
      <Link className="module-trial-link" to={`/learn/${courseProgress.courseId}`}>
        {t('dashboard.courses.open')}
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </article>
  );
}

function EmptyDashboardCard() {
  const { t } = useTranslation();

  return (
    <section className="dashboard-empty-card">
      <span className="eyebrow">{t('dashboard.focus.eyebrow')}</span>
      <h2>{t('dashboard.empty.title')}</h2>
      <p>{t('dashboard.empty.body')}</p>
      <Link className="primary-link" to="/courses">
        {t('dashboard.empty.cta')}
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
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

function getPrimaryDashboardCourse(
  courses: readonly LearningCourseProgress[],
): LearningCourseProgress | null {
  return (
    courses.find((courseProgress) => courseProgress.status === 'in-progress') ?? courses[0] ?? null
  );
}

function getCourseStepSummary(courseProgress: LearningCourseProgress) {
  return {
    completedStepCount: courseProgress.modules.reduce(
      (total, moduleProgress) => total + moduleProgress.completedStepCount,
      0,
    ),
    requiredStepCount: courseProgress.modules.reduce(
      (total, moduleProgress) => total + moduleProgress.requiredStepCount,
      0,
    ),
  };
}

function getNextDashboardCondition(courseProgress: LearningCourseProgress): string | null {
  for (const moduleProgress of courseProgress.modules) {
    const nextCondition = moduleProgress.missingConditions?.[0];

    if (nextCondition) {
      return nextCondition;
    }
  }

  return null;
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
        return 'quiz';
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

function formatProgressPercent(value: number, locale: Locale): string {
  return `${new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 0,
  }).format(value)}%`;
}

function getProgressValue(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}
