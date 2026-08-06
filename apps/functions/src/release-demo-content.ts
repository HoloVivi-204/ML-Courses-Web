import {
  getReleaseLearningCatalog,
  type LocalizedText,
  type ReleaseLearningModule,
} from './release-learning-catalog.js';
import { dlM01SourceTrace, type DraftProvenance } from './content-source-trace.js';

const DL_M01_SOURCE_IDS = dlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);

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
  'demo-linear-calibration': {
    decision: {
      en: 'A straight calibration line turns the observed input into an estimate; the residual shows the remaining gap.',
      vi: 'Một đường hiệu chuẩn thẳng biến đầu vào quan sát thành ước lượng; phần dư cho thấy khoảng cách còn lại.',
    },
    evidence: {
      en: 'The fixed readings are ordered from a reference instrument and a simple sensor; no learner parameter is editable.',
      vi: 'Các số đo cố định đến từ dụng cụ tham chiếu và cảm biến đơn giản; người học không thể sửa tham số.',
    },
    learningObjective: {
      en: 'Read a fixed linear calibration and use residuals to judge its limitation.',
      vi: 'Đọc một hiệu chuẩn tuyến tính cố định và dùng phần dư để đánh giá giới hạn của nó.',
    },
    result: {
      en: 'The result is a fixed baseline, not a replacement for checking new measurements.',
      vi: 'Kết quả là baseline cố định, không thay thế việc kiểm tra số đo mới.',
    },
    taskFingerprint: 'demo-linear-calibration-residual-reading',
    topic: { en: 'linear calibration', vi: 'hiệu chuẩn tuyến tính' },
  },
  'demo-regularization-noisy-signal': {
    decision: {
      en: 'Ridge keeps related signal weights smaller, while Lasso can suppress a weak redundant signal in the fixed comparison.',
      vi: 'Ridge giữ trọng số tín hiệu liên quan nhỏ hơn, còn Lasso có thể triệt một tín hiệu dư yếu trong so sánh cố định.',
    },
    evidence: {
      en: 'The fixed signal table contains overlapping measurements and one noisy measurement so coefficient instability is visible.',
      vi: 'Bảng tín hiệu cố định có các số đo chồng chéo và một số đo nhiễu để thấy hệ số không ổn định.',
    },
    learningObjective: {
      en: 'Compare a noisy regression fit with a regularised fixed alternative.',
      vi: 'So sánh khớp hồi quy nhiễu với một phương án regularization cố định.',
    },
    result: {
      en: 'The stable result trades a little fit for coefficients that are easier to trust on new observations.',
      vi: 'Kết quả ổn định đánh đổi một phần độ khớp để hệ số đáng tin hơn trên quan sát mới.',
    },
    taskFingerprint: 'demo-regularisation-noisy-coefficients',
    topic: { en: 'regularisation under noisy signals', vi: 'regularization với tín hiệu nhiễu' },
  },
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
  'demo-mlp-checkerboard': {
    decision: {
      en: 'The fixed MLP uses a hidden transformation and activation so a nonlinear pattern can be separated before the output decision.',
      vi: 'MLP cố định dùng biến đổi hidden và hàm kích hoạt để tách mẫu phi tuyến trước quyết định đầu ra.',
    },
    evidence: {
      en: 'The fixed checkerboard points remain unchanged while the demo shows the representation change across layers.',
      vi: 'Các điểm bàn cờ cố định giữ nguyên khi demo cho thấy biểu diễn đổi qua các layer.',
    },
    learningObjective: {
      en: 'Explain why a fixed hidden layer and activation can separate a nonlinear pattern.',
      vi: 'Giải thích vì sao hidden layer và hàm kích hoạt cố định có thể tách một mẫu phi tuyến.',
    },
    result: {
      en: 'The final output is fixed and highlights the representational step rather than exposing training controls.',
      vi: 'Đầu ra cuối cố định và nhấn mạnh bước biểu diễn thay vì mở điều khiển huấn luyện.',
    },
    taskFingerprint: 'demo-mlp-checkerboard-hidden-representation',
    topic: { en: 'hidden-layer representation', vi: 'biểu diễn hidden layer' },
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

const generatedDemos = getReleaseLearningCatalog().courses.flatMap((course) =>
  course.modules
    .filter((module) => module.demoId !== null && module.demoId !== andGateDemo.demoId)
    .map((module) =>
      createExpandedDemo({
        courseId: course.courseId,
        demoId: module.demoId!,
        module,
      }),
    ),
);
const fixedDemos = [andGateDemo, ...generatedDemos] as const;

export function getFixedDemo(demoId: string | undefined) {
  return fixedDemos.find((demo) => demo.demoId === demoId);
}
