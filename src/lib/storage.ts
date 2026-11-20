import { content } from '../config/content';
import { createInitialProgress } from '../state/experience';
import type { Progress, QuestionProgress } from '../state/experience';
import { acceptAnswer, isPuzzleComplete } from './puzzle';
import { isSongDraw } from './draw';

export const STORAGE_KEY = `birthday-gift:${content.puzzle.code}:v2`;
export const LEGACY_STORAGE_KEY = `birthday-gift:${content.puzzle.code}:v1`;
export type StorageStatus = 'saved' | 'memory';
export type ProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadedProgress = { progress: Progress; storageStatus: StorageStatus };
export type SharedProgress = { progress: Progress | null; storageStatus: StorageStatus };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function restoredDraw(raw: unknown): Progress['lastDraw'] {
  if (!isSongDraw(raw)) return null;
  const { songId, drawId, drawnAt } = raw;
  return { songId, drawId, drawnAt };
}

/** Select known business fields; route, camera and animation fields never enter storage. */
export function normalizeProgress(raw: unknown): Progress {
  const initial = createInitialProgress();
  if (!record(raw) || (raw.version !== 1 && raw.version !== 2)) return initial;
  const independent = { giftUnlocked: raw.giftUnlocked === true, lastDraw: restoredDraw(raw.lastDraw) };
  // The old two-card exercise is not proof of answering the four original questions.
  // Its song/gift results remain valid, while its original storage record stays intact.
  if (raw.version === 1) return { ...initial, ...independent };
  const source = Array.isArray(raw.questions) && raw.questions.length === 4 ? raw.questions : [];
  let prefixComplete = true;
  const questions: QuestionProgress[] = initial.questions.map((empty, index) => {
    if (!prefixComplete) return empty;
    const question = source[index];
    if (!record(question)) { prefixComplete = false; return empty; }
    const input = typeof question.input === 'string' && question.input.length <= 64 ? question.input : '';
    const answer = acceptAnswer(index, input);
    const digit = answer !== null && question.digit === answer ? answer : null;
    if (digit === null) prefixComplete = false;
    return { input, digit };
  });
  const puzzleSolved = isPuzzleComplete(questions);
  return { version: 2, questions, puzzleSolved,
    envelopeStored: puzzleSolved && raw.envelopeStored === true,
    sleepMaskFound: raw.sleepMaskFound === true, ...independent };
}

function browserStorage(): ProgressStorage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

/** Cross-tab updates accept only this app's current schema, never a foreign record. */
export function loadSharedProgress(storage: ProgressStorage | null = browserStorage()): SharedProgress {
  if (!storage) return { progress: null, storageStatus: 'memory' };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { progress: null, storageStatus: 'saved' };
    try {
      const value: unknown = JSON.parse(raw);
      return { progress: record(value) && value.version === 2 ? normalizeProgress(value) : null, storageStatus: 'saved' };
    } catch { return { progress: null, storageStatus: 'saved' }; }
  } catch { return { progress: null, storageStatus: 'memory' }; }
}

/** A missing new record may import independent results once; never overwrite the old key. */
export function loadProgress(storage: ProgressStorage | null = browserStorage()): LoadedProgress {
  if (!storage) return { progress: createInitialProgress(), storageStatus: 'memory' };
  try {
    let raw = storage.getItem(STORAGE_KEY);
    if (raw === null) raw = storage.getItem(LEGACY_STORAGE_KEY);
    if (raw === null) return { progress: createInitialProgress(), storageStatus: 'saved' };
    try { return { progress: normalizeProgress(JSON.parse(raw)), storageStatus: 'saved' }; }
    catch { return { progress: createInitialProgress(), storageStatus: 'saved' }; }
  } catch {
    return { progress: createInitialProgress(), storageStatus: 'memory' };
  }
}

export function saveProgress(progress: Progress, storage: ProgressStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress))); return true; }
  catch { return false; }
}
