import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import type {
  DemoCompletionResult,
  LearningApiClient,
  LearningDemoContent,
  LearningDemoStep,
} from './learning-api';

interface LearningDemoPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type CompletionStatus = 'failed' | 'idle' | 'ready' | 'submitting';

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

const copy: Readonly<
  Record<
    Locale,
    {
      algorithm: string;
      backToLesson: string;
      complete: string;
      completed: string;
      failed: string;
      fixed: string;
      moduleQuiz: string;
      next: string;
      notFoundBack: string;
      notFoundBody: string;
      notFoundTitle: string;
      previous: string;
      progress: (viewed: number, total: number) => string;
      progressLabel: string;
      result: string;
      seed: string;
    }
  >
> = {
  en: {
    algorithm: 'Algorithm',
    backToLesson: 'Back to lesson',
    complete: 'Completing demo…',
    completed: 'demo_completed',
    failed: 'Demo completion could not be recorded. Revisit the required steps and try again.',
    fixed: 'FIXED DEMO',
    moduleQuiz: 'Open the module quiz',
    next: 'Next step',
    notFoundBack: 'Back to course catalog',
    notFoundBody: 'This demo is not available for the current learner access.',
    notFoundTitle: 'Demo not available',
    previous: 'Previous step',
    progress: (viewed, total) => `Required steps ${viewed} / ${total}`,
    progressLabel: 'Demo progress',
    result: 'Result',
    seed: 'Seed',
  },
  vi: {
    algorithm: 'Thuật toán',
    backToLesson: 'Quay lại bài học',
    complete: 'Đang ghi nhận demo…',
    completed: 'demo_completed',
    failed: 'Chưa thể ghi nhận hoàn thành demo. Hãy xem lại các bước bắt buộc rồi thử lại.',
    fixed: 'DEMO CỐ ĐỊNH',
    moduleQuiz: 'Mở quiz module',
    next: 'Bước tiếp theo',
    notFoundBack: 'Về danh sách khóa học',
    notFoundBody: 'Demo này chưa khả dụng với quyền truy cập hiện tại.',
    notFoundTitle: 'Demo chưa khả dụng',
    previous: 'Bước trước',
    progress: (viewed, total) => `Bước bắt buộc ${viewed} / ${total}`,
    progressLabel: 'Tiến độ demo',
    result: 'Kết quả',
    seed: 'Seed',
  },
};

export function LearningDemoPage({ learningApiClient, locale }: LearningDemoPageProps) {
  const { getIdToken, status } = useAuth();
  const { courseId, demoId } = useParams();
  const routeKey = courseId && demoId ? `${courseId}:${demoId}` : null;
  const [loadedDemo, setLoadedDemo] = useState<{
    demo: LearningDemoContent;
    routeKey: string;
  } | null>(null);
  const [demoLoadState, setDemoLoadState] = useState<{
    routeKey: string;
    status: 'failed' | 'ready';
  } | null>(null);
  const demo =
    status === 'authenticated' && loadedDemo?.routeKey === routeKey ? loadedDemo.demo : null;
  const currentDemoLoadState = demoLoadState?.routeKey === routeKey ? demoLoadState : null;
  const [stepIndex, setStepIndex] = useState(0);
  const [viewedStepIds, setViewedStepIds] = useState<readonly string[]>([]);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('idle');
  const [completionResult, setCompletionResult] = useState<DemoCompletionResult | null>(null);
  const idempotencyKey = useRef(createIdempotencyKey());
  const completionStarted = useRef(false);
  const text = copy[locale];
  const currentStep = demo?.steps[stepIndex];
  const module = demo
    ? getCourse(demo.courseId)?.modules?.find((item) => item.id === demo.moduleId)
    : null;
  const backPostId = module?.postIds.at(-1) ?? module?.postId ?? null;
  const moduleQuizId = module ? createModuleQuizId(module.id) : null;
  const requiredStepIds = useMemo(() => new Set(demo?.requiredStepIds ?? []), [demo]);
  const requiredViewedCount = viewedStepIds.filter((stepId) => requiredStepIds.has(stepId)).length;
  const isComplete = demo ? requiredViewedCount === demo.requiredStepIds.length : false;

  function showStep(nextIndex: number) {
    if (!demo) {
      return;
    }

    const boundedIndex = Math.max(0, Math.min(nextIndex, demo.steps.length - 1));
    const nextStepId = demo.steps[boundedIndex]?.id;

    setStepIndex(boundedIndex);

    if (nextStepId) {
      setViewedStepIds((currentValue) =>
        currentValue.includes(nextStepId) ? currentValue : [...currentValue, nextStepId],
      );
    }
  }

  useEffect(() => {
    if (!routeKey || !courseId || !demoId || status !== 'authenticated') {
      return undefined;
    }

    let isActive = true;
    const activeCourseId = courseId;
    const activeDemoId = demoId;
    const activeRouteKey = routeKey;

    async function loadDemoContent() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const content = await learningApiClient.getDemoContent({ demoId: activeDemoId, idToken });

        if (content.courseId !== activeCourseId || content.demoId !== activeDemoId) {
          throw new Error('The demo content response is not valid for this route.');
        }

        if (isActive) {
          completionStarted.current = false;
          idempotencyKey.current = createIdempotencyKey();
          setCompletionResult(null);
          setCompletionStatus('idle');
          setStepIndex(0);
          setViewedStepIds(content.steps[0]?.id ? [content.steps[0].id] : []);
          setLoadedDemo({ demo: content, routeKey: activeRouteKey });
          setDemoLoadState({ routeKey: activeRouteKey, status: 'ready' });
        }
      } catch {
        if (isActive) {
          setDemoLoadState({ routeKey: activeRouteKey, status: 'failed' });
        }
      }
    }

    void loadDemoContent();

    return () => {
      isActive = false;
    };
  }, [courseId, demoId, getIdToken, learningApiClient, routeKey, status]);

  useEffect(() => {
    if (!demo || viewedStepIds.length === 0) {
      return;
    }

    const activeDemo = demo;
    let isActive = true;

    async function recordDemoView() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        await learningApiClient.recordDemoView({
          demoId: activeDemo.demoId,
          idToken,
          viewedStepIds,
        });
      } catch {
        if (!isActive) {
          return;
        }
      }
    }

    void recordDemoView();

    return () => {
      isActive = false;
    };
  }, [demo, getIdToken, learningApiClient, viewedStepIds]);

  useEffect(() => {
    if (!demo || !isComplete || completionStarted.current) {
      return;
    }

    let isActive = true;
    const activeDemo = demo;
    completionStarted.current = true;

    async function completeDemo() {
      setCompletionStatus('submitting');

      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const result = await learningApiClient.completeDemo({
          demoId: activeDemo.demoId,
          idToken,
          idempotencyKey: idempotencyKey.current,
          viewedStepIds,
        });

        if (isActive) {
          setCompletionResult(result);
          setCompletionStatus('ready');
        }
      } catch {
        if (isActive) {
          setCompletionStatus('failed');
        }
      }
    }

    void completeDemo();

    return () => {
      isActive = false;
    };
  }, [demo, getIdToken, isComplete, learningApiClient, viewedStepIds]);

  const isDemoLoading =
    status === 'loading' ||
    (status === 'authenticated' &&
      routeKey !== null &&
      !demo &&
      currentDemoLoadState?.status !== 'failed');

  if (isDemoLoading) {
    return (
      <main className="route-loading page-shell" role="status">
        Loading demo...
      </main>
    );
  }

  if (!demo || !currentStep) {
    return <DemoNotFoundPage locale={locale} />;
  }

  return (
    <main className="learning-demo-page page-shell">
      <Link
        className="breadcrumb-link"
        to={backPostId ? `/learn/${demo.courseId}/posts/${backPostId}` : `/learn/${demo.courseId}`}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        {text.backToLesson}
      </Link>

      <header className="demo-heading">
        <span className="eyebrow">{text.fixed}</span>
        <h1>{localize(demo.title, locale)}</h1>
        <dl className="demo-meta">
          <div>
            <dt>{text.algorithm}</dt>
            <dd>{demo.algorithmId}</dd>
          </div>
          <div>
            <dt>{text.seed}</dt>
            <dd>{demo.seed}</dd>
          </div>
        </dl>
      </header>

      <section className="and-demo-card" aria-labelledby="and-demo-step-title">
        <FixedDemoFrame demo={demo} locale={locale} step={currentStep} stepIndex={stepIndex} />

        <div className="and-demo-copy">
          <span className="demo-step-count">
            {stepIndex + 1} / {demo.steps.length}
          </span>
          <h2 id="and-demo-step-title">{localize(currentStep.title, locale)}</h2>
          <p>{localize(currentStep.narration, locale)}</p>

          <p aria-label={text.progressLabel} className="demo-progress" role="status">
            {text.progress(requiredViewedCount, demo.requiredStepIds.length)}
          </p>

          <div className="demo-step-actions">
            <button
              disabled={stepIndex === 0}
              onClick={() => showStep(stepIndex - 1)}
              type="button"
            >
              {text.previous}
            </button>
            <button
              disabled={stepIndex === demo.steps.length - 1}
              onClick={() => showStep(stepIndex + 1)}
              type="button"
            >
              {text.next}
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="demo-completion-card" aria-live="polite">
        {completionStatus === 'submitting' ? <p>{text.complete}</p> : null}
        {completionStatus === 'failed' ? <p role="alert">{text.failed}</p> : null}
        {completionStatus === 'ready' && completionResult ? (
          <p>
            <CheckCircle2 aria-hidden="true" size={18} />
            {text.completed}: {completionResult.event.demoId}
          </p>
        ) : null}
        {completionStatus === 'ready' ? (
          <Link
            className="secondary-link"
            to={
              moduleQuizId
                ? `/learn/${demo.courseId}/quizzes/${moduleQuizId}`
                : `/learn/${demo.courseId}`
            }
          >
            {text.moduleQuiz}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function createModuleQuizId(moduleId: string) {
  const stablePrefix = /^(cml|dl)-m\d{2}/.exec(moduleId)?.[0];

  return stablePrefix ? `quiz-module-${stablePrefix}` : `quiz-module-${moduleId}`;
}

function FixedDemoFrame({
  demo,
  locale,
  step,
  stepIndex,
}: {
  demo: LearningDemoContent;
  locale: Locale;
  step: LearningDemoStep;
  stepIndex: number;
}) {
  return (
    <div className="and-demo-frame">
      <svg
        aria-label={localize(step.textAlternative, locale)}
        className="and-demo-chart"
        role="img"
        viewBox="0 0 240 240"
      >
        <line className="axis-line" x1="36" x2="210" y1="196" y2="196" />
        <line className="axis-line" x1="36" x2="36" y1="196" y2="34" />
        <polyline
          className="boundary-line"
          fill="none"
          points={demo.visualization.boundary.map((point) => `${point.x},${point.y}`).join(' ')}
        />
        {demo.visualization.points.map((point) => (
          <DemoPoint
            isPositive={
              point.classification
                ? point.classification === 'positive'
                : stepIndex >= point.positiveFromStep
            }
            key={`${point.x}:${point.y}:${point.label}`}
            label={point.label}
            x={point.x}
            y={point.y}
          />
        ))}
        <text x="62" y="222">
          {demo.algorithmId}
        </text>
      </svg>

      {demo.fixedRun ? (
        <table className="and-truth-table">
          <caption>
            {demo.fixedRun.caption
              ? localize(demo.fixedRun.caption, locale)
              : locale === 'vi'
                ? 'Dữ liệu và kết quả AND cố định'
                : 'Fixed AND data and results'}
          </caption>
          <thead>
            <tr>
              <th>x1</th>
              <th>x2</th>
              <th>{locale === 'vi' ? 'Nhãn' : 'Target'}</th>
              <th>{locale === 'vi' ? 'Dự đoán' : 'Prediction'}</th>
            </tr>
          </thead>
          <tbody>
            {demo.fixedRun.rows.map((row) => (
              <tr key={row.input.join(':')}>
                <td>{row.input[0]}</td>
                <td>{row.input[1]}</td>
                <td>{row.targetOutput}</td>
                <td>{row.predictedOutput}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="and-truth-table">
          <caption>{demo.problemId}</caption>
          <tbody>
            <tr>
              <th>step</th>
              <td>{step.id}</td>
            </tr>
            <tr>
              <th>seed</th>
              <td>{demo.seed}</td>
            </tr>
            <tr>
              <th>status</th>
              <td>fixed</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function DemoPoint({
  isPositive,
  label,
  x,
  y,
}: {
  isPositive: boolean;
  label: string;
  x: number;
  y: number;
}) {
  return (
    <g className={isPositive ? 'and-point is-positive' : 'and-point'}>
      <circle cx={x} cy={y} r="12" />
      <text x={x - 9} y={y + 31}>
        {label}
      </text>
    </g>
  );
}

function DemoNotFoundPage({ locale }: { locale: Locale }) {
  const text = copy[locale];

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">404 / DEMO</span>
      <h1>{text.notFoundTitle}</h1>
      <p>{text.notFoundBody}</p>
      <Link className="primary-link" to="/courses">
        {text.notFoundBack}
      </Link>
    </main>
  );
}
