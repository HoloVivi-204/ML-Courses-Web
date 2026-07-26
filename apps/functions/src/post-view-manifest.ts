import { getReleaseLearningCatalog } from './release-learning-catalog.js';

export interface PostViewManifest {
  postId: string;
  requiredBlockIds: readonly string[];
}

const GENERIC_REQUIRED_BLOCK_SUFFIXES = [
  'goal',
  'concept',
  'cause-effect',
  'example',
  'example-prompt',
  'provenance',
  'quiz-prep',
] as const;

const PERCEPTRON_REQUIRED_BLOCK_IDS = [
  'what-is-a-neuron',
  'neuron-explanation',
  'neuron-insight',
  'weighted-sum',
  'weight-explanation',
  'weighted-sum-formula',
  'try-it',
  'read-result',
  'xor-linear-limit',
  'xor-truth-table',
  'stable-content-access',
  'from-perceptron-to-next-step',
] as const;

const PERCEPTRON_POST_ID = 'dl-p01-neuron-perceptron';

const knownPostIds = new Set(
  getReleaseLearningCatalog().courses.flatMap((course) =>
    course.modules.flatMap((module) => module.posts.map((post) => post.postId)),
  ),
);

export function getPostViewManifest(postId: string): PostViewManifest | null {
  if (!knownPostIds.has(postId)) {
    return null;
  }

  return {
    postId,
    requiredBlockIds:
      postId === PERCEPTRON_POST_ID
        ? PERCEPTRON_REQUIRED_BLOCK_IDS
        : GENERIC_REQUIRED_BLOCK_SUFFIXES.map((suffix) => `${postId}-${suffix}`),
  };
}
