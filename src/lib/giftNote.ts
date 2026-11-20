import { isPuzzleComplete } from './puzzle';
import type { Progress } from '../state/experience';

/** A view of the earned paper, never a shortcut to the configured password. */
export function getGiftNote(progress: Pick<Progress, 'questions' | 'envelopeStored'>): { digits: string[]; packed: boolean } | null {
  const questions = progress?.questions;
  if (!Array.isArray(questions) || !questions.every(question => question !== null && typeof question === 'object'
    && typeof question.input === 'string' && typeof question.digit === 'string')
    || !isPuzzleComplete(questions)) return null;
  return { digits: questions.map(question => question.digit!), packed: progress.envelopeStored === true };
}
