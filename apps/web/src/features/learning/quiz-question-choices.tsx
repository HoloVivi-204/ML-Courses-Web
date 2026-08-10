import { localize, type Locale } from '../catalog/course-data';

import type { QuizAnswerValue, QuizAttemptResult } from './learning-api';

export function QuizQuestionChoices({
  answersByQuestionId,
  disabled,
  locale,
  onAnswerChange,
  question,
}: {
  answersByQuestionId: Readonly<Record<string, QuizAnswerValue>>;
  disabled: boolean;
  locale: Locale;
  onAnswerChange: (optionId: string) => void;
  question: Pick<QuizAttemptResult['questions'][number], 'options' | 'questionId' | 'type'>;
}) {
  return (
    <div className="quiz-option-list">
      {question.options.map((option) => (
        <label className="quiz-option" key={option.optionId}>
          <input
            checked={isOptionSelected(answersByQuestionId[question.questionId], option.optionId)}
            disabled={disabled}
            name={question.questionId}
            onChange={() => onAnswerChange(option.optionId)}
            type={question.type === 'multiple-choice' ? 'checkbox' : 'radio'}
            value={option.optionId}
          />
          <span>{localize(option.text, locale)}</span>
        </label>
      ))}
    </div>
  );
}

function isOptionSelected(value: QuizAnswerValue | undefined, optionId: string): boolean {
  if (Array.isArray(value)) {
    return value.includes(optionId);
  }

  return value === optionId;
}
