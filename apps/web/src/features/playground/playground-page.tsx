import { ArrowLeft, RotateCcw, Square, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import type { Locale } from '../catalog/course-data';
import { useAuth } from '../auth/auth-context';
import type {
  LearningApiClient,
  PlaygroundConfigRecord,
  PlaygroundRunRecord,
} from '../learning/learning-api';
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
const DEFAULT_CONFIG_NAME = 'XOR baseline';
const PLAYGROUND_SCENARIO_ID = 'pg-xor';
const PLAYGROUND_ALGORITHM_ID = 'perceptron';
const PLAYGROUND_DATASET_VERSION_ID = 'ds-xor-noisy-v1';

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
  const [savedRuns, setSavedRuns] = useState<PlaygroundRunRecord[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<PlaygroundConfigRecord[]>([]);
  const [isPersistenceLoading, setIsPersistenceLoading] = useState(false);
  const [configName, setConfigName] = useState(DEFAULT_CONFIG_NAME);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [safeError, setSafeError] = useState<string | null>(null);
  const activeRunRef = useRef<{ runId: string; sessionId: string } | null>(null);
  const isStoppingRef = useRef(false);
  const resetSequenceRef = useRef(0);

  const readRequiredIdToken = useCallback(async (): Promise<string> => {
    const idToken = await getIdToken();

    if (!idToken) {
      throw new Error(t('playground.error.progress'));
    }

    return idToken;
  }, [getIdToken, t]);

  const loadSavedArtifacts = useCallback(
    async (idToken: string) => {
      const [runs, configs] = await Promise.all([
        learningApiClient.listPlaygroundRuns({
          idToken,
          scenarioId: PLAYGROUND_SCENARIO_ID,
        }),
        learningApiClient.listPlaygroundConfigs({
          idToken,
          scenarioId: PLAYGROUND_SCENARIO_ID,
        }),
      ]);

      return { configs, runs };
    },
    [learningApiClient],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      try {
        const idToken = await readRequiredIdToken();
        const snapshot = await learningApiClient.getProgress(idToken);
        const isUnlocked = snapshot.algorithmUnlocks.some(
          (unlock) => unlock.algorithmId === PLAYGROUND_ALGORITHM_ID,
        );

        if (isMounted) {
          setAlgorithmUnlocked(isUnlocked);
          setSafeError(null);
        }

        if (isUnlocked) {
          if (isMounted) {
            setIsPersistenceLoading(true);
          }

          try {
            const artifacts = await loadSavedArtifacts(idToken);

            if (isMounted) {
              setSavedRuns(artifacts.runs);
              setSavedConfigs(artifacts.configs);
              setPersistenceError(null);
            }
          } catch {
            if (isMounted) {
              setPersistenceError(t('playground.error.persistence'));
            }
          } finally {
            if (isMounted) {
              setIsPersistenceLoading(false);
            }
          }
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
  }, [learningApiClient, loadSavedArtifacts, readRequiredIdToken, t]);

  useEffect(() => {
    return () => controller.dispose();
  }, [controller]);

  if (scenarioId !== PLAYGROUND_SCENARIO_ID) {
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
      setPersistenceError(null);
      isStoppingRef.current = false;

      const idToken = await readRequiredIdToken();
      const session = await learningApiClient.createPlaygroundRunSession({
        idToken,
        scenarioId: PLAYGROUND_SCENARIO_ID,
        algorithmId: PLAYGROUND_ALGORITHM_ID,
        datasetVersionId: PLAYGROUND_DATASET_VERSION_ID,
        deviceProfile,
        config,
      });
      const runId = createRunId();
      const startedAt = Date.now();

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
        try {
          const savedRun = await learningApiClient.savePlaygroundRun({
            idToken,
            idempotencyKey: createRunSaveIdempotencyKey(runResult.runId),
            sessionId: session.sessionId,
            result: {
              ...runResult,
              configHash: session.configHash,
              durationMs: Math.max(0, Date.now() - startedAt),
            },
          });

          if (activeRunRef.current?.runId === runResult.runId) {
            setSavedRuns((currentRuns) => upsertSavedRun(currentRuns, savedRun));
            setPersistenceError(null);
          }
        } catch {
          if (activeRunRef.current?.runId === runResult.runId) {
            setPersistenceError(t('playground.error.persistence'));
          }
        }

        if (activeRunRef.current?.runId === runResult.runId) {
          setStatus('completed');
          activeRunRef.current = null;
        }
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
    const resetSequence = resetSequenceRef.current;
    const idToken = await readRequiredIdToken();

    await Promise.allSettled([
      controller.stop(activeRun.runId),
      learningApiClient.cancelPlaygroundRunSession({
        idToken,
        sessionId: activeRun.sessionId,
      }),
    ]);

    if (resetSequenceRef.current !== resetSequence) {
      isStoppingRef.current = false;
      return;
    }

    activeRunRef.current = null;
    isStoppingRef.current = false;
    setResult(null);
    setStatus('cancelled');
  }

  async function handleReset() {
    resetSequenceRef.current += 1;

    if (status === 'running') {
      await handleStop();
    }

    activeRunRef.current = null;
    setConfig(DEFAULT_CONFIG);
    setProgress(null);
    setResult(null);
    setSafeError(null);
    setPersistenceError(null);
    setStatus('idle');
  }

  async function handleSaveConfig() {
    if (!user || status === 'running' || status === 'stopping') {
      return;
    }

    try {
      validateXorPerceptronConfig(config, deviceProfile);
      setPersistenceError(null);
      const idToken = await readRequiredIdToken();
      const savedConfig = await learningApiClient.createPlaygroundConfig({
        idToken,
        name: configName,
        scenarioId: PLAYGROUND_SCENARIO_ID,
        algorithmId: PLAYGROUND_ALGORITHM_ID,
        datasetVersionId: PLAYGROUND_DATASET_VERSION_ID,
        config,
      });

      setConfigName(savedConfig.name);
      setSavedConfigs((currentConfigs) => upsertSavedConfig(currentConfigs, savedConfig));
    } catch {
      setPersistenceError(t('playground.error.persistence'));
    }
  }

  function handleRestoreConfig(savedConfig: PlaygroundConfigRecord) {
    if (savedConfig.compatibilityStatus !== 'compatible') {
      return;
    }

    setConfig(savedConfig.config);
    setProgress(null);
    setResult(null);
    setSafeError(null);
    setStatus('idle');
  }

  async function handleDeleteRun(runId: string) {
    try {
      const idToken = await readRequiredIdToken();

      await learningApiClient.deletePlaygroundRun({ idToken, runId });
      setSavedRuns((currentRuns) => currentRuns.filter((run) => run.runId !== runId));
      setPersistenceError(null);
    } catch {
      setPersistenceError(t('playground.error.persistence'));
    }
  }

  async function handleDeleteConfig(configId: string) {
    try {
      const idToken = await readRequiredIdToken();

      await learningApiClient.deletePlaygroundConfig({ idToken, configId });
      setSavedConfigs((currentConfigs) =>
        currentConfigs.filter((savedConfig) => savedConfig.configId !== configId),
      );
      setPersistenceError(null);
    } catch {
      setPersistenceError(t('playground.error.persistence'));
    }
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
          <div className="playground-config-save">
            <label className="playground-text-field">
              <span>{t('playground.configs.name')}</span>
              <input
                aria-label={t('playground.configs.name')}
                maxLength={80}
                onChange={(event) => setConfigName(event.currentTarget.value)}
                type="text"
                value={configName}
              />
            </label>
            <button
              disabled={status === 'running' || status === 'stopping'}
              onClick={handleSaveConfig}
              type="button"
            >
              {t('playground.configs.save')}
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

      <section className="playground-persistence">
        <section className="playground-history" aria-live="polite">
          <h2>{t('playground.history.title')}</h2>
          {isPersistenceLoading ? (
            <p className="playground-muted" role="status">
              {t('playground.persistence.loading')}
            </p>
          ) : null}
          {savedRuns.length > 0 ? (
            <ul className="playground-card-list">
              {savedRuns.map((savedRun) => (
                <li className="playground-history-card" key={savedRun.runId}>
                  <div>
                    <strong>{savedRun.runId}</strong>
                    <span>{savedRun.verificationLevel}</span>
                  </div>
                  <p>
                    {t('playground.history.accuracy', {
                      accuracy: formatPercent(savedRun.metrics.accuracy),
                    })}{' '}
                    ·{' '}
                    {t('playground.history.duration', {
                      duration: savedRun.durationMs,
                    })}
                  </p>
                  <button onClick={() => void handleDeleteRun(savedRun.runId)} type="button">
                    {t('playground.history.delete')}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="playground-muted">{t('playground.history.empty')}</p>
          )}
        </section>

        <section className="playground-configs">
          <h2>{t('playground.configs.title')}</h2>
          {savedConfigs.length > 0 ? (
            <ul className="playground-card-list">
              {savedConfigs.map((savedConfig) => (
                <li className="playground-config-card" key={savedConfig.configId}>
                  <div>
                    <strong>{savedConfig.name}</strong>
                    <span>{savedConfig.compatibilityStatus}</span>
                  </div>
                  <p>
                    lr {savedConfig.config.learningRate} · epochs {savedConfig.config.epochs} · seed{' '}
                    {savedConfig.config.seed}
                  </p>
                  {savedConfig.compatibilityStatus === 'incompatible' ? (
                    <p className="playground-error">
                      {savedConfig.compatibilityReason ?? t('playground.configs.incompatible')}
                    </p>
                  ) : null}
                  <div className="playground-card-actions">
                    <button
                      aria-label={`${t('playground.configs.restore')} ${savedConfig.name}`}
                      disabled={
                        savedConfig.compatibilityStatus !== 'compatible' ||
                        status === 'running' ||
                        status === 'stopping'
                      }
                      onClick={() => handleRestoreConfig(savedConfig)}
                      type="button"
                    >
                      {t('playground.configs.restore')}
                    </button>
                    <button
                      onClick={() => void handleDeleteConfig(savedConfig.configId)}
                      type="button"
                    >
                      {t('playground.configs.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="playground-muted">{t('playground.configs.empty')}</p>
          )}
        </section>
      </section>
      {persistenceError ? <p className="playground-error">{persistenceError}</p> : null}
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

function createRunSaveIdempotencyKey(runId: string): string {
  return `playground-run-save-${runId}`;
}

function upsertSavedRun(
  currentRuns: readonly PlaygroundRunRecord[],
  savedRun: PlaygroundRunRecord,
): PlaygroundRunRecord[] {
  return [savedRun, ...currentRuns.filter((run) => run.runId !== savedRun.runId)].slice(0, 50);
}

function upsertSavedConfig(
  currentConfigs: readonly PlaygroundConfigRecord[],
  savedConfig: PlaygroundConfigRecord,
): PlaygroundConfigRecord[] {
  return [
    savedConfig,
    ...currentConfigs.filter((config) => config.configId !== savedConfig.configId),
  ];
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
