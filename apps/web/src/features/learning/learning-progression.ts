import type { CourseModule, CourseSummary } from '../catalog/course-data';
import type {
  LearningCourseProgress,
  LearningModuleProgress,
  LearningProgressSnapshot,
} from './learning-api';

export interface LearningModuleProgressEntry {
  missingPrerequisiteIds: readonly string[];
  module: CourseModule;
  progress: LearningModuleProgress;
}

export function getLearningCourseProgress(
  progressSnapshot: LearningProgressSnapshot,
  courseId: string,
): LearningCourseProgress | undefined {
  return progressSnapshot.courses?.find((course) => course.courseId === courseId);
}

export function getLearningModuleProgressEntries(
  course: CourseSummary,
  progressSnapshot: LearningProgressSnapshot,
): readonly LearningModuleProgressEntry[] {
  const courseProgress = getLearningCourseProgress(progressSnapshot, course.id);
  const progressByModuleId = new Map(
    (courseProgress?.modules ?? progressSnapshot.modules).map((progress) => [
      progress.moduleId,
      progress,
    ]),
  );

  return (course.modules ?? []).map((module) => {
    const progress = progressByModuleId.get(module.id) ?? createLockedModuleProgress(module);

    return {
      missingPrerequisiteIds: getMissingPrerequisiteIds(course, module, progressByModuleId),
      module,
      progress,
    };
  });
}

function createLockedModuleProgress(module: CourseModule): LearningModuleProgress {
  return {
    completedStepCount: 0,
    moduleId: module.id,
    overviewViewed: false,
    progressPercent: 0,
    requiredStepCount: module.postIds.length + (module.demoId ? 1 : 0) + 2,
    status: 'locked',
  };
}

function getMissingPrerequisiteIds(
  course: CourseSummary,
  module: CourseModule,
  progressByModuleId: ReadonlyMap<string, LearningModuleProgress>,
): readonly string[] {
  const previousModules = (course.modules ?? []).filter(
    (candidate) => candidate.index < module.index,
  );

  return previousModules
    .filter((candidate) => progressByModuleId.get(candidate.id)?.status !== 'completed')
    .map((candidate) => candidate.id);
}
