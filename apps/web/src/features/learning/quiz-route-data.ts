import { courses, type LocalizedText } from '../catalog/course-data';

export interface PublicQuizRoute {
  courseId: string;
  demoId: string | null;
  moduleId: string;
  postId: string | null;
  requiredPostIds: readonly string[];
  title: LocalizedText;
  quizId: string;
  quizKind: 'module' | 'post';
}

function createPostQuizId(postId: string) {
  const stablePrefix = /^(cml|dl)-p\d{2}/.exec(postId)?.[0];

  return stablePrefix ? `quiz-post-${stablePrefix}` : `quiz-post-${postId}`;
}

function createModuleQuizId(moduleId: string) {
  const stablePrefix = /^(cml|dl)-m\d{2}/.exec(moduleId)?.[0];

  return stablePrefix ? `quiz-module-${stablePrefix}` : `quiz-module-${moduleId}`;
}

function createPostQuizTitle(moduleId: string, moduleTitle: LocalizedText): LocalizedText {
  if (moduleId === 'dl-m01-neuron-perceptron') {
    return {
      en: 'Perceptron/XOR quiz',
      vi: 'Quiz Perceptron/XOR',
    };
  }

  return {
    en: `${moduleTitle.en} lesson quiz`,
    vi: `Quiz bài học ${moduleTitle.vi}`,
  };
}

function createModuleQuizTitle(moduleId: string, moduleTitle: LocalizedText): LocalizedText {
  if (moduleId === 'dl-m01-neuron-perceptron') {
    return {
      en: 'Perceptron/XOR quiz',
      vi: 'Quiz Perceptron/XOR',
    };
  }

  return {
    en: `${moduleTitle.en} module quiz`,
    vi: `Quiz module ${moduleTitle.vi}`,
  };
}

const publicQuizRoutes: readonly PublicQuizRoute[] = courses.flatMap((course) =>
  (course.modules ?? []).flatMap((module) => [
    ...module.postIds.map((postId) => ({
      courseId: course.id,
      demoId: null,
      moduleId: module.id,
      postId,
      quizId: createPostQuizId(postId),
      quizKind: 'post' as const,
      requiredPostIds: [postId],
      title: createPostQuizTitle(module.id, module.title),
    })),
    {
      courseId: course.id,
      demoId: module.demoId,
      moduleId: module.id,
      postId: null,
      quizId: createModuleQuizId(module.id),
      quizKind: 'module' as const,
      requiredPostIds: module.postIds,
      title: createModuleQuizTitle(module.id, module.title),
    },
  ]),
);

export function getPublicQuizRoute(quizId: string | undefined): PublicQuizRoute | undefined {
  return publicQuizRoutes.find((quizRoute) => quizRoute.quizId === quizId);
}
