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
