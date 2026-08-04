import { getReleaseLearningCatalog, type LocalizedText } from './release-learning-catalog.js';

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

export interface DraftProvenance {
  candidateSourceIds: readonly string[];
  contentReviewStatus: 'pending-operator-review';
  externalEvidenceStatus: 'not-collected';
  importStatus: 'draft-only';
}

const TRIAL_POST_ID = 'dl-p01-neuron-perceptron';
const GOOGLE_NEURAL_NODES_URL =
  'https://developers.google.com/machine-learning/crash-course/' +
  'neural-networks/nodes-hidden-layers';

const blockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: TRIAL_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: [],
} as const;

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
          'A neuron is a tiny decision unit. It receives signals, scores their importance, ' +
          'then produces one output.',
        navigationTitle: 'What does a neuron do?',
        title: 'From signals to a decision',
      },
      vi: {
        lede:
          'Neuron là một đơn vị ra quyết định rất nhỏ. Nó nhận tín hiệu, đánh giá mức ' +
          'quan trọng rồi tạo ra một đầu ra.',
        navigationTitle: 'Một neuron làm gì?',
        title: 'Từ tín hiệu đến quyết định',
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
          'Think of each input as one piece of **evidence**. The neuron combines numbers ' +
          'using a fixed, inspectable rule: $z = w_1x_1 + w_2x_2 + b$.',
      },
      vi: {
        markdown:
          'Hãy xem mỗi đầu vào như một mẩu **bằng chứng**. Neuron kết hợp các con số bằng ' +
          'một quy tắc cố định, có thể kiểm tra: $z = w_1x_1 + w_2x_2 + b$.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...blockDefaults,
    id: 'neuron-insight',
    locales: {
      en: {
        body:
          'A model decision becomes explainable when you can trace the inputs, weights, ' +
          'bias, and threshold that produced it.',
        title: 'The useful idea',
      },
      vi: {
        body:
          'Quyết định của mô hình trở nên giải thích được khi bạn lần theo đầu vào, ' +
          'trọng số, độ lệch và ngưỡng đã tạo ra nó.',
        title: 'Ý tưởng cần giữ lại',
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
          'Before adding the inputs, the neuron multiplies each one by a weight. ' +
          'Larger weights create a stronger influence.',
        navigationTitle: 'Why weights matter',
        title: 'Weights say which signals matter',
      },
      vi: {
        lede:
          'Trước khi cộng các đầu vào, neuron nhân từng đầu vào với một trọng số. ' +
          'Trọng số lớn tạo ảnh hưởng mạnh hơn.',
        navigationTitle: 'Vì sao trọng số quan trọng?',
        title: 'Trọng số cho biết tín hiệu nào quan trọng',
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
          'The bias shifts the decision point. A step function compares $z$ with zero and ' +
          'returns either **0** or **1**.',
      },
      vi: {
        markdown:
          'Độ lệch dịch chuyển điểm ra quyết định. Hàm bước so sánh $z$ với 0 và trả về ' +
          '**0** hoặc **1**.',
      },
    },
    order: 5,
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
        description: 'The sign of z determines whether the step function returns 0 or 1.',
        inputs: 'inputs',
        score: 'score',
        weights: 'weights',
      },
      vi: {
        bias: 'độ lệch',
        description: 'Dấu của z quyết định hàm bước trả về 0 hay 1.',
        inputs: 'đầu vào',
        score: 'điểm',
        weights: 'trọng số',
      },
    },
    order: 6,
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
        lede: 'The output is not magic. It follows directly from the sign of the weighted score.',
        navigationTitle: 'Read the result',
        title: 'Read the result, do not guess',
      },
      vi: {
        lede: 'Đầu ra không phải phép màu. Nó đi thẳng từ dấu của tổng có trọng số.',
        navigationTitle: 'Đọc kết quả',
        title: 'Đọc kết quả, không đoán mò',
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
          'Toggle the two inputs again and narrate the chain aloud: inputs, weighted sum, ' +
          'threshold, output.',
        items: [
          {
            body: 'The combined evidence has not reached the threshold.',
            label: 'z < 0',
            title: 'Output 0',
          },
          {
            body: 'The combined evidence has reached or crossed the threshold.',
            label: 'z ≥ 0',
            title: 'Output 1',
          },
        ],
        title: 'Two outcomes, one rule',
      },
      vi: {
        body:
          'Hãy đổi hai đầu vào lần nữa và đọc thành tiếng chuỗi này: đầu vào, ' +
          'tổng có trọng số, ngưỡng, đầu ra.',
        items: [
          { body: 'Bằng chứng kết hợp chưa chạm ngưỡng.', label: 'z < 0', title: 'Đầu ra 0' },
          {
            body: 'Bằng chứng kết hợp đã chạm hoặc vượt ngưỡng.',
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
        heading: 'Continue from a primary source',
        intro: 'Further reading is optional and does not affect lesson progress.',
        navigationTitle: 'Further reading',
      },
      vi: {
        heading: 'Đọc tiếp từ nguồn chính thống',
        intro: 'Tài liệu mở rộng là tùy chọn và không ảnh hưởng tiến độ bài học.',
        navigationTitle: 'Tài liệu mở rộng',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: {
          en: 'Reference material by Google for Developers.',
          vi: 'Tài liệu tham khảo của Google for Developers.',
        },
        language: 'en',
        license: {
          name: 'CC BY 4.0',
          url: 'https://creativecommons.org/licenses/by/4.0/',
        },
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: 'source-google-neural-nodes',
        sourceName: 'Google for Developers',
        title: 'Neural networks: Nodes and hidden layers',
        url: GOOGLE_NEURAL_NODES_URL,
      },
    ],
    sourceIds: ['source-google-neural-nodes'],
    type: 'source-list',
  },
] satisfies readonly LearningContentBlock[];

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
          'XOR uses two positive cases that sit across from each other. One straight ' +
          'decision boundary cannot separate them from the negative cases.',
        navigationTitle: 'Why XOR breaks the line',
        title: 'Why does XOR break a single-layer Perceptron?',
      },
      vi: {
        lede:
          'XOR có hai trường hợp dương nằm chéo nhau. Một ranh giới quyết định thẳng ' +
          'không thể tách chúng khỏi hai trường hợp âm.',
        navigationTitle: 'Vì sao XOR phá đường thẳng?',
        title: 'Vì sao XOR làm Perceptron một lớp thất bại?',
      },
    },
    order: 9,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'xor-truth-table',
    locales: {
      en: {
        markdown:
          'Read the stable XOR target before thinking about weights:\n\n' +
          '| x1 | x2 | XOR |\n|---:|---:|---:|\n| 0 | 0 | 0 |\n| 0 | 1 | 1 |\n| 1 | 0 | 1 |\n| 1 | 1 | 0 |\n\n' +
          'The positive points are diagonal, so pushing one side of a line up also ' +
          'pushes the wrong negative point up.',
      },
      vi: {
        markdown:
          'Hãy đọc target XOR ổn định trước khi nghĩ về trọng số:\n\n' +
          '| x1 | x2 | XOR |\n|---:|---:|---:|\n| 0 | 0 | 0 |\n| 0 | 1 | 1 |\n| 1 | 0 | 1 |\n| 1 | 1 | 0 |\n\n' +
          'Hai điểm dương nằm chéo nhau, nên khi đẩy một phía của đường thẳng lên, ' +
          'một điểm âm sai cũng bị đẩy lên theo.',
      },
    },
    order: 10,
    type: 'markdown',
  },
  {
    ...blockDefaults,
    id: 'stable-content-access',
    locales: {
      en: {
        body:
          'Full reading is granted by stable content access post_dl-p01-neuron-perceptron. ' +
          'The grant does not pin a revision, so a safe publish can move the current text forward.',
        title: 'Stable access, current content',
      },
      vi: {
        body:
          'Quyền đọc đầy đủ được cấp bằng stable content access post_dl-p01-neuron-perceptron. ' +
          'Grant này không pin revision, nên một lần publish an toàn vẫn có thể chuyển nội dung hiện tại về phía trước.',
        title: 'Stable access, nội dung hiện tại',
      },
    },
    order: 11,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...blockDefaults,
    id: 'from-perceptron-to-next-step',
    locales: {
      en: {
        lede:
          'The useful failure tells you what to look for next: a hidden layer can bend ' +
          'the representation before the final decision.',
        navigationTitle: 'What this unlocks next',
        title: 'The failure points to the next model',
      },
      vi: {
        lede:
          'Thất bại hữu ích này cho bạn biết cần quan sát gì tiếp theo: một hidden layer ' +
          'có thể bẻ cong biểu diễn trước quyết định cuối.',
        navigationTitle: 'Điều này mở gì tiếp theo?',
        title: 'Thất bại chỉ sang mô hình kế tiếp',
      },
    },
    order: 12,
    type: 'heading',
  },
] satisfies readonly LearningContentBlock[];

const trialPosts = [
  {
    accessLevel: 'trial',
    blocks: trialBlocks,
    courseId: 'course-deep-learning-basic',
    description: {
      en: 'See how inputs, weights, and a bias become one explainable decision.',
      vi: 'Quan sát cách đầu vào, trọng số và độ lệch tạo thành một quyết định có thể giải thích.',
    },
    durationMinutes: 8,
    id: TRIAL_POST_ID,
    learningObjective: {
      en: 'Explain how inputs, weights, bias, and a threshold form one Perceptron decision.',
      vi: 'Giải thích cách đầu vào, trọng số, độ lệch và ngưỡng tạo thành một quyết định Perceptron.',
    },
    moduleId: 'dl-m01-neuron-perceptron',
    postQuizId: 'quiz-post-dl-p01',
    provenance: createDraftProvenance('course-deep-learning-basic'),
    sourceReviewStatus: 'pending-operator-review',
    taskFingerprint: 'lesson-neuron-decision-rule',
    title: {
      en: 'How does a neuron make a decision?',
      vi: 'Một neuron đưa ra quyết định như thế nào?',
    },
  },
] satisfies readonly TrialPost[];

const fullLessonPosts: readonly TrialPost[] = [
  {
    ...trialPosts[0]!,
    accessLevel: 'full',
    blocks: fullLessonBlocks,
    description: {
      en: 'Read from a single neuron decision to the XOR limit that motivates the next model.',
      vi: 'Đọc từ một quyết định của neuron đến giới hạn XOR mở đường cho mô hình kế tiếp.',
    },
    durationMinutes: 16,
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
  'cml-p01-problem-data-types': {
    concept: {
      en: 'A learning problem starts with a decision, a target, and evidence. Labels are known outcomes; features are the signals used to estimate them.',
      vi: 'Một bài toán học máy bắt đầu từ quyết định, mục tiêu và bằng chứng. Nhãn là kết quả đã biết; feature là tín hiệu dùng để ước lượng kết quả đó.',
    },
    examplePrompt: {
      en: 'For a library reminder, decide whether the target is a category, a number, or a group before naming the available signals.',
      vi: 'Với lời nhắc của thư viện, hãy quyết định mục tiêu là một loại, một con số hay một nhóm trước khi gọi tên các tín hiệu sẵn có.',
    },
    learningObjective: {
      en: 'Distinguish a prediction target from the features and identify supervised or unsupervised framing.',
      vi: 'Phân biệt mục tiêu dự đoán với feature và xác định cách đặt bài toán có hay không có giám sát.',
    },
    taskFingerprint: 'lesson-cml-p01-problem-framing',
    title: {
      en: 'Frame the prediction problem',
      vi: 'Đặt khung cho bài toán dự đoán',
    },
  },
  'cml-p02-train-test-metrics': {
    concept: {
      en: 'A model must be judged on examples it did not train on. The metric should reflect the cost of the mistakes that matter in the decision.',
      vi: 'Mô hình phải được đánh giá trên ví dụ chưa dùng để huấn luyện. Metric cần phản ánh chi phí của loại sai lầm quan trọng cho quyết định.',
    },
    examplePrompt: {
      en: 'Compare two reminder models on a held-out week and explain why a missed urgent reminder can matter more than one extra alert.',
      vi: 'So sánh hai mô hình nhắc việc trên một tuần giữ lại và giải thích vì sao bỏ sót lời nhắc khẩn có thể quan trọng hơn một cảnh báo dư.',
    },
    learningObjective: {
      en: 'Explain why train/test separation and a decision-aligned metric protect against misleading performance claims.',
      vi: 'Giải thích vì sao tách train/test và chọn metric theo quyết định giúp tránh kết luận hiệu năng sai lệch.',
    },
    taskFingerprint: 'lesson-cml-p02-train-test-metric-choice',
    title: {
      en: 'Test data and useful metrics',
      vi: 'Dữ liệu kiểm tra và metric hữu ích',
    },
  },
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
  'dl-p02-mlp-forward-activation': {
    concept: {
      en: 'An MLP stacks weighted transformations with activations. Hidden layers can reshape evidence before the final output makes a decision.',
      vi: 'MLP xếp chồng các biến đổi có trọng số với hàm kích hoạt. Hidden layer có thể định hình lại bằng chứng trước khi đầu ra cuối ra quyết định.',
    },
    examplePrompt: {
      en: 'Trace two simple signals through a hidden layer and explain why an activation is needed between two linear transformations.',
      vi: 'Theo dõi hai tín hiệu đơn giản qua hidden layer và giải thích vì sao cần hàm kích hoạt giữa hai biến đổi tuyến tính.',
    },
    learningObjective: {
      en: 'Explain how layers and activations let an MLP represent nonlinear patterns.',
      vi: 'Giải thích cách layer và hàm kích hoạt giúp MLP biểu diễn mẫu phi tuyến.',
    },
    taskFingerprint: 'lesson-dl-p02-mlp-activation-composition',
    title: {
      en: 'Compose layers and activations',
      vi: 'Kết hợp layer và hàm kích hoạt',
    },
  },
  'dl-p03-backprop-overfitting': {
    concept: {
      en: 'Training loss measures fit to seen examples; validation loss estimates behaviour on unseen examples. Diverging curves are a warning that more fitting is not more generalisation.',
      vi: 'Training loss đo mức khớp với ví dụ đã thấy; validation loss ước lượng hành vi trên ví dụ chưa thấy. Hai đường tách xa cảnh báo rằng khớp thêm không đồng nghĩa tổng quát tốt hơn.',
    },
    examplePrompt: {
      en: 'Read a pair of learning curves where training loss keeps falling while validation loss begins to rise, then name the next cautious action.',
      vi: 'Đọc một cặp đường học nơi training loss tiếp tục giảm còn validation loss bắt đầu tăng, rồi nêu hành động thận trọng tiếp theo.',
    },
    learningObjective: {
      en: 'Use learning curves to distinguish improving fit from overfitting and choose a cautious response.',
      vi: 'Dùng đường học để phân biệt khớp tốt hơn với overfitting và chọn phản ứng thận trọng.',
    },
    taskFingerprint: 'lesson-dl-p03-learning-curves-generalisation',
    title: {
      en: 'Use validation curves to spot overfitting',
      vi: 'Dùng đường validation để nhận ra overfitting',
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
