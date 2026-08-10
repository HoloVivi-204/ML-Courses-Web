import type { LibsvmConstructor } from '@libsvm-js/libsvm-js';
import libsvm from '@libsvm-js/libsvm-js/out/wasm/libsvm';
import loadSvm from '@libsvm-js/libsvm-js/src/loadSVM';

let constructorPromise: Promise<LibsvmConstructor> | null = null;

export async function loadLibsvmConstructor(): Promise<LibsvmConstructor> {
  constructorPromise ??= libsvm.load().then(() => loadSvm(libsvm));

  return constructorPromise;
}
