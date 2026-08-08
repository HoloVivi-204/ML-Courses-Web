import type { Firestore } from 'firebase-admin/firestore';
import { describe, expect, it, vi } from 'vitest';

import { seedPublishedAdminContent } from './published-admin-content-seed.js';

describe('seedPublishedAdminContent', () => {
  it('writes the Release 1 published content through the local Firestore repository', async () => {
    const firestore = {} as Firestore;
    const content = [{ entityId: 'course-neural-network-intro' }];
    const createContent = vi.fn(() => content);
    const seedFirestoreContent = vi.fn(async () => undefined);
    const loadDependencies = vi.fn(async () => ({
      createReleaseOneFirestoreAdminContentSeed: createContent,
      seedFirestoreAdminContentForEmulator: seedFirestoreContent,
    }));

    await seedPublishedAdminContent(firestore, loadDependencies);

    expect(createContent).toHaveBeenCalledOnce();
    expect(seedFirestoreContent).toHaveBeenCalledWith({ content, firestore });
  });
});
