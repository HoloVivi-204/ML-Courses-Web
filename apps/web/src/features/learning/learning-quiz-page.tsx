import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { localize, type Locale } from '../catalog/course-data';
import { hasLearningModuleAccess, hasLearningPostAccess } from './learning-access-store';
import type {
  LearningApiClient,
  QuizAnswer,
  QuizAnswerValue,
  QuizAttemptResult,
  QuizSubmissionResult,
} from './learning-api';
import { getPublicQuizRoute, type PublicQuizRoute } from './quiz-route-data';

interface LearningQuizPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type QuizPageStatus = 'failed' | 'idle' | 'loading' | 'ready';
type QuizSubmitStatus = 'failed' | 'idle' | 'submitting';

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

const copy: Readonly<
  Record<
    Locale,
    {
      attempt: (attemptNumber: number) => string;
      backToLesson: string;
      failed: string;
      heading: string;
      loading: string;
      notFoundBack: string;
      notFoundBody: string;
      notFoundTitle: string;
      retry: string;
      score: (score: number, bestScore: number) => string;
      submit: string;
      submitting: string;
    }
  >
> = {
  en: {
    attempt: (attemptNumber) => `Attempt ${attemptNumber}`,
    backToLesson: 'Back to lesson',
    failed: 'The quiz could not be loaded or submitted. Try again.',
    heading: 'Perceptron/XOR quiz',
    loading: 'Loading quiz…',
    notFoundBack: 'Back to course catalog',
    notFoundBody: 'This quiz is not available for the current learner access.',
    notFoundTitle: 'Quiz not available',
    retry: 'Try again',
    score: (score, bestScore) => `Score ${score}% · Best ${bestScore}%`,
    submit: 'Submit quiz',
    submitting: 'Submitting quiz…',
  },
  vi: {
    attempt: (attemptNumber) => `Lần làm ${attemptNumber}`,
    backToLesson: 'Quay lại bài học',
    failed: 'Chưa thể tải hoặc nộp quiz. Hãy thử lại.',
    heading: 'Quiz Perceptron/XOR',
    loading: 'Đang tải quiz…',
    notFoundBack: 'Về danh sách khóa học',
    notFoundBody: 'Quiz này chưa khả dụng với quyền truy cập hiện tại.',
    notFoundTitle: 'Quiz chưa khả dụng',
    retry: 'Làm lại',
    score: (score, bestScore) => `Điểm ${score}% · Cao nhất ${bestScore}%`,
    submit: 'Nộp quiz',
    submitting: 'Đang nộp quiz…',
  },
};

export function LearningQuizPage({ learningApiClient, locale }: LearningQuizPageProps) {
  const { getIdToken, status, user } = useAuth();
  const { courseId, quizId } = useParams();
  const quizRoute = getPublicQuizRoute(quizId);
  const text = copy[locale];
  const [attempt, setAttempt] = useState<QuizAttemptResult | null>(null);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, QuizAnswerValue>>(
    {},
  );
  const [pageStatus, setPageStatus] = useState<QuizPageStatus>('idle');
  const [submitStatus, setSubmitStatus] = useState<QuizSubmitStatus>('idle');
  const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null);
  const [attemptRequestIndex, setAttemptRequestIndex] = useState(0);
  const attemptStarted = useRef(false);
  const idempotencyKey = useRef(createIdempotencyKey());
  const hasAccess =
    status === 'authenticated' &&
    quizRoute !== undefined &&
    quizRoute.courseId === courseId &&
    hasQuizAccess(quizRoute, user?.uid);
  const answers = useMemo(
    () => toAnswerList(attempt, answersByQuestionId),
    [answersByQuestionId, attempt],
  );
  const isReadyToSubmit = attempt ? answers.length === attempt.questions.length : false;
  const isAttemptClosed = submissionResult !== null;

  useEffect(() => {
    if (!quizRoute || !hasAccess || attemptStarted.current) {
      return;
    }

    let isActive = true;
    const activeQuizRoute = quizRoute;
    attemptStarted.current = true;

    async function createAttempt() {
      setPageStatus('loading');

      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const nextAttempt = await learningApiClient.createQuizAttempt({
          idToken,
          quizId: activeQuizRoute.quizId,
        });

        if (isActive) {
          idempotencyKey.current = createIdempotencyKey();
          setAnswersByQuestionId({});
          setAttempt(nextAttempt);
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

  if (!quizRoute || !hasAccess) {
    return <QuizNotFoundPage locale={locale} />;
  }

  if (pageStatus === 'loading' || pageStatus === 'idle') {
    return (
      <main className="route-loading page-shell" role="status">
        {text.loading}
      </main>
    );
  }

  if (pageStatus === 'failed' || !attempt) {
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

    if (!isReadyToSubmit || !attempt) {
      return;
    }

    const activeAttempt = attempt;
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
        to={`/learn/${quizRoute.courseId}/posts/dl-p01-neuron-perceptron`}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        {text.backToLesson}
      </Link>

      <header className="quiz-heading">
        <span className="eyebrow">{text.attempt(attempt.attempt.attemptNumber)}</span>
        <h1>{text.heading}</h1>
        <p>{localize(attempt.mastery, locale)}</p>
      </header>

      <form className="quiz-form" onSubmit={submitQuiz}>
        {attempt.questions.map((question, questionIndex) => (
          <fieldset className="quiz-question-card" key={question.questionId}>
            <legend>
              <span>{String(questionIndex + 1).padStart(2, '0')}</span>
              {localize(question.prompt, locale)}
            </legend>

            <div className="quiz-option-list">
              {question.options.map((option) => (
                <label className="quiz-option" key={option.optionId}>
                  <input
                    checked={isOptionSelected(
                      answersByQuestionId[question.questionId],
                      option.optionId,
                    )}
                    name={question.questionId}
                    onChange={() =>
                      setAnswersByQuestionId((currentValue) =>
                        updateAnswerValue(currentValue, {
                          optionId: option.optionId,
                          questionId: question.questionId,
                          questionType: question.type,
                        }),
                      )
                    }
                    disabled={isAttemptClosed || submitStatus === 'submitting'}
                    type={question.type === 'multiple-choice' ? 'checkbox' : 'radio'}
                    value={option.optionId}
                  />
                  <span>{localize(option.text, locale)}</span>
                </label>
              ))}
            </div>

            {submissionResult?.feedback
              .filter((feedback) => feedback.questionId === question.questionId)
              .map((feedback) => (
                <p
                  className={feedback.isCorrect ? 'quiz-feedback is-correct' : 'quiz-feedback'}
                  key={feedback.questionId}
                >
                  {feedback.isCorrect ? '✓' : '•'}{' '}
                  {feedback.hint ? localize(feedback.hint, locale) : null}
                  {submissionResult.passed && feedback.explanation
                    ? localize(feedback.explanation, locale)
                    : null}
                </p>
              ))}
          </fieldset>
        ))}

        <div className="quiz-submit-card" aria-live="polite">
          {submissionResult ? (
            <p className={submissionResult.passed ? 'is-correct' : ''}>
              {submissionResult.passed ? <CheckCircle2 aria-hidden="true" size={18} /> : null}
              {text.score(submissionResult.score, submissionResult.bestScore)}
            </p>
          ) : null}
          {submissionResult?.passed ? <p>quiz_passed: {attempt.attempt.quizId}</p> : null}
          {submitStatus === 'failed' ? <p role="alert">{text.failed}</p> : null}
          {submitStatus === 'submitting' ? <p>{text.submitting}</p> : null}
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

function hasQuizAccess(quizRoute: PublicQuizRoute, uid: string | undefined): boolean {
  if (quizRoute.quizKind === 'post' && quizRoute.postId) {
    return hasLearningPostAccess(quizRoute.courseId, quizRoute.postId, uid);
  }

  return hasLearningModuleAccess(quizRoute.courseId, quizRoute.moduleId, uid);
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

function isOptionSelected(value: QuizAnswerValue | undefined, optionId: string): boolean {
  if (Array.isArray(value)) {
    return value.includes(optionId);
  }

  return value === optionId;
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
