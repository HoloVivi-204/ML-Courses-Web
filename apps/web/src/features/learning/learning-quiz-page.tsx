import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { localize, type Locale } from '../catalog/course-data';
import { QuizQuestionChoices } from './quiz-question-choices';
import type {
  LearningApiClient,
  LearningProgressSnapshot,
  LearningQuizContent,
  QuizAnswer,
  QuizAnswerValue,
  QuizAttemptResult,
  QuizSubmissionResult,
} from './learning-api';
import { formatAlgorithmName, getPlaygroundPathForAlgorithm } from './playground-link-mapping';
import { getQuizContinueAction } from './learning-navigation';
import { getLearningCourseProgress } from './learning-progression';
import { getPublicQuizRoute, type PublicQuizRoute } from './quiz-route-data';

interface LearningQuizPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type QuizPageStatus = 'failed' | 'idle' | 'loading' | 'ready';
type QuizProgressStatus = 'failed' | 'idle' | 'loading' | 'ready';
type QuizSubmitStatus = 'failed' | 'idle' | 'submitting';

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

const copy: Readonly<
  Record<
    Locale,
    {
      answerLabel: string;
      attempt: (attemptNumber: number) => string;
      backToLesson: string;
      correctAnswer: string;
      correctFeedback: string;
      continueModuleQuiz: string;
      continueNextLesson: string;
      continueNextModule: string;
      continuePractice: string;
      continueModuleOverview: string;
      continueRoadmap: string;
      explanation: string;
      failed: string;
      firstWrongFeedback: string;
      hint: (level: 1 | 2) => string;
      loading: string;
      notFoundBack: string;
      notFoundBody: string;
      notFoundTitle: string;
      openPlayground: (algorithm: string) => string;
      retry: string;
      score: (score: number, bestScore: number) => string;
      selectAllHint: string;
      selectOneHint: string;
      submit: string;
      submitHint: string;
      submitting: string;
      questionLabel: (questionNumber: number) => string;
    }
  >
> = {
  en: {
    answerLabel: 'Answers',
    attempt: (attemptNumber) => `Attempt ${attemptNumber}`,
    backToLesson: 'Back to lesson',
    correctAnswer: 'Correct answer',
    correctFeedback: 'Correct',
    continueModuleQuiz: 'Open the module quiz',
    continueNextLesson: 'Open the next lesson',
    continueNextModule: 'Open the next module',
    continuePractice: 'Open practice',
    continueModuleOverview: 'Back to module lessons',
    continueRoadmap: 'Return to the learning roadmap',
    explanation: 'Explanation',
    failed: 'The quiz could not be loaded or submitted. Try again.',
    firstWrongFeedback: 'Review this concept, then try the question again.',
    hint: (level) => `Hint ${level}`,
    loading: 'Loading quiz…',
    notFoundBack: 'Back to course catalog',
    notFoundBody: 'This quiz is not available for the current learner access.',
    notFoundTitle: 'Quiz not available',
    openPlayground: (algorithm) => `Open ${algorithm} Playground`,
    retry: 'Try again',
    score: (score, bestScore) => `Score ${score}% · Best ${bestScore}%`,
    selectAllHint: 'Select all that apply',
    selectOneHint: 'Choose one option',
    submit: 'Submit quiz',
    submitHint: 'Choose an answer for every question before submitting.',
    submitting: 'Submitting quiz…',
    questionLabel: (questionNumber) => `Question ${questionNumber}`,
  },
  vi: {
    answerLabel: 'Câu trả lời',
    attempt: (attemptNumber) => `Lần làm ${attemptNumber}`,
    backToLesson: 'Quay lại bài học',
    correctAnswer: 'Đáp án đúng',
    correctFeedback: 'Đúng',
    continueModuleQuiz: 'Mở quiz module',
    continueNextLesson: 'Mở bài học tiếp theo',
    continueNextModule: 'Mở module tiếp theo',
    continuePractice: 'Mở phần thực hành',
    continueModuleOverview: 'Trở về danh sách các bài trong module',
    continueRoadmap: 'Về lộ trình học',
    explanation: 'Giải thích',
    failed: 'Chưa thể tải hoặc nộp quiz. Hãy thử lại.',
    firstWrongFeedback: 'Hãy xem lại khái niệm này rồi thử lại câu hỏi.',
    hint: (level) => `Gợi ý ${level}`,
    loading: 'Đang tải quiz…',
    notFoundBack: 'Về danh sách khóa học',
    notFoundBody: 'Quiz này chưa khả dụng với quyền truy cập hiện tại.',
    notFoundTitle: 'Quiz chưa khả dụng',
    openPlayground: (algorithm) => `Mở Playground ${algorithm}`,
    retry: 'Làm lại',
    score: (score, bestScore) => `Điểm ${score}% · Cao nhất ${bestScore}%`,
    selectAllHint: 'Chọn tất cả đáp án đúng',
    selectOneHint: 'Chọn một đáp án',
    submit: 'Nộp quiz',
    submitHint: 'Hãy chọn đáp án cho tất cả câu hỏi trước khi nộp.',
    submitting: 'Đang nộp quiz…',
    questionLabel: (questionNumber) => `Câu hỏi ${questionNumber}`,
  },
};

export function LearningQuizPage(props: LearningQuizPageProps) {
  const { courseId, quizId } = useParams();
  const routeKey = `${courseId ?? ''}:${quizId ?? ''}`;

  return <LearningQuizPageContent key={routeKey} {...props} />;
}

function LearningQuizPageContent({ learningApiClient, locale }: LearningQuizPageProps) {
  const { getIdToken, status, user } = useAuth();
  const { courseId, quizId } = useParams();
  const quizRoute = getPublicQuizRoute(quizId);
  const text = copy[locale];
  const continueAction = quizRoute ? getQuizContinueAction(quizRoute) : null;
  const continueLabel = continueAction
    ? {
        'module-quiz': text.continueModuleQuiz,
        'next-lesson': text.continueNextLesson,
        'next-module': text.continueNextModule,
        'module-overview': text.continueModuleOverview,
        practice: text.continuePractice,
        roadmap: text.continueRoadmap,
      }[continueAction.kind]
    : null;
  const [attempt, setAttempt] = useState<QuizAttemptResult | null>(null);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, QuizAnswerValue>>(
    {},
  );
  const [pageStatus, setPageStatus] = useState<QuizPageStatus>('idle');
  const [progressSnapshot, setProgressSnapshot] = useState<LearningProgressSnapshot | null>(null);
  const [quizContent, setQuizContent] = useState<LearningQuizContent | null>(null);
  const [progressStatus, setProgressStatus] = useState<QuizProgressStatus>('idle');
  const [submitStatus, setSubmitStatus] = useState<QuizSubmitStatus>('idle');
  const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null);
  const [attemptRequestIndex, setAttemptRequestIndex] = useState(0);
  const attemptStarted = useRef(false);
  const idempotencyKey = useRef(createIdempotencyKey());
  const hasKnownQuizRoute = quizRoute !== undefined && quizRoute.courseId === courseId;
  const canVerifyBackendProgress = status === 'authenticated' && user !== null && hasKnownQuizRoute;
  const quizCourseProgress =
    quizRoute && progressSnapshot
      ? getQuizCourseProgress(progressSnapshot, quizRoute.courseId)
      : undefined;
  const hasAccess =
    canVerifyBackendProgress &&
    progressStatus === 'ready' &&
    progressSnapshot !== null &&
    quizCourseProgress !== undefined &&
    hasVerifiedQuizProgress(quizRoute, progressSnapshot, quizCourseProgress);
  const answers = useMemo(
    () => toAnswerList(attempt, answersByQuestionId),
    [answersByQuestionId, attempt],
  );
  const isReadyToSubmit = attempt ? answers.length === attempt.questions.length : false;
  const isAttemptClosed = submissionResult !== null;
  const backPostId = quizRoute?.postId ?? quizRoute?.requiredPostIds.at(-1) ?? null;

  useEffect(() => {
    if (!quizRoute || !canVerifyBackendProgress) {
      return;
    }

    let isActive = true;

    async function loadProgress() {
      setProgressStatus('loading');

      try {
        const idToken = await getIdToken();

        if (!idToken || !user) {
          throw new Error('Authenticated user is missing an ID token or user identity.');
        }

        const nextProgressSnapshot = await learningApiClient.getProgress(idToken);

        if (isActive) {
          setProgressSnapshot(nextProgressSnapshot);
          setProgressStatus('ready');
        }
      } catch {
        if (isActive) {
          setProgressStatus('failed');
        }
      }
    }

    void loadProgress();

    return () => {
      isActive = false;
    };
  }, [canVerifyBackendProgress, getIdToken, learningApiClient, quizRoute, user]);

  useEffect(() => {
    if (!quizRoute || !hasAccess || attemptStarted.current) {
      return;
    }

    let isActive = true;
    const activeQuizRoute = quizRoute;

    async function createAttempt() {
      setPageStatus('loading');

      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        if (!isActive) {
          return;
        }

        attemptStarted.current = true;
        const [nextAttempt, nextQuizContent] = await Promise.all([
          learningApiClient.createQuizAttempt({
            idToken,
            quizId: activeQuizRoute.quizId,
          }),
          learningApiClient.getQuizContent(activeQuizRoute.quizId),
        ]);

        if (
          nextQuizContent.courseId !== activeQuizRoute.courseId ||
          nextQuizContent.moduleId !== activeQuizRoute.moduleId ||
          nextQuizContent.quizId !== activeQuizRoute.quizId ||
          (nextQuizContent.postId ?? null) !== activeQuizRoute.postId
        ) {
          throw new Error('Published learner content does not match the requested quiz structure.');
        }

        if (isActive) {
          idempotencyKey.current = createIdempotencyKey();
          setAnswersByQuestionId({});
          setAttempt(nextAttempt);
          setQuizContent(nextQuizContent);
          setPageStatus('ready');
          setSubmitStatus('idle');
        }
      } catch {
        if (isActive) {
          setPageStatus('failed');
        }
      }
    }

    void createAttempt();

    return () => {
      isActive = false;
    };
  }, [attemptRequestIndex, getIdToken, hasAccess, learningApiClient, quizRoute]);

  if (!quizRoute || !canVerifyBackendProgress) {
    return <QuizNotFoundPage locale={locale} />;
  }

  if (progressStatus === 'loading' || progressStatus === 'idle') {
    return (
      <main className="route-loading page-shell" role="status">
        {text.loading}
      </main>
    );
  }

  if (progressStatus === 'failed' || !hasAccess) {
    return <QuizNotFoundPage locale={locale} />;
  }

  if (pageStatus === 'loading' || pageStatus === 'idle') {
    return (
      <main className="route-loading page-shell" role="status">
        {text.loading}
      </main>
    );
  }

  if (pageStatus === 'failed' || !attempt || !quizContent) {
    return (
      <main className="not-found page-shell">
        <span aria-hidden="true">QUIZ / ERROR</span>
        <h1>{text.failed}</h1>
        <button className="primary-link" onClick={requestNewAttempt} type="button">
          {text.retry}
        </button>
      </main>
    );
  }

  async function submitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReadyToSubmit || !attempt || !quizRoute) {
      return;
    }

    const activeAttempt = attempt;
    const activeQuizRoute = quizRoute;
    setSubmitStatus('submitting');

    try {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authenticated user is missing an ID token.');
      }

      const result = await learningApiClient.submitQuizAttempt({
        answers,
        attemptId: activeAttempt.attempt.attemptId,
        idToken,
        idempotencyKey: idempotencyKey.current,
      });

      if (result.passed && user) {
        try {
          if (activeQuizRoute.postId) {
            await learningApiClient.completePost({
              idToken,
              idempotencyKey: createIdempotencyKey(),
              postId: activeQuizRoute.postId,
            });
          }

          const nextProgressSnapshot = await learningApiClient.getProgress(idToken);

          setProgressSnapshot(nextProgressSnapshot);
        } catch {
          // Quiz submission is already committed; progress refresh can recover on next route load.
        }
      }

      setSubmissionResult(result);
      setSubmitStatus('idle');
    } catch {
      setSubmitStatus('failed');
    }
  }

  function requestNewAttempt() {
    attemptStarted.current = false;
    setAttempt(null);
    setSubmissionResult(null);
    setSubmitStatus('idle');
    setAttemptRequestIndex((value) => value + 1);
  }

  return (
    <main className="learning-quiz-page page-shell" data-testid="quiz-attempt">
      <Link
        className="breadcrumb-link"
        to={
          backPostId
            ? `/learn/${quizRoute.courseId}/posts/${backPostId}`
            : `/learn/${quizRoute.courseId}`
        }
      >
        <ArrowLeft aria-hidden="true" size={16} />
        {text.backToLesson}
      </Link>

      <header className="quiz-heading">
        <span className="eyebrow">{text.attempt(attempt.attempt.attemptNumber)}</span>
        <h1>{localize(quizContent.title, locale)}</h1>
        <p>{localize(quizContent.description, locale)}</p>
        <p>{localize(attempt.mastery, locale)}</p>
      </header>

      <form className="quiz-form" onSubmit={submitQuiz}>
        {attempt.questions.map((question, questionIndex) => (
          <fieldset className="quiz-question-card" key={question.questionId}>
            <legend className="visually-hidden">
              {text.questionLabel(questionIndex + 1)}: {localize(question.prompt, locale)}
            </legend>
            <div aria-hidden="true" className="quiz-question-prompt">
              <span className="quiz-question-number">
                {String(questionIndex + 1).padStart(2, '0')}
              </span>
              <span className="quiz-question-copy">
                <span className="quiz-question-label">{text.questionLabel(questionIndex + 1)}</span>
                <span className="quiz-question-text">{localize(question.prompt, locale)}</span>
              </span>
            </div>

            <section
              aria-labelledby={`quiz-question-${question.questionId}-answers`}
              className="quiz-answer-panel"
            >
              <div className="quiz-answer-heading">
                <span
                  className="quiz-answer-label"
                  id={`quiz-question-${question.questionId}-answers`}
                >
                  {text.answerLabel}
                </span>
                <span className="quiz-answer-instruction">
                  {question.type === 'multiple-choice' ? text.selectAllHint : text.selectOneHint}
                </span>
              </div>

              <QuizQuestionChoices
                answersByQuestionId={answersByQuestionId}
                disabled={isAttemptClosed || submitStatus === 'submitting'}
                locale={locale}
                onAnswerChange={(optionId) =>
                  setAnswersByQuestionId((currentValue) =>
                    updateAnswerValue(currentValue, {
                      optionId,
                      questionId: question.questionId,
                      questionType: question.type,
                    }),
                  )
                }
                question={question}
              />

              {submissionResult?.feedback
                .filter((feedback) => feedback.questionId === question.questionId)
                .map((feedback) => (
                  <div
                    className="quiz-feedback-panel"
                    data-hint-level={feedback.hintLevel}
                    key={feedback.questionId}
                  >
                    <p
                      className={feedback.isCorrect ? 'quiz-feedback is-correct' : 'quiz-feedback'}
                    >
                      {feedback.isCorrect ? '✓' : '•'}{' '}
                      {feedback.isCorrect
                        ? text.correctFeedback
                        : feedback.hint
                          ? `${text.hint(feedback.hintLevel === 1 ? 1 : 2)}: ${localize(feedback.hint, locale)}`
                          : text.firstWrongFeedback}
                    </p>
                    {submissionResult.passed ? (
                      <dl className="quiz-answer-review">
                        {feedback.correctAnswer !== undefined ? (
                          <div>
                            <dt>{text.correctAnswer}</dt>
                            <dd>{formatCorrectAnswer(question, feedback.correctAnswer, locale)}</dd>
                          </div>
                        ) : null}
                        {feedback.explanation ? (
                          <div>
                            <dt>{text.explanation}</dt>
                            <dd>{localize(feedback.explanation, locale)}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : null}
                  </div>
                ))}
            </section>
          </fieldset>
        ))}

        <div className="quiz-submit-card" aria-live="polite">
          {submissionResult ? (
            <p className={submissionResult.passed ? 'is-correct' : ''}>
              {submissionResult.passed ? <CheckCircle2 aria-hidden="true" size={18} /> : null}
              {text.score(submissionResult.score, submissionResult.bestScore)}
            </p>
          ) : null}
          {submissionResult?.passed
            ? submissionResult.newlyUnlocked
                .filter((unlock) => unlock.type === 'algorithm')
                .map((unlock) => {
                  const playgroundPath = getPlaygroundPathForAlgorithm(unlock.id);

                  return playgroundPath ? (
                    <Link
                      className="primary-link quiz-playground-link"
                      key={unlock.id}
                      to={playgroundPath}
                    >
                      {text.openPlayground(formatAlgorithmName(unlock.id))}
                      <ArrowRight aria-hidden="true" size={17} />
                    </Link>
                  ) : null;
                })
            : null}
          {submissionResult?.passed && continueAction && continueLabel ? (
            <Link className="primary-link quiz-continue-link" to={continueAction.path}>
              {continueLabel}
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          ) : null}
          {submitStatus === 'failed' ? <p role="alert">{text.failed}</p> : null}
          {submitStatus === 'submitting' ? <p>{text.submitting}</p> : null}
          {!isReadyToSubmit && !submissionResult && submitStatus === 'idle' ? (
            <p className="quiz-submit-hint">{text.submitHint}</p>
          ) : null}
          <button
            disabled={!isReadyToSubmit || isAttemptClosed || submitStatus === 'submitting'}
            type="submit"
          >
            {text.submit}
          </button>
          {submissionResult && !submissionResult.passed ? (
            <button onClick={requestNewAttempt} type="button">
              <RotateCcw aria-hidden="true" size={16} />
              {text.retry}
            </button>
          ) : null}
        </div>
      </form>
    </main>
  );
}

function hasVerifiedQuizProgress(
  quizRoute: PublicQuizRoute | undefined,
  progressSnapshot: LearningProgressSnapshot,
  quizCourseProgress: Pick<LearningProgressSnapshot, 'demos' | 'posts'>,
): boolean {
  if (!quizRoute) {
    return false;
  }

  if (quizRoute.quizKind === 'post' && quizRoute.postId) {
    return progressSnapshot.contentAccess.some(
      (item) => item.contentType === 'post' && item.entityId === quizRoute.postId,
    );
  }

  const hasModuleAccess = progressSnapshot.contentAccess.some(
    (item) => item.contentType === 'module' && item.entityId === quizRoute.moduleId,
  );
  const requiredPostCompleted = quizRoute.requiredPostIds.every((postId) =>
    quizCourseProgress.posts.some((post) => post.postId === postId && post.completed),
  );
  const requiredDemoCompleted =
    quizRoute.demoId === null ||
    quizCourseProgress.demos.some((demo) => demo.demoId === quizRoute.demoId && demo.completed);

  const hasCompletedPrerequisites = requiredPostCompleted && requiredDemoCompleted;

  return hasCompletedPrerequisites && (hasModuleAccess || quizRoute.demoId !== null);
}

function getQuizCourseProgress(
  progressSnapshot: LearningProgressSnapshot,
  courseId: string,
): Pick<LearningProgressSnapshot, 'demos' | 'posts'> | undefined {
  const courseProgress = getLearningCourseProgress(progressSnapshot, courseId);

  if (courseProgress) {
    return courseProgress;
  }

  return progressSnapshot.enrollment.courseId === courseId ? progressSnapshot : undefined;
}

function toAnswerList(
  attempt: QuizAttemptResult | null,
  answersByQuestionId: Readonly<Record<string, QuizAnswerValue>>,
): QuizAnswer[] {
  if (!attempt) {
    return [];
  }

  return attempt.questions
    .map((question) => {
      const value = answersByQuestionId[question.questionId];

      if (!value || (Array.isArray(value) && value.length === 0)) {
        return null;
      }

      return { questionId: question.questionId, value };
    })
    .filter((answer): answer is QuizAnswer => answer !== null);
}

function updateAnswerValue(
  currentValue: Record<string, QuizAnswerValue>,
  input: {
    optionId: string;
    questionId: string;
    questionType: 'multiple-choice' | 'single-choice' | 'true-false';
  },
): Record<string, QuizAnswerValue> {
  if (input.questionType !== 'multiple-choice') {
    return {
      ...currentValue,
      [input.questionId]: input.optionId,
    };
  }

  const currentAnswer = currentValue[input.questionId];
  const selectedOptionIds = Array.isArray(currentAnswer) ? currentAnswer : [];
  const nextSelectedOptionIds = selectedOptionIds.includes(input.optionId)
    ? selectedOptionIds.filter((optionId) => optionId !== input.optionId)
    : [...selectedOptionIds, input.optionId];

  return {
    ...currentValue,
    [input.questionId]: nextSelectedOptionIds,
  };
}

function formatCorrectAnswer(
  question: QuizAttemptResult['questions'][number],
  answer: QuizAnswerValue,
  locale: Locale,
): string {
  const optionIds = Array.isArray(answer) ? answer : [answer];

  return optionIds
    .map((optionId) => {
      const option = question.options.find((candidate) => candidate.optionId === optionId);

      return option ? localize(option.text, locale) : locale === 'vi' ? 'Lựa chọn' : 'Option';
    })
    .join(', ');
}

function QuizNotFoundPage({ locale }: { locale: Locale }) {
  const text = copy[locale];

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">404 / QUIZ</span>
      <h1>{text.notFoundTitle}</h1>
      <p>{text.notFoundBody}</p>
      <Link className="primary-link" to="/courses">
        {text.notFoundBack}
      </Link>
    </main>
  );
}
