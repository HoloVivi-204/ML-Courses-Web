import {
  connectStorageEmulator,
  getBytes,
  getStorage,
  ref,
  type FirebaseStorage,
} from 'firebase/storage';

import {
  getConfiguredFirebaseApp,
  shouldUseLocalDataEmulators,
} from '../auth/firebase-auth-gateway';
import {
  DatasetLoadError,
  createCacheApiDatasetByteCache,
  createPlaygroundDatasetLoader,
  decodeGzipDatasetBytes,
  sha256DatasetBytes,
  type PlaygroundDatasetLoader,
  type PlaygroundDatasetStorageManifest,
} from './playground-dataset-loader';

const LOCAL_STORAGE_EMULATOR_HOST = 'localhost';
const LOCAL_STORAGE_EMULATOR_PORT = 9199;
const connectedStorageEmulators = new WeakSet<FirebaseStorage>();

export function createFirebasePlaygroundDatasetLoader(): PlaygroundDatasetLoader {
  const app = getConfiguredFirebaseApp();

  if (!app) {
    return createUnavailableDatasetLoader();
  }

  const storage = getStorage(app);
  const usesLocalDataEmulators = shouldUseLocalDataEmulators();

  if (usesLocalDataEmulators && !connectedStorageEmulators.has(storage)) {
    connectStorageEmulator(storage, LOCAL_STORAGE_EMULATOR_HOST, LOCAL_STORAGE_EMULATOR_PORT);
    connectedStorageEmulators.add(storage);
  }

  return createPlaygroundDatasetLoader({
    cache: createCacheApiDatasetByteCache(),
    decodeGzip: decodeGzipDatasetBytes,
    environment: usesLocalDataEmulators ? 'emulator' : 'firebase',
    sha256: sha256DatasetBytes,
    source: {
      async download(path, maxDownloadBytes) {
        return new Uint8Array(await getBytes(ref(storage, path), maxDownloadBytes));
      },
    },
  });
}

function createUnavailableDatasetLoader(): PlaygroundDatasetLoader {
  return {
    getCacheKey(manifest: PlaygroundDatasetStorageManifest) {
      return `unavailable/${manifest.datasetVersionId}/${manifest.sha256}`;
    },
    async load(datasetVersionId) {
      throw new DatasetLoadError(datasetVersionId);
    },
  };
}
