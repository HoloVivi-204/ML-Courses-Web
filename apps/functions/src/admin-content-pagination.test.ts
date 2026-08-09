import { describe, expect, it } from 'vitest';

import { paginateAdminContent } from './admin-content-repository.js';

describe('Admin content pagination', () => {
  it('uses a deterministic entity cursor without losing filtered records', () => {
    const content = [
      { entityId: 'post-b', entityType: 'post' as const },
      { entityId: 'course-a', entityType: 'course' as const },
      { entityId: 'post-a', entityType: 'post' as const },
    ];
    const firstPage = paginateAdminContent({ content, limit: 2 });
    const secondPage = paginateAdminContent({
      content,
      cursor: firstPage.nextCursor ?? undefined,
      limit: 2,
    });

    expect(firstPage).toEqual({
      content: [
        { entityId: 'course-a', entityType: 'course' },
        { entityId: 'post-a', entityType: 'post' },
      ],
      nextCursor: 'post:post-a',
    });
    expect(secondPage).toEqual({
      content: [{ entityId: 'post-b', entityType: 'post' }],
      nextCursor: null,
    });
  });
});
