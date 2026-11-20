import source from './content.json' with { type: 'json' };

type Source = typeof source;
export type Content = Omit<Source, 'assets' | 'gift'> & {
  assets: { [K in keyof Source['assets']]: string | null };
  gift: Omit<Source['gift'], 'imageSrc'> & { imageSrc: string | null };
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function requireValid(condition: unknown, field: string): asserts condition {
  if (!condition) throw new Error(`Invalid garden content: ${field}`);
}

/** Developer-facing validation. This does not reveal or complete any puzzle. */
export function validateContent(value: unknown): asserts value is Content {
  requireValid(record(value), 'Content must be an object');
  for (const group of ['site', 'people', 'garden', 'puzzle', 'music', 'gift', 'theme', 'assets']) {
    requireValid(record(value[group]), `${group} must be an object`);
  }
  const site = value.site as Record<string, unknown>;
  const people = value.people as Record<string, unknown>;
  const garden = value.garden as Record<string, unknown>;
  const puzzle = value.puzzle as Record<string, unknown>;
  const music = value.music as Record<string, unknown>;
  const gift = value.gift as Record<string, unknown>;
  const assets = value.assets as Record<string, unknown>;
  const theme = value.theme as Record<string, unknown>;

  requireValid(typeof site.title === 'string' && typeof site.description === 'string', 'site title and description');
  requireValid(site.locale === 'en' && record(site.welcome), 'site.locale / welcome');
  for (const key of ['title', 'body', 'startLabel', 'continueLabel', 'musicShortcutLabel']) {
    requireValid(typeof site.welcome[key] === 'string', `site.welcome.${key}`);
  }
  requireValid(typeof people.recipientName === 'string' && typeof people.senderName === 'string', 'people');
  requireValid(garden.direction === 'walk-in-garden', 'garden.direction');
  for (const key of ['overviewHint', 'approachLabel', 'returnLabel', 'soundOnLabel', 'soundOffLabel']) {
    requireValid(typeof garden[key] === 'string', `garden.${key}`);
  }
  requireValid(Array.isArray(garden.landmarks) && garden.landmarks.length === 3, 'garden.landmarks');
  requireValid(garden.landmarks.map((landmark: unknown) => {
    requireValid(record(landmark) && typeof landmark.label === 'string' && typeof landmark.hint === 'string', 'landmark names and hints');
    return landmark.view;
  }).join(',') === 'puzzle,music,lock', 'landmark views and order');

  requireValid(puzzle.code === '0305' && puzzle.kind === 'computer-knowledge-v1', 'fixed code and puzzle kind');
  requireValid(Array.isArray(puzzle.questions) && puzzle.questions.length === 4, 'exactly four questions required');
  const expected = [{ id: 'python', answer: '0' }, { id: 'tcp', answer: '3' }, { id: 'xor', answer: '0' }, { id: 'binary', answer: '5' }];
  const derivedCode = puzzle.questions.map((question: unknown, index: number) => {
    requireValid(record(question), 'question');
    requireValid(question.id === expected[index].id && question.answer === expected[index].answer, 'question IDs, answers and order');
    for (const field of ['topic', 'prompt', 'hint', 'explanation']) {
      requireValid(typeof question[field] === 'string' && question[field].trim(), `question.${field}`);
    }
    return question.answer;
  }).join('');
  requireValid(derivedCode === puzzle.code, 'derived puzzle answer does not match the code');
  for (const field of ['title', 'intro', 'envelopeLabel', 'keepLabel']) {
    requireValid(typeof puzzle[field] === 'string', `puzzle.${field}`);
  }

  requireValid(music.mode === 'independent-with-replacement', 'music.mode');
  requireValid(Array.isArray(music.songs) && music.songs.length === 9, 'exactly nine songs required');
  const ids = music.songs.map((song: unknown) => {
    requireValid(record(song) && Number.isInteger(song.id), 'song IDs');
    requireValid(typeof song.title === 'string' && typeof song.reason === 'string' && typeof song.placeholder === 'boolean', 'song titles, reasons and placeholder flags');
    return Number(song.id);
  });
  requireValid([...ids].sort((a, b) => a - b).join(',') === '1,2,3,4,5,6,7,8,9', 'song IDs must be complete and unique');
  for (const [key, item] of Object.entries(music)) {
    if (key !== 'songs') requireValid(typeof item === 'string', `music.${key}`);
  }
  for (const [key, item] of Object.entries(gift)) {
    if (key === 'items') {
      requireValid(Array.isArray(item) && item.length === 2, 'gift.items');
      requireValid(item.map(entry => {
        requireValid(record(entry) && typeof entry.name === 'string' && entry.name.trim(), 'gift item name');
        return entry.id;
      }).join(',') === 'passport-holder,sleep-mask', 'gift item IDs and order');
    }
    else if (key === 'placeholder') requireValid(typeof item === 'boolean', 'gift.placeholder');
    else if (key === 'imageSrc') requireValid(item === null || (typeof item === 'string' && item.startsWith('/assets/')), 'gift.imageSrc');
    else requireValid(typeof item === 'string', `gift.${key}`);
  }
  for (const key of Object.keys(source.assets)) {
    requireValid(assets[key] === null || (typeof assets[key] === 'string' && assets[key].startsWith('/assets/')), `assets.${key}`);
  }
  for (const [key, color] of Object.entries(theme)) {
    requireValid(typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color), `theme.${key}`);
  }
}

validateContent(source);
/** The only runtime source for personal content and the fixed product rules. */
export const content: Content = source;
