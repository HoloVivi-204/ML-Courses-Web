import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import { formatAlgorithmName, formatUserFacingTitle } from '../../shared/user-facing-labels';
import { FixedDemoFrame } from './fixed-demo-frame';
import {
  LearningApiError,
  type DemoCompletionResult,
  type LearningApiClient,
  type LearningDemoContent,
} from './learning-api';

interface LearningDemoPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type CompletionStatus = 'failed' | 'idle' | 'ready' | 'submitting';
type DemoLoadStatus = 'access-denied' | 'failed' | 'ready';

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

const copy: Readonly<
  Record<
    Locale,
    {
      accessDeniedBody: string;
      accessDeniedTitle: string;
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
      retry: string;
      seed: string;
    }
  >
> = {
  en: {
    accessDeniedBody: 'Complete every lesson in this module before opening the practice.',
    accessDeniedTitle: 'Practice is locked',
    algorithm: 'Algorithm',
    backToLesson: 'Back to lesson',
    complete: 'Completing practice…',
    completed: 'Practice completed',
    failed: 'Practice completion could not be recorded. Revisit the required steps and try again.',
    fixed: 'INTERACTIVE PRACTICE',
    moduleQuiz: 'Open the module quiz',
    next: 'Next step',
    notFoundBack: 'Back to course catalog',
    notFoundBody: 'This practice is not available for the current learner access.',
    notFoundTitle: 'Practice not available',
    previous: 'Previous step',
    progress: (viewed, total) => `Required steps ${viewed} / ${total}`,
    progressLabel: 'Practice progress',
    result: 'Result',
    retry: 'Try recording completion again',
    seed: 'Seed',
  },
  vi: {
    accessDeniedBody: 'Hoàn thành mọi bài học trong module trước khi mở phần thực hành.',
    accessDeniedTitle: 'Phần thực hành đang bị khóa',
    algorithm: 'Thuật toán',
    backToLesson: 'Quay lại bài học',
    complete: 'Đang ghi nhận phần thực hành…',
    completed: 'Đã hoàn thành phần thực hành',
    failed:
      'Chưa thể ghi nhận hoàn thành phần thực hành. Hãy xem lại các bước bắt buộc rồi thử lại.',
    fixed: 'THỰC HÀNH TƯƠNG TÁC',
    moduleQuiz: 'Mở quiz module',
    next: 'Bước tiếp theo',
    notFoundBack: 'Về danh sách khóa học',
    notFoundBody: 'Phần thực hành này chưa khả dụng với quyền truy cập hiện tại.',
    notFoundTitle: 'Phần thực hành chưa khả dụng',
    previous: 'Bước trước',
    progress: (viewed, total) => `Bước bắt buộc ${viewed} / ${total}`,
    progressLabel: 'Tiến độ thực hành',
    result: 'Kết quả',
    retry: 'Ghi nhận hoàn tất lại',
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
    status: DemoLoadStatus;
  } | null>(null);
  const demo =
    status === 'authenticated' && loadedDemo?.routeKey === routeKey ? loadedDemo.demo : null;
  const currentDemoLoadState = demoLoadState?.routeKey === routeKey ? demoLoadState : null;
  const [stepIndex, setStepIndex] = useState(0);
  const [viewedStepIds, setViewedStepIds] = useState<readonly string[]>([]);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('idle');
  const [completionResult, setCompletionResult] = useState<DemoCompletionResult | null>(null);
  const [completionAttempt, setCompletionAttempt] = useState(0);
  const idempotencyKey = useRef(createIdempotencyKey());
  const completionStarted = useRef(false);
  const text = copy[locale];
  const currentStep = demo?.steps[stepIndex];
  const course = getCourse(demo?.courseId ?? courseId);
  const module = demo
    ? course?.modules?.find((item) => item.id === demo.moduleId)
    : course?.modules?.find((item) => item.demoId === demoId);
  const backPostId = module?.postIds.at(-1) ?? module?.postId ?? null;
  const moduleQuizId = module ? createModuleQuizId(module.id) : null;
  const moduleQuizPath = moduleQuizId
    ? `/learn/${demo?.courseId}/quizzes/${moduleQuizId}`
    : `/learn/${courseId}`;
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

  function retryCompletion() {
    if (!isComplete) {
      return;
    }

    completionStarted.current = false;
    setCompletionResult(null);
    setCompletionStatus('idle');
    setCompletionAttempt((value) => value + 1);
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
      } catch (error) {
        if (isActive) {
          setDemoLoadState({
            routeKey: activeRouteKey,
            status:
              error instanceof LearningApiError && error.statusCode === 403
                ? 'access-denied'
                : 'failed',
          });
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
  }, [completionAttempt, demo, getIdToken, isComplete, learningApiClient, viewedStepIds]);

  const isDemoLoading =
    status === 'loading' ||
    (status === 'authenticated' &&
      routeKey !== null &&
      !demo &&
      currentDemoLoadState?.status !== 'failed' &&
      currentDemoLoadState?.status !== 'access-denied');

  if (isDemoLoading) {
    return (
      <main className="route-loading page-shell" role="status">
        Loading demo...
      </main>
    );
  }

  if (!demo || !currentStep) {
    const backCourseId = demo?.courseId ?? courseId;
    const backPath =
      backPostId && backCourseId ? `/learn/${backCourseId}/posts/${backPostId}` : '/courses';

    return (
      <DemoNotFoundPage
        backPath={backPath}
        locale={locale}
        status={currentDemoLoadState?.status === 'access-denied' ? 'access-denied' : 'failed'}
      />
    );
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
        <h1>{formatUserFacingTitle(localize(demo.title, locale))}</h1>
        <dl className="demo-meta">
          <div>
            <dt>{text.algorithm}</dt>
            <dd>{formatAlgorithmName(demo.algorithmId, locale)}</dd>
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
            {completionStatus === 'ready' ? (
              <Link className="primary-link demo-next-action" to={moduleQuizPath}>
                {text.moduleQuiz}
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            ) : (
              <button
                disabled={stepIndex === demo.steps.length - 1}
                onClick={() => showStep(stepIndex + 1)}
                type="button"
              >
                {text.next}
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="demo-completion-card" aria-live="polite">
        {completionStatus === 'submitting' ? <p>{text.complete}</p> : null}
        {completionStatus === 'failed' ? <p role="alert">{text.failed}</p> : null}
        {completionStatus === 'failed' ? (
          <button className="primary-link" onClick={retryCompletion} type="button">
            {text.retry}
          </button>
        ) : null}
        {completionStatus === 'ready' && completionResult ? (
          <p>
            <CheckCircle2 aria-hidden="true" size={18} />
            {text.completed}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function createModuleQuizId(moduleId: string) {
  const stablePrefix = /^(cml|dl)-m\d{2}/.exec(moduleId)?.[0];

  return stablePrefix ? `quiz-module-${stablePrefix}` : `quiz-module-${moduleId}`;
}

function DemoNotFoundPage({
  backPath,
  locale,
  status,
}: {
  backPath: string;
  locale: Locale;
  status: 'access-denied' | 'failed';
}) {
  const text = copy[locale];
  const isAccessDenied = status === 'access-denied';
  const hasLessonBackPath = backPath !== '/courses';

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">{isAccessDenied ? '403' : '404'} / PRACTICE</span>
      <h1>{isAccessDenied ? text.accessDeniedTitle : text.notFoundTitle}</h1>
      <p>{isAccessDenied ? text.accessDeniedBody : text.notFoundBody}</p>
      <Link className="primary-link" to={backPath}>
        {hasLessonBackPath ? text.backToLesson : text.notFoundBack}
      </Link>
    </main>
  );
}
