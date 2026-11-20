import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, 'releases/desktop-preview');
const marker = path.join(output, 'package-info.json');
const kind = 'birthday-garden-desktop-preview';
await stat(path.join(root, 'dist/index.html'));
try {
  await stat(output);
  const existing = JSON.parse(await readFile(marker, 'utf8'));
  if (existing.kind !== kind) throw new Error('The release folder is not a generated garden package.');
  await rm(output, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  // An existing folder without our marker is never replaced.
  try { await stat(output); throw new Error('Release folder has no generated-package marker.'); }
  catch (missing) { if (missing.code !== 'ENOENT') throw missing; }
}
await mkdir(path.join(output, 'scripts'), { recursive: true });
await cp(path.join(root, 'dist'), path.join(output, 'dist'), { recursive: true });
await cp(path.join(root, 'scripts/serve-dist.mjs'), path.join(output, 'scripts/serve-dist.mjs'));
await cp(path.join(root, 'docs/LOCAL_PREVIEW.md'), path.join(output, 'LOCAL_PREVIEW.md'));
const contentBytes = await readFile(path.join(root, 'src/config/content.json'));
const content = JSON.parse(contentBytes);
const info = {
  kind, builtAt: new Date().toISOString(), contentSha256: createHash('sha256').update(contentBytes).digest('hex'),
  status: 'Desktop production preview for local use. Not deployed to the internet.',
  puzzleKind: content.puzzle.kind, progressVersion: 2,
  pendingSongIds: content.music.songs.filter(song => song.placeholder).map(song => song.id),
  giftPlaceholder: content.gift.placeholder,
  giftName: content.gift.name,
  giftReasonProvided: !!content.gift.reason.trim(), giftPhotoProvided: !!content.gift.imageSrc,
  recipientNamePending: !content.people.recipientName.trim(), senderNamePending: !content.people.senderName.trim(),
  optionalDetails: 'Personal names, reasons, product photos and recordings are optional additions; absent fields are not shown.',
  note: 'Original references, development source, dependencies and QA records are not included. The complete built local assets are retained.',
};
await writeFile(marker, `${JSON.stringify(info, null, 2)}\n`);
const songStatus = info.pendingSongIds.length
  ? `编号 ${info.pendingSongIds.join('、')} 的曲名仍待补充。`
  : '九首曲名已确认。';
const giftStatus = info.giftPlaceholder ? '礼物名称仍待补充。' : '礼物名称已确认。';
const pendingDetails = [
  !info.giftPhotoProvided && '礼物实物照片',
  !info.giftReasonProvided && '礼物理由',
  info.recipientNamePending && '收礼人称呼',
  info.senderNamePending && '送礼人署名',
].filter(Boolean);
const detailStatus = pendingDetails.length ? `可选补充：${pendingDetails.join('、')}。这些内容未提供时不显示，也不阻止体验。` : '';
await writeFile(path.join(output, 'START_HERE.txt'), `生日花园 · 电脑端生产预览\n\n${songStatus}${giftStatus}\n${detailStatus}\n真实演奏录音尚未接入；音乐花圃提供抽取和复制点歌请求。\n\nmacOS：双击 START_GARDEN.command，保持终端窗口运行，\n然后用浏览器打开 http://127.0.0.1:4197/#garden 。\n脚本只使用本机已安装的 Node，不下载或安装软件。\n\n手动启动（需 Node.js 22.12+ 或 24）：\n\n  node scripts/serve-dist.mjs --port 4197\n\n不指定 --port 时默认使用 4173。端口被占用会明确报错，\n不会悄悄换端口；如果本包已经在运行，直接打开原地址即可。\n\n同一地址刷新会保留已完成进度。新端口与 localhost:5173 的开发存档相互隔离；\n从未使用过的来源首次打开为空进度，不会每次打开都清空。\n\n不需要 npm install；素材和字体随包提供。不要直接双击 dist/index.html。\nCtrl+C 停止服务。本包只监听本机，不会发布到互联网；\n它不是离线 PWA，本地服务必须保持运行。完整步骤见 LOCAL_PREVIEW.md。\n`);
const launcherPath = path.join(output, 'START_GARDEN.command');
await writeFile(launcherPath, `#!/bin/sh
set -eu
cd "$(dirname "$0")"
garden_node="$(command -v node 2>/dev/null || true)"
case "$garden_node" in
  ''|*/cua_node/bin/node)
    garden_node=''
    for garden_candidate in "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" /opt/homebrew/bin/node /usr/local/bin/node; do
      if [ -x "$garden_candidate" ]; then garden_node="$garden_candidate"; break; fi
    done
    ;;
esac
if [ -z "$garden_node" ]; then
  echo 'Please install Node.js 22.12+ or 24, then open this file again.'
  exit 1
fi
echo 'Open http://127.0.0.1:4197/#garden in your browser. Keep this window open.'
exec "$garden_node" scripts/serve-dist.mjs --port 4197
`);
await chmod(launcherPath, 0o755);
console.log(`Local desktop package: ${output}`);
console.log(`Pending song titles: ${info.pendingSongIds.join(', ')}; gift placeholder: ${info.giftPlaceholder}`);
