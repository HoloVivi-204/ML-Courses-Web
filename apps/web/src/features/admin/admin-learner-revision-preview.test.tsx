import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AdminContentRevisionPreview } from '../learning/learning-api';
import { AdminLearnerRevisionPreview } from './admin-learner-revision-preview';

describe('AdminLearnerRevisionPreview', () => {
  it('renders course and module drafts in the learner cards with the selected locale and theme', () => {
    const coursePreview = {
      contentType: 'course',
      course: {
        courseId: 'course-deep-learning-basic',
        description: { en: 'Learn the essentials.', vi: 'Học các nền tảng.' },
        revisionId: 'draft-course-r2',
        title: { en: 'Deep Learning Basics', vi: 'Học sâu cơ bản' },
      },
    } satisfies AdminContentRevisionPreview;
    const { rerender } = render(
      <AdminLearnerRevisionPreview locale="vi" preview={coursePreview} theme="dark" />,
    );

    expect(screen.getByTestId('admin-learner-preview-course')).toHaveAttribute(
      'data-preview-theme',
      'dark',
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Học sâu cơ bản' })).toBeVisible();
    expect(screen.getByText('Học các nền tảng.')).toBeVisible();

    const modulePreview = {
      contentType: 'module',
      module: {
        courseId: 'course-deep-learning-basic',
        description: { en: 'Build the first model.', vi: 'Xây dựng mô hình đầu tiên.' },
        moduleId: 'dl-m01-neuron-perceptron',
        revisionId: 'draft-module-r2',
        title: { en: 'Neuron and Perceptron', vi: 'Neuron và Perceptron' },
      },
    } satisfies AdminContentRevisionPreview;
    rerender(<AdminLearnerRevisionPreview locale="en" preview={modulePreview} theme="light" />);

    expect(screen.getByTestId('admin-learner-preview-module')).toHaveAttribute(
      'data-preview-theme',
      'light',
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Neuron and Perceptron' })).toBeVisible();
    expect(screen.getByText('Build the first model.')).toBeVisible();
  });

  it('uses the learner demo frame for a demo revision', () => {
    const preview = {
      contentType: 'demo',
      demo: {
        algorithmId: 'perceptron',
        courseId: 'course-deep-learning-basic',
        demoId: 'demo-perceptron-and-gate',
        moduleId: 'dl-m01-neuron-perceptron',
        problemId: 'problem-demo-perceptron-and-gate',
        requiredStepIds: ['decision-boundary'],
        revisionId: 'draft-demo-r2',
        seed: 7,
        steps: [
          {
            id: 'decision-boundary',
            narration: { en: 'Inspect the fixed line.', vi: 'Quan sát đường cố định.' },
            required: true,
            textAlternative: {
              en: 'A fixed perceptron decision boundary.',
              vi: 'Một ranh giới quyết định Perceptron cố định.',
            },
            title: { en: 'Decision boundary', vi: 'Ranh giới quyết định' },
          },
        ],
        title: { en: 'Perceptron AND gate', vi: 'Cổng AND Perceptron' },
        visualization: {
          boundary: [
            { x: 36, y: 170 },
            { x: 200, y: 42 },
          ],
          points: [
            { classification: 'negative', label: '0,0', positiveFromStep: 1, x: 60, y: 170 },
          ],
        },
      },
    } satisfies AdminContentRevisionPreview;

    render(<AdminLearnerRevisionPreview locale="en" preview={preview} theme="light" />);

    expect(screen.getByTestId('admin-learner-preview-demo')).toBeVisible();
    expect(
      screen.getByRole('img', { name: 'A fixed perceptron decision boundary.' }),
    ).toBeVisible();
    expect(screen.getByText('Decision boundary')).toBeVisible();
  });

  it('uses disabled learner quiz choices without answer material', () => {
    const preview = {
      contentType: 'quiz',
      questions: [
        {
          options: [
            { optionId: 'opt-a', text: { en: 'An input', vi: 'Một đầu vào' } },
            { optionId: 'opt-b', text: { en: 'A decision', vi: 'Một quyết định' } },
          ],
          prompt: { en: 'What does a neuron produce?', vi: 'Neuron tạo ra gì?' },
          questionId: 'quiz-preview-q1',
          sourceId: 'source-neuron-question',
          type: 'single-choice',
        },
      ],
      quiz: {
        courseId: 'course-deep-learning-basic',
        description: { en: 'Check your understanding.', vi: 'Kiểm tra hiểu biết.' },
        moduleId: 'dl-m01-neuron-perceptron',
        postId: 'dl-p01-neuron-perceptron',
        quizId: 'quiz-post-dl-p01',
        revisionId: 'draft-quiz-r2',
        title: { en: 'Neuron quiz', vi: 'Quiz Neuron' },
      },
    } satisfies AdminContentRevisionPreview;

    render(<AdminLearnerRevisionPreview locale="en" preview={preview} theme="dark" />);

    expect(screen.getByTestId('admin-learner-preview-quiz')).toBeVisible();
    expect(screen.getByRole('radio', { name: 'An input' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'A decision' })).toBeDisabled();
    expect(screen.getByText('source-neuron-question')).toBeVisible();
    expect(screen.queryByText('correct-answer')).not.toBeInTheDocument();
  });
});
