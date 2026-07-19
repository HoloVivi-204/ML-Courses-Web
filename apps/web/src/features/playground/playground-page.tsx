import { ArrowLeft, RotateCcw, Square, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import type { Locale } from '../catalog/course-data';
import { useAuth } from '../auth/auth-context';
import type { LearningApiClient } from '../learning/learning-api';
import { createMlWorkerController } from './ml-worker-controller';
import {
  validateXorPerceptronConfig,
  type XorPerceptronConfig,
  type XorPerceptronProgressEvent,
  type XorPerceptronResult,
} from './xor-perceptron';

interface PlaygroundPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type RunStatus = 'idle' | 'running' | 'stopping' | 'cancelled' | 'completed' | 'failed';

const DEFAULT_CONFIG: XorPerceptronConfig = {
  learningRate: 0.1,
  epochs: 100,
  trainRatio: 0.75,
  seed: 42,
};

export function PlaygroundPage({ learningApiClient, locale }: PlaygroundPageProps) {
  const { t } = useTranslation();
  const { scenarioId } = useParams();
  const { getIdToken, user } = useAuth();
  const controller = useMemo(() => createMlWorkerController(), []);
  const deviceProfile = useMemo(() => getDeviceProfile(), []);
  const maxEpochs = deviceProfile === 'mobile' ? 200 : 500;
  const [algorithmUnlocked, setAlgorithmUnlocked] = useState(false);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [config, setConfig] = useState<XorPerceptronConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [progress, setProgress] = useState<XorPerceptronProgressEvent | null>(null);
  const [result, setResult] = useState<XorPerceptronResult | null>(null);
  const [safeError, setSafeError] = useState<string | null>(null);
  const activeRunRef = useRef<{ runId: string; sessionId: string } | null>(null);
  const isStoppingRef = useRef(false);

  const readRequiredIdToken = useCallback(async (): Promise<string> => {
    const idToken = await getIdToken();

    if (!idToken) {
      throw new Error(t('playground.error.progress'));
    }

    return idToken;
  }, [getIdToken, t]);

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      try {
        const idToken = await readRequiredIdToken();
        const snapshot = await learningApiClient.getProgress(idToken);

        if (isMounted) {
          setAlgorithmUnlocked(
            snapshot.algorithmUnlocks.some((unlock) => unlock.algorithmId === 'perceptron'),
          );
          setSafeError(null);
        }
      } catch {
        if (isMounted) {
          setSafeError(t('playground.error.progress'));
        }
      } finally {
        if (isMounted) {
          setIsProgressLoading(false);
        }
      }
    }

    void loadProgress();

    return () => {
      isMounted = false;
    };
  }, [learningApiClient, readRequiredIdToken, t]);

  useEffect(() => {
    return () => controller.dispose();
  }, [controller]);

  if (scenarioId !== 'pg-xor') {
    return <PlaygroundNotFoundPage />;
  }

  if (isProgressLoading) {
    return (
      <main className="playground-page page-shell" role="status">
        {t('route.loading')}
      </main>
    );
  }

  if (!algorithmUnlocked) {
    return (
      <main className="playground-page page-shell">
        <Link className="breadcrumb-link" to="/learn/course-deep-learning-basic">
          <ArrowLeft aria-hidden="true" size={16} />
          {t('learning.backToCourse')}
        </Link>
        <section className="playground-locked">
          <span className="eyebrow">{t('playground.eyebrow')}</span>
          <h1>{t('playground.locked.title')}</h1>
          <p>{t('playground.locked.body')}</p>
        </section>
      </main>
    );
  }

  async function handleRun() {
    if (!user || status === 'running' || status === 'stopping') {
      return;
    }

    try {
      validateXorPerceptronConfig(config, deviceProfile);
      setStatus('running');
      setProgress(null);
      setResult(null);
      setSafeError(null);

      const idToken = await readRequiredIdToken();
      const session = await learningApiClient.createPlaygroundRunSession({
        idToken,
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        deviceProfile,
        config,
      });
      const runId = createRunId();

      activeRunRef.current = { runId, sessionId: session.sessionId };

      const runResult = await controller.run(
        {
          runId,
          sessionId: session.sessionId,
          scenarioId: session.scenarioId,
          algorithmId: session.algorithmId,
          datasetVersionId: session.datasetVersionId,
          config: session.config,
          configHash: session.configHash,
        },
        setProgress,
      );

      if (activeRunRef.current?.runId === runResult.runId) {
        setResult(runResult);
        setStatus('completed');
        activeRunRef.current = null;
      }
    } catch (error) {
      if (!isStoppingRef.current) {
        setStatus('failed');
        setSafeError(error instanceof Error ? error.message : t('playground.error.run'));
      }
      activeRunRef.current = null;
    }
  }

  async function handleStop() {
    const activeRun = activeRunRef.current;

    if (!activeRun || status !== 'running') {
      return;
    }

    setStatus('stopping');
    isStoppingRef.current = true;
    const idToken = await readRequiredIdToken();

    await Promise.allSettled([
      controller.stop(activeRun.runId),
      learningApiClient.cancelPlaygroundRunSession({
        idToken,
        sessionId: activeRun.sessionId,
      }),
    ]);

    activeRunRef.current = null;
    isStoppingRef.current = false;
    setResult(null);
    setStatus('cancelled');
  }

  async function handleReset() {
    if (status === 'running') {
      await handleStop();
    }

    activeRunRef.current = null;
    setConfig(DEFAULT_CONFIG);
    setProgress(null);
    setResult(null);
    setSafeError(null);
    setStatus('idle');
  }

  return (
    <main className="playground-page page-shell">
      <Link className="breadcrumb-link" to="/learn/course-deep-learning-basic">
        <ArrowLeft aria-hidden="true" size={16} />
        {t('learning.backToCourse')}
      </Link>
      <section className="playground-hero">
        <div>
          <span className="eyebrow">{t('playground.eyebrow')}</span>
          <h1>{t('playground.title')}</h1>
          <p>{t('playground.intro')}</p>
        </div>
        <div className="playground-identity">
          <code>pg-xor / perceptron</code>
          <span>{t('playground.verification')}</span>
        </div>
      </section>

      <section className="playground-workspace">
        <form className="playground-controls" onSubmit={(event) => event.preventDefault()}>
          <h2>{t('playground.controls.title')}</h2>
          <NumberField
            label={t('playground.learningRate')}
            max={1}
            min={0.0001}
            onChange={(learningRate) => setConfig((current) => ({ ...current, learningRate }))}
            step={0.01}
            value={config.learningRate}
          />
          <NumberField
            label={t('playground.epochs')}
            max={maxEpochs}
            min={10}
            onChange={(epochs) => setConfig((current) => ({ ...current, epochs }))}
            step={10}
            value={config.epochs}
          />
          <NumberField
            label={t('playground.trainRatio')}
            max={0.9}
            min={0.5}
            onChange={(trainRatio) => setConfig((current) => ({ ...current, trainRatio }))}
            step={0.05}
            value={config.trainRatio}
          />
          <NumberField
            label={t('playground.seed')}
            max={1_000_000}
            min={0}
            onChange={(seed) => setConfig((current) => ({ ...current, seed }))}
            step={1}
            value={config.seed}
          />
          <p className="playground-limit">
            {t('playground.mobileLimit', {
              count: maxEpochs,
              device: deviceProfile,
            })}
          </p>
          <div className="playground-run-actions">
            <button disabled={status === 'running' || status === 'stopping'} onClick={handleRun}>
              <Zap aria-hidden="true" size={16} />
              {t('playground.run')}
            </button>
            <button disabled={status !== 'running'} onClick={handleStop} type="button">
              <Square aria-hidden="true" size={16} />
              {t('playground.stop')}
            </button>
            <button onClick={handleReset} type="button">
              <RotateCcw aria-hidden="true" size={16} />
              {t('playground.reset')}
            </button>
          </div>
        </form>

        <section className="playground-output" aria-live="polite">
          <h2>{t('playground.output.title')}</h2>
          <p className={`playground-status status-${status}`}>{t(`playground.status.${status}`)}</p>
          {progress ? (
            <p>
              {t('playground.progress', {
                epoch: progress.epoch,
                total: progress.totalEpochs,
                loss: progress.loss,
              })}
            </p>
          ) : null}
          {result ? <PlaygroundResult locale={locale} result={result} /> : null}
          {safeError ? <p className="playground-error">{safeError}</p> : null}
        </section>
      </section>
    </main>
  );
}

function NumberField({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="playground-number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function PlaygroundResult({ locale, result }: { locale: Locale; result: XorPerceptronResult }) {
  const { t } = useTranslation();

  return (
    <div className="playground-result" data-testid="playground-result">
      <div className="playground-metrics">
        <span>{t('playground.metric.accuracy')}</span>
        <strong>{formatPercent(result.metrics.accuracy)}</strong>
        <span>{t('playground.metric.loss')}</span>
        <strong>{result.metrics.loss.toFixed(2)}</strong>
      </div>
      <svg
        aria-label={t('playground.chartAlt')}
        className="playground-chart"
        role="img"
        viewBox="0 0 320 220"
      >
        <rect height="220" rx="18" width="320" />
        <line x1="32" x2="288" y1="110" y2="110" />
        <line x1="160" x2="160" y1="28" y2="192" />
        <line className="boundary" x1="42" x2="278" y1="72" y2="148" />
        <circle className="class-zero" cx="82" cy="62" r="9" />
        <circle className="class-one" cx="238" cy="62" r="9" />
        <circle className="class-one" cx="82" cy="162" r="9" />
        <circle className="class-zero" cx="238" cy="162" r="9" />
      </svg>
      <ul className="playground-feedback">
        {result.feedback.map((feedbackId) => (
          <li key={feedbackId}>{formatFeedback(feedbackId, locale)}</li>
        ))}
      </ul>
    </div>
  );
}

function PlaygroundNotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">404 / PLAYGROUND</span>
      <h1>{t('playground.notFound.title')}</h1>
      <p>{t('playground.notFound.body')}</p>
      <Link className="primary-link" to="/courses">
        {t('course.notFound.back')}
      </Link>
    </main>
  );
}

function createRunId(): string {
  return `run-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatFeedback(feedbackId: 'linear-limit' | 'non-convergence', locale: Locale): string {
  const messages = {
    'linear-limit': {
      en: 'Linear limit: one straight boundary cannot separate XOR.',
      vi: 'Giới hạn tuyến tính: một ranh giới thẳng không tách được XOR.',
    },
    'non-convergence': {
      en: 'Non-convergence: more epochs do not remove the XOR conflict.',
      vi: 'Không hội tụ: tăng epoch không xóa được mâu thuẫn XOR.',
    },
  } as const;

  return messages[feedbackId][locale];
}

function getDeviceProfile(): 'desktop' | 'mobile' {
  if (globalThis.matchMedia?.('(max-width: 767px)').matches) {
    return 'mobile';
  }

  return globalThis.innerWidth < 768 ? 'mobile' : 'desktop';
}
