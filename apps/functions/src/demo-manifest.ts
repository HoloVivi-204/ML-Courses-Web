import { ApiError } from './api-error.js';
import { getReleaseLearningCatalog } from './release-learning-catalog.js';

export interface DemoCompletionSeed {
  demoId: string;
  moduleId: string;
  requiredStepIds: readonly string[];
}

const handAuthoredDemoCompletionSeeds: Readonly<Record<string, DemoCompletionSeed>> = {
  'demo-perceptron-and-gate': {
    demoId: 'demo-perceptron-and-gate',
    moduleId: 'dl-m01-neuron-perceptron',
    requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
  },
  'demo-mlp-checkerboard': {
    demoId: 'demo-mlp-checkerboard',
    moduleId: 'dl-m02-mlp',
    requiredStepIds: [
      'checkerboard-problem',
      'checkerboard-data',
      'checkerboard-hidden-activation',
      'checkerboard-output',
    ],
  },
};

function createDemoCompletionSeeds() {
  const generatedSeeds: Record<string, DemoCompletionSeed> = {};

  for (const module of getReleaseLearningCatalog().courses.flatMap((course) => course.modules)) {
    if (!module.demoId || handAuthoredDemoCompletionSeeds[module.demoId]) {
      continue;
    }

    generatedSeeds[module.demoId] = {
      demoId: module.demoId,
      moduleId: module.moduleId,
      requiredStepIds: ['problem', 'data', 'decision', 'result'],
    };
  }

  return {
    ...generatedSeeds,
    ...handAuthoredDemoCompletionSeeds,
  };
}

const demoCompletionSeeds: Readonly<Record<string, DemoCompletionSeed>> =
  createDemoCompletionSeeds();

export function getDemoCompletionSeed(demoId: string): DemoCompletionSeed {
  const seed = demoCompletionSeeds[demoId];

  if (!seed) {
    throw new ApiError(404, 'DEMO_NOT_FOUND', 'The requested demo was not found.');
  }

  return seed;
}

export function assertRequiredDemoStepsViewed(demoId: string, viewedStepIds: readonly string[]) {
  const seed = getDemoCompletionSeed(demoId);
  const viewedStepIdSet = new Set(viewedStepIds);
  const missingStepIds = seed.requiredStepIds.filter((stepId) => !viewedStepIdSet.has(stepId));

  if (missingStepIds.length > 0) {
    throw new ApiError(
      400,
      'REQUIRED_DEMO_STEPS_MISSING',
      'All required demo steps must be viewed before completion.',
      [{ missingStepIds }],
    );
  }

  return seed;
}
