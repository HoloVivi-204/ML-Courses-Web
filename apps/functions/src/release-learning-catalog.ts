export type ReleaseLocale = 'en' | 'vi';

export interface LocalizedText {
  en: string;
  vi: string;
}

export interface ReleaseLearningPost {
  activityIds: readonly string[];
  estimatedMinutes: number;
  postId: string;
  postQuizId: string;
  sourceReviewStatus: 'pending-operator-review';
  title: LocalizedText;
}

export interface ReleaseLearningModule {
  courseId: string;
  demoId: string | null;
  demoProblemId: string | null;
  moduleId: string;
  moduleQuizId: string;
  moduleQuizQuestionCount: number;
  order: number;
  posts: readonly ReleaseLearningPost[];
  prerequisiteModuleIds: readonly string[];
  sourceReviewStatus: 'pending-operator-review';
  title: LocalizedText;
  unlockAlgorithmIds: readonly string[];
}

export interface ReleaseLearningCourse {
  courseId: string;
  courseRevisionId: string;
  modules: readonly ReleaseLearningModule[];
  title: LocalizedText;
  trialPostId: string;
}

export interface ReleaseLearningCatalog {
  courses: readonly ReleaseLearningCourse[];
  schemaVersion: 1;
}

export interface SubmissionLearningUnit {
  algorithmId: string;
  courseId: string;
  moduleId: string;
  moduleQuizId: string;
  requiredPostIds: readonly string[];
  scenarioId: string;
  unlockAlgorithmIds: readonly string[];
}

const postMinutesByCount = {
  onePost: 18,
  twoPosts: 14,
} as const;

function createPost(input: {
  estimatedMinutes: number;
  postId: string;
  postQuizId: string;
  title: LocalizedText;
}): ReleaseLearningPost {
  return {
    ...input,
    activityIds: [
      `act-${input.postId}-example`,
      `act-${input.postId}-quiz-01`,
      `act-${input.postId}-quiz-02`,
      `act-${input.postId}-quiz-03`,
    ],
    sourceReviewStatus: 'pending-operator-review',
  };
}

const releaseLearningCatalog: ReleaseLearningCatalog = {
  schemaVersion: 1,
  courses: [
    {
      courseId: 'course-classical-ml',
      courseRevisionId: 'course-classical-ml-rev-r1',
      title: {
        en: 'Classical Machine Learning',
        vi: 'Học máy cổ điển',
      },
      trialPostId: 'cml-p01-problem-data-types',
      modules: [
        {
          courseId: 'course-classical-ml',
          demoId: null,
          demoProblemId: null,
          moduleId: 'cml-m01-foundations',
          moduleQuizId: 'quiz-module-cml-m01',
          moduleQuizQuestionCount: 6,
          order: 1,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p01-problem-data-types',
              postQuizId: 'quiz-post-cml-p01',
              title: {
                en: 'Problem and data types',
                vi: 'Loại bài toán và dữ liệu',
              },
            }),
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p02-train-test-metrics',
              postQuizId: 'quiz-post-cml-p02',
              title: {
                en: 'Train/test splits and metrics',
                vi: 'Chia train/test và metric',
              },
            }),
          ],
          prerequisiteModuleIds: [],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Problems, data and metrics',
            vi: 'Bài toán, dữ liệu và metric',
          },
          unlockAlgorithmIds: [],
        },
        {
          courseId: 'course-classical-ml',
          demoId: 'demo-linear-calibration',
          demoProblemId: 'problem-demo-linear-calibration',
          moduleId: 'cml-m02-linear-polynomial',
          moduleQuizId: 'quiz-module-cml-m02',
          moduleQuizQuestionCount: 6,
          order: 2,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p03-linear-regression',
              postQuizId: 'quiz-post-cml-p03',
              title: {
                en: 'Linear regression baseline',
                vi: 'Baseline hồi quy tuyến tính',
              },
            }),
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p04-polynomial-regression',
              postQuizId: 'quiz-post-cml-p04',
              title: {
                en: 'Polynomial regression caution',
                vi: 'Lưu ý với hồi quy đa thức',
              },
            }),
          ],
          prerequisiteModuleIds: ['cml-m01-foundations'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Linear and polynomial regression',
            vi: 'Hồi quy tuyến tính và đa thức',
          },
          unlockAlgorithmIds: ['linear-regression', 'polynomial-regression'],
        },
        {
          courseId: 'course-classical-ml',
          demoId: 'demo-regularization-noisy-signal',
          demoProblemId: 'problem-demo-regularization-noisy-signal',
          moduleId: 'cml-m03-ridge-lasso',
          moduleQuizId: 'quiz-module-cml-m03',
          moduleQuizQuestionCount: 6,
          order: 3,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.onePost,
              postId: 'cml-p05-regularization-ridge-lasso',
              postQuizId: 'quiz-post-cml-p05',
              title: {
                en: 'Regularisation with Ridge and Lasso',
                vi: 'Regularization với Ridge và Lasso',
              },
            }),
          ],
          prerequisiteModuleIds: ['cml-m02-linear-polynomial'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Ridge and Lasso',
            vi: 'Ridge và Lasso',
          },
          unlockAlgorithmIds: ['ridge-regression', 'lasso-regression'],
        },
        {
          courseId: 'course-classical-ml',
          demoId: 'demo-logistic-admission',
          demoProblemId: 'problem-demo-logistic-admission',
          moduleId: 'cml-m04-logistic-classification',
          moduleQuizId: 'quiz-module-cml-m04',
          moduleQuizQuestionCount: 6,
          order: 4,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p06-logistic-regression',
              postQuizId: 'quiz-post-cml-p06',
              title: {
                en: 'Logistic regression decisions',
                vi: 'Quyết định hồi quy logistic',
              },
            }),
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p07-classification-metrics',
              postQuizId: 'quiz-post-cml-p07',
              title: {
                en: 'Classification metrics',
                vi: 'Metric phân loại',
              },
            }),
          ],
          prerequisiteModuleIds: ['cml-m03-ridge-lasso'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Logistic classification',
            vi: 'Phân loại logistic',
          },
          unlockAlgorithmIds: ['logistic-regression'],
        },
        {
          courseId: 'course-classical-ml',
          demoId: 'demo-neighbor-flower',
          demoProblemId: 'problem-demo-neighbor-flower',
          moduleId: 'cml-m05-knn-naive-bayes',
          moduleQuizId: 'quiz-module-cml-m05',
          moduleQuizQuestionCount: 6,
          order: 5,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p08-knn',
              postQuizId: 'quiz-post-cml-p08',
              title: {
                en: 'K-nearest neighbours',
                vi: 'K láng giềng gần nhất',
              },
            }),
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p09-naive-bayes',
              postQuizId: 'quiz-post-cml-p09',
              title: {
                en: 'Naive Bayes counts',
                vi: 'Đếm xác suất Naive Bayes',
              },
            }),
          ],
          prerequisiteModuleIds: ['cml-m04-logistic-classification'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'KNN and Naive Bayes',
            vi: 'KNN và Naive Bayes',
          },
          unlockAlgorithmIds: ['knn', 'naive-bayes'],
        },
        {
          courseId: 'course-classical-ml',
          demoId: 'demo-tree-forest-habitat',
          demoProblemId: 'problem-demo-tree-forest-habitat',
          moduleId: 'cml-m06-trees-forest',
          moduleQuizId: 'quiz-module-cml-m06',
          moduleQuizQuestionCount: 6,
          order: 6,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p10-decision-tree',
              postQuizId: 'quiz-post-cml-p10',
              title: {
                en: 'Decision tree splits',
                vi: 'Luật chia của cây quyết định',
              },
            }),
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p11-random-forest',
              postQuizId: 'quiz-post-cml-p11',
              title: {
                en: 'Random forest voting',
                vi: 'Bỏ phiếu trong rừng ngẫu nhiên',
              },
            }),
          ],
          prerequisiteModuleIds: ['cml-m05-knn-naive-bayes'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Decision trees and forests',
            vi: 'Cây quyết định và rừng',
          },
          unlockAlgorithmIds: ['decision-tree', 'random-forest'],
        },
        {
          courseId: 'course-classical-ml',
          demoId: 'demo-svm-margin',
          demoProblemId: 'problem-demo-svm-margin',
          moduleId: 'cml-m07-svm',
          moduleQuizId: 'quiz-module-cml-m07',
          moduleQuizQuestionCount: 6,
          order: 7,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.onePost,
              postId: 'cml-p12-svm',
              postQuizId: 'quiz-post-cml-p12',
              title: {
                en: 'Support vector margins',
                vi: 'Margin trong SVM',
              },
            }),
          ],
          prerequisiteModuleIds: ['cml-m06-trees-forest'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Support Vector Machines',
            vi: 'Máy vector hỗ trợ',
          },
          unlockAlgorithmIds: ['svm'],
        },
        {
          courseId: 'course-classical-ml',
          demoId: 'demo-stellar-clusters',
          demoProblemId: 'problem-demo-stellar-clusters',
          moduleId: 'cml-m08-clustering',
          moduleQuizId: 'quiz-module-cml-m08',
          moduleQuizQuestionCount: 6,
          order: 8,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p13-kmeans',
              postQuizId: 'quiz-post-cml-p13',
              title: {
                en: 'K-Means cluster centers',
                vi: 'Tâm cụm K-Means',
              },
            }),
            createPost({
              estimatedMinutes: postMinutesByCount.twoPosts,
              postId: 'cml-p14-hierarchical-clustering',
              postQuizId: 'quiz-post-cml-p14',
              title: {
                en: 'Hierarchical cluster cuts',
                vi: 'Cắt cây phân cụm phân cấp',
              },
            }),
          ],
          prerequisiteModuleIds: ['cml-m07-svm'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Clustering',
            vi: 'Phân cụm',
          },
          unlockAlgorithmIds: ['kmeans', 'hierarchical-clustering'],
        },
        {
          courseId: 'course-classical-ml',
          demoId: 'demo-pca-sensor-compression',
          demoProblemId: 'problem-demo-pca-sensor-compression',
          moduleId: 'cml-m09-pca',
          moduleQuizId: 'quiz-module-cml-m09',
          moduleQuizQuestionCount: 6,
          order: 9,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.onePost,
              postId: 'cml-p15-pca',
              postQuizId: 'quiz-post-cml-p15',
              title: {
                en: 'PCA components and reconstruction',
                vi: 'Thành phần PCA và tái dựng',
              },
            }),
          ],
          prerequisiteModuleIds: ['cml-m08-clustering'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Principal component analysis',
            vi: 'Phân tích thành phần chính',
          },
          unlockAlgorithmIds: ['pca'],
        },
      ],
    },
    {
      courseId: 'course-deep-learning-basic',
      courseRevisionId: 'course-deep-learning-basic-rev-r1',
      title: {
        en: 'Deep Learning Basics',
        vi: 'Học sâu cơ bản',
      },
      trialPostId: 'dl-p01-neuron-perceptron',
      modules: [
        {
          courseId: 'course-deep-learning-basic',
          demoId: 'demo-perceptron-and-gate',
          demoProblemId: 'problem-demo-perceptron-and-gate',
          moduleId: 'dl-m01-neuron-perceptron',
          moduleQuizId: 'quiz-module-dl-m01',
          moduleQuizQuestionCount: 6,
          order: 1,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.onePost,
              postId: 'dl-p01-neuron-perceptron',
              postQuizId: 'quiz-post-dl-p01',
              title: {
                en: 'Neuron and Perceptron decisions',
                vi: 'Quyết định của Neuron và Perceptron',
              },
            }),
          ],
          prerequisiteModuleIds: [],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Neurons and Perceptrons',
            vi: 'Neuron và Perceptron',
          },
          unlockAlgorithmIds: ['perceptron'],
        },
        {
          courseId: 'course-deep-learning-basic',
          demoId: 'demo-mlp-checkerboard',
          demoProblemId: 'problem-demo-mlp-checkerboard',
          moduleId: 'dl-m02-mlp',
          moduleQuizId: 'quiz-module-dl-m02',
          moduleQuizQuestionCount: 6,
          order: 2,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.onePost,
              postId: 'dl-p02-mlp-forward-activation',
              postQuizId: 'quiz-post-dl-p02',
              title: {
                en: 'MLP layers and activation',
                vi: 'Lớp và hàm kích hoạt trong MLP',
              },
            }),
          ],
          prerequisiteModuleIds: ['dl-m01-neuron-perceptron'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Multilayer Perceptrons',
            vi: 'Mạng nơ-ron nhiều lớp',
          },
          unlockAlgorithmIds: ['mlp'],
        },
        {
          courseId: 'course-deep-learning-basic',
          demoId: null,
          demoProblemId: null,
          moduleId: 'dl-m03-training-generalization',
          moduleQuizId: 'quiz-module-dl-m03',
          moduleQuizQuestionCount: 6,
          order: 3,
          posts: [
            createPost({
              estimatedMinutes: postMinutesByCount.onePost,
              postId: 'dl-p03-backprop-overfitting',
              postQuizId: 'quiz-post-dl-p03',
              title: {
                en: 'Training curves and overfitting',
                vi: 'Đường học và overfitting',
              },
            }),
          ],
          prerequisiteModuleIds: ['dl-m02-mlp'],
          sourceReviewStatus: 'pending-operator-review',
          title: {
            en: 'Training and generalisation',
            vi: 'Huấn luyện và khả năng tổng quát',
          },
          unlockAlgorithmIds: [],
        },
      ],
    },
  ],
};

const submissionLearningUnits: readonly SubmissionLearningUnit[] = [
  {
    algorithmId: 'linear-regression',
    courseId: 'course-classical-ml',
    moduleId: 'cml-m02-linear-polynomial',
    moduleQuizId: 'quiz-module-cml-m02',
    requiredPostIds: ['cml-p03-linear-regression', 'cml-p04-polynomial-regression'],
    scenarioId: 'pg-house-price',
    unlockAlgorithmIds: ['linear-regression', 'polynomial-regression'],
  },
  {
    algorithmId: 'logistic-regression',
    courseId: 'course-classical-ml',
    moduleId: 'cml-m04-logistic-classification',
    moduleQuizId: 'quiz-module-cml-m04',
    requiredPostIds: ['cml-p06-logistic-regression', 'cml-p07-classification-metrics'],
    scenarioId: 'pg-spam-detection',
    unlockAlgorithmIds: ['logistic-regression'],
  },
  {
    algorithmId: 'decision-tree',
    courseId: 'course-classical-ml',
    moduleId: 'cml-m06-trees-forest',
    moduleQuizId: 'quiz-module-cml-m06',
    requiredPostIds: ['cml-p10-decision-tree', 'cml-p11-random-forest'],
    scenarioId: 'pg-credit-risk',
    unlockAlgorithmIds: ['decision-tree', 'random-forest'],
  },
  {
    algorithmId: 'kmeans',
    courseId: 'course-classical-ml',
    moduleId: 'cml-m08-clustering',
    moduleQuizId: 'quiz-module-cml-m08',
    requiredPostIds: ['cml-p13-kmeans', 'cml-p14-hierarchical-clustering'],
    scenarioId: 'pg-retail-segments',
    unlockAlgorithmIds: ['kmeans', 'hierarchical-clustering'],
  },
  {
    algorithmId: 'pca',
    courseId: 'course-classical-ml',
    moduleId: 'cml-m09-pca',
    moduleQuizId: 'quiz-module-cml-m09',
    requiredPostIds: ['cml-p15-pca'],
    scenarioId: 'pg-country-indicators',
    unlockAlgorithmIds: ['pca'],
  },
  {
    algorithmId: 'perceptron',
    courseId: 'course-deep-learning-basic',
    moduleId: 'dl-m01-neuron-perceptron',
    moduleQuizId: 'quiz-module-dl-m01',
    requiredPostIds: ['dl-p01-neuron-perceptron'],
    scenarioId: 'pg-xor',
    unlockAlgorithmIds: ['perceptron'],
  },
  {
    algorithmId: 'mlp',
    courseId: 'course-deep-learning-basic',
    moduleId: 'dl-m02-mlp',
    moduleQuizId: 'quiz-module-dl-m02',
    requiredPostIds: ['dl-p02-mlp-forward-activation'],
    scenarioId: 'pg-xor',
    unlockAlgorithmIds: ['mlp'],
  },
] as const;

export function getReleaseLearningCatalog(): ReleaseLearningCatalog {
  return releaseLearningCatalog;
}

export function getSubmissionLearningUnits(): readonly SubmissionLearningUnit[] {
  return submissionLearningUnits;
}

export function getReleaseCourse(courseId: string): ReleaseLearningCourse | null {
  return releaseLearningCatalog.courses.find((course) => course.courseId === courseId) ?? null;
}

export function getReleaseModule(moduleId: string): ReleaseLearningModule | null {
  return (
    releaseLearningCatalog.courses
      .flatMap((course) => course.modules)
      .find((module) => module.moduleId === moduleId) ?? null
  );
}

export function getReleaseModuleByQuizId(quizId: string): ReleaseLearningModule | null {
  return (
    releaseLearningCatalog.courses
      .flatMap((course) => course.modules)
      .find((module) => module.moduleQuizId === quizId) ?? null
  );
}

export function getReleasePost(postId: string): ReleaseLearningPost | null {
  return (
    releaseLearningCatalog.courses
      .flatMap((course) => course.modules)
      .flatMap((module) => module.posts)
      .find((post) => post.postId === postId) ?? null
  );
}

export function getReleasePostByQuizId(quizId: string): ReleaseLearningPost | null {
  return (
    releaseLearningCatalog.courses
      .flatMap((course) => course.modules)
      .flatMap((module) => module.posts)
      .find((post) => post.postQuizId === quizId) ?? null
  );
}

export function getNextReleaseModule(moduleId: string): ReleaseLearningModule | null {
  const currentModule = getReleaseModule(moduleId);

  if (!currentModule) {
    return null;
  }

  const course = getReleaseCourse(currentModule.courseId);

  if (!course) {
    return null;
  }

  return course.modules.find((module) => module.order === currentModule.order + 1) ?? null;
}
