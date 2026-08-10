import { createHash } from 'node:crypto';

import { type LocalizedText } from './release-learning-catalog.js';
import {
  cmlM01SourceTrace,
  cmlM02SourceTrace,
  cmlM03SourceTrace,
  cmlM04LogisticSourceTrace,
  cmlM04MetricsSourceTrace,
  cmlM05KnnSourceTrace,
  cmlM05NaiveBayesSourceTrace,
  cmlM06DecisionTreeSourceTrace,
  cmlM06RandomForestSourceTrace,
  cmlM07SvmSourceTrace,
  cmlM08ClusteringSourceTrace,
  cmlM09PcaSourceTrace,
  dlM01SourceTrace,
  dlM02SourceTrace,
  dlM03SourceTrace,
  type DraftProvenance,
} from './content-source-trace.js';

export type { DraftProvenance } from './content-source-trace.js';

export interface LearningContentBlock {
  accessibility: { en: string | null; vi: string | null };
  activityId: string | null;
  assetIds: readonly string[];
  id: string;
  locales: { en: Record<string, unknown>; vi: Record<string, unknown> };
  order: number;
  postId: string;
  required: boolean;
  schemaVersion: 1;
  sourceIds: readonly string[];
  type: 'callout' | 'example' | 'formula' | 'heading' | 'markdown' | 'source-list';
  [field: string]: unknown;
}

export interface TrialPost {
  accessLevel: 'full' | 'trial';
  blocks: readonly LearningContentBlock[];
  courseId: string;
  description: LocalizedText;
  durationMinutes: number;
  id: string;
  learningObjective: LocalizedText;
  moduleId: string;
  postQuizId: string;
  provenance: DraftProvenance;
  sourceReviewStatus: 'pending-operator-review';
  taskFingerprint: string;
  title: LocalizedText;
}

const TRIAL_POST_ID = 'dl-p01-neuron-perceptron';
const MLP_POST_ID = 'dl-p02-mlp-forward-activation';
const TRAINING_POST_ID = 'dl-p03-backprop-overfitting';
const CML_M01_PROBLEM_POST_ID = 'cml-p01-problem-data-types';
const CML_M01_EVALUATION_POST_ID = 'cml-p02-train-test-metrics';
const CML_M02_LINEAR_POST_ID = 'cml-p03-linear-regression';
const CML_M02_POLYNOMIAL_POST_ID = 'cml-p04-polynomial-regression';
const CML_M03_REGULARIZATION_POST_ID = 'cml-p05-regularization-ridge-lasso';
const CML_M04_LOGISTIC_POST_ID = 'cml-p06-logistic-regression';
const CML_M04_METRICS_POST_ID = 'cml-p07-classification-metrics';
const CML_M05_KNN_POST_ID = 'cml-p08-knn';
const CML_M05_NAIVE_BAYES_POST_ID = 'cml-p09-naive-bayes';
const CML_M06_DECISION_TREE_POST_ID = 'cml-p10-decision-tree';
const CML_M06_RANDOM_FOREST_POST_ID = 'cml-p11-random-forest';
const CML_M07_SVM_POST_ID = 'cml-p12-svm';
const CML_M08_KMEANS_POST_ID = 'cml-p13-kmeans';
const CML_M08_HIERARCHICAL_POST_ID = 'cml-p14-hierarchical-clustering';
const CML_M09_PCA_POST_ID = 'cml-p15-pca';
const DL_M01_PRIMARY_SOURCE_IDS = ['microsoft-ai-for-beginners'] as const;
const DL_M01_MLP_SOURCE_IDS = ['d2l-vi'] as const;
const DL_M01_SOURCE_IDS = dlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const DL_M02_SOURCE_IDS = dlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const DL_M03_SOURCE_IDS = dlM03SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M01_SOURCE_IDS = cmlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M02_SOURCE_IDS = cmlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M03_SOURCE_IDS = cmlM03SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M04_LOGISTIC_SOURCE_IDS = cmlM04LogisticSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M04_METRICS_SOURCE_IDS = cmlM04MetricsSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M05_KNN_SOURCE_IDS = cmlM05KnnSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M05_NAIVE_BAYES_SOURCE_IDS = cmlM05NaiveBayesSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M06_DECISION_TREE_SOURCE_IDS = cmlM06DecisionTreeSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M06_RANDOM_FOREST_SOURCE_IDS = cmlM06RandomForestSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M07_SVM_SOURCE_IDS = cmlM07SvmSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M08_CLUSTERING_SOURCE_IDS = cmlM08ClusteringSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M09_PCA_SOURCE_IDS = cmlM09PcaSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);

const blockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: TRIAL_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: DL_M01_PRIMARY_SOURCE_IDS,
} as const;

const mlpBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: MLP_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: DL_M02_SOURCE_IDS,
} as const;

const trainingBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: TRAINING_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: DL_M03_SOURCE_IDS,
} as const;

const cmlM01ProblemBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M01_PROBLEM_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M01_SOURCE_IDS,
} as const;

const cmlM01EvaluationBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M01_EVALUATION_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M01_SOURCE_IDS,
} as const;

const cmlM02LinearBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M02_LINEAR_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M02_SOURCE_IDS,
} as const;

const cmlM02PolynomialBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M02_POLYNOMIAL_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M02_SOURCE_IDS,
} as const;

const cmlM03RegularizationBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M03_REGULARIZATION_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M03_SOURCE_IDS,
} as const;

const cmlM04LogisticBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M04_LOGISTIC_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M04_LOGISTIC_SOURCE_IDS,
} as const;

const cmlM04MetricsBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M04_METRICS_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M04_METRICS_SOURCE_IDS,
} as const;

const cmlM05KnnBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M05_KNN_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M05_KNN_SOURCE_IDS,
} as const;

const cmlM05NaiveBayesBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M05_NAIVE_BAYES_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M05_NAIVE_BAYES_SOURCE_IDS,
} as const;

const cmlM06DecisionTreeBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M06_DECISION_TREE_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M06_DECISION_TREE_SOURCE_IDS,
} as const;

const cmlM06RandomForestBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M06_RANDOM_FOREST_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M06_RANDOM_FOREST_SOURCE_IDS,
} as const;

const cmlM07SvmBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M07_SVM_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M07_SVM_SOURCE_IDS,
} as const;

const cmlM08KmeansBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M08_KMEANS_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M08_CLUSTERING_SOURCE_IDS,
} as const;

const cmlM08HierarchicalBlockDefaults = {
  accessibility: { en: null, vi: null },
  assetIds: [],
  activityId: null,
  postId: CML_M08_HIERARCHICAL_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M08_CLUSTERING_SOURCE_IDS,
} as const;

const cmlM09PcaBlockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: CML_M09_PCA_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: CML_M09_PCA_SOURCE_IDS,
} as const;

const cmlM01DraftProvenance = {
  candidateSourceIds: CML_M01_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM01SourceTrace,
} as const satisfies DraftProvenance;

const cmlM02DraftProvenance = {
  candidateSourceIds: CML_M02_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM02SourceTrace,
} as const satisfies DraftProvenance;

const cmlM03DraftProvenance = {
  candidateSourceIds: CML_M03_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM03SourceTrace,
} as const satisfies DraftProvenance;

const cmlM04LogisticDraftProvenance = {
  candidateSourceIds: CML_M04_LOGISTIC_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM04LogisticSourceTrace,
} as const satisfies DraftProvenance;

const cmlM04MetricsDraftProvenance = {
  candidateSourceIds: CML_M04_METRICS_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM04MetricsSourceTrace,
} as const satisfies DraftProvenance;

const cmlM05KnnDraftProvenance = {
  candidateSourceIds: CML_M05_KNN_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM05KnnSourceTrace,
} as const satisfies DraftProvenance;

const cmlM05NaiveBayesDraftProvenance = {
  candidateSourceIds: CML_M05_NAIVE_BAYES_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM05NaiveBayesSourceTrace,
} as const satisfies DraftProvenance;

const cmlM06DecisionTreeDraftProvenance = {
  candidateSourceIds: CML_M06_DECISION_TREE_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM06DecisionTreeSourceTrace,
} as const satisfies DraftProvenance;

const cmlM06RandomForestDraftProvenance = {
  candidateSourceIds: CML_M06_RANDOM_FOREST_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM06RandomForestSourceTrace,
} as const satisfies DraftProvenance;

const cmlM07SvmDraftProvenance = {
  candidateSourceIds: CML_M07_SVM_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM07SvmSourceTrace,
} as const satisfies DraftProvenance;

const cmlM08ClusteringDraftProvenance = {
  candidateSourceIds: CML_M08_CLUSTERING_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM08ClusteringSourceTrace,
} as const satisfies DraftProvenance;

const cmlM09PcaDraftProvenance = {
  candidateSourceIds: CML_M09_PCA_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM09PcaSourceTrace,
} as const satisfies DraftProvenance;

const candidateSourceIdsByCourseId: Readonly<Record<string, readonly string[]>> = {
  'course-classical-ml': [
    'microsoft-ml-for-beginners',
    'google-ml-crash-course',
    'mit-ocw',
    'sklearn-docs',
  ],
  'course-deep-learning-basic': [
    'd2l-vi',
    'microsoft-ai-for-beginners',
    'google-ml-crash-course',
    'tensorflow-tutorials',
  ],
};

function createDraftProvenance(courseId: string): DraftProvenance {
  const candidateSourceIds = candidateSourceIdsByCourseId[courseId];

  if (!candidateSourceIds) {
    throw new Error(`Missing draft provenance candidates for ${courseId}.`);
  }

  return {
    candidateSourceIds,
    contentReviewStatus: 'pending-operator-review',
    externalEvidenceStatus: 'not-collected',
    importStatus: 'draft-only',
  };
}

const trialBlocks = [
  {
    ...blockDefaults,
    id: 'what-is-a-neuron',
    locales: {
      en: {
        lede:
          'A Perceptron is a small binary classifier: it receives a feature vector and chooses ' +
          'one of two output classes.',
        navigationTitle: 'What does a Perceptron do?',
        title: 'From features to a binary choice',
      },
      vi: {
        lede:
          'Perceptron là một bộ phân loại nhị phân nhỏ: nó nhận một vector feature và chọn ' +
          'một trong hai lớp đầu ra.',
        navigationTitle: 'Perceptron làm gì?',
        title: 'Từ feature đến lựa chọn nhị phân',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'neuron-explanation',
    locales: {
      en: {
        markdown:
          'Treat each input as one piece of **evidence**. The model first combines it with a ' +
          'weight: $z = w_1x_1 + w_2x_2 + b$. An activation rule then turns $z$ into the class.',
      },
      vi: {
        markdown:
          'Hãy xem mỗi đầu vào như một mẩu **bằng chứng**. Mô hình trước hết kết hợp chúng với ' +
          'trọng số: $z = w_1x_1 + w_2x_2 + b$. Sau đó một quy tắc kích hoạt biến $z$ thành lớp.',
      },
    },
    order: 2,
    sourceIds: ['d2l-vi', 'microsoft-ai-for-beginners'],
    type: 'markdown',
  },
  {
    ...blockDefaults,
    id: 'neuron-insight',
    locales: {
      en: {
        body:
          'Cause and effect stay visible: changing an input changes the weighted score; the ' +
          'activation rule converts that score into the final class.',
        title: 'Keep the decision chain inspectable',
      },
      vi: {
        body:
          'Quan hệ nguyên nhân-kết quả luôn thấy được: đổi một đầu vào sẽ đổi tổng có trọng số; ' +
          'quy tắc kích hoạt biến tổng đó thành lớp cuối cùng.',
        title: 'Giữ chuỗi quyết định có thể kiểm tra',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...blockDefaults,
    id: 'weighted-sum',
    locales: {
      en: {
        lede:
          'Each feature is multiplied by a weight before the values are added. The resulting ' +
          'score shows how the model balances the available evidence.',
        navigationTitle: 'Why weights matter',
        title: 'Weights shape the score',
      },
      vi: {
        lede:
          'Mỗi feature được nhân với một trọng số trước khi các giá trị được cộng. Điểm số thu ' +
          'được cho biết mô hình cân bằng các bằng chứng sẵn có như thế nào.',
        navigationTitle: 'Vì sao trọng số quan trọng?',
        title: 'Trọng số định hình điểm số',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'weight-explanation',
    locales: {
      en: {
        markdown:
          'The bias shifts where the boundary sits. For this introductory model, a step ' +
          'activation compares $z$ with zero and returns either **0** or **1**.',
      },
      vi: {
        markdown:
          'Độ lệch dịch vị trí của ranh giới. Với mô hình nhập môn này, hàm bước so sánh $z$ với ' +
          '0 và trả về **0** hoặc **1**.',
      },
    },
    order: 5,
    sourceIds: ['d2l-vi', 'microsoft-ai-for-beginners'],
    type: 'markdown',
  },
  {
    ...blockDefaults,
    accessibility: {
      en:
        'Inputs x one and x two are multiplied by weights, then bias is added ' +
        'to produce score z.',
      vi: 'Đầu vào x một và x hai được nhân với trọng số rồi cộng độ lệch để tạo điểm z.',
    },
    id: 'weighted-sum-formula',
    locales: {
      en: {
        bias: 'bias',
        description:
          'Compute the weighted score first; the step rule maps its sign to a binary output.',
        inputs: 'inputs',
        score: 'score',
        weights: 'weights',
      },
      vi: {
        bias: 'độ lệch',
        description:
          'Tính tổng có trọng số trước; quy tắc bước ánh xạ dấu của nó thành đầu ra nhị phân.',
        inputs: 'đầu vào',
        score: 'điểm',
        weights: 'trọng số',
      },
    },
    order: 6,
    sourceIds: ['d2l-vi', 'microsoft-ai-for-beginners'],
    type: 'formula',
  },
  {
    ...blockDefaults,
    activityId: 'act-dl-p01-neuron-perceptron-example',
    id: 'try-it',
    locales: {
      en: { navigationTitle: 'Try the decision' },
      vi: { navigationTitle: 'Thử tạo quyết định' },
    },
    order: 7,
    type: 'example',
  },
  {
    ...blockDefaults,
    id: 'read-result',
    locales: {
      en: {
        lede: 'The output follows a reproducible calculation: inputs, weighted score, activation, class.',
        navigationTitle: 'Read the calculation',
        title: 'Read the result from the calculation',
      },
      vi: {
        lede: 'Đầu ra theo một phép tính lặp lại được: đầu vào, tổng có trọng số, kích hoạt, lớp.',
        navigationTitle: 'Đọc phép tính',
        title: 'Đọc kết quả từ phép tính',
      },
    },
    order: 8,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'result-thresholds',
    locales: {
      en: {
        body:
          'Use the fixed AND rows and narrate the same chain each time: inputs, weighted score, ' +
          'step activation, output.',
        items: [
          {
            body: 'The weighted score is below the decision threshold.',
            label: 'z < 0',
            title: 'Output 0',
          },
          {
            body: 'The weighted score reaches or crosses the decision threshold.',
            label: 'z ≥ 0',
            title: 'Output 1',
          },
        ],
        title: 'Two outcomes, one rule',
      },
      vi: {
        body:
          'Dùng các hàng AND cố định và đọc cùng một chuỗi mỗi lần: đầu vào, tổng có trọng số, ' +
          'hàm bước, đầu ra.',
        items: [
          {
            body: 'Tổng có trọng số thấp hơn ngưỡng quyết định.',
            label: 'z < 0',
            title: 'Đầu ra 0',
          },
          {
            body: 'Tổng có trọng số chạm hoặc vượt ngưỡng quyết định.',
            label: 'z ≥ 0',
            title: 'Đầu ra 1',
          },
        ],
        title: 'Hai kết quả, một quy tắc',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'comparison',
  },
  {
    ...blockDefaults,
    id: 'further-reading',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'These pinned source references support the concise lesson summary; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Các tham chiếu nguồn đã pin này hỗ trợ phần diễn giải ngắn; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: dlM01SourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: dlM01SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: dlM01SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: dlM01SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Introduction to Neural Networks: Perceptron',
        url: 'https://github.com/microsoft/AI-For-Beginners/blob/main/lessons/3-NeuralNetworks/03-Perceptron/README.md',
      },
      {
        attribution: dlM01SourceTrace.sourceSnapshots[1].attribution,
        language: 'vi',
        license: dlM01SourceTrace.sourceSnapshots[1].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: dlM01SourceTrace.sourceSnapshots[1].sourceId,
        sourceName: dlM01SourceTrace.sourceSnapshots[1].sourceName,
        title: 'Multilayer Perceptrons',
        url: 'https://github.com/d2l-ai/d2l-vi/blob/main/chapter_multilayer-perceptrons/mlp.md',
      },
    ],
    sourceIds: dlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId),
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const fullLessonSourceListBlock = trialBlocks.find((block) => block.type === 'source-list');

if (!fullLessonSourceListBlock) {
  throw new Error('The full lesson requires a source-list block.');
}

const fullLessonBlocks = [
  ...trialBlocks.filter(
    (block) => block.id !== 'result-thresholds' && block.id !== 'further-reading',
  ),
  {
    ...blockDefaults,
    id: 'xor-linear-limit',
    locales: {
      en: {
        lede:
          'A single affine transformation makes a strong linear assumption. XOR exposes that ' +
          'assumption because its positive cases occupy opposite corners.',
        navigationTitle: 'Why XOR breaks the line',
        title: 'Where a single linear layer stops',
      },
      vi: {
        lede:
          'Một phép biến đổi affine duy nhất mang giả định tuyến tính mạnh. XOR bộc lộ giả định ' +
          'đó vì các trường hợp dương nằm ở hai góc đối diện.',
        navigationTitle: 'Vì sao XOR phá đường thẳng?',
        title: 'Nơi một lớp tuyến tính dừng lại',
      },
    },
    order: 9,
    sourceIds: DL_M01_MLP_SOURCE_IDS,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'xor-truth-table',
    locales: {
      en: {
        markdown:
          'Inspect the fixed XOR target before choosing weights:\n\n' +
          '| x1 | x2 | XOR |\n|---:|---:|---:|\n| 0 | 0 | 0 |\n| 0 | 1 | 1 |\n| 1 | 0 | 1 |\n| 1 | 1 | 0 |\n\n' +
          'The two positive cases are diagonal. Any one straight boundary that includes one of ' +
          'them leaves the other arrangement unresolved.',
      },
      vi: {
        markdown:
          'Hãy quan sát target XOR cố định trước khi chọn trọng số:\n\n' +
          '| x1 | x2 | XOR |\n|---:|---:|---:|\n| 0 | 0 | 0 |\n| 0 | 1 | 1 |\n| 1 | 0 | 1 |\n| 1 | 1 | 0 |\n\n' +
          'Hai trường hợp dương nằm chéo nhau. Một ranh giới thẳng bao được một trường hợp sẽ ' +
          'không giải quyết được cách sắp xếp còn lại.',
      },
    },
    order: 10,
    sourceIds: DL_M01_MLP_SOURCE_IDS,
    type: 'markdown',
  },
  {
    ...blockDefaults,
    id: 'and-linearly-separable',
    locales: {
      en: {
        body:
          'In the fixed AND example, only the 1,1 corner is positive. A single boundary can keep ' +
          'that corner on one side and the other three cases on the other side. XOR changes the ' +
          'arrangement, so a single linear rule is no longer enough. A hidden layer adds another ' +
          'transformation and activation before the final decision.',
        title: 'Why AND works but XOR does not',
      },
      vi: {
        body:
          'Trong ví dụ AND cố định, chỉ góc 1,1 là dương. Một ranh giới có thể giữ góc đó ở một ' +
          'phía và ba trường hợp còn lại ở phía kia. XOR đổi cách sắp xếp, nên một quy tắc tuyến ' +
          'tính duy nhất không còn đủ. Hidden layer thêm một phép biến đổi và hàm kích hoạt trước ' +
          'quyết định cuối.',
        title: 'Vì sao AND được nhưng XOR không',
      },
    },
    order: 11,
    sourceIds: DL_M01_MLP_SOURCE_IDS,
    type: 'callout',
    variant: 'insight',
  },
  { ...fullLessonSourceListBlock, order: 12 },
] satisfies readonly LearningContentBlock[];

const mlpFullLessonBlocks = [
  {
    ...mlpBlockDefaults,
    id: 'mlp-hidden-representation',
    locales: {
      en: {
        lede: 'An MLP passes input features through a hidden representation before the final layer makes its prediction.',
        navigationTitle: 'Add a hidden representation',
        title: 'A hidden layer changes what the output can read',
      },
      vi: {
        lede: 'MLP đưa feature đầu vào qua một biểu diễn ẩn trước khi lớp cuối cùng đưa ra dự đoán.',
        navigationTitle: 'Thêm biểu diễn ẩn',
        title: 'Hidden layer thay đổi điều đầu ra có thể đọc',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-forward-chain',
    locales: {
      en: {
        markdown:
          'The forward chain has two jobs: first form a hidden representation, then predict from it. ' +
          'In compact notation, $H = \\sigma(XW^{(1)} + b^{(1)})$ and $O = HW^{(2)} + b^{(2)}$.',
      },
      vi: {
        markdown:
          'Chuỗi truyền xuôi có hai việc: trước hết tạo biểu diễn ẩn, sau đó dự đoán từ biểu diễn ấy. ' +
          'Ký hiệu ngắn gọn là $H = \\sigma(XW^{(1)} + b^{(1)})$ và $O = HW^{(2)} + b^{(2)}$.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-affine-collapse',
    locales: {
      en: {
        body: 'Without an activation between them, two affine transformations still collapse to one affine transformation. The hidden layer only becomes a new modelling step when it adds nonlinearity.',
        title: 'Two linear-looking layers are not enough on their own',
      },
      vi: {
        body: 'Nếu không có kích hoạt ở giữa, hai phép biến đổi affine vẫn có thể gộp thành một phép affine. Hidden layer chỉ trở thành bước mô hình hóa mới khi nó thêm tính phi tuyến.',
        title: 'Hai lớp trông tuyến tính chưa đủ nếu đứng một mình',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-checkerboard-target',
    locales: {
      en: {
        lede: 'The fixed checkerboard puts the positive targets in opposite corners, so it is a useful small pattern for inspecting a nonlinear representation.',
        navigationTitle: 'Inspect the checkerboard',
        title: 'Opposite corners need a different representation',
      },
      vi: {
        lede: 'Bàn cờ cố định đặt các target dương ở hai góc đối diện, nên đây là mẫu nhỏ hữu ích để quan sát biểu diễn phi tuyến.',
        navigationTitle: 'Quan sát bàn cờ',
        title: 'Các góc đối diện cần một biểu diễn khác',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-checkerboard-table',
    locales: {
      en: {
        markdown:
          'Use the same four fixed inputs throughout the lesson and demo:\n\n' +
          '| x1 | x2 | target |\n|---:|---:|---:|\n| 0 | 0 | 0 |\n| 0 | 1 | 1 |\n| 1 | 0 | 1 |\n| 1 | 1 | 0 |\n\n' +
          'The table is an instructional checkerboard, not a claim that this page trained a model.',
      },
      vi: {
        markdown:
          'Dùng cùng bốn đầu vào cố định xuyên suốt bài và demo:\n\n' +
          '| x1 | x2 | target |\n|---:|---:|---:|\n| 0 | 0 | 0 |\n| 0 | 1 | 1 |\n| 1 | 0 | 1 |\n| 1 | 1 | 0 |\n\n' +
          'Bảng này là bàn cờ để học, không phải khẳng định trang đã huấn luyện một mô hình.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-activation-role',
    locales: {
      en: {
        lede: 'Activation is the operation that prevents the hidden transformation from collapsing back into one linear rule.',
        navigationTitle: 'Add nonlinearity',
        title: 'Activation makes the hidden layer matter',
      },
      vi: {
        lede: 'Kích hoạt là phép toán ngăn biến đổi ẩn gộp trở lại thành một quy tắc tuyến tính duy nhất.',
        navigationTitle: 'Thêm phi tuyến',
        title: 'Kích hoạt khiến hidden layer có ý nghĩa',
      },
    },
    order: 6,
    type: 'heading',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-relu-operation',
    locales: {
      en: {
        markdown:
          'A common hidden-layer activation is $\\operatorname{ReLU}(z) = \\max(z, 0)$. ' +
          'Positive hidden scores pass through; negative scores become $0$.',
      },
      vi: {
        markdown:
          'Một kích hoạt thường dùng ở hidden layer là $\\operatorname{ReLU}(z) = \\max(z, 0)$. ' +
          'Điểm hidden dương được giữ lại; điểm âm trở thành $0$.',
      },
    },
    order: 7,
    type: 'markdown',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-activation-cause-effect',
    locales: {
      en: {
        body: 'Cause: the activation changes each hidden score locally. Effect: the output layer receives a representation that cannot be reduced to the earlier single affine rule.',
        title: 'Change the representation before asking for the output',
      },
      vi: {
        body: 'Nguyên nhân: kích hoạt thay đổi từng điểm hidden cục bộ. Kết quả: lớp đầu ra nhận một biểu diễn không thể rút gọn về quy tắc affine đơn ban đầu.',
        title: 'Đổi biểu diễn trước khi yêu cầu đầu ra',
      },
    },
    order: 8,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...mlpBlockDefaults,
    activityId: 'act-dl-p02-mlp-forward-activation-example',
    id: 'mlp-checkerboard-example',
    locales: {
      en: {
        description:
          'Read the four checkerboard corners in order: form a hidden score, apply an activation, then let the fixed output label show the changed representation.',
        navigationTitle: 'Trace one checkerboard pass',
      },
      vi: {
        description:
          'Đọc bốn góc bàn cờ theo thứ tự: tạo điểm hidden, áp dụng kích hoạt, rồi dùng nhãn đầu ra cố định để thấy biểu diễn đã đổi.',
        navigationTitle: 'Lần theo một lượt bàn cờ',
      },
    },
    order: 9,
    type: 'example',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-output-predictor',
    locales: {
      en: {
        lede: 'The final layer is a predictor over the representation built by the earlier layer; it does not need to repeat the raw input rule.',
        navigationTitle: 'Read the final layer',
        title: 'The output predicts from hidden features',
      },
      vi: {
        lede: 'Lớp cuối là bộ dự đoán trên biểu diễn do lớp trước tạo ra; nó không cần lặp lại quy tắc trực tiếp trên đầu vào thô.',
        navigationTitle: 'Đọc lớp cuối',
        title: 'Đầu ra dự đoán từ feature ẩn',
      },
    },
    order: 10,
    type: 'heading',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-before-after-activation',
    locales: {
      en: {
        body: 'Use this comparison to explain the mechanism, not to infer a trained parameter set from four labels.',
        items: [
          {
            body: 'Stacked affine maps can still be expressed as one affine map.',
            label: 'Before activation',
            title: 'No new nonlinear representation',
          },
          {
            body: 'The hidden activation changes the representation before the output prediction.',
            label: 'After activation',
            title: 'A nonlinear modelling step',
          },
        ],
        title: 'What the activation changes',
      },
      vi: {
        body: 'Dùng so sánh này để giải thích cơ chế, không suy ra một bộ tham số đã huấn luyện từ bốn nhãn.',
        items: [
          {
            body: 'Các ánh xạ affine xếp chồng vẫn có thể biểu diễn thành một ánh xạ affine.',
            label: 'Trước kích hoạt',
            title: 'Chưa có biểu diễn phi tuyến mới',
          },
          {
            body: 'Kích hoạt hidden đổi biểu diễn trước dự đoán đầu ra.',
            label: 'Sau kích hoạt',
            title: 'Một bước mô hình hóa phi tuyến',
          },
        ],
        title: 'Kích hoạt thay đổi điều gì',
      },
    },
    order: 11,
    type: 'callout',
    variant: 'comparison',
  },
  {
    ...mlpBlockDefaults,
    id: 'mlp-sources',
    locales: {
      en: {
        heading: 'Source used for this lesson',
        intro:
          'This concise original lesson is adapted from the pinned local snapshot below; source review is still pending.',
        navigationTitle: 'Lesson source',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 12,
    required: false,
    resources: [
      {
        attribution: dlM02SourceTrace.sourceSnapshots[0].attribution,
        language: 'vi',
        license: dlM02SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: dlM02SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: dlM02SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Multilayer Perceptrons',
        url: 'https://github.com/d2l-ai/d2l-vi/blob/main/chapter_multilayer-perceptrons/mlp.md',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const trainingFullLessonBlocks = [
  {
    ...trainingBlockDefaults,
    id: 'training-forward-and-backward',
    locales: {
      en: {
        lede: 'Training has two linked directions: forward propagation computes an objective, then backpropagation carries gradient information back to the parameters.',
        navigationTitle: 'See the two directions',
        title: 'Forward computes; backward assigns credit',
      },
      vi: {
        lede: 'Huấn luyện có hai chiều liên kết: truyền xuôi tính mục tiêu, rồi lan truyền ngược đưa thông tin gradient trở lại các tham số.',
        navigationTitle: 'Quan sát hai chiều',
        title: 'Truyền xuôi tính; truyền ngược phân bổ trách nhiệm',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-forward-values',
    locales: {
      en: {
        markdown:
          'Forward propagation follows the dependency order: inputs produce hidden values, hidden values produce outputs, and outputs contribute to an objective $J$. The intermediate values are needed later when gradients are computed.',
      },
      vi: {
        markdown:
          'Truyền xuôi theo thứ tự phụ thuộc: đầu vào tạo giá trị hidden, hidden tạo đầu ra, và đầu ra góp vào mục tiêu $J$. Các giá trị trung gian cần thiết ở bước sau khi tính gradient.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-backward-credit',
    locales: {
      en: {
        body: 'Backpropagation starts with the objective at the output and walks through the same computational graph in reverse dependency order. The chain rule links each local derivative to the gradient of an earlier parameter.',
        title: 'The graph is read in reverse for gradients',
      },
      vi: {
        body: 'Lan truyền ngược bắt đầu từ mục tiêu ở đầu ra và đi qua cùng đồ thị tính toán theo thứ tự phụ thuộc đảo ngược. Quy tắc chuỗi nối từng đạo hàm cục bộ với gradient của tham số ở sớm hơn.',
        title: 'Đồ thị được đọc ngược khi tính gradient',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-chain-rule',
    locales: {
      en: {
        lede: 'A gradient is not a separate answer for every layer; it is propagated along the dependencies that produced the objective.',
        navigationTitle: 'Follow the chain rule',
        title: 'Local changes combine along the graph',
      },
      vi: {
        lede: 'Gradient không phải câu trả lời riêng rẽ cho từng layer; nó truyền dọc các phụ thuộc đã tạo ra mục tiêu.',
        navigationTitle: 'Theo quy tắc chuỗi',
        title: 'Các thay đổi cục bộ kết hợp dọc đồ thị',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-gradient-equation',
    locales: {
      en: {
        markdown:
          'For a composed path $X \\rightarrow Y \\rightarrow Z$, the chain rule combines the downstream and local changes: $\\frac{\\partial Z}{\\partial X}$ depends on $\\frac{\\partial Z}{\\partial Y}$ and $\\frac{\\partial Y}{\\partial X}$. The direction is what matters here: begin at the objective, then move toward earlier inputs and weights.',
      },
      vi: {
        markdown:
          'Với đường ghép $X \\rightarrow Y \\rightarrow Z$, quy tắc chuỗi kết hợp thay đổi hạ nguồn và cục bộ: $\\frac{\\partial Z}{\\partial X}$ phụ thuộc vào $\\frac{\\partial Z}{\\partial Y}$ và $\\frac{\\partial Y}{\\partial X}$. Điều quan trọng ở đây là chiều đi: bắt đầu từ mục tiêu rồi lùi về đầu vào và trọng số sớm hơn.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...trainingBlockDefaults,
    activityId: 'act-dl-p03-backprop-overfitting-example',
    id: 'training-curve-reading-example',
    locales: {
      en: {
        description:
          'Read the fixed curve checkpoints as evidence, not as a live run: when training loss keeps falling while validation loss rises, inspect generalisation before fitting longer.',
        navigationTitle: 'Read a curve gap',
      },
      vi: {
        description:
          'Đọc các mốc đường cong cố định như bằng chứng, không phải lượt chạy live: khi loss train tiếp tục giảm còn loss validation tăng, hãy kiểm tra khả năng tổng quát trước khi khớp lâu hơn.',
        navigationTitle: 'Đọc khoảng cách đường cong',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-generalisation-evidence',
    locales: {
      en: {
        lede: 'The objective on training examples describes fit to what was seen. Generalisation needs a separate check on examples not used to choose the parameters.',
        navigationTitle: 'Compare two losses',
        title: 'Training loss is not generalisation evidence by itself',
      },
      vi: {
        lede: 'Mục tiêu trên ví dụ train mô tả độ khớp với điều đã thấy. Khả năng tổng quát cần kiểm tra riêng trên ví dụ không dùng để chọn tham số.',
        navigationTitle: 'So sánh hai loss',
        title: 'Chỉ loss train chưa phải bằng chứng tổng quát',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-fixed-curve-table',
    locales: {
      en: {
        markdown:
          'Use this fixed instructional reading, not a reported experiment:\n\n' +
          '| checkpoint | train loss | validation loss | reading |\n|---|---:|---:|---|\n| early | 0.82 | 0.86 | both remain high |\n| middle | 0.45 | 0.49 | both improve together |\n| later | 0.21 | 0.68 | the gap needs investigation |\n\n' +
          'The later row does not prove a diagnosis on its own; it signals that the validation evidence must be read alongside the training fit.',
      },
      vi: {
        markdown:
          'Dùng cách đọc cố định để học này, không phải một thí nghiệm được báo cáo:\n\n' +
          '| mốc | loss train | loss validation | cách đọc |\n|---|---:|---:|---|\n| sớm | 0,82 | 0,86 | cả hai còn cao |\n| giữa | 0,45 | 0,49 | cả hai cùng cải thiện |\n| muộn | 0,21 | 0,68 | khoảng cách cần được kiểm tra |\n\n' +
          'Hàng muộn không tự chứng minh một chẩn đoán; nó báo hiệu phải đọc bằng chứng validation cùng với độ khớp train.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-underfit-overfit',
    locales: {
      en: {
        body: 'Both outcomes require evidence from more than a flattering training score.',
        items: [
          {
            body: 'Training error remains high because the model cannot capture the relevant structure.',
            label: 'Underfitting',
            title: 'The model is too limited for the pattern',
          },
          {
            body: 'Training loss becomes much lower than validation loss as a complex model follows training noise.',
            label: 'Overfitting',
            title: 'The training fit does not transfer',
          },
        ],
        title: 'Read capacity through both losses',
      },
      vi: {
        body: 'Cả hai kết quả cần bằng chứng nhiều hơn một điểm train đẹp.',
        items: [
          {
            body: 'Lỗi train vẫn cao vì mô hình không nắm được cấu trúc liên quan.',
            label: 'Underfitting',
            title: 'Mô hình quá hạn chế với mẫu',
          },
          {
            body: 'Loss train thấp hơn nhiều so với loss validation khi mô hình phức tạp bám theo nhiễu train.',
            label: 'Overfitting',
            title: 'Độ khớp train không chuyển sang dữ liệu khác',
          },
        ],
        title: 'Đọc năng lực qua cả hai loss',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'comparison',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-validation-choice',
    locales: {
      en: {
        lede: 'A validation set can guide model selection, but it is evidence to use carefully rather than a score to optimise repeatedly.',
        navigationTitle: 'Use validation carefully',
        title: 'Choose the model with a held-out check',
      },
      vi: {
        lede: 'Tập validation có thể hướng dẫn chọn mô hình, nhưng đó là bằng chứng cần dùng cẩn trọng chứ không phải điểm để tối ưu lặp đi lặp lại.',
        navigationTitle: 'Dùng validation cẩn trọng',
        title: 'Chọn mô hình bằng kiểm tra giữ lại',
      },
    },
    order: 10,
    type: 'heading',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-cautious-next-step',
    locales: {
      en: {
        body: 'Cause: a lower training objective may reflect better fit to the training examples or a model that learned their noise. Effect: compare held-out evidence before claiming the later checkpoint is the better model.',
        title: 'A lower train loss is a question, not a verdict',
      },
      vi: {
        body: 'Nguyên nhân: mục tiêu train thấp hơn có thể là khớp tốt hơn với ví dụ train hoặc mô hình đã học nhiễu của chúng. Kết quả: so sánh bằng chứng giữ lại trước khi khẳng định mốc muộn hơn là mô hình tốt hơn.',
        title: 'Loss train thấp hơn là câu hỏi, không phải phán quyết',
      },
    },
    order: 11,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...trainingBlockDefaults,
    id: 'training-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from pinned local snapshots of the two documents below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của hai tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 12,
    required: false,
    resources: [
      {
        attribution: dlM03SourceTrace.sourceSnapshots[0].attribution,
        language: 'vi',
        license: dlM03SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: dlM03SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: dlM03SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Backpropagation',
        url: 'https://github.com/d2l-ai/d2l-vi/blob/main/chapter_multilayer-perceptrons/backprop.md',
      },
      {
        attribution: dlM03SourceTrace.sourceSnapshots[0].attribution,
        language: 'vi',
        license: dlM03SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: dlM03SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: dlM03SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Underfitting and Overfitting',
        url: 'https://github.com/d2l-ai/d2l-vi/blob/main/chapter_multilayer-perceptrons/underfit-overfit.md',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM01ProblemFullLessonBlocks = [
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-decision-first',
    locales: {
      en: {
        lede: 'A useful learning problem begins with a decision someone must make, then names the unknown outcome that would make that decision less uncertain.',
        navigationTitle: 'Start from the decision',
        title: 'Name the decision before naming the model',
      },
      vi: {
        lede: 'Một bài toán học hữu ích bắt đầu bằng quyết định cần đưa ra, rồi gọi tên kết quả chưa biết sẽ làm quyết định đó bớt bất định.',
        navigationTitle: 'Bắt đầu từ quyết định',
        title: 'Gọi tên quyết định trước khi gọi tên mô hình',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-target-and-evidence',
    locales: {
      en: {
        markdown:
          'For a prediction task, separate the **target** from the **evidence**. If a library wants to estimate tomorrow’s queue length, the historical queue length is the target in past rows; weekday, hour, and active reservations are features. A model maps the feature values to an estimated target.',
      },
      vi: {
        markdown:
          'Với bài toán dự đoán, hãy tách **mục tiêu** khỏi **bằng chứng**. Nếu thư viện muốn ước lượng độ dài hàng đợi ngày mai, độ dài hàng đợi lịch sử là mục tiêu ở các dòng quá khứ; thứ, giờ và số lượt đặt chỗ đang hoạt động là feature. Mô hình ánh xạ giá trị feature thành mục tiêu ước lượng.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-feature-label-distinction',
    locales: {
      en: {
        body: 'Cause: the historical outcome is available when the row is created. Effect: it can become a label for supervised learning, while the other observed columns remain inputs used to estimate that label.',
        title: 'A label is the known past answer; a feature is evidence',
      },
      vi: {
        body: 'Nguyên nhân: kết quả lịch sử đã có khi dòng dữ liệu được tạo. Kết quả: nó có thể thành nhãn cho học có giám sát, còn các cột quan sát khác là đầu vào để ước lượng nhãn đó.',
        title: 'Nhãn là đáp án quá khứ đã biết; feature là bằng chứng',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-output-shape',
    locales: {
      en: {
        body: 'An output measured on a numeric scale suggests a regression question, such as an estimated wait time. An output selected from named classes suggests classification, such as routing a request to billing, access, or technical support.',
        items: [
          {
            body: 'The output can vary continuously, so preserve its measurement meaning.',
            label: 'Number',
            title: 'Estimate a quantity',
          },
          {
            body: 'The output is one of a defined set of groups, so preserve its class meaning.',
            label: 'Category',
            title: 'Choose a class',
          },
        ],
        title: 'The output type changes the learning question',
      },
      vi: {
        body: 'Đầu ra đo trên thang số gợi ý câu hỏi hồi quy, như thời gian chờ ước lượng. Đầu ra chọn từ các lớp có tên gợi ý phân loại, như chuyển yêu cầu đến thanh toán, truy cập hoặc hỗ trợ kỹ thuật.',
        items: [
          {
            body: 'Đầu ra biến thiên liên tục nên phải giữ ý nghĩa đo lường của nó.',
            label: 'Số',
            title: 'Ước lượng đại lượng',
          },
          {
            body: 'Đầu ra là một trong tập nhóm đã xác định nên phải giữ ý nghĩa lớp của nó.',
            label: 'Danh mục',
            title: 'Chọn một lớp',
          },
        ],
        title: 'Kiểu đầu ra làm thay đổi câu hỏi học',
      },
    },
    order: 4,
    type: 'callout',
    variant: 'comparison',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    activityId: 'act-cml-p01-problem-data-types-example',
    id: 'problem-framing-example',
    locales: {
      en: {
        description:
          'Sort three fixed prompts before choosing an algorithm: estimate a delivery delay in minutes; assign a support ticket to one of three teams; group anonymous usage records that have no supplied outcome. State the target or grouping goal and why it changes the task type.',
        navigationTitle: 'Frame three tasks',
      },
      vi: {
        description:
          'Phân loại ba đề bài cố định trước khi chọn thuật toán: ước lượng trễ giao hàng theo phút; gán phiếu hỗ trợ cho một trong ba đội; gom các bản ghi sử dụng ẩn danh không có kết quả được cung cấp. Nêu mục tiêu hoặc mục tiêu gom nhóm và vì sao nó đổi kiểu bài toán.',
        navigationTitle: 'Đặt khung ba nhiệm vụ',
      },
    },
    order: 5,
    type: 'example',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-supervision-evidence',
    locales: {
      en: {
        lede: 'The key distinction is not the algorithm name. It is whether each training row is paired with an intended answer before the grouping or prediction is made.',
        navigationTitle: 'Check whether answers exist',
        title: 'Known outcomes create supervision',
      },
      vi: {
        lede: 'Khác biệt then chốt không phải tên thuật toán. Đó là việc mỗi dòng train có được ghép với đáp án mong muốn trước khi dự đoán hoặc gom nhóm hay không.',
        navigationTitle: 'Kiểm tra đáp án có tồn tại',
        title: 'Kết quả đã biết tạo ra giám sát',
      },
    },
    order: 6,
    type: 'heading',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-supervised-unsupervised',
    locales: {
      en: {
        body: 'Classification examples pair inputs with a known class. Clustering instead begins with unlabeled inputs and looks for useful groupings in their observed patterns.',
        items: [
          {
            body: 'A cuisine class attached to an ingredient row lets the learner check a predicted class against an intended answer.',
            label: 'Supervised',
            title: 'Predict a supplied outcome',
          },
          {
            body: 'A set of listener behaviours without assigned groups can be explored by placing similar records together.',
            label: 'Unsupervised',
            title: 'Discover a grouping',
          },
        ],
        title: 'Labels support prediction; unlabeled patterns support grouping',
      },
      vi: {
        body: 'Ví dụ phân loại ghép đầu vào với lớp đã biết. Clustering thay vào đó bắt đầu bằng đầu vào không nhãn và tìm các nhóm hữu ích trong mẫu quan sát được.',
        items: [
          {
            body: 'Một lớp ẩm thực gắn với dòng nguyên liệu cho phép kiểm tra lớp dự đoán với đáp án mong muốn.',
            label: 'Có giám sát',
            title: 'Dự đoán kết quả được cung cấp',
          },
          {
            body: 'Một tập hành vi nghe không được gán nhóm có thể được khám phá bằng cách đặt các bản ghi giống nhau gần nhau.',
            label: 'Không giám sát',
            title: 'Khám phá một cách gom nhóm',
          },
        ],
        title: 'Nhãn hỗ trợ dự đoán; mẫu không nhãn hỗ trợ gom nhóm',
      },
    },
    order: 7,
    type: 'callout',
    variant: 'comparison',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-data-contract',
    locales: {
      en: {
        markdown:
          'Write a small data contract before modeling:\n\n| question | check |\n|---|---|\n| What decision changes? | Name the action, not only a score. |\n| What is the target? | Identify the historical outcome or state that no target is supplied. |\n| What are the features? | Keep only information available when the decision is made. |\n| What does the output mean? | Preserve a quantity for regression or a class for classification. |\n\nThis makes a later performance claim traceable to the original decision.',
      },
      vi: {
        markdown:
          'Hãy viết hợp đồng dữ liệu nhỏ trước khi lập mô hình:\n\n| câu hỏi | kiểm tra |\n|---|---|\n| Quyết định nào thay đổi? | Gọi tên hành động, không chỉ điểm số. |\n| Mục tiêu là gì? | Xác định kết quả lịch sử hoặc nói rõ không có mục tiêu được cung cấp. |\n| Feature là gì? | Chỉ giữ thông tin có sẵn tại thời điểm quyết định. |\n| Đầu ra có nghĩa gì? | Giữ đại lượng cho hồi quy hoặc lớp cho phân loại. |\n\nViệc này giúp kết luận hiệu năng sau này truy về quyết định ban đầu.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-leakage-boundary',
    locales: {
      en: {
        body: 'If a feature is learned only after the decision, it cannot honestly support that decision. Record the time boundary now, otherwise an apparently strong model may merely be reading the answer indirectly.',
        title: 'Use only evidence available at decision time',
      },
      vi: {
        body: 'Nếu một feature chỉ được biết sau quyết định, nó không thể hỗ trợ quyết định đó một cách trung thực. Hãy ghi ranh giới thời gian ngay bây giờ; nếu không mô hình có vẻ mạnh có thể chỉ đang đọc đáp án gián tiếp.',
        title: 'Chỉ dùng bằng chứng có sẵn lúc ra quyết định',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM01ProblemBlockDefaults,
    id: 'problem-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from pinned local snapshots of the documents below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của các tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM01SourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM01SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM01SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM01SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Introduction to classification',
        url: 'https://github.com/microsoft/ML-For-Beginners/blob/main/4-Classification/1-Introduction/README.md',
      },
      {
        attribution: cmlM01SourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM01SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM01SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM01SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Introduction to clustering',
        url: 'https://github.com/microsoft/ML-For-Beginners/blob/main/5-Clustering/1-Visualize/README.md',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM01EvaluationFullLessonBlocks = [
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-claim-first',
    locales: {
      en: {
        lede: 'A model score is a claim about future decisions. The claim needs examples that were not used to set the model’s parameters.',
        navigationTitle: 'Treat a score as a claim',
        title: 'Separate fitting from evidence',
      },
      vi: {
        lede: 'Điểm mô hình là một khẳng định về quyết định tương lai. Khẳng định đó cần các ví dụ không được dùng để đặt tham số mô hình.',
        navigationTitle: 'Xem điểm là một khẳng định',
        title: 'Tách việc khớp khỏi bằng chứng',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-split-before-fit',
    locales: {
      en: {
        markdown:
          'After choosing the feature table and label column, divide the rows before fitting. Training rows let the model learn a relationship. Held-out test rows remain untouched until evaluation, so their results answer a different question: how did the fitted model behave on new examples?',
      },
      vi: {
        markdown:
          'Sau khi chọn bảng feature và cột nhãn, hãy chia các dòng trước khi khớp. Các dòng train cho mô hình học quan hệ. Các dòng test giữ lại không bị đụng đến cho tới lúc đánh giá, nên kết quả của chúng trả lời câu hỏi khác: mô hình đã khớp hành xử thế nào với ví dụ mới?',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-held-out-purpose',
    locales: {
      en: {
        body: 'Cause: the model never used the held-out labels while fitting. Effect: comparing predictions with those labels tests the generalisation claim instead of only repeating the training fit.',
        title: 'A held-out row is evidence, not extra practice',
      },
      vi: {
        body: 'Nguyên nhân: mô hình chưa dùng nhãn giữ lại khi khớp. Kết quả: so sánh dự đoán với các nhãn đó kiểm tra khẳng định tổng quát hóa thay vì chỉ lặp lại độ khớp train.',
        title: 'Dòng giữ lại là bằng chứng, không phải bài luyện thêm',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-metric-question',
    locales: {
      en: {
        lede: 'The metric is part of the decision design. It tells the team which kinds of correct and incorrect outcomes will be made visible.',
        navigationTitle: 'Choose the question for the metric',
        title: 'A metric measures the error that matters',
      },
      vi: {
        lede: 'Metric là một phần của thiết kế quyết định. Nó cho nhóm biết loại kết quả đúng và sai nào sẽ được nhìn thấy.',
        navigationTitle: 'Chọn câu hỏi cho metric',
        title: 'Metric đo loại lỗi quan trọng',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-fixed-counts',
    locales: {
      en: {
        markdown:
          'Read this fixed instructional count, not a reported experiment:\n\n| outcome | count |\n|---|---:|\n| true positive | 8 |\n| false positive | 2 |\n| false negative | 1 |\n| true negative | 9 |\n\nThe accuracy is $17/20 = 85$%. If missing a positive case is costly, also inspect recall: $8/(8+1)$. Accuracy describes total correct decisions; it does not say which error was tolerated.',
      },
      vi: {
        markdown:
          'Đọc bảng đếm cố định để học này, không phải thí nghiệm được báo cáo:\n\n| kết quả | số lượng |\n|---|---:|\n| dương tính đúng | 8 |\n| dương tính giả | 2 |\n| âm tính giả | 1 |\n| âm tính đúng | 9 |\n\nAccuracy là $17/20 = 85$%. Nếu bỏ sót ca dương tính gây tốn kém, hãy xem thêm recall: $8/(8+1)$. Accuracy mô tả tổng số quyết định đúng; nó không nói loại lỗi nào đã được dung thứ.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    activityId: 'act-cml-p02-train-test-metrics-example',
    id: 'evaluation-metric-choice-example',
    locales: {
      en: {
        description:
          'For the fixed count table, choose what the team must inspect first in two settings: a low-cost newsletter filter and a safety alert where a missed positive case is costly. Explain how the consequence changes the metric discussion without changing the raw counts.',
        navigationTitle: 'Choose a metric consequence',
      },
      vi: {
        description:
          'Với bảng đếm cố định, hãy chọn điều nhóm phải xem trước trong hai bối cảnh: bộ lọc bản tin chi phí thấp và cảnh báo an toàn nơi bỏ sót ca dương tính gây tốn kém. Giải thích hậu quả làm thay đổi cuộc thảo luận metric thế nào mà không đổi số đếm thô.',
        navigationTitle: 'Chọn hậu quả cho metric',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-error-cost-comparison',
    locales: {
      en: {
        body: 'The same accuracy can hide different operational risks. Make the false-positive and false-negative consequences explicit before declaring one model preferable.',
        items: [
          {
            body: 'An unnecessary review may cost staff time but preserve safety.',
            label: 'False positive',
            title: 'The system acts when it should not',
          },
          {
            body: 'A missed case may leave a needed action undone.',
            label: 'False negative',
            title: 'The system stays silent when it should act',
          },
        ],
        title: 'Count error types separately',
      },
      vi: {
        body: 'Cùng một accuracy có thể che các rủi ro vận hành khác nhau. Hãy làm rõ hậu quả dương tính giả và âm tính giả trước khi tuyên bố một mô hình tốt hơn.',
        items: [
          {
            body: 'Một lượt xem xét không cần thiết có thể tốn thời gian nhân sự nhưng giữ được an toàn.',
            label: 'Dương tính giả',
            title: 'Hệ thống hành động khi không nên',
          },
          {
            body: 'Một ca bị bỏ sót có thể khiến hành động cần thiết không diễn ra.',
            label: 'Âm tính giả',
            title: 'Hệ thống im lặng khi cần hành động',
          },
        ],
        title: 'Đếm riêng từng loại lỗi',
      },
    },
    order: 7,
    type: 'callout',
    variant: 'comparison',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-training-score-boundary',
    locales: {
      en: {
        markdown:
          'A high training score can mean the model captured a useful relationship, memorised incidental detail, or both. It cannot by itself answer the held-out question because the model already saw those rows while being fitted.',
      },
      vi: {
        markdown:
          'Điểm train cao có thể nghĩa là mô hình nắm được quan hệ hữu ích, ghi nhớ chi tiết tình cờ, hoặc cả hai. Bản thân nó không thể trả lời câu hỏi giữ lại vì mô hình đã thấy các dòng đó khi được khớp.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-claim-checklist',
    locales: {
      en: {
        body: 'Before reporting a result, record the split, which data remained untouched, the metric, and the error consequence the metric is meant to expose. Each item connects the number back to a real decision.',
        title: 'Make the result reproducible enough to challenge',
      },
      vi: {
        body: 'Trước khi báo cáo kết quả, hãy ghi phần chia, dữ liệu nào được giữ nguyên, metric và hậu quả lỗi mà metric phải phơi bày. Mỗi mục nối con số trở lại một quyết định thật.',
        title: 'Làm kết quả đủ tái lập để bị chất vấn',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM01EvaluationBlockDefaults,
    id: 'evaluation-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM01SourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM01SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM01SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM01SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Cuisine classifiers 1',
        url: 'https://github.com/microsoft/ML-For-Beginners/blob/main/4-Classification/2-Classifiers-1/README.md',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM02LinearFullLessonBlocks = [
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-numerical-target',
    locales: {
      en: {
        lede: 'Linear regression starts with a numerical target and asks whether a straight relationship is a useful first approximation for a new case.',
        navigationTitle: 'Start with a number',
        title: 'Use a line as an inspectable numerical baseline',
      },
      vi: {
        lede: 'Hồi quy tuyến tính bắt đầu với một mục tiêu số và hỏi liệu quan hệ đường thẳng có là xấp xỉ đầu tiên hữu ích cho trường hợp mới hay không.',
        navigationTitle: 'Bắt đầu với một con số',
        title: 'Dùng đường thẳng làm baseline số có thể quan sát',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-line-meaning',
    locales: {
      en: {
        markdown:
          'A simple line has the form $y_{pred} = a + bx$. The intercept $a$ is the baseline estimate when the input is zero; the slope $b$ describes how the estimate changes as the input changes. This is a model claim, not a guarantee that every observed point lies on the line.',
      },
      vi: {
        markdown:
          'Một đường đơn giản có dạng $y_{pred} = a + bx$. Hệ số chặn $a$ là ước lượng nền khi đầu vào bằng không; độ dốc $b$ mô tả ước lượng đổi thế nào khi đầu vào đổi. Đây là một khẳng định của mô hình, không phải bảo đảm mọi điểm quan sát nằm trên đường.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-residual-meaning',
    locales: {
      en: {
        body: 'A residual is the vertical gap between the observed target and the line’s prediction for the same input. Its sign shows direction; its size shows how far that one prediction missed.',
        title: 'Every point can challenge the line',
      },
      vi: {
        body: 'Phần dư là khoảng cách theo phương đứng giữa mục tiêu quan sát và dự đoán của đường tại cùng đầu vào. Dấu của nó cho biết hướng; độ lớn cho biết dự đoán đó sai bao xa.',
        title: 'Mỗi điểm đều có thể thách thức đường',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-least-squares-question',
    locales: {
      en: {
        lede: 'A fitted line needs a rule for trading many misses against one another. Least squares uses the total of squared residuals for that rule.',
        navigationTitle: 'Read the fitting rule',
        title: 'Squaring makes large misses visible',
      },
      vi: {
        lede: 'Một đường được khớp cần quy tắc để đánh đổi các lần bỏ lỡ với nhau. Least squares dùng tổng phần dư bình phương cho quy tắc đó.',
        navigationTitle: 'Đọc quy tắc khớp',
        title: 'Bình phương làm các sai lệch lớn trở nên rõ ràng',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-squared-error-reading',
    locales: {
      en: {
        markdown:
          'For each row, first compare $y_{actual}$ with $y_{pred}$, then square the gap. Squaring prevents a negative residual from cancelling a positive residual and gives a larger miss more influence than a small miss. The chosen line is the one that reduces the total squared error for the training rows.',
      },
      vi: {
        markdown:
          'Với mỗi dòng, trước hết so sánh $y_{actual}$ với $y_{pred}$, rồi bình phương khoảng cách. Bình phương ngăn phần dư âm triệt tiêu phần dư dương và khiến sai lệch lớn có ảnh hưởng nhiều hơn sai lệch nhỏ. Đường được chọn là đường giảm tổng lỗi bình phương trên các dòng train.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM02LinearBlockDefaults,
    activityId: 'act-cml-p03-linear-regression-example',
    id: 'linear-fixed-residual-example',
    locales: {
      en: {
        description:
          'Read the fixed calibration rule $y_{pred} = 2x + 1$. At $x=3$, the line predicts 7 while the observed target is 8, so the residual is +1. Explain why this is evidence about one row rather than proof that the line should be discarded.',
        navigationTitle: 'Read one residual',
      },
      vi: {
        description:
          'Đọc quy tắc hiệu chuẩn cố định $y_{pred} = 2x + 1$. Tại $x=3$, đường dự đoán 7 còn mục tiêu quan sát là 8, nên phần dư là +1. Giải thích vì sao đây là bằng chứng về một dòng chứ chưa phải bằng chứng phải loại đường thẳng.',
        navigationTitle: 'Đọc một phần dư',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-held-out-check',
    locales: {
      en: {
        lede: 'Fitting finds coefficients from training data. Evaluation asks a separate question by predicting targets in a held-out test split.',
        navigationTitle: 'Separate fit from evaluation',
        title: 'Measure a new claim on held-out rows',
      },
      vi: {
        lede: 'Khớp tìm hệ số từ dữ liệu train. Đánh giá đặt câu hỏi riêng bằng cách dự đoán mục tiêu trong phần test giữ lại.',
        navigationTitle: 'Tách khớp khỏi đánh giá',
        title: 'Đo một khẳng định mới trên dòng giữ lại',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-rmse-meaning',
    locales: {
      en: {
        markdown:
          'On held-out rows, root mean squared error (RMSE) turns the squared prediction gaps back into the target’s unit. Compare it with the scale of the target and inspect the residual pattern; one summary number cannot explain every mismatch.',
      },
      vi: {
        markdown:
          'Trên các dòng giữ lại, root mean squared error (RMSE) đưa các khoảng cách dự đoán bình phương trở về đơn vị của mục tiêu. Hãy so sánh nó với thang của mục tiêu và quan sát mẫu phần dư; một con số tóm tắt không thể giải thích mọi sai lệch.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-baseline-decision',
    locales: {
      en: {
        body: 'A straight line is valuable because it makes its assumption visible. If residuals show repeated structure or held-out error is not adequate for the decision, investigate a different representation rather than treating the first line as final.',
        title: 'A baseline is a question to test',
      },
      vi: {
        body: 'Đường thẳng có giá trị vì nó làm giả định của mình hiển thị. Nếu phần dư cho cấu trúc lặp lại hoặc lỗi giữ lại chưa đủ cho quyết định, hãy khảo sát biểu diễn khác thay vì xem đường đầu tiên là cuối cùng.',
        title: 'Baseline là câu hỏi cần kiểm tra',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM02LinearBlockDefaults,
    id: 'linear-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM02SourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM02SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM02SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM02SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Build a regression model using Scikit-learn: regression four ways',
        url: 'https://github.com/microsoft/ML-For-Beginners/blob/main/2-Regression/3-Linear/README.md',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM02PolynomialFullLessonBlocks = [
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-curvature-question',
    locales: {
      en: {
        lede: 'A line is not the only possible relationship. When the evidence suggests smooth curvature, polynomial features create a more flexible hypothesis to test.',
        navigationTitle: 'Ask whether curvature matters',
        title: 'Add curvature only when the relationship calls for it',
      },
      vi: {
        lede: 'Đường thẳng không phải quan hệ duy nhất có thể có. Khi bằng chứng gợi ý độ cong mượt, feature đa thức tạo giả thuyết linh hoạt hơn để kiểm tra.',
        navigationTitle: 'Hỏi độ cong có quan trọng không',
        title: 'Chỉ thêm độ cong khi quan hệ cần đến nó',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-second-degree',
    locales: {
      en: {
        markdown:
          'With one input, a degree-two polynomial adds an $x^2$ feature alongside $x$. The resulting model can bend into a parabola, which gives it a way to represent a curved trend that a straight line cannot express.',
      },
      vi: {
        markdown:
          'Với một đầu vào, đa thức bậc hai thêm feature $x^2$ bên cạnh $x$. Mô hình kết quả có thể uốn thành parabol, cho nó cách biểu diễn xu hướng cong mà đường thẳng không thể diễn đạt.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-representation-tradeoff',
    locales: {
      en: {
        body: 'Cause: extra polynomial features give the model more shapes it can fit. Effect: they can capture meaningful curvature, but they can also follow accidental variation unless the held-out comparison supports the added complexity.',
        title: 'Flexibility changes both fit and risk',
      },
      vi: {
        body: 'Nguyên nhân: feature đa thức thêm cho mô hình nhiều hình dạng hơn để khớp. Kết quả: chúng có thể nắm độ cong có nghĩa, nhưng cũng có thể bám biến động tình cờ nếu so sánh giữ lại không ủng hộ độ phức tạp thêm.',
        title: 'Tính linh hoạt làm đổi cả độ khớp lẫn rủi ro',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-pipeline-order',
    locales: {
      en: {
        lede: 'Keep feature transformation and regression in a visible order so the same steps are applied when fitting and predicting.',
        navigationTitle: 'Keep the transformation explicit',
        title: 'A pipeline records the two-stage model',
      },
      vi: {
        lede: 'Giữ biến đổi feature và hồi quy theo thứ tự hiển thị để cùng các bước được áp dụng khi khớp và dự đoán.',
        navigationTitle: 'Giữ biến đổi rõ ràng',
        title: 'Pipeline ghi lại mô hình hai giai đoạn',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-pipeline-reading',
    locales: {
      en: {
        markdown:
          'Read a degree-two pipeline in order: first create polynomial features from each input row, then fit a linear regression on that expanded representation, then apply those same transformations before predicting a held-out row. The output may curve in the original input space even though the last fitting step is linear in its features.',
      },
      vi: {
        markdown:
          'Đọc pipeline bậc hai theo thứ tự: đầu tiên tạo feature đa thức từ mỗi dòng đầu vào, rồi khớp hồi quy tuyến tính trên biểu diễn đã mở rộng, sau đó áp dụng đúng biến đổi đó trước khi dự đoán dòng giữ lại. Đầu ra có thể cong trong không gian đầu vào gốc dù bước khớp cuối vẫn tuyến tính theo feature của nó.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    activityId: 'act-cml-p04-polynomial-regression-example',
    id: 'polynomial-fixed-comparison-example',
    locales: {
      en: {
        description:
          'Compare two fixed candidate descriptions for the same held-out rows: a straight line misses a U-shaped pattern in both tails; a degree-two curve reduces those repeated tail misses. State the evidence you would still require before choosing the curve: the same split, an error comparison, and a check that the gain matters for the decision.',
        navigationTitle: 'Compare two candidates',
      },
      vi: {
        description:
          'So sánh hai mô tả ứng viên cố định trên cùng dòng giữ lại: đường thẳng bỏ lỡ mẫu chữ U ở cả hai đuôi; đường cong bậc hai giảm các lần bỏ lỡ đuôi lặp lại đó. Nêu bằng chứng vẫn cần trước khi chọn đường cong: cùng phần chia, so sánh lỗi và kiểm tra lợi ích có ý nghĩa với quyết định.',
        navigationTitle: 'So sánh hai ứng viên',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-heldout-comparison',
    locales: {
      en: {
        lede: 'A higher degree is a changed hypothesis, not an automatic improvement. Compare candidates on the same held-out evidence.',
        navigationTitle: 'Compare on the same evidence',
        title: 'Let held-out error decide whether curvature helped',
      },
      vi: {
        lede: 'Bậc cao hơn là một giả thuyết đã đổi, không phải cải thiện tự động. Hãy so sánh các ứng viên trên cùng bằng chứng giữ lại.',
        navigationTitle: 'So sánh trên cùng bằng chứng',
        title: 'Để lỗi giữ lại quyết định độ cong có giúp không',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-fixed-table',
    locales: {
      en: {
        markdown:
          'Use this fixed instructional comparison, not a reported experiment:\n\n| candidate | repeated residual pattern | held-out reading |\n|---|---|---|\n| straight line | misses both tails in the same direction | inspect whether curvature is warranted |\n| degree-two curve | fewer repeated tail misses | compare its held-out error on the same rows |\n\nA curved drawing is only a candidate explanation until the held-out evidence improves in a way that matters to the decision.',
      },
      vi: {
        markdown:
          'Dùng so sánh cố định để học này, không phải thí nghiệm được báo cáo:\n\n| ứng viên | mẫu phần dư lặp lại | cách đọc giữ lại |\n|---|---|---|\n| đường thẳng | bỏ lỡ cả hai đuôi theo cùng chiều | kiểm tra độ cong có cần thiết không |\n| đường cong bậc hai | ít lần bỏ lỡ đuôi lặp lại hơn | so sánh lỗi giữ lại trên cùng dòng |\n\nBản vẽ cong chỉ là giải thích ứng viên cho tới khi bằng chứng giữ lại cải thiện theo cách quan trọng với quyết định.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-next-step',
    locales: {
      en: {
        body: 'If a degree-two curve produces only a tiny held-out improvement, look for missing informative features or a simpler explanation before increasing degree again. The goal is useful prediction, not the most ornate curve.',
        title: 'Prefer evidence over an impressive curve',
      },
      vi: {
        body: 'Nếu đường cong bậc hai chỉ cải thiện giữ lại rất nhỏ, hãy tìm feature thông tin còn thiếu hoặc lời giải thích đơn giản hơn trước khi tăng bậc tiếp. Mục tiêu là dự đoán hữu ích, không phải đường cong cầu kỳ nhất.',
        title: 'Ưu tiên bằng chứng hơn đường cong ấn tượng',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM02PolynomialBlockDefaults,
    id: 'polynomial-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM02SourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM02SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM02SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM02SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Build a regression model using Scikit-learn: regression four ways',
        url: 'https://github.com/microsoft/ML-For-Beginners/blob/main/2-Regression/3-Linear/README.md',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM03RegularizationFullLessonBlocks = [
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'regularization-question',
    locales: {
      en: {
        lede: 'A low training error is not enough when related features can trade credit with one another. Regularisation makes that trade-off explicit before coefficients are trusted on new rows.',
        navigationTitle: 'Ask why coefficients move',
        title: 'Stabilise a linear explanation before relying on it',
      },
      vi: {
        lede: 'Lỗi train thấp chưa đủ khi các feature liên quan có thể đổi phần đóng góp cho nhau. Regularization làm rõ đánh đổi đó trước khi tin hệ số trên các dòng mới.',
        navigationTitle: 'Hỏi vì sao hệ số thay đổi',
        title: 'Ổn định lời giải thích tuyến tính trước khi dựa vào nó',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'regularization-penalty-purpose',
    locales: {
      en: {
        markdown:
          'Regularised linear models minimise prediction error together with a penalty on coefficient size. The penalty does not prove that a particular coefficient is true; it asks the fit to avoid unnecessarily large or fragile weights when several explanations fit the training rows.',
      },
      vi: {
        markdown:
          'Mô hình tuyến tính có regularization tối thiểu hóa lỗi dự đoán cùng một penalty trên độ lớn hệ số. Penalty không chứng minh hệ số nào là đúng; nó yêu cầu phép khớp tránh trọng số lớn hoặc mong manh không cần thiết khi nhiều lời giải thích cùng khớp các dòng train.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'regularization-alpha-cause-effect',
    locales: {
      en: {
        body: 'Cause: alpha controls the strength of the penalty. Effect: increasing alpha applies more shrinkage, so the comparison must also ask whether the held-out prediction still serves the decision.',
        title: 'Shrinkage changes both flexibility and evidence',
      },
      vi: {
        body: 'Nguyên nhân: alpha điều khiển độ mạnh của penalty. Kết quả: tăng alpha áp dụng shrinkage nhiều hơn, nên so sánh cũng phải hỏi dự đoán giữ lại còn phục vụ quyết định hay không.',
        title: 'Shrinkage thay đổi cả tính linh hoạt lẫn bằng chứng',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'ridge-l2-question',
    locales: {
      en: {
        lede: 'Ridge adds an L2 penalty to the squared-error objective. It is useful to read it as a preference for smaller coefficients when collinearity makes one unpenalised explanation unstable.',
        navigationTitle: 'Read Ridge shrinkage',
        title: 'Ridge shrinks related coefficients without declaring one irrelevant',
      },
      vi: {
        lede: 'Ridge thêm penalty L2 vào mục tiêu sai số bình phương. Hãy đọc nó như ưu tiên hệ số nhỏ hơn khi collinearity làm một lời giải thích không penalty trở nên không ổn định.',
        navigationTitle: 'Đọc shrinkage của Ridge',
        title: 'Ridge thu nhỏ hệ số liên quan mà không tuyên bố một feature vô nghĩa',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'ridge-l2-reading',
    locales: {
      en: {
        markdown:
          'The Ridge objective adds an L2 coefficient penalty to least squares. In the pinned scikit-learn guide, larger non-negative alpha means greater shrinkage and coefficients that are more robust to collinearity. That is a model choice to evaluate, not a license to select the largest alpha.',
      },
      vi: {
        markdown:
          'Mục tiêu Ridge thêm penalty L2 trên hệ số vào least squares. Trong hướng dẫn scikit-learn đã pin, alpha không âm lớn hơn nghĩa là shrinkage lớn hơn và hệ số vững hơn với collinearity. Đây là lựa chọn mô hình cần đánh giá, không phải lý do để chọn alpha lớn nhất.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    activityId: 'act-cml-p05-regularization-ridge-lasso-example',
    id: 'regularization-fixed-coefficient-example',
    locales: {
      en: {
        description:
          'Inspect this fixed teaching comparison, not a live fit. Two overlapping signals A and B have Ridge coefficients 0.45 and 0.45 at the displayed alpha. A Lasso comparison keeps A at 0.90 and sets B to 0. Explain the different preference: Ridge shrinks the pair, while Lasso can produce a sparse coefficient vector. Then name the missing evidence: held-out error across candidate alpha values.',
        navigationTitle: 'Compare fixed coefficients',
      },
      vi: {
        description:
          'Quan sát so sánh cố định để học này, không phải lượt fit live. Hai tín hiệu chồng chéo A và B có hệ số Ridge 0,45 và 0,45 tại alpha hiển thị. So sánh Lasso giữ A ở 0,90 và đưa B về 0. Giải thích ưu tiên khác nhau: Ridge thu nhỏ cặp hệ số, còn Lasso có thể tạo vector hệ số thưa. Sau đó nêu bằng chứng còn thiếu: lỗi giữ lại trên các alpha ứng viên.',
        navigationTitle: 'So sánh hệ số cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'lasso-sparsity-question',
    locales: {
      en: {
        lede: 'Lasso uses an L1 penalty. Its sparse solution can set some coefficients exactly to zero, changing which features the fitted explanation depends on.',
        navigationTitle: 'Read Lasso sparsity',
        title: 'Lasso can remove a coefficient rather than only shrink it',
      },
      vi: {
        lede: 'Lasso dùng penalty L1. Lời giải thưa của nó có thể đưa một số hệ số về đúng 0, làm thay đổi các feature mà lời giải thích đã khớp phụ thuộc vào.',
        navigationTitle: 'Đọc tính thưa của Lasso',
        title: 'Lasso có thể loại một hệ số thay vì chỉ thu nhỏ nó',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'lasso-l1-reading',
    locales: {
      en: {
        markdown:
          'The scikit-learn guide describes Lasso as a linear model that estimates sparse coefficients and can set coefficients exactly to zero. Its alpha controls the degree of sparsity. A zero in this fixed lesson is a model outcome under its representation and alpha, not a universal claim that the underlying feature never matters.',
      },
      vi: {
        markdown:
          'Hướng dẫn scikit-learn mô tả Lasso là mô hình tuyến tính ước lượng hệ số thưa và có thể đặt hệ số đúng bằng 0. Alpha điều khiển mức độ thưa. Số 0 trong bài học cố định này là kết quả mô hình dưới biểu diễn và alpha của nó, không phải khẳng định feature gốc không bao giờ quan trọng.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'regularization-selection-evidence',
    locales: {
      en: {
        body: 'Choose alpha with validation evidence. The pinned guide exposes cross-validation helpers for Ridge and Lasso; pedagogically, compare candidate alphas on held-out folds, then report the trade-off among error, coefficient stability, and sparsity.',
        title: 'Tune alpha as a testable decision',
      },
      vi: {
        body: 'Chọn alpha bằng bằng chứng validation. Hướng dẫn đã pin có helper cross-validation cho Ridge và Lasso; về mặt học tập, hãy so sánh alpha ứng viên trên các fold giữ lại, rồi báo cáo đánh đổi giữa lỗi, độ ổn định hệ số và tính thưa.',
        title: 'Tinh chỉnh alpha như một quyết định có thể kiểm tra',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM03RegularizationBlockDefaults,
    id: 'regularization-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM03SourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM03SourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM03SourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM03SourceTrace.sourceSnapshots[0].sourceName,
        title: 'Linear Models — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/linear_model.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM04LogisticFullLessonBlocks = [
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-binary-question',
    locales: {
      en: {
        lede: 'Use logistic regression when the learning question asks which of two categories a record belongs to, not how large a continuous quantity will be.',
        navigationTitle: 'Frame a binary category',
        title: 'Turn a two-category question into a modelled score',
      },
      vi: {
        lede: 'Dùng hồi quy logistic khi câu hỏi học hỏi một bản ghi thuộc một trong hai category nào, không phải một đại lượng liên tục lớn bao nhiêu.',
        navigationTitle: 'Đặt khung category nhị phân',
        title: 'Biến câu hỏi hai category thành điểm được mô hình hóa',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-category-not-continuous',
    locales: {
      en: {
        markdown:
          'The pinned Microsoft lesson distinguishes logistic regression from linear regression: linear regression predicts a continuous value, while logistic regression is used to predict a binary category. Begin by naming the two categories and the evidence available for each record.',
      },
      vi: {
        markdown:
          'Bài Microsoft đã pin phân biệt hồi quy logistic với hồi quy tuyến tính: hồi quy tuyến tính dự đoán giá trị liên tục, còn hồi quy logistic dùng để dự đoán category nhị phân. Hãy bắt đầu bằng cách nêu hai category và bằng chứng có cho mỗi bản ghi.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-sigmoid-cause-effect',
    locales: {
      en: {
        body: 'Cause: the sigmoid maps a score into the interval from zero to one. Effect: the displayed value can be read before a class rule is applied, rather than being confused with the category itself.',
        title: 'A score and a category are different outputs',
      },
      vi: {
        body: 'Nguyên nhân: sigmoid ánh xạ một điểm vào khoảng từ không đến một. Kết quả: có thể đọc giá trị hiển thị trước khi áp dụng quy tắc lớp, thay vì nhầm nó với chính category.',
        title: 'Điểm và category là hai đầu ra khác nhau',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-sigmoid-reading',
    locales: {
      en: {
        lede: 'The S-shaped sigmoid is the bridge between an input score and a bounded output. Inspect the value before deciding how a fixed classroom rule will label it.',
        navigationTitle: 'Read the sigmoid output',
        title: 'Map an input score into a bounded probability reading',
      },
      vi: {
        lede: 'Sigmoid hình chữ S là cầu nối giữa điểm đầu vào và đầu ra bị chặn. Hãy quan sát giá trị trước khi quyết định quy tắc lớp cố định trong bài học sẽ gán nhãn nó thế nào.',
        navigationTitle: 'Đọc đầu ra sigmoid',
        title: 'Ánh xạ điểm đầu vào thành cách đọc xác suất bị chặn',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-sigmoid-range',
    locales: {
      en: {
        markdown:
          'In the source lesson, the sigmoid takes a value and maps it somewhere between 0 and 1. At the midpoint score, the fixed reading is 0.50. Values below and above that midpoint remain scores to interpret; this lesson does not claim that any one threshold is correct for every real decision.',
      },
      vi: {
        markdown:
          'Trong bài nguồn, sigmoid lấy một giá trị và ánh xạ nó vào đâu đó giữa 0 và 1. Tại điểm giữa, cách đọc cố định là 0,50. Giá trị dưới và trên điểm giữa vẫn là điểm cần diễn giải; bài này không khẳng định một ngưỡng nào đúng cho mọi quyết định thực tế.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    activityId: 'act-cml-p06-logistic-regression-example',
    id: 'logistic-fixed-score-example',
    locales: {
      en: {
        description:
          'Read the fixed instructional scores 0.27, 0.50, 0.73, and 0.88 for four anonymous records. With the displayed classroom convention “greater than 0.50 is class 1”, only 0.73 and 0.88 become class 1. Explain the cause and effect: the score is produced first; the threshold rule turns it into a category. This is not a live admission decision or a recommendation for a real policy.',
        navigationTitle: 'Classify fixed scores',
      },
      vi: {
        description:
          'Đọc các điểm để học cố định 0,27; 0,50; 0,73; 0,88 cho bốn bản ghi ẩn danh. Với quy ước lớp hiển thị “lớn hơn 0,50 là lớp 1”, chỉ 0,73 và 0,88 thành lớp 1. Giải thích nguyên nhân và kết quả: điểm được tạo trước; quy tắc ngưỡng biến nó thành category. Đây không phải quyết định tuyển sinh live hay khuyến nghị cho chính sách thực tế.',
        navigationTitle: 'Phân lớp điểm cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-fixed-rule-question',
    locales: {
      en: {
        lede: 'A threshold is a rule placed after the score. Keep the rule visible so a learner can tell whether a changed category came from changed evidence or from changed decision criteria.',
        navigationTitle: 'Separate score from threshold',
        title: 'Make the category rule inspectable',
      },
      vi: {
        lede: 'Ngưỡng là quy tắc đặt sau điểm. Hãy giữ quy tắc hiển thị để người học phân biệt category đổi do bằng chứng đổi hay do tiêu chí quyết định đổi.',
        navigationTitle: 'Tách điểm khỏi ngưỡng',
        title: 'Làm quy tắc category có thể kiểm tra',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-threshold-reading',
    locales: {
      en: {
        markdown:
          'The pinned lesson uses a simple convention: a sigmoid outcome greater than 0.5 receives class 1; otherwise it receives class 0. Use the convention to reason about this fixed table, then carry the separate question of threshold consequences into the metrics lesson.',
      },
      vi: {
        markdown:
          'Bài đã pin dùng quy ước đơn giản: đầu ra sigmoid lớn hơn 0,5 nhận lớp 1; nếu không nhận lớp 0. Dùng quy ước để lập luận về bảng cố định này, rồi mang câu hỏi riêng về hậu quả của ngưỡng sang bài metrics.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-next-evidence',
    locales: {
      en: {
        body: 'Do not stop at a plausible score. Before a classifier is trusted, inspect its error pattern and the consequence of each category mistake. A score is evidence; a class rule is an additional decision.',
        title: 'Carry score interpretation into evaluation',
      },
      vi: {
        body: 'Đừng dừng ở một điểm có vẻ hợp lý. Trước khi tin classifier, hãy quan sát mẫu lỗi và hậu quả của từng nhầm lẫn category. Điểm là bằng chứng; quy tắc lớp là một quyết định bổ sung.',
        title: 'Mang diễn giải điểm sang đánh giá',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM04LogisticBlockDefaults,
    id: 'logistic-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM04LogisticSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM04LogisticSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM04LogisticSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM04LogisticSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Logistic regression to predict categories',
        url: 'https://github.com/microsoft/ML-For-Beginners/blob/main/2-Regression/4-Logistic/README.md',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM04MetricsFullLessonBlocks = [
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-error-question',
    locales: {
      en: {
        lede: 'A classification score is useful only when it reveals the mistakes that matter. Start by counting outcomes, not by accepting one headline number.',
        navigationTitle: 'Ask which mistake matters',
        title: 'Evaluate categories through their error consequences',
      },
      vi: {
        lede: 'Một điểm phân loại chỉ hữu ích khi nó làm lộ các nhầm lẫn quan trọng. Hãy bắt đầu bằng đếm kết quả, không phải chấp nhận một con số tiêu đề.',
        navigationTitle: 'Hỏi nhầm lẫn nào quan trọng',
        title: 'Đánh giá category qua hậu quả của lỗi',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-classification-landscape',
    locales: {
      en: {
        markdown:
          'The pinned Google classification overview puts thresholding, the confusion matrix, and metrics such as accuracy, precision, and recall in one evaluation workflow. Each asks a different question about the same set of predicted and observed categories.',
      },
      vi: {
        markdown:
          'Tổng quan phân loại Google đã pin đặt thresholding, confusion matrix và các metric như accuracy, precision, recall trong cùng một quy trình đánh giá. Mỗi phần hỏi một câu khác về cùng tập category dự đoán và quan sát.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-confusion-cause-effect',
    locales: {
      en: {
        body: 'Cause: a threshold converts scores into positive and negative predictions. Effect: the confusion matrix records true positives, false positives, false negatives, and true negatives so an aggregate score cannot hide every error type.',
        title: 'A confusion matrix preserves the error story',
      },
      vi: {
        body: 'Nguyên nhân: ngưỡng biến điểm thành dự đoán dương và âm. Kết quả: confusion matrix ghi true positive, false positive, false negative và true negative để một điểm tổng hợp không che mọi loại lỗi.',
        title: 'Confusion matrix giữ lại câu chuyện lỗi',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-read-three-views',
    locales: {
      en: {
        lede: 'Accuracy, precision, and recall do not compete as labels for the same fact. They focus attention on different denominators and different failure consequences.',
        navigationTitle: 'Read metric denominators',
        title: 'Choose the metric from the question being asked',
      },
      vi: {
        lede: 'Accuracy, precision và recall không cạnh tranh như các nhãn cho cùng một sự thật. Chúng tập trung vào các mẫu số khác nhau và hậu quả lỗi khác nhau.',
        navigationTitle: 'Đọc mẫu số của metric',
        title: 'Chọn metric từ câu hỏi đang được hỏi',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-denominator-reading',
    locales: {
      en: {
        markdown:
          'Accuracy asks how many decisions were correct overall. Precision asks, among predicted positives, how many were actually positive. Recall asks, among actual positives, how many the model found. The Google overview explicitly pairs these metrics with thresholding and the confusion matrix, so read the table before choosing one.',
      },
      vi: {
        markdown:
          'Accuracy hỏi bao nhiêu quyết định đúng trên toàn bộ. Precision hỏi trong các dự đoán dương, bao nhiêu thực sự dương. Recall hỏi trong các dương thực tế, mô hình tìm được bao nhiêu. Tổng quan Google ghép các metric này với thresholding và confusion matrix, nên hãy đọc bảng trước khi chọn một metric.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    activityId: 'act-cml-p07-classification-metrics-example',
    id: 'metrics-fixed-confusion-example',
    locales: {
      en: {
        description:
          'Inspect a fixed review table: 8 true positives, 2 false positives, 3 false negatives, and 87 true negatives. If the learner’s task is to avoid missing a positive case, identify recall as the metric to inspect next and explain why accuracy alone cannot show the three false negatives. The numbers are an instructional table, not a model report.',
        navigationTitle: 'Read a fixed confusion table',
      },
      vi: {
        description:
          'Quan sát bảng review cố định: 8 true positive, 2 false positive, 3 false negative và 87 true negative. Nếu nhiệm vụ là tránh bỏ sót ca dương, hãy xác định recall là metric cần xem tiếp và giải thích vì sao accuracy một mình không thể cho thấy ba false negative. Các số là bảng để học, không phải báo cáo mô hình.',
        navigationTitle: 'Đọc bảng confusion cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-threshold-question',
    locales: {
      en: {
        lede: 'Changing a threshold changes which predictions enter each confusion-matrix cell. That is why a threshold choice and a metric choice must be discussed together.',
        navigationTitle: 'Connect threshold to errors',
        title: 'A threshold changes the error trade-off',
      },
      vi: {
        lede: 'Đổi ngưỡng làm đổi dự đoán đi vào từng ô confusion matrix. Đó là lý do phải thảo luận lựa chọn ngưỡng và metric cùng nhau.',
        navigationTitle: 'Nối ngưỡng với lỗi',
        title: 'Ngưỡng thay đổi đánh đổi lỗi',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-threshold-comparison',
    locales: {
      en: {
        markdown:
          'For this fixed table, do not announce a universally correct threshold. Instead, state the decision consequence first: if false negatives are costly, inspect recall and the false-negative count; if false positives are costly, inspect precision and the false-positive count. Then compare candidate thresholds on held-out evidence.',
      },
      vi: {
        markdown:
          'Với bảng cố định này, đừng tuyên bố một ngưỡng đúng phổ quát. Thay vào đó, nêu hậu quả quyết định trước: nếu false negative tốn kém, hãy xem recall và số false negative; nếu false positive tốn kém, hãy xem precision và số false positive. Sau đó so sánh ngưỡng ứng viên trên bằng chứng giữ lại.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-decision-summary',
    locales: {
      en: {
        body: 'A metric is not a badge of model quality. It is a measurement selected because it exposes the error that affects the decision. Always carry the confusion counts beside the selected metric.',
        title: 'Report the error trade-off, not only a score',
      },
      vi: {
        body: 'Metric không phải huy hiệu chất lượng mô hình. Nó là phép đo được chọn vì làm lộ lỗi ảnh hưởng đến quyết định. Luôn đặt các số đếm confusion bên cạnh metric đã chọn.',
        title: 'Báo cáo đánh đổi lỗi, không chỉ điểm',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM04MetricsBlockDefaults,
    id: 'metrics-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM04MetricsSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM04MetricsSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM04MetricsSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM04MetricsSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Classification — Google Machine Learning Crash Course',
        url: 'https://developers.google.com/machine-learning/crash-course/classification',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM05KnnFullLessonBlocks = [
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-neighbour-question',
    locales: {
      en: {
        lede: 'K-nearest neighbours begins with a concrete comparison: which labelled training samples are closest to this new point under the chosen distance measure?',
        navigationTitle: 'Ask who is nearest',
        title: 'Classify a new point from nearby labelled evidence',
      },
      vi: {
        lede: 'K láng giềng gần nhất bắt đầu bằng so sánh cụ thể: mẫu train đã gán nhãn nào gần điểm mới này nhất theo khoảng cách đã chọn?',
        navigationTitle: 'Hỏi ai gần nhất',
        title: 'Phân loại điểm mới từ bằng chứng đã gán nhãn lân cận',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-distance-principle',
    locales: {
      en: {
        markdown:
          'The pinned scikit-learn guide describes the nearest-neighbour principle as finding a predefined number of training samples closest in distance to the new point, then predicting its label from those samples. The number can be the user-specified constant k.',
      },
      vi: {
        markdown:
          'Hướng dẫn scikit-learn đã pin mô tả nguyên tắc láng giềng gần nhất là tìm số lượng mẫu train định trước gần điểm mới nhất theo khoảng cách, rồi dự đoán nhãn từ các mẫu đó. Số lượng có thể là hằng k do người dùng chỉ định.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-representation-cause-effect',
    locales: {
      en: {
        body: 'Cause: KNN makes its decision from a distance calculation. Effect: the selected metric and the representation of each feature determine which evidence is called “near,” so both must be visible in a review.',
        title: 'Distance is a modelling choice',
      },
      vi: {
        body: 'Nguyên nhân: KNN đưa ra quyết định từ phép tính khoảng cách. Kết quả: metric đã chọn và biểu diễn của mỗi feature quyết định bằng chứng nào được gọi là “gần”, nên cả hai phải hiển thị khi review.',
        title: 'Khoảng cách là lựa chọn mô hình hóa',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-vote-question',
    locales: {
      en: {
        lede: 'After the neighbours are fixed, KNN classification uses their labels rather than fitting a separate global boundary for this lesson.',
        navigationTitle: 'Read the local vote',
        title: 'Let the nearest labelled set cast the class vote',
      },
      vi: {
        lede: 'Sau khi cố định các láng giềng, phân loại KNN dùng nhãn của chúng thay vì fit một ranh giới toàn cục riêng cho bài này.',
        navigationTitle: 'Đọc phiếu cục bộ',
        title: 'Để tập đã gán nhãn gần nhất bỏ phiếu cho lớp',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-majority-reading',
    locales: {
      en: {
        markdown:
          'For nearest-neighbour classification, the guide states that a query point receives the class with the most representatives among its nearest neighbours. Uniform weighting is the basic form; the guide also notes that nearer neighbours can be weighted more strongly in some circumstances.',
      },
      vi: {
        markdown:
          'Với phân loại láng giềng gần nhất, hướng dẫn nêu điểm truy vấn nhận lớp có nhiều đại diện nhất trong các láng giềng gần nhất. Trọng số đồng đều là dạng cơ bản; hướng dẫn cũng nêu trong một số trường hợp láng giềng gần hơn có thể được gán trọng số mạnh hơn.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM05KnnBlockDefaults,
    activityId: 'act-cml-p08-knn-example',
    id: 'knn-fixed-neighbour-example',
    locales: {
      en: {
        description:
          'Inspect a fixed three-neighbour vote for an anonymous flower-like point. The displayed neighbour labels are class 1, class 1, and class 0, so the fixed majority result is class 1. State the cause and effect: the three closest labelled records supply the vote; a different k or distance representation could change which records appear in that set. This is a static teaching comparison, not a live classifier.',
        navigationTitle: 'Inspect a fixed neighbour vote',
      },
      vi: {
        description:
          'Quan sát phiếu ba láng giềng cố định cho một điểm giống hoa ẩn danh. Nhãn láng giềng hiển thị là lớp 1, lớp 1, lớp 0 nên kết quả đa số cố định là lớp 1. Nêu nguyên nhân và kết quả: ba bản ghi đã gán nhãn gần nhất cung cấp phiếu; k hoặc biểu diễn khoảng cách khác có thể đổi bản ghi xuất hiện trong tập đó. Đây là so sánh tĩnh để học, không phải classifier live.',
        navigationTitle: 'Quan sát phiếu láng giềng cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-metric-question',
    locales: {
      en: {
        lede: 'Euclidean distance is the most common metric in the pinned guide, but the guide permits other metric measures. The metric is evidence context, not an invisible implementation detail.',
        navigationTitle: 'Name the distance metric',
        title: 'Make the meaning of “closest” explicit',
      },
      vi: {
        lede: 'Khoảng cách Euclid là metric phổ biến nhất trong hướng dẫn đã pin, nhưng hướng dẫn cho phép các metric khác. Metric là bối cảnh bằng chứng, không phải chi tiết triển khai vô hình.',
        navigationTitle: 'Nêu metric khoảng cách',
        title: 'Làm rõ “gần nhất” có nghĩa gì',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-tie-boundary',
    locales: {
      en: {
        markdown:
          'The nearest-neighbours guide warns that when the k-th and k+1-th neighbours have identical distances but different labels, the result depends on training-data ordering. Treat an exact-distance tie as an ambiguity to disclose, not as hidden certainty.',
      },
      vi: {
        markdown:
          'Hướng dẫn láng giềng gần nhất cảnh báo khi láng giềng thứ k và k+1 có khoảng cách giống hệt nhưng nhãn khác nhau, kết quả phụ thuộc vào thứ tự dữ liệu train. Hãy xem tie khoảng cách chính xác là điểm mơ hồ cần nêu, không phải sự chắc chắn ẩn.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-review-summary',
    locales: {
      en: {
        body: 'Before accepting a neighbour result, report k, the distance metric, the displayed neighbour labels, and whether a tie exists. This preserves the local evidence chain that produced the category.',
        title: 'Report the local evidence chain',
      },
      vi: {
        body: 'Trước khi chấp nhận kết quả láng giềng, hãy báo cáo k, metric khoảng cách, nhãn láng giềng hiển thị và có tie hay không. Việc này giữ chuỗi bằng chứng cục bộ tạo ra category.',
        title: 'Báo cáo chuỗi bằng chứng cục bộ',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM05KnnBlockDefaults,
    id: 'knn-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM05KnnSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM05KnnSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM05KnnSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM05KnnSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Nearest Neighbors — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/neighbors.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM05NaiveBayesFullLessonBlocks = [
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-question',
    locales: {
      en: {
        lede: 'Naive Bayes is a supervised classification family that turns a class prior and feature evidence into a comparison among candidate classes.',
        navigationTitle: 'Frame evidence by class',
        title: 'Update a class comparison with observed features',
      },
      vi: {
        lede: 'Naive Bayes là họ phân loại có giám sát biến prior của lớp và bằng chứng feature thành so sánh giữa các lớp ứng viên.',
        navigationTitle: 'Đặt khung bằng chứng theo lớp',
        title: 'Cập nhật so sánh lớp bằng feature quan sát',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-bayes-rule',
    locales: {
      en: {
        markdown:
          'The pinned guide describes Naive Bayes as supervised learning based on Bayes’ theorem. For each candidate class, it combines a class prior with class-conditional feature likelihoods, then selects the class with the largest resulting comparison score.',
      },
      vi: {
        markdown:
          'Hướng dẫn đã pin mô tả Naive Bayes là học có giám sát dựa trên định lý Bayes. Với mỗi lớp ứng viên, nó kết hợp prior của lớp với likelihood feature có điều kiện theo lớp, rồi chọn lớp có điểm so sánh kết quả lớn nhất.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-independence-cause-effect',
    locales: {
      en: {
        body: 'Cause: the “naive” assumption treats every pair of features as conditionally independent once the class is known. Effect: the joint evidence can be simplified into one class prior times individual feature terms.',
        title: 'An explicit assumption makes the calculation tractable',
      },
      vi: {
        body: 'Nguyên nhân: giả định “naive” xem mọi cặp feature độc lập có điều kiện khi đã biết lớp. Kết quả: bằng chứng chung có thể được đơn giản hóa thành prior lớp nhân với các hạng feature riêng lẻ.',
        title: 'Giả định rõ ràng làm phép tính khả thi',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-prior-question',
    locales: {
      en: {
        lede: 'A prior is not a final category. It is the class frequency signal present before the current feature values are applied.',
        navigationTitle: 'Read the class prior',
        title: 'Separate prior frequency from current evidence',
      },
      vi: {
        lede: 'Prior không phải category cuối. Nó là tín hiệu tần suất lớp có trước khi áp dụng giá trị feature hiện tại.',
        navigationTitle: 'Đọc prior của lớp',
        title: 'Tách tần suất prior khỏi bằng chứng hiện tại',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-prior-reading',
    locales: {
      en: {
        markdown:
          'The guide notes that the class prior P(y) can be estimated as the relative frequency of that class in the training set. Feature likelihoods then change the comparison for the specific record; do not read a high prior as proof before those features are considered.',
      },
      vi: {
        markdown:
          'Hướng dẫn nêu prior lớp P(y) có thể được ước lượng là tần suất tương đối của lớp đó trong tập train. Likelihood feature sau đó thay đổi so sánh cho bản ghi cụ thể; đừng đọc prior cao như bằng chứng trước khi xét các feature đó.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    activityId: 'act-cml-p09-naive-bayes-example',
    id: 'naive-bayes-fixed-evidence-example',
    locales: {
      en: {
        description:
          'Inspect a fixed two-class message exercise. Before feature evidence, class A appears in 6 of 10 training messages and class B in 4 of 10. A displayed word cue is more likely under B than A, so explain why the cue can shift the comparison toward B without proving certainty or causation. The table is instructional, not a live message classifier.',
        navigationTitle: 'Compare a fixed prior and cue',
      },
      vi: {
        description:
          'Quan sát bài tập thông điệp hai lớp cố định. Trước bằng chứng feature, lớp A xuất hiện trong 6/10 thông điệp train và lớp B trong 4/10. Một từ gợi ý hiển thị có likelihood cao hơn dưới B so với A, nên hãy giải thích vì sao từ đó có thể dịch so sánh về B mà không chứng minh chắc chắn hoặc nhân quả. Bảng là để học, không phải classifier thông điệp live.',
        navigationTitle: 'So sánh prior và từ gợi ý cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-distribution-question',
    locales: {
      en: {
        lede: 'Naive Bayes variants differ mainly in the distribution assumed for each class-conditional feature term. Select a variant from the data representation, not from a favourite name.',
        navigationTitle: 'Match assumptions to data',
        title: 'The feature distribution assumption matters',
      },
      vi: {
        lede: 'Các biến thể Naive Bayes khác nhau chủ yếu ở phân phối giả định cho từng hạng feature có điều kiện theo lớp. Hãy chọn biến thể từ biểu diễn dữ liệu, không phải từ tên ưa thích.',
        navigationTitle: 'Khớp giả định với dữ liệu',
        title: 'Giả định phân phối feature có ý nghĩa',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-variant-reading',
    locales: {
      en: {
        markdown:
          'The pinned guide says the different Naive Bayes classifiers mainly differ by their assumptions about the distribution of P(x_i | y). Preserve that assumption in the evaluation note; a fast model can still be a poor fit for a mismatched feature representation.',
      },
      vi: {
        markdown:
          'Hướng dẫn đã pin nói các classifier Naive Bayes khác nhau chủ yếu ở giả định về phân phối P(x_i | y). Hãy giữ giả định đó trong ghi chú đánh giá; mô hình nhanh vẫn có thể không phù hợp với biểu diễn feature không khớp.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-review-summary',
    locales: {
      en: {
        body: 'Report the class prior, the observed feature evidence, and the conditional-independence assumption together. This makes a posterior comparison inspectable without mistaking it for a causal explanation.',
        title: 'Keep the evidence accounting visible',
      },
      vi: {
        body: 'Hãy báo cáo prior lớp, bằng chứng feature quan sát và giả định độc lập có điều kiện cùng nhau. Việc này làm so sánh posterior có thể kiểm tra mà không nhầm nó với lời giải thích nhân quả.',
        title: 'Giữ hạch toán bằng chứng hiển thị',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM05NaiveBayesBlockDefaults,
    id: 'naive-bayes-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM05NaiveBayesSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM05NaiveBayesSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM05NaiveBayesSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM05NaiveBayesSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Naive Bayes — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/naive_bayes.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM06DecisionTreeFullLessonBlocks = [
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-decision-rule-question',
    locales: {
      en: {
        lede: 'A decision tree turns feature evidence into a path of simple questions. At each branch, the current record follows the rule whose condition it satisfies.',
        navigationTitle: 'Frame a rule path',
        title: 'Predict by following simple rules inferred from features',
      },
      vi: {
        lede: 'Cây quyết định biến bằng chứng feature thành một đường đi gồm các câu hỏi đơn giản. Ở mỗi nhánh, bản ghi hiện tại đi theo quy tắc có điều kiện mà nó thỏa mãn.',
        navigationTitle: 'Đặt khung đường đi theo quy tắc',
        title: 'Dự đoán bằng cách theo các quy tắc đơn giản suy ra từ feature',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-supervised-rule-principle',
    locales: {
      en: {
        markdown:
          'The pinned scikit-learn guide describes decision trees as a non-parametric supervised method for classification and regression. They predict a target from simple decision rules learned from data features; a tree can be read as a piecewise-constant approximation.',
      },
      vi: {
        markdown:
          'Hướng dẫn scikit-learn đã pin mô tả cây quyết định là phương pháp có giám sát, phi tham số cho phân loại và hồi quy. Cây dự đoán mục tiêu từ các quy tắc quyết định đơn giản học từ feature dữ liệu; có thể đọc cây như một xấp xỉ hằng từng đoạn.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-depth-cause-effect',
    locales: {
      en: {
        body: 'Cause: adding depth adds more conditional rules. Effect: the tree can fit a more detailed pattern, but a more complex tree can also stop generalising beyond the examples that shaped those branches.',
        title: 'More branches increase both detail and risk',
      },
      vi: {
        body: 'Nguyên nhân: thêm độ sâu sẽ thêm các quy tắc có điều kiện. Kết quả: cây có thể khớp một mẫu chi tiết hơn, nhưng cây phức tạp hơn cũng có thể không còn tổng quát hóa ngoài các ví dụ đã tạo nên các nhánh đó.',
        title: 'Nhiều nhánh hơn tăng cả chi tiết lẫn rủi ro',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-split-question',
    locales: {
      en: {
        lede: 'Do not read a split as a mysterious score. Read it as a visible if–then question that sends a record to one of two subsequent rule paths.',
        navigationTitle: 'Read a split',
        title: 'Treat each split as an inspectable decision',
      },
      vi: {
        lede: 'Đừng đọc một split như một điểm số bí ẩn. Hãy đọc nó như câu hỏi if–then hiển thị, đưa bản ghi vào một trong hai đường đi quy tắc tiếp theo.',
        navigationTitle: 'Đọc một split',
        title: 'Xem mỗi split là một quyết định có thể kiểm tra',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-rule-path-reading',
    locales: {
      en: {
        markdown:
          'A fixed tree path is reproducible: write the tested feature, the branch taken, and the leaf result in order. This makes the prediction explainable as a sequence of rules, while keeping clear that the displayed tree is only an instructional fixture.',
      },
      vi: {
        markdown:
          'Một đường đi cây cố định có thể tái lập: ghi feature được kiểm tra, nhánh được chọn và kết quả lá theo thứ tự. Việc này làm dự đoán có thể giải thích như chuỗi quy tắc, đồng thời giữ rõ rằng cây hiển thị chỉ là fixture để học.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    activityId: 'act-cml-p10-decision-tree-example',
    id: 'tree-fixed-rule-example',
    locales: {
      en: {
        description:
          'Inspect a fixed anonymous condition card with two binary features. The displayed tree first asks whether signal A is present; for A = 1 it asks whether signal B is present, then reaches a class-1 leaf for B = 1. Explain the cause and effect: the visible answers determine the branch sequence, so a changed feature value can route the same card to a different leaf. This is not a real habitat classifier despite the later stable demo identifier.',
        navigationTitle: 'Trace a fixed rule path',
      },
      vi: {
        description:
          'Quan sát một thẻ điều kiện ẩn danh cố định với hai feature nhị phân. Cây hiển thị trước hết hỏi tín hiệu A có mặt không; với A = 1, nó hỏi tín hiệu B có mặt không, rồi đến lá lớp 1 khi B = 1. Giải thích nguyên nhân và kết quả: các câu trả lời hiển thị quyết định chuỗi nhánh, nên thay đổi một feature có thể đưa cùng thẻ đến lá khác. Đây không phải classifier môi trường sống thật dù demo ổn định về sau có tên habitat.',
        navigationTitle: 'Lần theo đường đi quy tắc cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-generalisation-question',
    locales: {
      en: {
        lede: 'A tree that keeps splitting can become over-complex. The question is not whether a deeper tree has more rules, but whether those rules still generalise to data not used to make them.',
        navigationTitle: 'Check generalisation',
        title: 'Make size controls part of the evidence',
      },
      vi: {
        lede: 'Một cây tiếp tục chia có thể trở nên quá phức tạp. Câu hỏi không phải cây sâu hơn có nhiều quy tắc hơn không, mà là các quy tắc đó còn tổng quát hóa cho dữ liệu không dùng để tạo chúng hay không.',
        navigationTitle: 'Kiểm tra tổng quát hóa',
        title: 'Đưa các kiểm soát kích thước vào bằng chứng',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-overfit-controls',
    locales: {
      en: {
        markdown:
          'The guide cautions that tree learners can create overly complex trees that do not generalise well. It lists pruning, a maximum depth, and minimum sample requirements at splits or leaves as ways to control tree size. State the chosen control alongside held-out evidence rather than treating the deepest tree as automatically best.',
      },
      vi: {
        markdown:
          'Hướng dẫn cảnh báo bộ học cây có thể tạo cây quá phức tạp, không tổng quát hóa tốt. Hướng dẫn nêu pruning, độ sâu tối đa và yêu cầu số mẫu tối thiểu tại split hoặc lá là các cách kiểm soát kích thước cây. Hãy nêu kiểm soát đã chọn cạnh bằng chứng giữ lại thay vì coi cây sâu nhất tự động là tốt nhất.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-review-summary',
    locales: {
      en: {
        body: 'Review a tree by recording its visible split rules, depth or pruning boundary, and the minimum evidence required to reach each leaf. This connects the readable path to the generalisation risk it may introduce.',
        title: 'Keep rule path and complexity evidence together',
      },
      vi: {
        body: 'Review một cây bằng cách ghi các quy tắc split hiển thị, biên độ sâu hoặc pruning, và bằng chứng tối thiểu cần để đi tới mỗi lá. Việc này nối đường đi dễ đọc với rủi ro tổng quát hóa mà nó có thể tạo ra.',
        title: 'Giữ đường đi quy tắc và bằng chứng độ phức tạp cùng nhau',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM06DecisionTreeBlockDefaults,
    id: 'tree-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM06DecisionTreeSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM06DecisionTreeSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM06DecisionTreeSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM06DecisionTreeSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Decision Trees — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/tree.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM06RandomForestFullLessonBlocks = [
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-ensemble-question',
    locales: {
      en: {
        lede: 'A random forest does not replace its trees with one opaque rule. It combines several tree predictions so the final result reflects an ensemble rather than a single branch path.',
        navigationTitle: 'Frame an ensemble',
        title: 'Combine several trees before reporting a result',
      },
      vi: {
        lede: 'Random forest không thay các cây bằng một quy tắc mờ đục. Nó kết hợp nhiều dự đoán của cây để kết quả cuối phản ánh một ensemble thay vì một đường nhánh duy nhất.',
        navigationTitle: 'Đặt khung một ensemble',
        title: 'Kết hợp nhiều cây trước khi báo cáo kết quả',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-ensemble-principle',
    locales: {
      en: {
        markdown:
          'The pinned ensemble guide explains that ensemble methods combine predictions from several base estimators to improve generalisability or robustness over one estimator. Random forests are a tree-based example of that broader idea.',
      },
      vi: {
        markdown:
          'Hướng dẫn ensemble đã pin giải thích rằng phương pháp ensemble kết hợp dự đoán từ nhiều bộ ước lượng cơ sở để cải thiện khả năng tổng quát hóa hoặc độ vững so với một bộ ước lượng. Random forest là ví dụ dựa trên cây của ý tưởng rộng hơn đó.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-diversity-cause-effect',
    locales: {
      en: {
        body: 'Cause: forests inject randomness through bootstrap samples and a random subset of features at each split. Effect: individual tree errors become less coupled, so combining their predictions can reduce variance instead of repeating the same brittle error.',
        title: 'Diversity changes how errors combine',
      },
      vi: {
        body: 'Nguyên nhân: forest đưa ngẫu nhiên vào qua mẫu bootstrap và tập con feature ngẫu nhiên ở mỗi split. Kết quả: lỗi của từng cây trở nên ít gắn chặt hơn, nên kết hợp dự đoán của chúng có thể giảm phương sai thay vì lặp lại cùng một lỗi mong manh.',
        title: 'Đa dạng thay đổi cách các lỗi kết hợp',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-aggregation-question',
    locales: {
      en: {
        lede: 'Aggregation is the final evidence step. Read what each fixed tree contributes before summarising their outputs into one class or score.',
        navigationTitle: 'Read aggregation',
        title: 'Make the ensemble combination visible',
      },
      vi: {
        lede: 'Tổng hợp là bước bằng chứng cuối. Hãy đọc mỗi cây cố định đóng góp gì trước khi tóm tắt đầu ra của chúng thành một lớp hoặc điểm.',
        navigationTitle: 'Đọc tổng hợp',
        title: 'Làm rõ cách kết hợp ensemble',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-aggregation-reading',
    locales: {
      en: {
        markdown:
          'The guide explains that averaging predictions from diverse trees can cancel some errors and reduce variance. It also notes a scikit-learn classifier implementation may average predicted probabilities rather than make every tree cast one hard class vote. Therefore report the aggregation rule used by the particular exercise or model.',
      },
      vi: {
        markdown:
          'Hướng dẫn giải thích rằng lấy trung bình dự đoán từ các cây đa dạng có thể triệt tiêu một số lỗi và giảm phương sai. Hướng dẫn cũng lưu ý một triển khai classifier của scikit-learn có thể lấy trung bình xác suất dự đoán thay vì để mọi cây bỏ một phiếu lớp cứng. Vì vậy hãy báo cáo quy tắc tổng hợp mà bài tập hoặc mô hình cụ thể sử dụng.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    activityId: 'act-cml-p11-random-forest-example',
    id: 'forest-fixed-comparison-example',
    locales: {
      en: {
        description:
          'Compare one fixed tree with a fixed three-tree classroom ensemble on an anonymous two-feature card. The single tree reaches class 0 after one path; the other displayed trees return class 1 and class 1. Under this exercise’s explicit simple-majority rule, the ensemble reports class 1. Cause and effect: differing sampled evidence and feature choices can yield diverse tree outputs, and the named aggregation rule determines the final display. This is a static illustration, not a live habitat system.',
        navigationTitle: 'Compare fixed tree outputs',
      },
      vi: {
        description:
          'So sánh một cây cố định với ensemble ba cây cố định trong lớp cho một thẻ hai feature ẩn danh. Cây đơn đi tới lớp 0 sau một đường đi; các cây hiển thị khác trả về lớp 1 và lớp 1. Theo quy tắc đa số đơn giản được nêu rõ của bài tập này, ensemble báo lớp 1. Nguyên nhân và kết quả: bằng chứng được lấy mẫu và lựa chọn feature khác nhau có thể tạo đầu ra cây đa dạng, còn quy tắc tổng hợp được nêu tên quyết định hiển thị cuối. Đây là minh họa tĩnh, không phải hệ thống môi trường sống live.',
        navigationTitle: 'So sánh đầu ra cây cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-variance-question',
    locales: {
      en: {
        lede: 'A larger forest is not an automatic guarantee. The variance benefit depends on diversity and on combining the tree predictions under a stated aggregation rule.',
        navigationTitle: 'Check the variance claim',
        title: 'Link randomisation to the claimed benefit',
      },
      vi: {
        lede: 'Forest lớn hơn không tự động là bảo đảm. Lợi ích phương sai phụ thuộc vào sự đa dạng và việc kết hợp dự đoán của cây theo một quy tắc tổng hợp được nêu rõ.',
        navigationTitle: 'Kiểm tra khẳng định phương sai',
        title: 'Nối ngẫu nhiên hóa với lợi ích được khẳng định',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-bootstrap-feature-reading',
    locales: {
      en: {
        markdown:
          'The guide names bootstrapping samples and randomly selecting features at each split as two sources of forest randomness. It explains that deep individual trees often have high variance and tend to overfit; less-correlated errors can partly cancel when their predictions are combined. Validate this on held-out evidence rather than claiming the benefit from the word “forest” alone.',
      },
      vi: {
        markdown:
          'Hướng dẫn nêu bootstrap mẫu và chọn feature ngẫu nhiên ở mỗi split là hai nguồn ngẫu nhiên của forest. Hướng dẫn giải thích cây sâu riêng lẻ thường có phương sai cao và dễ overfit; các lỗi ít tương quan hơn có thể triệt tiêu một phần khi dự đoán được kết hợp. Hãy kiểm chứng điều này bằng bằng chứng giữ lại thay vì khẳng định lợi ích chỉ từ chữ “forest”.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-review-summary',
    locales: {
      en: {
        body: 'Review a forest by naming the tree sampling, feature-selection randomness, aggregation rule, and held-out result together. These details explain why several trees may be more robust than one without promising that every ensemble wins.',
        title: 'Report diversity, aggregation, and evidence together',
      },
      vi: {
        body: 'Review một forest bằng cách nêu cùng nhau việc lấy mẫu cây, ngẫu nhiên chọn feature, quy tắc tổng hợp và kết quả giữ lại. Các chi tiết này giải thích vì sao nhiều cây có thể vững hơn một cây mà không hứa mọi ensemble đều thắng.',
        title: 'Báo cáo đa dạng, tổng hợp và bằng chứng cùng nhau',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM06RandomForestBlockDefaults,
    id: 'forest-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM06RandomForestSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM06RandomForestSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM06RandomForestSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM06RandomForestSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Ensembles and Random Forests — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/ensemble.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM07SvmFullLessonBlocks = [
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-separation-question',
    locales: {
      en: {
        lede: 'A support vector machine compares labelled examples through a separating surface. The key geometric question is how much room the chosen separator leaves before it reaches the nearest training points.',
        navigationTitle: 'Frame the separator',
        title: 'Separate classes while preserving visible room',
      },
      vi: {
        lede: 'Máy vector hỗ trợ so sánh các ví dụ đã gán nhãn qua một mặt phân tách. Câu hỏi hình học chính là mặt phân tách đã chọn chừa bao nhiêu khoảng trống trước khi chạm các điểm train gần nhất.',
        navigationTitle: 'Đặt khung mặt phân tách',
        title: 'Tách lớp đồng thời giữ khoảng trống hiển thị',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-supervised-principle',
    locales: {
      en: {
        markdown:
          'The pinned scikit-learn guide describes SVMs as supervised methods used for classification, regression, and outlier detection. In the classification picture, an SVM constructs one or more hyperplanes that separate candidate classes.',
      },
      vi: {
        markdown:
          'Hướng dẫn scikit-learn đã pin mô tả SVM là các phương pháp có giám sát dùng cho phân loại, hồi quy và phát hiện ngoại lệ. Trong bức tranh phân loại, SVM xây dựng một hoặc nhiều siêu phẳng để tách các lớp ứng viên.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-margin-cause-effect',
    locales: {
      en: {
        body: 'Cause: the separator is judged by its distance to the nearest training points of each class, called the functional margin. Effect: the guide says a larger margin generally corresponds to lower classifier generalisation error, so the closest points deserve special attention.',
        title: 'The nearest points define the margin evidence',
      },
      vi: {
        body: 'Nguyên nhân: mặt phân tách được đánh giá bằng khoảng cách tới các điểm train gần nhất của mỗi lớp, gọi là margin hàm. Kết quả: hướng dẫn nêu margin lớn hơn nhìn chung tương ứng với lỗi tổng quát hóa classifier thấp hơn, nên các điểm gần nhất cần được chú ý đặc biệt.',
        title: 'Các điểm gần nhất xác định bằng chứng margin',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-support-vector-question',
    locales: {
      en: {
        lede: 'Not every training point constrains the same separating boundary. The points on the margin boundaries are the support vectors in the linearly separable illustration.',
        navigationTitle: 'Identify support vectors',
        title: 'Find the points that constrain the separator',
      },
      vi: {
        lede: 'Không phải mọi điểm train đều ràng buộc mặt phân tách như nhau. Các điểm trên biên margin là support vector trong minh họa phân tách tuyến tính.',
        navigationTitle: 'Xác định support vector',
        title: 'Tìm các điểm ràng buộc mặt phân tách',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-support-vector-reading',
    locales: {
      en: {
        markdown:
          'For a linearly separable problem, the guide calls the training samples on the margin boundaries support vectors. When the problem is not linearly separable, support vectors lie within the margin boundaries. Record that geometry instead of saying every point is equally decisive.',
      },
      vi: {
        markdown:
          'Với bài toán phân tách tuyến tính, hướng dẫn gọi các mẫu train nằm trên biên margin là support vector. Khi bài toán không phân tách tuyến tính, support vector nằm trong các biên margin. Hãy ghi hình học đó thay vì nói mọi điểm đều quyết định như nhau.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM07SvmBlockDefaults,
    activityId: 'act-cml-p12-svm-example',
    id: 'svm-fixed-margin-example',
    locales: {
      en: {
        description:
          'Inspect a fixed two-class coordinate sketch. The displayed separator has one class-0 point and two class-1 points nearest its margin boundaries; mark those three as support vectors, then explain why moving a distant point need not change this illustrative separator. This is a static geometry exercise, not a live scoring or classification service.',
        navigationTitle: 'Inspect fixed margin points',
      },
      vi: {
        description:
          'Quan sát phác thảo tọa độ hai lớp cố định. Mặt phân tách hiển thị có một điểm lớp 0 và hai điểm lớp 1 gần nhất với biên margin; đánh dấu ba điểm đó là support vector, rồi giải thích vì sao di chuyển một điểm xa không nhất thiết thay đổi mặt phân tách minh họa này. Đây là bài tập hình học tĩnh, không phải dịch vụ chấm điểm hoặc phân loại live.',
        navigationTitle: 'Quan sát các điểm margin cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-penalty-question',
    locales: {
      en: {
        lede: 'Real classes are not always perfectly separable. The SVM objective therefore makes the trade-off between a wide margin and margin errors explicit rather than pretending a perfect line always exists.',
        navigationTitle: 'Read the trade-off',
        title: 'Separate margin width from margin errors',
      },
      vi: {
        lede: 'Các lớp thật không phải lúc nào cũng phân tách hoàn hảo. Vì vậy mục tiêu SVM làm rõ đánh đổi giữa margin rộng và lỗi margin thay vì giả vờ luôn có đường hoàn hảo.',
        navigationTitle: 'Đọc đánh đổi',
        title: 'Tách độ rộng margin khỏi lỗi margin',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-penalty-kernel-reading',
    locales: {
      en: {
        markdown:
          'The guide explains that samples can be misclassified or lie within a margin boundary when perfect separation is unavailable; parameter C controls the penalty strength and acts as an inverse regularisation parameter in that formulation. It also describes kernels as implicitly mapping vectors into a higher-dimensional space. Name the chosen kernel and penalty setting rather than treating either as invisible.',
      },
      vi: {
        markdown:
          'Hướng dẫn giải thích các mẫu có thể bị phân loại sai hoặc nằm trong biên margin khi không thể phân tách hoàn hảo; tham số C kiểm soát cường độ penalty và đóng vai trò tham số regularization nghịch trong công thức đó. Hướng dẫn cũng mô tả kernel ánh xạ ngầm vector vào không gian nhiều chiều hơn. Hãy nêu kernel và cài đặt penalty đã chọn thay vì coi chúng là vô hình.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-review-summary',
    locales: {
      en: {
        body: 'Review an SVM by recording the support-vector geometry, margin interpretation, kernel, penalty setting, and held-out evidence. This explains the chosen boundary without claiming that a fixed diagram decides a real person or event.',
        title: 'Keep geometry and model choices reviewable',
      },
      vi: {
        body: 'Review một SVM bằng cách ghi hình học support vector, cách diễn giải margin, kernel, cài đặt penalty và bằng chứng giữ lại. Việc này giải thích ranh giới đã chọn mà không khẳng định sơ đồ cố định quyết định một người hay sự kiện thật.',
        title: 'Giữ hình học và lựa chọn mô hình có thể review',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM07SvmBlockDefaults,
    id: 'svm-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM07SvmSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM07SvmSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM07SvmSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM07SvmSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Support Vector Machines — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/svm.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM08KmeansFullLessonBlocks = [
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-unlabelled-groups-question',
    locales: {
      en: {
        lede: 'Start with observations that have coordinates but no class labels. The question is not which known class each point belongs to; it is whether nearby observations can be described as a small number of groups.',
        navigationTitle: 'Frame an unlabelled grouping question',
        title: 'Group observations without class labels',
      },
      vi: {
        lede: 'Bắt đầu với các quan sát có tọa độ nhưng không có nhãn lớp. Câu hỏi không phải mỗi điểm thuộc lớp đã biết nào; đó là liệu các quan sát gần nhau có thể được mô tả bằng một số nhóm nhỏ hay không.',
        navigationTitle: 'Đặt câu hỏi gom nhóm không nhãn',
        title: 'Gom các quan sát không có nhãn lớp',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-centroid-and-k',
    locales: {
      en: {
        markdown:
          'The pinned guide describes K-means as partitioning N samples into K disjoint clusters, each described by a mean called a centroid. K must be chosen for the question being asked, and a centroid is not required to be one of the original samples.',
      },
      vi: {
        markdown:
          'Hướng dẫn đã pin mô tả K-means là phân hoạch N mẫu thành K cụm rời nhau, mỗi cụm được mô tả bằng một trung bình gọi là centroid. Phải chọn K cho câu hỏi đang đặt ra, và centroid không bắt buộc là một mẫu gốc.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-inertia-cause-effect',
    locales: {
      en: {
        body: 'Cause: K-means seeks low within-cluster sum of squares, commonly called inertia. Effect: a lower inertia says the displayed points are closer to their assigned centroids in this fixture; it does not by itself prove that this K is uniquely correct.',
        title: 'Read inertia as compactness evidence, not a verdict',
      },
      vi: {
        body: 'Nguyên nhân: K-means tìm tổng bình phương trong cụm thấp, thường gọi là inertia. Hệ quả: inertia thấp hơn cho biết các điểm hiển thị gần centroid được gán hơn trong fixture này; tự nó không chứng minh K đã chọn là duy nhất đúng.',
        title: 'Đọc inertia như bằng chứng độ gọn, không phải phán quyết',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-assignment-question',
    locales: {
      en: {
        lede: 'One K-means iteration has a visible cause-and-effect loop: assign each point to its nearest current centroid, then replace each centroid with the mean of the points assigned to it.',
        navigationTitle: 'Follow assignment and update',
        title: 'Assign first, then update the centroids',
      },
      vi: {
        lede: 'Một vòng lặp K-means có chuỗi nguyên nhân-kết quả nhìn thấy được: gán mỗi điểm cho centroid hiện tại gần nhất, rồi thay mỗi centroid bằng trung bình của các điểm đã gán vào nó.',
        navigationTitle: 'Theo dõi gán và cập nhật',
        title: 'Gán trước, rồi cập nhật các centroid',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-repeat-until-stable',
    locales: {
      en: {
        markdown:
          'After updated means are calculated, the assignment-and-update steps repeat until centroid movement falls below a threshold. The guide warns that this convergence can be a local minimum and depends on the initial centroids, so record the initialization rather than hiding it.',
      },
      vi: {
        markdown:
          'Sau khi tính các trung bình đã cập nhật, hai bước gán-cập nhật lặp lại đến khi dịch chuyển centroid thấp hơn ngưỡng. Hướng dẫn lưu ý sự hội tụ này có thể là cực tiểu cục bộ và phụ thuộc centroid khởi tạo, nên hãy ghi cách khởi tạo thay vì che giấu nó.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    activityId: 'act-cml-p13-kmeans-example',
    id: 'kmeans-fixed-coordinate-example',
    locales: {
      en: {
        description:
          'Inspect the fixed anonymous points (0, 0), (0, 1), (1, 0), and (1, 1) with K = 2. First state which displayed centroid is nearest to each point, then state how the mean of each assigned group would become the next centroid. The fixture is a static teaching table, not a live clustering service or an astronomy claim.',
        navigationTitle: 'Inspect a fixed K-means pass',
      },
      vi: {
        description:
          'Quan sát các điểm ẩn danh cố định (0, 0), (0, 1), (1, 0), và (1, 1) với K = 2. Trước hết nêu centroid hiển thị nào gần từng điểm nhất, rồi nêu trung bình của mỗi nhóm đã gán sẽ trở thành centroid kế tiếp ra sao. Fixture là bảng dạy học tĩnh, không phải dịch vụ phân cụm live hay khẳng định thiên văn.',
        navigationTitle: 'Quan sát một lượt K-means cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-shape-limitation-question',
    locales: {
      en: {
        lede: 'Before comparing cluster counts, ask whether the displayed shape matches the geometry K-means assumes. A compact score can mislead when the groups are long, curved, or otherwise irregular.',
        navigationTitle: 'Check the geometry assumption',
        title: 'Do not let one compactness score hide shape',
      },
      vi: {
        lede: 'Trước khi so sánh số cụm, hãy hỏi liệu hình dạng hiển thị có khớp với hình học K-means giả định không. Một điểm độ gọn có thể gây hiểu lầm khi nhóm dài, cong hoặc bất quy tắc.',
        navigationTitle: 'Kiểm tra giả định hình học',
        title: 'Đừng để một điểm độ gọn che khuất hình dạng',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-inertia-limitation',
    locales: {
      en: {
        markdown:
          'The guide notes that inertia assumes convex, isotropic clusters and can perform poorly for elongated or irregular clusters. It is also not normalized, so it can rise with dimensionality. Compare it with the plotted geometry and the stated K instead of treating a smaller number as a universal quality certificate.',
      },
      vi: {
        markdown:
          'Hướng dẫn nêu inertia giả định các cụm lồi, đẳng hướng và có thể hoạt động kém với cụm kéo dài hoặc bất quy tắc. Nó cũng không được chuẩn hóa nên có thể tăng theo số chiều. Hãy so sánh nó với hình học đã vẽ và K đã nêu thay vì coi số nhỏ hơn là chứng chỉ chất lượng phổ quát.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-review-summary',
    locales: {
      en: {
        body: 'A reviewable K-means result names K, the initialization, the assignment-and-update sequence, inertia, and a shape limitation. That chain lets another learner check why a fixed grouping was shown without claiming it discovers a real-world truth.',
        title: 'Make a fixed grouping reproducible',
      },
      vi: {
        body: 'Một kết quả K-means có thể review nêu K, cách khởi tạo, chuỗi gán-cập nhật, inertia và một giới hạn hình dạng. Chuỗi đó cho người học khác kiểm tra vì sao một cách gom nhóm cố định được hiển thị mà không khẳng định nó khám phá sự thật ngoài đời.',
        title: 'Làm cho cách gom nhóm cố định có thể tái lập',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM08KmeansBlockDefaults,
    id: 'kmeans-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM08ClusteringSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM08ClusteringSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM08ClusteringSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM08ClusteringSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Clustering — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/clustering.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM08HierarchicalFullLessonBlocks = [
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-nested-groups-question',
    locales: {
      en: {
        lede: 'Hierarchical clustering does not begin by declaring one final number of groups. It builds a nested sequence so the learner can inspect which observations join early and which only join later.',
        navigationTitle: 'Frame nested grouping',
        title: 'Build groups as a visible hierarchy',
      },
      vi: {
        lede: 'Phân cụm phân cấp không bắt đầu bằng cách tuyên bố một số nhóm cuối cùng. Nó tạo chuỗi lồng nhau để người học quan sát quan sát nào nhập sớm và quan sát nào chỉ nhập muộn.',
        navigationTitle: 'Đặt khung gom nhóm lồng nhau',
        title: 'Xây nhóm thành một hệ phân cấp hiển thị',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-dendrogram-reading',
    locales: {
      en: {
        markdown:
          'The pinned guide describes hierarchical clustering as a family of methods that build nested clusters by successive merging or splitting. A dendrogram represents that hierarchy: its root contains every sample and its leaves are individual samples.',
      },
      vi: {
        markdown:
          'Hướng dẫn đã pin mô tả phân cụm phân cấp là họ phương pháp xây cụm lồng nhau bằng cách gộp hoặc tách liên tiếp. Dendrogram biểu diễn hệ phân cấp đó: gốc chứa mọi mẫu và các lá là từng mẫu riêng lẻ.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-agglomerative-cause-effect',
    locales: {
      en: {
        body: 'Cause: in agglomerative clustering, each observation starts as its own cluster and clusters are successively merged. Effect: the merge order becomes inspectable evidence, so a later cut can be explained from the joins rather than chosen as an unexplained label.',
        title: 'Let bottom-up merges leave an audit trail',
      },
      vi: {
        body: 'Nguyên nhân: trong phân cụm kết tụ, mỗi quan sát bắt đầu là một cụm riêng và các cụm được gộp liên tiếp. Hệ quả: thứ tự gộp trở thành bằng chứng có thể quan sát, nên mức cắt sau đó có thể được giải thích từ các lần nhập thay vì là một nhãn không rõ nguyên nhân.',
        title: 'Để các lần gộp từ dưới lên tạo dấu vết',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-linkage-question',
    locales: {
      en: {
        lede: 'The next merge depends on linkage: a rule for measuring distance between candidate clusters. Naming linkage is essential because different linkage rules can tell different merge stories for the same points.',
        navigationTitle: 'Name the linkage rule',
        title: 'Choose how two candidate clusters are compared',
      },
      vi: {
        lede: 'Lần gộp kế tiếp phụ thuộc vào linkage: quy tắc đo khoảng cách giữa các cụm ứng viên. Phải nêu linkage vì các quy tắc linkage khác nhau có thể kể câu chuyện gộp khác nhau cho cùng các điểm.',
        navigationTitle: 'Nêu quy tắc linkage',
        title: 'Chọn cách so sánh hai cụm ứng viên',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-linkage-types',
    locales: {
      en: {
        markdown:
          'The guide distinguishes Ward linkage, which minimizes the sum of squared distances within clusters, complete linkage, which uses the largest between-cluster distance, average linkage, which uses an average distance, and single linkage, which uses the closest distance. The rule changes which merge is justified next.',
      },
      vi: {
        markdown:
          'Hướng dẫn phân biệt linkage Ward, giảm tổng bình phương khoảng cách trong cụm; complete linkage, dùng khoảng cách lớn nhất giữa cụm; average linkage, dùng khoảng cách trung bình; và single linkage, dùng khoảng cách gần nhất. Quy tắc thay đổi lần gộp nào được biện minh tiếp theo.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    activityId: 'act-cml-p14-hierarchical-clustering-example',
    id: 'hierarchical-fixed-merge-example',
    locales: {
      en: {
        description:
          'Read the same four fixed anonymous coordinates as a bottom-up merge sketch. First keep each point separate, then state one nearby pair that could merge under a named linkage, and finally explain why a dendrogram cut should cite the merge level rather than turn cluster IDs into ground-truth classes. This is a static instructional trace, not a live segmenter.',
        navigationTitle: 'Inspect a fixed merge sequence',
      },
      vi: {
        description:
          'Đọc cùng bốn tọa độ ẩn danh cố định như phác thảo gộp từ dưới lên. Trước hết giữ từng điểm riêng, rồi nêu một cặp gần nhau có thể nhập theo linkage đã nêu, và cuối cùng giải thích vì sao mức cắt dendrogram phải viện dẫn mức gộp thay vì biến ID cụm thành lớp sự thật. Đây là dấu vết dạy học tĩnh, không phải bộ phân khúc live.',
        navigationTitle: 'Quan sát chuỗi gộp cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-dendrogram-cut-question',
    locales: {
      en: {
        lede: 'A dendrogram makes a cut decision visible. The learner should identify the displayed merge level, linkage, and distance basis before saying how many clusters are retained.',
        navigationTitle: 'Read a cut from the hierarchy',
        title: 'Choose a cut after reading the merges',
      },
      vi: {
        lede: 'Dendrogram làm quyết định cắt trở nên nhìn thấy được. Người học nên xác định mức gộp hiển thị, linkage và cơ sở khoảng cách trước khi nói giữ lại bao nhiêu cụm.',
        navigationTitle: 'Đọc mức cắt từ hệ phân cấp',
        title: 'Chọn mức cắt sau khi đọc các lần gộp',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-dendrogram-limitation',
    locales: {
      en: {
        markdown:
          'The guide notes that visual inspection of a dendrogram can be useful, especially with small sample sizes. Treat that picture as an aid to a stated linkage and distance choice; it is not a license to infer a real category from an arbitrary cluster label.',
      },
      vi: {
        markdown:
          'Hướng dẫn nêu quan sát trực quan dendrogram có thể hữu ích, đặc biệt với cỡ mẫu nhỏ. Hãy coi bức hình đó là trợ giúp cho lựa chọn linkage và khoảng cách đã nêu; nó không cho phép suy ra một loại thực tế từ nhãn cụm tùy ý.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-review-summary',
    locales: {
      en: {
        body: 'A reviewable hierarchical result records the bottom-up merge sequence, linkage, distance basis, and cut level. Those details explain why the fixed tree is read one way and make a competing reading possible to discuss.',
        title: 'Keep the hierarchy open to review',
      },
      vi: {
        body: 'Một kết quả phân cấp có thể review ghi chuỗi gộp từ dưới lên, linkage, cơ sở khoảng cách và mức cắt. Các chi tiết đó giải thích vì sao cây cố định được đọc theo một cách và cho phép thảo luận một cách đọc cạnh tranh.',
        title: 'Giữ hệ phân cấp mở để review',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM08HierarchicalBlockDefaults,
    id: 'hierarchical-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM08ClusteringSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM08ClusteringSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM08ClusteringSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM08ClusteringSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Clustering — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/clustering.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const cmlM09PcaFullLessonBlocks = [
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-correlated-signal-question',
    locales: {
      en: {
        lede: 'When several numeric features move together, a learner may want a shorter view of their shared variation. PCA changes the coordinate system for that view; it does not turn the rows into known classes or make a real-world decision.',
        navigationTitle: 'Frame shared variation',
        title: 'Reduce a correlated signal without inventing labels',
      },
      vi: {
        lede: 'Khi nhiều feature số thay đổi cùng nhau, người học có thể muốn một góc nhìn ngắn hơn về biến thiên chung của chúng. PCA đổi hệ tọa độ cho góc nhìn đó; nó không biến các hàng thành lớp đã biết hoặc đưa ra quyết định ngoài đời.',
        navigationTitle: 'Đặt khung biến thiên chung',
        title: 'Giảm một tín hiệu tương quan mà không bịa ra nhãn',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-orthogonal-components',
    locales: {
      en: {
        markdown:
          'The pinned guide describes PCA as decomposing a multivariate dataset into successive orthogonal components that explain a maximum amount of variance. A fitted PCA transformer learns n components and can project new data onto them.',
      },
      vi: {
        markdown:
          'Hướng dẫn đã pin mô tả PCA là phân rã một tập dữ liệu đa biến thành các component trực giao liên tiếp giải thích lượng phương sai tối đa. Một transformer PCA đã fit học n component và có thể chiếu dữ liệu mới lên chúng.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-projection-cause-effect',
    locales: {
      en: {
        body: 'Cause: keep only the first components that explain more variance and drop components tied to lower singular values. Effect: the representation has fewer dimensions while retaining much of the explained variance, but it is a reduced view rather than a guarantee that no information was discarded.',
        title: 'Trade dimensions for a stated amount of variation',
      },
      vi: {
        body: 'Nguyên nhân: giữ các component đầu giải thích nhiều phương sai hơn và bỏ component gắn với singular value thấp hơn. Hệ quả: biểu diễn có ít chiều hơn trong khi giữ phần lớn phương sai đã giải thích, nhưng đó là góc nhìn rút gọn chứ không đảm bảo không mất thông tin.',
        title: 'Đánh đổi số chiều để giữ lượng biến thiên đã nêu',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-centering-question',
    locales: {
      en: {
        lede: 'Before reading a projection, identify what happened to each feature. Centering and scaling are different operations, so a component plot is incomplete when it hides the preprocessing choice.',
        navigationTitle: 'Check preprocessing before projection',
        title: 'Separate centering from scaling',
      },
      vi: {
        lede: 'Trước khi đọc phép chiếu, hãy xác định điều gì xảy ra với từng feature. Centering và scaling là hai thao tác khác nhau, nên biểu đồ component chưa đầy đủ khi che giấu lựa chọn tiền xử lý.',
        navigationTitle: 'Kiểm tra tiền xử lý trước phép chiếu',
        title: 'Tách centering khỏi scaling',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-centering-scaling-reading',
    locales: {
      en: {
        markdown:
          'In the pinned scikit-learn account, PCA centers each feature before SVD but does not scale it automatically. The optional whiten setting projects into the singular space while scaling each component to unit variance; name that choice when a downstream method assumes isotropic signals.',
      },
      vi: {
        markdown:
          'Trong cách mô tả scikit-learn đã pin, PCA center từng feature trước SVD nhưng không tự scale nó. Tùy chọn whiten chiếu vào không gian singular đồng thời scale từng component về phương sai đơn vị; hãy nêu lựa chọn này khi phương pháp phía sau giả định tín hiệu đẳng hướng.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...cmlM09PcaBlockDefaults,
    activityId: 'act-cml-p15-pca-example',
    id: 'pca-fixed-sensor-fixture',
    locales: {
      en: {
        description:
          'Inspect four synthetic paired measurements: (1, 1), (2, 2), (3, 3), and (4, 4). State that the fixture uses one retained component only to make a one-dimensional projection discussion visible; first name centering, then name the retained direction, and finally state that reducing to one component omits another direction of variation. The row IDs in the fixture are not claimed numerical PCA scores and the data are not readings from real sensors.',
        navigationTitle: 'Inspect a fixed one-component projection',
      },
      vi: {
        description:
          'Quan sát bốn phép đo cặp tổng hợp: (1, 1), (2, 2), (3, 3), và (4, 4). Nêu rằng fixture chỉ giữ một component để làm rõ thảo luận về phép chiếu một chiều; trước hết nêu centering, rồi nêu hướng được giữ, và cuối cùng nói giảm còn một component sẽ bỏ một hướng biến thiên khác. ID hàng trong fixture không được khẳng định là điểm PCA số học và dữ liệu không phải số đo cảm biến thật.',
        navigationTitle: 'Quan sát phép chiếu một component cố định',
      },
    },
    order: 6,
    type: 'example',
  },
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-retained-components-question',
    locales: {
      en: {
        lede: 'Choosing n_components is a model decision. It makes explicit how many directions will be kept, so a shorter display must also state what amount of explained variance it preserves.',
        navigationTitle: 'Name the retained dimension',
        title: 'Keep a stated number of components',
      },
      vi: {
        lede: 'Chọn n_components là quyết định mô hình. Nó làm rõ bao nhiêu hướng sẽ được giữ, nên một hiển thị ngắn hơn cũng phải nêu lượng phương sai đã giải thích mà nó giữ lại.',
        navigationTitle: 'Nêu số chiều được giữ',
        title: 'Giữ một số component đã nêu',
      },
    },
    order: 7,
    type: 'heading',
  },
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-approximation-limitation',
    locales: {
      en: {
        markdown:
          'Lower-dimensional PCA is useful because it can retain most explained variance while dropping lower-singular-value components. It is still an approximation: the pinned guide notes that randomized PCA inverse_transform is not an exact inverse of transform even with the default non-whitened setting. Do not call a compressed reconstruction exact without the appropriate evidence.',
      },
      vi: {
        markdown:
          'PCA ít chiều hữu ích vì có thể giữ phần lớn phương sai đã giải thích trong khi bỏ component có singular value thấp. Nó vẫn là xấp xỉ: hướng dẫn đã pin nêu inverse_transform của PCA randomized không phải nghịch đảo chính xác của transform ngay cả với cài đặt mặc định không whiten. Đừng gọi tái dựng nén là chính xác nếu không có bằng chứng phù hợp.',
      },
    },
    order: 8,
    type: 'markdown',
  },
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-review-summary',
    locales: {
      en: {
        body: 'Make a PCA projection reviewable by recording feature centering and scaling choices, retained component count, explained variance, and whether a reconstruction is approximate. Those details explain the shorter view without pretending the projection is a ground-truth category or an exact copy of the original rows.',
        title: 'Keep a reduced view accountable',
      },
      vi: {
        body: 'Làm phép chiếu PCA có thể review bằng cách ghi lựa chọn center và scale feature, số component giữ lại, phương sai đã giải thích và việc tái dựng có phải xấp xỉ hay không. Các chi tiết đó giải thích góc nhìn ngắn hơn mà không giả vờ phép chiếu là loại sự thật hoặc bản sao chính xác của các hàng gốc.',
        title: 'Giữ góc nhìn rút gọn có thể đối chiếu',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...cmlM09PcaBlockDefaults,
    id: 'pca-sources',
    locales: {
      en: {
        heading: 'Sources used for this lesson',
        intro:
          'This concise original lesson is adapted from a pinned local snapshot of the document below; source review is still pending.',
        navigationTitle: 'Lesson sources',
      },
      vi: {
        heading: 'Nguồn dùng cho bài học này',
        intro:
          'Bài diễn giải ngắn gọn này được chuyển thể từ snapshot cục bộ đã pin của tài liệu bên dưới; review nguồn vẫn đang chờ.',
        navigationTitle: 'Nguồn bài học',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: cmlM09PcaSourceTrace.sourceSnapshots[0].attribution,
        language: 'en',
        license: cmlM09PcaSourceTrace.sourceSnapshots[0].license,
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: cmlM09PcaSourceTrace.sourceSnapshots[0].sourceId,
        sourceName: cmlM09PcaSourceTrace.sourceSnapshots[0].sourceName,
        title: 'Decomposing signals in components — scikit-learn User Guide',
        url: 'https://scikit-learn.org/stable/modules/decomposition.html',
      },
    ],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

const trialPosts = [
  {
    accessLevel: 'trial',
    blocks: trialBlocks,
    courseId: 'course-deep-learning-basic',
    description: {
      en: 'Trace a binary decision from feature values through a weighted score and step activation.',
      vi: 'Theo dõi một quyết định nhị phân từ giá trị feature qua tổng có trọng số đến hàm bước.',
    },
    durationMinutes: 8,
    id: TRIAL_POST_ID,
    learningObjective: {
      en: 'Compute a fixed two-input Perceptron decision and explain how weights, bias, and activation determine its binary output.',
      vi: 'Tính một quyết định Perceptron hai đầu vào cố định và giải thích cách trọng số, độ lệch, hàm kích hoạt quyết định đầu ra nhị phân.',
    },
    moduleId: 'dl-m01-neuron-perceptron',
    postQuizId: 'quiz-post-dl-p01',
    provenance: {
      ...createDraftProvenance('course-deep-learning-basic'),
      candidateSourceIds: DL_M01_SOURCE_IDS,
      sourceTrace: dlM01SourceTrace,
    },
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-neuron-decision-rule',
    title: {
      en: 'How does a neuron make a decision?',
      vi: 'Một neuron đưa ra quyết định như thế nào?',
    },
  },
  {
    accessLevel: 'trial',
    blocks: cmlM01ProblemFullLessonBlocks.slice(0, 6),
    courseId: 'course-classical-ml',
    description: {
      en: 'Preview a source-backed way to turn a decision into a target, evidence, and learning task before choosing an algorithm.',
      vi: 'Xem trước cách có nguồn dẫn để biến quyết định thành mục tiêu, bằng chứng và nhiệm vụ học trước khi chọn thuật toán.',
    },
    durationMinutes: 8,
    id: CML_M01_PROBLEM_POST_ID,
    learningObjective: {
      en: 'Identify a decision, its target, and available features, then distinguish a supervised prediction from an unlabeled grouping task.',
      vi: 'Xác định quyết định, mục tiêu và feature sẵn có, rồi phân biệt dự đoán có giám sát với nhiệm vụ gom nhóm không nhãn.',
    },
    moduleId: 'cml-m01-foundations',
    postQuizId: 'quiz-post-cml-p01',
    provenance: cmlM01DraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'trial-problem-framing-before-algorithm-choice',
    title: {
      en: 'Start from a decision, not an algorithm',
      vi: 'Bắt đầu từ quyết định, không phải thuật toán',
    },
  },
] satisfies readonly TrialPost[];

const fullLessonPosts: readonly TrialPost[] = [
  {
    ...trialPosts[0]!,
    accessLevel: 'full',
    blocks: fullLessonBlocks,
    description: {
      en: 'Move from one binary Perceptron decision to the linear limit that motivates a hidden layer.',
      vi: 'Đi từ một quyết định Perceptron nhị phân đến giới hạn tuyến tính gợi ý hidden layer.',
    },
    durationMinutes: 16,
  },
  {
    accessLevel: 'full',
    blocks: mlpFullLessonBlocks,
    courseId: 'course-deep-learning-basic',
    description: {
      en: 'Use a fixed checkerboard to connect hidden affine transformations, nonlinear activation, and the final MLP prediction.',
      vi: 'Dùng bàn cờ cố định để nối biến đổi affine ẩn, kích hoạt phi tuyến và dự đoán MLP cuối cùng.',
    },
    durationMinutes: 16,
    id: MLP_POST_ID,
    learningObjective: {
      en: 'Explain why an MLP needs a nonlinear hidden activation to represent the fixed checkerboard before its output layer predicts.',
      vi: 'Giải thích vì sao MLP cần kích hoạt phi tuyến ở hidden layer để biểu diễn bàn cờ cố định trước khi lớp đầu ra dự đoán.',
    },
    moduleId: 'dl-m02-mlp',
    postQuizId: 'quiz-post-dl-p02',
    provenance: {
      ...createDraftProvenance('course-deep-learning-basic'),
      candidateSourceIds: DL_M02_SOURCE_IDS,
      sourceTrace: dlM02SourceTrace,
    },
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-mlp-checkerboard-hidden-activation',
    title: {
      en: 'How a hidden layer reshapes a decision',
      vi: 'Hidden layer định hình lại quyết định thế nào',
    },
  },
  {
    accessLevel: 'full',
    blocks: trainingFullLessonBlocks,
    courseId: 'course-deep-learning-basic',
    description: {
      en: 'Connect forward values, reverse gradients, and train-versus-validation evidence before deciding whether more fitting generalises.',
      vi: 'Nối giá trị truyền xuôi, gradient truyền ngược và bằng chứng train–validation trước khi quyết định khớp thêm có tổng quát hay không.',
    },
    durationMinutes: 16,
    id: TRAINING_POST_ID,
    learningObjective: {
      en: 'Explain how backpropagation follows a computational graph in reverse and use train/validation loss evidence to distinguish underfitting from overfitting.',
      vi: 'Giải thích cách lan truyền ngược đi theo đồ thị tính toán theo chiều đảo và dùng bằng chứng loss train/validation để phân biệt underfitting với overfitting.',
    },
    moduleId: 'dl-m03-training-generalization',
    postQuizId: 'quiz-post-dl-p03',
    provenance: {
      ...createDraftProvenance('course-deep-learning-basic'),
      candidateSourceIds: DL_M03_SOURCE_IDS,
      sourceTrace: dlM03SourceTrace,
    },
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-training-gradient-and-generalisation-gap',
    title: {
      en: 'How gradients and validation evidence guide training',
      vi: 'Gradient và bằng chứng validation định hướng huấn luyện',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM01ProblemFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Turn a decision into a defensible learning task by separating its target, available evidence, output type, and label status.',
      vi: 'Biến một quyết định thành nhiệm vụ học có cơ sở bằng cách tách mục tiêu, bằng chứng sẵn có, kiểu đầu ra và trạng thái nhãn.',
    },
    durationMinutes: 15,
    id: CML_M01_PROBLEM_POST_ID,
    learningObjective: {
      en: 'Frame a learning task from the decision, distinguish a target from features, and choose supervised prediction or unlabeled grouping from the available evidence.',
      vi: 'Đặt khung nhiệm vụ học từ quyết định, phân biệt mục tiêu với feature và chọn dự đoán có giám sát hoặc gom nhóm không nhãn từ bằng chứng sẵn có.',
    },
    moduleId: 'cml-m01-foundations',
    postQuizId: 'quiz-post-cml-p01',
    provenance: cmlM01DraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-problem-framing-target-feature-supervision',
    title: {
      en: 'Frame a learning problem before choosing an algorithm',
      vi: 'Đặt khung bài toán học trước khi chọn thuật toán',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM01EvaluationFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Use a held-out split and decision-aware metric to turn a model score into evidence rather than an unsupported claim.',
      vi: 'Dùng phần giữ lại và metric theo quyết định để biến điểm mô hình thành bằng chứng thay vì một khẳng định thiếu cơ sở.',
    },
    durationMinutes: 15,
    id: CML_M01_EVALUATION_POST_ID,
    learningObjective: {
      en: 'Explain why a held-out test set differs from training data and select evaluation evidence by the consequence of each error type.',
      vi: 'Giải thích vì sao tập test giữ lại khác dữ liệu train và chọn bằng chứng đánh giá theo hậu quả của từng loại lỗi.',
    },
    moduleId: 'cml-m01-foundations',
    postQuizId: 'quiz-post-cml-p02',
    provenance: cmlM01DraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-held-out-evidence-and-error-consequences',
    title: {
      en: 'Test a claim with held-out evidence',
      vi: 'Kiểm tra khẳng định bằng bằng chứng giữ lại',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM02LinearFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Read a straight numerical baseline through its coefficients, residuals, and held-out error before claiming it is useful for a new case.',
      vi: 'Đọc baseline số đường thẳng qua hệ số, phần dư và lỗi giữ lại trước khi khẳng định nó hữu ích cho trường hợp mới.',
    },
    durationMinutes: 16,
    id: CML_M02_LINEAR_POST_ID,
    learningObjective: {
      en: 'Explain a linear prediction, interpret a residual, and use held-out RMSE evidence to decide whether the straight baseline is adequate.',
      vi: 'Giải thích dự đoán tuyến tính, diễn giải phần dư và dùng bằng chứng RMSE giữ lại để quyết định baseline đường thẳng có đủ hay không.',
    },
    moduleId: 'cml-m02-linear-polynomial',
    postQuizId: 'quiz-post-cml-p03',
    provenance: cmlM02DraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-linear-residual-and-heldout-evidence',
    title: {
      en: 'Read a linear baseline through residual evidence',
      vi: 'Đọc baseline tuyến tính qua bằng chứng phần dư',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM02PolynomialFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Treat polynomial curvature as a testable representation change and compare it with a straight line on the same held-out evidence.',
      vi: 'Xem độ cong đa thức là thay đổi biểu diễn có thể kiểm tra và so sánh nó với đường thẳng trên cùng bằng chứng giữ lại.',
    },
    durationMinutes: 16,
    id: CML_M02_POLYNOMIAL_POST_ID,
    learningObjective: {
      en: 'Explain what a degree-two feature adds and use residual and held-out comparisons to decide whether polynomial complexity is justified.',
      vi: 'Giải thích feature bậc hai thêm gì và dùng so sánh phần dư cùng giữ lại để quyết định độ phức tạp đa thức có chính đáng không.',
    },
    moduleId: 'cml-m02-linear-polynomial',
    postQuizId: 'quiz-post-cml-p04',
    provenance: cmlM02DraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-polynomial-curvature-heldout-comparison',
    title: {
      en: 'Test whether polynomial curvature earns its complexity',
      vi: 'Kiểm tra độ cong đa thức có xứng đáng độ phức tạp',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM03RegularizationFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Use fixed Ridge and Lasso evidence to distinguish coefficient shrinkage from sparse selection, then choose alpha through held-out validation rather than a training-only preference.',
      vi: 'Dùng bằng chứng Ridge và Lasso cố định để phân biệt shrinkage hệ số với lựa chọn thưa, rồi chọn alpha qua validation giữ lại thay vì ưu tiên chỉ từ train.',
    },
    durationMinutes: 16,
    id: CML_M03_REGULARIZATION_POST_ID,
    learningObjective: {
      en: 'Explain how Ridge and Lasso alter coefficients, and select a regularization strength from held-out evidence instead of one apparent training fit.',
      vi: 'Giải thích Ridge và Lasso thay đổi hệ số thế nào, rồi chọn độ regularization từ bằng chứng giữ lại thay vì một độ khớp train có vẻ tốt.',
    },
    moduleId: 'cml-m03-ridge-lasso',
    postQuizId: 'quiz-post-cml-p05',
    provenance: cmlM03DraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-ridge-lasso-alpha-heldout-evidence',
    title: {
      en: 'Choose shrinkage and sparsity from evidence',
      vi: 'Chọn shrinkage và tính thưa từ bằng chứng',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM04LogisticFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Read a fixed logistic score through its sigmoid range and visible class rule, then separate that score from any real-world decision policy.',
      vi: 'Đọc điểm logistic cố định qua khoảng sigmoid và quy tắc lớp hiển thị, rồi tách điểm đó khỏi bất kỳ chính sách quyết định thực tế nào.',
    },
    durationMinutes: 16,
    id: CML_M04_LOGISTIC_POST_ID,
    learningObjective: {
      en: 'Distinguish a binary logistic score from a continuous prediction and explain how a visible threshold turns the score into a fixed category.',
      vi: 'Phân biệt điểm logistic nhị phân với dự đoán liên tục và giải thích ngưỡng hiển thị biến điểm thành category cố định thế nào.',
    },
    moduleId: 'cml-m04-logistic-classification',
    postQuizId: 'quiz-post-cml-p06',
    provenance: cmlM04LogisticDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-logistic-sigmoid-score-and-fixed-threshold',
    title: {
      en: 'Read a logistic score before its class rule',
      vi: 'Đọc điểm logistic trước quy tắc lớp',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM04MetricsFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Use a fixed confusion table to connect threshold outcomes with accuracy, precision, and recall, then select evidence from the error consequence that matters.',
      vi: 'Dùng bảng confusion cố định để nối kết quả ngưỡng với accuracy, precision và recall, rồi chọn bằng chứng từ hậu quả lỗi thực sự quan trọng.',
    },
    durationMinutes: 16,
    id: CML_M04_METRICS_POST_ID,
    learningObjective: {
      en: 'Read a confusion matrix and choose accuracy, precision, or recall from the false-positive and false-negative consequence being evaluated.',
      vi: 'Đọc confusion matrix và chọn accuracy, precision hoặc recall từ hậu quả false positive và false negative đang được đánh giá.',
    },
    moduleId: 'cml-m04-logistic-classification',
    postQuizId: 'quiz-post-cml-p07',
    provenance: cmlM04MetricsDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-confusion-matrix-metric-error-consequence',
    title: {
      en: 'Choose a classification metric from the error trade-off',
      vi: 'Chọn metric phân loại từ đánh đổi lỗi',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM05KnnFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Trace a fixed nearest-neighbour vote from a query point, through visible distances, to a reproducible local class decision.',
      vi: 'Lần theo một phiếu láng giềng gần nhất cố định từ điểm truy vấn, qua các khoảng cách hiển thị, đến quyết định lớp cục bộ có thể tái lập.',
    },
    durationMinutes: 16,
    id: CML_M05_KNN_POST_ID,
    learningObjective: {
      en: 'Explain how KNN uses a chosen number of nearby labelled training examples, a distance measure, and a majority vote to classify a fixed query.',
      vi: 'Giải thích cách KNN dùng số ví dụ train đã gán nhãn ở gần được chọn, một thước đo khoảng cách và phiếu đa số để phân loại truy vấn cố định.',
    },
    moduleId: 'cml-m05-knn-naive-bayes',
    postQuizId: 'quiz-post-cml-p08',
    provenance: cmlM05KnnDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-knn-fixed-neighbour-distance-majority-vote',
    title: {
      en: 'Trace a KNN vote through local distance evidence',
      vi: 'Lần theo phiếu KNN qua bằng chứng khoảng cách cục bộ',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM05NaiveBayesFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Compare fixed class evidence by separating the prior frequency, observed feature terms, and the conditional-independence assumption.',
      vi: 'So sánh bằng chứng lớp cố định bằng cách tách tần suất ban đầu, các hạng bằng chứng feature quan sát và giả định độc lập có điều kiện.',
    },
    durationMinutes: 16,
    id: CML_M05_NAIVE_BAYES_POST_ID,
    learningObjective: {
      en: 'Explain how Naive Bayes compares class priors and class-conditional feature evidence under its conditional-independence assumption.',
      vi: 'Giải thích cách Naive Bayes so sánh prior của lớp và bằng chứng feature có điều kiện theo lớp dưới giả định độc lập có điều kiện.',
    },
    moduleId: 'cml-m05-knn-naive-bayes',
    postQuizId: 'quiz-post-cml-p09',
    provenance: cmlM05NaiveBayesDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-naive-bayes-prior-evidence-independence-assumption',
    title: {
      en: 'Compare class evidence with Naive Bayes',
      vi: 'So sánh bằng chứng lớp với Naive Bayes',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM06DecisionTreeFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Follow visible feature conditions through a fixed decision tree, then connect tree depth and pruning controls to the risk of overfitting.',
      vi: 'Theo các điều kiện feature hiển thị qua một cây quyết định cố định, rồi nối độ sâu và kiểm soát pruning của cây với rủi ro overfitting.',
    },
    durationMinutes: 16,
    id: CML_M06_DECISION_TREE_POST_ID,
    learningObjective: {
      en: 'Explain a decision-tree prediction as a path of simple rules and identify why depth, pruning, and minimum-sample controls matter for generalisation.',
      vi: 'Giải thích dự đoán của cây quyết định như một đường đi gồm quy tắc đơn giản và xác định vì sao độ sâu, pruning và kiểm soát số mẫu tối thiểu quan trọng với tổng quát hóa.',
    },
    moduleId: 'cml-m06-trees-forest',
    postQuizId: 'quiz-post-cml-p10',
    provenance: cmlM06DecisionTreeDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-decision-tree-rule-path-complexity-generalisation',
    title: {
      en: 'Trace a decision tree through visible rules',
      vi: 'Lần theo cây quyết định qua các quy tắc hiển thị',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM06RandomForestFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Compare one fixed tree with a diverse tree ensemble, then make the sampling, feature randomness, and aggregation rule visible before claiming lower variance.',
      vi: 'So sánh một cây cố định với ensemble cây đa dạng, rồi làm rõ việc lấy mẫu, ngẫu nhiên feature và quy tắc tổng hợp trước khi khẳng định phương sai thấp hơn.',
    },
    durationMinutes: 16,
    id: CML_M06_RANDOM_FOREST_POST_ID,
    learningObjective: {
      en: 'Explain how bootstrap samples, random feature choices, and an explicit aggregation rule can make a random-forest prediction less coupled to one tree’s error.',
      vi: 'Giải thích cách mẫu bootstrap, lựa chọn feature ngẫu nhiên và quy tắc tổng hợp rõ ràng có thể làm dự đoán random forest ít gắn với lỗi của một cây hơn.',
    },
    moduleId: 'cml-m06-trees-forest',
    postQuizId: 'quiz-post-cml-p11',
    provenance: cmlM06RandomForestDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-random-forest-diversity-aggregation-variance-evidence',
    title: {
      en: 'Combine diverse trees with an explicit rule',
      vi: 'Kết hợp các cây đa dạng bằng quy tắc rõ ràng',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM07SvmFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Read a fixed SVM separator through its margin and support vectors, then distinguish the geometry from an unsupported real-world classification claim.',
      vi: 'Đọc mặt phân tách SVM cố định qua margin và support vector, rồi phân biệt hình học này với một khẳng định phân loại thực tế thiếu bằng chứng.',
    },
    durationMinutes: 16,
    id: CML_M07_SVM_POST_ID,
    learningObjective: {
      en: 'Explain why support vectors constrain a maximum-margin separator and name the penalty and kernel choices that must accompany an SVM interpretation.',
      vi: 'Giải thích vì sao support vector ràng buộc mặt phân tách margin tối đa và nêu các lựa chọn penalty, kernel phải đi kèm khi diễn giải SVM.',
    },
    moduleId: 'cml-m07-svm',
    postQuizId: 'quiz-post-cml-p12',
    provenance: cmlM07SvmDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-svm-margin-support-vector-kernel-penalty-evidence',
    title: {
      en: 'Read an SVM boundary through its margin',
      vi: 'Đọc ranh giới SVM qua margin của nó',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM08KmeansFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Trace a fixed K-means pass from chosen centroids, through nearest-centroid assignments and mean updates, to a compactness reading with stated limits.',
      vi: 'Lần theo một lượt K-means cố định từ centroid đã chọn, qua gán centroid gần nhất và cập nhật trung bình, đến cách đọc độ gọn có nêu giới hạn.',
    },
    durationMinutes: 16,
    id: CML_M08_KMEANS_POST_ID,
    learningObjective: {
      en: 'Explain K-means as an assignment-and-update loop, name the role of K and initialization, and state why inertia alone cannot validate every cluster shape.',
      vi: 'Giải thích K-means như vòng lặp gán-cập nhật, nêu vai trò của K và khởi tạo, và nói vì sao chỉ inertia không thể xác thực mọi hình dạng cụm.',
    },
    moduleId: 'cml-m08-clustering',
    postQuizId: 'quiz-post-cml-p13',
    provenance: cmlM08ClusteringDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-kmeans-centroid-assignment-update-inertia-shape-limit',
    title: {
      en: 'Trace K-means from centroids to a cautious grouping',
      vi: 'Lần theo K-means từ centroid đến cách gom nhóm thận trọng',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM08HierarchicalFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Read a fixed bottom-up cluster hierarchy through its merge sequence, named linkage rule, and a dendrogram cut that remains open to review.',
      vi: 'Đọc một hệ phân cấp cụm từ dưới lên cố định qua chuỗi gộp, quy tắc linkage đã nêu và mức cắt dendrogram vẫn mở để review.',
    },
    durationMinutes: 16,
    id: CML_M08_HIERARCHICAL_POST_ID,
    learningObjective: {
      en: 'Explain how an agglomerative hierarchy records successive merges, distinguish linkage rules, and justify a dendrogram cut with its stated merge evidence.',
      vi: 'Giải thích cách hệ phân cấp kết tụ ghi các lần gộp liên tiếp, phân biệt các quy tắc linkage và biện minh mức cắt dendrogram bằng bằng chứng gộp đã nêu.',
    },
    moduleId: 'cml-m08-clustering',
    postQuizId: 'quiz-post-cml-p14',
    provenance: cmlM08ClusteringDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-hierarchical-merge-linkage-dendrogram-cut-evidence',
    title: {
      en: 'Read hierarchical merges before choosing a cut',
      vi: 'Đọc các lần gộp phân cấp trước khi chọn mức cắt',
    },
  },
  {
    accessLevel: 'full',
    blocks: cmlM09PcaFullLessonBlocks,
    courseId: 'course-classical-ml',
    description: {
      en: 'Trace a fixed one-component projection from centering choices and retained variance to an explicit statement of what a reduced view can no longer guarantee.',
      vi: 'Lần theo một phép chiếu một component cố định từ lựa chọn centering và phương sai giữ lại đến phát biểu rõ điều góc nhìn rút gọn không còn bảo đảm.',
    },
    durationMinutes: 16,
    id: CML_M09_PCA_POST_ID,
    learningObjective: {
      en: 'Explain PCA as successive orthogonal components, distinguish centering from scaling, and report retained components and approximation limits when reducing dimensions.',
      vi: 'Giải thích PCA như các component trực giao liên tiếp, phân biệt centering với scaling, và báo số component giữ lại cùng giới hạn xấp xỉ khi giảm chiều.',
    },
    moduleId: 'cml-m09-pca',
    postQuizId: 'quiz-post-cml-p15',
    provenance: cmlM09PcaDraftProvenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-pca-orthogonal-variance-centering-projection-approximation',
    title: {
      en: 'Project shared variation with PCA',
      vi: 'Chiếu biến thiên chung bằng PCA',
    },
  },
];

export const vietnameseFirstUseTerminology = [
  { english: 'learning rate', vietnamese: 'tốc độ học' },
  { english: 'underfitting', vietnamese: 'thiếu khớp' },
  { english: 'overfitting', vietnamese: 'quá khớp' },
  { english: 'regularization', vietnamese: 'điều chuẩn' },
  { english: 'classification', vietnamese: 'phân loại' },
  { english: 'clustering', vietnamese: 'phân cụm' },
  { english: 'regression', vietnamese: 'hồi quy' },
  { english: 'validation', vietnamese: 'xác thực' },
  { english: 'activation', vietnamese: 'hàm kích hoạt' },
  { english: 'precision', vietnamese: 'độ chính xác dương' },
  { english: 'threshold', vietnamese: 'ngưỡng' },
  { english: 'residual', vietnamese: 'phần dư' },
  { english: 'accuracy', vietnamese: 'độ chính xác' },
  { english: 'gradient', vietnamese: 'độ dốc' },
  { english: 'dataset', vietnamese: 'tập dữ liệu' },
  { english: 'feature', vietnamese: 'đặc trưng' },
  { english: 'metric', vietnamese: 'chỉ số đánh giá' },
  { english: 'recall', vietnamese: 'độ bao phủ' },
  { english: 'epoch', vietnamese: 'chu kỳ huấn luyện' },
  { english: 'train', vietnamese: 'huấn luyện' },
  { english: 'test', vietnamese: 'kiểm tra' },
  { english: 'loss', vietnamese: 'hàm mất mát' },
] as const;

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function annotateFirstVietnameseTerminology(text: string, usedTerms: Set<string>): string {
  let annotatedText = text;

  for (const term of vietnameseFirstUseTerminology) {
    if (usedTerms.has(term.english)) {
      continue;
    }

    const expression = new RegExp(`\\b${escapeRegularExpression(term.english)}\\b`, 'i');
    const match = expression.exec(annotatedText);

    if (!match) {
      continue;
    }

    const matchedTerm = match[0];
    const translatedTerm =
      match.index === 0
        ? `${term.vietnamese[0]?.toLocaleUpperCase('vi-VN') ?? ''}${term.vietnamese.slice(1)}`
        : term.vietnamese;
    annotatedText = `${annotatedText.slice(0, match.index)}${translatedTerm} (${matchedTerm})${annotatedText.slice(match.index + matchedTerm.length)}`;
    usedTerms.add(term.english);
  }

  return annotatedText;
}

function annotateVietnameseLocaleValue(value: unknown, usedTerms: Set<string>): unknown {
  if (typeof value === 'string') {
    return annotateFirstVietnameseTerminology(value, usedTerms);
  }

  if (Array.isArray(value)) {
    return value.map((item) => annotateVietnameseLocaleValue(item, usedTerms));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        annotateVietnameseLocaleValue(nestedValue, usedTerms),
      ]),
    );
  }

  return value;
}

function createPostTaskFingerprint(post: TrialPost): string {
  const canonicalPayload = {
    fingerprintSchemaVersion: 1,
    contextId: `${post.courseId}:${post.moduleId}:${post.id}`,
    datasetId: null,
    taskType: 'lesson-post',
    learningObjectiveId: post.taskFingerprint.trim(),
    expectedReasoningType: `post-quiz:${post.postQuizId}`,
  };

  return createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
}

function localizeFirstUseTerminology(post: TrialPost): TrialPost {
  const usedTerms = new Set<string>();
  const title = {
    ...post.title,
    vi: annotateFirstVietnameseTerminology(post.title.vi, usedTerms),
  };
  const description = {
    ...post.description,
    vi: annotateFirstVietnameseTerminology(post.description.vi, usedTerms),
  };
  const learningObjective = {
    ...post.learningObjective,
    vi: annotateFirstVietnameseTerminology(post.learningObjective.vi, usedTerms),
  };
  const blocks = post.blocks.map((block) => ({
    ...block,
    locales: {
      ...block.locales,
      vi: annotateVietnameseLocaleValue(block.locales.vi, usedTerms) as Record<string, unknown>,
    },
  }));

  return {
    ...post,
    blocks,
    description,
    learningObjective,
    taskFingerprint: createPostTaskFingerprint(post),
    title,
  };
}

const releaseTrialPosts = trialPosts.map(localizeFirstUseTerminology);
const releaseFullLessonPosts = fullLessonPosts.map(localizeFirstUseTerminology);

export function getTrialPost(courseId: string | undefined, postId: string | undefined) {
  return releaseTrialPosts.find((post) => post.courseId === courseId && post.id === postId);
}

export function getReadablePost(
  courseId: string | undefined,
  postId: string | undefined,
  isFullAccess: boolean,
) {
  const posts = isFullAccess ? releaseFullLessonPosts : releaseTrialPosts;

  return posts.find((post) => post.courseId === courseId && post.id === postId);
}
