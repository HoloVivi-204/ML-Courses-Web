import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from './app';

describe('public learning journey', () => {
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
      await screen.findByRole('heading', {
        name: /một neuron đưa ra quyết định như thế nào/i,
      }),
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

    expect(screen.getByRole('status')).toHaveTextContent('Neuron chưa kích hoạt: 0');

    await user.click(screen.getByRole('button', { name: 'Đầu vào x1, hiện tại 0' }));
    await user.click(screen.getByRole('button', { name: 'Đầu vào x2, hiện tại 0' }));

    expect(screen.getByRole('status')).toHaveTextContent('Neuron kích hoạt: 1');
    expect(screen.getByText('0.7 × 1 + 0.7 × 1 − 1.0 = 0.4')).toBeVisible();
  });

  it('presents the trial lesson as a navigable learning sequence', () => {
    window.history.pushState(
      {},
      '',
      '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
    );

    render(<App />);

    const contents = screen.getByRole('navigation', { name: 'Mục lục bài học' });
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

  it('does not expose an undesignated trial lesson', () => {
    window.history.pushState({}, '', '/learn/course-deep-learning-basic/posts/not-a-public-trial');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Không tìm thấy bài học thử' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Về danh sách khóa học' })).toHaveAttribute(
      'href',
      '/courses',
    );
  });
});
