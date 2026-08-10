declare module '@libsvm-js/libsvm-js' {
  interface LibsvmSvmInstance {
    free(): void;
    getSVIndices(): number[];
    predict(features: readonly (readonly number[])[]): number[];
    train(features: readonly (readonly number[])[], labels: readonly number[]): void;
  }

  interface LibsvmConstructor {
    new (options: Record<string, boolean | number | string>): LibsvmSvmInstance;
    KERNEL_TYPES: { RBF: string };
    SVM_TYPES: { C_SVC: string };
  }

  const libsvmPromise: Promise<LibsvmConstructor>;

  export type { LibsvmConstructor, LibsvmSvmInstance };
  export default libsvmPromise;
}

declare module '@libsvm-js/libsvm-js/out/wasm/libsvm' {
  const libsvm: { load(): Promise<void> };

  export default libsvm;
}

declare module '@libsvm-js/libsvm-js/src/loadSVM' {
  const loadSvm: (libsvm: unknown) => import('@libsvm-js/libsvm-js').LibsvmConstructor;

  export default loadSvm;
}
