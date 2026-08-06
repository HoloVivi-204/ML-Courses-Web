import {
  getReleaseLearningCatalog,
  type LocalizedText,
  type ReleaseLearningModule,
} from './release-learning-catalog.js';
import {
  cmlM02SourceTrace,
  cmlM03SourceTrace,
  dlM01SourceTrace,
  dlM02SourceTrace,
  type DraftProvenance,
} from './content-source-trace.js';

const DL_M01_SOURCE_IDS = dlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const DL_M02_SOURCE_IDS = dlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M02_SOURCE_IDS = cmlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M03_SOURCE_IDS = cmlM03SourceTrace.sourceSnapshots.map((source) => source.sourceId);

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

export interface DemoStep {
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
  algorithmId: string;
  courseId: string;
  demoId: string;
  draftProvenance?: DraftProvenance;
  fixedRun?: FixedDemoRun;
  learningObjective?: LocalizedText;
  moduleId: string;
  problemId: string;
  requiredStepIds: readonly string[];
  revisionId: string;
  seed: number;
  steps: readonly DemoStep[];
  taskFingerprint?: string;
  title: LocalizedText;
  visualization: FixedDemoVisualization;
}

export const andGateDemo: FixedDemoManifest = {
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

export const mlpCheckerboardDemo: FixedDemoManifest = {
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

export const linearCalibrationDemo: FixedDemoManifest = {
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

export const regularizationNoisySignalDemo: FixedDemoManifest = {
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

const demoProblemIdByDemoId: Readonly<Record<string, string>> = {
  'demo-linear-calibration': 'problem-demo-linear-calibration',
  'demo-regularization-noisy-signal': 'problem-demo-regularization-noisy-signal',
  'demo-logistic-admission': 'problem-demo-logistic-admission',
  'demo-neighbor-flower': 'problem-demo-neighbor-flower',
  'demo-tree-forest-habitat': 'problem-demo-tree-forest-habitat',
  'demo-svm-margin': 'problem-demo-svm-margin',
  'demo-stellar-clusters': 'problem-demo-stellar-clusters',
  'demo-pca-sensor-compression': 'problem-demo-pca-sensor-compression',
  'demo-mlp-checkerboard': 'problem-demo-mlp-checkerboard',
};

interface DemoDraftDefinition {
  decision: LocalizedText;
  evidence: LocalizedText;
  learningObjective: LocalizedText;
  result: LocalizedText;
  taskFingerprint: string;
  topic: LocalizedText;
}

const demoDraftDefinitions: Readonly<Record<string, DemoDraftDefinition>> = {
  'demo-logistic-admission': {
    decision: {
      en: 'The fixed logistic score becomes a probability, then a policy threshold turns it into a review decision.',
      vi: 'Điểm logistic cố định trở thành xác suất, rồi ngưỡng chính sách biến nó thành quyết định xem xét.',
    },
    evidence: {
      en: 'The fixed records show preparation signals and a binary outcome without asking the learner to alter a threshold.',
      vi: 'Các hồ sơ cố định cho thấy tín hiệu chuẩn bị và kết quả nhị phân mà không yêu cầu người học đổi ngưỡng.',
    },
    learningObjective: {
      en: 'Separate a probability estimate from the policy decision made with it.',
      vi: 'Tách ước lượng xác suất khỏi quyết định chính sách dùng xác suất đó.',
    },
    result: {
      en: 'The fixed outcome illustrates a threshold choice; it does not claim that one threshold fits every context.',
      vi: 'Kết quả cố định minh họa việc chọn ngưỡng; nó không khẳng định một ngưỡng phù hợp mọi bối cảnh.',
    },
    taskFingerprint: 'demo-logistic-probability-policy-threshold',
    topic: { en: 'probability and threshold', vi: 'xác suất và ngưỡng' },
  },
  'demo-neighbor-flower': {
    decision: {
      en: 'The fixed KNN view assigns the new sample from its nearest labelled neighbours after all displayed features share a scale.',
      vi: 'Góc nhìn KNN cố định gán mẫu mới từ láng giềng đã gán nhãn gần nhất sau khi các feature hiển thị cùng thang đo.',
    },
    evidence: {
      en: 'The fixed flower measurements are small enough to inspect neighbour distances without changing k or the dataset.',
      vi: 'Các số đo hoa cố định đủ nhỏ để quan sát khoảng cách láng giềng mà không đổi k hoặc dataset.',
    },
    learningObjective: {
      en: 'Explain a nearest-neighbour classification from fixed, scaled evidence.',
      vi: 'Giải thích phân loại láng giềng gần nhất từ bằng chứng cố định đã chuẩn hóa.',
    },
    result: {
      en: 'The final class follows the displayed neighbours and highlights that distance depends on representation.',
      vi: 'Lớp cuối theo các láng giềng hiển thị và nhấn mạnh khoảng cách phụ thuộc vào cách biểu diễn.',
    },
    taskFingerprint: 'demo-knn-flower-neighbour-representation',
    topic: { en: 'nearest-neighbour classification', vi: 'phân loại láng giềng gần nhất' },
  },
  'demo-tree-forest-habitat': {
    decision: {
      en: 'A fixed tree follows transparent split rules, while the forest combines several fixed tree votes before reporting a class.',
      vi: 'Cây cố định đi theo quy tắc chia minh bạch, còn forest tổng hợp phiếu từ nhiều cây cố định trước khi báo lớp.',
    },
    evidence: {
      en: 'The habitat cards expose the few feature checks used by each tree and keep the voting set fixed.',
      vi: 'Các thẻ môi trường cho thấy vài kiểm tra feature của từng cây và giữ tập bỏ phiếu cố định.',
    },
    learningObjective: {
      en: 'Contrast one interpretable split path with a fixed ensemble vote.',
      vi: 'Đối chiếu một đường chia dễ giải thích với một phiếu ensemble cố định.',
    },
    result: {
      en: 'The result makes the vote visible and leaves the learner to consider when diversity reduces brittleness.',
      vi: 'Kết quả làm rõ phiếu bầu và để người học cân nhắc khi nào đa dạng giảm tính mong manh.',
    },
    taskFingerprint: 'demo-tree-forest-habitat-voting',
    topic: { en: 'tree rules and forest voting', vi: 'quy tắc cây và phiếu forest' },
  },
  'demo-svm-margin': {
    decision: {
      en: 'The fixed separator is chosen for margin, so the closest support points constrain the boundary more than distant points.',
      vi: 'Ranh giới cố định được chọn theo margin, nên các support point gần nhất ràng buộc đường biên mạnh hơn điểm ở xa.',
    },
    evidence: {
      en: 'The fixed sketch shows two labelled clouds and the few points nearest the separating line.',
      vi: 'Phác thảo cố định cho thấy hai đám mây có nhãn và vài điểm gần đường phân tách nhất.',
    },
    learningObjective: {
      en: 'Read a fixed margin and identify why support vectors matter.',
      vi: 'Đọc một margin cố định và xác định vì sao support vector quan trọng.',
    },
    result: {
      en: 'The final frame preserves room around the line instead of fitting every distant point tightly.',
      vi: 'Frame cuối giữ khoảng trống quanh đường biên thay vì khớp chặt mọi điểm ở xa.',
    },
    taskFingerprint: 'demo-svm-margin-support-points',
    topic: { en: 'support-vector margin', vi: 'margin của support vector' },
  },
  'demo-stellar-clusters': {
    decision: {
      en: 'The fixed clustering view groups nearby observations and then checks whether the selected centres describe compact groups.',
      vi: 'Góc nhìn phân cụm cố định gom các quan sát gần nhau rồi kiểm tra tâm đã chọn có mô tả nhóm gọn không.',
    },
    evidence: {
      en: 'The fixed points are unlabeled and remain unchanged while the learner reads the centre assignments.',
      vi: 'Các điểm cố định không có nhãn và giữ nguyên khi người học đọc gán tâm.',
    },
    learningObjective: {
      en: 'Interpret a fixed clustering result without treating cluster labels as ground truth classes.',
      vi: 'Diễn giải kết quả phân cụm cố định mà không coi nhãn cụm là lớp sự thật.',
    },
    result: {
      en: 'The result reports compactness as a clue, not a proof that the chosen number of groups is uniquely correct.',
      vi: 'Kết quả báo độ gọn như một gợi ý, không phải bằng chứng số nhóm đã chọn là duy nhất đúng.',
    },
    taskFingerprint: 'demo-clustering-stellar-centres-compactness',
    topic: { en: 'fixed cluster centres', vi: 'tâm cụm cố định' },
  },
  'demo-pca-sensor-compression': {
    decision: {
      en: 'The fixed PCA projection keeps the directions with most shared variation and reconstructs the original signal approximately.',
      vi: 'Phép chiếu PCA cố định giữ các hướng có biến thiên chung lớn nhất và tái dựng tín hiệu gốc gần đúng.',
    },
    evidence: {
      en: 'The fixed sensor table contains related measurements so shared variation can be compared with the reconstruction.',
      vi: 'Bảng cảm biến cố định có các số đo liên quan để so sánh biến thiên chung với tái dựng.',
    },
    learningObjective: {
      en: 'Relate a fixed PCA projection to retained variation and reconstruction loss.',
      vi: 'Liên hệ phép chiếu PCA cố định với biến thiên giữ lại và lỗi tái dựng.',
    },
    result: {
      en: 'The final summary states what was kept and what approximation cost remains.',
      vi: 'Tóm tắt cuối nêu điều được giữ và chi phí xấp xỉ còn lại.',
    },
    taskFingerprint: 'demo-pca-sensor-reconstruction',
    topic: { en: 'PCA compression', vi: 'nén PCA' },
  },
};

function getDemoDraftDefinition(demoId: string): DemoDraftDefinition {
  const definition = demoDraftDefinitions[demoId];

  if (!definition) {
    throw new Error(`Missing draft demo definition for ${demoId}.`);
  }

  return definition;
}

function createDemoDraftProvenance(courseId: string): DraftProvenance {
  const candidateSourceIds =
    courseId === 'course-classical-ml'
      ? ['microsoft-ml-for-beginners', 'google-ml-crash-course', 'mit-ocw', 'sklearn-docs']
      : ['d2l-vi', 'microsoft-ai-for-beginners', 'google-ml-crash-course', 'tensorflow-tutorials'];

  return {
    candidateSourceIds,
    contentReviewStatus: 'pending-operator-review' as const,
    externalEvidenceStatus: 'not-collected' as const,
    importStatus: 'draft-only' as const,
  };
}

function createGenericDemo(input: {
  courseId: string;
  demoId: string;
  module: ReleaseLearningModule;
}): FixedDemoManifest {
  const algorithmId = input.module.unlockAlgorithmIds[0] ?? 'learning-review';
  const problemId = demoProblemIdByDemoId[input.demoId] ?? `problem-${input.demoId}`;
  const stepIds = ['problem', 'data', 'decision', 'result'] as const;

  return {
    algorithmId,
    courseId: input.courseId,
    demoId: input.demoId,
    moduleId: input.module.moduleId,
    problemId,
    requiredStepIds: stepIds,
    revisionId: `${input.demoId}-rev-r1`,
    seed: 42,
    visualization: {
      boundary: [
        { x: 52, y: 168 },
        { x: 92, y: 132 },
        { x: 132, y: 112 },
        { x: 172, y: 78 },
        { x: 204, y: 62 },
      ],
      points: [
        { label: 'D1', positiveFromStep: 2, x: 92, y: 132 },
        { label: 'D2', positiveFromStep: 3, x: 172, y: 78 },
      ],
    },
    title: {
      en: `${algorithmId}: ${problemId}`,
      vi: `${algorithmId}: ${problemId}`,
    },
    steps: [
      {
        id: 'problem',
        narration: {
          en: `Define the fixed task for ${input.module.title.en}.`,
          vi: `Xác định nhiệm vụ cố định cho ${input.module.title.vi}.`,
        },
        required: true,
        textAlternative: {
          en: `A fixed problem card for ${problemId}.`,
          vi: `Một thẻ bài toán cố định cho ${problemId}.`,
        },
        title: {
          en: 'Define the task',
          vi: 'Xác định nhiệm vụ',
        },
      },
      {
        id: 'data',
        narration: {
          en: 'Inspect the fixed input signal before reading the model result.',
          vi: 'Quan sát tín hiệu đầu vào cố định trước khi đọc kết quả mô hình.',
        },
        required: true,
        textAlternative: {
          en: 'A small static data summary is shown; no live training controls are present.',
          vi: 'Một tóm tắt dữ liệu tĩnh được hiển thị; không có điều khiển train live.',
        },
        title: {
          en: 'Inspect fixed data',
          vi: 'Quan sát dữ liệu cố định',
        },
      },
      {
        id: 'decision',
        narration: {
          en: `Read how ${algorithmId} turns the signal into a model decision.`,
          vi: `Đọc cách ${algorithmId} biến tín hiệu thành quyết định mô hình.`,
        },
        required: true,
        textAlternative: {
          en: 'The decision step highlights the model output and its metric.',
          vi: 'Bước quyết định làm nổi bật đầu ra mô hình và metric.',
        },
        title: {
          en: 'Read the decision',
          vi: 'Đọc quyết định',
        },
      },
      {
        id: 'result',
        narration: {
          en: 'Confirm the fixed result before the module quiz opens.',
          vi: 'Xác nhận kết quả cố định trước khi quiz module mở.',
        },
        required: true,
        textAlternative: {
          en: 'The final frame summarises the metric and the limitation to remember.',
          vi: 'Frame cuối tóm tắt metric và giới hạn cần nhớ.',
        },
        title: {
          en: 'Confirm the result',
          vi: 'Xác nhận kết quả',
        },
      },
    ],
  };
}

function createExpandedDemo(input: {
  courseId: string;
  demoId: string;
  module: ReleaseLearningModule;
}): FixedDemoManifest {
  const genericDemo = createGenericDemo(input);
  const definition = getDemoDraftDefinition(input.demoId);
  const stepDrafts = [
    {
      narration: {
        en: `This fixed demo frames ${definition.topic.en} as one inspectable learning decision.`,
        vi: `Demo cố định này đặt ${definition.topic.vi} thành một quyết định học tập có thể quan sát.`,
      },
      textAlternative: {
        en: `A fixed problem card introduces ${definition.topic.en}.`,
        vi: `Một thẻ bài toán cố định giới thiệu ${definition.topic.vi}.`,
      },
      title: { en: `Frame ${definition.topic.en}`, vi: `Đặt khung ${definition.topic.vi}` },
    },
    {
      narration: definition.evidence,
      textAlternative: {
        en: 'A static evidence summary is shown without parameter or dataset controls.',
        vi: 'Một tóm tắt bằng chứng tĩnh được hiển thị, không có điều khiển tham số hoặc dataset.',
      },
      title: { en: 'Inspect fixed evidence', vi: 'Quan sát bằng chứng cố định' },
    },
    {
      narration: definition.decision,
      textAlternative: {
        en: 'The fixed model decision is shown with its relevant metric or rule.',
        vi: 'Quyết định mô hình cố định được hiển thị cùng metric hoặc quy tắc liên quan.',
      },
      title: { en: 'Read the fixed decision', vi: 'Đọc quyết định cố định' },
    },
    {
      narration: definition.result,
      textAlternative: {
        en: 'The final frame reports the fixed result and one limitation to remember.',
        vi: 'Frame cuối báo kết quả cố định và một giới hạn cần ghi nhớ.',
      },
      title: { en: 'Interpret the result', vi: 'Diễn giải kết quả' },
    },
  ] as const;

  return {
    ...genericDemo,
    draftProvenance: createDemoDraftProvenance(input.courseId),
    learningObjective: definition.learningObjective,
    steps: genericDemo.steps.map((step, index) => {
      const draftStep = stepDrafts[index];

      if (!draftStep) {
        throw new Error(`Missing fixed demo step ${index + 1} for ${input.demoId}.`);
      }

      return { ...step, ...draftStep };
    }),
    taskFingerprint: definition.taskFingerprint,
  };
}

const handAuthoredDemos = [
  andGateDemo,
  mlpCheckerboardDemo,
  linearCalibrationDemo,
  regularizationNoisySignalDemo,
] as const;
const handAuthoredDemoIds = new Set(handAuthoredDemos.map((demo) => demo.demoId));

const generatedDemos = getReleaseLearningCatalog().courses.flatMap((course) =>
  course.modules
    .filter((module) => module.demoId !== null && !handAuthoredDemoIds.has(module.demoId))
    .map((module) =>
      createExpandedDemo({
        courseId: course.courseId,
        demoId: module.demoId!,
        module,
      }),
    ),
);
const fixedDemos = [...handAuthoredDemos, ...generatedDemos] as const;

export function getFixedDemo(demoId: string | undefined) {
  return fixedDemos.find((demo) => demo.demoId === demoId);
}
