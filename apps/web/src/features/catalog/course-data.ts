export type Locale = 'en' | 'vi';

export interface LocalizedText {
  en: string;
  vi: string;
}

export interface CourseModule {
  contentStatus: 'draft-ready' | 'metadata-only';
  demoId: string | null;
  description: LocalizedText;
  durationMinutes: number;
  id: string;
  index: number;
  postId: string;
  postIds: readonly string[];
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

const classicalModules: readonly CourseModule[] = [
  {
    contentStatus: 'draft-ready',
    demoId: null,
    description: {
      en: 'Recognise supervised, unsupervised, feature and label data before choosing a model.',
      vi: 'Nhận biết dữ liệu có giám sát, không giám sát, feature và label trước khi chọn mô hình.',
    },
    durationMinutes: 58,
    id: 'cml-m01-foundations',
    index: 1,
    postId: 'cml-p01-problem-data-types',
    postIds: ['cml-p01-problem-data-types', 'cml-p02-train-test-metrics'],
    title: {
      en: 'Problems, data and metrics',
      vi: 'Bài toán, dữ liệu và metric',
    },
    unlockAlgorithmIds: [],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-linear-calibration',
    description: {
      en: 'Use a line as a baseline, then see when curvature becomes necessary.',
      vi: 'Dùng đường thẳng làm baseline, rồi nhận ra khi nào cần độ cong.',
    },
    durationMinutes: 54,
    id: 'cml-m02-linear-polynomial',
    index: 2,
    postId: 'cml-p03-linear-regression',
    postIds: ['cml-p03-linear-regression', 'cml-p04-polynomial-regression'],
    title: {
      en: 'Linear and polynomial regression',
      vi: 'Hồi quy tuyến tính và đa thức',
    },
    unlockAlgorithmIds: ['linear-regression', 'polynomial-regression'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-regularization-noisy-signal',
    description: {
      en: 'Control noisy coefficients with regularisation before trusting a regression model.',
      vi: 'Kiểm soát hệ số nhiễu bằng regularization trước khi tin một mô hình hồi quy.',
    },
    durationMinutes: 44,
    id: 'cml-m03-ridge-lasso',
    index: 3,
    postId: 'cml-p05-regularization-ridge-lasso',
    postIds: ['cml-p05-regularization-ridge-lasso'],
    title: {
      en: 'Ridge and Lasso',
      vi: 'Ridge và Lasso',
    },
    unlockAlgorithmIds: ['ridge-regression', 'lasso-regression'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-logistic-admission',
    description: {
      en: 'Turn scores into probabilities and evaluate binary classification decisions.',
      vi: 'Biến điểm số thành xác suất và đánh giá quyết định phân loại nhị phân.',
    },
    durationMinutes: 56,
    id: 'cml-m04-logistic-classification',
    index: 4,
    postId: 'cml-p06-logistic-regression',
    postIds: ['cml-p06-logistic-regression', 'cml-p07-classification-metrics'],
    title: {
      en: 'Logistic classification',
      vi: 'Phân loại logistic',
    },
    unlockAlgorithmIds: ['logistic-regression'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-neighbor-flower',
    description: {
      en: 'Compare local-neighbour reasoning with probability counts for simple classifiers.',
      vi: 'So sánh lập luận láng giềng gần với đếm xác suất cho bộ phân loại đơn giản.',
    },
    durationMinutes: 52,
    id: 'cml-m05-knn-naive-bayes',
    index: 5,
    postId: 'cml-p08-knn',
    postIds: ['cml-p08-knn', 'cml-p09-naive-bayes'],
    title: {
      en: 'KNN and Naive Bayes',
      vi: 'KNN và Naive Bayes',
    },
    unlockAlgorithmIds: ['knn', 'naive-bayes'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-tree-forest-habitat',
    description: {
      en: 'Read split rules, leaf decisions and the reason ensembles reduce brittle trees.',
      vi: 'Đọc luật chia, quyết định ở lá và lý do ensemble giảm độ mong manh của cây.',
    },
    durationMinutes: 55,
    id: 'cml-m06-trees-forest',
    index: 6,
    postId: 'cml-p10-decision-tree',
    postIds: ['cml-p10-decision-tree', 'cml-p11-random-forest'],
    title: {
      en: 'Decision trees and forests',
      vi: 'Cây quyết định và rừng',
    },
    unlockAlgorithmIds: ['decision-tree', 'random-forest'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-svm-margin',
    description: {
      en: 'Use margins to reason about class separation without overfitting every point.',
      vi: 'Dùng margin để suy luận về tách lớp mà không khớp quá mức từng điểm.',
    },
    durationMinutes: 42,
    id: 'cml-m07-svm',
    index: 7,
    postId: 'cml-p12-svm',
    postIds: ['cml-p12-svm'],
    title: {
      en: 'Support Vector Machines',
      vi: 'Máy vector hỗ trợ',
    },
    unlockAlgorithmIds: ['svm'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-stellar-clusters',
    description: {
      en: 'Group unlabeled examples and check whether the chosen number of clusters is credible.',
      vi: 'Gom nhóm mẫu chưa có nhãn và kiểm tra số cụm chọn ra có đáng tin không.',
    },
    durationMinutes: 58,
    id: 'cml-m08-clustering',
    index: 8,
    postId: 'cml-p13-kmeans',
    postIds: ['cml-p13-kmeans', 'cml-p14-hierarchical-clustering'],
    title: {
      en: 'Clustering',
      vi: 'Phân cụm',
    },
    unlockAlgorithmIds: ['kmeans', 'hierarchical-clustering'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-pca-sensor-compression',
    description: {
      en: 'Compress related features into principal components while tracking information loss.',
      vi: 'Nén các feature liên quan thành thành phần chính và theo dõi phần thông tin mất đi.',
    },
    durationMinutes: 40,
    id: 'cml-m09-pca',
    index: 9,
    postId: 'cml-p15-pca',
    postIds: ['cml-p15-pca'],
    title: {
      en: 'Principal component analysis',
      vi: 'Phân tích thành phần chính',
    },
    unlockAlgorithmIds: ['pca'],
  },
];

const deepLearningModules: readonly CourseModule[] = [
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-perceptron-and-gate',
    description: {
      en: 'Build intuition for a neuron, its decision boundary, and the linear limit.',
      vi: 'Hiểu trực giác về neuron, ranh giới quyết định và giới hạn tuyến tính.',
    },
    durationMinutes: 42,
    id: 'dl-m01-neuron-perceptron',
    index: 1,
    postId: 'dl-p01-neuron-perceptron',
    postIds: ['dl-p01-neuron-perceptron'],
    title: {
      en: 'Neurons and Perceptrons',
      vi: 'Neuron và Perceptron',
    },
    unlockAlgorithmIds: ['perceptron'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: 'demo-mlp-checkerboard',
    description: {
      en: 'Combine layers and activations to model patterns a straight line cannot separate.',
      vi: 'Kết hợp nhiều lớp và hàm kích hoạt để học mẫu mà đường thẳng không tách được.',
    },
    durationMinutes: 48,
    id: 'dl-m02-mlp',
    index: 2,
    postId: 'dl-p02-mlp-forward-activation',
    postIds: ['dl-p02-mlp-forward-activation'],
    title: {
      en: 'Multilayer Perceptrons',
      vi: 'Mạng nơ-ron nhiều lớp',
    },
    unlockAlgorithmIds: ['mlp'],
  },
  {
    contentStatus: 'draft-ready',
    demoId: null,
    description: {
      en: 'Read learning curves, spot overfitting, and reason about generalisation.',
      vi: 'Đọc đường học, nhận biết overfitting và suy luận về khả năng tổng quát.',
    },
    durationMinutes: 44,
    id: 'dl-m03-training-generalization',
    index: 3,
    postId: 'dl-p03-backprop-overfitting',
    postIds: ['dl-p03-backprop-overfitting'],
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
    modules: classicalModules,
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
