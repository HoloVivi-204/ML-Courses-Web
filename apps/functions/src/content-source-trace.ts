export interface LocalizedAttribution {
  en: string;
  vi: string;
}

export interface SourceLicenseReference {
  id: string;
  name: string;
  url: string;
}

export interface SnapshotSourceReference {
  attribution: LocalizedAttribution;
  contentSnapshotHash: string;
  contentUrls: readonly string[];
  license: SourceLicenseReference;
  sourceId: string;
  sourceName: string;
}

export interface SnapshotPinnedSourceTrace {
  kind: 'snapshot-pinned';
  sourceSnapshots: readonly SnapshotSourceReference[];
}

export interface ExternalLinkOnlySourceTrace {
  kind: 'external-link-only';
  resources: readonly {
    sourceId: string;
    url: string;
  }[];
}

export type ContentSourceTrace = SnapshotPinnedSourceTrace | ExternalLinkOnlySourceTrace;

export interface DraftProvenance {
  candidateSourceIds: readonly string[];
  contentReviewStatus: 'pending-operator-review';
  externalEvidenceStatus: 'not-collected';
  importStatus: 'draft-only';
  sourceTrace?: ContentSourceTrace;
}

export const dlM01SourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from Microsoft AI for Beginners; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Microsoft AI for Beginners; đang chờ review nguồn.',
      },
      contentSnapshotHash: '2423708024f4cb064ec3794cfdeba06cf2c62dfc01bba10d7f0ca96a80efea80',
      contentUrls: [
        'https://raw.githubusercontent.com/microsoft/AI-For-Beginners/main/lessons/3-NeuralNetworks/03-Perceptron/README.md',
      ],
      license: {
        id: 'MIT',
        name: 'MIT License',
        url: 'https://raw.githubusercontent.com/microsoft/AI-For-Beginners/main/LICENSE',
      },
      sourceId: 'microsoft-ai-for-beginners',
      sourceName: 'Microsoft AI for Beginners',
    },
    {
      attribution: {
        en: 'Adapted as a concise original summary from Dive into Deep Learning Vietnamese; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Đắm mình vào Học Sâu; đang chờ review nguồn.',
      },
      contentSnapshotHash: '503f5fe87c26ab3c93d68142343a51feb72a0e743f293f0cc1090b34211bedc1',
      contentUrls: [
        'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/chapter_multilayer-perceptrons/mlp.md',
      ],
      license: {
        id: 'CC-BY-SA-4.0',
        name: 'Creative Commons Attribution-ShareAlike 4.0',
        url: 'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/LICENSE',
      },
      sourceId: 'd2l-vi',
      sourceName: 'Dive into Deep Learning Vietnamese',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const dlM02SourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [dlM01SourceTrace.sourceSnapshots[1]],
} as const satisfies SnapshotPinnedSourceTrace;

export const dlM03SourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from Dive into Deep Learning Vietnamese; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Đắm mình vào Học Sâu; đang chờ review nguồn.',
      },
      contentSnapshotHash: '503f5fe87c26ab3c93d68142343a51feb72a0e743f293f0cc1090b34211bedc1',
      contentUrls: [
        'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/chapter_multilayer-perceptrons/backprop.md',
        'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/chapter_multilayer-perceptrons/underfit-overfit.md',
      ],
      license: {
        id: 'CC-BY-SA-4.0',
        name: 'Creative Commons Attribution-ShareAlike 4.0',
        url: 'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/LICENSE',
      },
      sourceId: 'd2l-vi',
      sourceName: 'Dive into Deep Learning Vietnamese',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM01SourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from Microsoft ML for Beginners; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Microsoft ML for Beginners; đang chờ review nguồn.',
      },
      contentSnapshotHash: '797e080d50a3e4d2d6fc1ea3dae931a6f5544a336fc0faa357fe520fc7ef0a39',
      contentUrls: [
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/4-Classification/1-Introduction/README.md',
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/4-Classification/2-Classifiers-1/README.md',
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/5-Clustering/1-Visualize/README.md',
      ],
      license: {
        id: 'MIT',
        name: 'MIT License',
        url: 'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/LICENSE',
      },
      sourceId: 'microsoft-ml-for-beginners',
      sourceName: 'Microsoft ML for Beginners',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM02SourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from Microsoft ML for Beginners; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Microsoft ML for Beginners; đang chờ review nguồn.',
      },
      contentSnapshotHash: '797e080d50a3e4d2d6fc1ea3dae931a6f5544a336fc0faa357fe520fc7ef0a39',
      contentUrls: [
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/2-Regression/3-Linear/README.md',
      ],
      license: {
        id: 'MIT',
        name: 'MIT License',
        url: 'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/LICENSE',
      },
      sourceId: 'microsoft-ml-for-beginners',
      sourceName: 'Microsoft ML for Beginners',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM03SourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from the scikit-learn User Guide; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Hướng dẫn sử dụng scikit-learn; đang chờ review nguồn.',
      },
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/linear_model.html'],
      license: {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
      },
      sourceId: 'sklearn-docs',
      sourceName: 'scikit-learn User Guide',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM04LogisticSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from Microsoft ML for Beginners; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Microsoft ML for Beginners; đang chờ review nguồn.',
      },
      contentSnapshotHash: '797e080d50a3e4d2d6fc1ea3dae931a6f5544a336fc0faa357fe520fc7ef0a39',
      contentUrls: [
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/2-Regression/4-Logistic/README.md',
      ],
      license: {
        id: 'MIT',
        name: 'MIT License',
        url: 'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/LICENSE',
      },
      sourceId: 'microsoft-ml-for-beginners',
      sourceName: 'Microsoft ML for Beginners',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM04MetricsSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from Google Machine Learning Crash Course; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Google Machine Learning Crash Course; đang chờ review nguồn.',
      },
      contentSnapshotHash: 'be3f8c79a7ba8e6e03f326de4ab92dc966792ae91cac36c9225348d9c0cdf60b',
      contentUrls: ['https://developers.google.com/machine-learning/crash-course/classification'],
      license: {
        id: 'CC-BY-4.0',
        name: 'Creative Commons Attribution 4.0',
        url: 'https://creativecommons.org/licenses/by/4.0/',
      },
      sourceId: 'google-ml-crash-course',
      sourceName: 'Google Machine Learning Crash Course',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM04ModuleSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    ...cmlM04LogisticSourceTrace.sourceSnapshots,
    ...cmlM04MetricsSourceTrace.sourceSnapshots,
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM05KnnSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from the scikit-learn User Guide; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Hướng dẫn sử dụng scikit-learn; đang chờ review nguồn.',
      },
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/neighbors.html'],
      license: {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
      },
      sourceId: 'sklearn-docs',
      sourceName: 'scikit-learn User Guide',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM05NaiveBayesSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from the scikit-learn User Guide; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Hướng dẫn sử dụng scikit-learn; đang chờ review nguồn.',
      },
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/naive_bayes.html'],
      license: {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
      },
      sourceId: 'sklearn-docs',
      sourceName: 'scikit-learn User Guide',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM05ModuleSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    ...cmlM05KnnSourceTrace.sourceSnapshots,
    ...cmlM05NaiveBayesSourceTrace.sourceSnapshots,
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM06DecisionTreeSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from the scikit-learn User Guide; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Hướng dẫn sử dụng scikit-learn; đang chờ review nguồn.',
      },
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/tree.html'],
      license: {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
      },
      sourceId: 'sklearn-docs',
      sourceName: 'scikit-learn User Guide',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM06RandomForestSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from the scikit-learn User Guide; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Hướng dẫn sử dụng scikit-learn; đang chờ review nguồn.',
      },
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/ensemble.html'],
      license: {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
      },
      sourceId: 'sklearn-docs',
      sourceName: 'scikit-learn User Guide',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM06ModuleSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    ...cmlM06DecisionTreeSourceTrace.sourceSnapshots,
    ...cmlM06RandomForestSourceTrace.sourceSnapshots,
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM07SvmSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from the scikit-learn User Guide; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Hướng dẫn sử dụng scikit-learn; đang chờ review nguồn.',
      },
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/svm.html'],
      license: {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
      },
      sourceId: 'sklearn-docs',
      sourceName: 'scikit-learn User Guide',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM08ClusteringSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from the scikit-learn User Guide; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Hướng dẫn sử dụng scikit-learn; đang chờ review nguồn.',
      },
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/clustering.html'],
      license: {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
      },
      sourceId: 'sklearn-docs',
      sourceName: 'scikit-learn User Guide',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;

export const cmlM09PcaSourceTrace = {
  kind: 'snapshot-pinned',
  sourceSnapshots: [
    {
      attribution: {
        en: 'Adapted as a concise original summary from the scikit-learn User Guide; source review is pending.',
        vi: 'Diễn giải ngắn gọn, nguyên gốc từ Hướng dẫn sử dụng scikit-learn; đang chờ review nguồn.',
      },
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/decomposition.html'],
      license: {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
      },
      sourceId: 'sklearn-docs',
      sourceName: 'scikit-learn User Guide',
    },
  ],
} as const satisfies SnapshotPinnedSourceTrace;
