import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { AuthContext, type AuthContextValue } from '../auth/auth-context';
import type {
  LearningApiClient,
  LearningProgressSnapshot,
  LearningQuizContent,
  QuizAttemptResult,
} from './learning-api';
import { LearningQuizPage } from './learning-quiz-page';

const COURSE_ID = 'course-deep-learning-basic';
const POST_QUIZ_ID = 'quiz-post-dl-p03';
const MODULE_QUIZ_ID = 'quiz-module-dl-m03';
const POST_PATH = `/learn/${COURSE_ID}/quizzes/${POST_QUIZ_ID}`;
const MODULE_PATH = `/learn/${COURSE_ID}/quizzes/${MODULE_QUIZ_ID}`;

function createAuthContextValue(): AuthContextValue {
  return {
    error: null,
    getIdToken: vi.fn().mockResolvedValue('test-id-token'),
    isSubmitting: false,
    reauthenticateWithGoogle: vi.fn().mockResolvedValue(true),
    reauthenticateWithPassword: vi.fn().mockResolvedValue(true),
    requestPasswordReset: vi.fn().mockResolvedValue(true),
    signInWithEmail: vi.fn().mockResolvedValue(true),
    signInWithGoogle: vi.fn().mockResolvedValue(true),
    signOut: vi.fn().mockResolvedValue(true),
    signUpWithEmail: vi.fn().mockResolvedValue(true),
    updateDisplayName: vi.fn().mockResolvedValue(true),
    status: 'authenticated',
    user: { email: 'learner@example.test', uid: 'learner-01' },
  };
}

function createProgressSnapshot(): LearningProgressSnapshot {
  return {
    algorithmUnlocks: [],
    contentAccess: [
      { contentType: 'module', entityId: 'dl-m03-training-generalization' },
      { contentType: 'post', entityId: 'dl-p03-backprop-overfitting' },
    ],
    demos: [],
    enrollment: {
      courseId: COURSE_ID,
      progressPercent: 80,
      status: 'in-progress',
    },
    modules: [
      {
        completedStepCount: 2,
        moduleId: 'dl-m03-training-generalization',
        overviewViewed: true,
        progressPercent: 50,
        requiredStepCount: 2,
        status: 'in-progress',
      },
    ],
    posts: [
      {
        bestScore: 100,
        completed: true,
        contentViewed: true,
        postId: 'dl-p03-backprop-overfitting',
        quizId: POST_QUIZ_ID,
        quizPassed: true,
        readingPosition: 'end',
        started: true,
        viewedItemIds: ['intro'],
      },
    ],
    quizzes: [],
  };
}

function createMultiCourseProgressSnapshot(): LearningProgressSnapshot {
  const deepLearningProgress = createProgressSnapshot();

  return {
    ...deepLearningProgress,
    courses: [
      {
        courseId: 'course-classical-ml',
        demos: [],
        modules: [],
        posts: [],
        progressPercent: 0,
        quizzes: [],
        status: 'in-progress',
      },
      {
        courseId: COURSE_ID,
        demos: deepLearningProgress.demos,
        modules: deepLearningProgress.modules,
        posts: deepLearningProgress.posts,
        progressPercent: deepLearningProgress.enrollment.progressPercent,
        quizzes: deepLearningProgress.quizzes,
        status: deepLearningProgress.enrollment.status,
      },
    ],
    demos: [],
    enrollment: {
      courseId: 'course-classical-ml',
      progressPercent: 0,
      status: 'in-progress',
    },
    modules: [],
    posts: [],
    quizzes: [],
  };
}

function createQuestion(quizId: string, index: number): QuizAttemptResult['questions'][number] {
  return {
    options: [
      {
        optionId: `${quizId}-option-${index}`,
        text: { en: `Answer ${index}`, vi: `Đáp án ${index}` },
      },
    ],
    prompt: { en: `Question ${index}`, vi: `Câu hỏi ${index}` },
    questionId: `${quizId}-question-${index}`,
    sourceId: `${quizId}-source-${index}`,
    type: 'single-choice',
  };
}

function createAttempt(quizId: string): QuizAttemptResult {
  const isModuleQuiz = quizId === MODULE_QUIZ_ID;
  const questionCount = isModuleQuiz ? 6 : 3;

  return {
    attempt: {
      attemptId: `attempt-${quizId}`,
      attemptNumber: 1,
      expiresAt: '2026-08-16T00:00:00.000Z',
      passingScorePercent: 70,
      questionCount,
      quizId,
      quizKind: isModuleQuiz ? 'module' : 'post',
      quizRevisionId: `${quizId}-revision`,
      requiredCorrectCount: null,
      shuffleSeed: null,
    },
    mastery: { en: 'Mastery', vi: 'Nắm vững' },
    questions: Array.from({ length: questionCount }, (_, index) =>
      createQuestion(quizId, index + 1),
    ),
  };
}

function createQuizContent(quizId: string): LearningQuizContent {
  const isModuleQuiz = quizId === MODULE_QUIZ_ID;

  return {
    courseId: COURSE_ID,
    description: {
      en: isModuleQuiz ? 'Six-question module assessment.' : 'Three-question lesson assessment.',
      vi: isModuleQuiz ? 'Bài đánh giá module gồm sáu câu.' : 'Bài đánh giá bài học gồm ba câu.',
    },
    moduleId: 'dl-m03-training-generalization',
    ...(isModuleQuiz ? {} : { postId: 'dl-p03-backprop-overfitting' }),
    quizId,
    revisionId: `${quizId}-revision`,
    title: {
      en: isModuleQuiz ? 'Module quiz: Training and generalization' : 'Lesson quiz: Overfitting',
      vi: isModuleQuiz ? 'Quiz module: Huấn luyện và tổng quát hóa' : 'Quiz bài học: Overfitting',
    },
  };
}

function createLearningApiClient(): LearningApiClient {
  return {
    completePost: vi.fn().mockResolvedValue({
      completion: { postId: 'dl-p03-backprop-overfitting', status: 'completed' },
    }),
    createQuizAttempt: vi.fn(({ quizId }: { quizId: string }) =>
      Promise.resolve(createAttempt(quizId)),
    ),
    getProgress: vi.fn().mockResolvedValue(createProgressSnapshot()),
    getQuizContent: vi.fn((quizId: string) => Promise.resolve(createQuizContent(quizId))),
    submitQuizAttempt: vi.fn().mockResolvedValue({
      bestScore: 100,
      feedback: [],
      newlyUnlocked: [],
      passed: true,
      score: 100,
    }),
  } as unknown as LearningApiClient;
}

function QuizRouteHarness({ learningApiClient }: { learningApiClient: LearningApiClient }) {
  return (
    <Routes>
      <Route
        path="/learn/:courseId/quizzes/:quizId"
        element={<LearningQuizPage learningApiClient={learningApiClient} locale="en" />}
      />
    </Routes>
  );
}

describe('LearningQuizPage', () => {
  it('uses the progress for the quiz course when the learner has multiple enrollments', async () => {
    const learningApiClient = createLearningApiClient();
    const authContextValue = createAuthContextValue();
    learningApiClient.getProgress = vi.fn().mockResolvedValue(createMultiCourseProgressSnapshot());

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={authContextValue}>
          <MemoryRouter initialEntries={[MODULE_PATH]}>
            <QuizRouteHarness learningApiClient={learningApiClient} />
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Module quiz: Training and generalization',
      }),
    ).toBeVisible();
    expect(learningApiClient.createQuizAttempt).toHaveBeenCalledWith({
      idToken: 'test-id-token',
      quizId: MODULE_QUIZ_ID,
    });
  });

  it('separates each question prompt from its labelled answer area', async () => {
    const learningApiClient = createLearningApiClient();
    const authContextValue = createAuthContextValue();

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={authContextValue}>
          <MemoryRouter initialEntries={[POST_PATH]}>
            <QuizRouteHarness learningApiClient={learningApiClient} />
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lesson quiz: Overfitting' }),
    ).toBeVisible();
    expect(screen.getAllByRole('region', { name: 'Answers' })).toHaveLength(3);
  });

  it('loads the module quiz when the lesson quiz CTA changes the quiz route', async () => {
    const learningApiClient = createLearningApiClient();
    const authContextValue = createAuthContextValue();
    const user = userEvent.setup();

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={authContextValue}>
          <MemoryRouter initialEntries={[POST_PATH]}>
            <QuizRouteHarness learningApiClient={learningApiClient} />
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lesson quiz: Overfitting' }),
    ).toBeVisible();
    expect(document.querySelectorAll('.quiz-question-card')).toHaveLength(3);
    expect(
      screen.getByText('Choose an answer for every question before submitting.'),
    ).toBeVisible();

    for (const answer of screen.getAllByRole('radio')) {
      await user.click(answer);
    }
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));

    const continueLink = await screen.findByRole('link', { name: 'Open the module quiz' });
    expect(continueLink).toHaveAttribute('href', MODULE_PATH);
    await user.click(continueLink);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Module quiz: Training and generalization',
      }),
    ).toBeVisible();
    expect(document.querySelectorAll('.quiz-question-card')).toHaveLength(6);
    expect(learningApiClient.createQuizAttempt).toHaveBeenNthCalledWith(2, {
      idToken: 'test-id-token',
      quizId: MODULE_QUIZ_ID,
    });
  });

  it('returns to the current module lesson list after the final module quiz', async () => {
    const learningApiClient = createLearningApiClient();
    const authContextValue = createAuthContextValue();
    const user = userEvent.setup();

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <AuthContext.Provider value={authContextValue}>
          <MemoryRouter initialEntries={[MODULE_PATH]}>
            <QuizRouteHarness learningApiClient={learningApiClient} />
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Module quiz: Training and generalization',
      }),
    ).toBeVisible();

    for (const answer of screen.getAllByRole('radio')) {
      await user.click(answer);
    }
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));

    const continueLink = await screen.findByRole('link', { name: 'Back to module lessons' });
    expect(continueLink).toHaveAttribute(
      'href',
      `/learn/${COURSE_ID}/modules/dl-m03-training-generalization`,
    );
  });
});
