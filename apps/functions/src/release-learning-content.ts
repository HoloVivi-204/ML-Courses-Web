import { getReleaseLearningCatalog, type LocalizedText } from './release-learning-catalog.js';
import {
  cmlM01SourceTrace,
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
const DL_M01_PRIMARY_SOURCE_IDS = ['microsoft-ai-for-beginners'] as const;
const DL_M01_MLP_SOURCE_IDS = ['d2l-vi'] as const;
const DL_M01_SOURCE_IDS = dlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const DL_M02_SOURCE_IDS = dlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const DL_M03_SOURCE_IDS = dlM03SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M01_SOURCE_IDS = cmlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);

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

const cmlM01DraftProvenance = {
  candidateSourceIds: CML_M01_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: cmlM01SourceTrace,
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
];

interface PostDraftDefinition {
  concept: LocalizedText;
  examplePrompt: LocalizedText;
  learningObjective: LocalizedText;
  taskFingerprint: string;
  title: LocalizedText;
}

const postDraftDefinitions: Readonly<Record<string, PostDraftDefinition>> = {
  'cml-p03-linear-regression': {
    concept: {
      en: 'Linear regression uses a straight relationship as an interpretable baseline. Residuals show where that simple relationship consistently misses.',
      vi: 'Hồi quy tuyến tính dùng quan hệ đường thẳng làm baseline dễ giải thích. Phần dư cho biết nơi quan hệ đơn giản đó bỏ sót một cách có hệ thống.',
    },
    examplePrompt: {
      en: 'Estimate a study session duration from the number of planned exercises, then inspect whether the residuals lean positive or negative.',
      vi: 'Ước lượng thời lượng một buổi học từ số bài tập dự kiến, rồi quan sát phần dư thiên dương hay âm.',
    },
    learningObjective: {
      en: 'Use a linear baseline and read residual patterns before adding model complexity.',
      vi: 'Dùng baseline tuyến tính và đọc mẫu phần dư trước khi tăng độ phức tạp của mô hình.',
    },
    taskFingerprint: 'lesson-cml-p03-linear-baseline-residuals',
    title: {
      en: 'Use a linear baseline',
      vi: 'Dùng baseline tuyến tính',
    },
  },
  'cml-p04-polynomial-regression': {
    concept: {
      en: 'Polynomial terms can represent smooth curvature, but each extra degree can also follow accidental noise. Compare the shape with held-out error.',
      vi: 'Các hạng đa thức có thể biểu diễn độ cong mượt, nhưng mỗi bậc tăng thêm cũng có thể bám theo nhiễu. Hãy so sánh hình dạng với lỗi trên dữ liệu giữ lại.',
    },
    examplePrompt: {
      en: 'Model the cooling time of a drink with a line and then with a curve; ask which model stays credible on a new afternoon.',
      vi: 'Mô hình hóa thời gian nguội của đồ uống bằng đường thẳng rồi bằng đường cong; hãy hỏi mô hình nào còn đáng tin vào một buổi chiều mới.',
    },
    learningObjective: {
      en: 'Recognise when curvature helps and when a higher degree only memorises noise.',
      vi: 'Nhận biết khi độ cong hữu ích và khi bậc cao chỉ ghi nhớ nhiễu.',
    },
    taskFingerprint: 'lesson-cml-p04-curvature-generalisation',
    title: {
      en: 'Choose curvature deliberately',
      vi: 'Chọn độ cong có chủ đích',
    },
  },
  'cml-p05-regularization-ridge-lasso': {
    concept: {
      en: 'Regularisation trades a small amount of training fit for more stable coefficients. Ridge spreads weight; Lasso can remove weak signals.',
      vi: 'Regularization đánh đổi một phần khớp trên train để hệ số ổn định hơn. Ridge phân tán trọng số; Lasso có thể loại bỏ tín hiệu yếu.',
    },
    examplePrompt: {
      en: 'Predict revision time from several overlapping study habits and compare a large unstable coefficient with a smaller stable one.',
      vi: 'Dự đoán thời gian ôn tập từ nhiều thói quen học chồng chéo và so sánh hệ số lớn không ổn định với hệ số nhỏ ổn định.',
    },
    learningObjective: {
      en: 'Explain how Ridge and Lasso control unstable coefficients in correlated or noisy features.',
      vi: 'Giải thích cách Ridge và Lasso kiểm soát hệ số không ổn định khi feature tương quan hoặc nhiễu.',
    },
    taskFingerprint: 'lesson-cml-p05-regularisation-stability',
    title: {
      en: 'Regularise before trusting coefficients',
      vi: 'Regularize trước khi tin vào hệ số',
    },
  },
  'cml-p06-logistic-regression': {
    concept: {
      en: 'Logistic regression maps evidence to a probability. A threshold turns that probability into an action, so the threshold belongs to the decision context.',
      vi: 'Hồi quy logistic biến bằng chứng thành xác suất. Ngưỡng biến xác suất thành hành động, nên ngưỡng phải thuộc về bối cảnh ra quyết định.',
    },
    examplePrompt: {
      en: 'For a study-support check-in, compare a 0.45 probability with a 0.70 probability and choose a threshold that matches the cost of missing a learner.',
      vi: 'Với một lần kiểm tra hỗ trợ học tập, hãy so sánh xác suất 0,45 với 0,70 và chọn ngưỡng phù hợp với chi phí bỏ sót người học.',
    },
    learningObjective: {
      en: 'Interpret a classification probability separately from the thresholded action.',
      vi: 'Diễn giải xác suất phân loại tách biệt với hành động sau khi áp dụng ngưỡng.',
    },
    taskFingerprint: 'lesson-cml-p06-probability-threshold',
    title: {
      en: 'Interpret probabilities before thresholds',
      vi: 'Diễn giải xác suất trước khi đặt ngưỡng',
    },
  },
  'cml-p07-classification-metrics': {
    concept: {
      en: 'Accuracy hides which error happened. Precision, recall, and the confusion matrix expose the trade-off between false positives and false negatives.',
      vi: 'Accuracy che giấu loại lỗi đã xảy ra. Precision, recall và confusion matrix cho thấy đánh đổi giữa dương tính giả và âm tính giả.',
    },
    examplePrompt: {
      en: 'Review a safety checklist classifier where missing a hazardous item and flagging a safe item have different consequences.',
      vi: 'Xem lại bộ phân loại checklist an toàn, nơi bỏ sót một mục nguy hiểm và gắn cờ nhầm mục an toàn có hậu quả khác nhau.',
    },
    learningObjective: {
      en: 'Choose and explain a classification metric from the error type that matters.',
      vi: 'Chọn và giải thích metric phân loại từ loại lỗi thực sự quan trọng.',
    },
    taskFingerprint: 'lesson-cml-p07-error-tradeoff-metrics',
    title: {
      en: 'Read error types, not only accuracy',
      vi: 'Đọc loại lỗi, không chỉ accuracy',
    },
  },
  'cml-p08-knn': {
    concept: {
      en: 'KNN bases a prediction on nearby labelled examples. Scaling determines what counts as nearby, and the value of k controls local sensitivity.',
      vi: 'KNN dựa dự đoán vào các ví dụ đã gán nhãn ở gần. Chuẩn hóa quyết định thế nào là gần, còn giá trị k kiểm soát độ nhạy cục bộ.',
    },
    examplePrompt: {
      en: 'Classify a new study habit using nearby profiles, then ask how the result changes when one feature has a much larger numeric range.',
      vi: 'Phân loại một thói quen học mới bằng các hồ sơ gần nhất, rồi hỏi kết quả đổi thế nào khi một feature có thang số lớn hơn nhiều.',
    },
    learningObjective: {
      en: 'Explain the roles of distance, feature scaling, and k in a nearest-neighbour decision.',
      vi: 'Giải thích vai trò của khoảng cách, chuẩn hóa feature và k trong quyết định láng giềng gần nhất.',
    },
    taskFingerprint: 'lesson-cml-p08-neighbour-distance-scaling',
    title: {
      en: 'Classify by nearby examples',
      vi: 'Phân loại bằng ví dụ lân cận',
    },
  },
  'cml-p09-naive-bayes': {
    concept: {
      en: 'Naive Bayes updates a class belief from observed features. Its conditional-independence assumption is simple, but the resulting evidence accounting is useful.',
      vi: 'Naive Bayes cập nhật niềm tin về lớp từ feature quan sát được. Giả định độc lập có điều kiện đơn giản, nhưng cách hạch toán bằng chứng vẫn hữu ích.',
    },
    examplePrompt: {
      en: 'Compare two message categories from short word counts and explain why a strong token can change a class belief without proving certainty.',
      vi: 'So sánh hai loại thông điệp từ số lần xuất hiện từ ngắn và giải thích vì sao một token mạnh có thể đổi niềm tin về lớp mà không chứng minh chắc chắn.',
    },
    learningObjective: {
      en: 'Describe how prior belief and feature evidence combine in Naive Bayes.',
      vi: 'Mô tả cách niềm tin ban đầu và bằng chứng feature kết hợp trong Naive Bayes.',
    },
    taskFingerprint: 'lesson-cml-p09-bayesian-evidence-update',
    title: {
      en: 'Update a class belief from evidence',
      vi: 'Cập nhật niềm tin về lớp từ bằng chứng',
    },
  },
  'cml-p10-decision-tree': {
    concept: {
      en: 'A decision tree asks one interpretable question at a time. Split quality measures how much that question makes the remaining labels less mixed.',
      vi: 'Cây quyết định hỏi từng câu hỏi dễ giải thích. Chất lượng split đo mức câu hỏi đó làm nhãn còn lại bớt lẫn lộn.',
    },
    examplePrompt: {
      en: 'Organise a study-support triage with yes/no questions and identify which first question separates the cases most clearly.',
      vi: 'Tổ chức phân loại hỗ trợ học tập bằng câu hỏi có/không và xác định câu hỏi đầu tiên tách các trường hợp rõ nhất.',
    },
    learningObjective: {
      en: 'Read a tree split as a transparent rule and relate it to label purity.',
      vi: 'Đọc một split của cây như quy tắc minh bạch và liên hệ nó với độ thuần nhãn.',
    },
    taskFingerprint: 'lesson-cml-p10-tree-split-purity',
    title: {
      en: 'Explain a split rule',
      vi: 'Giải thích quy tắc chia',
    },
  },
  'cml-p11-random-forest': {
    concept: {
      en: 'A random forest combines diverse trees. Sampling rows and feature subsets reduces the chance that every tree repeats the same brittle rule.',
      vi: 'Random Forest kết hợp các cây đa dạng. Lấy mẫu dòng và tập con feature giảm khả năng mọi cây lặp cùng một quy tắc mong manh.',
    },
    examplePrompt: {
      en: 'Ask several small decision panels to vote on a support case, then compare identical panels with panels that each see a different sample.',
      vi: 'Yêu cầu nhiều nhóm quyết định nhỏ bỏ phiếu cho một trường hợp hỗ trợ, rồi so sánh các nhóm giống hệt với nhóm mỗi nhóm thấy một mẫu khác.',
    },
    learningObjective: {
      en: 'Explain why diversity and aggregation can make tree predictions less brittle.',
      vi: 'Giải thích vì sao đa dạng và tổng hợp có thể làm dự đoán của cây bớt mong manh.',
    },
    taskFingerprint: 'lesson-cml-p11-forest-diversity-voting',
    title: {
      en: 'Use diversity before voting',
      vi: 'Dùng đa dạng trước khi bỏ phiếu',
    },
  },
  'cml-p12-svm': {
    concept: {
      en: 'An SVM seeks a separating boundary with room around it. Points nearest the boundary are support vectors because they constrain that margin.',
      vi: 'SVM tìm ranh giới phân tách có khoảng trống xung quanh. Các điểm gần ranh giới nhất là support vector vì chúng ràng buộc margin.',
    },
    examplePrompt: {
      en: 'Separate two workshop preference groups on a sketch and compare a narrow gap with a wider gap that leaves more room for small measurement changes.',
      vi: 'Tách hai nhóm sở thích workshop trên một phác thảo và so sánh khe hẹp với khe rộng hơn, có thêm chỗ cho thay đổi đo lường nhỏ.',
    },
    learningObjective: {
      en: 'Explain margin and support vectors without treating every training point as equally decisive.',
      vi: 'Giải thích margin và support vector mà không coi mọi điểm train đều quyết định như nhau.',
    },
    taskFingerprint: 'lesson-cml-p12-svm-margin-support-vectors',
    title: {
      en: 'Separate classes with margin',
      vi: 'Tách lớp bằng margin',
    },
  },
  'cml-p13-kmeans': {
    concept: {
      en: 'K-Means alternates between assigning examples to centres and moving centres to the mean of their assigned examples. The result depends on the chosen k and starting centres.',
      vi: 'K-Means luân phiên gán ví dụ vào tâm và dời tâm về trung bình của ví dụ đã gán. Kết quả phụ thuộc vào k và tâm khởi tạo.',
    },
    examplePrompt: {
      en: 'Group anonymous study schedules by two time features and inspect what changes after the centres move once.',
      vi: 'Gom lịch học ẩn danh theo hai feature thời gian và quan sát điều gì đổi sau khi tâm di chuyển một lần.',
    },
    learningObjective: {
      en: 'Describe the assign-and-update loop and the effect of choosing k.',
      vi: 'Mô tả vòng lặp gán-cập nhật và tác động của việc chọn k.',
    },
    taskFingerprint: 'lesson-cml-p13-kmeans-assign-update',
    title: {
      en: 'Iterate toward cluster centres',
      vi: 'Lặp để tiến tới tâm cụm',
    },
  },
  'cml-p14-hierarchical-clustering': {
    concept: {
      en: 'Hierarchical clustering records a sequence of merges. A dendrogram lets you choose a cut after seeing which groups joined early and which only joined late.',
      vi: 'Phân cụm phân cấp ghi lại chuỗi lần gộp. Dendrogram cho phép chọn mức cắt sau khi thấy nhóm nào nhập sớm và nhóm nào chỉ nhập muộn.',
    },
    examplePrompt: {
      en: 'Merge similar reading patterns step by step and explain why a large final merge can be a useful place to stop.',
      vi: 'Gộp các mẫu đọc tương tự từng bước và giải thích vì sao lần gộp cuối lớn có thể là chỗ phù hợp để dừng.',
    },
    learningObjective: {
      en: 'Read merge height and select a defensible dendrogram cut.',
      vi: 'Đọc độ cao gộp và chọn mức cắt dendrogram có cơ sở.',
    },
    taskFingerprint: 'lesson-cml-p14-dendrogram-cut-height',
    title: {
      en: 'Read merges before choosing a cut',
      vi: 'Đọc lần gộp trước khi chọn mức cắt',
    },
  },
  'cml-p15-pca': {
    concept: {
      en: 'PCA rotates correlated features into ordered components. Keeping the first components can simplify a view, but reconstruction loss tells you what was discarded.',
      vi: 'PCA xoay các feature tương quan thành component có thứ tự. Giữ component đầu có thể đơn giản hóa góc nhìn, nhưng lỗi tái dựng cho biết điều gì đã bị bỏ đi.',
    },
    examplePrompt: {
      en: 'Compress several related wellbeing survey measures into two components and explain what a reconstruction check protects against.',
      vi: 'Nén nhiều chỉ số khảo sát sức khỏe liên quan thành hai component và giải thích kiểm tra tái dựng bảo vệ chống lại điều gì.',
    },
    learningObjective: {
      en: 'Relate principal components to variance retained and information lost.',
      vi: 'Liên hệ component chính với phương sai giữ lại và thông tin bị mất.',
    },
    taskFingerprint: 'lesson-cml-p15-pca-variance-reconstruction',
    title: {
      en: 'Keep variance while reducing dimensions',
      vi: 'Giữ phương sai khi giảm chiều',
    },
  },
};

function getPostDraftDefinition(postId: string): PostDraftDefinition {
  const definition = postDraftDefinitions[postId];

  if (!definition) {
    throw new Error(`Missing draft content definition for ${postId}.`);
  }

  return definition;
}

function createPostQuizId(postId: string) {
  const stablePrefix = /^(cml|dl)-p\d{2}/.exec(postId)?.[0];

  return stablePrefix ? `quiz-post-${stablePrefix}` : `quiz-post-${postId}`;
}

function createGenericBlocks(input: {
  moduleTitle: LocalizedText;
  postId: string;
  title: LocalizedText;
}): readonly LearningContentBlock[] {
  const defaults = {
    accessibility: { en: null, vi: null },
    activityId: null,
    assetIds: [],
    postId: input.postId,
    required: true,
    schemaVersion: 1,
    sourceIds: [],
  } as const;

  return [
    {
      ...defaults,
      id: `${input.postId}-goal`,
      locales: {
        en: {
          lede:
            'This draft lesson focuses on one inspectable modelling decision before the ' +
            'Playground task.',
          navigationTitle: 'Learning goal',
          title: input.title.en,
        },
        vi: {
          lede:
            'Bài học draft này tập trung vào một quyết định mô hình hóa có thể kiểm tra ' +
            'trước nhiệm vụ Playground.',
          navigationTitle: 'Mục tiêu học',
          title: input.title.vi,
        },
      },
      order: 1,
      type: 'heading',
    },
    {
      ...defaults,
      id: `${input.postId}-model-check`,
      locales: {
        en: {
          markdown:
            `In **${input.moduleTitle.en}**, start from the data question, name the feature ` +
            'signal, then choose the metric before reading the model output.',
        },
        vi: {
          markdown:
            `Trong **${input.moduleTitle.vi}**, hãy bắt đầu từ câu hỏi dữ liệu, nêu tín hiệu ` +
            'feature, rồi chọn metric trước khi đọc đầu ra mô hình.',
        },
      },
      order: 2,
      type: 'markdown',
    },
    {
      ...defaults,
      id: `${input.postId}-draft-status`,
      locales: {
        en: {
          body:
            'This submission unit is draft learning content. External source, license and ' +
            'instructor review evidence is still pending operator review.',
          title: 'Draft status',
        },
        vi: {
          body:
            'Learning unit cho bản nộp này đang ở trạng thái draft. Bằng chứng nguồn, ' +
            'license và review học thuật vẫn chờ operator xác nhận.',
          title: 'Trạng thái draft',
        },
      },
      order: 3,
      type: 'callout',
      variant: 'insight',
    },
    {
      ...defaults,
      activityId: `act-${input.postId}-example`,
      id: `${input.postId}-example`,
      locales: {
        en: { navigationTitle: 'Inspect a small example' },
        vi: { navigationTitle: 'Quan sát ví dụ nhỏ' },
      },
      order: 4,
      type: 'example',
    },
    {
      ...defaults,
      id: `${input.postId}-quiz-prep`,
      locales: {
        en: {
          markdown:
            'Before the quiz, explain cause and effect in one sentence: what input signal ' +
            'changes, what model decision follows, and which metric would reveal a mistake.',
        },
        vi: {
          markdown:
            'Trước quiz, hãy giải thích nhân quả bằng một câu: tín hiệu đầu vào nào đổi, ' +
            'quyết định mô hình nào theo sau, và metric nào sẽ phát hiện lỗi.',
        },
      },
      order: 5,
      type: 'markdown',
    },
  ] satisfies readonly LearningContentBlock[];
}

function createDraftBlocks(input: {
  definition: PostDraftDefinition;
  moduleTitle: LocalizedText;
  postId: string;
  provenance: DraftProvenance;
}): readonly LearningContentBlock[] {
  const defaults = {
    accessibility: { en: null, vi: null },
    activityId: null,
    assetIds: [],
    postId: input.postId,
    required: true,
    schemaVersion: 1,
    sourceIds: [],
  } as const;
  const example = createGenericBlocks({
    moduleTitle: input.moduleTitle,
    postId: input.postId,
    title: input.definition.title,
  }).find((block) => block.type === 'example');

  if (!example) {
    throw new Error(`Missing stable example block for ${input.postId}.`);
  }

  return [
    {
      ...defaults,
      id: `${input.postId}-goal`,
      locales: {
        en: {
          lede: input.definition.learningObjective.en,
          navigationTitle: 'Learning goal',
          title: input.definition.title.en,
        },
        vi: {
          lede: input.definition.learningObjective.vi,
          navigationTitle: 'Mục tiêu học',
          title: input.definition.title.vi,
        },
      },
      order: 1,
      type: 'heading',
    },
    {
      ...defaults,
      id: `${input.postId}-concept`,
      locales: {
        en: { markdown: input.definition.concept.en },
        vi: { markdown: input.definition.concept.vi },
      },
      order: 2,
      type: 'markdown',
    },
    {
      ...defaults,
      id: `${input.postId}-cause-effect`,
      locales: {
        en: {
          body: 'State the changed evidence, the resulting model behaviour, and the observation that would challenge that behaviour.',
          title: 'Reason from cause to effect',
        },
        vi: {
          body: 'Hãy nêu bằng chứng thay đổi, hành vi mô hình theo sau và quan sát nào sẽ thách thức hành vi đó.',
          title: 'Suy luận từ nguyên nhân đến kết quả',
        },
      },
      order: 3,
      type: 'callout',
      variant: 'insight',
    },
    { ...example, order: 4 },
    {
      ...defaults,
      id: `${input.postId}-example-prompt`,
      locales: {
        en: { markdown: input.definition.examplePrompt.en },
        vi: { markdown: input.definition.examplePrompt.vi },
      },
      order: 5,
      type: 'markdown',
    },
    {
      ...defaults,
      id: `${input.postId}-provenance`,
      locales: {
        en: {
          body:
            `Candidate source IDs: ${input.provenance.candidateSourceIds.join(', ')}. ` +
            'This is draft-only content; license, provenance, and content-review evidence have not been collected or approved.',
          title: 'Draft provenance status',
        },
        vi: {
          body:
            `ID nguồn ứng viên: ${input.provenance.candidateSourceIds.join(', ')}. ` +
            'Đây chỉ là nội dung draft; bằng chứng license, provenance và review nội dung chưa được thu thập hoặc phê duyệt.',
          title: 'Trạng thái provenance của draft',
        },
      },
      order: 6,
      sourceIds: input.provenance.candidateSourceIds,
      type: 'callout',
      variant: 'insight',
    },
    {
      ...defaults,
      id: `${input.postId}-quiz-prep`,
      locales: {
        en: {
          markdown: `Before the quiz, explain one decision from **${input.definition.title.en}** without copying a Playground configuration or claiming an externally reviewed source.`,
        },
        vi: {
          markdown: `Trước quiz, hãy giải thích một quyết định từ **${input.definition.title.vi}** mà không sao chép cấu hình Playground hoặc tuyên bố có nguồn đã được review bên ngoài.`,
        },
      },
      order: 7,
      type: 'markdown',
    },
  ] satisfies readonly LearningContentBlock[];
}

function createGeneratedPost(input: {
  accessLevel: 'full' | 'trial';
  courseId: string;
  durationMinutes: number;
  moduleId: string;
  moduleTitle: LocalizedText;
  postId: string;
}): TrialPost {
  const definition = getPostDraftDefinition(input.postId);
  const provenance = createDraftProvenance(input.courseId);
  const title = definition.title;

  return {
    accessLevel: input.accessLevel,
    blocks: createDraftBlocks({
      definition,
      moduleTitle: input.moduleTitle,
      postId: input.postId,
      provenance,
    }),
    courseId: input.courseId,
    description: definition.learningObjective,
    durationMinutes: input.durationMinutes,
    id: input.postId,
    learningObjective: definition.learningObjective,
    moduleId: input.moduleId,
    postQuizId: createPostQuizId(input.postId),
    provenance,
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: definition.taskFingerprint,
    title,
  };
}

const handAuthoredFullPostIds = new Set(fullLessonPosts.map((post) => post.id));
const trialPostIdByCourseId = new Map([
  ['course-classical-ml', 'cml-p01-problem-data-types'],
  ['course-deep-learning-basic', TRIAL_POST_ID],
]);
const generatedFullLessonPosts = getReleaseLearningCatalog().courses.flatMap((course) =>
  course.modules.flatMap((module) =>
    module.posts
      .filter((post) => !handAuthoredFullPostIds.has(post.postId))
      .map((post) =>
        createGeneratedPost({
          accessLevel: 'full',
          courseId: course.courseId,
          durationMinutes: post.estimatedMinutes,
          moduleId: module.moduleId,
          moduleTitle: module.title,
          postId: post.postId,
        }),
      ),
  ),
);
const generatedTrialPosts = getReleaseLearningCatalog().courses.flatMap((course) =>
  course.modules.flatMap((module) =>
    module.posts
      .filter((post) => trialPostIdByCourseId.get(course.courseId) === post.postId)
      .filter((post) => !trialPosts.some((trialPost) => trialPost.id === post.postId))
      .map((post) =>
        createGeneratedPost({
          accessLevel: 'trial',
          courseId: course.courseId,
          durationMinutes: Math.min(10, post.estimatedMinutes),
          moduleId: module.moduleId,
          moduleTitle: module.title,
          postId: post.postId,
        }),
      ),
  ),
);
const releaseTrialPosts = [...trialPosts, ...generatedTrialPosts] as const;
const releaseFullLessonPosts = [...fullLessonPosts, ...generatedFullLessonPosts] as const;

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
