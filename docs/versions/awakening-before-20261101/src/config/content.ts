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
  if (!condition) throw new Error(`花园内容配置无效：${field}`);
}

/** Developer-facing validation. This does not reveal or complete any puzzle. */
export function validateContent(value: unknown): asserts value is Content {
  requireValid(record(value), '配置必须是对象');
  for (const group of ['site', 'people', 'garden', 'puzzle', 'music', 'gift', 'theme', 'assets']) {
    requireValid(record(value[group]), `${group} 必须是对象`);
  }
  const site = value.site as Record<string, unknown>;
  const people = value.people as Record<string, unknown>;
  const garden = value.garden as Record<string, unknown>;
  const puzzle = value.puzzle as Record<string, unknown>;
  const music = value.music as Record<string, unknown>;
  const gift = value.gift as Record<string, unknown>;
  const assets = value.assets as Record<string, unknown>;
  const theme = value.theme as Record<string, unknown>;

  requireValid(typeof site.title === 'string' && typeof site.description === 'string', 'site 标题与说明');
  requireValid(site.locale === 'zh-CN' && record(site.welcome), 'site.locale / welcome');
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
    requireValid(record(landmark) && typeof landmark.label === 'string' && typeof landmark.hint === 'string', '地标名称与提示');
    return landmark.view;
  }).join(',') === 'puzzle,music,lock', '地标视图及顺序');

  requireValid(puzzle.code === '0305' && puzzle.key === '1001', '固定密码与解码片');
  requireValid(puzzle.segmentDigits === 2, 'puzzle.segmentDigits');
  requireValid(Array.isArray(puzzle.weights) && puzzle.weights.join(',') === '8,4,2,1', 'puzzle.weights');
  requireValid(Array.isArray(puzzle.signals) && puzzle.signals.length === 2, 'puzzle.signals');
  const expectedSignals = [{ id: 'A', bits: '1010' }, { id: 'B', bits: '1100' }];
  const derivedCode = puzzle.signals.map((signal: unknown, index: number) => {
    requireValid(record(signal), 'signal');
    requireValid(signal.id === expectedSignals[index].id && signal.bits === expectedSignals[index].bits, '信号 ID、内容及顺序');
    const output = [...String(signal.bits)].map((bit, i) => bit === String(puzzle.key)[i] ? '0' : '1').join('');
    return parseInt(output, 2).toString().padStart(Number(puzzle.segmentDigits), '0');
  }).join('');
  requireValid(derivedCode === puzzle.code, '谜题推导与密码不一致');
  for (const [key, item] of Object.entries(puzzle)) {
    if (!['weights', 'signals', 'segmentDigits'].includes(key)) requireValid(typeof item === 'string', `puzzle.${key}`);
  }

  requireValid(music.mode === 'independent-with-replacement', 'music.mode');
  requireValid(Array.isArray(music.songs) && music.songs.length === 9, '必须有九首曲目');
  const ids = music.songs.map((song: unknown) => {
    requireValid(record(song) && Number.isInteger(song.id), '曲目 ID');
    requireValid(typeof song.title === 'string' && typeof song.reason === 'string' && typeof song.placeholder === 'boolean', '曲目标题、理由与占位标记');
    return Number(song.id);
  });
  requireValid([...ids].sort((a, b) => a - b).join(',') === '1,2,3,4,5,6,7,8,9', '曲目 ID 必须完整且不重复');
  for (const [key, item] of Object.entries(music)) {
    if (key !== 'songs') requireValid(typeof item === 'string', `music.${key}`);
  }
  for (const [key, item] of Object.entries(gift)) {
    if (key === 'placeholder') requireValid(typeof item === 'boolean', 'gift.placeholder');
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
