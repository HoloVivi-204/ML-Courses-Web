export interface PublicQuizRoute {
  courseId: string;
  moduleId: string;
  postId: string | null;
  quizId: string;
  quizKind: 'module' | 'post';
}

const publicQuizRoutes: readonly PublicQuizRoute[] = [
  {
    courseId: 'course-deep-learning-basic',
    moduleId: 'dl-m01-neuron-perceptron',
    postId: 'dl-p01-neuron-perceptron',
    quizId: 'quiz-post-dl-p01',
    quizKind: 'post',
  },
  {
    courseId: 'course-deep-learning-basic',
    moduleId: 'dl-m01-neuron-perceptron',
    postId: null,
    quizId: 'quiz-module-dl-m01',
    quizKind: 'module',
  },
];

export function getPublicQuizRoute(quizId: string | undefined): PublicQuizRoute | undefined {
  return publicQuizRoutes.find((quizRoute) => quizRoute.quizId === quizId);
}
