import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { ContentBlockRenderer, type ContentBlock } from './content-block-renderer';

describe('content block renderer', () => {
  it('renders supported blocks as localized semantic lesson content', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: { en: null, vi: null },
        activityId: null,
        assetIds: [],
        id: 'intro',
        locales: {
          en: {
            lede: 'An observable rule turns evidence into a result.',
            navigationTitle: 'Introduction',
            title: 'From evidence to a result',
          },
          vi: {
            lede: 'Một quy tắc quan sát được biến bằng chứng thành kết quả.',
            navigationTitle: 'Mở đầu',
            title: 'Từ bằng chứng đến kết quả',
          },
        },
        order: 1,
        postId: 'post-test',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'heading',
      },
      {
        accessibility: { en: null, vi: null },
        activityId: null,
        assetIds: [],
        id: 'explanation',
        locales: {
          en: { paragraphs: ['Weights control how strongly each input affects the result.'] },
          vi: { paragraphs: ['Trọng số kiểm soát mức ảnh hưởng của từng đầu vào.'] },
        },
        order: 2,
        postId: 'post-test',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'markdown',
      },
      {
        accessibility: { en: null, vi: null },
        activityId: null,
        assetIds: [],
        id: 'insight',
        locales: {
          en: { body: 'Trace every input before trusting the output.', title: 'Remember' },
          vi: { body: 'Lần theo từng đầu vào trước khi tin đầu ra.', title: 'Ghi nhớ' },
        },
        order: 3,
        postId: 'post-test',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'callout',
        variant: 'insight',
      },
    ];

    render(
      <article>
        <ContentBlockRenderer blocks={blocks} locale="vi" postId="post-test" />
      </article>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Từ bằng chứng đến kết quả' }),
    ).toBeVisible();
    expect(screen.getByText('Trọng số kiểm soát mức ảnh hưởng của từng đầu vào.')).toBeVisible();
    expect(screen.getByRole('note', { name: 'Ghi nhớ' })).toHaveTextContent(
      'Lần theo từng đầu vào trước khi tin đầu ra.',
    );
  });

  it('renders an allowlisted example from its stable activity ID', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: { en: null, vi: null },
        activityId: 'act-post-test-example',
        assetIds: [],
        id: 'try-example',
        locales: {
          en: { navigationTitle: 'Try the decision' },
          vi: { navigationTitle: 'Thử tạo quyết định' },
        },
        order: 3,
        postId: 'post-test',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'example',
      },
    ];

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <ContentBlockRenderer blocks={blocks} locale="vi" postId="post-test" />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Tạo một quyết định' })).toBeVisible();
    expect(screen.getByText('act-post-test-example')).toBeVisible();
  });

  it('opens only safe HTTPS resources in an isolated tab', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: { en: null, vi: null },
        activityId: null,
        assetIds: [],
        id: 'further-reading',
        locales: {
          en: {
            heading: 'Read further',
            intro: 'Continue with a primary source.',
            navigationTitle: 'Resources',
          },
          vi: {
            heading: 'Đọc thêm',
            intro: 'Đọc tiếp từ nguồn chính thống.',
            navigationTitle: 'Tài liệu',
          },
        },
        order: 5,
        postId: 'post-test',
        required: false,
        resources: [
          {
            language: 'en',
            relatedTopicIds: [],
            resourceType: 'documentation',
            sourceId: 'source-google-neural-nodes',
            sourceName: 'Google for Developers',
            title: 'Neural networks: Nodes and hidden layers',
            url: 'https://developers.google.com/machine-learning/crash-course/neural-networks/nodes-hidden-layers',
          },
          {
            language: 'en',
            relatedTopicIds: [],
            resourceType: 'documentation',
            sourceId: 'source-unsafe',
            sourceName: 'Unknown',
            title: 'Unsafe resource',
            url: 'javascript:alert(1)',
          },
        ],
        schemaVersion: 1,
        sourceIds: ['source-google-neural-nodes', 'source-unsafe'],
        type: 'source-list',
      },
    ];

    render(<ContentBlockRenderer blocks={blocks} locale="vi" postId="post-test" />);

    const safeLink = screen.getByRole('link', {
      name: 'Neural networks: Nodes and hidden layers',
    });
    expect(safeLink).toHaveAttribute(
      'href',
      'https://developers.google.com/machine-learning/crash-course/neural-networks/nodes-hidden-layers',
    );
    expect(safeLink).toHaveAttribute('target', '_blank');
    expect(safeLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('link', { name: 'Unsafe resource' })).not.toBeInTheDocument();
  });

  it('fails closed when a block is invalid or unsupported', () => {
    const blocks: unknown[] = [
      {
        activityId: null,
        id: 'hostile-block',
        locales: {
          en: { content: 'Do not expose this payload' },
          vi: { content: 'Không hiển thị payload này' },
        },
        order: 1,
        postId: 'post-test',
        required: true,
        schemaVersion: 1,
        type: 'script',
      },
    ];

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <ContentBlockRenderer blocks={blocks} locale="vi" postId="post-test" />
      </I18nextProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Nội dung này tạm thời không khả dụng.');
    expect(screen.queryByText('Không hiển thị payload này')).not.toBeInTheDocument();
  });

  it('renders a formula with a localized text alternative', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: {
          en: 'Inputs multiplied by weights plus bias produce score z.',
          vi: 'Đầu vào nhân trọng số cộng độ lệch tạo thành điểm z.',
        },
        activityId: null,
        assetIds: [],
        id: 'weighted-sum',
        locales: {
          en: {
            bias: 'bias',
            description: 'The score is compared with zero.',
            inputs: 'inputs',
            score: 'score',
            weights: 'weights',
          },
          vi: {
            bias: 'độ lệch',
            description: 'Điểm được so sánh với 0.',
            inputs: 'đầu vào',
            score: 'điểm',
            weights: 'trọng số',
          },
        },
        order: 2,
        postId: 'post-test',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'formula',
      },
    ];

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <ContentBlockRenderer blocks={blocks} locale="vi" postId="post-test" />
      </I18nextProvider>,
    );

    expect(
      screen.getByRole('img', {
        name: 'Đầu vào nhân trọng số cộng độ lệch tạo thành điểm z.',
      }),
    ).toBeVisible();
    expect(screen.getByText('Điểm được so sánh với 0.')).toBeVisible();
  });

  it('renders a comparison callout as two readable outcomes', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: { en: null, vi: null },
        activityId: null,
        assetIds: [],
        id: 'read-result',
        locales: {
          en: {
            body: 'The sign of z explains the output.',
            items: [
              { body: 'Below threshold.', label: 'z < 0', title: 'Output 0' },
              { body: 'At threshold.', label: 'z ≥ 0', title: 'Output 1' },
            ],
            title: 'Read the result',
          },
          vi: {
            body: 'Dấu của z giải thích đầu ra.',
            items: [
              { body: 'Chưa chạm ngưỡng.', label: 'z < 0', title: 'Đầu ra 0' },
              { body: 'Đã chạm ngưỡng.', label: 'z ≥ 0', title: 'Đầu ra 1' },
            ],
            title: 'Đọc kết quả',
          },
        },
        order: 4,
        postId: 'post-test',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'callout',
        variant: 'comparison',
      },
    ];

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <ContentBlockRenderer blocks={blocks} locale="vi" postId="post-test" />
      </I18nextProvider>,
    );

    const comparison = screen.getByRole('complementary', { name: 'Đọc kết quả' });
    expect(comparison).toHaveTextContent('z < 0');
    expect(comparison).toHaveTextContent('Đầu ra 1');
    expect(comparison).toHaveTextContent('Dấu của z giải thích đầu ra.');
  });

  it('renders markdown text without interpreting raw HTML', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: { en: null, vi: null },
        activityId: null,
        assetIds: [],
        id: 'safe-text',
        locales: {
          en: { paragraphs: ['<img src=x onerror=alert(1)>'] },
          vi: { paragraphs: ['<img src=x onerror=alert(1)>'] },
        },
        order: 1,
        postId: 'post-test',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'markdown',
      },
    ];

    render(<ContentBlockRenderer blocks={blocks} locale="vi" postId="post-test" />);

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
