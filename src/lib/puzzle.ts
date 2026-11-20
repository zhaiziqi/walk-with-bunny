import { content } from '../config/content';
import type { Progress, QuestionProgress } from '../state/experience';

/** Each original question contributes exactly one digit, including either zero. */
export function acceptAnswer(index: number, input: string): string | null {
  if (!Number.isInteger(index) || index < 0 || index >= content.puzzle.questions.length
    || typeof input !== 'string') return null;
  const digit = input.trim();
  return /^[0-9]$/.test(digit) && digit === content.puzzle.questions[index].answer ? digit : null;
}

export function isSolvedQuestion(index: number, question: QuestionProgress): boolean {
  return question.digit !== null && acceptAnswer(index, question.input) === question.digit;
}

/** Stored flags alone cannot award a password or complete a later question. */
export function isPuzzleComplete(questions: readonly QuestionProgress[]): boolean {
  return questions.length === content.puzzle.questions.length
    && questions.every((question, index) => isSolvedQuestion(index, question));
}

export function activeQuestionIndex(progress: Pick<Progress, 'questions'>): number {
  const index = progress.questions.findIndex((question, i) => !isSolvedQuestion(i, question));
  return index < 0 ? progress.questions.length : index;
}
