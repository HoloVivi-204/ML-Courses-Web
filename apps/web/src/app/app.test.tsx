import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from './app';
import type { AuthGateway } from '../features/auth/auth-context';
import type { LearningApiClient } from '../features/learning/learning-api';

function createAuthenticatedGateway(): AuthGateway {
  return {
    getIdToken: vi.fn().mockResolvedValue('local-id-token'),
    observe(listener) {
      listener({ email: 'learner@example.test', uid: 'learner-01' });
      return () => undefined;
    },
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi.fn().mockResolvedValue(undefined),
  };
}

function createLearningApiClient(overrides: Partial<LearningApiClient> = {}): LearningApiClient {
  return {
    bootstrapProfile: vi.fn().mockResolvedValue(undefined),
    cancelPlaygroundRunSession: vi.fn().mockResolvedValue({
      sessionId: 'session-pg-xor-01',
      status: 'cancelled',
    }),
    completeDemo: vi.fn().mockResolvedValue({
      completion: {
        demoId: 'demo-perceptron-and-gate',
        status: 'completed',
      },
      event: {
        demoId: 'demo-perceptron-and-gate',
        requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
        type: 'demo_completed',
        viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
      },
    }),
    createQuizAttempt: vi.fn().mockResolvedValue({
      attempt: {
        attemptId: 'attempt-quiz-post-dl-p01-01',
        attemptNumber: 1,
        expiresAt: '2026-07-19T13:00:00.000Z',
        passingScorePercent: 100,
        questionCount: 3,
        quizId: 'quiz-post-dl-p01',
        quizKind: 'post',
        quizRevisionId: 'quiz-post-dl-p01-rev-r1',
        requiredCorrectCount: 3,
        shuffleSeed: null,
      },
      mastery: {
        en: 'Answer all 3 questions correctly to complete this lesson.',
        vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
      },
      questions: [
        {
          options: [
            {
              optionId: 'opt-linear-limit',
              text: {
                en: 'A straight-line decision boundary has a known limit.',
                vi: 'Ranh giới quyết định thẳng có một giới hạn rõ.',
              },
            },
            {
              optionId: 'opt-randomness',
              text: {
                en: 'A Perceptron only fails when the seed is random.',
                vi: 'Perceptron chỉ thất bại khi seed là ngẫu nhiên.',
              },
            },
          ],
          prompt: {
            en: 'What does the XOR example show?',
            vi: 'Ví dụ XOR cho thấy điều gì?',
          },
          questionId: 'q-dl-p01-perceptron-role',
          sourceId: 'act-dl-p01-neuron-perceptron-quiz-01',
          type: 'single-choice',
        },
        {
          options: [
            {
              optionId: 'opt-weighted-sum',
              text: {
                en: 'Weighted sum with bias',
                vi: 'Tổng có trọng số kèm độ lệch',
              },
            },
            {
              optionId: 'opt-step-activation',
              text: {
                en: 'Step activation that returns 0 or 1',
                vi: 'Hàm bước trả về 0 hoặc 1',
              },
            },
            {
              optionId: 'opt-uploaded-dataset',
              text: {
                en: 'Uploaded arbitrary dataset',
                vi: 'Dataset tùy ý do người học tải lên',
              },
            },
          ],
          prompt: {
            en: 'Which two parts are in the Perceptron decision rule?',
            vi: 'Hai phần nào nằm trong quy tắc quyết định Perceptron?',
          },
          questionId: 'q-dl-p01-perceptron-parts',
          sourceId: 'act-dl-p01-neuron-perceptron-quiz-02',
          type: 'multiple-choice',
        },
        {
          options: [
            { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
            { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
          ],
          prompt: {
            en: 'True or false: AND is linearly separable.',
            vi: 'Đúng hay sai: AND tách tuyến tính được.',
          },
          questionId: 'q-dl-p01-and-linearly-separable',
          sourceId: 'act-dl-p01-neuron-perceptron-quiz-03',
          type: 'true-false',
        },
      ],
    }),
    createPlaygroundRunSession: vi.fn().mockResolvedValue({
      sessionId: 'session-pg-xor-01',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
      configHash: '9'.repeat(64),
      expiresAt: '2026-07-19T14:00:00.000Z',
      status: 'issued',
      verificationLevel: 'client-computed',
      workerProtocolVersion: 'ml-worker-v1',
    }),
    enrollCourse: vi.fn().mockResolvedValue({
      access: {
        moduleId: 'dl-m01-neuron-perceptron',
        postId: 'dl-p01-neuron-perceptron',
      },
      enrollment: {
        courseId: 'course-deep-learning-basic',
        progressPercent: 0,
        status: 'in-progress',
      },
      nextPath: '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    }),
    getProgress: vi.fn().mockResolvedValue({
      algorithmUnlocks: [],
      contentAccess: [
        {
          contentType: 'module',
          entityId: 'dl-m01-neuron-perceptron',
        },
        {
          contentType: 'post',
          entityId: 'dl-p01-neuron-perceptron',
        },
      ],
      demos: [
        {
          completed: false,
          demoId: 'demo-perceptron-and-gate',
        },
      ],
      enrollment: {
        courseId: 'course-deep-learning-basic',
        progressPercent: 0,
        status: 'in-progress',
      },
      modules: [
        {
          completedStepCount: 0,
          moduleId: 'dl-m01-neuron-perceptron',
          progressPercent: 0,
          requiredStepCount: 3,
          status: 'in-progress',
        },
      ],
      posts: [
        {
          bestScore: 0,
          completed: false,
          postId: 'dl-p01-neuron-perceptron',
          quizId: 'quiz-post-dl-p01',
          quizPassed: false,
        },
      ],
      quizzes: [
        {
          attemptCount: 0,
          bestScore: 0,
          passed: false,
          quizId: 'quiz-post-dl-p01',
          quizKind: 'post',
        },
        {
          attemptCount: 0,
          bestScore: 0,
          passed: false,
          quizId: 'quiz-module-dl-m01',
          quizKind: 'module',
        },
      ],
    }),
    submitQuizAttempt: vi.fn().mockResolvedValue({
      bestScore: 100,
      feedback: [
        {
          correctAnswer: 'opt-linear-limit',
          explanation: {
            en: 'XOR is not linearly separable.',
            vi: 'XOR không tách tuyến tính được.',
          },
          hint: null,
          hintLevel: 0,
          isCorrect: true,
          questionId: 'q-dl-p01-perceptron-role',
        },
      ],
      newlyUnlocked: [{ id: 'dl-p01-neuron-perceptron', type: 'post' }],
      passed: true,
      score: 100,
    }),
    ...overrides,
  };
}

function createUnlockedProgressSnapshot() {
  return {
    algorithmUnlocks: [
      {
        algorithmId: 'perceptron',
        moduleId: 'dl-m01-neuron-perceptron',
      },
    ],
    contentAccess: [
      {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
      },
      {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
      },
      {
        contentType: 'demo',
        entityId: 'demo-perceptron-and-gate',
      },
    ],
    demos: [
      {
        completed: true,
        demoId: 'demo-perceptron-and-gate',
      },
    ],
    enrollment: {
      courseId: 'course-deep-learning-basic',
      progressPercent: 33,
      status: 'in-progress',
    },
    modules: [
      {
        completedStepCount: 3,
        moduleId: 'dl-m01-neuron-perceptron',
        progressPercent: 100,
        requiredStepCount: 3,
        status: 'completed',
      },
    ],
    posts: [
      {
        bestScore: 100,
        completed: true,
        postId: 'dl-p01-neuron-perceptron',
        quizId: 'quiz-post-dl-p01',
        quizPassed: true,
      },
    ],
    quizzes: [
      {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        quizId: 'quiz-post-dl-p01',
        quizKind: 'post',
      },
      {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        quizId: 'quiz-module-dl-m01',
        quizKind: 'module',
      },
    ],
  };
}

function installImmediatePlaygroundWorker() {
  class ImmediatePlaygroundWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;

    postMessage(message: unknown) {
      const workerRequest = message as {
        request?: { runId: string };
        type: string;
      };

      if (workerRequest.type !== 'RUN' || !workerRequest.request) {
        return;
      }

      queueMicrotask(() => {
        const runId = workerRequest.request?.runId ?? 'run-unknown';

        this.onmessage?.({
          data: {
            type: 'PROGRESS',
            event: {
              runId,
              epoch: 100,
              totalEpochs: 100,
              loss: 0.5,
            },
          },
        } as MessageEvent);
        this.onmessage?.({
          data: {
            type: 'RESULT',
            result: {
              runId,
              scenarioId: 'pg-xor',
              algorithmId: 'perceptron',
              datasetVersionId: 'ds-xor-noisy-v1',
              boundary: {
                weights: [0.1, -0.1],
                bias: 0,
              },
              determinism: 'exact',
              feedback: ['linear-limit', 'non-convergence'],
              lossCurve: [{ epoch: 100, loss: 0.5 }],
              metrics: {
                accuracy: 0.5,
                testAccuracy: 0.5,
                trainAccuracy: 0.5,
                loss: 0.5,
              },
            },
          },
        } as MessageEvent);
      });
    }

    terminate() {
      return undefined;
    }
  }

  vi.stubGlobal('Worker', ImmediatePlaygroundWorker);
}

function installNonAcknowledgingPlaygroundWorker() {
  class NonAcknowledgingPlaygroundWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;

    postMessage() {
      return undefined;
    }

    terminate() {
      return undefined;
    }
  }

  vi.stubGlobal('Worker', NonAcknowledgingPlaygroundWorker);
}

describe('public learning journey', () => {
  it('does not expose the static lab preview as an interactive run control', () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(screen.queryByRole('button', { name: 'Chạy mô hình' })).not.toBeInTheDocument();
    expect(screen.getByText('Chạy mô hình')).toHaveClass('lab-run-preview');
  });

  it('lets a guest open the deep-learning roadmap from the landing page', async () => {
    window.history.pushState({}, '', '/');
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /machine learning không còn là một hộp đen/i,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /khám phá khóa học sâu cơ bản/i }));

    expect(await screen.findByRole('heading', { name: 'Học sâu cơ bản' })).toBeVisible();
    expect(screen.getByText('Neuron và Perceptron')).toBeVisible();
  });

  it('switches the public journey to English', async () => {
    window.history.pushState({}, '', '/');
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole('heading', {
        name: /machine learning is no longer a black box/i,
      }),
    ).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'en');
  });

  it('lets a guest switch to the dark theme', async () => {
    window.history.pushState({}, '', '/');
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Bật giao diện tối' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('ml-path-theme')).toBe('dark');
  });

  it('shows a safe not-found state for an unknown course', () => {
    window.history.pushState({}, '', '/courses/not-a-course');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Không tìm thấy khóa học' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Về danh sách khóa học' })).toHaveAttribute(
      'href',
      '/courses',
    );
  });

  it('lets a guest start the designated trial lesson from the course roadmap', async () => {
    window.history.pushState({}, '', '/courses/course-deep-learning-basic');
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('link', { name: /học thử neuron và perceptron/i }));

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /một neuron đưa ra quyết định như thế nào/i,
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();
    expect(window.location.pathname).toBe(
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
  });

  it('lets a guest change neuron inputs and observe the resulting decision', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText('Neuron chưa kích hoạt: 0')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Đầu vào x1, hiện tại 0' }));
    await user.click(screen.getByRole('button', { name: 'Đầu vào x2, hiện tại 0' }));

    expect(screen.getByRole('status')).toHaveTextContent('Neuron kích hoạt: 1');
    expect(screen.getByText('0.7 × 1 + 0.7 × 1 − 1.0 = 0.4')).toBeVisible();
  });

  it('presents the trial lesson as a navigable learning sequence', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );

    render(<App />);

    const contents = await screen.findByRole('navigation', { name: 'Mục lục bài học' });
    expect(contents).toBeVisible();
    expect(within(contents).getByRole('link', { name: 'Một neuron làm gì?' })).toHaveAttribute(
      'href',
      '#what-is-a-neuron',
    );
    expect(screen.getByRole('heading', { name: 'Từ tín hiệu đến quyết định' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Đọc kết quả, không đoán mò' })).toBeVisible();
  });

  it('keeps the trial lesson open when a guest switches to English', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole('heading', { name: 'How does a neuron make a decision?' }),
    ).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Lesson contents' })).toBeVisible();
    expect(window.location.pathname).toBe(
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );
  });

  it('does not expose an undesignated trial lesson', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/posts/not-a-public-trial');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Không tìm thấy bài học thử' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Về danh sách khóa học' })).toHaveAttribute(
      'href',
      '/courses',
    );
  });

  it('offers vetted further reading from the public trial lesson', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );

    render(<App />);

    const resource = await screen.findByRole('link', {
      name: 'Neural networks: Nodes and hidden layers',
    });
    expect(resource).toHaveAttribute('target', '_blank');
    expect(resource).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/developers\.google\.com/i)).toBeVisible();
  });

  it('shows the full Perceptron/XOR lesson only to an authenticated learner', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));

    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();
    expect(screen.getByText(/post_dl-p01-neuron-perceptron/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Chuyển sang tiếng Anh' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Why does XOR break a single-layer Perceptron?',
      }),
    ).toBeVisible();
    expect(screen.getByText('FULL LESSON')).toBeVisible();
  });

  it('shows backend-verified progress and unlocked algorithms on the learning path', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        algorithmUnlocks: [
          {
            algorithmId: 'perceptron',
            moduleId: 'dl-m01-neuron-perceptron',
          },
        ],
        contentAccess: [
          {
            contentType: 'module',
            entityId: 'dl-m01-neuron-perceptron',
          },
          {
            contentType: 'post',
            entityId: 'dl-p01-neuron-perceptron',
          },
          {
            contentType: 'demo',
            entityId: 'demo-perceptron-and-gate',
          },
        ],
        demos: [
          {
            completed: true,
            demoId: 'demo-perceptron-and-gate',
          },
        ],
        enrollment: {
          courseId: 'course-deep-learning-basic',
          progressPercent: 33,
          status: 'in-progress',
        },
        modules: [
          {
            completedStepCount: 3,
            moduleId: 'dl-m01-neuron-perceptron',
            progressPercent: 100,
            requiredStepCount: 3,
            status: 'completed',
          },
        ],
        posts: [
          {
            bestScore: 100,
            completed: true,
            postId: 'dl-p01-neuron-perceptron',
            quizId: 'quiz-post-dl-p01',
            quizPassed: true,
          },
        ],
        quizzes: [
          {
            attemptCount: 1,
            bestScore: 100,
            passed: true,
            quizId: 'quiz-post-dl-p01',
            quizKind: 'post',
          },
          {
            attemptCount: 1,
            bestScore: 100,
            passed: true,
            quizId: 'quiz-module-dl-m01',
            quizKind: 'module',
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText('Tiến độ đã xác minh: 33%')).toBeVisible();
    expect(screen.getByText('Module hoàn thành: 3/3 bước')).toBeVisible();
    expect(screen.getByText('Perceptron đã mở')).toBeVisible();
    expect(screen.getByRole('link', { name: /Mở Playground XOR/i })).toHaveAttribute(
      'href',
      '/playground/pg-xor',
    );
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
  });

  it('keeps pg-xor Playground locked until backend progress unlocks Perceptron', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Playground chưa mở khóa' })).toBeVisible();
    expect(learningApiClient.getProgress).toHaveBeenCalledWith('local-id-token');
    expect(learningApiClient.createPlaygroundRunSession).not.toHaveBeenCalled();
  });

  it('runs pg-xor Perceptron through a verified run session and worker result', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    installImmediatePlaygroundWorker();
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chạy' }));

    expect(await screen.findByText('Đã chạy xong')).toBeVisible();
    expect(screen.getByText('50%')).toBeVisible();
    expect(
      screen.getByText('Giới hạn tuyến tính: một ranh giới thẳng không tách được XOR.'),
    ).toBeVisible();
    expect(
      screen.getByText('Không hội tụ: tăng epoch không xóa được mâu thuẫn XOR.'),
    ).toBeVisible();
    expect(learningApiClient.createPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      deviceProfile: 'desktop',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
    });
    vi.unstubAllGlobals();
  });

  it('stops pg-xor without saving a successful worker result', async () => {
    window.history.pushState({}, '', '/playground/pg-xor');
    installNonAcknowledgingPlaygroundWorker();
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue(createUnlockedProgressSnapshot()),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Playground XOR: Perceptron' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chạy' }));
    await user.click(await screen.findByRole('button', { name: 'Dừng' }));

    expect(await screen.findByText('Run đã bị hủy')).toBeVisible();
    expect(screen.queryByTestId('playground-result')).not.toBeInTheDocument();
    expect(learningApiClient.cancelPlaygroundRunSession).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      sessionId: 'session-pg-xor-01',
    });
    vi.unstubAllGlobals();
  });

  it('keeps full Perceptron/XOR content closed without a content access grant', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );

    render(
      <App
        authGateway={createAuthenticatedGateway()}
        learningApiClient={createLearningApiClient()}
      />,
    );

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /Một neuron đưa ra quyết định như thế nào/i,
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', {
        name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/post_dl-p01-neuron-perceptron/)).not.toBeInTheDocument();
  });

  it('keeps the fixed AND gate demo closed without a module access grant', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/demos/demo-perceptron-and-gate',
    );
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Demo chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.completeDemo).not.toHaveBeenCalled();
  });

  it('keeps the fixed AND gate demo closed until backend progress grants demo access', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở demo AND gate/i }));

    expect(await screen.findByRole('heading', { name: 'Demo chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.completeDemo).not.toHaveBeenCalled();
  });

  it('lets an enrolled learner complete the fixed AND gate demo after required steps', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient({
      getProgress: vi.fn().mockResolvedValue({
        algorithmUnlocks: [],
        contentAccess: [
          {
            contentType: 'module',
            entityId: 'dl-m01-neuron-perceptron',
          },
          {
            contentType: 'post',
            entityId: 'dl-p01-neuron-perceptron',
          },
          {
            contentType: 'demo',
            entityId: 'demo-perceptron-and-gate',
          },
        ],
        demos: [
          {
            completed: false,
            demoId: 'demo-perceptron-and-gate',
          },
        ],
        enrollment: {
          courseId: 'course-deep-learning-basic',
          progressPercent: 33,
          status: 'in-progress',
        },
        modules: [
          {
            completedStepCount: 1,
            moduleId: 'dl-m01-neuron-perceptron',
            progressPercent: 33,
            requiredStepCount: 3,
            status: 'in-progress',
          },
        ],
        posts: [
          {
            bestScore: 100,
            completed: true,
            postId: 'dl-p01-neuron-perceptron',
            quizId: 'quiz-post-dl-p01',
            quizPassed: true,
          },
        ],
        quizzes: [
          {
            attemptCount: 1,
            bestScore: 100,
            passed: true,
            quizId: 'quiz-post-dl-p01',
            quizKind: 'post',
          },
          {
            attemptCount: 0,
            bestScore: 0,
            passed: false,
            quizId: 'quiz-module-dl-m01',
            quizKind: 'module',
          },
        ],
      }),
    });

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở demo AND gate/i }));

    expect(await screen.findByRole('heading', { name: 'Demo Perceptron: cổng AND' })).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: /Bốn điểm dữ liệu AND và một đường quyết định/i,
      }),
    ).toBeVisible();
    expect(screen.getByRole('status', { name: 'Tiến độ demo' })).toHaveTextContent(
      'Bước bắt buộc 1 / 4',
    );

    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));
    await user.click(screen.getByRole('button', { name: 'Bước tiếp theo' }));

    expect(await screen.findByText('demo_completed: demo-perceptron-and-gate')).toBeVisible();
    expect(learningApiClient.completeDemo).toHaveBeenCalledWith({
      demoId: 'demo-perceptron-and-gate',
      idToken: 'local-id-token',
      idempotencyKey: expect.any(String),
      viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
    });
  });

  it('keeps the post quiz closed without a post access grant', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/quizzes/quiz-post-dl-p01');
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Quiz chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.createQuizAttempt).not.toHaveBeenCalled();
  });

  it('keeps the module quiz closed until backend progress verifies post and demo completion', async () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/quizzes/quiz-module-dl-m01',
    );
    sessionStorage.setItem(
      'ml-path-learning-access-grants',
      JSON.stringify([
        {
          courseId: 'course-deep-learning-basic',
          moduleId: 'dl-m01-neuron-perceptron',
          uid: 'learner-01',
        },
      ]),
    );
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByRole('heading', { name: 'Quiz chưa khả dụng' })).toBeVisible();
    expect(learningApiClient.createQuizAttempt).not.toHaveBeenCalled();
  });

  it('lets an enrolled learner pass the post mastery quiz with server-side scoring', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const user = userEvent.setup();
    const learningApiClient = createLearningApiClient();

    render(
      <App authGateway={createAuthenticatedGateway()} learningApiClient={learningApiClient} />,
    );

    expect(await screen.findByText(/Enrollment đã sẵn sàng/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Mở bài học đầu tiên/i }));
    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Vì sao XOR làm Perceptron một lớp thất bại?',
        },
        { timeout: 3_000 },
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /Mở quiz bài học/i }));

    expect(await screen.findByRole('heading', { name: 'Quiz Perceptron/XOR' })).toBeVisible();
    expect(screen.getByText('Cần trả lời đúng cả 3 câu để hoàn thành bài.')).toBeVisible();
    expect(screen.getByTestId('quiz-attempt')).not.toHaveTextContent(/correctAnswer|hint/i);

    await user.click(
      screen.getByRole('radio', {
        name: 'Ranh giới quyết định thẳng có một giới hạn rõ.',
      }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Tổng có trọng số kèm độ lệch' }));
    await user.click(screen.getByRole('checkbox', { name: 'Hàm bước trả về 0 hoặc 1' }));
    await user.click(screen.getByRole('radio', { name: 'Đúng' }));
    await user.click(screen.getByRole('button', { name: 'Nộp quiz' }));

    expect(await screen.findByText('quiz_passed: quiz-post-dl-p01')).toBeVisible();
    expect(learningApiClient.submitQuizAttempt).toHaveBeenCalledWith({
      answers: [
        { questionId: 'q-dl-p01-perceptron-role', value: 'opt-linear-limit' },
        {
          questionId: 'q-dl-p01-perceptron-parts',
          value: ['opt-weighted-sum', 'opt-step-activation'],
        },
        { questionId: 'q-dl-p01-and-linearly-separable', value: 'true' },
      ],
      attemptId: 'attempt-quiz-post-dl-p01-01',
      idToken: 'local-id-token',
      idempotencyKey: expect.any(String),
    });
  });
});
