import { Activity, ArrowLeft, BarChart3, FileText, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAuth } from '../auth/auth-context';
import type { AdminReportSummary, LearningApiClient } from '../learning/learning-api';

interface AdminReportsPageProps {
  learningApiClient: LearningApiClient;
}

type AdminReportsStatus = 'failed' | 'loading' | 'ready';

export function AdminReportsPage({ learningApiClient }: AdminReportsPageProps) {
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
          <span>{t('admin.reports.generatedAt', { generatedAt: reportSummary.generatedAt })}</span>
        </div>
      </section>

      <div className="admin-report-grid">
        <LearningVerifiedReport reportSummary={reportSummary} />
        <PlaygroundClientReportedPanel reportSummary={reportSummary} />
      </div>

      <section className="admin-report-lifecycle" aria-label={t('admin.reports.lifecycleTitle')}>
        <FileText aria-hidden="true" size={18} />
        <strong>{t('admin.reports.lifecycleTitle')}</strong>
        <span>
          {t('admin.reports.lifecycleCounts', {
            draftCount: reportSummary.contentLifecycle.draftCount,
            publishedCount: reportSummary.contentLifecycle.publishedCount,
            validationPendingCount: reportSummary.contentLifecycle.validationPendingCount,
          })}
        </span>
      </section>
    </main>
  );
}

function LearningVerifiedReport({ reportSummary }: { reportSummary: AdminReportSummary }) {
  const { t } = useTranslation();
  const learning = reportSummary.learningVerified;

  return (
    <section className="admin-report-panel admin-report-panel-verified">
      <div className="dashboard-panel-heading">
        <ShieldCheck aria-hidden="true" size={22} />
        <div>
          <h2>{t('admin.reports.learning.title')}</h2>
          <p>{t('admin.reports.learning.learnerCount', { count: learning.learnerCount })}</p>
        </div>
      </div>

      <ul className="admin-report-list">
        {learning.courseProgress.map((courseProgress) => (
          <li key={courseProgress.courseId}>
            <strong>{courseProgress.courseId}</strong>
            <span>{t('admin.reports.learning.courseCounts', courseProgress)}</span>
            <span>
              {t('admin.reports.learning.averageProgress', {
                percent: formatPercentNumber(courseProgress.averageProgressPercent),
              })}
            </span>
          </li>
        ))}
      </ul>

      <div className="admin-report-metric-row">
        <p>
          {t('admin.reports.learning.quizAverage', {
            percent: formatPercentNumber(learning.quizSummary.averageScorePercent),
          })}
        </p>
        <p>
          {t('admin.reports.learning.quizAttempts', {
            passedAttemptCount: learning.quizSummary.passedAttemptCount,
            totalAttemptCount: learning.quizSummary.totalAttemptCount,
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
                wrongCount: question.wrongCount,
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
              count: unlock.unlockedLearnerCount,
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlaygroundClientReportedPanel({ reportSummary }: { reportSummary: AdminReportSummary }) {
  const { t } = useTranslation();
  const playground = reportSummary.playgroundClientReported;

  return (
    <section className="admin-report-panel admin-report-panel-client">
      <div className="dashboard-panel-heading">
        <Activity aria-hidden="true" size={22} />
        <div>
          <h2>{t('admin.reports.playground.title')}</h2>
          <p>
            {t('admin.reports.playground.runCounts', {
              failedRunCount: playground.failedRunCount,
              runCount: playground.runCount,
            })}
          </p>
        </div>
      </div>

      <div className="admin-report-metric-row">
        <p>
          {t('admin.reports.playground.errorRate', { percent: formatRate(playground.errorRate) })}
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
                runCount: activity.runCount,
                scenarioId: activity.scenarioId,
              })}
            </span>
            <span>
              {t('admin.reports.playground.failedRuns', {
                failedRunCount: activity.failedRunCount,
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatAlgorithmName(algorithmId: string): string {
  if (algorithmId === 'perceptron') {
    return 'Perceptron';
  }

  return algorithmId;
}

function formatPercentNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatRate(value: number): string {
  return formatPercentNumber(Math.round(value * 100));
}
