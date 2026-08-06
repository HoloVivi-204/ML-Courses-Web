import { ApiError } from './api-error.js';
import {
  getReleaseLearningCatalog,
  type ReleaseLearningModule,
  type ReleaseLearningPost,
} from './release-learning-catalog.js';
import {
  cmlM01SourceTrace,
  cmlM02SourceTrace,
  cmlM03SourceTrace,
  dlM01SourceTrace,
  dlM02SourceTrace,
  dlM03SourceTrace,
  type DraftProvenance,
} from './content-source-trace.js';

const DL_M01_SOURCE_IDS = dlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const DL_M02_SOURCE_IDS = dlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const DL_M03_SOURCE_IDS = dlM03SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M01_SOURCE_IDS = cmlM01SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M02_SOURCE_IDS = cmlM02SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const CML_M03_SOURCE_IDS = cmlM03SourceTrace.sourceSnapshots.map((source) => source.sourceId);
const dlM02DraftProvenance = {
  candidateSourceIds: DL_M02_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: dlM02SourceTrace,
} as const satisfies DraftProvenance;
const dlM03DraftProvenance = {
  candidateSourceIds: DL_M03_SOURCE_IDS,
  contentReviewStatus: 'pending-operator-review',
  externalEvidenceStatus: 'not-collected',
  importStatus: 'draft-only',
  sourceTrace: dlM03SourceTrace,
} as const satisfies DraftProvenance;
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

export type BaselineQuestionType = 'multiple-choice' | 'single-choice' | 'true-false';

export interface LocalizedText {
  en: string;
  vi: string;
}

export type QuizAnswerValue = readonly string[] | string;

export interface QuizAnswer {
  questionId: string;
  value: QuizAnswerValue;
}

export interface StoredQuestionWrongCounts {
  [questionId: string]: number;
}

export interface QuizOption {
  optionId: string;
  text: LocalizedText;
}

export interface QuizQuestion {
  correctAnswer: QuizAnswerValue;
  explanation: LocalizedText;
  hints: readonly [LocalizedText, LocalizedText];
  options: readonly QuizOption[];
  prompt: LocalizedText;
  questionId: string;
  sourceId: string;
  sourceIds?: readonly string[];
  type: BaselineQuestionType;
}

export interface QuizManifest {
  courseId: string;
  demoId: string | null;
  draftProvenance?: DraftProvenance;
  mastery: LocalizedText;
  moduleId: string;
  passingScorePercent: number;
  postId: string | null;
  questionCount: number;
  questions: readonly QuizQuestion[];
  quizId: string;
  quizKind: 'module' | 'post';
  quizRevisionId: string;
  requiredCorrectCount: number | null;
  unlocksOnPass: ReadonlyArray<{ id: string; type: 'algorithm' | 'module' | 'post' }>;
}

export interface QuizAttemptPayload {
  attempt: {
    attemptId: string;
    attemptNumber: number;
    expiresAt: string;
    passingScorePercent: number;
    questionCount: number;
    quizId: string;
    quizKind: 'module' | 'post';
    quizRevisionId: string;
    requiredCorrectCount: number | null;
    shuffleSeed: string | null;
  };
  mastery: LocalizedText;
  questions: ReadonlyArray<{
    options: readonly QuizOption[];
    prompt: LocalizedText;
    questionId: string;
    sourceId: string;
    type: BaselineQuestionType;
  }>;
}

export interface QuizGradeResult {
  bestScore?: number;
  correctCount: number;
  feedback: ReadonlyArray<{
    correctAnswer?: QuizAnswerValue;
    explanation?: LocalizedText;
    hint: LocalizedText | null;
    hintLevel: 0 | 1 | 2;
    isCorrect: boolean;
    questionId: string;
  }>;
  newlyUnlocked: ReadonlyArray<{ id: string; type: 'algorithm' | 'module' | 'post' }>;
  nextWrongCounts: StoredQuestionWrongCounts;
  passed: boolean;
  score: number;
}

const handAuthoredQuizManifests: Readonly<Record<string, QuizManifest>> = {
  'quiz-post-dl-p01': {
    courseId: 'course-deep-learning-basic',
    demoId: null,
    draftProvenance: {
      candidateSourceIds: DL_M01_SOURCE_IDS,
      contentReviewStatus: 'pending-operator-review',
      externalEvidenceStatus: 'not-collected',
      importStatus: 'draft-only',
      sourceTrace: dlM01SourceTrace,
    },
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: 'dl-m01-neuron-perceptron',
    passingScorePercent: 100,
    postId: 'dl-p01-neuron-perceptron',
    questionCount: 3,
    quizId: 'quiz-post-dl-p01',
    quizKind: 'post',
    quizRevisionId: 'quiz-post-dl-p01-rev-r1',
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: 'dl-p01-neuron-perceptron', type: 'post' }],
    questions: [
      {
        correctAnswer: 'opt-linear-limit',
        explanation: {
          en:
            'XOR proves the useful limit: one straight decision boundary cannot separate ' +
            'diagonal positive cases from diagonal negative cases.',
          vi:
            'XOR cho thấy giới hạn hữu ích: một ranh giới quyết định thẳng không thể ' +
            'tách các điểm dương nằm chéo khỏi các điểm âm nằm chéo.',
        },
        hints: [
          {
            en: 'Look for the case where one straight line is not enough.',
            vi: 'Hãy tìm trường hợp mà một đường thẳng là không đủ.',
          },
          {
            en: 'The key phrase is the linear limit of a single-layer Perceptron.',
            vi: 'Cụm chính là giới hạn tuyến tính của Perceptron một lớp.',
          },
        ],
        options: [
          {
            optionId: 'opt-linear-limit',
            text: {
              en: 'A straight-line decision boundary has a known limit.',
              vi: 'Ranh giới quyết định thẳng có một giới hạn rõ.',
            },
          },
          {
            optionId: 'opt-randomness',
            text: {
              en: 'A Perceptron only fails when the seed is random.',
              vi: 'Perceptron chỉ thất bại khi seed là ngẫu nhiên.',
            },
          },
          {
            optionId: 'opt-more-data',
            text: {
              en: 'Adding duplicate data always fixes the boundary.',
              vi: 'Thêm dữ liệu trùng lặp luôn sửa được ranh giới.',
            },
          },
        ],
        prompt: {
          en: 'What does the XOR example show about a single-layer Perceptron?',
          vi: 'Ví dụ XOR cho thấy điều gì về Perceptron một lớp?',
        },
        questionId: 'q-dl-p01-perceptron-role',
        sourceId: 'act-dl-p01-neuron-perceptron-quiz-01',
        sourceIds: ['d2l-vi'],
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-weighted-sum', 'opt-step-activation'],
        explanation: {
          en:
            'The neuron computes a weighted sum, adds bias, and uses a step activation ' +
            'to turn the score into a 0/1 output.',
          vi:
            'Neuron tính tổng có trọng số, cộng độ lệch, rồi dùng hàm bước để biến ' +
            'điểm số thành đầu ra 0/1.',
        },
        hints: [
          {
            en: 'A Perceptron first computes a score, then turns that score into a 0/1 decision.',
            vi: 'Perceptron trước hết tính một điểm số, rồi biến điểm số đó thành quyết định 0/1.',
          },
          {
            en: 'Keep the two parts that appear in the formula and the threshold rule.',
            vi: 'Giữ hai phần xuất hiện trong công thức và quy tắc ngưỡng.',
          },
        ],
        options: [
          {
            optionId: 'opt-weighted-sum',
            text: {
              en: 'Weighted sum with bias',
              vi: 'Tổng có trọng số kèm độ lệch',
            },
          },
          {
            optionId: 'opt-step-activation',
            text: {
              en: 'Step activation that returns 0 or 1',
              vi: 'Hàm bước trả về 0 hoặc 1',
            },
          },
          {
            optionId: 'opt-uploaded-dataset',
            text: {
              en: 'Uploaded arbitrary dataset',
              vi: 'Dataset tùy ý do người học tải lên',
            },
          },
          {
            optionId: 'opt-text-generation',
            text: {
              en: 'Runtime text generation',
              vi: 'Sinh văn bản trong runtime',
            },
          },
        ],
        prompt: {
          en: 'Which two parts are in the Perceptron decision rule from the lesson?',
          vi: 'Hai phần nào nằm trong quy tắc quyết định Perceptron của bài học?',
        },
        questionId: 'q-dl-p01-perceptron-parts',
        sourceId: 'act-dl-p01-neuron-perceptron-quiz-02',
        sourceIds: ['microsoft-ai-for-beginners'],
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'AND is linearly separable, so one Perceptron can draw a boundary for it.',
          vi: 'AND tách tuyến tính được, nên một Perceptron có thể vẽ ranh giới cho nó.',
        },
        hints: [
          {
            en: 'Compare the AND demo with the XOR table.',
            vi: 'So sánh demo AND với bảng XOR.',
          },
          {
            en: 'Only XOR places positive points diagonally across the square.',
            vi: 'Chỉ XOR đặt các điểm dương nằm chéo nhau trong hình vuông.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: the AND gate can be separated by one straight boundary.',
          vi: 'Đúng hay sai: cổng AND có thể được tách bằng một ranh giới thẳng.',
        },
        questionId: 'q-dl-p01-and-linearly-separable',
        sourceId: 'act-dl-p01-neuron-perceptron-quiz-03',
        sourceIds: ['d2l-vi', 'microsoft-ai-for-beginners'],
        type: 'true-false',
      },
    ],
  },
  'quiz-module-dl-m01': {
    courseId: 'course-deep-learning-basic',
    demoId: 'demo-perceptron-and-gate',
    draftProvenance: {
      candidateSourceIds: DL_M01_SOURCE_IDS,
      contentReviewStatus: 'pending-operator-review',
      externalEvidenceStatus: 'not-collected',
      importStatus: 'draft-only',
      sourceTrace: dlM01SourceTrace,
    },
    mastery: {
      en: 'Score at least 70% to complete the module and unlock the Perceptron playground.',
      vi: 'Đạt ít nhất 70% để hoàn thành module và mở Playground Perceptron.',
    },
    moduleId: 'dl-m01-neuron-perceptron',
    passingScorePercent: 70,
    postId: null,
    questionCount: 6,
    quizId: 'quiz-module-dl-m01',
    quizKind: 'module',
    quizRevisionId: 'quiz-module-dl-m01-rev-r1',
    requiredCorrectCount: null,
    unlocksOnPass: [{ id: 'perceptron', type: 'algorithm' }],
    questions: [
      {
        correctAnswer: 'opt-boundary',
        explanation: {
          en: 'A Perceptron represents one linear decision boundary.',
          vi: 'Perceptron biểu diễn một ranh giới quyết định tuyến tính.',
        },
        hints: [
          { en: 'Think about the line drawn in the demo.', vi: 'Hãy nghĩ đến đường trong demo.' },
          {
            en: 'The boundary is linear for this first model.',
            vi: 'Ranh giới của mô hình đầu tiên này là tuyến tính.',
          },
        ],
        options: [
          {
            optionId: 'opt-boundary',
            text: { en: 'Decision boundary', vi: 'Ranh giới quyết định' },
          },
          { optionId: 'opt-chatbot', text: { en: 'Chatbot memory', vi: 'Bộ nhớ chatbot' } },
          { optionId: 'opt-payment', text: { en: 'Payment rule', vi: 'Quy tắc thanh toán' } },
        ],
        prompt: {
          en: 'What does the Perceptron line represent?',
          vi: 'Đường Perceptron biểu diễn gì?',
        },
        questionId: 'q-dl-m01-boundary',
        sourceId: 'quiz-module-dl-m01-q01',
        sourceIds: ['microsoft-ai-for-beginners'],
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-x1', 'opt-x2'],
        explanation: {
          en: 'The AND/XOR examples use two binary inputs: x1 and x2.',
          vi: 'Các ví dụ AND/XOR dùng hai đầu vào nhị phân: x1 và x2.',
        },
        hints: [
          { en: 'Use the columns in the truth table.', vi: 'Dùng các cột trong bảng chân trị.' },
          { en: 'Both input columns are needed.', vi: 'Cần cả hai cột đầu vào.' },
        ],
        options: [
          { optionId: 'opt-x1', text: { en: 'x1', vi: 'x1' } },
          { optionId: 'opt-x2', text: { en: 'x2', vi: 'x2' } },
          { optionId: 'opt-xor', text: { en: 'XOR label', vi: 'Nhãn XOR' } },
        ],
        prompt: {
          en: 'Which values are model inputs in the truth table?',
          vi: 'Giá trị nào là đầu vào mô hình trong bảng chân trị?',
        },
        questionId: 'q-dl-m01-inputs',
        sourceId: 'quiz-module-dl-m01-q02',
        sourceIds: ['microsoft-ai-for-beginners'],
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'false',
        explanation: {
          en: 'XOR is not linearly separable.',
          vi: 'XOR không tách tuyến tính được.',
        },
        hints: [
          { en: 'The positive XOR points are diagonal.', vi: 'Các điểm dương XOR nằm chéo nhau.' },
          {
            en: 'One straight line cannot isolate both positives.',
            vi: 'Một đường thẳng không cô lập được cả hai điểm dương.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: XOR is linearly separable.',
          vi: 'Đúng hay sai: XOR tách tuyến tính được.',
        },
        questionId: 'q-dl-m01-xor-linearly-separable',
        sourceId: 'quiz-module-dl-m01-q03',
        sourceIds: ['d2l-vi'],
        type: 'true-false',
      },
      {
        correctAnswer: 'opt-bias-shift',
        explanation: {
          en: 'The bias shifts where the threshold is crossed.',
          vi: 'Độ lệch dịch vị trí mà ngưỡng bị vượt qua.',
        },
        hints: [
          {
            en: 'Bias is added after weighted inputs.',
            vi: 'Độ lệch được cộng sau các đầu vào có trọng số.',
          },
          { en: 'It shifts the decision point.', vi: 'Nó dịch điểm quyết định.' },
        ],
        options: [
          {
            optionId: 'opt-bias-shift',
            text: { en: 'It shifts the decision point.', vi: 'Nó dịch điểm quyết định.' },
          },
          {
            optionId: 'opt-bias-secret',
            text: { en: 'It stores the answer key.', vi: 'Nó lưu đáp án.' },
          },
          {
            optionId: 'opt-bias-upload',
            text: { en: 'It uploads the dataset.', vi: 'Nó tải dataset lên.' },
          },
        ],
        prompt: { en: 'What role does bias play?', vi: 'Độ lệch có vai trò gì?' },
        questionId: 'q-dl-m01-bias',
        sourceId: 'quiz-module-dl-m01-q04',
        sourceIds: ['d2l-vi', 'microsoft-ai-for-beginners'],
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-and-separable', 'opt-xor-not-separable'],
        explanation: {
          en: 'AND is the separable demo; XOR is the counterexample for one line.',
          vi: 'AND là demo tách được; XOR là phản ví dụ cho một đường thẳng.',
        },
        hints: [
          {
            en: 'One of these is the demo; one is the failure case.',
            vi: 'Một cái là demo; một cái là ca thất bại.',
          },
          {
            en: 'AND passes; XOR motivates the next model.',
            vi: 'AND đạt; XOR mở đường cho mô hình kế tiếp.',
          },
        ],
        options: [
          {
            optionId: 'opt-and-separable',
            text: { en: 'AND is linearly separable.', vi: 'AND tách tuyến tính được.' },
          },
          {
            optionId: 'opt-xor-not-separable',
            text: { en: 'XOR is not linearly separable.', vi: 'XOR không tách tuyến tính được.' },
          },
          {
            optionId: 'opt-xor-demo-pass',
            text: { en: 'XOR is the fixed passing demo.', vi: 'XOR là demo cố định đã pass.' },
          },
        ],
        prompt: {
          en: 'Which statements correctly compare AND and XOR?',
          vi: 'Nhận định nào so sánh đúng AND và XOR?',
        },
        questionId: 'q-dl-m01-and-xor',
        sourceId: 'quiz-module-dl-m01-q05',
        sourceIds: ['d2l-vi'],
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'A hidden layer can transform the representation before the final decision.',
          vi: 'Hidden layer có thể biến đổi biểu diễn trước quyết định cuối.',
        },
        hints: [
          {
            en: 'The lesson points from XOR to the next model.',
            vi: 'Bài học đi từ XOR sang mô hình kế tiếp.',
          },
          {
            en: 'The next model bends the representation.',
            vi: 'Mô hình kế tiếp bẻ cong biểu diễn.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: the XOR failure motivates a hidden layer.',
          vi: 'Đúng hay sai: thất bại XOR gợi ý cần hidden layer.',
        },
        questionId: 'q-dl-m01-hidden-layer',
        sourceId: 'quiz-module-dl-m01-q06',
        sourceIds: ['d2l-vi'],
        type: 'true-false',
      },
    ],
  },
  'quiz-post-dl-p02': {
    courseId: 'course-deep-learning-basic',
    demoId: null,
    draftProvenance: dlM02DraftProvenance,
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: 'dl-m02-mlp',
    passingScorePercent: 100,
    postId: 'dl-p02-mlp-forward-activation',
    questionCount: 3,
    quizId: 'quiz-post-dl-p02',
    quizKind: 'post',
    quizRevisionId: 'quiz-post-dl-p02-rev-r1',
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: 'dl-p02-mlp-forward-activation', type: 'post' }],
    questions: [
      {
        correctAnswer: 'opt-affine-collapse',
        explanation: {
          en: 'Composing affine maps still gives an affine map. A hidden layer needs an activation to become a nonlinear modelling step.',
          vi: 'Hợp thành các ánh xạ affine vẫn cho một ánh xạ affine. Hidden layer cần kích hoạt để trở thành bước mô hình hóa phi tuyến.',
        },
        hints: [
          {
            en: 'Ask what happens when no activation sits between the two layers.',
            vi: 'Hãy xét điều gì xảy ra khi không có kích hoạt giữa hai lớp.',
          },
          {
            en: 'The lesson contrasts a stack of affine maps with an activated hidden layer.',
            vi: 'Bài học đối chiếu một chồng ánh xạ affine với hidden layer có kích hoạt.',
          },
        ],
        options: [
          {
            optionId: 'opt-affine-collapse',
            text: {
              en: 'They can still be represented as one affine transformation.',
              vi: 'Chúng vẫn có thể được biểu diễn thành một phép biến đổi affine.',
            },
          },
          {
            optionId: 'opt-affine-memory',
            text: {
              en: 'They automatically store one separate rule for each input row.',
              vi: 'Chúng tự động lưu một quy tắc riêng cho từng hàng đầu vào.',
            },
          },
          {
            optionId: 'opt-affine-relu',
            text: {
              en: 'They automatically apply ReLU without an activation layer.',
              vi: 'Chúng tự động áp dụng ReLU dù không có lớp kích hoạt.',
            },
          },
        ],
        prompt: {
          en: 'What is true of two affine transformations with no activation between them?',
          vi: 'Điều gì đúng với hai phép biến đổi affine không có kích hoạt ở giữa?',
        },
        questionId: 'q-dl-p02-affine-composition',
        sourceId: 'act-dl-p02-mlp-forward-activation-quiz-01',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-hidden-affine', 'opt-nonlinear-activation'],
        explanation: {
          en: 'The hidden computation first forms an affine score and then applies a nonlinear activation. Together they form the hidden representation used by the output layer.',
          vi: 'Phép tính hidden trước hết tạo điểm affine rồi áp dụng kích hoạt phi tuyến. Cả hai tạo thành biểu diễn hidden mà lớp đầu ra sử dụng.',
        },
        hints: [
          {
            en: 'Keep the score-forming operation and the operation that changes it nonlinearly.',
            vi: 'Giữ phép tạo điểm và phép làm điểm đó trở nên phi tuyến.',
          },
          {
            en: 'The notation H = sigma(XW + b) shows both pieces.',
            vi: 'Ký hiệu H = sigma(XW + b) thể hiện cả hai phần.',
          },
        ],
        options: [
          {
            optionId: 'opt-hidden-affine',
            text: { en: 'An affine hidden score', vi: 'Một điểm hidden affine' },
          },
          {
            optionId: 'opt-nonlinear-activation',
            text: { en: 'A nonlinear activation', vi: 'Một kích hoạt phi tuyến' },
          },
          {
            optionId: 'opt-raw-output-copy',
            text: {
              en: 'Copying the raw inputs unchanged to the output',
              vi: 'Sao chép nguyên đầu vào thô sang đầu ra',
            },
          },
          {
            optionId: 'opt-label-rewrite',
            text: {
              en: 'Rewriting target labels before the model reads them',
              vi: 'Viết lại nhãn target trước khi mô hình đọc chúng',
            },
          },
        ],
        prompt: {
          en: 'Which two operations form the hidden representation in the lesson?',
          vi: 'Hai phép toán nào tạo biểu diễn hidden trong bài học?',
        },
        questionId: 'q-dl-p02-hidden-activation',
        sourceId: 'act-dl-p02-mlp-forward-activation-quiz-02',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'ReLU is defined as max(z, 0), so a negative hidden score maps to 0 while a positive score passes through.',
          vi: 'ReLU được định nghĩa là max(z, 0), nên điểm hidden âm thành 0 còn điểm dương được giữ lại.',
        },
        hints: [
          {
            en: 'Compare a negative score with zero in the ReLU definition.',
            vi: 'So sánh điểm âm với 0 trong định nghĩa ReLU.',
          },
          {
            en: 'ReLU keeps the maximum of its input and zero.',
            vi: 'ReLU giữ giá trị lớn hơn giữa đầu vào và 0.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: ReLU maps a negative hidden score to 0.',
          vi: 'Đúng hay sai: ReLU biến điểm hidden âm thành 0.',
        },
        questionId: 'q-dl-p02-relu-negative-score',
        sourceId: 'act-dl-p02-mlp-forward-activation-quiz-03',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'true-false',
      },
    ],
  },
  'quiz-module-dl-m02': {
    courseId: 'course-deep-learning-basic',
    demoId: 'demo-mlp-checkerboard',
    draftProvenance: dlM02DraftProvenance,
    mastery: {
      en: 'Score at least 70% to complete the module and unlock the MLP playground.',
      vi: 'Đạt ít nhất 70% để hoàn thành module và mở Playground MLP.',
    },
    moduleId: 'dl-m02-mlp',
    passingScorePercent: 70,
    postId: null,
    questionCount: 6,
    quizId: 'quiz-module-dl-m02',
    quizKind: 'module',
    quizRevisionId: 'quiz-module-dl-m02-rev-r1',
    requiredCorrectCount: null,
    unlocksOnPass: [{ id: 'mlp', type: 'algorithm' }],
    questions: [
      {
        correctAnswer: 'opt-hidden-representation',
        explanation: {
          en: 'Earlier MLP layers create a representation; the later output layer predicts from that representation.',
          vi: 'Các lớp MLP trước tạo biểu diễn; lớp đầu ra sau đó dự đoán từ biểu diễn ấy.',
        },
        hints: [
          {
            en: 'The output layer receives H, not only the original input.',
            vi: 'Lớp đầu ra nhận H, không chỉ đầu vào ban đầu.',
          },
          {
            en: 'Look for the role that happens before the final prediction.',
            vi: 'Tìm vai trò xảy ra trước dự đoán cuối cùng.',
          },
        ],
        options: [
          {
            optionId: 'opt-hidden-representation',
            text: {
              en: 'Build a representation for the output layer to read.',
              vi: 'Tạo biểu diễn để lớp đầu ra đọc.',
            },
          },
          {
            optionId: 'opt-hidden-label-store',
            text: {
              en: 'Store a separate target label for every input.',
              vi: 'Lưu một nhãn target riêng cho mọi đầu vào.',
            },
          },
          {
            optionId: 'opt-hidden-linear-skip',
            text: {
              en: 'Skip the transformation and send raw inputs unchanged.',
              vi: 'Bỏ qua biến đổi và gửi nguyên đầu vào thô.',
            },
          },
        ],
        prompt: {
          en: 'What is the role of an earlier hidden layer in an MLP?',
          vi: 'Vai trò của hidden layer trước trong MLP là gì?',
        },
        questionId: 'q-dl-m02-hidden-representation',
        sourceId: 'quiz-module-dl-m02-q01',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: 'opt-one-affine-map',
        explanation: {
          en: 'Affine composition is still affine, so stacking affine layers without activation does not create the needed nonlinear representation.',
          vi: 'Hợp thành affine vẫn là affine, nên xếp các lớp affine không kích hoạt không tạo được biểu diễn phi tuyến cần thiết.',
        },
        hints: [
          {
            en: 'The lesson names the missing operation between the affine layers.',
            vi: 'Bài học gọi tên phép toán còn thiếu giữa các lớp affine.',
          },
          {
            en: 'Without that operation, the stack can be compressed.',
            vi: 'Không có phép toán đó, chồng lớp có thể bị rút gọn.',
          },
        ],
        options: [
          {
            optionId: 'opt-one-affine-map',
            text: {
              en: 'The stack can be reduced to one affine map.',
              vi: 'Chồng lớp có thể rút gọn thành một ánh xạ affine.',
            },
          },
          {
            optionId: 'opt-each-label',
            text: {
              en: 'Each layer must create one new target label.',
              vi: 'Mỗi lớp phải tạo một nhãn target mới.',
            },
          },
          {
            optionId: 'opt-always-nonlinear',
            text: {
              en: 'The stack is automatically nonlinear because it has two layers.',
              vi: 'Chồng lớp tự động phi tuyến vì có hai lớp.',
            },
          },
        ],
        prompt: {
          en: 'What remains true when an MLP stacks affine layers but omits activations?',
          vi: 'Điều gì vẫn đúng khi MLP xếp các lớp affine nhưng bỏ kích hoạt?',
        },
        questionId: 'q-dl-m02-affine-limit',
        sourceId: 'quiz-module-dl-m02-q02',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: 'opt-positive-pass-negative-zero',
        explanation: {
          en: 'ReLU returns max(z, 0): it retains positive values and sets negative values to zero.',
          vi: 'ReLU trả về max(z, 0): nó giữ giá trị dương và đặt giá trị âm thành 0.',
        },
        hints: [
          {
            en: 'Use the two cases in max(z, 0).',
            vi: 'Dùng hai trường hợp trong max(z, 0).',
          },
          {
            en: 'One sign passes through and the other is clipped at zero.',
            vi: 'Một dấu được giữ lại và dấu còn lại bị chặn ở 0.',
          },
        ],
        options: [
          {
            optionId: 'opt-positive-pass-negative-zero',
            text: {
              en: 'Positive values pass through and negative values become zero.',
              vi: 'Giá trị dương được giữ lại, giá trị âm thành 0.',
            },
          },
          {
            optionId: 'opt-positive-zero-negative-pass',
            text: {
              en: 'Positive values become zero and negative values pass through.',
              vi: 'Giá trị dương thành 0 còn giá trị âm được giữ lại.',
            },
          },
          {
            optionId: 'opt-all-one',
            text: {
              en: 'Every hidden value becomes one.',
              vi: 'Mọi giá trị hidden đều trở thành một.',
            },
          },
        ],
        prompt: {
          en: 'How does ReLU treat positive and negative hidden values?',
          vi: 'ReLU xử lý giá trị hidden dương và âm như thế nào?',
        },
        questionId: 'q-dl-m02-relu-behaviour',
        sourceId: 'quiz-module-dl-m02-q03',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: 'opt-nonlinear-hidden-step',
        explanation: {
          en: 'The checkerboard is used to inspect why the output needs a hidden representation that includes a nonlinear activation, rather than another collapsed affine rule.',
          vi: 'Bàn cờ được dùng để quan sát vì sao đầu ra cần biểu diễn hidden có kích hoạt phi tuyến, thay vì thêm một quy tắc affine đã bị gộp.',
        },
        hints: [
          {
            en: 'The key is what changes the representation before the output reads it.',
            vi: 'Điểm chính là điều gì đổi biểu diễn trước khi đầu ra đọc nó.',
          },
          {
            en: 'The demo does not claim a fitted browser model or a new dataset.',
            vi: 'Demo không khẳng định có mô hình fit trong trình duyệt hay dataset mới.',
          },
        ],
        options: [
          {
            optionId: 'opt-nonlinear-hidden-step',
            text: {
              en: 'A nonlinear hidden activation changes the representation before output prediction.',
              vi: 'Kích hoạt hidden phi tuyến đổi biểu diễn trước dự đoán đầu ra.',
            },
          },
          {
            optionId: 'opt-duplicate-row',
            text: {
              en: 'Duplicating the four input rows changes the representation.',
              vi: 'Nhân đôi bốn hàng đầu vào làm đổi biểu diễn.',
            },
          },
          {
            optionId: 'opt-output-first',
            text: {
              en: 'The output layer creates the hidden representation after predicting.',
              vi: 'Lớp đầu ra tạo biểu diễn hidden sau khi dự đoán.',
            },
          },
        ],
        prompt: {
          en: 'What modelling step makes the fixed checkerboard useful in this MLP lesson?',
          vi: 'Bước mô hình hóa nào làm bàn cờ cố định hữu ích trong bài MLP này?',
        },
        questionId: 'q-dl-m02-checkerboard-nonlinearity',
        sourceId: 'quiz-module-dl-m02-q04',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-hidden-h', 'opt-output-o'],
        explanation: {
          en: 'The forward chain forms H with an activated hidden layer, then forms O from H. The final layer predicts from the representation created earlier.',
          vi: 'Chuỗi truyền xuôi tạo H bằng hidden layer có kích hoạt, rồi tạo O từ H. Lớp cuối dự đoán từ biểu diễn được tạo trước đó.',
        },
        hints: [
          {
            en: 'Choose the two symbols and roles in the forward equations.',
            vi: 'Chọn hai ký hiệu và vai trò trong các phương trình truyền xuôi.',
          },
          {
            en: 'H comes before O.',
            vi: 'H đứng trước O.',
          },
        ],
        options: [
          {
            optionId: 'opt-hidden-h',
            text: {
              en: 'H is the activated hidden representation.',
              vi: 'H là biểu diễn hidden đã kích hoạt.',
            },
          },
          {
            optionId: 'opt-output-o',
            text: {
              en: 'O is the output computed from the hidden representation.',
              vi: 'O là đầu ra tính từ biểu diễn hidden.',
            },
          },
          {
            optionId: 'opt-h-labels',
            text: {
              en: 'H is a table of rewritten target labels.',
              vi: 'H là bảng các nhãn target được viết lại.',
            },
          },
          {
            optionId: 'opt-o-raw-only',
            text: {
              en: 'O ignores the hidden representation and must use only raw inputs.',
              vi: 'O bỏ qua biểu diễn hidden và bắt buộc chỉ dùng đầu vào thô.',
            },
          },
        ],
        prompt: {
          en: 'Which two statements correctly describe the forward chain H then O?',
          vi: 'Hai nhận định nào mô tả đúng chuỗi truyền xuôi H rồi O?',
        },
        questionId: 'q-dl-m02-forward-chain',
        sourceId: 'quiz-module-dl-m02-q05',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'In the lesson notation, the output is computed from H, the representation produced by the earlier activated hidden layer.',
          vi: 'Trong ký hiệu của bài, đầu ra được tính từ H, biểu diễn do hidden layer có kích hoạt tạo ra trước đó.',
        },
        hints: [
          {
            en: 'Read the second equation in the forward chain.',
            vi: 'Đọc phương trình thứ hai trong chuỗi truyền xuôi.',
          },
          {
            en: 'The output layer follows the representation layer.',
            vi: 'Lớp đầu ra theo sau lớp biểu diễn.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: the output layer predicts from the hidden representation.',
          vi: 'Đúng hay sai: lớp đầu ra dự đoán từ biểu diễn hidden.',
        },
        questionId: 'q-dl-m02-output-from-hidden',
        sourceId: 'quiz-module-dl-m02-q06',
        sourceIds: DL_M02_SOURCE_IDS,
        type: 'true-false',
      },
    ],
  },
  'quiz-post-dl-p03': {
    courseId: 'course-deep-learning-basic',
    demoId: null,
    draftProvenance: dlM03DraftProvenance,
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: 'dl-m03-training-generalization',
    passingScorePercent: 100,
    postId: 'dl-p03-backprop-overfitting',
    questionCount: 3,
    quizId: 'quiz-post-dl-p03',
    quizKind: 'post',
    quizRevisionId: 'quiz-post-dl-p03-rev-r1',
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: 'dl-p03-backprop-overfitting', type: 'post' }],
    questions: [
      {
        correctAnswer: 'opt-forward-dependencies',
        explanation: {
          en: 'Forward propagation follows the computational dependencies from inputs through hidden values and outputs to the objective.',
          vi: 'Truyền xuôi đi theo các phụ thuộc tính toán từ đầu vào qua giá trị hidden và đầu ra đến mục tiêu.',
        },
        hints: [
          {
            en: 'Start at the input side of the graph, not at the objective.',
            vi: 'Bắt đầu ở phía đầu vào của đồ thị, không phải tại mục tiêu.',
          },
          {
            en: 'Forward values must exist before the objective can be evaluated.',
            vi: 'Giá trị truyền xuôi phải tồn tại trước khi có thể tính mục tiêu.',
          },
        ],
        options: [
          {
            optionId: 'opt-forward-dependencies',
            text: {
              en: 'Inputs → hidden values → outputs → objective',
              vi: 'Đầu vào → giá trị hidden → đầu ra → mục tiêu',
            },
          },
          {
            optionId: 'opt-forward-reverse',
            text: {
              en: 'Objective → outputs → hidden values → inputs',
              vi: 'Mục tiêu → đầu ra → giá trị hidden → đầu vào',
            },
          },
          {
            optionId: 'opt-forward-labels',
            text: {
              en: 'Target labels → parameters → unrelated inputs',
              vi: 'Nhãn target → tham số → đầu vào không liên quan',
            },
          },
        ],
        prompt: {
          en: 'Which order describes forward propagation in the lesson?',
          vi: 'Thứ tự nào mô tả truyền xuôi trong bài học?',
        },
        questionId: 'q-dl-p03-forward-order',
        sourceId: 'act-dl-p03-backprop-overfitting-quiz-01',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-start-objective', 'opt-reverse-dependencies'],
        explanation: {
          en: 'Backpropagation begins with the objective at the output and moves through the graph in reverse dependency order, using the chain rule to connect derivatives.',
          vi: 'Lan truyền ngược bắt đầu với mục tiêu ở đầu ra và đi qua đồ thị theo thứ tự phụ thuộc đảo, dùng quy tắc chuỗi để nối các đạo hàm.',
        },
        hints: [
          {
            en: 'Choose where gradients start and which direction they travel.',
            vi: 'Chọn nơi gradient bắt đầu và chiều chúng đi.',
          },
          {
            en: 'Backward is the reverse of the dependency order used in forward propagation.',
            vi: 'Backward là chiều đảo của thứ tự phụ thuộc dùng trong truyền xuôi.',
          },
        ],
        options: [
          {
            optionId: 'opt-start-objective',
            text: {
              en: 'Start with the objective at the output.',
              vi: 'Bắt đầu với mục tiêu tại đầu ra.',
            },
          },
          {
            optionId: 'opt-reverse-dependencies',
            text: {
              en: 'Move through dependencies in reverse order.',
              vi: 'Đi qua các phụ thuộc theo thứ tự đảo.',
            },
          },
          {
            optionId: 'opt-ignore-values',
            text: {
              en: 'Ignore the intermediate values from forward propagation.',
              vi: 'Bỏ qua các giá trị trung gian của truyền xuôi.',
            },
          },
          {
            optionId: 'opt-rewrite-targets',
            text: {
              en: 'Rewrite target labels before differentiating.',
              vi: 'Viết lại nhãn target trước khi lấy đạo hàm.',
            },
          },
        ],
        prompt: {
          en: 'Which two actions describe the direction of backpropagation?',
          vi: 'Hai hành động nào mô tả chiều của lan truyền ngược?',
        },
        questionId: 'q-dl-p03-backward-direction',
        sourceId: 'act-dl-p03-backprop-overfitting-quiz-02',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'Training loss alone measures fit to seen examples. A validation or held-out check is needed before claiming a lower training loss generalises.',
          vi: 'Chỉ loss train đo độ khớp với ví dụ đã thấy. Cần kiểm tra validation hoặc giữ lại trước khi khẳng định loss train thấp hơn có tổng quát.',
        },
        hints: [
          {
            en: 'Compare the evidence from seen data with evidence from held-out data.',
            vi: 'So sánh bằng chứng từ dữ liệu đã thấy với dữ liệu giữ lại.',
          },
          {
            en: 'A lower training loss can coexist with a worse validation loss.',
            vi: 'Loss train thấp hơn có thể đồng thời với loss validation tệ hơn.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: a lower training loss alone proves a model will generalise better.',
          vi: 'Đúng hay sai: chỉ loss train thấp hơn chứng minh mô hình sẽ tổng quát tốt hơn.',
        },
        questionId: 'q-dl-p03-train-loss-not-proof',
        sourceId: 'act-dl-p03-backprop-overfitting-quiz-03',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'true-false',
      },
    ],
  },
  'quiz-module-dl-m03': {
    courseId: 'course-deep-learning-basic',
    demoId: null,
    draftProvenance: dlM03DraftProvenance,
    mastery: {
      en: 'Score at least 70% to complete the module.',
      vi: 'Đạt ít nhất 70% để hoàn thành module.',
    },
    moduleId: 'dl-m03-training-generalization',
    passingScorePercent: 70,
    postId: null,
    questionCount: 6,
    quizId: 'quiz-module-dl-m03',
    quizKind: 'module',
    quizRevisionId: 'quiz-module-dl-m03-rev-r1',
    requiredCorrectCount: null,
    unlocksOnPass: [],
    questions: [
      {
        correctAnswer: 'opt-gradient-parameters',
        explanation: {
          en: 'Backpropagation computes gradients with respect to network parameters so an optimisation step can know how the objective changes around the current values.',
          vi: 'Lan truyền ngược tính gradient theo tham số mạng để bước tối ưu biết mục tiêu đổi thế nào quanh các giá trị hiện tại.',
        },
        hints: [
          {
            en: 'Ask what needs a gradient when model values are updated.',
            vi: 'Hãy hỏi điều gì cần gradient khi cập nhật giá trị mô hình.',
          },
          {
            en: 'The target is not the gradient destination; the model parameters are.',
            vi: 'Target không phải đích của gradient; các tham số mô hình mới là đích.',
          },
        ],
        options: [
          {
            optionId: 'opt-gradient-parameters',
            text: {
              en: 'Gradients of the objective with respect to network parameters',
              vi: 'Gradient của mục tiêu theo tham số mạng',
            },
          },
          {
            optionId: 'opt-gradient-new-labels',
            text: {
              en: 'New target labels for the training data',
              vi: 'Nhãn target mới cho dữ liệu train',
            },
          },
          {
            optionId: 'opt-gradient-browser',
            text: {
              en: 'A separate browser decision for each point',
              vi: 'Một quyết định trình duyệt riêng cho từng điểm',
            },
          },
        ],
        prompt: {
          en: 'What does backpropagation compute for a neural network?',
          vi: 'Lan truyền ngược tính gì cho mạng nơ-ron?',
        },
        questionId: 'q-dl-m03-gradient-parameters',
        sourceId: 'quiz-module-dl-m03-q01',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: 'opt-chain-path',
        explanation: {
          en: 'The chain rule combines a downstream derivative with a local derivative along the computational path.',
          vi: 'Quy tắc chuỗi kết hợp đạo hàm hạ nguồn với đạo hàm cục bộ dọc đường tính toán.',
        },
        hints: [
          {
            en: 'A composed path has an intermediate value between the earlier and later variables.',
            vi: 'Đường ghép có một giá trị trung gian giữa biến sớm và biến muộn.',
          },
          {
            en: 'The derivative travels through that intermediate dependency.',
            vi: 'Đạo hàm đi qua phụ thuộc trung gian đó.',
          },
        ],
        options: [
          {
            optionId: 'opt-chain-path',
            text: {
              en: 'Combine downstream and local derivatives along the path.',
              vi: 'Kết hợp đạo hàm hạ nguồn và cục bộ dọc đường đi.',
            },
          },
          {
            optionId: 'opt-chain-copy',
            text: {
              en: 'Copy the objective value to every earlier layer unchanged.',
              vi: 'Sao chép nguyên giá trị mục tiêu đến mọi lớp trước.',
            },
          },
          {
            optionId: 'opt-chain-reorder',
            text: {
              en: 'Choose derivative order at random for each parameter.',
              vi: 'Chọn ngẫu nhiên thứ tự đạo hàm cho từng tham số.',
            },
          },
        ],
        prompt: {
          en: 'How does the chain rule connect derivatives in backpropagation?',
          vi: 'Quy tắc chuỗi nối các đạo hàm trong lan truyền ngược như thế nào?',
        },
        questionId: 'q-dl-m03-chain-rule-path',
        sourceId: 'quiz-module-dl-m03-q02',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'Forward propagation computes and preserves intermediate values that backpropagation needs when it walks through the same graph in reverse.',
          vi: 'Truyền xuôi tính và giữ các giá trị trung gian mà lan truyền ngược cần khi đi qua cùng đồ thị theo chiều đảo.',
        },
        hints: [
          {
            en: 'Backward reuses the graph that forward already evaluated.',
            vi: 'Backward dùng lại đồ thị mà forward đã tính.',
          },
          {
            en: 'The two directions depend on the same intermediate values.',
            vi: 'Hai chiều phụ thuộc vào cùng các giá trị trung gian.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: backpropagation can use intermediate values computed during forward propagation.',
          vi: 'Đúng hay sai: lan truyền ngược có thể dùng giá trị trung gian đã tính trong truyền xuôi.',
        },
        questionId: 'q-dl-m03-forward-values-reused',
        sourceId: 'quiz-module-dl-m03-q03',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'true-false',
      },
      {
        correctAnswer: 'opt-underfit-high-train',
        explanation: {
          en: 'Underfitting means the model cannot reduce training error enough to capture the relevant pattern.',
          vi: 'Underfitting nghĩa là mô hình không thể giảm lỗi train đủ để nắm được mẫu liên quan.',
        },
        hints: [
          {
            en: 'Look at the training error before comparing the two losses.',
            vi: 'Hãy nhìn lỗi train trước khi so sánh hai loss.',
          },
          {
            en: 'A limited model may remain inaccurate even on the examples it saw.',
            vi: 'Mô hình hạn chế có thể vẫn không chính xác ngay cả trên ví dụ đã thấy.',
          },
        ],
        options: [
          {
            optionId: 'opt-underfit-high-train',
            text: {
              en: 'Training error remains high because the model misses the pattern.',
              vi: 'Lỗi train còn cao vì mô hình bỏ lỡ mẫu.',
            },
          },
          {
            optionId: 'opt-underfit-gap',
            text: {
              en: 'Training loss is much lower than validation loss after fitting noise.',
              vi: 'Loss train thấp hơn nhiều loss validation sau khi khớp nhiễu.',
            },
          },
          {
            optionId: 'opt-underfit-perfect',
            text: {
              en: 'Both training and validation losses are zero by definition.',
              vi: 'Cả loss train và validation đều bằng 0 theo định nghĩa.',
            },
          },
        ],
        prompt: {
          en: 'Which observation is most consistent with underfitting?',
          vi: 'Quan sát nào phù hợp nhất với underfitting?',
        },
        questionId: 'q-dl-m03-underfitting',
        sourceId: 'quiz-module-dl-m03-q04',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: 'opt-overfit-gap',
        explanation: {
          en: 'Overfitting is signalled when training loss becomes much lower than validation loss because a complex model has followed training-specific noise.',
          vi: 'Overfitting được báo hiệu khi loss train thấp hơn nhiều loss validation vì mô hình phức tạp đã bám theo nhiễu riêng của train.',
        },
        hints: [
          {
            en: 'Compare the later curve checkpoint in the lesson.',
            vi: 'So sánh mốc đường cong muộn trong bài học.',
          },
          {
            en: 'The key is a widening gap, not merely a low training value.',
            vi: 'Điểm chính là khoảng cách mở rộng, không chỉ là giá trị train thấp.',
          },
        ],
        options: [
          {
            optionId: 'opt-overfit-gap',
            text: {
              en: 'Training loss is much lower than validation loss.',
              vi: 'Loss train thấp hơn nhiều loss validation.',
            },
          },
          {
            optionId: 'opt-overfit-both-high',
            text: {
              en: 'Both losses remain high because the model cannot fit training examples.',
              vi: 'Cả hai loss còn cao vì mô hình không khớp được ví dụ train.',
            },
          },
          {
            optionId: 'opt-overfit-same',
            text: {
              en: 'Both losses improve together with no meaningful gap.',
              vi: 'Cả hai loss cùng cải thiện không có khoảng cách đáng kể.',
            },
          },
        ],
        prompt: {
          en: 'Which loss pattern warns that a complex model may be overfitting?',
          vi: 'Mẫu loss nào cảnh báo mô hình phức tạp có thể đang overfitting?',
        },
        questionId: 'q-dl-m03-overfitting-gap',
        sourceId: 'quiz-module-dl-m03-q05',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-heldout-evidence', 'opt-cautious-validation'],
        explanation: {
          en: 'Use held-out validation evidence for model selection and avoid treating a repeatedly tuned validation score as an unrestricted target. Training loss alone is not enough.',
          vi: 'Dùng bằng chứng validation giữ lại để chọn mô hình và tránh coi điểm validation đã được tinh chỉnh lặp lại là mục tiêu không giới hạn. Chỉ loss train là chưa đủ.',
        },
        hints: [
          {
            en: 'Pick the checks that keep generalisation evidence meaningful.',
            vi: 'Chọn các kiểm tra giữ bằng chứng tổng quát có ý nghĩa.',
          },
          {
            en: 'The source warns both to use validation and not to use it too freely.',
            vi: 'Nguồn vừa khuyên dùng validation vừa cảnh báo không dùng nó quá tự do.',
          },
        ],
        options: [
          {
            optionId: 'opt-heldout-evidence',
            text: {
              en: 'Compare with held-out validation evidence.',
              vi: 'So sánh với bằng chứng validation giữ lại.',
            },
          },
          {
            optionId: 'opt-cautious-validation',
            text: {
              en: 'Use the validation set carefully during model selection.',
              vi: 'Dùng tập validation cẩn trọng khi chọn mô hình.',
            },
          },
          {
            optionId: 'opt-train-only',
            text: {
              en: 'Choose the model from the lowest training loss alone.',
              vi: 'Chọn mô hình chỉ từ loss train thấp nhất.',
            },
          },
          {
            optionId: 'opt-repeat-validation',
            text: {
              en: 'Retune until the same validation score looks ideal.',
              vi: 'Tinh chỉnh cho đến khi cùng điểm validation trông lý tưởng.',
            },
          },
        ],
        prompt: {
          en: 'Which two practices keep model-selection evidence more trustworthy?',
          vi: 'Hai thực hành nào giữ bằng chứng chọn mô hình đáng tin hơn?',
        },
        questionId: 'q-dl-m03-validation-practice',
        sourceId: 'quiz-module-dl-m03-q06',
        sourceIds: DL_M03_SOURCE_IDS,
        type: 'multiple-choice',
      },
    ],
  },
  'quiz-post-cml-p01': {
    courseId: 'course-classical-ml',
    demoId: null,
    draftProvenance: cmlM01DraftProvenance,
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: 'cml-m01-foundations',
    passingScorePercent: 100,
    postId: 'cml-p01-problem-data-types',
    questionCount: 3,
    quizId: 'quiz-post-cml-p01',
    quizKind: 'post',
    quizRevisionId: 'quiz-post-cml-p01-rev-r1',
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: 'cml-p01-problem-data-types', type: 'post' }],
    questions: [
      {
        correctAnswer: 'opt-queue-label',
        explanation: {
          en: 'The historical queue length is the known outcome being estimated. Hour and reservation count are evidence available to estimate it.',
          vi: 'Độ dài hàng đợi lịch sử là kết quả đã biết đang được ước lượng. Giờ và số lượt đặt chỗ là bằng chứng có sẵn để ước lượng nó.',
        },
        hints: [
          {
            en: 'Ask which value is the past answer to the forecast.',
            vi: 'Hãy hỏi giá trị nào là đáp án quá khứ của dự báo.',
          },
          {
            en: 'Features are inputs; the label is the outcome to estimate.',
            vi: 'Feature là đầu vào; nhãn là kết quả cần ước lượng.',
          },
        ],
        options: [
          {
            optionId: 'opt-queue-label',
            text: { en: 'The recorded queue length', vi: 'Độ dài hàng đợi đã ghi nhận' },
          },
          {
            optionId: 'opt-hour-feature',
            text: { en: 'The hour of the day', vi: 'Giờ trong ngày' },
          },
          {
            optionId: 'opt-reservation-feature',
            text: { en: 'The active reservation count', vi: 'Số lượt đặt chỗ đang hoạt động' },
          },
        ],
        prompt: {
          en: 'For historical rows used to forecast a library queue, which field is the label?',
          vi: 'Trong các dòng lịch sử dùng để dự báo hàng đợi thư viện, trường nào là nhãn?',
        },
        questionId: 'q-cml-p01-label-from-history',
        sourceId: 'act-cml-p01-problem-data-types-quiz-01',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-delivery-delay', 'opt-ticket-routing'],
        explanation: {
          en: 'Both tasks have historical inputs paired with known outcomes. Grouping anonymous records has no supplied outcome, so it is an unlabeled grouping task instead.',
          vi: 'Cả hai nhiệm vụ đều có đầu vào lịch sử ghép với kết quả đã biết. Gom các bản ghi ẩn danh không có kết quả được cung cấp nên đó là nhiệm vụ gom nhóm không nhãn.',
        },
        hints: [
          {
            en: 'Choose the tasks where an intended answer exists in past rows.',
            vi: 'Chọn các nhiệm vụ có đáp án mong muốn tồn tại trong các dòng quá khứ.',
          },
          {
            en: 'A known number or named class can be a supervised target.',
            vi: 'Một con số hoặc lớp có tên đã biết có thể là mục tiêu có giám sát.',
          },
        ],
        options: [
          {
            optionId: 'opt-delivery-delay',
            text: {
              en: 'Estimate a delivery delay from completed deliveries',
              vi: 'Ước lượng trễ giao hàng từ các lượt giao đã hoàn tất',
            },
          },
          {
            optionId: 'opt-ticket-routing',
            text: {
              en: 'Route a ticket using its previously assigned team',
              vi: 'Chuyển phiếu bằng đội đã được gán trước đó',
            },
          },
          {
            optionId: 'opt-anonymous-groups',
            text: {
              en: 'Group anonymous usage records with no supplied outcome',
              vi: 'Gom bản ghi sử dụng ẩn danh không có kết quả được cung cấp',
            },
          },
          {
            optionId: 'opt-dashboard-layout',
            text: {
              en: 'Arrange dashboard panels by visual preference',
              vi: 'Sắp xếp bảng điều khiển theo sở thích trực quan',
            },
          },
        ],
        prompt: {
          en: 'Which two tasks are supervised learning tasks?',
          vi: 'Hai nhiệm vụ nào là nhiệm vụ học có giám sát?',
        },
        questionId: 'q-cml-p01-supervised-pairs',
        sourceId: 'act-cml-p01-problem-data-types-quiz-02',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'Clustering starts from unlabeled inputs and searches for useful patterns or groups rather than matching each row to a predefined output.',
          vi: 'Clustering bắt đầu từ đầu vào không nhãn và tìm mẫu hoặc nhóm hữu ích thay vì ghép mỗi dòng với đầu ra được xác định sẵn.',
        },
        hints: [
          {
            en: 'Look for whether a target is supplied before grouping begins.',
            vi: 'Hãy xem có mục tiêu được cung cấp trước khi bắt đầu gom nhóm hay không.',
          },
          {
            en: 'No paired outcome means the task can be exploratory grouping.',
            vi: 'Không có kết quả ghép cặp nghĩa là nhiệm vụ có thể là gom nhóm khám phá.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: clustering can be appropriate when records have no predefined output label.',
          vi: 'Đúng hay sai: clustering có thể phù hợp khi các bản ghi không có nhãn đầu ra được xác định trước.',
        },
        questionId: 'q-cml-p01-clustering-without-labels',
        sourceId: 'act-cml-p01-problem-data-types-quiz-03',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'true-false',
      },
    ],
  },
  'quiz-post-cml-p02': {
    courseId: 'course-classical-ml',
    demoId: null,
    draftProvenance: cmlM01DraftProvenance,
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: 'cml-m01-foundations',
    passingScorePercent: 100,
    postId: 'cml-p02-train-test-metrics',
    questionCount: 3,
    quizId: 'quiz-post-cml-p02',
    quizKind: 'post',
    quizRevisionId: 'quiz-post-cml-p02-rev-r1',
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: 'cml-p02-train-test-metrics', type: 'post' }],
    questions: [
      {
        correctAnswer: 'opt-heldout-evidence',
        explanation: {
          en: 'The model did not use held-out labels during fitting, so those rows provide evidence about behavior on new examples.',
          vi: 'Mô hình không dùng nhãn giữ lại khi khớp, nên các dòng đó cung cấp bằng chứng về hành vi trên ví dụ mới.',
        },
        hints: [
          {
            en: 'Separate the rows used to learn from the rows used to support a claim.',
            vi: 'Tách các dòng dùng để học khỏi các dòng dùng để hỗ trợ một khẳng định.',
          },
          {
            en: 'A test row must remain untouched until evaluation.',
            vi: 'Dòng test phải được giữ nguyên cho tới khi đánh giá.',
          },
        ],
        options: [
          {
            optionId: 'opt-heldout-evidence',
            text: {
              en: 'To test behavior on examples not used for fitting',
              vi: 'Để kiểm tra hành vi trên ví dụ không dùng để khớp',
            },
          },
          {
            optionId: 'opt-repeat-training',
            text: {
              en: 'To give the model another copy of training labels',
              vi: 'Để cho mô hình thêm một bản sao nhãn train',
            },
          },
          {
            optionId: 'opt-name-features',
            text: {
              en: 'To rename feature columns after fitting',
              vi: 'Để đổi tên cột feature sau khi khớp',
            },
          },
        ],
        prompt: {
          en: 'Why should a test split remain held out while a model is fitted?',
          vi: 'Vì sao một phần test phải được giữ lại khi mô hình được khớp?',
        },
        questionId: 'q-cml-p02-heldout-purpose',
        sourceId: 'act-cml-p02-train-test-metrics-quiz-01',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-error-consequence', 'opt-error-types'],
        explanation: {
          en: 'A decision-aware evaluation states which error has the larger consequence and keeps false positives and false negatives visible instead of hiding them in one score.',
          vi: 'Đánh giá theo quyết định nêu rõ lỗi nào có hậu quả lớn hơn và giữ dương tính giả cùng âm tính giả hiển thị thay vì che chúng trong một điểm số.',
        },
        hints: [
          {
            en: 'Choose checks about consequences, not a score alone.',
            vi: 'Chọn các kiểm tra về hậu quả, không chỉ một điểm số.',
          },
          {
            en: 'The same accuracy can conceal different error patterns.',
            vi: 'Cùng accuracy có thể che các mẫu lỗi khác nhau.',
          },
        ],
        options: [
          {
            optionId: 'opt-error-consequence',
            text: {
              en: 'State which missed or unnecessary action is more costly',
              vi: 'Nêu hành động bỏ sót hoặc không cần thiết nào tốn kém hơn',
            },
          },
          {
            optionId: 'opt-error-types',
            text: {
              en: 'Inspect false positives and false negatives separately',
              vi: 'Xem riêng dương tính giả và âm tính giả',
            },
          },
          {
            optionId: 'opt-high-train-only',
            text: {
              en: 'Prefer the model with the highest training score alone',
              vi: 'Chỉ ưu tiên mô hình có điểm train cao nhất',
            },
          },
          {
            optionId: 'opt-hide-counts',
            text: {
              en: 'Hide the outcome counts once accuracy is computed',
              vi: 'Ẩn các số đếm kết quả sau khi tính accuracy',
            },
          },
        ],
        prompt: {
          en: 'Which two practices make a classification metric discussion match the decision?',
          vi: 'Hai thực hành nào làm thảo luận metric phân loại khớp với quyết định?',
        },
        questionId: 'q-cml-p02-metric-consequences',
        sourceId: 'act-cml-p02-train-test-metrics-quiz-02',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'false',
        explanation: {
          en: 'A high training score only reports fit to rows the model already saw. Held-out evidence is needed before claiming behavior on new examples.',
          vi: 'Điểm train cao chỉ báo cáo độ khớp với các dòng mô hình đã thấy. Cần bằng chứng giữ lại trước khi khẳng định hành vi trên ví dụ mới.',
        },
        hints: [
          {
            en: 'Ask whether the model had access to the rows being scored.',
            vi: 'Hãy hỏi mô hình có được truy cập các dòng đang được chấm hay không.',
          },
          {
            en: 'Training fit and held-out evidence answer different questions.',
            vi: 'Độ khớp train và bằng chứng giữ lại trả lời các câu hỏi khác nhau.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: a high training score alone proves that a model will work well on new rows.',
          vi: 'Đúng hay sai: chỉ điểm train cao chứng minh mô hình sẽ hoạt động tốt trên dòng mới.',
        },
        questionId: 'q-cml-p02-training-score-not-proof',
        sourceId: 'act-cml-p02-train-test-metrics-quiz-03',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'true-false',
      },
    ],
  },
  'quiz-module-cml-m01': {
    courseId: 'course-classical-ml',
    demoId: null,
    draftProvenance: cmlM01DraftProvenance,
    mastery: {
      en: 'Score at least 70% to complete the module.',
      vi: 'Đạt ít nhất 70% để hoàn thành module.',
    },
    moduleId: 'cml-m01-foundations',
    passingScorePercent: 70,
    postId: null,
    questionCount: 6,
    quizId: 'quiz-module-cml-m01',
    quizKind: 'module',
    quizRevisionId: 'quiz-module-cml-m01-rev-r1',
    requiredCorrectCount: null,
    unlocksOnPass: [],
    questions: [
      {
        correctAnswer: 'opt-known-outcome',
        explanation: {
          en: 'A label is the known outcome attached to a historical supervised example. Features are the observations used to estimate that outcome.',
          vi: 'Nhãn là kết quả đã biết gắn với ví dụ lịch sử có giám sát. Feature là quan sát dùng để ước lượng kết quả đó.',
        },
        hints: [
          {
            en: 'Look for the answer the model is expected to estimate.',
            vi: 'Hãy tìm đáp án mà mô hình được kỳ vọng ước lượng.',
          },
          {
            en: 'A label is not simply any column in the table.',
            vi: 'Nhãn không chỉ là một cột bất kỳ trong bảng.',
          },
        ],
        options: [
          {
            optionId: 'opt-known-outcome',
            text: { en: 'The known historical outcome', vi: 'Kết quả lịch sử đã biết' },
          },
          {
            optionId: 'opt-all-columns',
            text: {
              en: 'Every observed column including the outcome',
              vi: 'Mọi cột quan sát gồm cả kết quả',
            },
          },
          {
            optionId: 'opt-future-event',
            text: {
              en: 'A value available only after the decision',
              vi: 'Giá trị chỉ có sau quyết định',
            },
          },
        ],
        prompt: {
          en: 'What is a label in a supervised dataset?',
          vi: 'Nhãn trong dữ liệu có giám sát là gì?',
        },
        questionId: 'q-cml-m01-known-outcome',
        sourceId: 'quiz-module-cml-m01-q01',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-paired-answers', 'opt-check-against-label'],
        explanation: {
          en: 'Supervised learning uses input rows paired with known outcomes and can compare a prediction with the corresponding label.',
          vi: 'Học có giám sát dùng các dòng đầu vào ghép với kết quả đã biết và có thể so sánh dự đoán với nhãn tương ứng.',
        },
        hints: [
          {
            en: 'Choose the properties that require a supplied answer.',
            vi: 'Chọn các đặc tính đòi hỏi một đáp án được cung cấp.',
          },
          {
            en: 'Grouping without labels is a different task.',
            vi: 'Gom nhóm không nhãn là một nhiệm vụ khác.',
          },
        ],
        options: [
          {
            optionId: 'opt-paired-answers',
            text: {
              en: 'Input rows are paired with known outcomes',
              vi: 'Các dòng đầu vào được ghép với kết quả đã biết',
            },
          },
          {
            optionId: 'opt-check-against-label',
            text: {
              en: 'A prediction can be checked against its label',
              vi: 'Dự đoán có thể được kiểm tra với nhãn của nó',
            },
          },
          {
            optionId: 'opt-only-unlabeled',
            text: {
              en: 'Every row must have no supplied outcome',
              vi: 'Mọi dòng phải không có kết quả được cung cấp',
            },
          },
          {
            optionId: 'opt-no-output',
            text: {
              en: 'The task has no output to estimate',
              vi: 'Nhiệm vụ không có đầu ra để ước lượng',
            },
          },
        ],
        prompt: {
          en: 'Which two statements describe supervised learning data?',
          vi: 'Hai phát biểu nào mô tả dữ liệu học có giám sát?',
        },
        questionId: 'q-cml-m01-supervised-data',
        sourceId: 'quiz-module-cml-m01-q02',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'Clustering can explore unlabeled records by grouping them according to patterns in the observed inputs.',
          vi: 'Clustering có thể khám phá các bản ghi không nhãn bằng cách gom chúng theo mẫu trong đầu vào quan sát được.',
        },
        hints: [
          {
            en: 'No predefined output is supplied in the grouping case.',
            vi: 'Không có đầu ra xác định trước được cung cấp trong trường hợp gom nhóm.',
          },
          {
            en: 'The goal is to discover a grouping, not to predict an attached answer.',
            vi: 'Mục tiêu là khám phá một cách gom nhóm, không dự đoán đáp án đã gắn.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: clustering can start with unlabeled input records.',
          vi: 'Đúng hay sai: clustering có thể bắt đầu với các bản ghi đầu vào không nhãn.',
        },
        questionId: 'q-cml-m01-unlabeled-clustering',
        sourceId: 'quiz-module-cml-m01-q03',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'true-false',
      },
      {
        correctAnswer: 'opt-generalisation-evidence',
        explanation: {
          en: 'Because test labels were not used to fit the model, comparing predictions on those rows supports a claim about new examples.',
          vi: 'Vì nhãn test không được dùng để khớp mô hình, so sánh dự đoán trên các dòng đó hỗ trợ một khẳng định về ví dụ mới.',
        },
        hints: [
          {
            en: 'Think about which rows the model did not use while learning.',
            vi: 'Hãy nghĩ đến các dòng mô hình không dùng khi học.',
          },
          {
            en: 'Held-out evidence checks a different question from training fit.',
            vi: 'Bằng chứng giữ lại kiểm tra một câu hỏi khác với độ khớp train.',
          },
        ],
        options: [
          {
            optionId: 'opt-generalisation-evidence',
            text: {
              en: 'It provides evidence about behavior on new examples',
              vi: 'Nó cung cấp bằng chứng về hành vi trên ví dụ mới',
            },
          },
          {
            optionId: 'opt-more-fitting',
            text: {
              en: 'It lets the model fit the same labels one more time',
              vi: 'Nó cho mô hình khớp cùng nhãn thêm một lần',
            },
          },
          {
            optionId: 'opt-hide-errors',
            text: {
              en: 'It removes the need to inspect error types',
              vi: 'Nó loại bỏ nhu cầu xem loại lỗi',
            },
          },
        ],
        prompt: {
          en: 'What is the main purpose of a held-out test set?',
          vi: 'Mục đích chính của tập test giữ lại là gì?',
        },
        questionId: 'q-cml-m01-test-purpose',
        sourceId: 'quiz-module-cml-m01-q04',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-false-positive-cost', 'opt-false-negative-cost'],
        explanation: {
          en: 'Metric choice should expose the costly error. The team must discuss both unnecessary actions and missed actions before selecting what to emphasize.',
          vi: 'Chọn metric phải phơi bày lỗi tốn kém. Nhóm phải thảo luận cả hành động không cần thiết và hành động bị bỏ sót trước khi chọn điều cần nhấn mạnh.',
        },
        hints: [
          {
            en: 'Choose the consequences that a single accuracy score can hide.',
            vi: 'Chọn các hậu quả mà một điểm accuracy có thể che giấu.',
          },
          {
            en: 'Both kinds of wrong action belong in the decision discussion.',
            vi: 'Cả hai loại hành động sai đều thuộc phần thảo luận quyết định.',
          },
        ],
        options: [
          {
            optionId: 'opt-false-positive-cost',
            text: {
              en: 'The cost of an unnecessary positive action',
              vi: 'Chi phí của một hành động dương tính không cần thiết',
            },
          },
          {
            optionId: 'opt-false-negative-cost',
            text: {
              en: 'The cost of missing a needed positive action',
              vi: 'Chi phí của việc bỏ sót hành động dương tính cần thiết',
            },
          },
          {
            optionId: 'opt-column-order',
            text: {
              en: 'The alphabetical order of feature columns',
              vi: 'Thứ tự chữ cái của cột feature',
            },
          },
          {
            optionId: 'opt-model-name',
            text: { en: 'The name of the algorithm alone', vi: 'Chỉ tên của thuật toán' },
          },
        ],
        prompt: {
          en: 'Which two consequences should guide a classification metric discussion?',
          vi: 'Hai hậu quả nào nên định hướng thảo luận metric phân loại?',
        },
        questionId: 'q-cml-m01-error-consequences',
        sourceId: 'quiz-module-cml-m01-q05',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'opt-eighty-five-percent',
        explanation: {
          en: 'The fixed table has 8 true positives and 9 true negatives, so 17 of 20 decisions are correct: 85%.',
          vi: 'Bảng cố định có 8 dương tính đúng và 9 âm tính đúng, nên 17 trong 20 quyết định là đúng: 85%.',
        },
        hints: [
          {
            en: 'Add the two correct outcome counts before dividing by all rows.',
            vi: 'Cộng hai số đếm kết quả đúng trước khi chia cho mọi dòng.',
          },
          {
            en: 'True positives and true negatives are the correct cases.',
            vi: 'Dương tính đúng và âm tính đúng là các ca đúng.',
          },
        ],
        options: [
          { optionId: 'opt-eighty-five-percent', text: { en: '85%', vi: '85%' } },
          { optionId: 'opt-forty-percent', text: { en: '40%', vi: '40%' } },
          { optionId: 'opt-ninety-percent', text: { en: '90%', vi: '90%' } },
        ],
        prompt: {
          en: 'A fixed table has 8 true positives, 2 false positives, 1 false negative, and 9 true negatives. What is its accuracy?',
          vi: 'Một bảng cố định có 8 dương tính đúng, 2 dương tính giả, 1 âm tính giả và 9 âm tính đúng. Accuracy là bao nhiêu?',
        },
        questionId: 'q-cml-m01-fixed-accuracy',
        sourceId: 'quiz-module-cml-m01-q06',
        sourceIds: CML_M01_SOURCE_IDS,
        type: 'single-choice',
      },
    ],
  },
  'quiz-post-cml-p03': {
    courseId: 'course-classical-ml',
    demoId: null,
    draftProvenance: cmlM02DraftProvenance,
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: 'cml-m02-linear-polynomial',
    passingScorePercent: 100,
    postId: 'cml-p03-linear-regression',
    questionCount: 3,
    quizId: 'quiz-post-cml-p03',
    quizKind: 'post',
    quizRevisionId: 'quiz-post-cml-p03-rev-r1',
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: 'cml-p03-linear-regression', type: 'post' }],
    questions: [
      {
        correctAnswer: 'opt-observed-minus-predicted',
        explanation: {
          en: 'A residual compares the observed target with the line prediction for the same input. It records the vertical miss for that row.',
          vi: 'Phần dư so sánh mục tiêu quan sát với dự đoán đường tại cùng đầu vào. Nó ghi sai lệch theo phương đứng của dòng đó.',
        },
        hints: [
          {
            en: 'Use the same input for both values.',
            vi: 'Dùng cùng một đầu vào cho cả hai giá trị.',
          },
          {
            en: 'The residual is about a gap, not the slope alone.',
            vi: 'Phần dư nói về khoảng cách, không chỉ độ dốc.',
          },
        ],
        options: [
          {
            optionId: 'opt-observed-minus-predicted',
            text: {
              en: 'The gap between the observed target and predicted value',
              vi: 'Khoảng cách giữa mục tiêu quan sát và giá trị dự đoán',
            },
          },
          {
            optionId: 'opt-input-only',
            text: {
              en: 'The input value without an output',
              vi: 'Giá trị đầu vào không có đầu ra',
            },
          },
          {
            optionId: 'opt-intercept-only',
            text: {
              en: 'The intercept without a row comparison',
              vi: 'Hệ số chặn không có so sánh dòng',
            },
          },
        ],
        prompt: {
          en: 'What does a residual describe for one regression row?',
          vi: 'Phần dư mô tả gì cho một dòng hồi quy?',
        },
        questionId: 'q-cml-p03-residual-gap',
        sourceId: 'act-cml-p03-linear-regression-quiz-01',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-square-gaps', 'opt-emphasise-large-miss'],
        explanation: {
          en: 'Least squares sums squared residuals. Squaring stops opposite signs from cancelling and makes a larger miss contribute more than a smaller one.',
          vi: 'Least squares cộng các phần dư bình phương. Bình phương ngăn dấu đối nhau triệt tiêu và khiến sai lệch lớn đóng góp nhiều hơn sai lệch nhỏ.',
        },
        hints: [
          {
            en: 'Choose the effects of squaring the residuals.',
            vi: 'Chọn các tác động của việc bình phương phần dư.',
          },
          {
            en: 'The rule cares about the total error, not one signed sum.',
            vi: 'Quy tắc quan tâm đến tổng lỗi, không phải một tổng có dấu.',
          },
        ],
        options: [
          {
            optionId: 'opt-square-gaps',
            text: {
              en: 'Square the residual gaps before adding them',
              vi: 'Bình phương các khoảng cách phần dư trước khi cộng',
            },
          },
          {
            optionId: 'opt-emphasise-large-miss',
            text: {
              en: 'Give a larger miss more influence than a small miss',
              vi: 'Cho sai lệch lớn ảnh hưởng nhiều hơn sai lệch nhỏ',
            },
          },
          {
            optionId: 'opt-cancel-signs',
            text: {
              en: 'Let positive and negative gaps cancel exactly',
              vi: 'Để khoảng cách dương và âm triệt tiêu chính xác',
            },
          },
          {
            optionId: 'opt-ignore-target',
            text: {
              en: 'Ignore the observed target once a line is drawn',
              vi: 'Bỏ qua mục tiêu quan sát sau khi vẽ đường',
            },
          },
        ],
        prompt: {
          en: 'Which two statements describe why least squares uses squared residuals?',
          vi: 'Hai phát biểu nào mô tả vì sao least squares dùng phần dư bình phương?',
        },
        questionId: 'q-cml-p03-least-squares-effects',
        sourceId: 'act-cml-p03-linear-regression-quiz-02',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'A test split is held out so the fitted line can be evaluated on target values it did not use while learning its coefficients.',
          vi: 'Phần test được giữ lại để đường đã khớp có thể được đánh giá trên mục tiêu nó không dùng khi học hệ số.',
        },
        hints: [
          {
            en: 'Separate fitting evidence from evaluation evidence.',
            vi: 'Tách bằng chứng khớp khỏi bằng chứng đánh giá.',
          },
          {
            en: 'Held-out rows answer a new-example question.',
            vi: 'Dòng giữ lại trả lời câu hỏi về ví dụ mới.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: a test split helps evaluate a fitted line on targets not used to fit its coefficients.',
          vi: 'Đúng hay sai: phần test giúp đánh giá đường đã khớp trên mục tiêu không dùng để khớp hệ số.',
        },
        questionId: 'q-cml-p03-heldout-line',
        sourceId: 'act-cml-p03-linear-regression-quiz-03',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'true-false',
      },
    ],
  },
  'quiz-post-cml-p04': {
    courseId: 'course-classical-ml',
    demoId: null,
    draftProvenance: cmlM02DraftProvenance,
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: 'cml-m02-linear-polynomial',
    passingScorePercent: 100,
    postId: 'cml-p04-polynomial-regression',
    questionCount: 3,
    quizId: 'quiz-post-cml-p04',
    quizKind: 'post',
    quizRevisionId: 'quiz-post-cml-p04-rev-r1',
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: 'cml-p04-polynomial-regression', type: 'post' }],
    questions: [
      {
        correctAnswer: 'opt-squared-input',
        explanation: {
          en: 'For one input, degree-two polynomial features include the original input and its square, enabling a parabolic relationship.',
          vi: 'Với một đầu vào, feature đa thức bậc hai gồm đầu vào gốc và bình phương của nó, cho phép quan hệ parabol.',
        },
        hints: [
          { en: 'Think of the extra term added beyond x.', vi: 'Hãy nghĩ đến hạng thêm ngoài x.' },
          { en: 'Degree two introduces a square.', vi: 'Bậc hai đưa vào bình phương.' },
        ],
        options: [
          {
            optionId: 'opt-squared-input',
            text: { en: 'A squared input feature x²', vi: 'Feature đầu vào bình phương x²' },
          },
          {
            optionId: 'opt-random-label',
            text: { en: 'A random replacement label', vi: 'Nhãn thay thế ngẫu nhiên' },
          },
          {
            optionId: 'opt-test-answer',
            text: { en: 'The held-out target as a feature', vi: 'Mục tiêu giữ lại làm feature' },
          },
        ],
        prompt: {
          en: 'With one input x, what does a degree-two polynomial representation add?',
          vi: 'Với một đầu vào x, biểu diễn đa thức bậc hai thêm gì?',
        },
        questionId: 'q-cml-p04-degree-two-feature',
        sourceId: 'act-cml-p04-polynomial-regression-quiz-01',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-same-split', 'opt-heldout-error'],
        explanation: {
          en: 'A fair comparison keeps the held-out rows the same and compares the resulting error. Changing both the representation and the evidence would not isolate the effect of curvature.',
          vi: 'So sánh công bằng giữ các dòng giữ lại giống nhau và so sánh lỗi kết quả. Đổi cả biểu diễn lẫn bằng chứng sẽ không cô lập được tác động của độ cong.',
        },
        hints: [
          {
            en: 'Keep the evidence constant while changing the candidate model.',
            vi: 'Giữ bằng chứng không đổi khi thay mô hình ứng viên.',
          },
          {
            en: 'A lower degree or higher degree must face the same test question.',
            vi: 'Bậc thấp hay cao phải đối mặt cùng câu hỏi test.',
          },
        ],
        options: [
          {
            optionId: 'opt-same-split',
            text: {
              en: 'Use the same held-out split for both candidates',
              vi: 'Dùng cùng phần giữ lại cho cả hai ứng viên',
            },
          },
          {
            optionId: 'opt-heldout-error',
            text: {
              en: 'Compare error on the held-out rows',
              vi: 'So sánh lỗi trên các dòng giữ lại',
            },
          },
          {
            optionId: 'opt-highest-degree',
            text: {
              en: 'Choose the highest degree before seeing evidence',
              vi: 'Chọn bậc cao nhất trước khi xem bằng chứng',
            },
          },
          {
            optionId: 'opt-train-only',
            text: {
              en: 'Use only the training fit to decide',
              vi: 'Chỉ dùng độ khớp train để quyết định',
            },
          },
        ],
        prompt: {
          en: 'Which two practices make a linear-versus-polynomial comparison defensible?',
          vi: 'Hai thực hành nào làm so sánh tuyến tính với đa thức có cơ sở?',
        },
        questionId: 'q-cml-p04-heldout-comparison',
        sourceId: 'act-cml-p04-polynomial-regression-quiz-02',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'false',
        explanation: {
          en: 'A higher degree gives a more flexible candidate, not a guaranteed improvement. It still needs held-out evidence that the added shape helps the decision.',
          vi: 'Bậc cao hơn tạo ứng viên linh hoạt hơn, không phải cải thiện được bảo đảm. Nó vẫn cần bằng chứng giữ lại rằng hình dạng thêm giúp quyết định.',
        },
        hints: [
          {
            en: 'More flexibility can follow noise as well as signal.',
            vi: 'Linh hoạt hơn có thể bám nhiễu cũng như tín hiệu.',
          },
          {
            en: 'Evidence, not degree alone, decides.',
            vi: 'Bằng chứng, không chỉ bậc, quyết định.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: raising polynomial degree always produces the better model.',
          vi: 'Đúng hay sai: tăng bậc đa thức luôn tạo mô hình tốt hơn.',
        },
        questionId: 'q-cml-p04-degree-not-guarantee',
        sourceId: 'act-cml-p04-polynomial-regression-quiz-03',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'true-false',
      },
    ],
  },
  'quiz-module-cml-m02': {
    courseId: 'course-classical-ml',
    demoId: 'demo-linear-calibration',
    draftProvenance: cmlM02DraftProvenance,
    mastery: {
      en: 'Score at least 70% to complete the module.',
      vi: 'Đạt ít nhất 70% để hoàn thành module.',
    },
    moduleId: 'cml-m02-linear-polynomial',
    passingScorePercent: 70,
    postId: null,
    questionCount: 6,
    quizId: 'quiz-module-cml-m02',
    quizKind: 'module',
    quizRevisionId: 'quiz-module-cml-m02-rev-r1',
    requiredCorrectCount: null,
    unlocksOnPass: [
      { id: 'linear-regression', type: 'algorithm' },
      { id: 'polynomial-regression', type: 'algorithm' },
    ],
    questions: [
      {
        correctAnswer: 'opt-numerical-estimate',
        explanation: {
          en: 'Regression estimates a numerical target such as price, wait time, or a sensor reading.',
          vi: 'Hồi quy ước lượng mục tiêu số như giá, thời gian chờ hoặc số đọc cảm biến.',
        },
        hints: [
          {
            en: 'Look at the output type, not the algorithm name.',
            vi: 'Hãy nhìn kiểu đầu ra, không phải tên thuật toán.',
          },
          { en: 'A line predicts a quantity.', vi: 'Đường thẳng dự đoán một đại lượng.' },
        ],
        options: [
          {
            optionId: 'opt-numerical-estimate',
            text: { en: 'Estimate a numerical value', vi: 'Ước lượng một giá trị số' },
          },
          {
            optionId: 'opt-named-class',
            text: { en: 'Choose one named category only', vi: 'Chỉ chọn một danh mục có tên' },
          },
          {
            optionId: 'opt-unlabeled-group',
            text: { en: 'Discover unlabeled groups only', vi: 'Chỉ khám phá nhóm không nhãn' },
          },
        ],
        prompt: {
          en: 'What kind of target is linear regression designed to estimate?',
          vi: 'Hồi quy tuyến tính được thiết kế để ước lượng loại mục tiêu nào?',
        },
        questionId: 'q-cml-m02-numerical-target',
        sourceId: 'quiz-module-cml-m02-q01',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'For one row, the residual compares the observed target with its prediction, so it tells both direction and size of that row’s miss.',
          vi: 'Với một dòng, phần dư so sánh mục tiêu quan sát với dự đoán của nó, nên nó cho biết cả hướng lẫn độ lớn sai lệch của dòng đó.',
        },
        hints: [
          {
            en: 'Use the observed and predicted values from the same row.',
            vi: 'Dùng giá trị quan sát và dự đoán từ cùng dòng.',
          },
          { en: 'Residuals are not coefficients.', vi: 'Phần dư không phải hệ số.' },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: a residual compares an observed target with the prediction for that same row.',
          vi: 'Đúng hay sai: phần dư so sánh mục tiêu quan sát với dự đoán cho chính dòng đó.',
        },
        questionId: 'q-cml-m02-residual-row',
        sourceId: 'quiz-module-cml-m02-q02',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'true-false',
      },
      {
        correctAnswer: ['opt-transform-first', 'opt-repeat-transform'],
        explanation: {
          en: 'A polynomial pipeline first expands features, fits regression on that representation, and repeats the same transformation before predicting a held-out row.',
          vi: 'Pipeline đa thức trước hết mở rộng feature, khớp hồi quy trên biểu diễn đó và lặp lại đúng biến đổi trước khi dự đoán dòng giữ lại.',
        },
        hints: [
          {
            en: 'Choose the steps that keep fitting and prediction representations consistent.',
            vi: 'Chọn các bước giữ biểu diễn khớp và dự đoán nhất quán.',
          },
          {
            en: 'The same feature construction must be used again at prediction time.',
            vi: 'Cùng cách tạo feature phải được dùng lại lúc dự đoán.',
          },
        ],
        options: [
          {
            optionId: 'opt-transform-first',
            text: {
              en: 'Create polynomial features before fitting regression',
              vi: 'Tạo feature đa thức trước khi khớp hồi quy',
            },
          },
          {
            optionId: 'opt-repeat-transform',
            text: {
              en: 'Apply the same transformation before prediction',
              vi: 'Áp dụng cùng biến đổi trước khi dự đoán',
            },
          },
          {
            optionId: 'opt-test-label-feature',
            text: {
              en: 'Add held-out labels as a new feature',
              vi: 'Thêm nhãn giữ lại làm feature mới',
            },
          },
          {
            optionId: 'opt-random-degree',
            text: {
              en: 'Choose a random degree for each prediction row',
              vi: 'Chọn bậc ngẫu nhiên cho từng dòng dự đoán',
            },
          },
        ],
        prompt: {
          en: 'Which two steps describe a consistent polynomial regression pipeline?',
          vi: 'Hai bước nào mô tả pipeline hồi quy đa thức nhất quán?',
        },
        questionId: 'q-cml-m02-pipeline-order',
        sourceId: 'quiz-module-cml-m02-q03',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'opt-new-example-evidence',
        explanation: {
          en: 'Held-out rows were not used to choose coefficients, so their error is evidence about behavior on new examples.',
          vi: 'Dòng giữ lại không được dùng để chọn hệ số, nên lỗi của chúng là bằng chứng về hành vi trên ví dụ mới.',
        },
        hints: [
          {
            en: 'Ask whether the model already saw the target while fitting.',
            vi: 'Hãy hỏi mô hình đã thấy mục tiêu khi khớp hay chưa.',
          },
          {
            en: 'Evaluation evidence comes from unused rows.',
            vi: 'Bằng chứng đánh giá đến từ dòng chưa dùng.',
          },
        ],
        options: [
          {
            optionId: 'opt-new-example-evidence',
            text: {
              en: 'Evidence about predictions on new examples',
              vi: 'Bằng chứng về dự đoán trên ví dụ mới',
            },
          },
          {
            optionId: 'opt-second-fit',
            text: {
              en: 'A second opportunity to fit the same coefficients',
              vi: 'Cơ hội thứ hai để khớp cùng hệ số',
            },
          },
          {
            optionId: 'opt-no-residuals',
            text: { en: 'A reason not to inspect residuals', vi: 'Lý do không xem phần dư' },
          },
        ],
        prompt: {
          en: 'What does held-out error provide after a regression model is fitted?',
          vi: 'Lỗi giữ lại cung cấp điều gì sau khi mô hình hồi quy được khớp?',
        },
        questionId: 'q-cml-m02-heldout-error',
        sourceId: 'quiz-module-cml-m02-q04',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-prediction-seven', 'opt-residual-plus-one'],
        explanation: {
          en: 'For y_pred = 2x + 1 at x=3, the prediction is 7. With observed target 8, observed minus predicted is +1.',
          vi: 'Với y_pred = 2x + 1 tại x=3, dự đoán là 7. Với mục tiêu quan sát 8, quan sát trừ dự đoán là +1.',
        },
        hints: [
          {
            en: 'Calculate the fixed line before comparing it with the target.',
            vi: 'Tính đường cố định trước khi so sánh với mục tiêu.',
          },
          {
            en: 'Use observed minus predicted for the displayed residual.',
            vi: 'Dùng quan sát trừ dự đoán cho phần dư được hiển thị.',
          },
        ],
        options: [
          {
            optionId: 'opt-prediction-seven',
            text: { en: 'The prediction is 7', vi: 'Dự đoán là 7' },
          },
          {
            optionId: 'opt-residual-plus-one',
            text: { en: 'The residual is +1', vi: 'Phần dư là +1' },
          },
          {
            optionId: 'opt-prediction-eight',
            text: { en: 'The prediction is 8', vi: 'Dự đoán là 8' },
          },
          {
            optionId: 'opt-residual-negative-one',
            text: { en: 'The residual is -1', vi: 'Phần dư là -1' },
          },
        ],
        prompt: {
          en: 'For the fixed rule y_pred = 2x + 1 at x=3 with observed target 8, which two statements are correct?',
          vi: 'Với quy tắc cố định y_pred = 2x + 1 tại x=3 và mục tiêu quan sát 8, hai phát biểu nào đúng?',
        },
        questionId: 'q-cml-m02-fixed-line-residual',
        sourceId: 'quiz-module-cml-m02-q05',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'opt-not-guaranteed',
        explanation: {
          en: 'Polynomial complexity is a hypothesis to test. It must earn its use through the same held-out evidence, not through degree alone.',
          vi: 'Độ phức tạp đa thức là giả thuyết cần kiểm tra. Nó phải chứng minh giá trị qua cùng bằng chứng giữ lại, không phải chỉ qua bậc.',
        },
        hints: [
          {
            en: 'Do not turn model flexibility into a guarantee.',
            vi: 'Đừng biến tính linh hoạt mô hình thành bảo đảm.',
          },
          { en: 'Use held-out evidence to decide.', vi: 'Dùng bằng chứng giữ lại để quyết định.' },
        ],
        options: [
          {
            optionId: 'opt-not-guaranteed',
            text: {
              en: 'A higher degree still needs held-out evidence',
              vi: 'Bậc cao hơn vẫn cần bằng chứng giữ lại',
            },
          },
          {
            optionId: 'opt-always-best',
            text: { en: 'The highest degree is always best', vi: 'Bậc cao nhất luôn tốt nhất' },
          },
          {
            optionId: 'opt-no-test',
            text: {
              en: 'A curved line removes the need for a test split',
              vi: 'Đường cong loại bỏ nhu cầu phần test',
            },
          },
        ],
        prompt: {
          en: 'Which statement is the sound conclusion when considering a higher polynomial degree?',
          vi: 'Phát biểu nào là kết luận đúng khi cân nhắc bậc đa thức cao hơn?',
        },
        questionId: 'q-cml-m02-complexity-evidence',
        sourceId: 'quiz-module-cml-m02-q06',
        sourceIds: CML_M02_SOURCE_IDS,
        type: 'single-choice',
      },
    ],
  },
  'quiz-post-cml-p05': {
    courseId: 'course-classical-ml',
    demoId: null,
    draftProvenance: cmlM03DraftProvenance,
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: 'cml-m03-ridge-lasso',
    passingScorePercent: 100,
    postId: 'cml-p05-regularization-ridge-lasso',
    questionCount: 3,
    quizId: 'quiz-post-cml-p05',
    quizKind: 'post',
    quizRevisionId: 'quiz-post-cml-p05-rev-r1',
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: 'cml-p05-regularization-ridge-lasso', type: 'post' }],
    questions: [
      {
        correctAnswer: 'opt-more-shrinkage',
        explanation: {
          en: 'For Ridge, alpha controls shrinkage. The pinned guide states that a larger non-negative alpha produces greater shrinkage and makes coefficients more robust to collinearity.',
          vi: 'Với Ridge, alpha điều khiển shrinkage. Hướng dẫn đã pin nêu alpha không âm lớn hơn tạo shrinkage lớn hơn và làm hệ số vững hơn với collinearity.',
        },
        hints: [
          { en: 'Read alpha as penalty strength.', vi: 'Đọc alpha như độ mạnh penalty.' },
          {
            en: 'More penalty changes coefficient size.',
            vi: 'Penalty nhiều hơn thay đổi độ lớn hệ số.',
          },
        ],
        options: [
          {
            optionId: 'opt-more-shrinkage',
            text: {
              en: 'It applies greater coefficient shrinkage',
              vi: 'Nó áp dụng shrinkage hệ số lớn hơn',
            },
          },
          {
            optionId: 'opt-no-penalty',
            text: { en: 'It removes the penalty from Ridge', vi: 'Nó loại penalty khỏi Ridge' },
          },
          {
            optionId: 'opt-change-target',
            text: { en: 'It replaces the target values', vi: 'Nó thay thế các giá trị mục tiêu' },
          },
        ],
        prompt: {
          en: 'What is the direct effect of increasing Ridge alpha in the pinned guide?',
          vi: 'Tác động trực tiếp của việc tăng alpha Ridge trong hướng dẫn đã pin là gì?',
        },
        questionId: 'q-cml-p05-ridge-alpha-shrinkage',
        sourceId: 'act-cml-p05-regularization-ridge-lasso-quiz-01',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-sparse-coefficients', 'opt-exact-zero'],
        explanation: {
          en: 'Lasso estimates sparse coefficients and can set coefficients exactly to zero. Those properties distinguish its L1 penalty from merely inspecting a line fit.',
          vi: 'Lasso ước lượng hệ số thưa và có thể đưa hệ số đúng bằng 0. Các tính chất đó phân biệt penalty L1 của nó với việc chỉ quan sát độ khớp đường thẳng.',
        },
        hints: [
          {
            en: 'Look for the two sparse-model properties.',
            vi: 'Tìm hai tính chất của mô hình thưa.',
          },
          {
            en: 'One property concerns an exact value.',
            vi: 'Một tính chất nói về giá trị chính xác.',
          },
        ],
        options: [
          {
            optionId: 'opt-sparse-coefficients',
            text: { en: 'It estimates sparse coefficients', vi: 'Nó ước lượng hệ số thưa' },
          },
          {
            optionId: 'opt-exact-zero',
            text: {
              en: 'It can set a coefficient exactly to zero',
              vi: 'Nó có thể đưa một hệ số đúng bằng 0',
            },
          },
          {
            optionId: 'opt-only-positive',
            text: { en: 'It forces every coefficient positive', vi: 'Nó buộc mọi hệ số dương' },
          },
          {
            optionId: 'opt-removes-validation',
            text: { en: 'It removes the need for validation', vi: 'Nó loại bỏ nhu cầu validation' },
          },
        ],
        prompt: {
          en: 'Which two statements describe Lasso in the pinned guide?',
          vi: 'Hai phát biểu nào mô tả Lasso trong hướng dẫn đã pin?',
        },
        questionId: 'q-cml-p05-lasso-sparse-zero',
        sourceId: 'act-cml-p05-regularization-ridge-lasso-quiz-02',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'false',
        explanation: {
          en: 'A fixed training comparison is not enough to choose alpha. The lesson uses held-out cross-validation evidence to compare candidate strengths and their trade-offs.',
          vi: 'Một so sánh train cố định không đủ để chọn alpha. Bài học dùng bằng chứng cross-validation giữ lại để so sánh các độ mạnh ứng viên và đánh đổi của chúng.',
        },
        hints: [
          {
            en: 'Separate fitting evidence from selection evidence.',
            vi: 'Tách bằng chứng khớp khỏi bằng chứng chọn.',
          },
          { en: 'Alpha is a model-selection decision.', vi: 'Alpha là quyết định chọn mô hình.' },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: one apparent training fit is sufficient evidence for selecting alpha.',
          vi: 'Đúng hay sai: một độ khớp train có vẻ tốt là bằng chứng đủ để chọn alpha.',
        },
        questionId: 'q-cml-p05-alpha-validation-needed',
        sourceId: 'act-cml-p05-regularization-ridge-lasso-quiz-03',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'true-false',
      },
    ],
  },
  'quiz-module-cml-m03': {
    courseId: 'course-classical-ml',
    demoId: 'demo-regularization-noisy-signal',
    draftProvenance: cmlM03DraftProvenance,
    mastery: {
      en: 'Score at least 70% to complete the module.',
      vi: 'Đạt ít nhất 70% để hoàn thành module.',
    },
    moduleId: 'cml-m03-ridge-lasso',
    passingScorePercent: 70,
    postId: null,
    questionCount: 6,
    quizId: 'quiz-module-cml-m03',
    quizKind: 'module',
    quizRevisionId: 'quiz-module-cml-m03-rev-r1',
    requiredCorrectCount: null,
    unlocksOnPass: [
      { id: 'ridge-regression', type: 'algorithm' },
      { id: 'lasso-regression', type: 'algorithm' },
    ],
    questions: [
      {
        correctAnswer: 'opt-coefficient-penalty',
        explanation: {
          en: 'Regularisation combines prediction error with a penalty on coefficient size. It changes the fitting objective; it does not relabel the data or replace evaluation.',
          vi: 'Regularization kết hợp lỗi dự đoán với penalty trên độ lớn hệ số. Nó đổi mục tiêu khớp; nó không gán nhãn lại dữ liệu hay thay thế đánh giá.',
        },
        hints: [
          {
            en: 'Think about what is added to the objective.',
            vi: 'Hãy nghĩ về điều được thêm vào mục tiêu.',
          },
          { en: 'The added term concerns weights.', vi: 'Hạng thêm liên quan đến trọng số.' },
        ],
        options: [
          {
            optionId: 'opt-coefficient-penalty',
            text: { en: 'A penalty on coefficient size', vi: 'Một penalty trên độ lớn hệ số' },
          },
          {
            optionId: 'opt-new-labels',
            text: { en: 'A new set of target labels', vi: 'Một tập nhãn mục tiêu mới' },
          },
          {
            optionId: 'opt-live-threshold',
            text: { en: 'A live decision threshold', vi: 'Một ngưỡng quyết định live' },
          },
        ],
        prompt: {
          en: 'What is added to the fitting objective by regularisation?',
          vi: 'Regularization thêm gì vào mục tiêu khớp?',
        },
        questionId: 'q-cml-m03-regularization-penalty',
        sourceId: 'quiz-module-cml-m03-q01',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'For Ridge, the pinned guide says larger non-negative alpha means greater shrinkage and coefficients more robust to collinearity.',
          vi: 'Với Ridge, hướng dẫn đã pin nói alpha không âm lớn hơn nghĩa là shrinkage lớn hơn và hệ số vững hơn với collinearity.',
        },
        hints: [
          { en: 'Recall the direction of the alpha effect.', vi: 'Nhớ hướng tác động của alpha.' },
          {
            en: 'The statement names both shrinkage and collinearity.',
            vi: 'Phát biểu nêu cả shrinkage và collinearity.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: increasing a non-negative Ridge alpha increases shrinkage and can improve robustness to collinearity.',
          vi: 'Đúng hay sai: tăng alpha Ridge không âm làm tăng shrinkage và có thể cải thiện độ vững với collinearity.',
        },
        questionId: 'q-cml-m03-ridge-collinearity',
        sourceId: 'quiz-module-cml-m03-q02',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'true-false',
      },
      {
        correctAnswer: 'opt-sparsity-degree',
        explanation: {
          en: 'The Lasso alpha controls the degree of sparsity of the estimated coefficients. It is not an instruction to use the highest value without evaluation.',
          vi: 'Alpha Lasso điều khiển mức độ thưa của các hệ số ước lượng. Nó không phải chỉ dẫn dùng giá trị cao nhất mà không đánh giá.',
        },
        hints: [
          {
            en: 'The source links alpha to a structural property.',
            vi: 'Nguồn liên kết alpha với một tính chất cấu trúc.',
          },
          {
            en: 'Read the Lasso section, not the row target.',
            vi: 'Đọc phần Lasso, không phải mục tiêu dòng.',
          },
        ],
        options: [
          {
            optionId: 'opt-sparsity-degree',
            text: { en: 'The degree of coefficient sparsity', vi: 'Mức độ thưa của hệ số' },
          },
          {
            optionId: 'opt-label-count',
            text: { en: 'The number of target labels', vi: 'Số lượng nhãn mục tiêu' },
          },
          {
            optionId: 'opt-browser-speed',
            text: { en: 'The browser rendering speed', vi: 'Tốc độ render trình duyệt' },
          },
        ],
        prompt: {
          en: 'What does alpha control for Lasso in the pinned guide?',
          vi: 'Alpha điều khiển điều gì cho Lasso trong hướng dẫn đã pin?',
        },
        questionId: 'q-cml-m03-lasso-alpha-sparsity',
        sourceId: 'quiz-module-cml-m03-q03',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-ridge-pair-shrunk', 'opt-lasso-zero-b'],
        explanation: {
          en: 'The fixed teaching comparison displays Ridge values 0.45 and 0.45 for the related pair, and Lasso values 0.90 for A and zero for B. It is an illustration of shrinkage and sparsity, not a live fit.',
          vi: 'So sánh cố định để học hiển thị Ridge 0,45 và 0,45 cho cặp liên quan, cùng Lasso 0,90 cho A và 0 cho B. Đây là minh họa shrinkage và tính thưa, không phải lượt fit live.',
        },
        hints: [
          { en: 'Read the displayed coefficient cards.', vi: 'Đọc các thẻ hệ số hiển thị.' },
          {
            en: 'Choose the two facts, not a claim about training.',
            vi: 'Chọn hai sự kiện, không phải khẳng định về train.',
          },
        ],
        options: [
          {
            optionId: 'opt-ridge-pair-shrunk',
            text: {
              en: 'Ridge displays 0.45 for both related coefficients',
              vi: 'Ridge hiển thị 0,45 cho cả hai hệ số liên quan',
            },
          },
          {
            optionId: 'opt-lasso-zero-b',
            text: {
              en: 'Lasso displays zero for coefficient B',
              vi: 'Lasso hiển thị 0 cho hệ số B',
            },
          },
          {
            optionId: 'opt-live-fit',
            text: {
              en: 'The browser trained these coefficients live',
              vi: 'Trình duyệt đã train các hệ số này live',
            },
          },
          {
            optionId: 'opt-alpha-final',
            text: {
              en: 'Alpha one is final for every dataset',
              vi: 'Alpha một là cuối cùng cho mọi dataset',
            },
          },
        ],
        prompt: {
          en: 'Which two statements accurately read the fixed regularization demo?',
          vi: 'Hai phát biểu nào đọc đúng demo regularization cố định?',
        },
        questionId: 'q-cml-m03-fixed-comparison-reading',
        sourceId: 'quiz-module-cml-m03-q04',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'false',
        explanation: {
          en: 'An exact Lasso zero is a result of the model, representation, data, and alpha. It does not prove that the original feature can never matter in another setting.',
          vi: 'Số 0 chính xác của Lasso là kết quả của mô hình, biểu diễn, dữ liệu và alpha. Nó không chứng minh feature gốc không bao giờ quan trọng trong bối cảnh khác.',
        },
        hints: [
          {
            en: 'Do not turn a fitted coefficient into a universal causal claim.',
            vi: 'Đừng biến hệ số đã khớp thành khẳng định nhân quả phổ quát.',
          },
          {
            en: 'The lesson labels this as a model outcome.',
            vi: 'Bài học gọi đây là kết quả mô hình.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: a Lasso coefficient of zero proves the original feature is never important.',
          vi: 'Đúng hay sai: hệ số Lasso bằng 0 chứng minh feature gốc không bao giờ quan trọng.',
        },
        questionId: 'q-cml-m03-zero-not-universal',
        sourceId: 'quiz-module-cml-m03-q05',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'true-false',
      },
      {
        correctAnswer: ['opt-heldout-folds', 'opt-tradeoff-report'],
        explanation: {
          en: 'Choose alpha by comparing candidate values with held-out validation evidence, then report the relevant trade-off among error, stability, and sparsity. A training-only preference or a universally largest alpha does not supply that evidence.',
          vi: 'Chọn alpha bằng cách so sánh giá trị ứng viên với bằng chứng validation giữ lại, rồi báo cáo đánh đổi liên quan giữa lỗi, độ ổn định và tính thưa. Ưu tiên chỉ từ train hoặc alpha lớn nhất phổ quát không cung cấp bằng chứng đó.',
        },
        hints: [
          {
            en: 'Choose evaluation practices, not a fixed answer.',
            vi: 'Chọn thực hành đánh giá, không phải đáp án cố định.',
          },
          {
            en: 'Model selection needs a comparison and a reported consequence.',
            vi: 'Chọn mô hình cần so sánh và hậu quả được báo cáo.',
          },
        ],
        options: [
          {
            optionId: 'opt-heldout-folds',
            text: {
              en: 'Compare candidate alpha values on held-out folds',
              vi: 'So sánh alpha ứng viên trên các fold giữ lại',
            },
          },
          {
            optionId: 'opt-tradeoff-report',
            text: {
              en: 'Report the error, stability, and sparsity trade-off',
              vi: 'Báo cáo đánh đổi lỗi, độ ổn định và tính thưa',
            },
          },
          {
            optionId: 'opt-largest-alpha',
            text: { en: 'Always choose the largest alpha', vi: 'Luôn chọn alpha lớn nhất' },
          },
          {
            optionId: 'opt-train-only',
            text: { en: 'Choose from one training fit only', vi: 'Chọn chỉ từ một độ khớp train' },
          },
        ],
        prompt: {
          en: 'Which two practices give evidence for selecting a regularization strength?',
          vi: 'Hai thực hành nào cung cấp bằng chứng để chọn độ regularization?',
        },
        questionId: 'q-cml-m03-alpha-selection-evidence',
        sourceId: 'quiz-module-cml-m03-q06',
        sourceIds: CML_M03_SOURCE_IDS,
        type: 'multiple-choice',
      },
    ],
  },
};

function createGeneratedPostQuiz(post: ReleaseLearningPost, module: ReleaseLearningModule) {
  return {
    courseId: module.courseId,
    demoId: null,
    mastery: {
      en: 'Answer all 3 questions correctly to complete this lesson.',
      vi: 'Cần trả lời đúng cả 3 câu để hoàn thành bài.',
    },
    moduleId: module.moduleId,
    passingScorePercent: 100,
    postId: post.postId,
    questionCount: 3,
    questions: [
      {
        correctAnswer: 'opt-core-idea',
        explanation: {
          en: `The lesson focuses on the core modelling idea in "${post.title.en}".`,
          vi: `Bài học tập trung vào ý tưởng mô hình hóa cốt lõi trong "${post.title.vi}".`,
        },
        hints: [
          {
            en: 'Look for the option that names the modelling decision, not an app feature.',
            vi: 'Tìm lựa chọn nêu quyết định mô hình hóa, không phải tính năng ứng dụng.',
          },
          {
            en: 'The correct answer keeps the model idea tied to data and evaluation.',
            vi: 'Đáp án đúng giữ ý tưởng mô hình gắn với dữ liệu và đánh giá.',
          },
        ],
        options: [
          {
            optionId: 'opt-core-idea',
            text: {
              en: 'Connect a model choice to the data pattern being evaluated.',
              vi: 'Gắn lựa chọn mô hình với mẫu dữ liệu đang được đánh giá.',
            },
          },
          {
            optionId: 'opt-secret-key',
            text: {
              en: 'Store the answer key in the browser.',
              vi: 'Lưu đáp án trong trình duyệt.',
            },
          },
          {
            optionId: 'opt-random-ui',
            text: {
              en: 'Change the interface until the metric looks better.',
              vi: 'Đổi giao diện cho đến khi metric trông tốt hơn.',
            },
          },
        ],
        prompt: {
          en: `What is the main learning move in "${post.title.en}"?`,
          vi: `Động tác học chính trong "${post.title.vi}" là gì?`,
        },
        questionId: `q-${post.postId}-core-idea`,
        sourceId: post.activityIds[1]!,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-inputs', 'opt-metric'],
        explanation: {
          en: 'A defensible model run names the input signal and the metric used to judge it.',
          vi: 'Một lần chạy mô hình có thể bảo vệ cần nêu tín hiệu đầu vào và metric đánh giá.',
        },
        hints: [
          {
            en: 'Keep the pieces that make a run inspectable.',
            vi: 'Giữ các phần giúp kiểm tra được một lần chạy.',
          },
          {
            en: 'A model needs evidence from inputs and a metric for judgment.',
            vi: 'Mô hình cần bằng chứng từ đầu vào và một metric để đánh giá.',
          },
        ],
        options: [
          { optionId: 'opt-inputs', text: { en: 'Input features', vi: 'Feature đầu vào' } },
          { optionId: 'opt-metric', text: { en: 'Evaluation metric', vi: 'Metric đánh giá' } },
          { optionId: 'opt-theme', text: { en: 'Theme preference', vi: 'Tùy chọn giao diện' } },
          { optionId: 'opt-password', text: { en: 'User password', vi: 'Mật khẩu người dùng' } },
        ],
        prompt: {
          en: 'Which two pieces should be checked before trusting the model result?',
          vi: 'Hai phần nào cần kiểm tra trước khi tin kết quả mô hình?',
        },
        questionId: `q-${post.postId}-evidence`,
        sourceId: post.activityIds[2]!,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en:
            'The course separates lesson examples, fixed demos and Playground tasks so progress ' +
            'does not depend on repeating the exact same task.',
          vi:
            'Khóa học tách ví dụ bài học, demo cố định và nhiệm vụ Playground để tiến độ ' +
            'không phụ thuộc vào việc lặp đúng cùng một nhiệm vụ.',
        },
        hints: [
          {
            en: 'Compare lesson practice with the later Playground scenario.',
            vi: 'So sánh hoạt động trong bài với scenario Playground sau đó.',
          },
          {
            en: 'The same idea can appear, but the exact task should differ.',
            vi: 'Cùng ý tưởng có thể xuất hiện, nhưng nhiệm vụ cụ thể nên khác.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: lesson practice should not duplicate the exact Playground task.',
          vi: 'Đúng hay sai: luyện tập trong bài không nên lặp đúng nhiệm vụ Playground.',
        },
        questionId: `q-${post.postId}-task-boundary`,
        sourceId: post.activityIds[3]!,
        type: 'true-false',
      },
    ],
    quizId: post.postQuizId,
    quizKind: 'post',
    quizRevisionId: `${post.postQuizId}-rev-r1`,
    requiredCorrectCount: 3,
    unlocksOnPass: [{ id: post.postId, type: 'post' }],
  } as const satisfies QuizManifest;
}

interface PostQuizDraftDefinition {
  coreMove: LocalizedText;
  trueAssertion: LocalizedText;
}

const postQuizDraftDefinitions: Readonly<Record<string, PostQuizDraftDefinition>> = {
  'cml-p06-logistic-regression': {
    coreMove: {
      en: 'Read a probability estimate before deciding which threshold should trigger an action.',
      vi: 'Đọc ước lượng xác suất trước khi quyết định ngưỡng nào kích hoạt hành động.',
    },
    trueAssertion: {
      en: 'The same probability can lead to different actions when the cost of a false negative changes.',
      vi: 'Cùng một xác suất có thể dẫn đến hành động khác khi chi phí âm tính giả thay đổi.',
    },
  },
  'cml-p07-classification-metrics': {
    coreMove: {
      en: 'Choose a classification metric from the false-positive and false-negative trade-off.',
      vi: 'Chọn metric phân loại từ đánh đổi giữa dương tính giả và âm tính giả.',
    },
    trueAssertion: {
      en: 'Accuracy can hide an important error type when classes or error costs are uneven.',
      vi: 'Accuracy có thể che giấu loại lỗi quan trọng khi lớp hoặc chi phí lỗi không cân bằng.',
    },
  },
  'cml-p08-knn': {
    coreMove: {
      en: 'Make distance meaningful by scaling features before trusting nearby examples.',
      vi: 'Làm khoảng cách có ý nghĩa bằng cách chuẩn hóa feature trước khi tin ví dụ lân cận.',
    },
    trueAssertion: {
      en: 'A feature with a much larger numeric range can dominate a KNN distance unless the representation is scaled.',
      vi: 'Feature có thang số lớn hơn nhiều có thể chi phối khoảng cách KNN nếu biểu diễn chưa được chuẩn hóa.',
    },
  },
  'cml-p09-naive-bayes': {
    coreMove: {
      en: 'Combine prior belief with observed feature evidence while keeping the independence assumption visible.',
      vi: 'Kết hợp niềm tin ban đầu với bằng chứng feature quan sát được và giữ rõ giả định độc lập.',
    },
    trueAssertion: {
      en: 'Naive Bayes can update a class belief from several features without claiming that the features are truly independent.',
      vi: 'Naive Bayes có thể cập nhật niềm tin về lớp từ nhiều feature mà không khẳng định các feature thực sự độc lập.',
    },
  },
  'cml-p10-decision-tree': {
    coreMove: {
      en: 'Read each tree split as an explicit rule that reduces label mixing.',
      vi: 'Đọc mỗi split của cây như quy tắc rõ ràng làm giảm sự lẫn lộn của nhãn.',
    },
    trueAssertion: {
      en: 'A useful split makes the labels in its child groups more consistent than before the split.',
      vi: 'Split hữu ích làm nhãn trong các nhóm con nhất quán hơn so với trước khi chia.',
    },
  },
  'cml-p11-random-forest': {
    coreMove: {
      en: 'Combine diverse trees so one brittle split has less influence on the final vote.',
      vi: 'Kết hợp các cây đa dạng để một split mong manh có ít ảnh hưởng hơn lên phiếu cuối.',
    },
    trueAssertion: {
      en: 'Bootstrap samples and feature subsets help forest trees avoid making the same error for the same reason.',
      vi: 'Mẫu bootstrap và tập con feature giúp các cây trong forest tránh cùng mắc một lỗi vì cùng lý do.',
    },
  },
  'cml-p12-svm': {
    coreMove: {
      en: 'Prefer a separating boundary with margin and identify the nearest support points.',
      vi: 'Ưu tiên ranh giới phân tách có margin và xác định các support point gần nhất.',
    },
    trueAssertion: {
      en: 'Support vectors matter because moving them changes the margin-constrained boundary.',
      vi: 'Support vector quan trọng vì di chuyển chúng làm thay đổi ranh giới bị ràng buộc bởi margin.',
    },
  },
  'cml-p13-kmeans': {
    coreMove: {
      en: 'Explain the K-Means loop as assignment to centres followed by centre updates.',
      vi: 'Giải thích vòng lặp K-Means là gán vào tâm rồi cập nhật tâm.',
    },
    trueAssertion: {
      en: 'Changing k changes the grouping question being asked, not just the label names shown at the end.',
      vi: 'Thay đổi k làm thay đổi câu hỏi gom nhóm, không chỉ đổi tên nhãn hiển thị ở cuối.',
    },
  },
  'cml-p14-hierarchical-clustering': {
    coreMove: {
      en: 'Read merge heights before choosing the dendrogram cut that defines groups.',
      vi: 'Đọc độ cao gộp trước khi chọn mức cắt dendrogram xác định các nhóm.',
    },
    trueAssertion: {
      en: 'A large late merge can be evidence that two groups stayed distinct until a high cut level.',
      vi: 'Lần gộp muộn lớn có thể là bằng chứng hai nhóm vẫn khác biệt cho tới mức cắt cao.',
    },
  },
  'cml-p15-pca': {
    coreMove: {
      en: 'Track retained variation and reconstruction loss when reducing correlated features.',
      vi: 'Theo dõi phương sai giữ lại và lỗi tái dựng khi giảm các feature tương quan.',
    },
    trueAssertion: {
      en: 'Keeping fewer principal components can simplify a representation while discarding some reconstructable information.',
      vi: 'Giữ ít component chính hơn có thể đơn giản hóa biểu diễn nhưng loại bỏ một phần thông tin có thể tái dựng.',
    },
  },
};

function getPostQuizDraftDefinition(postId: string): PostQuizDraftDefinition {
  const definition = postQuizDraftDefinitions[postId];

  if (!definition) {
    throw new Error(`Missing post quiz draft definition for ${postId}.`);
  }

  return definition;
}

function createExpandedPostQuiz(post: ReleaseLearningPost, module: ReleaseLearningModule) {
  const genericQuiz = createGeneratedPostQuiz(post, module);
  const definition = getPostQuizDraftDefinition(post.postId);
  const [coreQuestion, evidenceQuestion, boundaryQuestion] = genericQuiz.questions;

  if (!coreQuestion || !evidenceQuestion || !boundaryQuestion) {
    throw new Error(`Post quiz ${post.postQuizId} must contain three generated questions.`);
  }

  return {
    ...genericQuiz,
    questions: [
      {
        ...coreQuestion,
        explanation: {
          en: `The key learning move is: ${definition.coreMove.en}`,
          vi: `Động tác học chính là: ${definition.coreMove.vi}`,
        },
        hints: [
          {
            en: `Focus on the decision described by ${post.title.en}.`,
            vi: `Tập trung vào quyết định được mô tả trong ${post.title.vi}.`,
          },
          {
            en: definition.coreMove.en,
            vi: definition.coreMove.vi,
          },
        ],
        options: [
          { optionId: 'opt-core-idea', text: definition.coreMove },
          ...coreQuestion.options.filter((option) => option.optionId !== 'opt-core-idea'),
        ],
        prompt: {
          en: `Which learning move best supports "${post.title.en}"?`,
          vi: `Động tác học nào phù hợp nhất với "${post.title.vi}"?`,
        },
      },
      {
        ...evidenceQuestion,
        prompt: {
          en: `Which two checks make a decision in "${post.title.en}" defensible?`,
          vi: `Hai kiểm tra nào giúp quyết định trong "${post.title.vi}" có cơ sở?`,
        },
      },
      {
        ...boundaryQuestion,
        explanation: {
          en: definition.trueAssertion.en,
          vi: definition.trueAssertion.vi,
        },
        hints: [
          {
            en: `Recall the cause-and-effect claim in ${post.title.en}.`,
            vi: `Nhớ lại khẳng định nhân quả trong ${post.title.vi}.`,
          },
          {
            en: definition.trueAssertion.en,
            vi: definition.trueAssertion.vi,
          },
        ],
        prompt: {
          en: `True or false: ${definition.trueAssertion.en}`,
          vi: `Đúng hay sai: ${definition.trueAssertion.vi}`,
        },
      },
    ],
  } as const satisfies QuizManifest;
}

function createGeneratedModuleQuiz(module: ReleaseLearningModule) {
  const unlockLabel = module.unlockAlgorithmIds.length
    ? module.unlockAlgorithmIds.join(', ')
    : 'no direct Playground algorithm';
  const unlockCorrectAnswer = module.unlockAlgorithmIds.length
    ? 'opt-algorithm-unlock'
    : 'opt-no-direct-unlock';

  return {
    courseId: module.courseId,
    demoId: module.demoId,
    mastery: {
      en: `Score at least 70% to complete the module and unlock ${unlockLabel}.`,
      vi: `Đạt ít nhất 70% để hoàn thành module và mở khóa ${unlockLabel}.`,
    },
    moduleId: module.moduleId,
    passingScorePercent: 70,
    postId: null,
    questionCount: 6,
    questions: [
      {
        correctAnswer: 'opt-model-purpose',
        explanation: {
          en: `The module "${module.title.en}" ties model behaviour to a specific data decision.`,
          vi: `Module "${module.title.vi}" gắn hành vi mô hình với một quyết định dữ liệu cụ thể.`,
        },
        hints: [
          {
            en: 'Pick the option about modelling behaviour.',
            vi: 'Chọn phương án nói về hành vi mô hình.',
          },
          {
            en: 'Avoid answers about account or presentation state.',
            vi: 'Tránh đáp án về tài khoản hoặc trạng thái trình bày.',
          },
        ],
        options: [
          {
            optionId: 'opt-model-purpose',
            text: {
              en: 'Explain how the model makes or evaluates a data decision.',
              vi: 'Giải thích cách mô hình tạo hoặc đánh giá quyết định trên dữ liệu.',
            },
          },
          {
            optionId: 'opt-profile-only',
            text: {
              en: 'Update the learner profile only.',
              vi: 'Chỉ cập nhật hồ sơ người học.',
            },
          },
          {
            optionId: 'opt-color-only',
            text: {
              en: 'Choose a chart colour without reading the metric.',
              vi: 'Chọn màu biểu đồ mà không đọc metric.',
            },
          },
        ],
        prompt: {
          en: `What should a learner prove after "${module.title.en}"?`,
          vi: `Người học cần chứng minh điều gì sau "${module.title.vi}"?`,
        },
        questionId: `q-${module.moduleId}-purpose`,
        sourceId: `${module.moduleQuizId}-q01`,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-features', 'opt-target-or-metric'],
        explanation: {
          en: 'Features plus a target or metric make the learning task inspectable.',
          vi: 'Feature cùng target hoặc metric giúp nhiệm vụ học có thể kiểm tra.',
        },
        hints: [
          {
            en: 'Look for data and evaluation signals.',
            vi: 'Tìm tín hiệu dữ liệu và đánh giá.',
          },
          {
            en: 'A theme or session ID is not model evidence.',
            vi: 'Theme hoặc session ID không phải bằng chứng mô hình.',
          },
        ],
        options: [
          { optionId: 'opt-features', text: { en: 'Features', vi: 'Feature' } },
          {
            optionId: 'opt-target-or-metric',
            text: { en: 'Target or metric', vi: 'Target hoặc metric' },
          },
          { optionId: 'opt-theme', text: { en: 'Theme', vi: 'Theme' } },
          { optionId: 'opt-session', text: { en: 'Session id', vi: 'Session id' } },
        ],
        prompt: {
          en: 'Which two signals make a module result defensible?',
          vi: 'Hai tín hiệu nào giúp kết quả module có thể bảo vệ?',
        },
        questionId: `q-${module.moduleId}-signals`,
        sourceId: `${module.moduleQuizId}-q02`,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: module.demoId
            ? 'The fixed demo must be completed before the module quiz can complete the module.'
            : 'This module has no fixed demo, so post mastery and the module quiz are sufficient.',
          vi: module.demoId
            ? 'Demo cố định phải hoàn thành trước khi quiz module có thể hoàn tất module.'
            : 'Module này không có demo cố định, nên mastery post và quiz module là đủ.',
        },
        hints: [
          {
            en: 'Check whether the skeleton gives this module a demo id.',
            vi: 'Kiểm tra skeleton có gán demo id cho module này không.',
          },
          {
            en: 'The backend enforces the demo only when a fixed demo exists.',
            vi: 'Backend chỉ bắt buộc demo khi có demo cố định.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: module completion must follow the fixed module requirements.',
          vi: 'Đúng hay sai: hoàn thành module phải theo điều kiện cố định của module.',
        },
        questionId: `q-${module.moduleId}-requirements`,
        sourceId: `${module.moduleQuizId}-q03`,
        type: 'true-false',
      },
      {
        correctAnswer: unlockCorrectAnswer,
        explanation: {
          en: `The trusted unlock list for this module is ${unlockLabel}.`,
          vi: `Danh sách mở khóa tin cậy của module này là ${unlockLabel}.`,
        },
        hints: [
          {
            en: 'Use the stable unlock list, not a Playground guess.',
            vi: 'Dùng danh sách unlock stable, không đoán từ Playground.',
          },
          {
            en: 'Only module quiz pass creates algorithm unlock documents.',
            vi: 'Chỉ pass quiz module mới tạo document mở khóa thuật toán.',
          },
        ],
        options: [
          {
            optionId: 'opt-algorithm-unlock',
            text: { en: unlockLabel, vi: unlockLabel },
          },
          {
            optionId: 'opt-no-direct-unlock',
            text: {
              en: 'No direct Playground algorithm',
              vi: 'Không mở trực tiếp thuật toán Playground',
            },
          },
          {
            optionId: 'opt-all-should',
            text: {
              en: 'All Should algorithms',
              vi: 'Tất cả thuật toán Should',
            },
          },
        ],
        prompt: {
          en: 'What does this module unlock after a trusted module quiz pass?',
          vi: 'Module này mở khóa gì sau khi pass quiz module tin cậy?',
        },
        questionId: `q-${module.moduleId}-unlock`,
        sourceId: `${module.moduleQuizId}-q04`,
        type: 'single-choice',
      },
      {
        correctAnswer: ['opt-answer-server', 'opt-no-production-publish'],
        explanation: {
          en:
            'Answer keys stay server-side and draft learning content must not pretend to be ' +
            'production-published or externally reviewed.',
          vi:
            'Đáp án nằm ở server và nội dung draft không được giả là đã publish production ' +
            'hoặc đã được review bên ngoài.',
        },
        hints: [
          {
            en: 'Pick the two safety rules.',
            vi: 'Chọn hai quy tắc an toàn.',
          },
          {
            en: 'The browser may render attempts, but not the key.',
            vi: 'Trình duyệt có thể render attempt, nhưng không giữ đáp án.',
          },
        ],
        options: [
          {
            optionId: 'opt-answer-server',
            text: { en: 'Keep answer keys server-side.', vi: 'Giữ đáp án ở server.' },
          },
          {
            optionId: 'opt-no-production-publish',
            text: {
              en: 'Do not claim production publish or external review.',
              vi: 'Không tuyên bố publish production hoặc review bên ngoài.',
            },
          },
          {
            optionId: 'opt-key-in-web',
            text: { en: 'Bundle keys in the web app.', vi: 'Đưa đáp án vào web app.' },
          },
          {
            optionId: 'opt-fake-source',
            text: { en: 'Invent a source if one is missing.', vi: 'Tự bịa nguồn nếu thiếu.' },
          },
        ],
        prompt: {
          en: 'Which guardrails keep this learning unit honest?',
          vi: 'Guardrail nào giữ learning unit này trung thực?',
        },
        questionId: `q-${module.moduleId}-guardrails`,
        sourceId: `${module.moduleQuizId}-q05`,
        type: 'multiple-choice',
      },
      {
        correctAnswer: 'true',
        explanation: {
          en: 'Progress and unlocks are written by backend quiz submission, not local route state.',
          vi: 'Progress và unlock do backend ghi khi nộp quiz, không phải state route cục bộ.',
        },
        hints: [
          {
            en: 'The route guard is only user experience.',
            vi: 'Route guard chỉ là trải nghiệm người dùng.',
          },
          {
            en: 'Trusted progress comes from the backend.',
            vi: 'Tiến độ tin cậy đến từ backend.',
          },
        ],
        options: [
          { optionId: 'true', text: { en: 'True', vi: 'Đúng' } },
          { optionId: 'false', text: { en: 'False', vi: 'Sai' } },
        ],
        prompt: {
          en: 'True or false: a local route guard must not create trusted progress.',
          vi: 'Đúng hay sai: route guard cục bộ không được tạo progress tin cậy.',
        },
        questionId: `q-${module.moduleId}-trusted-progress`,
        sourceId: `${module.moduleQuizId}-q06`,
        type: 'true-false',
      },
    ],
    quizId: module.moduleQuizId,
    quizKind: 'module',
    quizRevisionId: `${module.moduleQuizId}-rev-r1`,
    requiredCorrectCount: null,
    unlocksOnPass: module.unlockAlgorithmIds.map((algorithmId) => ({
      id: algorithmId,
      type: 'algorithm',
    })),
  } as const satisfies QuizManifest;
}

function createReleaseQuizManifests() {
  const generatedManifests: Record<string, QuizManifest> = {};

  for (const course of getReleaseLearningCatalog().courses) {
    for (const module of course.modules) {
      if (!handAuthoredQuizManifests[module.moduleQuizId]) {
        generatedManifests[module.moduleQuizId] = createGeneratedModuleQuiz(module);
      }

      for (const post of module.posts) {
        if (!handAuthoredQuizManifests[post.postQuizId]) {
          generatedManifests[post.postQuizId] = createExpandedPostQuiz(post, module);
        }
      }
    }
  }

  const manifests = {
    ...generatedManifests,
    ...handAuthoredQuizManifests,
  };

  return Object.fromEntries(
    Object.entries(manifests).map(([quizId, manifest]) => [
      quizId,
      {
        ...manifest,
        draftProvenance: manifest.draftProvenance ?? {
          candidateSourceIds:
            manifest.courseId === 'course-classical-ml'
              ? ['microsoft-ml-for-beginners', 'google-ml-crash-course', 'mit-ocw', 'sklearn-docs']
              : [
                  'd2l-vi',
                  'microsoft-ai-for-beginners',
                  'google-ml-crash-course',
                  'tensorflow-tutorials',
                ],
          contentReviewStatus: 'pending-operator-review' as const,
          externalEvidenceStatus: 'not-collected' as const,
          importStatus: 'draft-only' as const,
        },
      },
    ]),
  ) as Readonly<Record<string, QuizManifest>>;
}

const quizManifests: Readonly<Record<string, QuizManifest>> = createReleaseQuizManifests();

export function getReleaseQuizManifests(): readonly QuizManifest[] {
  return Object.values(quizManifests);
}

export function getQuizManifest(quizId: string): QuizManifest {
  const manifest = quizManifests[quizId];

  if (!manifest) {
    throw new ApiError(404, 'QUIZ_NOT_FOUND', 'The requested quiz was not found.');
  }

  if (manifest.questions.length !== manifest.questionCount) {
    throw new ApiError(500, 'QUIZ_MANIFEST_INVALID', 'Quiz manifest question count is invalid.');
  }

  return manifest;
}

export function createQuizAttemptPayload(input: {
  attemptId: string;
  attemptNumber: number;
  expiresAtIso: string;
  quizId: string;
  shuffleSeed: string | null;
}): QuizAttemptPayload {
  const manifest = getQuizManifest(input.quizId);
  const questions = input.shuffleSeed
    ? shuffleDeterministically(manifest.questions, `${input.shuffleSeed}:questions`)
    : [...manifest.questions];

  return {
    attempt: {
      attemptId: input.attemptId,
      attemptNumber: input.attemptNumber,
      expiresAt: input.expiresAtIso,
      passingScorePercent: manifest.passingScorePercent,
      questionCount: manifest.questionCount,
      quizId: manifest.quizId,
      quizKind: manifest.quizKind,
      quizRevisionId: manifest.quizRevisionId,
      requiredCorrectCount: manifest.requiredCorrectCount,
      shuffleSeed: input.shuffleSeed,
    },
    mastery: manifest.mastery,
    questions: questions.map((question) => ({
      options:
        input.shuffleSeed && question.type !== 'true-false'
          ? shuffleDeterministically(
              question.options,
              `${input.shuffleSeed}:options:${question.questionId}`,
            )
          : [...question.options],
      prompt: question.prompt,
      questionId: question.questionId,
      sourceId: question.sourceId,
      type: question.type,
    })),
  };
}

export function gradeQuizSubmission(input: {
  answers: readonly QuizAnswer[];
  previousWrongCounts: StoredQuestionWrongCounts;
  questionIds: readonly string[];
  quizId: string;
}): QuizGradeResult {
  const manifest = getQuizManifest(input.quizId);
  const questionById = new Map(
    manifest.questions.map((question) => [question.questionId, question]),
  );
  const answersByQuestionId = toAnswerMap(input.answers);

  assertPinnedQuestionIds(input.questionIds, questionById);

  let correctCount = 0;
  const nextWrongCounts: StoredQuestionWrongCounts = { ...input.previousWrongCounts };
  const pendingFeedback = input.questionIds.map((questionId) => {
    const question = questionById.get(questionId)!;
    const answer = answersByQuestionId.get(questionId);

    if (!answer) {
      throw new ApiError(400, 'INVALID_QUIZ_ANSWERS', 'Every pinned question must be answered.');
    }

    const isCorrect = isAnswerCorrect(question, answer.value);

    if (isCorrect) {
      correctCount += 1;

      return {
        hint: null,
        hintLevel: 0 as const,
        isCorrect,
        question,
      };
    }

    const wrongCount = (nextWrongCounts[questionId] ?? 0) + 1;
    nextWrongCounts[questionId] = wrongCount;

    return {
      hint: getHint(question, wrongCount),
      hintLevel: getHintLevel(wrongCount),
      isCorrect,
      question,
    };
  });

  const rawScore = (correctCount / input.questionIds.length) * 100;
  const passed = rawScore >= manifest.passingScorePercent;

  return {
    correctCount,
    feedback: pendingFeedback.map((item) => {
      const baseFeedback = {
        hint: passed ? null : item.hint,
        hintLevel: passed ? (0 as const) : item.hintLevel,
        isCorrect: item.isCorrect,
        questionId: item.question.questionId,
      };

      if (!passed) {
        return baseFeedback;
      }

      return {
        ...baseFeedback,
        correctAnswer: item.question.correctAnswer,
        explanation: item.question.explanation,
      };
    }),
    newlyUnlocked: passed ? manifest.unlocksOnPass : [],
    nextWrongCounts,
    passed,
    score: roundScore(rawScore),
  };
}

function assertPinnedQuestionIds(
  questionIds: readonly string[],
  questionById: ReadonlyMap<string, QuizQuestion>,
) {
  if (
    questionIds.length === 0 ||
    questionIds.some((questionId) => !questionById.has(questionId)) ||
    new Set(questionIds).size !== questionIds.length
  ) {
    throw new ApiError(400, 'INVALID_QUIZ_ATTEMPT', 'Quiz attempt question order is invalid.');
  }
}

function toAnswerMap(answers: readonly QuizAnswer[]): ReadonlyMap<string, QuizAnswer> {
  const answerMap = new Map<string, QuizAnswer>();

  for (const answer of answers) {
    if (answerMap.has(answer.questionId)) {
      throw new ApiError(400, 'INVALID_QUIZ_ANSWERS', 'Duplicate quiz answers are not allowed.');
    }

    answerMap.set(answer.questionId, answer);
  }

  return answerMap;
}

function isAnswerCorrect(question: QuizQuestion, value: QuizAnswerValue): boolean {
  if (question.type === 'multiple-choice') {
    return Array.isArray(value) && areStringSetsEqual(value, question.correctAnswer);
  }

  return typeof value === 'string' && value === question.correctAnswer;
}

function areStringSetsEqual(leftValue: readonly string[], rightValue: QuizAnswerValue): boolean {
  if (!Array.isArray(rightValue)) {
    return false;
  }

  const normalizedLeft = [...new Set(leftValue)].sort();
  const normalizedRight = [...rightValue].sort();

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
}

function getHint(question: QuizQuestion, wrongCount: number): LocalizedText | null {
  const hintLevel = getHintLevel(wrongCount);

  if (hintLevel === 0) {
    return null;
  }

  return question.hints[hintLevel - 1] ?? null;
}

function getHintLevel(wrongCount: number): 0 | 1 | 2 {
  if (wrongCount >= 3) {
    return 2;
  }

  if (wrongCount === 2) {
    return 1;
  }

  return 0;
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}

function shuffleDeterministically<TValue>(values: readonly TValue[], seed: string): TValue[] {
  const shuffledValues = [...values];
  const random = createSeededRandom(seed);

  for (let index = shuffledValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentValue = shuffledValues[index]!;
    shuffledValues[index] = shuffledValues[swapIndex]!;
    shuffledValues[swapIndex] = currentValue;
  }

  if (
    shuffledValues.length > 1 &&
    shuffledValues.every((value, index) => value === values[index])
  ) {
    shuffledValues.push(shuffledValues.shift()!);
  }

  return shuffledValues;
}

function createSeededRandom(seed: string): () => number {
  let state = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state = Math.imul(state + 0x6d2b79f5, 0x85ebca6b);
    state ^= state >>> 13;
    state = Math.imul(state, 0xc2b2ae35);
    state ^= state >>> 16;

    return (state >>> 0) / 4294967296;
  };
}
