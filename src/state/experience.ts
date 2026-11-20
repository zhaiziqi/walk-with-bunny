import { acceptAnswer, activeQuestionIndex, isPuzzleComplete } from '../lib/puzzle';
import { isSongDraw } from '../lib/draw';
import { acceptGiftCode } from '../lib/gift';

/** Gift and puzzle progress is independent from navigation, animation and ambient discoveries. */
export type View = 'overview' | 'puzzle' | 'music' | 'rest' | 'lock' | 'gift';
export type QuestionProgress = { input: string; digit: string | null };
export type Progress = {
  version: 2;
  questions: QuestionProgress[];
  puzzleSolved: boolean;
  envelopeStored: boolean;
  giftUnlocked: boolean;
  sleepMaskFound: boolean;
  lastDraw: { songId: number; drawId: string; drawnAt: string } | null;
};

export function createInitialProgress(): Progress {
  return {
    version: 2,
    questions: Array.from({ length: 4 }, () => ({ input: '', digit: null })),
    puzzleSolved: false,
    envelopeStored: false,
    giftUnlocked: false,
    sleepMaskFound: false,
    lastDraw: null,
  };
}

export type ProgressAction =
  | { type: 'set-answer'; index: number; value: string }
  | { type: 'submit-answer'; index: number }
  | { type: 'store-envelope' }
  | { type: 'unlock-gift'; code: string }
  | { type: 'FIND_SLEEP_MASK' }
  | { type: 'record-draw'; draw: NonNullable<Progress['lastDraw']> };

export function progressReducer(state: Progress, action: ProgressAction): Progress {
  if (action.type === 'FIND_SLEEP_MASK') {
    return state.sleepMaskFound ? state : { ...state, sleepMaskFound: true };
  }
  if (action.type === 'unlock-gift') {
    if (state.giftUnlocked || !acceptGiftCode(action.code)) return state;
    return { ...state, giftUnlocked: true };
  }
  if (action.type === 'record-draw') {
    if (!isSongDraw(action.draw) || state.lastDraw?.drawId === action.draw.drawId) return state;
    const { songId, drawId, drawnAt } = action.draw;
    return { ...state, lastDraw: { songId, drawId, drawnAt } };
  }
  if (action.type === 'store-envelope') {
    if (!isPuzzleComplete(state.questions) || state.envelopeStored) return state;
    return { ...state, puzzleSolved: true, envelopeStored: true };
  }
  if (action.type !== 'set-answer' && action.type !== 'submit-answer') return state;
  const index = action.index;
  if (!Number.isInteger(index) || index < 0 || index >= state.questions.length
    || index !== activeQuestionIndex(state)) return state;
  const question = state.questions[index];
  if (action.type === 'set-answer') {
    // Keep wrong drafts visible, but bound data written from any caller.
    if (typeof action.value !== 'string' || action.value.length > 64 || question.input === action.value) return state;
    const questions = state.questions.map((item, i) => i === index ? { input: action.value, digit: null } : item);
    return { ...state, questions };
  }
  const digit = acceptAnswer(index, question.input);
  if (digit === null) return state;
  const questions = state.questions.map((item, i) => i === index ? { ...item, digit } : item);
  return { ...state, questions, puzzleSolved: isPuzzleComplete(questions) };
}

/** No URL or visual interaction unlocks a gift. */
export function viewFromHash(hash: string, giftUnlocked = false): View {
  switch (hash.replace(/^#/, '')) {
    case 'puzzle': return 'puzzle';
    case 'music': return 'music';
    case 'rest': return 'rest';
    case 'lock': return 'lock';
    case 'gift': return giftUnlocked ? 'gift' : 'lock';
    default: return 'overview';
  }
}
