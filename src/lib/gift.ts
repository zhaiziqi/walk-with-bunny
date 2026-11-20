import { content } from '../config/content';

/** Keep the leading zero: this is a four-character code, never a number. */
export function acceptGiftCode(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const code = value.trim();
  return /^\d{4}$/.test(code) && code === content.puzzle.code;
}
