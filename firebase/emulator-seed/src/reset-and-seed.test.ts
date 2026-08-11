import type { Firestore } from 'firebase-admin/firestore';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LocalBucket } from './admin-services.js';
import { LOCAL_EMULATOR_HOSTS, LOCAL_FIREBASE_PROJECT_ID } from './environment.js';
import { resetAndSeedLocalDataEmulators } from './reset-and-seed.js';
import type { LocalSeedManifest } from './seed-manifest.js';

const emptyManifest: LocalSeedManifest = {
  authUsers: [],
  firestoreDocuments: [],
  storageObjects: [],
  version: 1,
};

function createServices() {
  return {
    bucket: {
      deleteFiles: vi.fn().mockResolvedValue(undefined),
    } as unknown as LocalBucket,
    firestore: {} as Firestore,
    projectId: LOCAL_FIREBASE_PROJECT_ID,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('local emulator reset', () => {
  it('clears the canonical Firestore emulator database before seeding data', async () => {
    const services = createServices();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await resetAndSeedLocalDataEmulators(services, emptyManifest);

    expect(fetchMock).toHaveBeenCalledWith(
      `http://${LOCAL_EMULATOR_HOSTS.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${LOCAL_FIREBASE_PROJECT_ID}/databases/(default)/documents`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(services.bucket.deleteFiles).toHaveBeenCalledWith({ force: true });
  });

  it('retries a transient Firestore emulator lock conflict before seeding data', async () => {
    vi.useFakeTimers();
    const services = createServices();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const reset = resetAndSeedLocalDataEmulators(services, emptyManifest);
    await vi.runAllTimersAsync();
    await reset;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(services.bucket.deleteFiles).toHaveBeenCalledWith({ force: true });
  });

  it('stops before Storage reset when the Firestore emulator rejects the reset', async () => {
    const services = createServices();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(resetAndSeedLocalDataEmulators(services, emptyManifest)).rejects.toThrow(
      'Firestore Emulator document reset failed with HTTP 503.',
    );
    expect(services.bucket.deleteFiles).not.toHaveBeenCalled();
  });
});
