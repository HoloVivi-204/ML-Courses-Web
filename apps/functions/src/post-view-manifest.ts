import { getReadablePost } from './release-learning-content.js';
import { getReleaseLearningCatalog } from './release-learning-catalog.js';

export interface PostViewManifest {
  postId: string;
  requiredBlockIds: readonly string[];
}

export function getPostViewManifest(postId: string): PostViewManifest | null {
  const course = getReleaseLearningCatalog().courses.find((candidate) =>
    candidate.modules.some((module) => module.posts.some((post) => post.postId === postId)),
  );

  if (!course) {
    return null;
  }

  const post = getReadablePost(course.courseId, postId, true);

  if (!post) {
    return null;
  }

  return {
    postId,
    requiredBlockIds: post.blocks.filter((block) => block.required).map((block) => block.id),
  };
}
