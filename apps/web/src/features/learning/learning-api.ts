export interface EnrollmentResult {
  access: {
    moduleId: string;
    postId: string;
  };
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'in-progress';
  };
  nextPath: string;
}

export interface DemoCompletionResult {
  completion: {
    demoId: string;
    status: 'completed';
  };
  event: {
    demoId: string;
    requiredStepIds: readonly string[];
    type: 'demo_completed';
    viewedStepIds: readonly string[];
  };
}

export type QuizQuestionType = 'multiple-choice' | 'single-choice' | 'true-false';

export type QuizAnswerValue = readonly string[] | string;

export interface QuizAnswer {
  questionId: string;
  value: QuizAnswerValue;
}

export interface QuizAttemptResult {
  attempt: {
    attemptId: string;
    attemptNumber: number;
    expiresAt: string;
    passingScorePercent: number;
    questionCount: number;
    quizId: string;
    quizKind: 'module' | 'post';
    quizRevisionId: string;
    requiredCorrectCount: number | null;
    shuffleSeed: string | null;
  };
  mastery: {
    en: string;
    vi: string;
  };
  questions: ReadonlyArray<{
    options: ReadonlyArray<{
      optionId: string;
      text: {
        en: string;
        vi: string;
      };
    }>;
    prompt: {
      en: string;
      vi: string;
    };
    questionId: string;
    sourceId: string;
    type: QuizQuestionType;
  }>;
}

export interface QuizSubmissionResult {
  bestScore: number;
  feedback: ReadonlyArray<{
    correctAnswer?: QuizAnswerValue;
    explanation?: {
      en: string;
      vi: string;
    };
    hint: {
      en: string;
      vi: string;
    } | null;
    hintLevel: 0 | 1 | 2;
    isCorrect: boolean;
    questionId: string;
  }>;
  newlyUnlocked: ReadonlyArray<{ id: string; type: 'algorithm' | 'module' | 'post' }>;
  passed: boolean;
  score: number;
}

export interface LearningProgressSnapshot {
  algorithmUnlocks: ReadonlyArray<{
    algorithmId: string;
    moduleId: string;
  }>;
  contentAccess: ReadonlyArray<{
    contentType: 'demo' | 'module' | 'post';
    entityId: string;
  }>;
  demos: ReadonlyArray<{
    completed: boolean;
    demoId: string;
  }>;
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'completed' | 'in-progress' | 'not-enrolled';
  };
  modules: ReadonlyArray<{
    completedStepCount: number;
    moduleId: string;
    progressPercent: number;
    requiredStepCount: number;
    status: 'completed' | 'in-progress' | 'locked';
  }>;
  posts: ReadonlyArray<{
    bestScore: number;
    completed: boolean;
    postId: string;
    quizId: string;
    quizPassed: boolean;
  }>;
  quizzes: ReadonlyArray<{
    attemptCount: number;
    bestScore: number;
    passed: boolean;
    quizId: string;
    quizKind: 'module' | 'post';
  }>;
}

export interface LearningApiClient {
  bootstrapProfile(idToken: string): Promise<void>;
  completeDemo(input: {
    demoId: string;
    idToken: string;
    idempotencyKey: string;
    viewedStepIds: readonly string[];
  }): Promise<DemoCompletionResult>;
  createQuizAttempt(input: { idToken: string; quizId: string }): Promise<QuizAttemptResult>;
  enrollCourse(input: {
    courseId: string;
    idToken: string;
    idempotencyKey: string;
  }): Promise<EnrollmentResult>;
  getProgress(idToken: string): Promise<LearningProgressSnapshot>;
  submitQuizAttempt(input: {
    answers: readonly QuizAnswer[];
    attemptId: string;
    idToken: string;
    idempotencyKey: string;
  }): Promise<QuizSubmissionResult>;
}

interface SuccessEnvelope<TData> {
  data: TData;
  success: true;
}

async function readSuccessEnvelope<TData>(response: Response): Promise<TData> {
  if (!response.ok) {
    throw new Error('Learning API request failed.');
  }

  const body = (await response.json()) as SuccessEnvelope<TData>;

  if (body.success !== true) {
    throw new Error('Learning API returned an invalid success envelope.');
  }

  return body.data;
}

export function createFetchLearningApiClient(): LearningApiClient {
  return {
    async bootstrapProfile(idToken) {
      await readSuccessEnvelope(
        await fetch('/api/v1/users/me/bootstrap', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );
    },
    async completeDemo({ demoId, idToken, idempotencyKey, viewedStepIds }) {
      return readSuccessEnvelope<DemoCompletionResult>(
        await fetch(`/api/v1/demos/${encodeURIComponent(demoId)}/completions`, {
          body: JSON.stringify({ viewedStepIds }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
      );
    },
    async createQuizAttempt({ idToken, quizId }) {
      return readSuccessEnvelope<QuizAttemptResult>(
        await fetch(`/api/v1/quizzes/${encodeURIComponent(quizId)}/attempts`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
          method: 'POST',
        }),
      );
    },
    async enrollCourse({ courseId, idToken, idempotencyKey }) {
      return readSuccessEnvelope<EnrollmentResult>(
        await fetch(`/api/v1/courses/${encodeURIComponent(courseId)}/enrollments`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
            'idempotency-key': idempotencyKey,
          },
        }),
      );
    },
    async getProgress(idToken) {
      return readSuccessEnvelope<LearningProgressSnapshot>(
        await fetch('/api/v1/users/me/progress', {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );
    },
    async submitQuizAttempt({ answers, attemptId, idToken, idempotencyKey }) {
      return readSuccessEnvelope<QuizSubmissionResult>(
        await fetch(`/api/v1/quiz-attempts/${encodeURIComponent(attemptId)}/submissions`, {
          body: JSON.stringify({ answers }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
      );
    },
  };
}
