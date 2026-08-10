import { localize, type Locale } from '../catalog/course-data';
import { FixedDemoFrame } from '../learning/fixed-demo-frame';
import { QuizQuestionChoices } from '../learning/quiz-question-choices';
import type { AdminContentRevisionPreview, QuizAnswerValue } from '../learning/learning-api';
import { ContentBlockRenderer } from '../learning/content-block-renderer';
import type { Theme } from '../../shared/theme/use-theme';

interface AdminLearnerRevisionPreviewProps {
  locale: Locale;
  preview: AdminContentRevisionPreview;
  theme: Theme;
}

const emptyAnswers: Readonly<Record<string, QuizAnswerValue>> = {};

export function AdminLearnerRevisionPreview({
  locale,
  preview,
  theme,
}: AdminLearnerRevisionPreviewProps) {
  return (
    <section
      className={`admin-learner-preview admin-learner-preview-${preview.contentType}`}
      data-preview-theme={theme}
      data-testid={`admin-learner-preview-${preview.contentType}`}
    >
      {renderPreviewContent(preview, locale)}
    </section>
  );
}

function renderPreviewContent(preview: AdminContentRevisionPreview, locale: Locale) {
  switch (preview.contentType) {
    case 'course':
      return (
        <section className="learning-course-card">
          <span className="eyebrow">COURSE / LEARNER VIEW</span>
          <h3>{localize(preview.course.title, locale)}</h3>
          <p>{localize(preview.course.description, locale)}</p>
          <code>{preview.course.revisionId}</code>
        </section>
      );
    case 'module':
      return (
        <article className="learning-module-card">
          <div className="learning-module-card-body">
            <div className="learning-module-card-heading">
              <div>
                <code>{preview.module.moduleId}</code>
                <h3>{localize(preview.module.title, locale)}</h3>
              </div>
              <span className="module-state open">OPEN</span>
            </div>
            <p>{localize(preview.module.description, locale)}</p>
            <code>{preview.module.revisionId}</code>
          </div>
        </article>
      );
    case 'post':
      return (
        <article className="admin-learner-post-preview">
          <header className="lesson-heading">
            <span className="eyebrow">POST / LEARNER VIEW</span>
            <h3>{localize(preview.post.title, locale)}</h3>
            <p>{localize(preview.post.description, locale)}</p>
            <code>{preview.post.revisionId}</code>
          </header>
          <ContentBlockRenderer
            blocks={preview.post.blocks}
            locale={locale}
            postId={preview.post.id}
          />
        </article>
      );
    case 'demo': {
      const firstStep = preview.demo.steps[0];

      if (!firstStep) {
        return null;
      }

      return (
        <article className="admin-learner-demo-preview">
          <header className="demo-heading">
            <span className="eyebrow">FIXED DEMO / LEARNER VIEW</span>
            <h3>{localize(preview.demo.title, locale)}</h3>
            <code>{preview.demo.revisionId}</code>
          </header>
          <section className="and-demo-card" aria-labelledby={`preview-${firstStep.id}`}>
            <FixedDemoFrame demo={preview.demo} locale={locale} step={firstStep} stepIndex={0} />
            <div className="and-demo-copy">
              <span className="demo-step-count">1 / {preview.demo.steps.length}</span>
              <h4 id={`preview-${firstStep.id}`}>{localize(firstStep.title, locale)}</h4>
              <p>{localize(firstStep.narration, locale)}</p>
            </div>
          </section>
        </article>
      );
    }
    case 'quiz':
      return (
        <article className="admin-learner-quiz-preview">
          <header className="quiz-heading">
            <span className="eyebrow">QUIZ / LEARNER VIEW</span>
            <h3>{localize(preview.quiz.title, locale)}</h3>
            <p>{localize(preview.quiz.description, locale)}</p>
            <code>{preview.quiz.revisionId}</code>
          </header>
          <div className="quiz-form">
            {preview.questions.map((question, questionIndex) => (
              <fieldset className="quiz-question-card" key={question.questionId}>
                <legend>
                  <span>{String(questionIndex + 1).padStart(2, '0')}</span>
                  {localize(question.prompt, locale)}
                </legend>
                <QuizQuestionChoices
                  answersByQuestionId={emptyAnswers}
                  disabled
                  locale={locale}
                  onAnswerChange={() => undefined}
                  question={question}
                />
                <code>{question.sourceId}</code>
              </fieldset>
            ))}
          </div>
        </article>
      );
  }
}
