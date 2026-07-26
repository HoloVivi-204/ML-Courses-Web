import { describe, expect, it } from 'vitest';

import { assertRequiredDemoStepsViewed, getDemoCompletionSeed } from './demo-manifest.js';
import { getReleaseLearningCatalog } from './release-learning-catalog.js';

describe('demo manifest', () => {
  it('covers all ten fixed Release 1 demo IDs from the locked skeleton', () => {
    const demoModules = getReleaseLearningCatalog()
      .courses.flatMap((course) => course.modules)
      .filter((module) => module.demoId !== null);

    expect(demoModules).toHaveLength(10);

    for (const module of demoModules) {
      const seed = getDemoCompletionSeed(module.demoId!);

      expect(seed).toMatchObject({
        demoId: module.demoId,
        moduleId: module.moduleId,
      });
      expect(seed.requiredStepIds).toHaveLength(4);
    }
  });

  it('fails closed when a fixed demo is missing a required step', () => {
    expect(() =>
      assertRequiredDemoStepsViewed('demo-linear-calibration', ['problem', 'data', 'decision']),
    ).toThrowError(expect.objectContaining({ code: 'REQUIRED_DEMO_STEPS_MISSING' }));
  });
});
