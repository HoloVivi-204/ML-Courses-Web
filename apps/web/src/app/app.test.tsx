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

function createLearningApiClient(): LearningApiClient {
  return {
    bootstrapProfile: vi.fn().mockResolvedValue(undefined),
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
  };
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

  it('lets an enrolled learner complete the fixed AND gate demo after required steps', async () => {
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
});
