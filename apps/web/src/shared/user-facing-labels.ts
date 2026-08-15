export type UserFacingLocale = 'en' | 'vi';

const algorithmLabels: Record<string, { en: string; vi: string }> = {
  'decision-tree': { en: 'Decision tree', vi: 'Cây quyết định' },
  'hierarchical-clustering': { en: 'Hierarchical clustering', vi: 'Phân cụm phân cấp' },
  kmeans: { en: 'K-Means', vi: 'K-Means' },
  knn: { en: 'K-Nearest Neighbors', vi: 'K-Nearest Neighbors' },
  'lasso-regression': { en: 'Lasso regression', vi: 'Hồi quy Lasso' },
  'linear-regression': { en: 'Linear regression', vi: 'Hồi quy tuyến tính' },
  'logistic-regression': { en: 'Logistic regression', vi: 'Hồi quy logistic' },
  mlp: { en: 'MLP', vi: 'MLP' },
  'naive-bayes': { en: 'Naive Bayes', vi: 'Naive Bayes' },
  pca: { en: 'PCA', vi: 'PCA' },
  perceptron: { en: 'Perceptron', vi: 'Perceptron' },
  'polynomial-regression': { en: 'Polynomial regression', vi: 'Hồi quy đa thức' },
  'random-forest': { en: 'Random forest', vi: 'Rừng ngẫu nhiên' },
  'ridge-regression': { en: 'Ridge regression', vi: 'Hồi quy Ridge' },
  svm: { en: 'Support vector machine', vi: 'Máy vector hỗ trợ' },
};

const scenarioLabels: Record<string, { en: string; vi: string }> = {
  'pg-country-indicators': { en: 'Country indicators', vi: 'Chỉ báo quốc gia' },
  'pg-credit-risk': { en: 'Credit risk', vi: 'Rủi ro tín dụng' },
  'pg-customer-churn': { en: 'Customer churn', vi: 'Rời bỏ khách hàng' },
  'pg-house-price': { en: 'House price', vi: 'Giá nhà' },
  'pg-insurance-cost': { en: 'Insurance cost', vi: 'Chi phí bảo hiểm' },
  'pg-nonlinear-2d': { en: 'Nonlinear 2D', vi: '2D phi tuyến' },
  'pg-retail-segments': { en: 'Retail segments', vi: 'Phân khúc bán lẻ' },
  'pg-spam-detection': { en: 'Spam detection', vi: 'Phát hiện spam' },
  'pg-wine-cultivar': { en: 'Wine cultivar', vi: 'Giống nho' },
  'pg-xor': { en: 'XOR', vi: 'XOR' },
};

export function formatAlgorithmName(algorithmId: string, locale: UserFacingLocale): string {
  return algorithmLabels[algorithmId]?.[locale] ?? (locale === 'vi' ? 'Thuật toán' : 'Algorithm');
}

export function formatScenarioName(scenarioId: string, locale: UserFacingLocale): string {
  return (
    scenarioLabels[scenarioId]?.[locale] ??
    (locale === 'vi' ? 'Kịch bản thực hành' : 'Practice scenario')
  );
}

export function formatLessonLabel(number: number, locale: UserFacingLocale): string {
  return locale === 'vi' ? `Bài học ${number}` : `Lesson ${number}`;
}

export function formatPracticeLabel(locale: UserFacingLocale): string {
  return locale === 'vi' ? 'Bài thực hành' : 'Interactive practice';
}

export function formatUserFacingTitle(title: string): string {
  const cleanedTitle = title
    .replace(/^\s*demo\s*[:-]?\s*/i, '')
    .replace(/\s+demo\s*:\s*/i, ': ')
    .replace(/\s+demo\s+/i, ' ')
    .trim();

  return cleanedTitle
    ? `${cleanedTitle.charAt(0).toUpperCase()}${cleanedTitle.slice(1)}`
    : cleanedTitle;
}
