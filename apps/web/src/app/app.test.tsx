import { render, screen } from '@testing-library/react';
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
});
