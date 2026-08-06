import { describe, expect, it } from 'vitest';

import { parseContentBlockCollection } from './content-block-validation';

const POST_ID = 'post-test';

function createHeading(id: string, order: number) {
  return {
    accessibility: { en: null, vi: null },
    activityId: null,
    assetIds: [],
    id,
    locales: {
      en: { lede: 'English lede', navigationTitle: 'English', title: 'English title' },
      vi: { lede: 'Mô tả', navigationTitle: 'Tiếng Việt', title: 'Tiêu đề' },
    },
    order,
    postId: POST_ID,
    required: true,
    schemaVersion: 1,
    sourceIds: [],
    type: 'heading',
  };
}

describe('content block collection validation', () => {
  it('returns valid blocks in canonical order', () => {
    const result = parseContentBlockCollection(
      [createHeading('second', 2), createHeading('first', 1)],
      POST_ID,
    );

    expect(result?.map((block) => block.id)).toEqual(['first', 'second']);
  });

  it('rejects duplicate block IDs or order values', () => {
    expect(
      parseContentBlockCollection([createHeading('same', 1), createHeading('same', 2)], POST_ID),
    ).toBeNull();
    expect(
      parseContentBlockCollection([createHeading('first', 1), createHeading('second', 1)], POST_ID),
    ).toBeNull();
  });

  it('rejects a collection above the twelve-block hard limit', () => {
    const blocks = Array.from({ length: 13 }, (_, index) =>
      createHeading('heading-' + (index + 1), index + 1),
    );

    expect(parseContentBlockCollection(blocks, POST_ID)).toBeNull();
  });

  it('rejects the whole collection when one block is malformed', () => {
    const hostileBlock = {
      ...createHeading('hostile', 2),
      postId: 'another-post',
    };

    expect(
      parseContentBlockCollection([createHeading('valid', 1), hostileBlock], POST_ID),
    ).toBeNull();
  });

  it('accepts separate source documents from one pinned publisher when their URLs are distinct', () => {
    const sourceList = {
      accessibility: { en: null, vi: null },
      activityId: null,
      assetIds: [],
      id: 'sources',
      locales: {
        en: {
          heading: 'Sources',
          intro: 'Two documents support this lesson.',
          navigationTitle: 'Sources',
        },
        vi: {
          heading: 'Nguồn',
          intro: 'Hai tài liệu hỗ trợ bài học này.',
          navigationTitle: 'Nguồn',
        },
      },
      order: 1,
      postId: POST_ID,
      required: false,
      resources: [
        {
          attribution: { en: 'Adapted summary.', vi: 'Diễn giải ngắn gọn.' },
          language: 'vi',
          license: {
            name: 'Creative Commons Attribution-ShareAlike 4.0',
            url: 'https://creativecommons.org/licenses/by-sa/4.0/',
          },
          relatedTopicIds: [],
          resourceType: 'documentation',
          sourceId: 'd2l-vi',
          sourceName: 'Dive into Deep Learning Vietnamese',
          title: 'Backpropagation',
          url: 'https://example.test/backpropagation',
        },
        {
          attribution: { en: 'Adapted summary.', vi: 'Diễn giải ngắn gọn.' },
          language: 'vi',
          license: {
            name: 'Creative Commons Attribution-ShareAlike 4.0',
            url: 'https://creativecommons.org/licenses/by-sa/4.0/',
          },
          relatedTopicIds: [],
          resourceType: 'documentation',
          sourceId: 'd2l-vi',
          sourceName: 'Dive into Deep Learning Vietnamese',
          title: 'Underfitting and overfitting',
          url: 'https://example.test/underfit-overfit',
        },
      ],
      schemaVersion: 1,
      sourceIds: ['d2l-vi'],
      type: 'source-list',
    };

    expect(parseContentBlockCollection([sourceList], POST_ID)).not.toBeNull();
  });
});
