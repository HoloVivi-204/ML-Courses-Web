import { ApiError } from './api-error.js';
import {
  getReleaseLearningCatalog,
  type ReleaseLearningModule,
  type ReleaseLearningPost,
} from './release-learning-catalog.js';

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
  type: BaselineQuestionType;
}

export interface QuizManifest {
  courseId: string;
  demoId: string | null;
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
        type: 'true-false',
      },
    ],
  },
  'quiz-module-dl-m01': {
    courseId: 'course-deep-learning-basic',
    demoId: 'demo-perceptron-and-gate',
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
        type: 'true-false',
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
          generatedManifests[post.postQuizId] = createGeneratedPostQuiz(post, module);
        }
      }
    }
  }

  return {
    ...generatedManifests,
    ...handAuthoredQuizManifests,
  };
}

const quizManifests: Readonly<Record<string, QuizManifest>> = createReleaseQuizManifests();

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
