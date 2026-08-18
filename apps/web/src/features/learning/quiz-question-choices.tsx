import { Check } from 'lucide-react';

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
      {question.options.map((option, optionIndex) => {
        const isSelected = isOptionSelected(
          answersByQuestionId[question.questionId],
          option.optionId,
        );

        return (
          <label
            className="quiz-option"
            data-selected={isSelected ? 'true' : 'false'}
            key={option.optionId}
          >
            <input
              checked={isSelected}
              disabled={disabled}
              name={question.questionId}
              onChange={() => onAnswerChange(option.optionId)}
              type={question.type === 'multiple-choice' ? 'checkbox' : 'radio'}
              value={option.optionId}
            />
            <span aria-hidden="true" className="quiz-option-key">
              {isSelected ? (
                <Check size={15} strokeWidth={3} />
              ) : (
                String.fromCharCode(65 + optionIndex)
              )}
            </span>
            <span className="quiz-option-copy">{localize(option.text, locale)}</span>
          </label>
        );
      })}
    </div>
  );
}

function isOptionSelected(value: QuizAnswerValue | undefined, optionId: string): boolean {
  if (Array.isArray(value)) {
    return value.includes(optionId);
  }

  return value === optionId;
}
