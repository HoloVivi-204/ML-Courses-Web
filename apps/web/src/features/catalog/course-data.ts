export type Locale = 'en' | 'vi';

export interface LocalizedText {
  en: string;
  vi: string;
}

export interface CourseModule {
  demoId: string | null;
  description: LocalizedText;
  durationMinutes: number;
  id: string;
  index: number;
  postId: string;
  title: LocalizedText;
  unlockAlgorithmIds: readonly string[];
}

export interface CourseSummary {
  description: LocalizedText;
  durationHours: number;
  eyebrow: LocalizedText;
  id: string;
  moduleCount: number;
  modules?: readonly CourseModule[];
  postCount: number;
  title: LocalizedText;
  tone: 'amber' | 'teal';
}

const deepLearningModules: readonly CourseModule[] = [
  {
    demoId: 'demo-perceptron-and-gate',
    description: {
      en: 'Build intuition for a neuron, its decision boundary, and the linear limit.',
      vi: 'Hiểu trực giác về neuron, ranh giới quyết định và giới hạn tuyến tính.',
    },
    durationMinutes: 42,
    id: 'dl-m01-neuron-perceptron',
    index: 1,
    postId: 'dl-p01-neuron-perceptron',
    title: {
      en: 'Neurons and Perceptrons',
      vi: 'Neuron và Perceptron',
    },
    unlockAlgorithmIds: ['perceptron'],
  },
  {
    demoId: 'demo-mlp-checkerboard',
    description: {
      en: 'Combine layers and activations to model patterns a straight line cannot separate.',
      vi: 'Kết hợp nhiều lớp và hàm kích hoạt để học mẫu mà đường thẳng không tách được.',
    },
    durationMinutes: 48,
    id: 'dl-m02-mlp',
    index: 2,
    postId: 'dl-p02-mlp-forward-activation',
    title: {
      en: 'Multilayer Perceptrons',
      vi: 'Mạng nơ-ron nhiều lớp',
    },
    unlockAlgorithmIds: ['mlp'],
  },
  {
    demoId: null,
    description: {
      en: 'Read learning curves, spot overfitting, and reason about generalisation.',
      vi: 'Đọc đường học, nhận biết overfitting và suy luận về khả năng tổng quát.',
    },
    durationMinutes: 44,
    id: 'dl-m03-training-generalization',
    index: 3,
    postId: 'dl-p03-backprop-overfitting',
    title: {
      en: 'Training and generalisation',
      vi: 'Huấn luyện và khả năng tổng quát',
    },
    unlockAlgorithmIds: [],
  },
];

export const courses: readonly CourseSummary[] = [
  {
    description: {
      en: 'Regression, classification, clustering, and the craft of evaluating a model.',
      vi: 'Hồi quy, phân loại, phân cụm và cách đánh giá một mô hình.',
    },
    durationHours: 12,
    eyebrow: {
      en: 'Recommended first',
      vi: 'Nên học trước',
    },
    id: 'course-classical-ml',
    moduleCount: 9,
    postCount: 15,
    title: {
      en: 'Classical Machine Learning',
      vi: 'Học máy cổ điển',
    },
    tone: 'teal',
  },
  {
    description: {
      en: 'From one neuron to multilayer networks, with every decision made visible.',
      vi: 'Từ một neuron đến mạng nhiều lớp, với từng quyết định được trực quan hóa.',
    },
    durationHours: 4,
    eyebrow: {
      en: 'First live journey',
      vi: 'Lộ trình đang mở',
    },
    id: 'course-deep-learning-basic',
    moduleCount: 3,
    modules: deepLearningModules,
    postCount: 3,
    title: {
      en: 'Deep Learning Basics',
      vi: 'Học sâu cơ bản',
    },
    tone: 'amber',
  },
];

export function getCourse(courseId: string | undefined): CourseSummary | undefined {
  return courses.find((course) => course.id === courseId);
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale];
}
