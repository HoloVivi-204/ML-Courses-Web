import { createHash } from 'node:crypto';

import { type LocalizedText } from './release-learning-catalog.js';
import {
  cmlM02SourceTrace,
  cmlM03SourceTrace,
  cmlM04LogisticSourceTrace,
  cmlM05KnnSourceTrace,
  cmlM06ModuleSourceTrace,
  cmlM07SvmSourceTrace,
  cmlM08ClusteringSourceTrace,
  cmlM09PcaSourceTrace,
  dlM01SourceTrace,
  dlM02SourceTrace,
  type DraftProvenance,
} from './content-source-trace.js';

const DL_M01_SOURCE_IDS = dlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const DL_M02_SOURCE_IDS = dlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M02_SOURCE_IDS = cmlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M03_SOURCE_IDS = cmlM03SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M04_LOGISTIC_SOURCE_IDS = cmlM04LogisticSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M05_KNN_SOURCE_IDS = cmlM05KnnSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M06_MODULE_SOURCE_IDS = ['sklearn-docs'] as const;
const CML_M07_SVM_SOURCE_IDS = cmlM07SvmSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M08_CLUSTERING_SOURCE_IDS = cmlM08ClusteringSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);
const CML_M09_PCA_SOURCE_IDS = cmlM09PcaSourceTrace.sourceSnapshots.map(
  (source) => source.sourceId,
);

const cmlM02DemoDraftProvenance = {
  candidateSourceIds: CML_M02_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM02SourceTrace,
} as const satisfies DraftProvenance;

const cmlM03DemoDraftProvenance = {
  candidateSourceIds: CML_M03_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM03SourceTrace,
} as const satisfies DraftProvenance;

const cmlM04LogisticDemoDraftProvenance = {
  candidateSourceIds: CML_M04_LOGISTIC_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM04LogisticSourceTrace,
} as const satisfies DraftProvenance;

const cmlM05KnnDemoDraftProvenance = {
  candidateSourceIds: CML_M05_KNN_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM05KnnSourceTrace,
} as const satisfies DraftProvenance;

const cmlM06TreeForestDemoDraftProvenance = {
  candidateSourceIds: CML_M06_MODULE_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM06ModuleSourceTrace,
} as const satisfies DraftProvenance;

const cmlM07SvmDemoDraftProvenance = {
  candidateSourceIds: CML_M07_SVM_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM07SvmSourceTrace,
} as const satisfies DraftProvenance;

const cmlM08ClusteringDemoDraftProvenance = {
  candidateSourceIds: CML_M08_CLUSTERING_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM08ClusteringSourceTrace,
} as const satisfies DraftProvenance;

const cmlM09PcaDemoDraftProvenance = {
  candidateSourceIds: CML_M09_PCA_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM09PcaSourceTrace,
} as const satisfies DraftProvenance;

export interface DemoStep {
  durationMs: number;
  id: string;
  narration: LocalizedText;
  required: boolean;
  textAlternative: LocalizedText;
  title: LocalizedText;
}

export interface FixedDemoVisualization {
  boundary: readonly {
    x: number;
    y: number;
  }[];
  points: readonly {
    classification?: 'negative' | 'positive';
    label: string;
    positiveFromStep: number;
    x: number;
    y: number;
  }[];
}

export interface FixedDemoRun {
  caption?: LocalizedText;
  datasetVersionId: string;
  parameterValues: readonly {
    id: string;
    value: number;
  }[];
  rows: readonly {
    input: readonly number[];
    predictedOutput: number;
    targetOutput: number;
  }[];
}

export interface FixedDemoManifest {
  adapterVersion: string;
  algorithmId: string;
  courseId: string;
  demoId: string;
  draftProvenance?: DraftProvenance;
  fixedRun?: FixedDemoRun;
  learningObjective?: LocalizedText;
  moduleId: string;
  problemId: string;
  requiredStepIds: readonly string[];
  resultHash: string;
  revisionId: string;
  seed: number;
  sourceIds: readonly string[];
  steps: readonly DemoStep[];
  taskFingerprint: string;
  title: LocalizedText;
  visualFixture: {
    hash: string;
    totalDurationMs: number;
    version: 'release-fixed-demo-visual-v1';
  };
  visualization: FixedDemoVisualization;
}

type FixedDemoDraft = Omit<
  FixedDemoManifest,
  'adapterVersion' | 'resultHash' | 'sourceIds' | 'steps' | 'visualFixture'
> & {
  steps: readonly Omit<DemoStep, 'durationMs'>[];
};

const andGateDemo: FixedDemoDraft = {
  algorithmId: 'perceptron',
  courseId: 'course-deep-learning-basic',
  demoId: 'demo-perceptron-and-gate',
  draftProvenance: {
    candidateSourceIds: DL_M01_SOURCE_IDS,
    contentReviewStatus: 'pending-operator-review',
    externalEvidenceStatus: 'not-collected',
    importStatus: 'draft-only',
    sourceTrace: dlM01SourceTrace,
  },
  learningObjective: {
    en: 'Calculate how one fixed Perceptron classifies all four AND inputs from weights, bias, and a step rule.',
    vi: 'Tính cách một Perceptron cố định phân loại bốn đầu vào AND từ trọng số, độ lệch và quy tắc bước.',
  },
  fixedRun: {
    datasetVersionId: 'dataset-demo-perceptron-and-gate-v1',
    parameterValues: [
      { id: 'w1', value: 1 },
      { id: 'w2', value: 1 },
      { id: 'bias', value: -1.5 },
    ],
    rows: [
      { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
      { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
      { input: [1, 0], predictedOutput: 0, targetOutput: 0 },
      { input: [1, 1], predictedOutput: 1, targetOutput: 1 },
    ],
  },
  moduleId: 'dl-m01-neuron-perceptron',
  problemId: 'problem-demo-perceptron-and-gate',
  requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
  revisionId: 'demo-perceptron-and-gate-rev-r1',
  seed: 42,
  taskFingerprint: 'demo-perceptron-and-fixed-and-rule',
  visualization: {
    boundary: [
      { x: 122, y: 34 },
      { x: 210, y: 115 },
    ],
    points: [
      { classification: 'negative', label: '0,0', positiveFromStep: 1, x: 62, y: 172 },
      { classification: 'negative', label: '0,1', positiveFromStep: 1, x: 62, y: 58 },
      { classification: 'negative', label: '1,0', positiveFromStep: 1, x: 190, y: 172 },
      { classification: 'positive', label: '1,1', positiveFromStep: 1, x: 190, y: 58 },
    ],
  },
  title: {
    en: 'Perceptron demo: AND gate',
    vi: 'Demo Perceptron: cổng AND',
  },
  steps: [
    {
      id: 'and-problem',
      narration: {
        en: 'A Perceptron is a binary classifier. Here the target is AND: only the input pair 1,1 has label 1.',
        vi: 'Perceptron là bộ phân loại nhị phân. Ở đây target là AND: chỉ cặp đầu vào 1,1 có nhãn 1.',
      },
      required: true,
      textAlternative: {
        en: 'The fixed AND truth table has three negative rows: 0,0; 0,1; and 1,0. Its only positive row is 1,1.',
        vi: 'Bảng chân trị AND cố định có ba hàng âm: 0,0; 0,1; và 1,0. Hàng dương duy nhất là 1,1.',
      },
      title: {
        en: 'Define the AND target',
        vi: 'Xác định mục tiêu AND',
      },
    },
    {
      id: 'and-data',
      narration: {
        en: 'The four input rows are fixed, so you can inspect the same evidence before and after the decision without live training or sampling.',
        vi: 'Bốn hàng đầu vào được cố định, nên bạn có thể quan sát cùng bằng chứng trước và sau quyết định mà không train hay lấy mẫu live.',
      },
      required: true,
      textAlternative: {
        en: 'A square plot shows 0,0; 0,1; 1,0; and 1,1. The first three points are negative and the top-right 1,1 point is positive.',
        vi: 'Đồ thị hình vuông cho thấy 0,0; 0,1; 1,0; và 1,1. Ba điểm đầu là âm, còn điểm 1,1 góc trên bên phải là dương.',
      },
      title: {
        en: 'Inspect the fixed dataset',
        vi: 'Quan sát dataset cố định',
      },
    },
    {
      id: 'and-boundary',
      narration: {
        en: 'Use z = x1 + x2 - 1.5. The score is negative for 0,0; 0,1; and 1,0, but it is 0.5 for 1,1.',
        vi: 'Dùng z = x1 + x2 - 1.5. Điểm số âm với 0,0; 0,1; và 1,0, nhưng bằng 0,5 với 1,1.',
      },
      required: true,
      textAlternative: {
        en: 'The line x1 plus x2 equals 1.5 separates the top-right positive point from the three negative points.',
        vi: 'Đường x1 cộng x2 bằng 1,5 tách điểm dương góc trên bên phải khỏi ba điểm âm.',
      },
      title: {
        en: 'Read the decision boundary',
        vi: 'Đọc ranh giới quyết định',
      },
    },
    {
      id: 'and-result',
      narration: {
        en: 'The step rule maps negative scores to 0 and the 0.5 score to 1. All four predictions match the fixed AND labels.',
        vi: 'Quy tắc bước ánh xạ điểm âm thành 0 và điểm 0,5 thành 1. Cả bốn dự đoán khớp nhãn AND cố định.',
      },
      required: true,
      textAlternative: {
        en: 'The fixed result table reports predictions 0, 0, 0, 1 against targets 0, 0, 0, 1: four of four correct.',
        vi: 'Bảng kết quả cố định báo dự đoán 0, 0, 0, 1 so với target 0, 0, 0, 1: đúng bốn trên bốn.',
      },
      title: {
        en: 'Confirm the fixed result',
        vi: 'Xác nhận kết quả cố định',
      },
    },
  ],
};

const mlpCheckerboardDemo: FixedDemoDraft = {
  algorithmId: 'mlp',
  courseId: 'course-deep-learning-basic',
  demoId: 'demo-mlp-checkerboard',
  draftProvenance: {
    candidateSourceIds: DL_M02_SOURCE_IDS,
    contentReviewStatus: 'pending-operator-review',
    externalEvidenceStatus: 'not-collected',
    importStatus: 'draft-only',
    sourceTrace: dlM02SourceTrace,
  },
  fixedRun: {
    caption: {
      en: 'Fixed checkerboard inputs and outputs',
      vi: 'Đầu vào và đầu ra bàn cờ cố định',
    },
    datasetVersionId: 'dataset-demo-mlp-checkerboard-v1',
    parameterValues: [],
    rows: [
      { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
      { input: [0, 1], predictedOutput: 1, targetOutput: 1 },
      { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
      { input: [1, 1], predictedOutput: 0, targetOutput: 0 },
    ],
  },
  learningObjective: {
    en: 'Trace how a hidden nonlinear activation lets an MLP use a different representation for the fixed checkerboard before its output prediction.',
    vi: 'Lần theo cách kích hoạt phi tuyến ở hidden layer cho phép MLP dùng biểu diễn khác cho bàn cờ cố định trước dự đoán đầu ra.',
  },
  moduleId: 'dl-m02-mlp',
  problemId: 'problem-demo-mlp-checkerboard',
  requiredStepIds: [
    'checkerboard-problem',
    'checkerboard-data',
    'checkerboard-hidden-activation',
    'checkerboard-output',
  ],
  revisionId: 'demo-mlp-checkerboard-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'checkerboard-problem',
      narration: {
        en: 'The fixed target labels 0,1 and 1,0 as positive while 0,0 and 1,1 are negative. Opposite corners now share a label.',
        vi: 'Target cố định gán 0,1 và 1,0 là dương, còn 0,0 và 1,1 là âm. Các góc đối diện giờ cùng một nhãn.',
      },
      required: true,
      textAlternative: {
        en: 'A square contains four binary-input corners. The upper-left and lower-right corners are positive; the other diagonal is negative.',
        vi: 'Một hình vuông có bốn góc đầu vào nhị phân. Góc trên trái và dưới phải là dương; đường chéo còn lại là âm.',
      },
      title: {
        en: 'Define the checkerboard target',
        vi: 'Xác định target bàn cờ',
      },
    },
    {
      id: 'checkerboard-data',
      narration: {
        en: 'The four rows are fixed. They make the input arrangement inspectable without live sampling, training controls, or a hidden dataset.',
        vi: 'Bốn hàng được cố định. Chúng khiến cách sắp xếp đầu vào có thể quan sát mà không có lấy mẫu live, điều khiển huấn luyện hay dataset ẩn.',
      },
      required: true,
      textAlternative: {
        en: 'The fixed table lists inputs 0,0; 0,1; 1,0; and 1,1 with targets 0, 1, 1, and 0.',
        vi: 'Bảng cố định liệt kê đầu vào 0,0; 0,1; 1,0; 1,1 với target tương ứng 0, 1, 1, 0.',
      },
      title: {
        en: 'Inspect the fixed four rows',
        vi: 'Quan sát bốn hàng cố định',
      },
    },
    {
      id: 'checkerboard-hidden-activation',
      narration: {
        en: 'A hidden layer first forms affine scores, then applies an activation such as ReLU. That activation is the step that stops stacked affine maps from collapsing to one linear rule.',
        vi: 'Hidden layer trước hết tạo các điểm affine, rồi áp dụng kích hoạt như ReLU. Kích hoạt là bước ngăn các ánh xạ affine xếp chồng gộp lại thành một quy tắc tuyến tính.',
      },
      required: true,
      textAlternative: {
        en: 'A schematic nonlinear contour accompanies the four fixed checkerboard points. It illustrates a changed representation, not a fitted boundary or a learned parameter set.',
        vi: 'Một đường bao phi tuyến minh họa đi cùng bốn điểm bàn cờ cố định. Nó mô tả biểu diễn đã đổi, không phải ranh giới đã fit hay bộ tham số đã học.',
      },
      title: {
        en: 'Apply the hidden activation',
        vi: 'Áp dụng kích hoạt hidden',
      },
    },
    {
      id: 'checkerboard-output',
      narration: {
        en: 'The output layer reads the transformed hidden representation. The fixed rows show the intended outputs, but this demo does not claim to run or train an MLP in the browser.',
        vi: 'Lớp đầu ra đọc biểu diễn hidden đã biến đổi. Các hàng cố định cho đầu ra dự kiến, nhưng demo không khẳng định chạy hoặc huấn luyện MLP trong trình duyệt.',
      },
      required: true,
      textAlternative: {
        en: 'The result table reports outputs 0, 1, 1, 0 against the same four fixed targets.',
        vi: 'Bảng kết quả báo đầu ra 0, 1, 1, 0 so với cùng bốn target cố định.',
      },
      title: {
        en: 'Read the fixed output',
        vi: 'Đọc đầu ra cố định',
      },
    },
  ],
  taskFingerprint: 'demo-mlp-fixed-checkerboard-hidden-activation',
  title: {
    en: 'MLP demo: checkerboard representation',
    vi: 'Demo MLP: biểu diễn bàn cờ',
  },
  visualization: {
    boundary: [
      { x: 36, y: 115 },
      { x: 114, y: 115 },
      { x: 114, y: 34 },
      { x: 132, y: 34 },
      { x: 132, y: 115 },
      { x: 210, y: 115 },
    ],
    points: [
      { classification: 'negative', label: '0,0', positiveFromStep: 1, x: 62, y: 172 },
      { classification: 'positive', label: '0,1', positiveFromStep: 1, x: 62, y: 58 },
      { classification: 'positive', label: '1,0', positiveFromStep: 1, x: 190, y: 172 },
      { classification: 'negative', label: '1,1', positiveFromStep: 1, x: 190, y: 58 },
    ],
  },
};

const linearCalibrationDemo: FixedDemoDraft = {
  algorithmId: 'linear-regression',
  courseId: 'course-classical-ml',
  demoId: 'demo-linear-calibration',
  draftProvenance: cmlM02DemoDraftProvenance,
  fixedRun: {
    caption: {
      en: 'Fixed linear calibration readings',
      vi: 'Các số đọc hiệu chuẩn tuyến tính cố định',
    },
    datasetVersionId: 'dataset-demo-linear-calibration-v1',
    parameterValues: [
      { id: 'slope', value: 2 },
      { id: 'intercept', value: 1 },
    ],
    rows: [
      { input: [0], predictedOutput: 1, targetOutput: 1 },
      { input: [1], predictedOutput: 3, targetOutput: 3 },
      { input: [2], predictedOutput: 5, targetOutput: 5 },
      { input: [3], predictedOutput: 7, targetOutput: 8 },
    ],
  },
  learningObjective: {
    en: 'Trace one fixed linear rule from its slope and intercept to predictions, then interpret a residual without claiming a live fit.',
    vi: 'Lần theo một quy tắc tuyến tính cố định từ độ dốc và hệ số chặn đến dự đoán, rồi diễn giải phần dư mà không khẳng định có lượt khớp live.',
  },
  moduleId: 'cml-m02-linear-polynomial',
  problemId: 'problem-demo-linear-calibration',
  requiredStepIds: ['linear-problem', 'linear-data', 'linear-line', 'linear-residual'],
  revisionId: 'demo-linear-calibration-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'linear-problem',
      narration: {
        en: 'The fixed task is numerical calibration: estimate one output from one input with the displayed rule. It is an instructional baseline, not a model trained in this browser.',
        vi: 'Nhiệm vụ cố định là hiệu chuẩn số: ước lượng một đầu ra từ một đầu vào bằng quy tắc hiển thị. Đây là baseline để học, không phải mô hình được train trong trình duyệt này.',
      },
      required: true,
      textAlternative: {
        en: 'The problem card states a fixed numerical input and output relationship for calibration.',
        vi: 'Thẻ bài toán nêu một quan hệ đầu vào và đầu ra số cố định để hiệu chuẩn.',
      },
      title: {
        en: 'Define the numerical task',
        vi: 'Xác định nhiệm vụ số',
      },
    },
    {
      id: 'linear-data',
      narration: {
        en: 'Inspect four fixed rows. The first three match the line exactly; the final row preserves a one-unit gap so the residual has something concrete to explain.',
        vi: 'Quan sát bốn dòng cố định. Ba dòng đầu khớp đường chính xác; dòng cuối giữ khoảng cách một đơn vị để phần dư có điều cụ thể cần giải thích.',
      },
      required: true,
      textAlternative: {
        en: 'A static table lists inputs 0, 1, 2, 3 with targets 1, 3, 5, 8.',
        vi: 'Bảng tĩnh liệt kê đầu vào 0, 1, 2, 3 với mục tiêu 1, 3, 5, 8.',
      },
      title: {
        en: 'Inspect fixed readings',
        vi: 'Quan sát số đọc cố định',
      },
    },
    {
      id: 'linear-line',
      narration: {
        en: 'Apply the displayed rule y_pred = 2x + 1. The slope adds two output units for each input unit, and the intercept is the prediction at input zero.',
        vi: 'Áp dụng quy tắc hiển thị y_pred = 2x + 1. Độ dốc thêm hai đơn vị đầu ra cho mỗi đơn vị đầu vào, còn hệ số chặn là dự đoán tại đầu vào không.',
      },
      required: true,
      textAlternative: {
        en: 'A straight line represents the fixed prediction rule with slope two and intercept one.',
        vi: 'Một đường thẳng biểu diễn quy tắc dự đoán cố định với độ dốc hai và hệ số chặn một.',
      },
      title: {
        en: 'Apply the fixed line',
        vi: 'Áp dụng đường cố định',
      },
    },
    {
      id: 'linear-residual',
      narration: {
        en: 'At input 3, the line predicts 7 while the target is 8. The residual is +1: one observed point above the line, not proof of a fitted model or a final verdict on the relationship.',
        vi: 'Tại đầu vào 3, đường dự đoán 7 còn mục tiêu là 8. Phần dư là +1: một điểm quan sát nằm trên đường, không phải bằng chứng mô hình đã được fit hay phán quyết cuối về quan hệ.',
      },
      required: true,
      textAlternative: {
        en: 'The final row reports prediction 7 against target 8, leaving a positive residual of one.',
        vi: 'Dòng cuối báo dự đoán 7 so với mục tiêu 8, để lại phần dư dương bằng một.',
      },
      title: {
        en: 'Interpret the residual',
        vi: 'Diễn giải phần dư',
      },
    },
  ],
  taskFingerprint: 'demo-linear-fixed-calibration-residual',
  title: {
    en: 'Linear regression demo: fixed calibration line',
    vi: 'Demo hồi quy tuyến tính: đường hiệu chuẩn cố định',
  },
  visualization: {
    boundary: [
      { x: 42, y: 188 },
      { x: 210, y: 52 },
    ],
    points: [
      { label: 'x=0, y=1', positiveFromStep: 1, x: 52, y: 181 },
      { label: 'x=1, y=3', positiveFromStep: 1, x: 104, y: 137 },
      { label: 'x=2, y=5', positiveFromStep: 1, x: 156, y: 94 },
      { label: 'x=3, y=8', positiveFromStep: 1, x: 208, y: 34 },
    ],
  },
};

const regularizationNoisySignalDemo: FixedDemoDraft = {
  algorithmId: 'ridge-regression',
  courseId: 'course-classical-ml',
  demoId: 'demo-regularization-noisy-signal',
  draftProvenance: cmlM03DemoDraftProvenance,
  fixedRun: {
    caption: {
      en: 'Fixed Ridge and Lasso coefficient comparison',
      vi: 'So sánh hệ số Ridge và Lasso cố định',
    },
    datasetVersionId: 'dataset-demo-regularization-noisy-signal-v1',
    parameterValues: [
      { id: 'ridge-alpha', value: 1 },
      { id: 'ridge-feature-a', value: 0.45 },
      { id: 'ridge-feature-b', value: 0.45 },
      { id: 'lasso-alpha', value: 1 },
      { id: 'lasso-feature-a', value: 0.9 },
      { id: 'lasso-feature-b', value: 0 },
    ],
    rows: [
      { input: [1, 1], predictedOutput: 0.9, targetOutput: 1 },
      { input: [2, 2], predictedOutput: 1.8, targetOutput: 2 },
      { input: [3, 3], predictedOutput: 2.7, targetOutput: 4 },
      { input: [4, 4], predictedOutput: 3.6, targetOutput: 4 },
    ],
  },
  learningObjective: {
    en: 'Contrast fixed Ridge shrinkage with Lasso sparsity, then state why alpha must be selected with validation evidence rather than this illustrative table alone.',
    vi: 'Đối chiếu shrinkage Ridge cố định với tính thưa Lasso, rồi nêu vì sao phải chọn alpha bằng bằng chứng validation thay vì chỉ bảng minh họa này.',
  },
  moduleId: 'cml-m03-ridge-lasso',
  problemId: 'problem-demo-regularization-noisy-signal',
  requiredStepIds: [
    'regularization-problem',
    'regularization-data',
    'ridge-shrinkage',
    'lasso-sparsity',
  ],
  revisionId: 'demo-regularization-noisy-signal-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'regularization-problem',
      narration: {
        en: 'The fixed question is how to read two related input signals without pretending the browser is fitting a model. The goal is to compare shrinkage and sparsity as explicit modelling choices.',
        vi: 'Câu hỏi cố định là đọc hai tín hiệu đầu vào liên quan mà không giả vờ trình duyệt đang fit mô hình. Mục tiêu là so sánh shrinkage và tính thưa như các lựa chọn mô hình rõ ràng.',
      },
      required: true,
      textAlternative: {
        en: 'The problem card introduces a fixed comparison of two related features under regularisation.',
        vi: 'Thẻ bài toán giới thiệu so sánh cố định hai feature liên quan dưới regularization.',
      },
      title: {
        en: 'Frame the coefficient question',
        vi: 'Đặt khung câu hỏi hệ số',
      },
    },
    {
      id: 'regularization-data',
      narration: {
        en: 'Inspect the four static rows: feature A and B move together, while the third target includes a noisy upward deviation. This table is a teaching signal, not a reported fitted dataset.',
        vi: 'Quan sát bốn dòng tĩnh: feature A và B cùng thay đổi, còn mục tiêu thứ ba có độ lệch nhiễu đi lên. Bảng này là tín hiệu để học, không phải dataset đã fit được báo cáo.',
      },
      required: true,
      textAlternative: {
        en: 'A static table lists two matching input columns and targets 1, 2, 4, and 4.',
        vi: 'Bảng tĩnh liệt kê hai cột đầu vào bằng nhau và các mục tiêu 1, 2, 4, 4.',
      },
      title: {
        en: 'Inspect related fixed signals',
        vi: 'Quan sát các tín hiệu cố định liên quan',
      },
    },
    {
      id: 'ridge-shrinkage',
      narration: {
        en: 'The displayed Ridge comparison fixes alpha at one and shows 0.45 for each related coefficient. The point is the direction of the L2 penalty: increasing alpha increases shrinkage and can make coefficients more robust to collinearity, not that these numbers were trained here.',
        vi: 'So sánh Ridge hiển thị cố định alpha bằng một và cho 0,45 cho mỗi hệ số liên quan. Điểm chính là hướng của penalty L2: tăng alpha tăng shrinkage và có thể làm hệ số vững hơn với collinearity, không phải các số này được train ở đây.',
      },
      required: true,
      textAlternative: {
        en: 'The Ridge card displays alpha one and two equal shrunken coefficients of 0.45.',
        vi: 'Thẻ Ridge hiển thị alpha một và hai hệ số thu nhỏ bằng nhau là 0,45.',
      },
      title: {
        en: 'Read Ridge shrinkage',
        vi: 'Đọc shrinkage Ridge',
      },
    },
    {
      id: 'lasso-sparsity',
      narration: {
        en: 'The Lasso comparison also fixes alpha at one but displays 0.90 for A and zero for B. Lasso can estimate sparse coefficients, including an exact zero; validation evidence is still needed before treating one sparse result as the preferred explanation.',
        vi: 'So sánh Lasso cũng cố định alpha bằng một nhưng hiển thị 0,90 cho A và 0 cho B. Lasso có thể ước lượng hệ số thưa, gồm cả số 0 chính xác; vẫn cần bằng chứng validation trước khi xem một kết quả thưa là lời giải thích ưu tiên.',
      },
      required: true,
      textAlternative: {
        en: 'The Lasso card displays alpha one, one non-zero coefficient, and one coefficient fixed at zero.',
        vi: 'Thẻ Lasso hiển thị alpha một, một hệ số khác không và một hệ số cố định bằng không.',
      },
      title: {
        en: 'Read Lasso sparsity',
        vi: 'Đọc tính thưa Lasso',
      },
    },
  ],
  taskFingerprint: 'demo-ridge-lasso-fixed-shrinkage-sparsity',
  title: {
    en: 'Regularisation demo: fixed Ridge and Lasso comparison',
    vi: 'Demo regularization: so sánh Ridge và Lasso cố định',
  },
  visualization: {
    boundary: [
      { x: 42, y: 182 },
      { x: 104, y: 142 },
      { x: 164, y: 102 },
      { x: 210, y: 72 },
    ],
    points: [
      { label: 'A=B=1, y=1', positiveFromStep: 1, x: 54, y: 176 },
      { label: 'A=B=2, y=2', positiveFromStep: 1, x: 105, y: 142 },
      { label: 'A=B=3, y=4', positiveFromStep: 2, x: 160, y: 66 },
      { label: 'A=B=4, y=4', positiveFromStep: 2, x: 207, y: 88 },
    ],
  },
};

const logisticAdmissionDemo: FixedDemoDraft = {
  algorithmId: 'logistic-regression',
  courseId: 'course-classical-ml',
  demoId: 'demo-logistic-admission',
  draftProvenance: cmlM04LogisticDemoDraftProvenance,
  fixedRun: {
    caption: {
      en: 'Fixed sigmoid score and class-rule readings',
      vi: 'Các cách đọc điểm sigmoid và quy tắc lớp cố định',
    },
    datasetVersionId: 'dataset-demo-logistic-admission-v1',
    parameterValues: [
      { id: 'sigmoid-midpoint', value: 2 },
      { id: 'classification-threshold', value: 0.5 },
    ],
    rows: [
      { input: [1], predictedOutput: 0.27, targetOutput: 0 },
      { input: [2], predictedOutput: 0.5, targetOutput: 0 },
      { input: [3], predictedOutput: 0.73, targetOutput: 1 },
      { input: [4], predictedOutput: 0.88, targetOutput: 1 },
    ],
  },
  learningObjective: {
    en: 'Read a fixed sigmoid output before a visible class rule, and distinguish the instructional category from a real-world admission or policy decision.',
    vi: 'Đọc đầu ra sigmoid cố định trước quy tắc lớp hiển thị, và phân biệt category để học với một quyết định tuyển sinh hoặc chính sách thực tế.',
  },
  moduleId: 'cml-m04-logistic-classification',
  problemId: 'problem-demo-logistic-admission',
  requiredStepIds: [
    'logistic-problem',
    'logistic-scores',
    'logistic-probability',
    'logistic-threshold',
  ],
  revisionId: 'demo-logistic-admission-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'logistic-problem',
      narration: {
        en: 'The fixed task is a binary category exercise with anonymous records. Although the locked demo identifier mentions admission, this is not a live admission workflow, a recommendation, or a policy tool.',
        vi: 'Nhiệm vụ cố định là bài tập category nhị phân với các bản ghi ẩn danh. Dù demo ID cố định có chữ tuyển sinh, đây không phải quy trình tuyển sinh live, khuyến nghị hay công cụ chính sách.',
      },
      required: true,
      textAlternative: {
        en: 'A problem card states that four anonymous records will be read through a fixed binary class rule.',
        vi: 'Thẻ bài toán nêu bốn bản ghi ẩn danh sẽ được đọc qua quy tắc lớp nhị phân cố định.',
      },
      title: {
        en: 'Frame the binary category task',
        vi: 'Đặt khung nhiệm vụ category nhị phân',
      },
    },
    {
      id: 'logistic-scores',
      narration: {
        en: 'Inspect four fixed input scores 1, 2, 3, and 4. They are instructional inputs only; the table does not collect, rank, or evaluate real people.',
        vi: 'Quan sát bốn điểm đầu vào cố định 1, 2, 3, 4. Chúng chỉ là đầu vào để học; bảng không thu thập, xếp hạng hay đánh giá người thật.',
      },
      required: true,
      textAlternative: {
        en: 'A static table lists four anonymous input scores with no personal attributes.',
        vi: 'Bảng tĩnh liệt kê bốn điểm đầu vào ẩn danh, không có thuộc tính cá nhân.',
      },
      title: {
        en: 'Inspect fixed anonymous scores',
        vi: 'Quan sát điểm ẩn danh cố định',
      },
    },
    {
      id: 'logistic-probability',
      narration: {
        en: 'The fixed sigmoid readings are 0.27, 0.50, 0.73, and 0.88. A sigmoid maps a score to a value between zero and one, so read each value before turning it into a class.',
        vi: 'Các cách đọc sigmoid cố định là 0,27; 0,50; 0,73; 0,88. Sigmoid ánh xạ điểm thành giá trị giữa không và một, nên hãy đọc từng giá trị trước khi biến nó thành lớp.',
      },
      required: true,
      textAlternative: {
        en: 'The probability card lists four bounded sigmoid outputs: 0.27, 0.50, 0.73, and 0.88.',
        vi: 'Thẻ xác suất liệt kê bốn đầu ra sigmoid bị chặn: 0,27; 0,50; 0,73; 0,88.',
      },
      title: {
        en: 'Read the fixed sigmoid outputs',
        vi: 'Đọc đầu ra sigmoid cố định',
      },
    },
    {
      id: 'logistic-threshold',
      narration: {
        en: 'Apply the displayed classroom convention: values greater than 0.50 receive class 1, otherwise class 0. The two values above the threshold become class 1. This fixed rule illustrates the separation of score and class; it does not set a real decision threshold.',
        vi: 'Áp dụng quy ước lớp hiển thị: giá trị lớn hơn 0,50 nhận lớp 1, nếu không nhận lớp 0. Hai giá trị trên ngưỡng thành lớp 1. Quy tắc cố định này minh họa việc tách điểm và lớp; nó không đặt ngưỡng quyết định thực tế.',
      },
      required: true,
      textAlternative: {
        en: 'A threshold card marks 0.50 and labels only the 0.73 and 0.88 rows as class 1.',
        vi: 'Thẻ ngưỡng đánh dấu 0,50 và chỉ gán nhãn hai dòng 0,73, 0,88 là lớp 1.',
      },
      title: {
        en: 'Apply the fixed class rule',
        vi: 'Áp dụng quy tắc lớp cố định',
      },
    },
  ],
  taskFingerprint: 'demo-logistic-fixed-sigmoid-score-class-rule',
  title: {
    en: 'Logistic regression demo: fixed sigmoid class reading',
    vi: 'Demo hồi quy logistic: đọc lớp sigmoid cố định',
  },
  visualization: {
    boundary: [
      { x: 38, y: 188 },
      { x: 96, y: 158 },
      { x: 136, y: 112 },
      { x: 174, y: 64 },
      { x: 210, y: 40 },
    ],
    points: [
      { classification: 'negative', label: '1 → 0.27', positiveFromStep: 1, x: 56, y: 172 },
      { classification: 'negative', label: '2 → 0.50', positiveFromStep: 1, x: 102, y: 132 },
      { classification: 'positive', label: '3 → 0.73', positiveFromStep: 3, x: 158, y: 78 },
      { classification: 'positive', label: '4 → 0.88', positiveFromStep: 3, x: 204, y: 50 },
    ],
  },
};

const neighborFlowerDemo: FixedDemoDraft = {
  algorithmId: 'knn',
  courseId: 'course-classical-ml',
  demoId: 'demo-neighbor-flower',
  draftProvenance: cmlM05KnnDemoDraftProvenance,
  fixedRun: {
    caption: {
      en: 'A static coordinate exercise: k is fixed at 3 and the query at (2, 2) receives three class-1 votes from its nearest displayed references.',
      vi: 'Bài tập tọa độ tĩnh: k cố định bằng 3 và truy vấn tại (2, 2) nhận ba phiếu lớp 1 từ các điểm tham chiếu gần nhất được hiển thị.',
    },
    datasetVersionId: 'dataset-demo-neighbor-flower-v1',
    parameterValues: [{ id: 'k', value: 3 }],
    rows: [
      { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
      { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
      { input: [1, 0], predictedOutput: 0, targetOutput: 0 },
      { input: [2, 2], predictedOutput: 1, targetOutput: 1 },
    ],
  },
  learningObjective: {
    en: 'Follow a fixed KNN classification from a chosen k and Euclidean distances to the visible majority vote, without running live training or fetching data.',
    vi: 'Theo dõi một phân loại KNN cố định từ k đã chọn và khoảng cách Euclid đến phiếu đa số hiển thị, không chạy huấn luyện live hay lấy dữ liệu.',
  },
  moduleId: 'cml-m05-knn-naive-bayes',
  problemId: 'problem-demo-neighbor-flower',
  requiredStepIds: ['knn-problem', 'knn-reference-points', 'knn-distance', 'knn-vote'],
  revisionId: 'demo-neighbor-flower-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'knn-problem',
      narration: {
        en: 'This is a fixed coordinate classification exercise with anonymous class-0 and class-1 reference points. The stable demo identifier mentions a flower, but it does not identify a real specimen, use a live dataset, or make a real-world recommendation.',
        vi: 'Đây là bài tập phân loại tọa độ cố định với các điểm tham chiếu lớp 0 và lớp 1 ẩn danh. Demo ID ổn định có chữ flower, nhưng demo không nhận diện mẫu vật thật, không dùng dataset live và không đưa ra khuyến nghị thực tế.',
      },
      required: true,
      textAlternative: {
        en: 'A problem card frames an anonymous two-class coordinate exercise with no external data connection.',
        vi: 'Thẻ bài toán đặt khung bài tập tọa độ hai lớp ẩn danh, không kết nối dữ liệu bên ngoài.',
      },
      title: {
        en: 'Frame the fixed neighbour task',
        vi: 'Đặt khung nhiệm vụ láng giềng cố định',
      },
    },
    {
      id: 'knn-reference-points',
      narration: {
        en: 'Read the six displayed reference coordinates. Class 0 occupies the lower-left group; class 1 has references at (2, 1), (1, 2), and (3, 2). They are a static teaching table, not examples added or changed at runtime.',
        vi: 'Đọc sáu tọa độ tham chiếu hiển thị. Lớp 0 nằm ở nhóm dưới-trái; lớp 1 có các điểm tham chiếu (2, 1), (1, 2) và (3, 2). Đây là bảng dạy học tĩnh, không phải ví dụ được thêm hoặc đổi khi chạy.',
      },
      required: true,
      textAlternative: {
        en: 'A static plot contains three class-0 reference points and three class-1 reference points before the query is evaluated.',
        vi: 'Biểu đồ tĩnh có ba điểm tham chiếu lớp 0 và ba điểm tham chiếu lớp 1 trước khi truy vấn được đánh giá.',
      },
      title: {
        en: 'Inspect the labelled reference points',
        vi: 'Quan sát các điểm tham chiếu đã gán nhãn',
      },
    },
    {
      id: 'knn-distance',
      narration: {
        en: 'For the fixed query (2, 2), use the displayed Euclidean representation. Its distances to (2, 1), (1, 2), and (3, 2) are each 1, so these are the three nearest references when k equals 3. The distance rule and k are held constant for this run.',
        vi: 'Với truy vấn cố định (2, 2), dùng biểu diễn Euclid được hiển thị. Khoảng cách tới (2, 1), (1, 2) và (3, 2) đều bằng 1, nên đây là ba điểm tham chiếu gần nhất khi k bằng 3. Quy tắc khoảng cách và k được giữ cố định cho lần chạy này.',
      },
      required: true,
      textAlternative: {
        en: 'The distance card marks three class-1 references exactly one unit from the query at (2, 2).',
        vi: 'Thẻ khoảng cách đánh dấu ba điểm tham chiếu lớp 1 cách đúng một đơn vị so với truy vấn tại (2, 2).',
      },
      title: {
        en: 'Compute the local distance evidence',
        vi: 'Tính bằng chứng khoảng cách cục bộ',
      },
    },
    {
      id: 'knn-vote',
      narration: {
        en: 'Take the simple majority label of the three selected neighbours. All three are class 1, so the fixed query receives class 1. This is a reproducible KNN reading of this table, not a claim about every possible distance metric, k value, or dataset ordering.',
        vi: 'Lấy nhãn đa số đơn giản của ba láng giềng đã chọn. Cả ba đều là lớp 1 nên truy vấn cố định nhận lớp 1. Đây là cách đọc KNN có thể tái lập cho bảng này, không phải khẳng định về mọi thước đo khoảng cách, giá trị k hay thứ tự dataset.',
      },
      required: true,
      textAlternative: {
        en: 'A vote card counts three class-1 neighbours and labels the fixed query class 1.',
        vi: 'Thẻ phiếu đếm ba láng giềng lớp 1 và gán truy vấn cố định là lớp 1.',
      },
      title: {
        en: 'Apply the fixed majority vote',
        vi: 'Áp dụng phiếu đa số cố định',
      },
    },
  ],
  taskFingerprint: 'demo-knn-fixed-k-three-distance-majority-vote',
  title: {
    en: 'KNN demo: fixed local-distance vote',
    vi: 'Demo KNN: phiếu khoảng cách cục bộ cố định',
  },
  visualization: {
    boundary: [
      { x: 34, y: 188 },
      { x: 78, y: 158 },
      { x: 118, y: 134 },
      { x: 154, y: 108 },
      { x: 212, y: 62 },
    ],
    points: [
      { classification: 'negative', label: '(0, 0) → 0', positiveFromStep: 0, x: 46, y: 180 },
      { classification: 'negative', label: '(0, 1) → 0', positiveFromStep: 0, x: 46, y: 138 },
      { classification: 'negative', label: '(1, 0) → 0', positiveFromStep: 0, x: 86, y: 180 },
      { classification: 'positive', label: '(2, 1) → 1', positiveFromStep: 1, x: 126, y: 138 },
      { classification: 'positive', label: '(1, 2) → 1', positiveFromStep: 1, x: 86, y: 96 },
      { classification: 'positive', label: '(3, 2) → 1', positiveFromStep: 1, x: 166, y: 96 },
      { classification: 'positive', label: 'query (2, 2) → 1', positiveFromStep: 3, x: 126, y: 96 },
    ],
  },
};

const treeForestHabitatDemo: FixedDemoDraft = {
  algorithmId: 'decision-tree',
  courseId: 'course-classical-ml',
  demoId: 'demo-tree-forest-habitat',
  draftProvenance: cmlM06TreeForestDemoDraftProvenance,
  fixedRun: {
    caption: {
      en: 'A static two-feature comparison: three displayed trees return class 0, class 1, and class 1 for the query (1, 1), so this classroom fixture’s simple-majority rule reports class 1.',
      vi: 'So sánh tĩnh hai feature: ba cây hiển thị trả về lớp 0, lớp 1 và lớp 1 cho truy vấn (1, 1), nên quy tắc đa số đơn giản của fixture lớp học này báo lớp 1.',
    },
    datasetVersionId: 'dataset-demo-tree-forest-habitat-v1',
    parameterValues: [{ id: 'treeCount', value: 3 }],
    rows: [
      { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
      { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
      { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
      { input: [1, 1], predictedOutput: 1, targetOutput: 1 },
    ],
  },
  learningObjective: {
    en: 'Contrast one fixed decision-tree path with a fixed three-tree ensemble, then identify how diversity and an explicit aggregation rule produce the displayed result without live training.',
    vi: 'Đối chiếu một đường đi cây quyết định cố định với ensemble ba cây cố định, rồi xác định cách đa dạng và quy tắc tổng hợp rõ ràng tạo ra kết quả hiển thị mà không huấn luyện live.',
  },
  moduleId: 'cml-m06-trees-forest',
  problemId: 'problem-demo-tree-forest-habitat',
  requiredStepIds: ['tree-problem', 'tree-split', 'forest-diversity', 'forest-aggregate'],
  revisionId: 'demo-tree-forest-habitat-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'tree-problem',
      narration: {
        en: 'This is a fixed anonymous two-feature classification exercise. Although the stable demo identifier includes “habitat,” no real habitat records, species, or environmental recommendation are used or produced here.',
        vi: 'Đây là bài tập phân loại hai feature ẩn danh cố định. Dù demo ID ổn định có chữ “habitat”, không có bản ghi môi trường sống thật, loài hay khuyến nghị môi trường nào được dùng hoặc tạo ra ở đây.',
      },
      required: true,
      textAlternative: {
        en: 'A problem card frames a static binary-feature exercise with no live data or real-world recommendation.',
        vi: 'Thẻ bài toán đặt khung bài tập feature nhị phân tĩnh, không có dữ liệu live hay khuyến nghị thực tế.',
      },
      title: {
        en: 'Frame the fixed tree comparison',
        vi: 'Đặt khung so sánh cây cố định',
      },
    },
    {
      id: 'tree-split',
      narration: {
        en: 'Read the first displayed tree for query (1, 1). It checks signal A and takes its shown branch to class 0. The point is not that this is a universal rule: a tree prediction is the result of the visible conditions on this fixed path.',
        vi: 'Đọc cây hiển thị đầu tiên cho truy vấn (1, 1). Nó kiểm tra tín hiệu A và đi theo nhánh được hiển thị đến lớp 0. Điểm chính không phải đây là quy tắc phổ quát: dự đoán của cây là kết quả của các điều kiện nhìn thấy trên đường đi cố định này.',
      },
      required: true,
      textAlternative: {
        en: 'A tree card shows a query with A equal to one following one labelled branch to class 0.',
        vi: 'Thẻ cây cho thấy truy vấn có A bằng một đi theo một nhánh đã gán nhãn đến lớp 0.',
      },
      title: {
        en: 'Follow one visible split path',
        vi: 'Theo một đường split hiển thị',
      },
    },
    {
      id: 'forest-diversity',
      narration: {
        en: 'The other two fixed trees examine different displayed feature evidence and both return class 1. This models the diversity idea: different sampled data or feature choices can make trees make different errors, rather than repeating one path unchanged.',
        vi: 'Hai cây cố định còn lại xem bằng chứng feature hiển thị khác nhau và đều trả về lớp 1. Điều này mô hình hóa ý tưởng đa dạng: dữ liệu lấy mẫu hoặc lựa chọn feature khác nhau có thể khiến cây mắc lỗi khác nhau thay vì lặp lại một đường đi không đổi.',
      },
      required: true,
      textAlternative: {
        en: 'Two additional tree cards use different labelled conditions and each return class 1 for the same query.',
        vi: 'Hai thẻ cây bổ sung dùng điều kiện đã gán nhãn khác nhau và mỗi thẻ trả về lớp 1 cho cùng truy vấn.',
      },
      title: {
        en: 'Compare diverse fixed tree outputs',
        vi: 'So sánh đầu ra cây cố định đa dạng',
      },
    },
    {
      id: 'forest-aggregate',
      narration: {
        en: 'Apply the explicit simple-majority rule for this instructional fixture: two class-1 outputs outweigh one class-0 output, so the displayed forest result is class 1. A production implementation can use a different stated aggregation such as probability averaging; this demo does not claim to run one.',
        vi: 'Áp dụng quy tắc đa số đơn giản được nêu rõ cho fixture học này: hai đầu ra lớp 1 nhiều hơn một đầu ra lớp 0 nên kết quả forest hiển thị là lớp 1. Một triển khai production có thể dùng cách tổng hợp khác được nêu rõ như lấy trung bình xác suất; demo này không khẳng định đang chạy một triển khai như vậy.',
      },
      required: true,
      textAlternative: {
        en: 'An aggregation card counts two class-1 outputs and one class-0 output, then reports class 1 under a simple-majority classroom rule.',
        vi: 'Thẻ tổng hợp đếm hai đầu ra lớp 1 và một đầu ra lớp 0, rồi báo lớp 1 theo quy tắc lớp học đa số đơn giản.',
      },
      title: {
        en: 'Apply the fixed aggregation rule',
        vi: 'Áp dụng quy tắc tổng hợp cố định',
      },
    },
  ],
  taskFingerprint: 'demo-tree-forest-fixed-diversity-majority-comparison',
  title: {
    en: 'Tree and forest demo: fixed diversity comparison',
    vi: 'Demo cây và forest: so sánh đa dạng cố định',
  },
  visualization: {
    boundary: [
      { x: 36, y: 186 },
      { x: 80, y: 154 },
      { x: 124, y: 122 },
      { x: 168, y: 90 },
      { x: 212, y: 58 },
    ],
    points: [
      { classification: 'negative', label: '(0, 0) → 0', positiveFromStep: 0, x: 50, y: 178 },
      { classification: 'negative', label: '(0, 1) → 0', positiveFromStep: 0, x: 50, y: 126 },
      { classification: 'positive', label: '(1, 0) → 1', positiveFromStep: 1, x: 116, y: 178 },
      {
        classification: 'positive',
        label: 'query (1, 1) → 1',
        positiveFromStep: 3,
        x: 116,
        y: 126,
      },
    ],
  },
};

const svmMarginDemo: FixedDemoDraft = {
  algorithmId: 'svm',
  courseId: 'course-classical-ml',
  demoId: 'demo-svm-margin',
  draftProvenance: cmlM07SvmDemoDraftProvenance,
  fixedRun: {
    caption: {
      en: 'A static margin diagram: margin is fixed at one unit in the fixture, and the marked support vectors are the nearest displayed points to the separator.',
      vi: 'Sơ đồ margin tĩnh: margin được cố định bằng một đơn vị trong fixture, và các support vector được đánh dấu là các điểm hiển thị gần mặt phân tách nhất.',
    },
    datasetVersionId: 'dataset-demo-svm-margin-v1',
    parameterValues: [{ id: 'margin', value: 1 }],
    rows: [
      { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
      { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
      { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
      { input: [1, 1], predictedOutput: 1, targetOutput: 1 },
    ],
  },
  learningObjective: {
    en: 'Inspect a fixed separating line, its margin boundaries, and marked support vectors without training a live SVM or making a decision about a real record.',
    vi: 'Quan sát đường phân tách cố định, các biên margin và support vector được đánh dấu mà không huấn luyện SVM live hay quyết định về bản ghi thật.',
  },
  moduleId: 'cml-m07-svm',
  problemId: 'problem-demo-svm-margin',
  requiredStepIds: ['svm-problem', 'svm-reference-points', 'svm-margin', 'svm-support-vectors'],
  revisionId: 'demo-svm-margin-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'svm-problem',
      narration: {
        en: 'This is a fixed two-class coordinate diagram with anonymous points. It does not collect, rank, or classify real people, applications, or records; it only makes an SVM separation geometry inspectable.',
        vi: 'Đây là sơ đồ tọa độ hai lớp cố định với các điểm ẩn danh. Nó không thu thập, xếp hạng hay phân loại người, đơn đăng ký hoặc bản ghi thật; nó chỉ làm hình học phân tách SVM có thể kiểm tra.',
      },
      required: true,
      textAlternative: {
        en: 'A problem card frames a static two-class coordinate diagram with no external data source.',
        vi: 'Thẻ bài toán đặt khung sơ đồ tọa độ hai lớp tĩnh, không có nguồn dữ liệu bên ngoài.',
      },
      title: {
        en: 'Frame the fixed separator',
        vi: 'Đặt khung mặt phân tách cố định',
      },
    },
    {
      id: 'svm-reference-points',
      narration: {
        en: 'Read the four fixed labelled coordinates. Two are class 0 and two are class 1; they are an instructional table used to reveal the geometry, not a training request that changes while the page runs.',
        vi: 'Đọc bốn tọa độ đã gán nhãn cố định. Hai điểm là lớp 0 và hai điểm là lớp 1; chúng là bảng dạy học dùng để làm rõ hình học, không phải yêu cầu train thay đổi khi trang chạy.',
      },
      required: true,
      textAlternative: {
        en: 'A static plot lists two class-0 points and two class-1 points before the separator is read.',
        vi: 'Biểu đồ tĩnh liệt kê hai điểm lớp 0 và hai điểm lớp 1 trước khi đọc mặt phân tách.',
      },
      title: {
        en: 'Inspect the labelled reference points',
        vi: 'Quan sát các điểm tham chiếu đã gán nhãn',
      },
    },
    {
      id: 'svm-margin',
      narration: {
        en: 'The central line is the fixed separating hyperplane in this two-dimensional sketch. Its two displayed margin boundaries are one unit apart in the fixture. The diagram illustrates why a separator is judged by its nearest class points, not by an arbitrary visual gap.',
        vi: 'Đường trung tâm là siêu phẳng phân tách cố định trong phác thảo hai chiều này. Hai biên margin hiển thị cách nhau một đơn vị trong fixture. Sơ đồ minh họa vì sao mặt phân tách được đánh giá bởi các điểm lớp gần nhất, không phải khoảng trống trực quan tùy ý.',
      },
      required: true,
      textAlternative: {
        en: 'A separator card shows a central line and two parallel margin boundaries separated by one fixed unit.',
        vi: 'Thẻ mặt phân tách cho thấy đường trung tâm và hai biên margin song song cách nhau một đơn vị cố định.',
      },
      title: {
        en: 'Read the fixed margin geometry',
        vi: 'Đọc hình học margin cố định',
      },
    },
    {
      id: 'svm-support-vectors',
      narration: {
        en: 'The marked points nearest the margin boundaries are the support vectors for this illustration. They constrain the displayed separator; a point farther from the margins contributes to the diagram but is not marked as equally decisive. This does not claim that the static line is optimal for other data.',
        vi: 'Các điểm được đánh dấu gần biên margin nhất là support vector của minh họa này. Chúng ràng buộc mặt phân tách hiển thị; điểm xa margin hơn vẫn góp phần vào sơ đồ nhưng không được đánh dấu là quyết định như nhau. Điều này không khẳng định đường tĩnh là tối ưu cho dữ liệu khác.',
      },
      required: true,
      textAlternative: {
        en: 'A support-vector card marks the closest points to the margin boundaries and leaves distant points unmarked.',
        vi: 'Thẻ support vector đánh dấu các điểm gần biên margin nhất và để các điểm xa không đánh dấu.',
      },
      title: {
        en: 'Identify the marked support vectors',
        vi: 'Xác định các support vector được đánh dấu',
      },
    },
  ],
  taskFingerprint: 'demo-svm-fixed-margin-support-vector-geometry',
  title: {
    en: 'SVM demo: fixed margin and support vectors',
    vi: 'Demo SVM: margin và support vector cố định',
  },
  visualization: {
    boundary: [
      { x: 130, y: 34 },
      { x: 130, y: 208 },
    ],
    points: [
      { classification: 'negative', label: '(0, 0) → 0', positiveFromStep: 0, x: 54, y: 178 },
      {
        classification: 'negative',
        label: '(0, 1) support → 0',
        positiveFromStep: 3,
        x: 102,
        y: 104,
      },
      {
        classification: 'positive',
        label: '(1, 0) support → 1',
        positiveFromStep: 3,
        x: 158,
        y: 136,
      },
      {
        classification: 'positive',
        label: '(1, 1) support → 1',
        positiveFromStep: 3,
        x: 208,
        y: 60,
      },
    ],
  },
};

const stellarClustersDemo: FixedDemoDraft = {
  algorithmId: 'kmeans',
  courseId: 'course-classical-ml',
  demoId: 'demo-stellar-clusters',
  draftProvenance: cmlM08ClusteringDemoDraftProvenance,
  fixedRun: {
    caption: {
      en: 'A static clustering fixture: K = 2 is chosen only to make one assignment-and-update pass inspectable. The anonymous coordinates are not astronomical observations or externally sourced records.',
      vi: 'Fixture phân cụm tĩnh: K = 2 chỉ được chọn để quan sát một lượt gán-cập nhật. Các tọa độ ẩn danh không phải quan sát thiên văn hoặc bản ghi lấy từ bên ngoài.',
    },
    datasetVersionId: 'dataset-demo-stellar-clusters-v1',
    parameterValues: [{ id: 'k', value: 2 }],
    rows: [
      { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
      { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
      { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
      { input: [1, 1], predictedOutput: 1, targetOutput: 1 },
    ],
  },
  learningObjective: {
    en: 'Inspect one fixed clustering pass through initial centroids, nearest-centroid assignments, mean updates, and a cautious reading of the resulting groups.',
    vi: 'Quan sát một lượt phân cụm cố định qua centroid khởi tạo, gán centroid gần nhất, cập nhật trung bình và cách đọc thận trọng các nhóm kết quả.',
  },
  moduleId: 'cml-m08-clustering',
  problemId: 'problem-demo-stellar-clusters',
  requiredStepIds: [
    'cluster-problem',
    'cluster-initial-centroids',
    'cluster-assign-update',
    'cluster-read-result',
  ],
  revisionId: 'demo-stellar-clusters-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'cluster-problem',
      narration: {
        en: 'This is a fixed set of four anonymous coordinates with no class labels. The task is to inspect a grouping procedure, not to infer a real type of star, person, or event from a cluster number.',
        vi: 'Đây là tập bốn tọa độ ẩn danh cố định không có nhãn lớp. Nhiệm vụ là quan sát thủ tục gom nhóm, không suy ra loại sao, con người hay sự kiện thật từ số cụm.',
      },
      required: true,
      textAlternative: {
        en: 'A problem card states that four anonymous points will be grouped without ground-truth class labels.',
        vi: 'Thẻ bài toán nêu bốn điểm ẩn danh sẽ được gom nhóm mà không có nhãn lớp sự thật.',
      },
      title: {
        en: 'Frame an unlabelled grouping task',
        vi: 'Đặt khung nhiệm vụ gom nhóm không nhãn',
      },
    },
    {
      id: 'cluster-initial-centroids',
      narration: {
        en: 'The fixture declares K = 2 and shows two initial centroids. Initialization matters because K-means can converge to a local minimum, so the starting positions are evidence to record rather than hidden configuration.',
        vi: 'Fixture nêu K = 2 và hiển thị hai centroid khởi tạo. Khởi tạo quan trọng vì K-means có thể hội tụ ở cực tiểu cục bộ, nên vị trí bắt đầu là bằng chứng cần ghi thay vì cấu hình bị che giấu.',
      },
      required: true,
      textAlternative: {
        en: 'A centroid card names K = 2 and makes two fixed starting centres visible.',
        vi: 'Thẻ centroid nêu K = 2 và làm rõ hai tâm bắt đầu cố định.',
      },
      title: {
        en: 'Inspect the fixed initial centroids',
        vi: 'Quan sát các centroid khởi tạo cố định',
      },
    },
    {
      id: 'cluster-assign-update',
      narration: {
        en: 'For each point, compare distances to the two current centroids and assign it to the nearer one. Then replace each centroid with the mean of its assigned points. This fixture displays one deterministic teaching pass; it does not run training or fetch data.',
        vi: 'Với mỗi điểm, so sánh khoảng cách tới hai centroid hiện tại và gán nó cho tâm gần hơn. Sau đó thay mỗi centroid bằng trung bình của các điểm đã gán. Fixture hiển thị một lượt dạy học xác định; nó không chạy huấn luyện hay lấy dữ liệu.',
      },
      required: true,
      textAlternative: {
        en: 'An assignment-and-update card maps each fixed point to its nearer centre, then states that the next centres are means of their assigned points.',
        vi: 'Thẻ gán-cập nhật ghép mỗi điểm cố định với tâm gần hơn, rồi nêu tâm kế tiếp là trung bình của các điểm đã gán.',
      },
      title: {
        en: 'Follow the assignment-and-update pass',
        vi: 'Theo dõi lượt gán-cập nhật',
      },
    },
    {
      id: 'cluster-read-result',
      narration: {
        en: 'Read the two displayed groups as a compactness illustration only. A lower within-cluster sum of squares can support this fixed arrangement, but it does not prove that K = 2 is uniquely correct or that every real shape fits K-means assumptions.',
        vi: 'Đọc hai nhóm hiển thị chỉ như minh họa độ gọn. Tổng bình phương trong cụm thấp hơn có thể ủng hộ cách sắp xếp cố định này, nhưng không chứng minh K = 2 là duy nhất đúng hoặc mọi hình dạng thực đều khớp giả định K-means.',
      },
      required: true,
      textAlternative: {
        en: 'A result card reports two fixed groups and cautions that compactness is evidence, not ground truth.',
        vi: 'Thẻ kết quả báo hai nhóm cố định và lưu ý độ gọn là bằng chứng, không phải sự thật nền.',
      },
      title: {
        en: 'Interpret the fixed grouping cautiously',
        vi: 'Diễn giải cách gom nhóm cố định một cách thận trọng',
      },
    },
  ],
  taskFingerprint: 'demo-clustering-fixed-centroid-assignment-update-compactness',
  title: {
    en: 'Clustering demo: fixed centroid assignment',
    vi: 'Demo phân cụm: gán centroid cố định',
  },
  visualization: {
    boundary: [
      { x: 40, y: 176 },
      { x: 126, y: 112 },
      { x: 214, y: 48 },
    ],
    points: [
      { label: '(0, 0) → cluster 0', positiveFromStep: 3, x: 58, y: 172 },
      { label: '(0, 1) → cluster 0', positiveFromStep: 3, x: 58, y: 116 },
      { label: '(1, 0) → cluster 1', positiveFromStep: 3, x: 172, y: 172 },
      { label: '(1, 1) → cluster 1', positiveFromStep: 3, x: 172, y: 116 },
    ],
  },
};

const pcaSensorCompressionDemo: FixedDemoDraft = {
  algorithmId: 'pca',
  courseId: 'course-classical-ml',
  demoId: 'demo-pca-sensor-compression',
  draftProvenance: cmlM09PcaDemoDraftProvenance,
  fixedRun: {
    caption: {
      en: 'A static paired-measurement fixture: one component is retained only to inspect the projection trade-off. The numeric output fields are stable row identifiers for this teaching fixture, not reported PCA scores or measurements from real sensors.',
      vi: 'Fixture phép đo cặp tĩnh: chỉ giữ một component để quan sát đánh đổi của phép chiếu. Các trường đầu ra số là ID hàng ổn định của fixture dạy học này, không phải điểm PCA được báo cáo hoặc số đo cảm biến thật.',
    },
    datasetVersionId: 'dataset-demo-pca-sensor-compression-v1',
    parameterValues: [{ id: 'components', value: 1 }],
    rows: [
      { input: [1, 1], predictedOutput: 0, targetOutput: 0 },
      { input: [2, 2], predictedOutput: 1, targetOutput: 1 },
      { input: [3, 3], predictedOutput: 2, targetOutput: 2 },
      { input: [4, 4], predictedOutput: 3, targetOutput: 3 },
    ],
  },
  learningObjective: {
    en: 'Inspect a fixed one-component PCA teaching trace through centering, a retained shared-variation direction, and the approximation that follows from dropping another direction.',
    vi: 'Quan sát dấu vết dạy học PCA một component cố định qua centering, hướng biến thiên chung được giữ và xấp xỉ phát sinh khi bỏ một hướng khác.',
  },
  moduleId: 'cml-m09-pca',
  problemId: 'problem-demo-pca-sensor-compression',
  requiredStepIds: ['pca-problem', 'pca-center', 'pca-project', 'pca-read-tradeoff'],
  revisionId: 'demo-pca-sensor-compression-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'pca-problem',
      narration: {
        en: 'This fixture contains four synthetic paired measurements, not data from real sensors or people. It asks how a shorter representation can describe shared variation; it does not classify, rank, or diagnose any record.',
        vi: 'Fixture này chứa bốn phép đo cặp tổng hợp, không phải dữ liệu từ cảm biến thật hoặc con người. Nó hỏi biểu diễn ngắn hơn có thể mô tả biến thiên chung ra sao; nó không phân loại, xếp hạng hoặc chẩn đoán bất kỳ bản ghi nào.',
      },
      required: true,
      textAlternative: {
        en: 'A problem card introduces four synthetic paired measurements and a dimensionality-reduction question.',
        vi: 'Thẻ bài toán giới thiệu bốn phép đo cặp tổng hợp và câu hỏi giảm chiều.',
      },
      title: {
        en: 'Frame a synthetic shared-variation task',
        vi: 'Đặt khung bài toán biến thiên chung tổng hợp',
      },
    },
    {
      id: 'pca-center',
      narration: {
        en: 'Center each feature before reading the component direction. The pinned account says PCA centers but does not automatically scale each feature before SVD, so the fixture records those as separate choices rather than treating them as the same operation.',
        vi: 'Center từng feature trước khi đọc hướng component. Cách mô tả đã pin nêu PCA center nhưng không tự scale từng feature trước SVD, nên fixture ghi chúng là các lựa chọn riêng thay vì coi là cùng một thao tác.',
      },
      required: true,
      textAlternative: {
        en: 'A preprocessing card distinguishes centering each feature from automatic scaling.',
        vi: 'Thẻ tiền xử lý phân biệt centering từng feature với scaling tự động.',
      },
      title: {
        en: 'Center before projecting',
        vi: 'Center trước khi chiếu',
      },
    },
    {
      id: 'pca-project',
      narration: {
        en: 'Retain one displayed orthogonal component as the shared-variation direction. The fixed diagonal guide is only a conceptual drawing: it shows that the representation has one dimension after projection, not a live numerical PCA calculation or a score for any row.',
        vi: 'Giữ một component trực giao hiển thị như hướng biến thiên chung. Đường chéo cố định chỉ là hình vẽ khái niệm: nó cho thấy biểu diễn còn một chiều sau phép chiếu, không phải phép tính PCA số học live hoặc điểm số cho bất kỳ hàng nào.',
      },
      required: true,
      textAlternative: {
        en: 'A projection card shows one retained shared-variation direction for four fixed paired measurements.',
        vi: 'Thẻ phép chiếu hiển thị một hướng biến thiên chung được giữ cho bốn phép đo cặp cố định.',
      },
      title: {
        en: 'Keep one shared-variation direction',
        vi: 'Giữ một hướng biến thiên chung',
      },
    },
    {
      id: 'pca-read-tradeoff',
      narration: {
        en: 'Read the result as a reduction trade-off: dropping lower-variance directions can preserve much of the explained variance while omitting information. If a reconstruction is shown, call it approximate unless appropriate evidence establishes otherwise; the source specifically notes a randomized PCA inverse transform is not exact.',
        vi: 'Đọc kết quả như đánh đổi giảm chiều: bỏ các hướng phương sai thấp có thể giữ phần lớn phương sai đã giải thích trong khi bỏ sót thông tin. Nếu hiển thị tái dựng, hãy gọi nó là xấp xỉ trừ khi có bằng chứng phù hợp; nguồn nêu rõ inverse transform PCA randomized không chính xác.',
      },
      required: true,
      textAlternative: {
        en: 'A result card states that one retained direction is a reduced view with an approximation limit.',
        vi: 'Thẻ kết quả nêu một hướng được giữ là góc nhìn rút gọn với giới hạn xấp xỉ.',
      },
      title: {
        en: 'Read the reduction trade-off',
        vi: 'Đọc đánh đổi giảm chiều',
      },
    },
  ],
  taskFingerprint: 'demo-pca-fixed-centering-projection-approximation',
  title: {
    en: 'PCA demo: fixed one-component projection',
    vi: 'Demo PCA: phép chiếu một component cố định',
  },
  visualization: {
    boundary: [
      { x: 42, y: 180 },
      { x: 210, y: 44 },
    ],
    points: [
      { label: '(1, 1) synthetic row', positiveFromStep: 2, x: 58, y: 168 },
      { label: '(2, 2) synthetic row', positiveFromStep: 2, x: 96, y: 138 },
      { label: '(3, 3) synthetic row', positiveFromStep: 2, x: 136, y: 106 },
      { label: '(4, 4) synthetic row', positiveFromStep: 2, x: 176, y: 76 },
    ],
  },
};

const DEFAULT_STEP_DURATION_MS = 3_000;

const adapterVersionByAlgorithmId: Readonly<Record<string, string>> = {
  'decision-tree': 'ml-cart-v1',
  kmeans: 'ml-kmeans-v1',
  knn: 'ml-knn-v1',
  'linear-regression': 'tfjs-core-v1',
  'logistic-regression': 'tfjs-layers-v1',
  mlp: 'tfjs-layers-v1',
  pca: 'ml-pca-v1',
  perceptron: 'tfjs-core-v1',
  'ridge-regression': 'tfjs-core-v1',
  svm: 'libsvm-js-v1',
};

function canonicalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeForHash);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Readonly<Record<string, unknown>>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalizeForHash(nestedValue)]),
    );
  }

  return value;
}

function createSha256(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalizeForHash(value)))
    .digest('hex');
}

function createSemanticTaskFingerprint(input: {
  contextId: string;
  datasetId: string | null;
  expectedReasoningType: string;
  learningObjectiveId: string;
  taskType: string;
}): string {
  const canonicalPayload = {
    fingerprintSchemaVersion: 1,
    contextId: input.contextId.trim(),
    datasetId: input.datasetId?.trim() || null,
    taskType: input.taskType.trim(),
    learningObjectiveId: input.learningObjectiveId.trim(),
    expectedReasoningType: input.expectedReasoningType.trim(),
  };

  return createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
}

function getDraftSourceIds(demo: FixedDemoDraft): readonly string[] {
  const sourceIds =
    demo.draftProvenance?.sourceTrace?.kind === 'snapshot-pinned'
      ? demo.draftProvenance.sourceTrace.sourceSnapshots.map((source) => source.sourceId)
      : (demo.draftProvenance?.candidateSourceIds ?? []);
  const uniqueSourceIds = [...new Set(sourceIds)];

  if (uniqueSourceIds.length === 0) {
    throw new Error(`Demo ${demo.demoId} must reference at least one pinned source.`);
  }

  return uniqueSourceIds;
}

export function getFixedDemoDeterministicProof(
  demo: Pick<
    FixedDemoManifest,
    | 'adapterVersion'
    | 'algorithmId'
    | 'demoId'
    | 'fixedRun'
    | 'problemId'
    | 'seed'
    | 'steps'
    | 'visualization'
  >,
): Pick<FixedDemoManifest, 'resultHash' | 'visualFixture'> {
  const visualFixture = {
    hash: createSha256({
      demoId: demo.demoId,
      steps: demo.steps.map((step) => ({
        durationMs: step.durationMs,
        id: step.id,
        textAlternative: step.textAlternative,
        title: step.title,
      })),
      visualization: demo.visualization,
    }),
    totalDurationMs: demo.steps.reduce((total, step) => total + step.durationMs, 0),
    version: 'release-fixed-demo-visual-v1' as const,
  };

  return {
    resultHash: createSha256({
      adapterVersion: demo.adapterVersion,
      algorithmId: demo.algorithmId,
      fixedRun: demo.fixedRun ?? null,
      problemId: demo.problemId,
      seed: demo.seed,
      visualization: demo.visualization,
    }),
    visualFixture,
  };
}

function finalizeFixedDemo(demo: FixedDemoDraft): FixedDemoManifest {
  const adapterVersion = adapterVersionByAlgorithmId[demo.algorithmId];

  if (!adapterVersion) {
    throw new Error(`Demo ${demo.demoId} has no deterministic adapter version.`);
  }

  const sourceIds = getDraftSourceIds(demo);
  const steps = demo.steps.map((step) => ({ ...step, durationMs: DEFAULT_STEP_DURATION_MS }));
  const deterministicProof = getFixedDemoDeterministicProof({
    adapterVersion,
    algorithmId: demo.algorithmId,
    demoId: demo.demoId,
    ...(demo.fixedRun ? { fixedRun: demo.fixedRun } : {}),
    problemId: demo.problemId,
    seed: demo.seed,
    steps,
    visualization: demo.visualization,
  });

  return {
    ...demo,
    adapterVersion,
    ...deterministicProof,
    sourceIds,
    steps,
    taskFingerprint: createSemanticTaskFingerprint({
      contextId: `${demo.courseId}:${demo.moduleId}:${demo.demoId}`,
      datasetId: demo.fixedRun?.datasetVersionId ?? null,
      expectedReasoningType: `problem:${demo.problemId}`,
      learningObjectiveId: demo.taskFingerprint,
      taskType: 'fixed-demo',
    }),
  };
}

const handAuthoredDemos = [
  andGateDemo,
  mlpCheckerboardDemo,
  linearCalibrationDemo,
  regularizationNoisySignalDemo,
  logisticAdmissionDemo,
  neighborFlowerDemo,
  treeForestHabitatDemo,
  svmMarginDemo,
  stellarClustersDemo,
  pcaSensorCompressionDemo,
] as const;
const fixedDemos = handAuthoredDemos.map(finalizeFixedDemo);

export function getFixedDemo(demoId: string | undefined) {
  return fixedDemos.find((demo) => demo.demoId === demoId);
}
