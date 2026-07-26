import { courses, type CourseModule, type LocalizedText } from '../catalog/course-data';

export interface DemoStep {
  id: string;
  narration: LocalizedText;
  required: boolean;
  textAlternative: LocalizedText;
  title: LocalizedText;
}

export interface FixedDemoManifest {
  algorithmId: string;
  courseId: string;
  demoId: string;
  moduleId: string;
  problemId: string;
  requiredStepIds: readonly string[];
  revisionId: string;
  seed: number;
  steps: readonly DemoStep[];
}

export const andGateDemo: FixedDemoManifest = {
  algorithmId: 'perceptron',
  courseId: 'course-deep-learning-basic',
  demoId: 'demo-perceptron-and-gate',
  moduleId: 'dl-m01-neuron-perceptron',
  problemId: 'problem-demo-perceptron-and-gate',
  requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
  revisionId: 'demo-perceptron-and-gate-rev-r1',
  seed: 42,
  steps: [
    {
      id: 'and-problem',
      narration: {
        en: 'AND returns 1 only when both inputs are 1. This gives a linearly separable target.',
        vi: 'AND chỉ trả về 1 khi cả hai đầu vào đều bằng 1. Mục tiêu này tách được bằng một đường thẳng.',
      },
      required: true,
      textAlternative: {
        en: 'The AND truth table has three negative cases and one positive case at x1 equals 1 and x2 equals 1.',
        vi: 'Bốn điểm dữ liệu AND và một đường quyết định sẽ được dùng để kiểm tra Perceptron; chỉ điểm x1 bằng 1 và x2 bằng 1 là dương.',
      },
      title: {
        en: 'Define the AND target',
        vi: 'Xác định mục tiêu AND',
      },
    },
    {
      id: 'and-data',
      narration: {
        en: 'The four points are fixed: 00, 01, 10, and 11. No live training or random sampling happens in this demo.',
        vi: 'Bốn điểm dữ liệu được cố định: 00, 01, 10 và 11. Demo này không train live hoặc lấy mẫu ngẫu nhiên.',
      },
      required: true,
      textAlternative: {
        en: 'Four AND data points are shown in a square. Only the top-right point is positive.',
        vi: 'Bốn điểm dữ liệu AND nằm trên một hình vuông. Chỉ điểm góc trên bên phải là dương.',
      },
      title: {
        en: 'Inspect the fixed dataset',
        vi: 'Quan sát dataset cố định',
      },
    },
    {
      id: 'and-boundary',
      narration: {
        en: 'A Perceptron with weights 1 and 1 plus bias -1.5 draws one line between the positive and negative cases.',
        vi: 'Perceptron với trọng số 1 và 1, bias -1.5, vẽ một đường giữa điểm dương và các điểm âm.',
      },
      required: true,
      textAlternative: {
        en: 'A diagonal decision boundary separates the top-right positive point from the other three points.',
        vi: 'Một đường quyết định chéo tách điểm dương góc trên bên phải khỏi ba điểm còn lại.',
      },
      title: {
        en: 'Read the decision boundary',
        vi: 'Đọc ranh giới quyết định',
      },
    },
    {
      id: 'and-result',
      narration: {
        en: 'Every point matches the AND label, so this fixed demo completes before the module quiz opens later.',
        vi: 'Mọi điểm đều khớp nhãn AND, nên demo cố định này hoàn thành trước khi module quiz mở ở slice sau.',
      },
      required: true,
      textAlternative: {
        en: 'The final frame marks all four AND predictions as correct and reports 100 percent accuracy.',
        vi: 'Frame cuối đánh dấu cả bốn dự đoán AND là đúng và báo độ chính xác 100 phần trăm.',
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

function createGenericDemo(input: {
  courseId: string;
  demoId: string;
  module: CourseModule;
}): FixedDemoManifest {
  const algorithmId = input.module.unlockAlgorithmIds[0] ?? 'learning-review';
  const problemId = demoProblemIdByDemoId[input.demoId] ?? `problem-${input.demoId}`;
  const stepIds = ['problem', 'data', 'decision', 'result'] as const;

  return {
    algorithmId,
    courseId: input.courseId,
    demoId: input.demoId,
    moduleId: input.module.id,
    problemId,
    requiredStepIds: stepIds,
    revisionId: `${input.demoId}-rev-r1`,
    seed: 42,
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

const generatedDemos = courses.flatMap((course) =>
  (course.modules ?? [])
    .filter((module) => module.demoId !== null && module.demoId !== andGateDemo.demoId)
    .map((module) =>
      createGenericDemo({
        courseId: course.id,
        demoId: module.demoId!,
        module,
      }),
    ),
);
const fixedDemos = [andGateDemo, ...generatedDemos] as const;

export function getFixedDemo(demoId: string | undefined) {
  return fixedDemos.find((demo) => demo.demoId === demoId);
}
