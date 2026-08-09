import { describe, expect, it } from 'vitest';

import { getCourse } from '../catalog/course-data';
import type { LearningProgressSnapshot } from './learning-api';
import { getLearningModuleProgressEntries } from './learning-progression';

describe('learning progression mapping', () => {
  it('maps every catalog module and reports only unfinished prerequisites', () => {
    const course = getCourse('course-deep-learning-basic');
    const snapshot: LearningProgressSnapshot = {
      algorithmUnlocks: [],
      contentAccess: [],
      courses: [
        {
          courseId: 'course-deep-learning-basic',
          demos: [],
          modules: [
            {
              completedStepCount: 4,
              moduleId: 'dl-m01-neuron-perceptron',
              overviewViewed: true,
              progressPercent: 100,
              requiredStepCount: 4,
              status: 'completed',
            },
            {
              completedStepCount: 0,
              moduleId: 'dl-m02-mlp',
              overviewViewed: true,
              progressPercent: 0,
              requiredStepCount: 4,
              status: 'in-progress',
            },
            {
              completedStepCount: 0,
              moduleId: 'dl-m03-training-generalization',
              overviewViewed: false,
              progressPercent: 0,
              requiredStepCount: 4,
              status: 'locked',
            },
          ],
          posts: [],
          progressPercent: 33,
          quizzes: [],
          status: 'in-progress',
        },
      ],
      demos: [],
      enrollment: {
        courseId: 'course-deep-learning-basic',
        progressPercent: 33,
        status: 'in-progress',
      },
      modules: [],
      posts: [],
      quizzes: [],
    };

    expect(course).toBeDefined();
    const entries = getLearningModuleProgressEntries(course!, snapshot);

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.module.id)).toEqual([
      'dl-m01-neuron-perceptron',
      'dl-m02-mlp',
      'dl-m03-training-generalization',
    ]);
    expect(entries[1]?.progress.status).toBe('in-progress');
    expect(entries[2]?.missingPrerequisiteIds).toEqual(['dl-m02-mlp']);
  });

  it('falls back to the visible snapshot lists while keeping undisclosed modules locked', () => {
    const course = getCourse('course-classical-ml');
    const snapshot: LearningProgressSnapshot = {
      algorithmUnlocks: [],
      contentAccess: [],
      demos: [],
      enrollment: {
        courseId: 'course-classical-ml',
        progressPercent: 10,
        status: 'in-progress',
      },
      modules: [
        {
          completedStepCount: 1,
          moduleId: 'cml-m01-foundations',
          overviewViewed: true,
          progressPercent: 10,
          requiredStepCount: 10,
          status: 'in-progress',
        },
      ],
      posts: [],
      quizzes: [],
    };

    expect(course).toBeDefined();
    const entries = getLearningModuleProgressEntries(course!, snapshot);

    expect(entries[0]?.progress.status).toBe('in-progress');
    expect(entries[1]?.progress.status).toBe('locked');
    expect(entries[1]?.missingPrerequisiteIds).toEqual(['cml-m01-foundations']);
  });
});
