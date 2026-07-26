import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import {
  andGateDemo,
  getFixedDemo,
  type DemoStep,
  type FixedDemoManifest,
} from './and-gate-demo-data';
import {
  hasLearningDemoAccess,
  rememberLearningContentAccessGrants,
} from './learning-access-store';
import type { DemoCompletionResult, LearningApiClient } from './learning-api';

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
      heading: string;
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
    heading: 'Perceptron demo: AND gate',
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
    heading: 'Demo Perceptron: cổng AND',
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
  const { getIdToken, status, user } = useAuth();
  const { courseId, demoId } = useParams();
  const demo = getFixedDemo(demoId);
  const [stepIndex, setStepIndex] = useState(0);
  const [viewedStepIds, setViewedStepIds] = useState<readonly string[]>(
    demo?.steps[0]?.id ? [demo.steps[0].id] : [],
  );
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('idle');
  const [completionResult, setCompletionResult] = useState<DemoCompletionResult | null>(null);
  const idempotencyKey = useRef(createIdempotencyKey());
  const completionStarted = useRef(false);
  const text = copy[locale];
  const uid = user?.uid;
  const accessKey =
    status === 'authenticated' && courseId && demo?.demoId && uid
      ? `${uid}:${courseId}:${demo.demoId}`
      : null;
  const [verifiedAccessKey, setVerifiedAccessKey] = useState<string | null>(null);
  const hasStoredAccess =
    status === 'authenticated' &&
    demo !== undefined &&
    demo.courseId === courseId &&
    hasLearningDemoAccess(courseId, demo.demoId, uid);
  const hasBackendAccess = accessKey !== null && verifiedAccessKey === accessKey;
  const hasAccess = hasStoredAccess || hasBackendAccess;
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
    if (status !== 'authenticated' || !accessKey || !courseId || !demo || !uid || hasStoredAccess) {
      return undefined;
    }

    let isActive = true;
    const activeAccessKey = accessKey;
    const activeCourseId = courseId;
    const activeDemoId = demo.demoId;
    const activeUid = uid;

    async function loadDemoAccess() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const progressSnapshot = await learningApiClient.getProgress(idToken);

        rememberLearningContentAccessGrants({
          contentAccess: progressSnapshot.contentAccess,
          courseId: activeCourseId,
          uid: activeUid,
        });

        const hasProgressDemoAccess = progressSnapshot.contentAccess.some(
          (item) => item.contentType === 'demo' && item.entityId === activeDemoId,
        );

        if (isActive) {
          setVerifiedAccessKey(hasProgressDemoAccess ? activeAccessKey : null);
        }
      } catch {
        if (isActive) {
          setVerifiedAccessKey(null);
        }
      }
    }

    void loadDemoAccess();

    return () => {
      isActive = false;
    };
  }, [accessKey, courseId, demo, getIdToken, hasStoredAccess, learningApiClient, status, uid]);

  useEffect(() => {
    if (!demo || !hasAccess || !isComplete || completionStarted.current) {
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
  }, [demo, getIdToken, hasAccess, isComplete, learningApiClient, viewedStepIds]);

  if (!demo || !currentStep || !hasAccess) {
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
        <h1>
          {demo.demoId === andGateDemo.demoId
            ? text.heading
            : `${demo.algorithmId}: ${demo.problemId}`}
        </h1>
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
  demo: FixedDemoManifest;
  locale: Locale;
  step: DemoStep;
  stepIndex: number;
}) {
  if (demo.demoId === andGateDemo.demoId) {
    return <AndGateFrame locale={locale} step={step} stepIndex={stepIndex} />;
  }

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
          points="52,168 92,132 132,112 172,78 204,62"
        />
        <AndPoint
          isPositive={stepIndex >= 2}
          label={step.id.slice(0, 2).toUpperCase()}
          x={92}
          y={132}
        />
        <AndPoint isPositive={stepIndex >= 3} label="OK" x={172} y={78} />
        <text x="62" y="222">
          {demo.algorithmId}
        </text>
      </svg>

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
    </div>
  );
}

function AndGateFrame({
  locale,
  step,
  stepIndex,
}: {
  locale: Locale;
  step: DemoStep;
  stepIndex: number;
}) {
  const highlightBoundary = stepIndex >= 2;
  const highlightResult = stepIndex >= 3;

  return (
    <div className="and-demo-frame">
      <svg
        aria-label={localize(step.textAlternative, locale)}
        className="and-demo-chart"
        role="img"
        viewBox="0 0 240 240"
      >
        <line className="axis-line" x1="40" x2="210" y1="200" y2="200" />
        <line className="axis-line" x1="40" x2="40" y1="200" y2="30" />
        {highlightBoundary ? (
          <line className="boundary-line" x1="80" x2="200" y1="200" y2="80" />
        ) : null}
        <AndPoint isPositive={false} label="00" x={70} y={170} />
        <AndPoint isPositive={false} label="01" x={70} y={70} />
        <AndPoint isPositive={false} label="10" x={170} y={170} />
        <AndPoint isPositive label="11" x={170} y={70} />
        {highlightResult ? (
          <text x="122" y="224">
            accuracy 100%
          </text>
        ) : null}
      </svg>

      <table className="and-truth-table">
        <caption>{andGateDemo.problemId}</caption>
        <thead>
          <tr>
            <th>x1</th>
            <th>x2</th>
            <th>AND</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>0</td>
            <td>0</td>
          </tr>
          <tr>
            <td>0</td>
            <td>1</td>
            <td>0</td>
          </tr>
          <tr>
            <td>1</td>
            <td>0</td>
            <td>0</td>
          </tr>
          <tr className="is-positive">
            <td>1</td>
            <td>1</td>
            <td>1</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AndPoint({
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
