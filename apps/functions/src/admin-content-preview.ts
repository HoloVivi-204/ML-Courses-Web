import type { AdminContentDraft } from './admin-content-repository.js';
import { ApiError } from './api-error.js';
import {
  applyAdminDraftToPublishedLearnerContent,
  type LearnerCourseContent,
  type LearnerDemoContent,
  type LearnerModuleContent,
  type LearnerPostContent,
  type LearnerQuizContent,
  type PublishedLearnerContent,
} from './learning-content-repository.js';
import { getQuizManifest, type BaselineQuestionType } from './quiz-manifest.js';

export interface AdminContentPreviewQuestion {
  options: readonly {
    optionId: string;
    text: { en: string; vi: string };
  }[];
  prompt: { en: string; vi: string };
  questionId: string;
  sourceId: string;
  type: BaselineQuestionType;
}

export type AdminContentRevisionPreview =
  | {
      contentType: 'course';
      course: LearnerCourseContent;
    }
  | {
      contentType: 'demo';
      demo: LearnerDemoContent;
    }
  | {
      contentType: 'module';
      module: LearnerModuleContent;
    }
  | {
      contentType: 'post';
      post: LearnerPostContent;
    }
  | {
      contentType: 'quiz';
      questions: readonly AdminContentPreviewQuestion[];
      quiz: LearnerQuizContent;
    };

function createQuizPreviewQuestions(quizId: string): readonly AdminContentPreviewQuestion[] {
  return getQuizManifest(quizId).questions.map((question) => ({
    options: question.options.map((option) => ({
      optionId: option.optionId,
      text: { ...option.text },
    })),
    prompt: { ...question.prompt },
    questionId: question.questionId,
    sourceId: question.sourceId,
    type: question.type,
  }));
}

export function createAdminContentRevisionPreview(input: {
  draft: AdminContentDraft;
  learnerContent: PublishedLearnerContent | null;
}): AdminContentRevisionPreview {
  const previewContent = applyAdminDraftToPublishedLearnerContent(input);

  if (previewContent === null) {
    throw new ApiError(
      409,
      'ADMIN_CONTENT_PREVIEW_UNAVAILABLE',
      'The draft does not have learner content available for preview.',
    );
  }

  switch (previewContent.contentType) {
    case 'course':
      return { contentType: 'course', course: previewContent.course };
    case 'demo':
      return { contentType: 'demo', demo: previewContent.demo };
    case 'module':
      return { contentType: 'module', module: previewContent.module };
    case 'post':
      return { contentType: 'post', post: previewContent.fullPost };
    case 'quiz':
      return {
        contentType: 'quiz',
        questions: createQuizPreviewQuestions(previewContent.quiz.quizId),
        quiz: previewContent.quiz,
      };
  }
}
