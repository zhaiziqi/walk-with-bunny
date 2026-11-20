import { content } from '../config/content';
import type { Progress } from '../state/experience';

export type SongDraw = NonNullable<Progress['lastDraw']>;
type SongText = { id: number; title: string };
let drawSequence = 0;

/** Exactly one uniform sample, with no dependency on the previous song. */
export function pickSongId(random: () => number = Math.random): number {
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError('The song random source must return a number in [0, 1).');
  }
  return Math.floor(sample * content.music.songs.length) + 1;
}

/** Identity is separate from selection: drawing the same song creates a new event. */
export function createSongDraw(random: () => number = Math.random): SongDraw {
  const songId = pickSongId(random);
  const drawnAt = new Date().toISOString();
  const sequence = ++drawSequence;
  let identity = drawnAt;
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') identity = globalThis.crypto.randomUUID();
  } catch { /* Event identity still works when browser crypto is unavailable. */ }
  return { songId, drawId: `${identity}:${sequence}`, drawnAt };
}

/** Reject malformed commands without modifying unrelated business progress. */
export function isSongDraw(value: unknown): value is SongDraw {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const draw = value as Record<string, unknown>;
  return typeof draw.songId === 'number' && Number.isInteger(draw.songId)
    && content.music.songs.some(song => song.id === draw.songId)
    && typeof draw.drawId === 'string' && draw.drawId.trim().length > 0 && draw.drawId.length <= 256
    && typeof draw.drawnAt === 'string' && draw.drawnAt.length <= 40
    && /^\d{4}-\d{2}-\d{2}T/.test(draw.drawnAt) && Number.isFinite(Date.parse(draw.drawnAt));
}

/** Use the selected card's actual text; replacement text is never a regex template. */
export function formatSongRequest(song: SongText, template = content.music.copyTextTemplate): string {
  const values = { id: String(song.id).padStart(2, '0'), title: song.title };
  return template.replace(/\{\{(id|title)\}\}/g, (_, key: 'id' | 'title') => values[key]);
}
