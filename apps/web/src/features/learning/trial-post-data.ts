import type { LocalizedText } from '../catalog/course-data';

export interface TrialPost {
  activityId: string;
  courseId: string;
  description: LocalizedText;
  durationMinutes: number;
  id: string;
  moduleId: string;
  title: LocalizedText;
}

const trialPosts: readonly TrialPost[] = [
  {
    activityId: 'act-dl-p01-neuron-perceptron-example',
    courseId: 'course-deep-learning-basic',
    description: {
      en: 'See how inputs, weights, and a bias become one explainable decision.',
      vi: 'Quan sát cách đầu vào, trọng số và độ lệch tạo thành một quyết định có thể giải thích.',
    },
    durationMinutes: 8,
    id: 'dl-p01-neuron-perceptron',
    moduleId: 'dl-m01-neuron-perceptron',
    title: {
      en: 'How does a neuron make a decision?',
      vi: 'Một neuron đưa ra quyết định như thế nào?',
    },
  },
];

export function getTrialPost(courseId: string | undefined, postId: string | undefined) {
  return trialPosts.find((post) => post.courseId === courseId && post.id === postId);
}
