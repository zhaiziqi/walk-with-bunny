import type { Progress } from './experience';

export function sameProgress(left: Progress, right: Progress): boolean {
  return left.version === right.version && left.puzzleSolved === right.puzzleSolved
    && left.envelopeStored === right.envelopeStored && left.giftUnlocked === right.giftUnlocked
    && left.sleepMaskFound === right.sleepMaskFound
    && left.questions.every((question, index) => question.input === right.questions[index].input
      && question.digit === right.questions[index].digit)
    && left.lastDraw?.drawId === right.lastDraw?.drawId
    && left.lastDraw?.songId === right.lastDraw?.songId
    && left.lastDraw?.drawnAt === right.lastDraw?.drawnAt;
}

/** Both records have already been normalized. There is no progress-reset command. */
export function mergeProgress(current: Progress, stored: Progress, observed: Progress): Progress {
  const questions = current.questions.map((question, index) => {
    const incoming = stored.questions[index];
    // A confirmed answer cannot be erased by an older tab's draft. When both
    // confirmed it, accept the stored spelling (e.g. "0" versus " 0 ") so tabs
    // cannot endlessly repair equivalent answers back to their own spelling.
    if (incoming.digit !== null) return incoming;
    if (question.digit !== null) return question;
    // Preserve a draft whose write failed; otherwise take the latest stored draft,
    // including an intentional clear. The next local action is applied afterwards.
    return question.input !== observed.questions[index].input ? question : incoming;
  });
  const localDraw = current.lastDraw;
  const remoteDraw = stored.lastDraw;
  const unsavedDraw = localDraw && localDraw.drawId !== observed.lastDraw?.drawId;
  let lastDraw = remoteDraw ?? localDraw;
  if (unsavedDraw && (!remoteDraw || Date.parse(localDraw.drawnAt) > Date.parse(remoteDraw.drawnAt))) lastDraw = localDraw;
  const merged: Progress = {
    version: 2, questions,
    puzzleSolved: questions.every(question => question.digit !== null),
    envelopeStored: current.envelopeStored || stored.envelopeStored,
    giftUnlocked: current.giftUnlocked || stored.giftUnlocked,
    sleepMaskFound: current.sleepMaskFound || stored.sleepMaskFound,
    lastDraw,
  };
  return sameProgress(current, merged) ? current : merged;
}
