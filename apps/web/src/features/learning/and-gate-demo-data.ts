import type { LocalizedText } from '../catalog/course-data';

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

export function getFixedDemo(demoId: string | undefined) {
  return demoId === andGateDemo.demoId ? andGateDemo : undefined;
}
