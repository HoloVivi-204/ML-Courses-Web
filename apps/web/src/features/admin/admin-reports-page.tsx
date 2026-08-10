import { Activity, ArrowLeft, BarChart3, FileText, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { courses, localize, type Locale } from '../catalog/course-data';
import type { AdminReportSummary, LearningApiClient } from '../learning/learning-api';

interface AdminReportsPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type AdminReportsStatus = 'failed' | 'loading' | 'ready';

export function AdminReportsPage({ learningApiClient, locale }: AdminReportsPageProps) {
  const { t } = useTranslation();
  const { getIdToken } = useAuth();
  const [reportSummary, setReportSummary] = useState<AdminReportSummary | null>(null);
  const [status, setStatus] = useState<AdminReportsStatus>('loading');

  useEffect(() => {
    let isActive = true;

    async function loadReportSummary() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated admin report request is missing identity.');
        }

        const nextReportSummary = await learningApiClient.getAdminReportSummary({ idToken });

        if (isActive) {
          setReportSummary(nextReportSummary);
          setStatus('ready');
        }
      } catch {
        if (isActive) {
          setReportSummary(null);
          setStatus('failed');
        }
      }
    }

    void loadReportSummary();

    return () => {
      isActive = false;
    };
  }, [getIdToken, learningApiClient]);

  if (status === 'loading') {
    return (
      <main className="admin-reports-page page-shell" role="status">
        {t('admin.reports.loading')}
      </main>
    );
  }

  if (status === 'failed' || !reportSummary) {
    return (
      <main className="admin-reports-page page-shell">
        <section className="admin-report-error" role="alert">
          <h1>{t('admin.reports.forbiddenTitle')}</h1>
          <p>{t('admin.reports.forbidden')}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-reports-page page-shell">
      <Link className="breadcrumb-link" to="/admin/content">
        <ArrowLeft aria-hidden="true" size={16} />
        {t('admin.reports.back')}
      </Link>

      <section className="admin-report-hero">
        <div>
          <span className="eyebrow">{t('admin.reports.eyebrow')}</span>
          <h1>{t('admin.reports.title')}</h1>
          <p>{t('admin.reports.intro')}</p>
        </div>
        <div className="admin-report-generated">
          <BarChart3 aria-hidden="true" size={21} />
          <span>
            {t('admin.reports.generatedAt', {
              generatedAt: formatGeneratedAt(reportSummary.generatedAt, locale),
            })}
          </span>
        </div>
      </section>

      <div className="admin-report-grid">
        <LearningVerifiedReport locale={locale} reportSummary={reportSummary} />
        <PlaygroundClientReportedPanel locale={locale} reportSummary={reportSummary} />
      </div>

      <section className="admin-report-lifecycle" aria-label={t('admin.reports.lifecycleTitle')}>
        <FileText aria-hidden="true" size={18} />
        <strong>{t('admin.reports.lifecycleTitle')}</strong>
        <span>
          {t('admin.reports.lifecycleCounts', {
            draftCount: formatCount(reportSummary.contentLifecycle.draftCount, locale),
            publishedCount: formatCount(reportSummary.contentLifecycle.publishedCount, locale),
            validationPendingCount: formatCount(
              reportSummary.contentLifecycle.validationPendingCount,
              locale,
            ),
          })}
        </span>
      </section>
    </main>
  );
}

function LearningVerifiedReport({
  locale,
  reportSummary,
}: {
  locale: Locale;
  reportSummary: AdminReportSummary;
}) {
  const { t } = useTranslation();
  const learning = reportSummary.learningVerified;

  return (
    <section className="admin-report-panel admin-report-panel-verified">
      <div className="dashboard-panel-heading">
        <ShieldCheck aria-hidden="true" size={22} />
        <div>
          <h2>{t('admin.reports.learning.title')}</h2>
          <p data-count={String(learning.learnerCount)} data-testid="admin-report-learner-count">
            {t('admin.reports.learning.learnerCount', {
              count: formatCount(learning.learnerCount, locale),
            })}
          </p>
        </div>
      </div>

      <ul className="admin-report-list">
        {learning.courseProgress.map((courseProgress) => (
          <li
            data-average-progress-percent={String(courseProgress.averageProgressPercent)}
            data-completion-rate={String(courseProgress.completionRate)}
            data-enrolled-count={String(courseProgress.enrolledCount)}
            data-testid={`admin-report-course-${courseProgress.courseId}`}
            key={courseProgress.courseId}
          >
            <strong>{getCourseLabel(courseProgress.courseId, locale)}</strong>
            <small>{courseProgress.courseId}</small>
            <span>
              {t('admin.reports.learning.courseCounts', {
                completedCount: formatCount(courseProgress.completedCount, locale),
                enrolledCount: formatCount(courseProgress.enrolledCount, locale),
                startedCount: formatCount(courseProgress.startedCount, locale),
              })}
            </span>
            <span>
              {t('admin.reports.learning.averageProgress', {
                percent: formatPercentNumber(courseProgress.averageProgressPercent, locale),
              })}
            </span>
            <span>
              {t('admin.reports.learning.courseCompletion', {
                percent: formatRate(courseProgress.completionRate, locale),
              })}
            </span>
          </li>
        ))}
      </ul>

      <div className="admin-report-metric-row">
        <p
          data-average-score-percent={String(learning.quizSummary.averageScorePercent)}
          data-testid="admin-report-quiz-average"
        >
          {t('admin.reports.learning.quizAverage', {
            percent: formatPercentNumber(learning.quizSummary.averageScorePercent, locale),
          })}
        </p>
        <p
          data-testid="admin-report-quiz-attempts"
          data-total-attempt-count={String(learning.quizSummary.totalAttemptCount)}
          data-passed-attempt-count={String(learning.quizSummary.passedAttemptCount)}
        >
          {t('admin.reports.learning.quizAttempts', {
            passedAttemptCount: formatCount(learning.quizSummary.passedAttemptCount, locale),
            totalAttemptCount: formatCount(learning.quizSummary.totalAttemptCount, locale),
          })}
        </p>
        <p
          data-pass-rate={String(learning.quizSummary.passRate)}
          data-testid="admin-report-quiz-pass-rate"
        >
          {t('admin.reports.learning.quizPassRate', {
            percent: formatRate(learning.quizSummary.passRate, locale),
          })}
        </p>
      </div>

      <ul className="admin-report-list">
        {learning.quizSummary.commonWrongQuestions.map((question) => (
          <li key={`${question.quizId}:${question.questionId}`}>
            <strong>{question.quizId}</strong>
            <span>
              {t('admin.reports.learning.wrongQuestion', {
                questionId: question.questionId,
                wrongCount: formatCount(question.wrongCount, locale),
              })}
            </span>
          </li>
        ))}
      </ul>

      <ul className="dashboard-chip-list" aria-label={t('admin.reports.learning.unlocks')}>
        {learning.algorithmUnlocks.map((unlock) => (
          <li key={unlock.algorithmId}>
            {t('admin.reports.learning.unlockCount', {
              algorithm: formatAlgorithmName(unlock.algorithmId),
              count: formatCount(unlock.unlockedLearnerCount, locale),
            })}
          </li>
        ))}
      </ul>

      <ReportProgressTable
        label={t('admin.reports.learning.moduleProgressTitle')}
        locale={locale}
        rows={learning.moduleProgress.map((moduleProgress) => ({
          completedCount: moduleProgress.completedCount,
          id: moduleProgress.moduleId,
          label: getModuleLabel(moduleProgress.moduleId, locale),
          rate: moduleProgress.completionRate,
          startedCount: moduleProgress.startedCount,
        }))}
      />
      <ReportProgressTable
        label={t('admin.reports.learning.postProgressTitle')}
        locale={locale}
        rows={learning.postProgress.map((postProgress) => ({
          completedCount: postProgress.completedCount,
          id: postProgress.postId,
          label: getPostLabel(postProgress.postId, locale),
          rate: postProgress.completionRate,
          startedCount: postProgress.startedCount,
        }))}
      />
    </section>
  );
}

function PlaygroundClientReportedPanel({
  locale,
  reportSummary,
}: {
  locale: Locale;
  reportSummary: AdminReportSummary;
}) {
  const { t } = useTranslation();
  const playground = reportSummary.playgroundClientReported;

  return (
    <section className="admin-report-panel admin-report-panel-client">
      <div className="dashboard-panel-heading">
        <Activity aria-hidden="true" size={22} />
        <div>
          <h2>{t('admin.reports.playground.title')}</h2>
          <p
            data-failed-run-count={String(playground.failedRunCount)}
            data-run-count={String(playground.runCount)}
            data-testid="admin-report-playground-summary"
          >
            {t('admin.reports.playground.runCounts', {
              failedRunCount: formatCount(playground.failedRunCount, locale),
              runCount: formatCount(playground.runCount, locale),
            })}
          </p>
        </div>
      </div>

      <div className="admin-report-metric-row">
        <p
          data-error-rate={String(playground.errorRate)}
          data-testid="admin-report-playground-error-rate"
        >
          {t('admin.reports.playground.errorRate', {
            percent: formatRate(playground.errorRate, locale),
          })}
        </p>
        <p>{playground.verificationLevel}</p>
      </div>

      <ul className="admin-report-list">
        {playground.scenarioActivity.map((activity) => (
          <li key={`${activity.scenarioId}:${activity.algorithmId}`}>
            <strong>{activity.scenarioId}</strong>
            <span>
              {t('admin.reports.playground.scenarioActivity', {
                algorithm: formatAlgorithmName(activity.algorithmId),
                runCount: formatCount(activity.runCount, locale),
                scenarioId: activity.scenarioId,
              })}
            </span>
            <span>
              {t('admin.reports.playground.failedRuns', {
                failedRunCount: formatCount(activity.failedRunCount, locale),
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatAlgorithmName(algorithmId: string): string {
  return algorithmId
    .split('-')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(value);
}

function formatPercentNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRate(value: number, locale: Locale): string {
  return formatPercentNumber(Math.round(value * 100), locale);
}

function formatGeneratedAt(value: string, locale: Locale): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

function getCourseLabel(courseId: string, locale: Locale): string {
  const course = courses.find((candidate) => candidate.id === courseId);

  return course ? localize(course.title, locale) : courseId;
}

function getModuleLabel(moduleId: string, locale: Locale): string {
  const module = courses
    .flatMap((course) => course.modules ?? [])
    .find((candidate) => candidate.id === moduleId);

  return module ? localize(module.title, locale) : moduleId;
}

function getPostLabel(postId: string, locale: Locale): string {
  const module = courses
    .flatMap((course) => course.modules ?? [])
    .find((candidate) => candidate.postIds.includes(postId));

  return module ? `${localize(module.title, locale)} / ${postId}` : postId;
}

function ReportProgressTable({
  label,
  locale,
  rows,
}: {
  label: string;
  locale: Locale;
  rows: ReadonlyArray<{
    completedCount: number;
    id: string;
    label: string;
    rate: number;
    startedCount: number;
  }>;
}) {
  const { t } = useTranslation();

  return (
    <section className="admin-report-progress-section" aria-label={label}>
      <h3>{label}</h3>
      <ul className="admin-report-list">
        {rows.map((row) => (
          <li key={row.id}>
            <strong>{row.label}</strong>
            <small>{row.id}</small>
            <span>
              {t('admin.reports.learning.progressCounts', {
                completedCount: formatCount(row.completedCount, locale),
                rate: formatRate(row.rate, locale),
                startedCount: formatCount(row.startedCount, locale),
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
