import type { LockedContentScope } from './content-scope-validator.js';

export type ContentSourceAdapter = 'github-markdown' | 'html-article';

export interface LocalizedAttributionTemplate {
  en: string;
  vi: string;
}

export interface ContentSourceLicense {
  declaredName: string;
  id: string;
  url: string;
}

export interface ContentSource {
  adapter: ContentSourceAdapter;
  allowedHostnames: readonly string[];
  attributionTemplate: LocalizedAttributionTemplate;
  authorOrPublisher: string;
  canonicalUrl: string;
  contentUrls: readonly string[];
  license: ContentSourceLicense;
  reviewStatus: 'pending-operator-review';
  sourceId: string;
  termsUrl: string;
  title: string;
}

const contentSourceRegistry: readonly ContentSource[] = [
  {
    adapter: 'github-markdown',
    allowedHostnames: ['docs.github.com', 'github.com', 'raw.githubusercontent.com'],
    attributionTemplate: {
      en: 'Adapted as a concise original summary from Microsoft ML for Beginners; source review is pending.',
      vi: 'Diễn giải ngắn gọn, nguyên gốc từ Microsoft ML for Beginners; đang chờ review nguồn.',
    },
    authorOrPublisher: 'Microsoft',
    canonicalUrl: 'https://github.com/microsoft/ML-For-Beginners',
    contentUrls: [
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/2-Regression/1-Tools/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/2-Regression/2-Data/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/2-Regression/3-Linear/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/2-Regression/4-Logistic/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/4-Classification/1-Introduction/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/4-Classification/2-Classifiers-1/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/4-Classification/3-Classifiers-2/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/5-Clustering/1-Visualize/README.md',
      'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/5-Clustering/2-K-Means/README.md',
    ],
    license: {
      declaredName: 'MIT License',
      id: 'MIT',
      url: 'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/LICENSE',
    },
    reviewStatus: 'pending-operator-review',
    sourceId: 'microsoft-ml-for-beginners',
    termsUrl: 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
    title: 'Microsoft ML for Beginners',
  },
  {
    adapter: 'html-article',
    allowedHostnames: ['creativecommons.org', 'developers.google.com'],
    attributionTemplate: {
      en: 'Adapted as a concise original summary from Google Machine Learning Crash Course; source review is pending.',
      vi: 'Diễn giải ngắn gọn, nguyên gốc từ Google Machine Learning Crash Course; đang chờ review nguồn.',
    },
    authorOrPublisher: 'Google',
    canonicalUrl: 'https://developers.google.com/machine-learning/crash-course',
    contentUrls: [
      'https://developers.google.com/machine-learning/crash-course',
      'https://developers.google.com/machine-learning/crash-course/categorical-data',
      'https://developers.google.com/machine-learning/crash-course/classification',
      'https://developers.google.com/machine-learning/crash-course/linear-regression',
      'https://developers.google.com/machine-learning/crash-course/logistic-regression',
      'https://developers.google.com/machine-learning/crash-course/neural-networks',
      'https://developers.google.com/machine-learning/crash-course/numerical-data',
      'https://developers.google.com/machine-learning/crash-course/overfitting',
    ],
    license: {
      declaredName: 'Creative Commons Attribution 4.0',
      id: 'CC-BY-4.0',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    reviewStatus: 'pending-operator-review',
    sourceId: 'google-ml-crash-course',
    termsUrl: 'https://developers.google.com/terms/site-terms',
    title: 'Google Machine Learning Crash Course',
  },
  {
    adapter: 'html-article',
    allowedHostnames: ['creativecommons.org', 'ocw.mit.edu'],
    attributionTemplate: {
      en: 'Adapted as a concise original summary from MIT OpenCourseWare; source review is pending.',
      vi: 'Diễn giải ngắn gọn, nguyên gốc từ MIT OpenCourseWare; đang chờ review nguồn.',
    },
    authorOrPublisher: 'MIT OpenCourseWare',
    canonicalUrl:
      'https://ocw.mit.edu/courses/res-tll-008-social-and-ethical-responsibilities-of-computing-serc/pages/privacy-surveillance/introduction-to-machine-learning/',
    contentUrls: [
      'https://ocw.mit.edu/courses/res-tll-008-social-and-ethical-responsibilities-of-computing-serc/pages/privacy-surveillance/introduction-to-machine-learning/',
    ],
    license: {
      declaredName: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0',
      id: 'CC-BY-NC-SA-4.0',
      url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    },
    reviewStatus: 'pending-operator-review',
    sourceId: 'mit-ocw',
    termsUrl: 'https://ocw.mit.edu/pages/privacy-and-terms-of-use/',
    title: 'MIT OpenCourseWare: Introduction to Machine Learning',
  },
  {
    adapter: 'html-article',
    allowedHostnames: ['github.com', 'scikit-learn.org'],
    attributionTemplate: {
      en: 'Adapted as a concise original summary from scikit-learn documentation; source review is pending.',
      vi: 'Diễn giải ngắn gọn, nguyên gốc từ tài liệu scikit-learn; đang chờ review nguồn.',
    },
    authorOrPublisher: 'scikit-learn developers',
    canonicalUrl: 'https://scikit-learn.org/stable/',
    contentUrls: [
      'https://scikit-learn.org/stable/modules/clustering.html',
      'https://scikit-learn.org/stable/modules/decomposition.html',
      'https://scikit-learn.org/stable/modules/ensemble.html',
      'https://scikit-learn.org/stable/modules/linear_model.html',
      'https://scikit-learn.org/stable/modules/naive_bayes.html',
      'https://scikit-learn.org/stable/modules/neighbors.html',
      'https://scikit-learn.org/stable/modules/svm.html',
      'https://scikit-learn.org/stable/modules/tree.html',
    ],
    license: {
      declaredName: 'BSD 3-Clause License',
      id: 'BSD-3-Clause',
      url: 'https://github.com/scikit-learn/scikit-learn/blob/main/COPYING',
    },
    reviewStatus: 'pending-operator-review',
    sourceId: 'sklearn-docs',
    termsUrl: 'https://scikit-learn.org/stable/about.html',
    title: 'scikit-learn User Guide',
  },
  {
    adapter: 'html-article',
    allowedHostnames: [
      'creativecommons.org',
      'docs.github.com',
      'github.com',
      'raw.githubusercontent.com',
    ],
    attributionTemplate: {
      en: 'Adapted as a concise original summary from Dive into Deep Learning Vietnamese; source review is pending.',
      vi: 'Diễn giải ngắn gọn, nguyên gốc từ Đắm mình vào Học Sâu; đang chờ review nguồn.',
    },
    authorOrPublisher: 'Dive into Deep Learning authors and Vietnamese translators',
    canonicalUrl: 'https://github.com/d2l-ai/d2l-vi',
    contentUrls: [
      'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/index.md',
      'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/chapter_multilayer-perceptrons/backprop.md',
      'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/chapter_multilayer-perceptrons/mlp.md',
      'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/chapter_multilayer-perceptrons/underfit-overfit.md',
    ],
    license: {
      declaredName: 'Creative Commons Attribution-ShareAlike 4.0',
      id: 'CC-BY-SA-4.0',
      url: 'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/LICENSE',
    },
    reviewStatus: 'pending-operator-review',
    sourceId: 'd2l-vi',
    termsUrl: 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
    title: 'Dive into Deep Learning Vietnamese',
  },
  {
    adapter: 'github-markdown',
    allowedHostnames: ['docs.github.com', 'github.com', 'raw.githubusercontent.com'],
    attributionTemplate: {
      en: 'Adapted as a concise original summary from Microsoft AI for Beginners; source review is pending.',
      vi: 'Diễn giải ngắn gọn, nguyên gốc từ Microsoft AI for Beginners; đang chờ review nguồn.',
    },
    authorOrPublisher: 'Microsoft',
    canonicalUrl: 'https://github.com/microsoft/AI-For-Beginners',
    contentUrls: [
      'https://raw.githubusercontent.com/microsoft/AI-For-Beginners/main/README.md',
      'https://raw.githubusercontent.com/microsoft/AI-For-Beginners/main/lessons/3-NeuralNetworks/03-Perceptron/README.md',
      'https://raw.githubusercontent.com/microsoft/AI-For-Beginners/main/lessons/3-NeuralNetworks/04-OwnFramework/README.md',
      'https://raw.githubusercontent.com/microsoft/AI-For-Beginners/main/lessons/3-NeuralNetworks/05-Frameworks/README.md',
    ],
    license: {
      declaredName: 'MIT License',
      id: 'MIT',
      url: 'https://raw.githubusercontent.com/microsoft/AI-For-Beginners/main/LICENSE',
    },
    reviewStatus: 'pending-operator-review',
    sourceId: 'microsoft-ai-for-beginners',
    termsUrl: 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
    title: 'Microsoft AI for Beginners',
  },
  {
    adapter: 'html-article',
    allowedHostnames: ['creativecommons.org', 'developers.google.com', 'www.tensorflow.org'],
    attributionTemplate: {
      en: 'Adapted as a concise original summary from TensorFlow tutorials; source review is pending.',
      vi: 'Diễn giải ngắn gọn, nguyên gốc từ TensorFlow tutorials; đang chờ review nguồn.',
    },
    authorOrPublisher: 'TensorFlow',
    canonicalUrl: 'https://www.tensorflow.org/tutorials',
    contentUrls: [
      'https://www.tensorflow.org/tutorials',
      'https://www.tensorflow.org/tutorials/quickstart/beginner',
      'https://www.tensorflow.org/tutorials/keras/classification',
    ],
    license: {
      declaredName: 'Creative Commons Attribution 4.0 for page content',
      id: 'CC-BY-4.0-content',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    reviewStatus: 'pending-operator-review',
    sourceId: 'tensorflow-tutorials',
    termsUrl: 'https://developers.google.com/terms/site-terms',
    title: 'TensorFlow Tutorials',
  },
];

export function getContentSourceRegistry(): readonly ContentSource[] {
  return contentSourceRegistry;
}

export function getContentSource(sourceId: string): ContentSource {
  const source = contentSourceRegistry.find((candidate) => candidate.sourceId === sourceId);

  if (!source) {
    throw new Error(`Source ${sourceId} is not in the allowlisted content source registry.`);
  }

  return source;
}

export function assertContentSourceRegistryMatchesScope(scope: LockedContentScope): void {
  const registrySourceIds = contentSourceRegistry.map((source) => source.sourceId).sort();

  if (JSON.stringify(registrySourceIds) !== JSON.stringify(scope.sourceIds)) {
    throw new Error('Content source registry must exactly match content-skeleton.yaml source IDs.');
  }
}
