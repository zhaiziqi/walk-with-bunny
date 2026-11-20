/** Navigation and later business progress are separate from visual animation. */
export type View = 'overview' | 'puzzle' | 'music' | 'lock' | 'gift';
export type Bit = 0 | 1;
export type BitDraft = [Bit | null, Bit | null, Bit | null, Bit | null];
export type CardProgress = {
  output: BitDraft;
  stage: 'bits' | 'decimal' | 'solved';
  decimalInput: string;
  segment: string | null;
};
export type Progress = {
  version: 1;
  cards: { A: CardProgress; B: CardProgress };
  puzzleSolved: boolean;
  bridgeSeen: boolean;
  giftUnlocked: boolean;
  lastDraw: { songId: number; drawId: string; drawnAt: string } | null;
};

export function createInitialProgress(): Progress {
  const emptyCard = (): CardProgress => ({
    output: [null, null, null, null],
    stage: 'bits',
    decimalInput: '',
    segment: null,
  });
  return {
    version: 1,
    cards: { A: emptyCard(), B: emptyCard() },
    puzzleSolved: false,
    bridgeSeen: false,
    giftUnlocked: false,
    lastDraw: null,
  };
}

/** M1 passes the default false: no URL or visual interaction unlocks a gift. */
export function viewFromHash(hash: string, giftUnlocked = false): View {
  switch (hash.replace(/^#/, '')) {
    case 'puzzle': return 'puzzle';
    case 'music': return 'music';
    case 'lock': return 'lock';
    case 'gift': return giftUnlocked ? 'gift' : 'lock';
    default: return 'overview';
  }
}
