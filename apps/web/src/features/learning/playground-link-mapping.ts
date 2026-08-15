const scenarioIdByAlgorithmId: Readonly<Record<string, string>> = {
  'decision-tree': 'pg-credit-risk',
  'hierarchical-clustering': 'pg-retail-segments',
  kmeans: 'pg-retail-segments',
  knn: 'pg-customer-churn',
  'lasso-regression': 'pg-insurance-cost',
  'linear-regression': 'pg-house-price',
  'logistic-regression': 'pg-spam-detection',
  mlp: 'pg-nonlinear-2d',
  'naive-bayes': 'pg-wine-cultivar',
  pca: 'pg-country-indicators',
  perceptron: 'pg-xor',
  'polynomial-regression': 'pg-insurance-cost',
  'random-forest': 'pg-customer-churn',
  'ridge-regression': 'pg-house-price',
  svm: 'pg-credit-risk',
};

const displayNames: Readonly<Record<string, string>> = {
  'decision-tree': 'Decision Tree',
  'hierarchical-clustering': 'Hierarchical Clustering',
  kmeans: 'K-Means',
  knn: 'KNN',
  'lasso-regression': 'Lasso Regression',
  'linear-regression': 'Linear Regression',
  'logistic-regression': 'Logistic Regression',
  mlp: 'MLP',
  'naive-bayes': 'Naive Bayes',
  pca: 'PCA',
  perceptron: 'Perceptron',
  'polynomial-regression': 'Polynomial Regression',
  'random-forest': 'Random Forest',
  'ridge-regression': 'Ridge Regression',
  svm: 'SVM',
};

export function getPlaygroundPathForAlgorithm(algorithmId: string): string | null {
  const scenarioId = scenarioIdByAlgorithmId[algorithmId];

  return scenarioId ? `/playground/${scenarioId}` : null;
}

export function formatAlgorithmName(algorithmId: string): string {
  return displayNames[algorithmId] ?? 'Algorithm';
}
