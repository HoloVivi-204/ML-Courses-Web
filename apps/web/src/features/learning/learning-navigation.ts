import { getCourse } from '../catalog/course-data';

import { getModuleQuizId, type PublicQuizRoute } from './quiz-route-data';

export type QuizContinueAction =
  | { kind: 'next-lesson'; path: string }
  | { kind: 'practice'; path: string }
  | { kind: 'module-quiz'; path: string }
  | { kind: 'next-module'; path: string }
  | { kind: 'module-overview'; path: string }
  | { kind: 'roadmap'; path: string };

export function getQuizContinueAction(quizRoute: PublicQuizRoute): QuizContinueAction {
  const course = getCourse(quizRoute.courseId);
  const module = course?.modules?.find((candidate) => candidate.id === quizRoute.moduleId);

  if (!course || !module) {
    return {
      kind: 'roadmap',
      path: `/learn/${quizRoute.courseId}`,
    };
  }

  if (quizRoute.quizKind === 'post' && quizRoute.postId) {
    const currentPostIndex = module.postIds.indexOf(quizRoute.postId);
    const nextPostId = module.postIds[currentPostIndex + 1];

    if (nextPostId) {
      return {
        kind: 'next-lesson',
        path: `/learn/${course.id}/posts/${nextPostId}`,
      };
    }

    if (module.demoId) {
      return {
        kind: 'practice',
        path: `/learn/${course.id}/demos/${module.demoId}`,
      };
    }

    return {
      kind: 'module-quiz',
      path: `/learn/${course.id}/quizzes/${getModuleQuizId(module.id)}`,
    };
  }

  const nextModule = course.modules
    ?.filter((candidate) => candidate.index > module.index)
    .sort((left, right) => left.index - right.index)[0];

  if (nextModule) {
    return {
      kind: 'next-module',
      path: `/learn/${course.id}/modules/${nextModule.id}`,
    };
  }

  return {
    kind: 'module-overview',
    path: `/learn/${course.id}/modules/${module.id}`,
  };
}
