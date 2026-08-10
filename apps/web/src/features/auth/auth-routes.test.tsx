import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../app/app';
import { getCourse } from '../catalog/course-data';
import type { AuthGateway } from './auth-context';

function createLearnerProfileFixture(
  input: {
    locale?: 'en' | 'vi';
    theme?: 'dark' | 'light' | 'system';
  } = {},
) {
  return {
    uid: 'learner-01',
    schemaVersion: 1 as const,
    displayName: 'Local Student',
    avatarUrl: null,
    locale: input.locale ?? ('vi' as const),
    theme: input.theme ?? ('system' as const),
    status: 'active' as const,
  };
}

function createLearningApiClient() {
  return {
    bootstrapProfile: vi.fn().mockResolvedValue(createLearnerProfileFixture()),
    createAvatarUploadSession: vi.fn().mockResolvedValue({
      contentType: 'image/png',
      expiresAt: '2026-08-09T16:15:00.000Z',
      metadata: {
        schemaVersion: '1',
        sha256: 'a'.repeat(64),
        sourceId: 'user-avatar',
      },
      storagePath: 'user-avatars/learner-01/avatar-01',
      uploadSessionId: 'avatar-session-01',
    }),
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
    completePost: vi.fn().mockResolvedValue({
      completion: {
        postId: 'dl-p01-neuron-perceptron',
        status: 'completed',
      },
    }),
    recordDemoView: vi.fn().mockImplementation(({ demoId, viewedStepIds }) =>
      Promise.resolve({
        demoView: {
          demoId,
          started: true,
          viewedStepIds,
        },
      }),
    ),
    recordLearningEvent: vi.fn().mockResolvedValue({
      accepted: true,
      eventId: 'event-auth-test-01',
      verificationLevel: 'client-computed',
    }),
    recordModuleOverview: vi.fn().mockResolvedValue({
      moduleOverview: {
        moduleId: 'dl-m01-neuron-perceptron',
        nextPostId: 'dl-p01-neuron-perceptron',
        status: 'completed',
      },
    }),
    recordPostView: vi.fn().mockImplementation(({ postId, readingPosition, viewedItemIds }) =>
      Promise.resolve({
        postView: {
          contentViewed: false,
          postId,
          readingPosition,
          started: true,
          viewedItemIds,
        },
      }),
    ),
    createAdminContentDraft: vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Seed attribution',
          vi: 'Seed attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Draft preview',
        vi: 'Preview draft',
      },
      revisionVersion: 1,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Draft title',
        vi: 'Tiêu đề draft',
      },
      validationStatus: 'not-run',
    }),
    attachAdminContentEvidence: vi
      .fn()
      .mockRejectedValue(new Error('Admin evidence is not part of this test.')),
    updateAdminContentDraft: vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Updated attribution',
          vi: 'Updated attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Updated draft preview',
        vi: 'Preview draft đã cập nhật',
      },
      revisionVersion: 2,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Updated draft title',
        vi: 'Tiêu đề draft đã cập nhật',
      },
      validationStatus: 'not-run',
    }),
    validateAdminContentDraft: vi.fn().mockResolvedValue({
      baseRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      courseId: 'course-deep-learning-basic',
      draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      metadata: {
        attribution: {
          en: 'Updated attribution',
          vi: 'Updated attribution VI',
        },
        externalLinkUrl: null,
      },
      moduleId: 'dl-m01-neuron-perceptron',
      preview: {
        en: 'Updated draft preview',
        vi: 'Preview draft đã cập nhật',
      },
      revisionVersion: 2,
      sourceStatus: 'seeded',
      status: 'draft',
      title: {
        en: 'Updated draft title',
        vi: 'Tiêu đề draft đã cập nhật',
      },
      validationStatus: 'valid',
    }),
    publishAdminContentRevision: vi.fn().mockResolvedValue({
      courseId: 'course-deep-learning-basic',
      draftRevisionId: null,
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      moduleId: 'dl-m01-neuron-perceptron',
      previousPublishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      preview: {
        en: 'Updated draft preview',
        vi: 'Preview draft đã cập nhật',
      },
      publishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      sourceStatus: 'seeded',
      status: 'published',
      title: {
        en: 'Updated draft title',
        vi: 'Tiêu đề draft đã cập nhật',
      },
      validationStatus: 'valid',
    }),
    rollbackAdminContentRevision: vi.fn().mockResolvedValue({
      courseId: 'course-deep-learning-basic',
      draftRevisionId: null,
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
      localeAvailability: ['en', 'vi'],
      moduleId: 'dl-m01-neuron-perceptron',
      previousPublishedRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      preview: {
        en: 'Published learner copy',
        vi: 'Published learner copy VI',
      },
      publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      sourceStatus: 'seeded',
      status: 'published',
      title: {
        en: 'Published title',
        vi: 'Published title VI',
      },
      validationStatus: 'not-run',
    }),
    unpublishAdminContentEntity: vi.fn().mockResolvedValue({
      courseId: 'course-deep-learning-basic',
      draftRevisionId: null,
      entityId: 'course-deep-learning-basic',
      entityType: 'course',
      localeAvailability: ['en', 'vi'],
      preview: {
        en: 'Published course copy',
        vi: 'Published course copy VI',
      },
      publishedRevisionId: 'course-deep-learning-basic-rev-r1',
      sourceStatus: 'seeded',
      status: 'unpublished',
      title: {
        en: 'Deep Learning Basics',
        vi: 'Học sâu cơ bản',
      },
      validationStatus: 'not-run',
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
      questions: [],
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
    createPlaygroundConfig: vi.fn().mockResolvedValue({
      configId: 'config-pg-xor-01',
      name: 'XOR baseline',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
      compatibilityStatus: 'compatible',
      compatibilityReason: null,
    }),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    finalizeAvatarUpload: vi.fn().mockResolvedValue(createLearnerProfileFixture()),
    deletePlaygroundConfig: vi.fn().mockResolvedValue(undefined),
    deletePlaygroundRun: vi.fn().mockResolvedValue(undefined),
    updatePlaygroundConfig: vi.fn().mockResolvedValue({
      configId: 'config-pg-xor-01',
      name: 'XOR baseline',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
      compatibilityStatus: 'compatible',
      compatibilityReason: null,
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
    getCourseContent: vi.fn().mockImplementation((courseId) => {
      const course = getCourse(courseId);

      return course
        ? Promise.resolve({
            courseId,
            description: course.description,
            revisionId: `${courseId}-rev-r1`,
            title: course.title,
          })
        : Promise.reject(new Error(`Missing test course content for ${courseId}.`));
    }),
    getDemoContent: vi.fn().mockRejectedValue(new Error('Demo content is not part of this test.')),
    getFullPostContent: vi
      .fn()
      .mockRejectedValue(new Error('Post content is not part of this test.')),
    getModuleContent: vi.fn().mockImplementation((moduleId) => {
      const course = [
        getCourse('course-classical-ml'),
        getCourse('course-deep-learning-basic'),
      ].find((candidate) => candidate?.modules?.some((module) => module.id === moduleId));
      const module = course?.modules?.find((candidate) => candidate.id === moduleId);

      return course && module
        ? Promise.resolve({
            courseId: course.id,
            description: module.description,
            moduleId,
            revisionId: `${moduleId}-rev-r1`,
            title: module.title,
          })
        : Promise.reject(new Error(`Missing test module content for ${moduleId}.`));
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
      ],
    }),
    getRuntimeFeatureManifest: vi.fn().mockResolvedValue({
      checksum: 'a'.repeat(64),
      featureFlags: {
        additionalScenarioPairs: false,
        compareRuns: false,
        csvReports: false,
        demoAnimation: false,
        guidedPrediction: false,
        lessonSearch: false,
        pinRuns: false,
        quizDragDrop: false,
        quizMatching: false,
        studentDetailReports: false,
        targetScores: false,
      },
      releaseId: 'release-1',
      schemaVersion: 1,
    }),
    getQuizContent: vi.fn().mockRejectedValue(new Error('Quiz content is not part of this test.')),
    getTrialPostContent: vi
      .fn()
      .mockRejectedValue(new Error('Trial post content is not part of this test.')),
    getAdminReportSummary: vi.fn().mockResolvedValue({
      generatedAt: '2026-07-23T01:00:00.000Z',
      learningVerified: {
        verificationLevel: 'server-verified',
        learnerCount: 0,
        courseProgress: [],
        moduleProgress: [],
        postProgress: [],
        quizSummary: {
          averageScorePercent: 0,
          passedAttemptCount: 0,
          passRate: 0,
          totalAttemptCount: 0,
          commonWrongQuestions: [],
        },
        algorithmUnlocks: [],
      },
      playgroundClientReported: {
        verificationLevel: 'client-computed',
        runCount: 0,
        failedRunCount: 0,
        errorRate: 0,
        scenarioActivity: [],
      },
      contentLifecycle: {
        publishedCount: 0,
        draftCount: 0,
        validationPendingCount: 0,
        unpublishedCount: 0,
      },
    }),
    getAdminContentRevisionPreview: vi
      .fn()
      .mockRejectedValue(new Error('Admin preview is not part of this test.')),
    listAdminContent: vi.fn().mockResolvedValue({ content: [], nextCursor: null }),
    listAdminContentEvidence: vi
      .fn()
      .mockRejectedValue(new Error('Admin evidence is not part of this test.')),
    listPlaygroundConfigs: vi.fn().mockResolvedValue([]),
    listPlaygroundRuns: vi.fn().mockResolvedValue([]),
    savePlaygroundRun: vi.fn().mockResolvedValue({
      runId: 'run-pg-xor-01',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
      durationMs: 1234,
      feedback: ['linear-limit'],
      isPinned: false,
      metrics: {
        accuracy: 0.5,
        loss: 0.5,
        testAccuracy: 0.5,
        trainAccuracy: 0.5,
      },
      createdAt: '2026-07-19T14:00:00.000Z',
      targetReached: null,
      targetVersionId: null,
      verificationLevel: 'client-computed',
    }),
    submitQuizAttempt: vi.fn().mockResolvedValue({
      bestScore: 100,
      feedback: [],
      newlyUnlocked: [{ id: 'dl-p01-neuron-perceptron', type: 'post' }],
      passed: true,
      score: 100,
    }),
    updatePreferences: vi.fn().mockResolvedValue(createLearnerProfileFixture()),
  };
}

function createGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getIdToken: vi.fn().mockResolvedValue('local-id-token'),
    observe(listener) {
      listener(null);
      return () => undefined;
    },
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('authentication routes', () => {
  it('lets a guest register with email and password without displaying the password afterward', async () => {
    window.history.pushState({}, '', '/register');
    const gateway = createGateway();
    const user = userEvent.setup();
    const password = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    render(<App authGateway={gateway} />);

    await user.type(await screen.findByLabelText('Email'), 'learner@example.test');
    await user.type(screen.getByLabelText('Mật khẩu'), password);
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(gateway.signUpWithEmail).toHaveBeenCalledWith('learner@example.test', password);
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('shows a safe sign-in error instead of the provider message', async () => {
    window.history.pushState({}, '', '/login');
    const password = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const providerMessage = 'The password for learner@example.test is not valid.';
    const gateway = createGateway({
      signInWithEmail: vi.fn().mockRejectedValue({
        code: 'auth/invalid-credential',
        message: providerMessage,
      }),
    });
    const user = userEvent.setup();

    render(<App authGateway={gateway} />);

    await user.type(await screen.findByLabelText('Email'), 'learner@example.test');
    await user.type(screen.getByLabelText('Mật khẩu'), password);
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu chưa đúng.');
    expect(screen.queryByText(providerMessage)).not.toBeInTheDocument();
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('starts the Google flow through the same session gateway', async () => {
    window.history.pushState({}, '', '/login');
    const gateway = createGateway();
    const user = userEvent.setup();

    render(<App authGateway={gateway} />);

    await user.click(await screen.findByRole('button', { name: 'Tiếp tục với Google' }));

    expect(gateway.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('lets a guest request a password reset with a safe relative continue path', async () => {
    window.history.pushState({}, '', '/forgot-password?returnTo=%2Fdashboard');
    const gateway = createGateway();
    const user = userEvent.setup();

    render(<App authGateway={gateway} />);

    await user.type(await screen.findByLabelText('Email'), 'learner@example.test');
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }));

    expect(gateway.requestPasswordReset).toHaveBeenCalledWith('learner@example.test', '/dashboard');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nếu email thuộc tài khoản ML Path, liên kết đặt lại mật khẩu sẽ được gửi.',
    );
  });

  it('drops an external reset continue URL before calling Firebase', async () => {
    window.history.pushState({}, '', '/forgot-password?returnTo=https%3A%2F%2Fevil.example');
    const gateway = createGateway();
    const user = userEvent.setup();

    render(<App authGateway={gateway} />);

    await user.type(await screen.findByLabelText('Email'), 'learner@example.test');
    await user.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }));

    expect(gateway.requestPasswordReset).toHaveBeenCalledWith('learner@example.test', '/');
  });

  it('redirects a guest from the protected learning route to sign in with a safe return path', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const gateway = createGateway();

    render(<App authGateway={gateway} />);

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(window.location.search).toBe('?returnTo=%2Flearn%2Fcourse-deep-learning-basic');
  });

  it('redirects a guest from the learner dashboard to sign in with a safe return path', async () => {
    window.history.pushState({}, '', '/dashboard');
    const gateway = createGateway();

    render(<App authGateway={gateway} />);

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(window.location.search).toBe('?returnTo=%2Fdashboard');
  });

  it('returns an authenticated learner to the requested relative learning path', async () => {
    window.history.pushState({}, '', '/login?returnTo=%2Flearn%2Fcourse-deep-learning-basic');
    const gateway = createGateway({
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
    });
    const learningApiClient = createLearningApiClient();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    await waitFor(() => expect(window.location.pathname).toBe('/learn/course-deep-learning-basic'));
    expect(learningApiClient.bootstrapProfile).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      locale: 'vi',
      theme: 'system',
    });
  });

  it('uses local preferences for bootstrap and then applies the returned profile preferences', async () => {
    window.history.pushState({}, '', '/login');
    localStorage.setItem('ml-path-locale', 'en');
    localStorage.setItem('ml-path-theme', 'dark');
    const gateway = createGateway({
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
    });
    const learningApiClient = createLearningApiClient();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(learningApiClient.bootstrapProfile).toHaveBeenCalledWith({
      idToken: 'local-id-token',
      locale: 'en',
      theme: 'dark',
    });
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'vi'));
    await waitFor(() => expect(localStorage.getItem('ml-path-theme')).toBe('system'));
  });

  it('drops an absolute external return URL after authentication', async () => {
    window.history.pushState({}, '', '/login?returnTo=https%3A%2F%2Fevil.example%2Fsteal');
    const gateway = createGateway({
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
    });
    const learningApiClient = createLearningApiClient();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(window.location.href).not.toContain('evil.example');
  });

  it('enrolls an authenticated learner before opening the protected course path', async () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic');
    const gateway = createGateway({
      observe(listener) {
        listener({ email: 'learner@example.test', uid: 'learner-01' });
        return () => undefined;
      },
    });
    const learningApiClient = createLearningApiClient();

    render(<App authGateway={gateway} learningApiClient={learningApiClient} />);

    expect(await screen.findByRole('heading', { name: /Neuron và Perceptron/i })).toBeVisible();
    await waitFor(() =>
      expect(learningApiClient.enrollCourse).toHaveBeenCalledWith({
        courseId: 'course-deep-learning-basic',
        idToken: 'local-id-token',
        idempotencyKey: expect.any(String),
      }),
    );
  });
});
