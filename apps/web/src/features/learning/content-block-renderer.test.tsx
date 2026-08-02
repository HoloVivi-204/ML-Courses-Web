import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { ContentBlockRenderer, type ContentBlock } from './content-block-renderer';

const GOOGLE_NEURAL_NODES_URL =
  'https://developers.google.com/machine-learning/crash-course/' +
  'neural-networks/nodes-hidden-layers';

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
          en: { markdown: 'Weights control how strongly each input affects the result.' },
          vi: { markdown: 'Trọng số kiểm soát mức ảnh hưởng của từng đầu vào.' },
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

  it('renders the Perceptron activity as the interactive neuron lab', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: { en: null, vi: null },
        activityId: 'act-dl-p01-neuron-perceptron-example',
        assetIds: [],
        id: 'try-example',
        locales: {
          en: { navigationTitle: 'Try the decision' },
          vi: { navigationTitle: 'Thử tạo quyết định' },
        },
        order: 3,
        postId: 'dl-p01-neuron-perceptron',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'example',
      },
    ];

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <ContentBlockRenderer blocks={blocks} locale="vi" postId="dl-p01-neuron-perceptron" />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Tạo một quyết định' })).toBeVisible();
    expect(screen.getByText('act-dl-p01-neuron-perceptron-example')).toBeVisible();
  });

  it('renders generic draft examples without reusing the neuron lab', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: { en: null, vi: null },
        activityId: 'act-cml-p03-linear-regression-example',
        assetIds: [],
        id: 'linear-example',
        locales: {
          en: { navigationTitle: 'Inspect a residual example' },
          vi: { navigationTitle: 'Quan sát ví dụ phần dư' },
        },
        order: 1,
        postId: 'cml-p03-linear-regression',
        required: true,
        schemaVersion: 1,
        sourceIds: [],
        type: 'example',
      },
    ];

    render(
      <I18nextProvider i18n={createAppI18n()}>
        <ContentBlockRenderer blocks={blocks} locale="vi" postId="cml-p03-linear-regression" />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Quan sát ví dụ phần dư' })).toBeVisible();
    expect(
      screen.getByText(
        'Đọc ví dụ này theo chuỗi: tín hiệu đầu vào thay đổi, mô hình phản ứng, rồi metric kiểm tra lỗi.',
      ),
    ).toBeVisible();
    expect(screen.getByText('act-cml-p03-linear-regression-example')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Tạo một quyết định' })).not.toBeInTheDocument();
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
            attribution: {
              en: 'Reference: Google for Developers.',
              vi: 'Tham khảo: Google for Developers.',
            },
            language: 'en',
            license: {
              name: 'CC BY 4.0',
              url: 'https://creativecommons.org/licenses/by/4.0/',
            },
            relatedTopicIds: [],
            resourceType: 'documentation',
            sourceId: 'source-google-neural-nodes',
            sourceName: 'Google for Developers',
            title: 'Neural networks: Nodes and hidden layers',
            url: GOOGLE_NEURAL_NODES_URL,
          },
          {
            attribution: { en: 'Unsafe.', vi: 'Không an toàn.' },
            language: 'en',
            license: {
              name: 'Unknown',
              url: 'javascript:alert(1)',
            },
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
    expect(safeLink).toHaveAttribute('href', GOOGLE_NEURAL_NODES_URL);
    expect(safeLink).toHaveAttribute('target', '_blank');
    expect(safeLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/Tham khảo: Google for Developers/i)).toBeVisible();
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
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

  it('renders GFM and math while dropping raw HTML and unsafe links', () => {
    const blocks: ContentBlock[] = [
      {
        accessibility: { en: null, vi: null },
        activityId: null,
        assetIds: [],
        id: 'safe-text',
        locales: {
          en: { markdown: '**Weight** contributes to $z = wx + b$.' },
          vi: {
            markdown:
              '**Trọng số** góp vào $z = wx + b$.\n\n- đầu vào\n- trọng số\n\n' +
              '<img src=x onerror=alert(1)>\n\n[Không an toàn](javascript:alert(1))',
          },
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

    expect(screen.getByText('Trọng số')).toHaveProperty('tagName', 'STRONG');
    expect(screen.getByRole('list')).toHaveTextContent('đầu vào');
    expect(document.querySelector('.katex')).toBeInTheDocument();
    expect(screen.queryByText('<img src=x onerror=alert(1)>')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Không an toàn' })).not.toBeInTheDocument();
  });
});
