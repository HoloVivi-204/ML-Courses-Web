import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  LockKeyhole,
  RotateCcw,
  Square,
  Shuffle,
  Zap,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { courses, localize, type Locale } from '../catalog/course-data';
import { useAuth } from '../auth/auth-context';
import type {
  LearningApiClient,
  PlaygroundConfig,
  PlaygroundConfigRecord,
  PlaygroundRunRecord,
} from '../learning/learning-api';
import type { PlaygroundPairRegistration, PlaygroundParameterField } from './algorithm-adapter';
import type { MlConfig, MlMetricValue, MlProgressEvent, MlRunResult } from './ml-engine-contract';
import { createMlWorkerController } from './ml-worker-controller';
import { getPlaygroundPairRegistry } from './playground-adapter-registry';
import { createSeededRandom, getPlaygroundDataset } from './playground-datasets';
import { PlaygroundVisualization } from './playground-visualizations';

interface PlaygroundPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type PlaygroundCatalogStatus = 'error' | 'loading' | 'ready';

type DeviceProfile = 'desktop' | 'mobile';
type RunStatus = 'idle' | 'running' | 'stopping' | 'cancelled' | 'completed' | 'failed';

const PERCENT_METRIC_IDS = new Set([
  'accuracy',
  'auc',
  'explained-variance',
  'f1',
  'macro-f1',
  'precision',
  'r2',
  'recall',
  'testAccuracy',
  'trainAccuracy',
]);

export function PlaygroundCatalogPage({ learningApiClient, locale }: PlaygroundPageProps) {
  const { t } = useTranslation();
  const { getIdToken } = useAuth();
  const [status, setStatus] = useState<PlaygroundCatalogStatus>('loading');
  const [unlockedAlgorithmIds, setUnlockedAlgorithmIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const scenarioGroups = useMemo(() => getScenarioGroups(), []);

  useEffect(() => {
    let isMounted = true;

    async function loadAccess() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Missing learner token.');
        }

        const snapshot = await learningApiClient.getProgress(idToken);

        if (isMounted) {
          setUnlockedAlgorithmIds(
            new Set(snapshot.algorithmUnlocks.map((unlock) => unlock.algorithmId)),
          );
          setStatus('ready');
        }
      } catch {
        if (isMounted) {
          setUnlockedAlgorithmIds(new Set());
          setStatus('error');
        }
      }
    }

    void loadAccess();

    return () => {
      isMounted = false;
    };
  }, [getIdToken, learningApiClient]);

  if (status === 'loading') {
    return (
      <main className="playground-page page-shell" role="status">
        {t('route.loading')}
      </main>
    );
  }

  return (
    <main className="playground-catalog page-shell">
      <header className="playground-catalog-heading">
        <span className="eyebrow">{t('playground.eyebrow')}</span>
        <h1>{t('playground.catalog.title')}</h1>
        <p>{t('playground.catalog.intro')}</p>
        {status === 'error' ? (
          <p className="playground-error" role="alert">
            {t('playground.error.progress')}
          </p>
        ) : null}
      </header>

      <section aria-label={t('playground.catalog.listLabel')} className="playground-catalog-grid">
        {scenarioGroups.map(({ registrations, scenarioId }) => {
          const dataset = getPlaygroundDataset(registrations[0]?.datasetVersionId ?? '');

          return (
            <article
              className="playground-scenario-card"
              data-testid={`playground-scenario-card-${scenarioId}`}
              key={scenarioId}
            >
              <div className="playground-scenario-card-heading">
                <div>
                  <code>{scenarioId}</code>
                  <h2>{formatScenarioName(scenarioId, locale)}</h2>
                </div>
                <Database aria-hidden="true" size={20} />
              </div>
              <p>{localize(dataset.textAlternative, locale)}</p>
              <ul className="playground-access-list">
                {registrations.map((registration) => {
                  const isUnlocked = unlockedAlgorithmIds.has(registration.algorithmId);
                  const requiredModule = findUnlockModuleForAlgorithm(registration.algorithmId);

                  return (
                    <li key={getRegistrationKey(registration)}>
                      <div>
                        {isUnlocked ? (
                          <Check aria-hidden="true" size={15} />
                        ) : (
                          <LockKeyhole aria-hidden="true" size={15} />
                        )}
                        <strong>{formatAlgorithmName(registration.algorithmId, locale)}</strong>
                        <span className={isUnlocked ? 'is-open' : ''}>
                          {formatPlaygroundLockState(isUnlocked, locale)}
                        </span>
                      </div>
                      {!isUnlocked ? (
                        <p>
                          {formatUnlockRequirement(
                            requiredModule ? localize(requiredModule.title, locale) : null,
                            locale,
                          )}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <Link
                aria-label={`${t('playground.catalog.open')} ${scenarioId}`}
                className="playground-catalog-link"
                to={`/playground/${scenarioId}`}
              >
                {t('playground.catalog.open')}
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export function PlaygroundPage({ learningApiClient, locale }: PlaygroundPageProps) {
  const { t } = useTranslation();
  const { scenarioId } = useParams();
  const routeScenarioId = scenarioId ?? '';
  const scenarioRegistrations = useMemo(
    () => getPlaygroundPairRegistry().filter((entry) => entry.scenarioId === routeScenarioId),
    [routeScenarioId],
  );
  const initialRegistration = scenarioRegistrations[0] ?? null;
  const scenarioDatasetIds = useMemo(
    () => [...new Set(scenarioRegistrations.map((entry) => entry.datasetVersionId))],
    [scenarioRegistrations],
  );
  const [datasetSelection, setDatasetSelection] = useState<{
    datasetVersionId: string | null;
    scenarioId: string;
  }>(() => ({
    datasetVersionId: initialRegistration?.datasetVersionId ?? null,
    scenarioId: routeScenarioId,
  }));
  const selectedDatasetVersionId =
    datasetSelection.scenarioId === routeScenarioId
      ? datasetSelection.datasetVersionId
      : (initialRegistration?.datasetVersionId ?? null);
  const activeScenarioRegistrations = useMemo(
    () =>
      scenarioRegistrations.filter((entry) => entry.datasetVersionId === selectedDatasetVersionId),
    [scenarioRegistrations, selectedDatasetVersionId],
  );
  const { getIdToken, user } = useAuth();
  const controller = useMemo(() => createMlWorkerController(), []);
  const deviceProfile = useMemo(() => getDeviceProfile(), []);
  const [unlockedAlgorithmIds, setUnlockedAlgorithmIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [selectedPairKey, setSelectedPairKey] = useState<string | null>(null);
  const selectedRegistration = useMemo(
    () =>
      selectPlayableRegistration({
        registrations: activeScenarioRegistrations,
        selectedPairKey,
        unlockedAlgorithmIds,
      }),
    [activeScenarioRegistrations, selectedPairKey, unlockedAlgorithmIds],
  );
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [config, setConfig] = useState<MlConfig>(() =>
    cloneConfig(initialRegistration?.defaultConfig ?? {}),
  );
  const [status, setStatus] = useState<RunStatus>('idle');
  const [progress, setProgress] = useState<MlProgressEvent | null>(null);
  const [result, setResult] = useState<MlRunResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<PlaygroundRunRecord[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<PlaygroundConfigRecord[]>([]);
  const [isPersistenceLoading, setIsPersistenceLoading] = useState(false);
  const [configName, setConfigName] = useState(initialRegistration?.defaultConfigName ?? '');
  const [configNameDrafts, setConfigNameDrafts] = useState<Record<string, string>>({});
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [safeError, setSafeError] = useState<string | null>(null);
  const activeRunRef = useRef<{ runId: string; sessionId: string } | null>(null);
  const isStoppingRef = useRef(false);
  const resetSequenceRef = useRef(0);
  const previousActivePairKeyRef = useRef<string | null>(null);

  const readRequiredIdToken = useCallback(async (): Promise<string> => {
    const idToken = await getIdToken();

    if (!idToken) {
      throw new Error(t('playground.error.progress'));
    }

    return idToken;
  }, [getIdToken, t]);

  const loadSavedArtifacts = useCallback(
    async (idToken: string, currentScenarioId: string) => {
      const [runs, configs] = await Promise.all([
        learningApiClient.listPlaygroundRuns({
          idToken,
          scenarioId: currentScenarioId,
        }),
        learningApiClient.listPlaygroundConfigs({
          idToken,
          scenarioId: currentScenarioId,
        }),
      ]);

      return { configs, runs };
    },
    [learningApiClient],
  );

  useEffect(() => {
    let isMounted = true;

    if (scenarioRegistrations.length === 0) {
      return () => {
        isMounted = false;
      };
    }

    async function loadProgress() {
      setIsProgressLoading(true);
      setSavedRuns([]);
      setSavedConfigs([]);
      setConfigNameDrafts({});
      setIsPersistenceLoading(false);
      setPersistenceError(null);
      setSafeError(null);

      try {
        const idToken = await readRequiredIdToken();
        const snapshot = await learningApiClient.getProgress(idToken);
        const nextUnlockedAlgorithmIds = new Set(
          snapshot.algorithmUnlocks.map((unlock) => unlock.algorithmId),
        );
        const unlockedRegistrations = activeScenarioRegistrations.filter((registration) =>
          nextUnlockedAlgorithmIds.has(registration.algorithmId),
        );

        if (isMounted) {
          setUnlockedAlgorithmIds(nextUnlockedAlgorithmIds);
          setSelectedPairKey((currentPairKey) =>
            currentPairKey !== null &&
            unlockedRegistrations.some(
              (registration) => getRegistrationKey(registration) === currentPairKey,
            )
              ? currentPairKey
              : unlockedRegistrations[0]
                ? getRegistrationKey(unlockedRegistrations[0])
                : null,
          );
          setSafeError(null);
        }

        if (unlockedRegistrations.length > 0) {
          if (isMounted) {
            setIsPersistenceLoading(true);
          }

          try {
            const artifacts = await loadSavedArtifacts(idToken, routeScenarioId);

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
          setUnlockedAlgorithmIds(new Set());
          setSelectedPairKey(null);
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
  }, [
    learningApiClient,
    loadSavedArtifacts,
    readRequiredIdToken,
    routeScenarioId,
    activeScenarioRegistrations,
    scenarioRegistrations.length,
    t,
  ]);

  useEffect(() => {
    return () => controller.dispose();
  }, [controller]);

  useLayoutEffect(() => {
    const activePairKey = selectedRegistration ? getRegistrationKey(selectedRegistration) : null;

    if (previousActivePairKeyRef.current === activePairKey) {
      return;
    }

    previousActivePairKeyRef.current = activePairKey;
    activeRunRef.current = null;
    isStoppingRef.current = false;
    setConfig(cloneConfig(selectedRegistration?.defaultConfig ?? {}));
    setConfigName(selectedRegistration?.defaultConfigName ?? '');
    setProgress(null);
    setResult(null);
    setSafeError(null);
    setStatus('idle');
  }, [selectedRegistration]);

  if (scenarioRegistrations.length === 0) {
    return <PlaygroundNotFoundPage />;
  }

  if (isProgressLoading) {
    return (
      <main className="playground-page page-shell" role="status">
        {t('route.loading')}
      </main>
    );
  }

  if (!selectedRegistration) {
    return (
      <main className="playground-page page-shell">
        <Link className="breadcrumb-link" to="/learn/course-deep-learning-basic">
          <ArrowLeft aria-hidden="true" size={16} />
          {t('learning.backToCourse')}
        </Link>
        <section className="playground-locked">
          <span className="eyebrow">{t('playground.eyebrow')}</span>
          <h1>{t('playground.locked.title')}</h1>
          <p>{formatLockedMessage(scenarioRegistrations, locale)}</p>
          <LockedPlaygroundLabList
            locale={locale}
            registrations={scenarioRegistrations}
            unlockedAlgorithmIds={unlockedAlgorithmIds}
          />
        </section>
      </main>
    );
  }

  const activePairKey = getRegistrationKey(selectedRegistration);
  const isRunBusy = status === 'running' || status === 'stopping';
  const selectedDataset = selectedDatasetVersionId
    ? getPlaygroundDataset(selectedDatasetVersionId)
    : null;

  function handleDatasetSelect(nextDatasetVersionId: string) {
    if (isRunBusy || !scenarioDatasetIds.includes(nextDatasetVersionId)) {
      return;
    }

    previousActivePairKeyRef.current = null;
    setDatasetSelection({
      datasetVersionId: nextDatasetVersionId,
      scenarioId: routeScenarioId,
    });
    setSelectedPairKey(null);
    setProgress(null);
    setResult(null);
    setSafeError(null);
    setStatus('idle');
  }

  function handleReshuffle() {
    if (
      isRunBusy ||
      !selectedRegistration ||
      typeof config.seed !== 'number' ||
      !Number.isFinite(config.seed)
    ) {
      return;
    }

    const nextSeed = createReshuffledSeed(config.seed);

    setConfig((currentConfig) => ({ ...currentConfig, seed: nextSeed }));
    setProgress(null);
    setResult(null);
    setSafeError(null);
    setPersistenceError(null);
    setStatus('idle');
  }

  async function handleRun() {
    if (!user || isRunBusy || !selectedRegistration) {
      return;
    }

    try {
      validateConfigForRegistration(selectedRegistration, config, deviceProfile);
      setStatus('running');
      setProgress(null);
      setResult(null);
      setSafeError(null);
      setPersistenceError(null);
      isStoppingRef.current = false;

      const idToken = await readRequiredIdToken();
      const session = await learningApiClient.createPlaygroundRunSession({
        idToken,
        scenarioId: selectedRegistration.scenarioId,
        algorithmId: selectedRegistration.algorithmId,
        datasetVersionId: selectedRegistration.datasetVersionId,
        deviceProfile,
        config: config as PlaygroundConfig,
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
          adapterVersion: session.adapterVersion ?? selectedRegistration.adapterVersion,
          configSchemaVersion:
            session.configSchemaVersion ?? selectedRegistration.configSchemaVersion,
          config: session.config as Record<string, unknown>,
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
    if (!selectedRegistration) {
      return;
    }

    resetSequenceRef.current += 1;

    if (status === 'running') {
      await handleStop();
    }

    activeRunRef.current = null;
    setConfig(cloneConfig(selectedRegistration.defaultConfig));
    setProgress(null);
    setResult(null);
    setSafeError(null);
    setPersistenceError(null);
    setStatus('idle');
  }

  async function handleSaveConfig() {
    if (!user || isRunBusy || !selectedRegistration) {
      return;
    }

    try {
      validateConfigForRegistration(selectedRegistration, config, deviceProfile);
      setPersistenceError(null);
      const idToken = await readRequiredIdToken();
      const savedConfig = await learningApiClient.createPlaygroundConfig({
        idToken,
        name: configName,
        scenarioId: selectedRegistration.scenarioId,
        algorithmId: selectedRegistration.algorithmId,
        datasetVersionId: selectedRegistration.datasetVersionId,
        config: config as PlaygroundConfig,
      });

      setConfigName(savedConfig.name);
      setSavedConfigs((currentConfigs) => upsertSavedConfig(currentConfigs, savedConfig));
      setConfigNameDrafts((currentDrafts) => ({
        ...currentDrafts,
        [savedConfig.configId]: savedConfig.name,
      }));
    } catch {
      setPersistenceError(t('playground.error.persistence'));
    }
  }

  function handleAlgorithmChange(nextPairKey: string) {
    previousActivePairKeyRef.current = null;
    setSelectedPairKey(nextPairKey);
  }

  function handleRestoreConfig(savedConfig: PlaygroundConfigRecord) {
    const registration = findUnlockedRegistrationForRecord(
      scenarioRegistrations,
      unlockedAlgorithmIds,
      savedConfig,
    );
    const deviceCompatibilityError = getSavedConfigDeviceCompatibilityError(
      registration,
      savedConfig,
      deviceProfile,
    );

    if (
      savedConfig.compatibilityStatus !== 'compatible' ||
      !registration ||
      deviceCompatibilityError
    ) {
      if (deviceCompatibilityError) {
        setPersistenceError(deviceCompatibilityError);
      }
      return;
    }

    previousActivePairKeyRef.current = getRegistrationKey(registration);
    setSelectedPairKey(getRegistrationKey(registration));
    setConfig(savedConfig.config as MlConfig);
    setConfigName(savedConfig.name);
    setProgress(null);
    setResult(null);
    setSafeError(null);
    setStatus('idle');
  }

  function getSavedConfigDraftName(savedConfig: PlaygroundConfigRecord) {
    return configNameDrafts[savedConfig.configId] ?? savedConfig.name;
  }

  async function handleRenameConfig(savedConfig: PlaygroundConfigRecord) {
    if (
      savedConfig.compatibilityStatus !== 'compatible' ||
      status === 'running' ||
      status === 'stopping'
    ) {
      return;
    }

    try {
      const idToken = await readRequiredIdToken();
      const updatedConfig = await learningApiClient.updatePlaygroundConfig({
        idToken,
        configId: savedConfig.configId,
        name: getSavedConfigDraftName(savedConfig),
      });

      setSavedConfigs((currentConfigs) => upsertSavedConfig(currentConfigs, updatedConfig));
      setConfigNameDrafts((currentDrafts) => ({
        ...currentDrafts,
        [updatedConfig.configId]: updatedConfig.name,
      }));
      setPersistenceError(null);
    } catch {
      setPersistenceError(t('playground.error.persistence'));
    }
  }

  async function handleUpdateConfig(savedConfig: PlaygroundConfigRecord) {
    const registration = selectedRegistration;

    if (
      savedConfig.compatibilityStatus !== 'compatible' ||
      !registration ||
      !isSamePair(savedConfig, registration) ||
      status === 'running' ||
      status === 'stopping'
    ) {
      return;
    }

    try {
      validateConfigForRegistration(registration, config, deviceProfile);
      const idToken = await readRequiredIdToken();
      const updatedConfig = await learningApiClient.updatePlaygroundConfig({
        idToken,
        configId: savedConfig.configId,
        name: getSavedConfigDraftName(savedConfig),
        config: config as PlaygroundConfig,
      });

      setSavedConfigs((currentConfigs) => upsertSavedConfig(currentConfigs, updatedConfig));
      setConfigNameDrafts((currentDrafts) => ({
        ...currentDrafts,
        [updatedConfig.configId]: updatedConfig.name,
      }));
      setPersistenceError(null);
    } catch {
      setPersistenceError(t('playground.error.persistence'));
    }
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
      setConfigNameDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };

        delete nextDrafts[configId];

        return nextDrafts;
      });
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
          <h1>{localize(selectedRegistration.title, locale)}</h1>
          <p>{localize(selectedRegistration.intro, locale)}</p>
        </div>
        <div className="playground-identity">
          <code>
            {selectedRegistration.scenarioId} / {selectedRegistration.algorithmId}
          </code>
          <span>{t('playground.verification')}</span>
        </div>
      </section>

      {selectedDataset ? (
        <DatasetTray
          disabled={isRunBusy}
          locale={locale}
          onSelect={handleDatasetSelect}
          selectedDatasetVersionId={selectedDatasetVersionId}
          scenarioDatasetIds={scenarioDatasetIds}
        />
      ) : null}

      <section className="playground-workspace">
        <form className="playground-controls" onSubmit={(event) => event.preventDefault()}>
          <h2>{t('playground.controls.title')}</h2>
          {scenarioRegistrations.length > 1 ? (
            <label className="playground-select-field">
              <span>{formatStaticLabel('Algorithm', locale)}</span>
              <select
                aria-label={formatStaticLabel('Algorithm', locale)}
                disabled={isRunBusy}
                onChange={(event) => handleAlgorithmChange(event.currentTarget.value)}
                value={activePairKey}
              >
                {scenarioRegistrations.map((registration) => {
                  const registrationKey = getRegistrationKey(registration);

                  return (
                    <option
                      disabled={!unlockedAlgorithmIds.has(registration.algorithmId)}
                      key={registrationKey}
                      value={registrationKey}
                    >
                      {formatAlgorithmName(registration.algorithmId, locale)}
                      {unlockedAlgorithmIds.has(registration.algorithmId)
                        ? ''
                        : ` (${formatStaticLabel('Locked', locale)})`}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : null}
          {selectedRegistration.parameterFields.map((field) => (
            <PlaygroundParameterControl
              deviceProfile={deviceProfile}
              disabled={isRunBusy}
              field={field}
              key={field.id}
              locale={locale}
              onChange={(value) =>
                setConfig((currentConfig) => ({
                  ...currentConfig,
                  [field.id]: value,
                }))
              }
              value={config[field.id]}
            />
          ))}
          <p className="playground-limit">
            {formatLimitSummary(selectedRegistration.parameterFields, deviceProfile, locale)}
          </p>
          <div className="playground-run-actions">
            <button disabled={isRunBusy} onClick={handleRun}>
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
            <button
              disabled={
                isRunBusy || typeof config.seed !== 'number' || !Number.isFinite(config.seed)
              }
              onClick={handleReshuffle}
              type="button"
            >
              <Shuffle aria-hidden="true" size={16} />
              {t('playground.reshuffle')}
            </button>
          </div>
          <div className="playground-config-save">
            <label className="playground-text-field">
              <span>{t('playground.configs.name')}</span>
              <input
                aria-label={t('playground.configs.name')}
                disabled={isRunBusy}
                maxLength={80}
                onChange={(event) => setConfigName(event.currentTarget.value)}
                type="text"
                value={configName}
              />
            </label>
            <button disabled={isRunBusy} onClick={handleSaveConfig} type="button">
              {t('playground.configs.save')}
            </button>
          </div>
        </form>

        <section className="playground-output" aria-live="polite">
          <h2>{t('playground.output.title')}</h2>
          <p className={`playground-status status-${status}`}>{t(`playground.status.${status}`)}</p>
          {progress ? <p>{formatProgressEvent(progress, locale)}</p> : null}
          {result ? (
            <PlaygroundResult dataset={selectedDataset} locale={locale} result={result} />
          ) : null}
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
              {savedRuns.map((savedRun) => {
                const metricSummary = formatSavedRunMetric(savedRun, scenarioRegistrations);

                return (
                  <li className="playground-history-card" key={savedRun.runId}>
                    <div>
                      <strong>{savedRun.runId}</strong>
                      <span>{savedRun.verificationLevel}</span>
                    </div>
                    <code>
                      {savedRun.scenarioId} / {savedRun.algorithmId} · {savedRun.datasetVersionId}
                    </code>
                    <small>
                      {formatVersionSummary(savedRun.adapterVersion, savedRun.configSchemaVersion)}
                    </small>
                    <p>
                      {metricSummary} ·{' '}
                      {t('playground.history.duration', {
                        duration: savedRun.durationMs,
                      })}
                    </p>
                    <button onClick={() => void handleDeleteRun(savedRun.runId)} type="button">
                      {t('playground.history.delete')}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="playground-muted">{t('playground.history.empty')}</p>
          )}
        </section>

        <section className="playground-configs">
          <h2>{t('playground.configs.title')}</h2>
          {savedConfigs.length > 0 ? (
            <ul className="playground-card-list">
              {savedConfigs.map((savedConfig) => {
                const savedConfigRegistration = findUnlockedRegistrationForRecord(
                  scenarioRegistrations,
                  unlockedAlgorithmIds,
                  savedConfig,
                );
                const deviceCompatibilityError = getSavedConfigDeviceCompatibilityError(
                  savedConfigRegistration,
                  savedConfig,
                  deviceProfile,
                );
                const isRestorable =
                  savedConfig.compatibilityStatus === 'compatible' &&
                  Boolean(savedConfigRegistration) &&
                  deviceCompatibilityError === null;
                const isUpdatable = isRestorable && isSamePair(savedConfig, selectedRegistration);

                return (
                  <li className="playground-config-card" key={savedConfig.configId}>
                    <div>
                      <strong>{savedConfig.name}</strong>
                      <span>{savedConfig.compatibilityStatus}</span>
                    </div>
                    <p>
                      {savedConfig.algorithmId} · {savedConfig.datasetVersionId} ·{' '}
                      {formatSavedConfigSummary(savedConfig.config)}
                    </p>
                    <small>
                      {formatVersionSummary(
                        savedConfig.adapterVersion,
                        savedConfig.configSchemaVersion,
                      )}
                    </small>
                    {savedConfig.compatibilityStatus === 'incompatible' ? (
                      <p className="playground-error">
                        {savedConfig.compatibilityReason ?? t('playground.configs.incompatible')}
                      </p>
                    ) : null}
                    {savedConfig.compatibilityStatus === 'compatible' &&
                    deviceCompatibilityError ? (
                      <p className="playground-error">{deviceCompatibilityError}</p>
                    ) : null}
                    <label className="playground-config-edit">
                      <span>{t('playground.configs.savedName')}</span>
                      <input
                        aria-label={t('playground.configs.savedName')}
                        disabled={!isRestorable || isRunBusy}
                        maxLength={80}
                        onChange={(event) => {
                          const nextName = event.currentTarget.value;

                          setConfigNameDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [savedConfig.configId]: nextName,
                          }));
                        }}
                        type="text"
                        value={getSavedConfigDraftName(savedConfig)}
                      />
                    </label>
                    <div className="playground-card-actions">
                      <button
                        aria-label={`${t('playground.configs.restore')} ${savedConfig.name}`}
                        disabled={!isRestorable || isRunBusy}
                        onClick={() => handleRestoreConfig(savedConfig)}
                        type="button"
                      >
                        {t('playground.configs.restore')}
                      </button>
                      <button
                        aria-label={`${t('playground.configs.rename')} ${savedConfig.name}`}
                        disabled={!isRestorable || isRunBusy}
                        onClick={() => void handleRenameConfig(savedConfig)}
                        type="button"
                      >
                        {t('playground.configs.rename')}
                      </button>
                      <button
                        aria-label={`${t('playground.configs.updateCurrent')} ${savedConfig.name}`}
                        disabled={!isUpdatable || isRunBusy}
                        onClick={() => void handleUpdateConfig(savedConfig)}
                        type="button"
                      >
                        {t('playground.configs.updateCurrent')}
                      </button>
                      <button
                        onClick={() => void handleDeleteConfig(savedConfig.configId)}
                        type="button"
                      >
                        {t('playground.configs.delete')}
                      </button>
                    </div>
                  </li>
                );
              })}
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

function DatasetTray({
  disabled,
  locale,
  onSelect,
  scenarioDatasetIds,
  selectedDatasetVersionId,
}: {
  disabled: boolean;
  locale: Locale;
  onSelect: (datasetVersionId: string) => void;
  scenarioDatasetIds: readonly string[];
  selectedDatasetVersionId: string | null;
}) {
  const { t } = useTranslation();
  const [dropMessage, setDropMessage] = useState<string | null>(null);

  function handleDragStart(event: DragEvent<HTMLElement>, datasetVersionId: string): void {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', datasetVersionId);
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    const droppedDatasetVersionId = event.dataTransfer.getData('text/plain');

    if (droppedDatasetVersionId && scenarioDatasetIds.includes(droppedDatasetVersionId)) {
      setDropMessage(null);
      onSelect(droppedDatasetVersionId);
      return;
    }

    setDropMessage(t('playground.dataset.unsupportedUpload'));
  }

  return (
    <section
      aria-label={t('playground.dataset.trayLabel')}
      className="playground-dataset-tray"
      data-testid="playground-dataset-tray"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="playground-dataset-tray-heading">
        <div>
          <span className="eyebrow">{t('playground.dataset.eyebrow')}</span>
          <h2>{t('playground.dataset.title')}</h2>
        </div>
        <p>{t('playground.dataset.hint')}</p>
      </div>
      <div className="playground-dataset-list">
        {scenarioDatasetIds.map((datasetVersionId) => {
          const dataset = getPlaygroundDataset(datasetVersionId);
          const isSelected = datasetVersionId === selectedDatasetVersionId;

          return (
            <article
              className={
                isSelected ? 'playground-dataset-card is-selected' : 'playground-dataset-card'
              }
              data-testid={`playground-dataset-card-${datasetVersionId}`}
              draggable={!disabled}
              key={datasetVersionId}
              onDragStart={(event) => handleDragStart(event, datasetVersionId)}
            >
              <div className="playground-dataset-card-heading">
                <div>
                  <Database aria-hidden="true" size={17} />
                  <code>{dataset.datasetVersionId}</code>
                </div>
                <span>{isSelected ? t('playground.dataset.selected') : dataset.task}</span>
              </div>
              <p>{localize(dataset.textAlternative, locale)}</p>
              <div className="playground-dataset-facts">
                <span>{t('playground.dataset.rows', { count: dataset.rows.length })}</span>
                <span>
                  {t('playground.dataset.features', { count: dataset.featureColumns.length })}
                </span>
              </div>
              <button
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => onSelect(datasetVersionId)}
                type="button"
              >
                {t('playground.dataset.use')}
              </button>
            </article>
          );
        })}
      </div>
      <p className="playground-dataset-selection" data-testid="playground-selected-dataset">
        {t('playground.dataset.current', { dataset: selectedDatasetVersionId ?? '—' })}
      </p>
      {dropMessage ? <p className="playground-error">{dropMessage}</p> : null}
    </section>
  );
}

function PlaygroundParameterControl({
  deviceProfile,
  disabled,
  field,
  locale,
  onChange,
  value,
}: {
  deviceProfile: DeviceProfile;
  disabled: boolean;
  field: PlaygroundParameterField;
  locale: Locale;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const label = localize(field.label, locale);

  if (field.kind === 'boolean') {
    return (
      <label className="playground-checkbox-field">
        <input
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>{label}</span>
      </label>
    );
  }

  if (field.kind === 'enum') {
    return (
      <label className="playground-select-field">
        <span>{label}</span>
        <select
          aria-label={label}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={typeof value === 'string' ? value : ''}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {localize(option.label, locale)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === 'integer-array') {
    return (
      <label className="playground-array-field">
        <span>{label}</span>
        <input
          aria-label={label}
          disabled={disabled}
          onChange={(event) => onChange(parseIntegerArrayFieldValue(event.currentTarget.value))}
          type="text"
          value={Array.isArray(value) ? value.join(', ') : ''}
        />
      </label>
    );
  }

  return (
    <NumberField
      disabled={disabled}
      label={label}
      max={getNumberFieldMax(field, deviceProfile)}
      min={field.min}
      onChange={onChange}
      step={field.step}
      value={typeof value === 'number' ? value : 0}
    />
  );
}

function NumberField({
  disabled,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  disabled: boolean;
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
        disabled={disabled}
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

function PlaygroundResult({
  dataset,
  locale,
  result,
}: {
  dataset: ReturnType<typeof getPlaygroundDataset> | null;
  locale: Locale;
  result: MlRunResult;
}) {
  const metricEntries = Object.entries(result.metrics);

  return (
    <div className="playground-result" data-testid="playground-result">
      <div className="playground-metrics">
        {metricEntries.map(([metricId, value]) => (
          <div className="playground-metric" key={metricId}>
            <span>{formatMetricLabel(metricId)}</span>
            <strong>{formatMetricValue(metricId, value)}</strong>
          </div>
        ))}
      </div>
      {result.textAlternative ? (
        <p className="playground-result-text">{result.textAlternative[locale]}</p>
      ) : null}
      <PlaygroundVisualization dataset={dataset} locale={locale} result={result} />
      <ResultSummary locale={locale} result={result} />
      {result.feedback.length > 0 ? (
        <ul className="playground-feedback">
          {result.feedback.map((feedbackId) => (
            <li key={feedbackId}>{formatFeedback(feedbackId, locale)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ResultSummary({ locale, result }: { locale: Locale; result: MlRunResult }) {
  const summaries = [
    result.boundary ? { label: 'Boundary', value: result.boundary } : null,
    result.chartSummary ? { label: 'Chart summary', value: result.chartSummary } : null,
  ].filter((summary): summary is { label: string; value: Record<string, unknown> } =>
    Boolean(summary),
  );

  if (summaries.length === 0) {
    return null;
  }

  return (
    <dl
      className="playground-summary-list"
      aria-label={formatStaticLabel('Result summary', locale)}
    >
      {summaries.map((summary) => (
        <div key={summary.label}>
          <dt>{formatStaticLabel(summary.label, locale)}</dt>
          <dd>{formatSummaryValue(summary.value)}</dd>
        </div>
      ))}
    </dl>
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

function LockedPlaygroundLabList({
  locale,
  registrations,
  unlockedAlgorithmIds,
}: {
  locale: Locale;
  registrations: readonly PlaygroundPairRegistration[];
  unlockedAlgorithmIds: ReadonlySet<string>;
}) {
  return (
    <ul aria-label={formatLockedLabListLabel(locale)} className="playground-locked-lab-list">
      {registrations.map((registration) => {
        const isUnlocked = unlockedAlgorithmIds.has(registration.algorithmId);
        const requiredModule = findUnlockModuleForAlgorithm(registration.algorithmId);

        return (
          <li className="playground-locked-lab-card" key={getRegistrationKey(registration)}>
            <div>
              <span className={isUnlocked ? 'is-open' : ''}>
                {formatPlaygroundLockState(isUnlocked, locale)}
              </span>
              <code>{registration.datasetVersionId}</code>
            </div>
            <h2>{localize(registration.title, locale)}</h2>
            <p>{localize(registration.intro, locale)}</p>
            <p>
              {formatUnlockRequirement(
                requiredModule ? localize(requiredModule.title, locale) : null,
                locale,
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function selectPlayableRegistration(input: {
  registrations: readonly PlaygroundPairRegistration[];
  selectedPairKey: string | null;
  unlockedAlgorithmIds: ReadonlySet<string>;
}): PlaygroundPairRegistration | null {
  const unlockedRegistrations = input.registrations.filter((registration) =>
    input.unlockedAlgorithmIds.has(registration.algorithmId),
  );

  if (unlockedRegistrations.length === 0) {
    return null;
  }

  if (input.selectedPairKey) {
    const selectedRegistration = unlockedRegistrations.find(
      (registration) => getRegistrationKey(registration) === input.selectedPairKey,
    );

    if (selectedRegistration) {
      return selectedRegistration;
    }
  }

  return unlockedRegistrations[0] ?? null;
}

function validateConfigForRegistration(
  registration: PlaygroundPairRegistration,
  config: MlConfig,
  deviceProfile: DeviceProfile,
): void {
  const allowedFieldIds = new Set(registration.parameterFields.map((field) => field.id));
  const unsupportedFields = Object.keys(config).filter((fieldId) => !allowedFieldIds.has(fieldId));

  if (unsupportedFields.length > 0) {
    throw new Error(`Unsupported config fields: ${unsupportedFields.join(', ')}.`);
  }

  for (const field of registration.parameterFields) {
    validateParameterField(field, config[field.id], deviceProfile);
  }

  if (!registration.adapter) {
    throw new Error('The selected playground pair is not available in this worker yet.');
  }

  registration.adapter.validateConfig(config);
}

function validateParameterField(
  field: PlaygroundParameterField,
  value: unknown,
  deviceProfile: DeviceProfile,
): void {
  if (field.kind === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new Error(`${field.id} must be a boolean.`);
    }
    return;
  }

  if (field.kind === 'enum') {
    if (typeof value !== 'string' || !field.options.some((option) => option.value === value)) {
      throw new Error(
        `${field.id} must be one of: ${field.options.map((option) => option.value).join(', ')}.`,
      );
    }
    return;
  }

  if (field.kind === 'integer-array') {
    validateIntegerArrayField(field, value, deviceProfile);
    return;
  }

  validateNumberField(field, value, deviceProfile);
}

function validateNumberField(
  field: Extract<PlaygroundParameterField, { kind: 'number' }>,
  value: unknown,
  deviceProfile: DeviceProfile,
): void {
  const max = getNumberFieldMax(field, deviceProfile);

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field.id} must be a finite number.`);
  }

  if (value < field.min || value > max) {
    const deviceSuffix = field.maxByDeviceProfile?.[deviceProfile] ? ` for ${deviceProfile}` : '';

    throw new Error(`${field.id} must be between ${field.min} and ${max}${deviceSuffix}.`);
  }

  if (field.integer === true && !Number.isInteger(value)) {
    throw new Error(`${field.id} must be an integer.`);
  }
}

function validateIntegerArrayField(
  field: Extract<PlaygroundParameterField, { kind: 'integer-array' }>,
  value: unknown,
  deviceProfile: DeviceProfile,
): void {
  const maxItems = field.maxItemsByDeviceProfile?.[deviceProfile] ?? field.maxItems;
  const itemMax = field.itemMaxByDeviceProfile?.[deviceProfile] ?? field.itemMax;

  if (!Array.isArray(value)) {
    throw new Error(`${field.id} must be an integer array.`);
  }

  if (value.length > maxItems) {
    throw new Error(`${field.id} must include ${maxItems} entries or fewer.`);
  }

  for (const item of value) {
    if (
      typeof item !== 'number' ||
      !Number.isInteger(item) ||
      item < field.itemMin ||
      item > itemMax
    ) {
      throw new Error(
        `${field.id} entries must be integers between ${field.itemMin} and ${itemMax}.`,
      );
    }
  }
}

function formatLimitSummary(
  fields: readonly PlaygroundParameterField[],
  deviceProfile: DeviceProfile,
  locale: Locale,
): string {
  const parts = fields.flatMap((field) => {
    if (field.kind === 'number' && (field.maxByDeviceProfile || field.integer)) {
      return [`${field.id} ≤ ${getNumberFieldMax(field, deviceProfile)}`];
    }

    if (field.kind === 'integer-array') {
      const maxItems = field.maxItemsByDeviceProfile?.[deviceProfile] ?? field.maxItems;
      const itemMax = field.itemMaxByDeviceProfile?.[deviceProfile] ?? field.itemMax;

      return [`${field.id}: ${maxItems} layers, each ≤ ${itemMax}`];
    }

    return [];
  });

  if (parts.length === 0) {
    return locale === 'vi'
      ? `Giới hạn ${deviceProfile}: cấu hình được kiểm tra trước khi chạy`
      : `${deviceProfile} limit: config is validated before each run`;
  }

  return locale === 'vi'
    ? `Giới hạn ${deviceProfile}: ${parts.join(' · ')}`
    : `${deviceProfile} limit: ${parts.join(' · ')}`;
}

function formatProgressEvent(progress: MlProgressEvent, locale: Locale): string {
  if (typeof progress.epoch === 'number') {
    const total = typeof progress.totalEpochs === 'number' ? `/${progress.totalEpochs}` : '';
    const loss =
      typeof progress.loss === 'number' ? `, loss ${formatMetricValue('loss', progress.loss)}` : '';

    return `Epoch ${progress.epoch}${total}${loss}`;
  }

  if (typeof progress.iteration === 'number') {
    const total =
      typeof progress.totalIterations === 'number' ? `/${progress.totalIterations}` : '';
    const metric = progress.metric
      ? `, ${formatMetricLabel(progress.metric.id)} ${formatMetricValue(progress.metric.id, progress.metric.value)}`
      : '';

    return `${formatStaticLabel('Iteration', locale)} ${progress.iteration}${total}${metric}`;
  }

  if (progress.metric) {
    return `${formatMetricLabel(progress.metric.id)} ${formatMetricValue(progress.metric.id, progress.metric.value)}`;
  }

  return locale === 'vi' ? 'Đang xử lý…' : 'Processing…';
}

function formatSavedRunMetric(
  savedRun: PlaygroundRunRecord,
  registrations: readonly PlaygroundPairRegistration[],
): string {
  const registration = findRegistrationForRecord(registrations, savedRun);
  const metricId = registration?.primaryMetricId ?? Object.keys(savedRun.metrics)[0] ?? 'metric';

  return `${formatMetricLabel(metricId)} ${formatMetricValue(metricId, savedRun.metrics[metricId])}`;
}

function getNumberFieldMax(
  field: Extract<PlaygroundParameterField, { kind: 'number' }>,
  deviceProfile: DeviceProfile,
): number {
  return field.maxByDeviceProfile?.[deviceProfile] ?? field.max;
}

function getRegistrationKey(
  registration: Pick<PlaygroundPairRegistration, 'algorithmId' | 'datasetVersionId' | 'scenarioId'>,
): string {
  return `${registration.scenarioId}/${registration.algorithmId}/${registration.datasetVersionId}`;
}

function findRegistrationForRecord(
  registrations: readonly PlaygroundPairRegistration[],
  record: Pick<
    PlaygroundConfigRecord | PlaygroundRunRecord,
    'algorithmId' | 'datasetVersionId' | 'scenarioId'
  >,
): PlaygroundPairRegistration | null {
  return (
    registrations.find(
      (registration) =>
        registration.scenarioId === record.scenarioId &&
        registration.algorithmId === record.algorithmId &&
        registration.datasetVersionId === record.datasetVersionId,
    ) ?? null
  );
}

function findUnlockedRegistrationForRecord(
  registrations: readonly PlaygroundPairRegistration[],
  unlockedAlgorithmIds: ReadonlySet<string>,
  record: PlaygroundConfigRecord,
): PlaygroundPairRegistration | null {
  const registration = findRegistrationForRecord(registrations, record);

  if (!registration || !unlockedAlgorithmIds.has(registration.algorithmId)) {
    return null;
  }

  return registration;
}

function getSavedConfigDeviceCompatibilityError(
  registration: PlaygroundPairRegistration | null,
  savedConfig: PlaygroundConfigRecord,
  deviceProfile: DeviceProfile,
): string | null {
  if (!registration || savedConfig.compatibilityStatus !== 'compatible') {
    return null;
  }

  try {
    validateConfigForRegistration(registration, savedConfig.config as MlConfig, deviceProfile);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Saved config is not valid for this device.';
  }
}

function isSamePair(
  record: Pick<PlaygroundConfigRecord, 'algorithmId' | 'datasetVersionId' | 'scenarioId'>,
  registration: PlaygroundPairRegistration,
): boolean {
  return (
    record.scenarioId === registration.scenarioId &&
    record.algorithmId === registration.algorithmId &&
    record.datasetVersionId === registration.datasetVersionId
  );
}

function cloneConfig(config: MlConfig): MlConfig {
  return JSON.parse(JSON.stringify(config)) as MlConfig;
}

function parseIntegerArrayFieldValue(value: string): number[] {
  return value
    .split(/[\s,]+/)
    .filter((part) => part.length > 0)
    .map((part) => Number(part));
}

function createReshuffledSeed(seed: number): number {
  const nextSeed = Math.floor(createSeededRandom(seed + 1)() * 1_000_001);

  if (nextSeed !== seed) {
    return nextSeed;
  }

  return seed === 1_000_000 ? 0 : seed + 1;
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

function formatMetricLabel(metricId: string): string {
  const knownLabels: Record<string, string> = {
    accuracy: 'Accuracy',
    'explained-variance': 'Explained variance',
    f1: 'F1',
    inertia: 'Inertia',
    loss: 'Loss',
    mae: 'MAE',
    precision: 'Precision',
    r2: 'R²',
    recall: 'Recall',
    'reconstruction-error': 'Reconstruction error',
    rmse: 'RMSE',
    silhouette: 'Silhouette',
    testAccuracy: 'Test accuracy',
    trainAccuracy: 'Train accuracy',
  };

  return (
    knownLabels[metricId] ??
    metricId
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split('-')
      .join(' ')
      .replace(/^\w/, (letter) => letter.toUpperCase())
  );
}

function formatMetricValue(metricId: string, value: MlMetricValue | undefined): string {
  if (typeof value !== 'number') {
    return '—';
  }

  if (PERCENT_METRIC_IDS.has(metricId)) {
    return `${Math.round(value * 100)}%`;
  }

  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(4).replace(/\.?0+$/, '');
}

function formatSummaryValue(value: Record<string, unknown>): string {
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${formatUnknownValue(item)}`)
    .join(' · ');
}

function formatUnknownValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatUnknownValue(item)).join(', ')}]`;
  }

  if (typeof value === 'number') {
    return formatMetricValue('number', value);
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  return '—';
}

function formatSavedConfigSummary(config: PlaygroundConfig): string {
  const record = config as Record<string, unknown>;
  const summaryParts: string[] = [];

  if (typeof record.learningRate === 'number') {
    summaryParts.push(`lr ${record.learningRate}`);
  }

  if (typeof record.epochs === 'number') {
    summaryParts.push(`epochs ${record.epochs}`);
  }

  if (Array.isArray(record.hiddenLayers)) {
    summaryParts.push(`layers ${record.hiddenLayers.join('-')}`);
  }

  if (typeof record.activation === 'string') {
    summaryParts.push(`activation ${record.activation}`);
  }

  if (typeof record.components === 'number') {
    summaryParts.push(`components ${record.components}`);
  }

  if (typeof record.scale === 'boolean') {
    summaryParts.push(`scale ${record.scale}`);
  }

  if (typeof record.k === 'number') {
    summaryParts.push(`k ${record.k}`);
  }

  if (typeof record.maxDepth === 'number') {
    summaryParts.push(`depth ${record.maxDepth}`);
  }

  if (typeof record.fitIntercept === 'boolean') {
    summaryParts.push(`intercept ${record.fitIntercept}`);
  }

  if (typeof record.seed === 'number') {
    summaryParts.push(`seed ${record.seed}`);
  }

  return summaryParts.length > 0 ? summaryParts.join(' · ') : 'custom parameters';
}

function formatVersionSummary(
  adapterVersion: string | undefined,
  configSchemaVersion: 1 | undefined,
): string {
  return `adapter ${adapterVersion ?? 'current'} · schema v${configSchemaVersion ?? 1}`;
}

function formatAlgorithmName(algorithmId: string, locale: Locale): string {
  const labels: Record<string, { en: string; vi: string }> = {
    'decision-tree': { en: 'Decision tree', vi: 'Decision tree' },
    'hierarchical-clustering': { en: 'Hierarchical clustering', vi: 'Phân cụm phân cấp' },
    kmeans: { en: 'K-Means', vi: 'K-Means' },
    knn: { en: 'K-Nearest Neighbors', vi: 'K-Nearest Neighbors' },
    'lasso-regression': { en: 'Lasso regression', vi: 'Hồi quy Lasso' },
    'linear-regression': { en: 'Linear regression', vi: 'Hồi quy tuyến tính' },
    'logistic-regression': { en: 'Logistic regression', vi: 'Hồi quy logistic' },
    mlp: { en: 'MLP', vi: 'MLP' },
    'naive-bayes': { en: 'Naive Bayes', vi: 'Naive Bayes' },
    pca: { en: 'PCA', vi: 'PCA' },
    perceptron: { en: 'Perceptron', vi: 'Perceptron' },
    'polynomial-regression': { en: 'Polynomial regression', vi: 'Hồi quy đa thức' },
    'random-forest': { en: 'Random forest', vi: 'Random forest' },
    'ridge-regression': { en: 'Ridge regression', vi: 'Hồi quy Ridge' },
    svm: { en: 'Support vector machine', vi: 'Support vector machine' },
  };

  return labels[algorithmId]?.[locale] ?? algorithmId;
}

function formatStaticLabel(label: string, locale: Locale): string {
  const labels: Record<string, { en: string; vi: string }> = {
    Algorithm: { en: 'Algorithm', vi: 'Thuật toán' },
    Boundary: { en: 'Boundary', vi: 'Ranh giới' },
    Iteration: { en: 'Iteration', vi: 'Vòng lặp' },
    Locked: { en: 'locked', vi: 'đã khóa' },
    'Result summary': { en: 'Result summary', vi: 'Tóm tắt kết quả' },
    'Chart summary': { en: 'Chart summary', vi: 'Tóm tắt biểu đồ' },
  };

  return labels[label]?.[locale] ?? label;
}

function formatLockedLabListLabel(locale: Locale): string {
  return locale === 'vi' ? 'Danh sách lab Playground đã khóa' : 'Locked Playground lab list';
}

function formatPlaygroundLockState(isUnlocked: boolean, locale: Locale): string {
  if (isUnlocked) {
    return locale === 'vi' ? 'Đã mở' : 'Unlocked';
  }

  return locale === 'vi' ? 'Đã khóa' : 'Locked';
}

function formatUnlockRequirement(moduleTitle: string | null, locale: Locale): string {
  if (!moduleTitle) {
    return locale === 'vi'
      ? 'Hoàn thành module liên quan để mở lab này.'
      : 'Complete the related module to unlock this lab.';
  }

  return locale === 'vi'
    ? `Cần hoàn thành module: ${moduleTitle}.`
    : `Required module: ${moduleTitle}.`;
}

function formatLockedMessage(
  registrations: readonly PlaygroundPairRegistration[],
  locale: Locale,
): string {
  const algorithmList = registrations
    .map((registration) => formatAlgorithmName(registration.algorithmId, locale))
    .join(', ');

  if (locale === 'vi') {
    return `Hoàn thành module liên quan để mở ít nhất một thuật toán đã publish cho scenario này: ${algorithmList}.`;
  }

  return `Complete the related module to unlock at least one published algorithm for this scenario: ${algorithmList}.`;
}

function findUnlockModuleForAlgorithm(algorithmId: string) {
  return (
    courses
      .flatMap((course) => course.modules ?? [])
      .find((module) => module.unlockAlgorithmIds.includes(algorithmId)) ?? null
  );
}

function getScenarioGroups(): Array<{
  registrations: PlaygroundPairRegistration[];
  scenarioId: string;
}> {
  const grouped = new Map<string, PlaygroundPairRegistration[]>();

  for (const registration of getPlaygroundPairRegistry()) {
    const current = grouped.get(registration.scenarioId) ?? [];
    current.push(registration);
    grouped.set(registration.scenarioId, current);
  }

  return [...grouped.entries()]
    .sort(
      ([firstScenarioId], [secondScenarioId]) =>
        getScenarioOrder(firstScenarioId) - getScenarioOrder(secondScenarioId),
    )
    .map(([scenarioId, registrations]) => ({ registrations, scenarioId }));
}

function getScenarioOrder(scenarioId: string): number {
  const index = SCENARIO_DISPLAY_ORDER.indexOf(scenarioId);

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

const SCENARIO_DISPLAY_ORDER: readonly string[] = [
  'pg-house-price',
  'pg-insurance-cost',
  'pg-spam-detection',
  'pg-customer-churn',
  'pg-credit-risk',
  'pg-wine-cultivar',
  'pg-retail-segments',
  'pg-country-indicators',
  'pg-xor',
  'pg-nonlinear-2d',
] as const;

function formatScenarioName(scenarioId: string, locale: Locale): string {
  const labels: Record<string, { en: string; vi: string }> = {
    'pg-country-indicators': { en: 'Country indicators', vi: 'Chỉ báo quốc gia' },
    'pg-credit-risk': { en: 'Credit risk', vi: 'Rủi ro tín dụng' },
    'pg-customer-churn': { en: 'Customer churn', vi: 'Rời bỏ khách hàng' },
    'pg-house-price': { en: 'House price', vi: 'Giá nhà' },
    'pg-insurance-cost': { en: 'Insurance cost', vi: 'Chi phí bảo hiểm' },
    'pg-nonlinear-2d': { en: 'Nonlinear 2D', vi: '2D phi tuyến' },
    'pg-retail-segments': { en: 'Retail segments', vi: 'Phân khúc bán lẻ' },
    'pg-spam-detection': { en: 'Spam detection', vi: 'Phát hiện spam' },
    'pg-wine-cultivar': { en: 'Wine cultivar', vi: 'Giống nho' },
    'pg-xor': { en: 'XOR', vi: 'XOR' },
  };

  return labels[scenarioId]?.[locale] ?? scenarioId;
}

function formatFeedback(feedbackId: string, locale: Locale): string {
  const messages: Record<string, { en: string; vi: string }> = {
    imbalance: {
      en: 'Imbalance: inspect precision and recall instead of relying on accuracy alone.',
      vi: 'Mất cân bằng lớp: xem precision và recall thay vì chỉ dựa vào accuracy.',
    },
    'linear-limit': {
      en: 'Linear limit: one straight boundary cannot separate XOR.',
      vi: 'Giới hạn tuyến tính: một ranh giới thẳng không tách được XOR.',
    },
    'low-variance': {
      en: 'Low variance: the selected components explain too little of the dataset.',
      vi: 'Phương sai thấp: các thành phần được chọn giải thích quá ít dữ liệu.',
    },
    'non-convergence': {
      en: 'Non-convergence: more epochs do not remove the XOR conflict.',
      vi: 'Không hội tụ: tăng epoch không xóa được mâu thuẫn XOR.',
    },
    overfit: {
      en: 'Overfit: training behavior may not generalize to the test split.',
      vi: 'Overfit: hành vi train có thể không khái quát sang tập test.',
    },
    'residual-bias': {
      en: 'Residual bias: residuals suggest the linear fit is missing structure.',
      vi: 'Residual bias: phần dư cho thấy mô hình tuyến tính còn bỏ sót cấu trúc.',
    },
    'scale-warning': {
      en: 'Scale warning: compare PCA behavior with and without feature scaling.',
      vi: 'Cảnh báo scale: so sánh PCA khi bật và tắt chuẩn hóa feature.',
    },
    threshold: {
      en: 'Threshold: changing the cutoff trades precision against recall.',
      vi: 'Ngưỡng phân loại: đổi cutoff sẽ đánh đổi precision và recall.',
    },
    'too-few-clusters': {
      en: 'Too few clusters: several distinct groups may be merged together.',
      vi: 'Quá ít cụm: nhiều nhóm khác nhau có thể bị gộp lại.',
    },
    'too-many-clusters': {
      en: 'Too many clusters: one natural group may be split into fragments.',
      vi: 'Quá nhiều cụm: một nhóm tự nhiên có thể bị chia vụn.',
    },
    underfit: {
      en: 'Underfit: the model is too constrained for the visible pattern.',
      vi: 'Underfit: mô hình đang bị ràng buộc quá mạnh so với pattern dữ liệu.',
    },
  };

  return messages[feedbackId]?.[locale] ?? formatMetricLabel(feedbackId);
}

function getDeviceProfile(): DeviceProfile {
  if (globalThis.matchMedia?.('(max-width: 767px)').matches) {
    return 'mobile';
  }

  return globalThis.innerWidth < 768 ? 'mobile' : 'desktop';
}
