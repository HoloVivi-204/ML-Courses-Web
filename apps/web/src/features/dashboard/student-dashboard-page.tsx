import { Activity, ArrowRight, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import type {
  LearningApiClient,
  LearningProgressSnapshot,
  PlaygroundRunRecord,
} from '../learning/learning-api';

interface StudentDashboardPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

interface DashboardData {
  progressSnapshot: LearningProgressSnapshot;
  runs: PlaygroundRunRecord[];
}

type DashboardStatus = 'failed' | 'loading' | 'ready';

const PLAYGROUND_SCENARIO_ID = 'pg-xor';

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

        const [progressSnapshot, runs] = await Promise.all([
          learningApiClient.getProgress(idToken),
          learningApiClient.listPlaygroundRuns({
            idToken,
            scenarioId: PLAYGROUND_SCENARIO_ID,
          }),
        ]);

        if (isActive) {
          setDashboardData({ progressSnapshot, runs });
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

  return (
    <main className="student-dashboard-page page-shell">
      <section className="student-dashboard-heading">
        <span className="eyebrow">{t('dashboard.eyebrow')}</span>
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.intro')}</p>
      </section>

      <div className="dashboard-trust-grid">
        <VerifiedLearningPanel locale={locale} progressSnapshot={dashboardData.progressSnapshot} />
        <ClientComputedRunsPanel runs={dashboardData.runs} />
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
  const { i18n, t } = useTranslation();
  const course = getCourse(progressSnapshot.enrollment.courseId);
  const completedStepCount = progressSnapshot.modules.reduce(
    (total, moduleProgress) => total + moduleProgress.completedStepCount,
    0,
  );
  const requiredStepCount = progressSnapshot.modules.reduce(
    (total, moduleProgress) => total + moduleProgress.requiredStepCount,
    0,
  );

  return (
    <section className="dashboard-panel dashboard-panel-verified">
      <div className="dashboard-panel-heading">
        <ShieldCheck aria-hidden="true" size={22} />
        <div>
          <h2>{t('dashboard.verified.title')}</h2>
          {course ? <p>{localize(course.title, locale)}</p> : null}
        </div>
      </div>

      <div className="dashboard-metric-grid">
        <p>{t('dashboard.verified.courseProgress', progressSnapshot.enrollment)}</p>
        <p>
          {t('dashboard.verified.moduleSteps', {
            completed: completedStepCount,
            required: requiredStepCount,
          })}
        </p>
      </div>

      {progressSnapshot.quizzes.length ? (
        <ul className="dashboard-list" aria-label={t('dashboard.verified.quizLabel')}>
          {progressSnapshot.quizzes.map((quiz) => (
            <li key={quiz.quizId}>
              <BookOpenCheck aria-hidden="true" size={17} />
              <span>
                {t(`dashboard.verified.quiz.${quiz.quizKind}`, {
                  attempts: formatQuizAttemptCount(quiz.attemptCount, i18n.resolvedLanguage),
                  score: formatQuizScore(quiz.bestScore),
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

      {progressSnapshot.algorithmUnlocks.length ? (
        <ul className="dashboard-chip-list" aria-label={t('dashboard.verified.unlockLabel')}>
          {progressSnapshot.algorithmUnlocks.map((unlock) => (
            <li key={unlock.algorithmId}>
              {t('dashboard.verified.algorithmUnlocked', {
                algorithm: formatAlgorithmName(unlock.algorithmId),
              })}
            </li>
          ))}
        </ul>
      ) : (
        <p className="dashboard-muted">{t('dashboard.verified.noUnlocks')}</p>
      )}
    </section>
  );
}

function ClientComputedRunsPanel({ runs }: { runs: readonly PlaygroundRunRecord[] }) {
  const { t } = useTranslation();
  const visibleRuns = useMemo(() => runs.slice(0, 3), [runs]);

  return (
    <section className="dashboard-panel dashboard-panel-client">
      <div className="dashboard-panel-heading">
        <Activity aria-hidden="true" size={22} />
        <div>
          <h2>{t('dashboard.client.title')}</h2>
          <p>{t('dashboard.client.runCount', { count: runs.length })}</p>
        </div>
      </div>

      {visibleRuns.length ? (
        <ul className="dashboard-run-list">
          {visibleRuns.map((run) => (
            <li key={run.runId}>
              <div>
                <strong>{run.runId}</strong>
                <span>{run.verificationLevel}</span>
              </div>
              <p>
                {t('dashboard.client.accuracy', {
                  accuracy: formatOptionalPercent(run.metrics.accuracy),
                })}
              </p>
              <p>{t('dashboard.client.duration', { duration: run.durationMs })}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dashboard-muted">{t('dashboard.client.empty')}</p>
      )}

      <Link className="module-trial-link" to="/playground/pg-xor">
        {t('dashboard.client.openPlayground')}
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </section>
  );
}

function formatAlgorithmName(algorithmId: string): string {
  if (algorithmId === 'perceptron') {
    return 'Perceptron';
  }

  return algorithmId;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatOptionalPercent(value: number | null | undefined): string {
  return typeof value === 'number' ? formatPercent(value) : '—';
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
