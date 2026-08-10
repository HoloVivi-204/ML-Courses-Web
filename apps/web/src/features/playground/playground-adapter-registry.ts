import type { MlConfig } from './ml-engine-contract';
import type { MlRunRequest } from './ml-worker-protocol';
import {
  runXorPerceptron,
  validateXorPerceptronConfig,
  XorPerceptronCancelledError,
  type XorPerceptronConfig,
} from './xor-perceptron';
import type {
  AlgorithmAdapter,
  PlaygroundPairRegistration,
  PlaygroundParameterField,
} from './algorithm-adapter';
import {
  createDecisionTreeAdapter,
  createHierarchicalClusteringAdapter,
  createKMeansAdapter,
  createKnnAdapter,
  createLassoRegressionAdapter,
  createLinearRegressionAdapter,
  createLogisticRegressionAdapter,
  createMlpAdapter,
  createNaiveBayesAdapter,
  createPcaAdapter,
  createPolynomialRegressionAdapter,
  createRandomForestAdapter,
  createRidgeRegressionAdapter,
  createSvmAdapter,
} from './reference-adapters';

const xorPerceptronAdapter: AlgorithmAdapter = {
  adapterVersion: 'tfjs-core-v1',
  algorithmId: 'perceptron',
  configSchemaVersion: 1,
  datasetVersionId: 'ds-xor-noisy-v1',
  scenarioId: 'pg-xor',
  validateConfig(config) {
    const typedConfig = config as unknown as XorPerceptronConfig;

    validateXorPerceptronConfig(typedConfig, 'desktop');

    return typedConfig as unknown as MlConfig;
  },
  async run(request, options) {
    const config = xorPerceptronAdapter.validateConfig(
      request.config,
    ) as unknown as XorPerceptronConfig;

    return runXorPerceptron(config, {
      dataset: request.dataset,
      runId: request.runId,
      onProgress: (event) => options.onProgress(event),
      shouldCancel: options.shouldCancel,
    });
  },
  isCancelledError(error): error is { runId: string } {
    return error instanceof XorPerceptronCancelledError;
  },
};

const commonParameterFields = {
  epochs(max: number, mobileMax?: number): PlaygroundParameterField {
    return {
      id: 'epochs',
      kind: 'number',
      integer: true,
      label: { en: 'Epochs', vi: 'Epochs' },
      min: 10,
      max,
      ...(mobileMax === undefined ? {} : { maxByDeviceProfile: { mobile: mobileMax } }),
      step: 10,
    };
  },
  learningRate: {
    id: 'learningRate',
    kind: 'number',
    label: { en: 'Learning rate', vi: 'Tốc độ học' },
    min: 0.0001,
    max: 1,
    step: 0.01,
  },
  seed: {
    id: 'seed',
    kind: 'number',
    integer: true,
    label: { en: 'Seed', vi: 'Seed' },
    min: 0,
    max: 1_000_000,
    step: 1,
  },
  trainRatio: {
    id: 'trainRatio',
    kind: 'number',
    label: { en: 'Train split', vi: 'Tỷ lệ train' },
    min: 0.5,
    max: 0.9,
    step: 0.05,
  },
} satisfies Record<
  string,
  PlaygroundParameterField | ((max: number, mobileMax?: number) => PlaygroundParameterField)
>;

const playgroundPairRegistry = [
  {
    scenarioId: 'pg-xor',
    algorithmId: 'perceptron',
    datasetVersionId: 'ds-xor-noisy-v1',
    adapterVersion: 'tfjs-core-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    },
    defaultConfigName: 'XOR baseline',
    intro: {
      en: 'Run a one-layer Perceptron on the fixed XOR dataset and inspect why a linear boundary fails.',
      vi: 'Chạy Perceptron một lớp trên dataset XOR cố định và quan sát vì sao ranh giới tuyến tính thất bại.',
    },
    parameterFields: [
      commonParameterFields.learningRate,
      commonParameterFields.epochs(500, 200),
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'accuracy',
    title: { en: 'XOR Playground: Perceptron', vi: 'Playground XOR: Perceptron' },
    adapter: xorPerceptronAdapter,
  },
  {
    scenarioId: 'pg-xor',
    algorithmId: 'mlp',
    datasetVersionId: 'ds-xor-noisy-v1',
    adapterVersion: 'tfjs-layers-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      hiddenLayers: [4],
      activation: 'tanh',
      learningRate: 0.05,
      epochs: 300,
      trainRatio: 0.75,
      seed: 42,
    },
    defaultConfigName: 'XOR MLP baseline',
    intro: {
      en: 'Train a small MLP on the same fixed XOR split to show how a hidden layer solves the nonlinear pattern.',
      vi: 'Huấn luyện một MLP nhỏ trên cùng split XOR cố định để thấy hidden layer xử lý quan hệ phi tuyến.',
    },
    parameterFields: [
      {
        id: 'hiddenLayers',
        itemMax: 32,
        itemMaxByDeviceProfile: { mobile: 16 },
        itemMin: 1,
        kind: 'integer-array',
        label: { en: 'Hidden layers', vi: 'Hidden layers' },
        maxItems: 3,
        maxItemsByDeviceProfile: { mobile: 2 },
      },
      {
        id: 'activation',
        kind: 'enum',
        label: { en: 'Activation', vi: 'Activation' },
        options: [
          { value: 'tanh', label: { en: 'tanh', vi: 'tanh' } },
          { value: 'relu', label: { en: 'ReLU', vi: 'ReLU' } },
          { value: 'sigmoid', label: { en: 'sigmoid', vi: 'sigmoid' } },
        ],
      },
      commonParameterFields.learningRate,
      commonParameterFields.epochs(1000, 500),
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'accuracy',
    title: { en: 'XOR Playground: MLP', vi: 'Playground XOR: MLP' },
    adapter: createMlpAdapter(),
  },
  {
    scenarioId: 'pg-nonlinear-2d',
    algorithmId: 'mlp',
    datasetVersionId: 'ds-moons-2d-v1',
    adapterVersion: 'tfjs-layers-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      hiddenLayers: [8, 8],
      activation: 'tanh',
      learningRate: 0.03,
      epochs: 500,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Nonlinear moons MLP baseline',
    intro: {
      en: 'Train a two-layer MLP on fixed noisy moons and inspect nonlinear accuracy and loss.',
      vi: 'Huan luyen MLP hai lop tren noisy moons co dinh va xem accuracy, loss phi tuyen.',
    },
    parameterFields: [
      {
        id: 'hiddenLayers',
        itemMax: 32,
        itemMaxByDeviceProfile: { mobile: 16 },
        itemMin: 1,
        kind: 'integer-array',
        label: { en: 'Hidden layers', vi: 'Hidden layers' },
        maxItems: 3,
        maxItemsByDeviceProfile: { mobile: 2 },
      },
      {
        id: 'activation',
        kind: 'enum',
        label: { en: 'Activation', vi: 'Activation' },
        options: [
          { value: 'tanh', label: { en: 'tanh', vi: 'tanh' } },
          { value: 'relu', label: { en: 'ReLU', vi: 'ReLU' } },
          { value: 'sigmoid', label: { en: 'sigmoid', vi: 'sigmoid' } },
        ],
      },
      commonParameterFields.learningRate,
      commonParameterFields.epochs(1000, 500),
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'accuracy',
    title: {
      en: 'Nonlinear 2D Playground: MLP',
      vi: 'Playground nonlinear 2D: MLP',
    },
    adapter: createMlpAdapter({
      datasetVersionId: 'ds-moons-2d-v1',
      scaleFeatures: true,
      scenarioId: 'pg-nonlinear-2d',
    }),
  },
  {
    scenarioId: 'pg-house-price',
    algorithmId: 'linear-regression',
    datasetVersionId: 'ds-house-price-v1',
    adapterVersion: 'tfjs-core-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      fitIntercept: true,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'House linear baseline',
    intro: {
      en: 'Fit linear regression on the fixed house-price dataset and compare predictions with residual error.',
      vi: 'Fit hồi quy tuyến tính trên dataset giá nhà cố định rồi so sánh dự đoán với sai số residual.',
    },
    parameterFields: [
      {
        id: 'fitIntercept',
        kind: 'boolean',
        label: { en: 'Fit intercept', vi: 'Fit intercept' },
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'rmse',
    title: {
      en: 'House price Playground: Linear regression',
      vi: 'Playground giá nhà: Hồi quy tuyến tính',
    },
    adapter: createLinearRegressionAdapter(),
  },
  {
    scenarioId: 'pg-house-price',
    algorithmId: 'ridge-regression',
    datasetVersionId: 'ds-house-price-v1',
    adapterVersion: 'tfjs-core-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      alpha: 1,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'House ridge baseline',
    intro: {
      en: 'Fit ridge regression on the fixed house-price dataset and inspect the residual error and coefficient shrinkage.',
      vi: 'Fit hồi quy Ridge trên dataset giá nhà cố định và xem sai số residual cùng độ co hệ số.',
    },
    parameterFields: [
      {
        id: 'alpha',
        kind: 'number',
        label: { en: 'Regularization alpha', vi: 'Hệ số regularization' },
        min: 0.0001,
        max: 100,
        step: 0.1,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'rmse',
    title: {
      en: 'House price Playground: Ridge regression',
      vi: 'Playground giá nhà: Hồi quy Ridge',
    },
    adapter: createRidgeRegressionAdapter(),
  },
  {
    scenarioId: 'pg-insurance-cost',
    algorithmId: 'polynomial-regression',
    datasetVersionId: 'ds-insurance-cost-v1',
    adapterVersion: 'tfjs-core-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      degree: 2,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Insurance polynomial baseline',
    intro: {
      en: 'Fit a degree-two polynomial model to the fixed insurance-cost data and inspect residual error.',
      vi: 'Fit mô hình đa thức bậc hai trên dữ liệu chi phí bảo hiểm cố định và xem sai số residual.',
    },
    parameterFields: [
      {
        id: 'degree',
        integer: true,
        kind: 'number',
        label: { en: 'Polynomial degree', vi: 'Bậc đa thức' },
        min: 1,
        max: 5,
        maxByDeviceProfile: { mobile: 3 },
        step: 1,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'mae',
    title: {
      en: 'Insurance cost Playground: Polynomial regression',
      vi: 'Playground chi phí bảo hiểm: Hồi quy đa thức',
    },
    adapter: createPolynomialRegressionAdapter(),
  },
  {
    scenarioId: 'pg-insurance-cost',
    algorithmId: 'lasso-regression',
    datasetVersionId: 'ds-insurance-cost-v1',
    adapterVersion: 'tfjs-core-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      alpha: 0.1,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Insurance lasso baseline',
    intro: {
      en: 'Fit Lasso regression on the fixed insurance-cost data and inspect coefficient sparsity and residual error.',
      vi: 'Fit hồi quy Lasso trên dữ liệu chi phí bảo hiểm cố định và xem độ thưa hệ số cùng sai số residual.',
    },
    parameterFields: [
      {
        id: 'alpha',
        kind: 'number',
        label: { en: 'Regularization alpha', vi: 'Hệ số regularization' },
        min: 0.0001,
        max: 100,
        step: 0.1,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'mae',
    title: {
      en: 'Insurance cost Playground: Lasso regression',
      vi: 'Playground chi phí bảo hiểm: Hồi quy Lasso',
    },
    adapter: createLassoRegressionAdapter(),
  },
  {
    scenarioId: 'pg-spam-detection',
    algorithmId: 'logistic-regression',
    datasetVersionId: 'ds-sms-spam-v1',
    adapterVersion: 'tfjs-layers-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      learningRate: 0.05,
      epochs: 300,
      threshold: 0.5,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Spam logistic baseline',
    intro: {
      en: 'Run logistic regression on the fixed SMS-spam feature table and inspect F1, precision, and recall.',
      vi: 'Chạy hồi quy logistic trên bảng feature SMS spam cố định và xem F1, precision, recall.',
    },
    parameterFields: [
      commonParameterFields.learningRate,
      commonParameterFields.epochs(2000),
      {
        id: 'threshold',
        kind: 'number',
        label: { en: 'Threshold', vi: 'Ngưỡng' },
        min: 0,
        max: 1,
        step: 0.05,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'f1',
    title: {
      en: 'Spam detection Playground: Logistic regression',
      vi: 'Playground phát hiện spam: Hồi quy logistic',
    },
    adapter: createLogisticRegressionAdapter(),
  },
  {
    scenarioId: 'pg-spam-detection',
    algorithmId: 'naive-bayes',
    datasetVersionId: 'ds-sms-spam-v1',
    adapterVersion: 'ml-naivebayes-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      alpha: 1,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Spam Naive Bayes baseline',
    intro: {
      en: 'Fit Naive Bayes on the fixed SMS feature table and inspect class smoothing, F1, precision, and recall.',
      vi: 'Fit Naive Bayes trên bảng feature SMS cố định và xem smoothing theo lớp, F1, precision, recall.',
    },
    parameterFields: [
      {
        id: 'alpha',
        kind: 'number',
        label: { en: 'Smoothing alpha', vi: 'Hệ số smoothing' },
        min: 0.0001,
        max: 100,
        step: 0.1,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'f1',
    title: {
      en: 'Spam detection Playground: Naive Bayes',
      vi: 'Playground phát hiện spam: Naive Bayes',
    },
    adapter: createNaiveBayesAdapter(),
  },
  {
    scenarioId: 'pg-customer-churn',
    algorithmId: 'knn',
    datasetVersionId: 'ds-customer-churn-v1',
    adapterVersion: 'ml-knn-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      k: 7,
      distance: 'euclidean',
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Customer churn KNN baseline',
    intro: {
      en: 'Classify fixed customer-churn rows with KNN and inspect F1, AUC, precision, and recall.',
      vi: 'Phan loai customer churn co dinh bang KNN va xem F1, AUC, precision, recall.',
    },
    parameterFields: [
      {
        id: 'k',
        integer: true,
        kind: 'number',
        label: { en: 'Nearest neighbors (k)', vi: 'So lang gieng (k)' },
        min: 1,
        max: 50,
        maxByDeviceProfile: { mobile: 25 },
        step: 1,
      },
      {
        id: 'distance',
        kind: 'enum',
        label: { en: 'Distance', vi: 'Khoang cach' },
        options: [{ value: 'euclidean', label: { en: 'Euclidean', vi: 'Euclidean' } }],
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'f1',
    title: {
      en: 'Customer churn Playground: KNN',
      vi: 'Playground customer churn: KNN',
    },
    adapter: createKnnAdapter(),
  },
  {
    scenarioId: 'pg-customer-churn',
    algorithmId: 'random-forest',
    datasetVersionId: 'ds-customer-churn-v1',
    adapterVersion: 'ml-random-forest-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      trees: 50,
      maxDepth: 6,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Customer churn Random Forest baseline',
    intro: {
      en: 'Train a seeded Random Forest on fixed customer-churn rows and inspect F1, AUC, precision, and recall.',
      vi: 'Huan luyen Random Forest seeded tren customer churn co dinh va xem F1, AUC, precision, recall.',
    },
    parameterFields: [
      {
        id: 'trees',
        integer: true,
        kind: 'number',
        label: { en: 'Trees', vi: 'So cay' },
        min: 1,
        max: 200,
        maxByDeviceProfile: { mobile: 50 },
        step: 1,
      },
      {
        id: 'maxDepth',
        integer: true,
        kind: 'number',
        label: { en: 'Max depth', vi: 'Do sau toi da' },
        min: 1,
        max: 15,
        maxByDeviceProfile: { mobile: 8 },
        step: 1,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'f1',
    title: {
      en: 'Customer churn Playground: Random Forest',
      vi: 'Playground customer churn: Random Forest',
    },
    adapter: createRandomForestAdapter(),
  },
  {
    scenarioId: 'pg-credit-risk',
    algorithmId: 'decision-tree',
    datasetVersionId: 'ds-credit-risk-v1',
    adapterVersion: 'ml-cart-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      maxDepth: 5,
      minSamplesLeaf: 5,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Credit tree baseline',
    intro: {
      en: 'Train a deterministic decision tree on fixed credit-risk rows and focus on recall.',
      vi: 'Huấn luyện decision tree tái lập trên dữ liệu rủi ro tín dụng cố định và tập trung vào recall.',
    },
    parameterFields: [
      {
        id: 'maxDepth',
        integer: true,
        kind: 'number',
        label: { en: 'Max depth', vi: 'Độ sâu tối đa' },
        min: 1,
        max: 15,
        maxByDeviceProfile: { mobile: 8 },
        step: 1,
      },
      {
        id: 'minSamplesLeaf',
        integer: true,
        kind: 'number',
        label: { en: 'Min samples per leaf', vi: 'Mẫu tối thiểu mỗi lá' },
        min: 1,
        max: 50,
        step: 1,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'recall',
    title: {
      en: 'Credit risk Playground: Decision tree',
      vi: 'Playground rủi ro tín dụng: Decision tree',
    },
    adapter: createDecisionTreeAdapter(),
  },
  {
    scenarioId: 'pg-credit-risk',
    algorithmId: 'logistic-regression',
    datasetVersionId: 'ds-credit-risk-v1',
    adapterVersion: 'tfjs-layers-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      learningRate: 0.05,
      epochs: 300,
      threshold: 0.4,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Credit logistic baseline',
    intro: {
      en: 'Train logistic regression on fixed credit-risk rows and inspect recall, F1, precision, and AUC.',
      vi: 'Huan luyen logistic regression tren du lieu rui ro tin dung co dinh va xem recall, F1, precision, AUC.',
    },
    parameterFields: [
      commonParameterFields.learningRate,
      commonParameterFields.epochs(2000),
      {
        id: 'threshold',
        kind: 'number',
        label: { en: 'Threshold', vi: 'Nguong' },
        min: 0,
        max: 1,
        step: 0.05,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'recall',
    title: {
      en: 'Credit risk Playground: Logistic regression',
      vi: 'Playground rui ro tin dung: Logistic regression',
    },
    adapter: createLogisticRegressionAdapter({
      datasetVersionId: 'ds-credit-risk-v1',
      includeAuc: true,
      primaryMetric: 'recall',
      scenarioId: 'pg-credit-risk',
    }),
  },
  {
    scenarioId: 'pg-credit-risk',
    algorithmId: 'svm',
    datasetVersionId: 'ds-credit-risk-v1',
    adapterVersion: 'libsvm-js-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      kernel: 'rbf',
      c: 1,
      gamma: 'scale',
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Credit RBF SVM baseline',
    intro: {
      en: 'Train an RBF SVM on fixed credit-risk rows and inspect recall, F1, and precision.',
      vi: 'Huan luyen SVM RBF tren du lieu rui ro tin dung co dinh va xem recall, F1, precision.',
    },
    parameterFields: [
      {
        id: 'kernel',
        kind: 'enum',
        label: { en: 'Kernel', vi: 'Kernel' },
        options: [{ value: 'rbf', label: { en: 'RBF', vi: 'RBF' } }],
      },
      {
        id: 'c',
        kind: 'number',
        label: { en: 'C', vi: 'C' },
        min: 0.001,
        max: 100,
        step: 0.1,
      },
      {
        id: 'gamma',
        kind: 'enum',
        label: { en: 'Gamma', vi: 'Gamma' },
        options: [{ value: 'scale', label: { en: 'scale', vi: 'scale' } }],
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'recall',
    title: {
      en: 'Credit risk Playground: RBF SVM',
      vi: 'Playground rui ro tin dung: RBF SVM',
    },
    adapter: createSvmAdapter(),
  },
  {
    scenarioId: 'pg-wine-cultivar',
    algorithmId: 'naive-bayes',
    datasetVersionId: 'ds-wine-cultivar-v1',
    adapterVersion: 'ml-naivebayes-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      smoothing: 0.000000001,
      trainRatio: 0.8,
      seed: 42,
    },
    defaultConfigName: 'Wine Naive Bayes baseline',
    intro: {
      en: 'Fit Gaussian Naive Bayes on fixed wine cultivars and inspect macro-F1 and accuracy.',
      vi: 'Fit Gaussian Naive Bayes tren cultivar wine co dinh va xem macro-F1, accuracy.',
    },
    parameterFields: [
      {
        id: 'smoothing',
        kind: 'number',
        label: { en: 'Variance smoothing', vi: 'Variance smoothing' },
        min: 0.000000000001,
        max: 1,
        step: 0.000000001,
      },
      commonParameterFields.trainRatio,
      commonParameterFields.seed,
    ],
    primaryMetricId: 'macro-f1',
    title: {
      en: 'Wine cultivar Playground: Naive Bayes',
      vi: 'Playground cultivar wine: Naive Bayes',
    },
    adapter: createNaiveBayesAdapter({
      configField: 'smoothing',
      datasetVersionId: 'ds-wine-cultivar-v1',
      primaryMetric: 'macro-f1',
      scenarioId: 'pg-wine-cultivar',
    }),
  },
  {
    scenarioId: 'pg-retail-segments',
    algorithmId: 'kmeans',
    datasetVersionId: 'ds-retail-segments-v1',
    adapterVersion: 'ml-kmeans-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      k: 4,
      maxIterations: 100,
      seed: 42,
    },
    defaultConfigName: 'Retail K-Means baseline',
    intro: {
      en: 'Cluster fixed retail-customer rows with K-Means and inspect silhouette and inertia.',
      vi: 'Phân cụm dữ liệu khách hàng bán lẻ cố định bằng K-Means và xem silhouette, inertia.',
    },
    parameterFields: [
      {
        id: 'k',
        integer: true,
        kind: 'number',
        label: { en: 'Clusters (k)', vi: 'Số cụm (k)' },
        min: 2,
        max: 10,
        maxByDeviceProfile: { mobile: 8 },
        step: 1,
      },
      {
        id: 'maxIterations',
        integer: true,
        kind: 'number',
        label: { en: 'Max iterations', vi: 'Vòng lặp tối đa' },
        min: 10,
        max: 300,
        step: 10,
      },
      commonParameterFields.seed,
    ],
    primaryMetricId: 'silhouette',
    title: {
      en: 'Retail segments Playground: K-Means',
      vi: 'Playground phân nhóm bán lẻ: K-Means',
    },
    adapter: createKMeansAdapter(),
  },
  {
    scenarioId: 'pg-retail-segments',
    algorithmId: 'hierarchical-clustering',
    datasetVersionId: 'ds-retail-segments-v1',
    adapterVersion: 'ml-hclust-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      linkage: 'ward',
      distance: 'euclidean',
      clusters: 4,
    },
    defaultConfigName: 'Retail Ward clustering baseline',
    intro: {
      en: 'Merge fixed retail rows with Ward linkage and inspect silhouette and the dendrogram cut.',
      vi: 'Gop cac dong retail co dinh bang Ward linkage va xem silhouette cung diem cat dendrogram.',
    },
    parameterFields: [
      {
        id: 'linkage',
        kind: 'enum',
        label: { en: 'Linkage', vi: 'Linkage' },
        options: [{ value: 'ward', label: { en: 'Ward', vi: 'Ward' } }],
      },
      {
        id: 'distance',
        kind: 'enum',
        label: { en: 'Distance', vi: 'Khoang cach' },
        options: [{ value: 'euclidean', label: { en: 'Euclidean', vi: 'Euclidean' } }],
      },
      {
        id: 'clusters',
        integer: true,
        kind: 'number',
        label: { en: 'Clusters', vi: 'So cum' },
        min: 2,
        max: 12,
        maxByDeviceProfile: { mobile: 8 },
        step: 1,
      },
    ],
    primaryMetricId: 'silhouette',
    title: {
      en: 'Retail segments Playground: Hierarchical clustering',
      vi: 'Playground phan nhom ban le: Hierarchical clustering',
    },
    adapter: createHierarchicalClusteringAdapter(),
  },
  {
    scenarioId: 'pg-country-indicators',
    algorithmId: 'pca',
    datasetVersionId: 'ds-country-indicators-v1',
    adapterVersion: 'ml-pca-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      components: 2,
      scale: true,
    },
    defaultConfigName: 'Country PCA baseline',
    intro: {
      en: 'Project fixed synthetic country indicators into two PCA components and inspect explained variance.',
      vi: 'Chiếu dữ liệu chỉ báo quốc gia tổng hợp cố định vào hai thành phần PCA và xem phương sai giải thích.',
    },
    parameterFields: [
      {
        id: 'components',
        integer: true,
        kind: 'number',
        label: { en: 'Components', vi: 'Components' },
        min: 2,
        max: 2,
        step: 1,
      },
      {
        id: 'scale',
        kind: 'boolean',
        label: { en: 'Scale features', vi: 'Scale features' },
      },
    ],
    primaryMetricId: 'explained-variance',
    title: {
      en: 'Country indicators Playground: PCA',
      vi: 'Playground chỉ số quốc gia: PCA',
    },
    adapter: createPcaAdapter(),
  },
] satisfies readonly PlaygroundPairRegistration[];

export function getPlaygroundPairRegistry(): readonly PlaygroundPairRegistration[] {
  return playgroundPairRegistry;
}

export function resolveAlgorithmAdapter(
  request: Pick<MlRunRequest, 'algorithmId' | 'datasetVersionId' | 'scenarioId'>,
): AlgorithmAdapter | null {
  return (
    playgroundPairRegistry.find(
      (entry) =>
        entry.scenarioId === request.scenarioId &&
        entry.algorithmId === request.algorithmId &&
        entry.datasetVersionId === request.datasetVersionId,
    )?.adapter ?? null
  );
}
