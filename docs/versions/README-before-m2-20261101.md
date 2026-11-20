# 秘密花园生日网站 · A 方案

当前为 **M0＋M1 的桌面可操作美术样片**。最新方向是用户确认的俯视水粉草坡与奶白色绒团：没有天空地平线，依靠坡面色块、前后遮挡、局部风动与探索反馈组织画面。原始交接包、reference、历史素材均保留；网站工程位于项目根目录。

## 当前版本 · 2026-11-01 / floof-clearing-v1

- 以 `docs/research/2026-11-01/floof-clearing-concept-v1.png` 为本轮构图依据。旧拟真兔子和树丛场景退出当前主渲染，原文件保留。
- 角色为无五官、无长耳的柔软绒团；转弯有形变，停下有收势，移动留下短暂绒屑。接触阴影随坡面贴地。
- 地面是有高度的世界网格，绘画材质随世界坐标连续展开；叶片是独立透明素材，共用风场并响应经过。首屏与探索使用同一相机。
- 自由双轴指针引导，不要求先按入口按钮或按住；指针自然停留后保留位置基线，重新滑动不会吞掉第一段位移。当前缓冲为380毫秒保持、渐停至740毫秒；这不是物理触摸板已验收的承诺。
- 首花驻足展开 → 蝴蝶短航段引路 → 花灯靠近亮起 → 沿路返回得到回应。蝴蝶已起飞后会飞到下一栖点，再等待角色；不会因角色停步悬停冻结在半空。
- 内容仅点击时打开；关闭后精确恢复角色、镜头、朝向、缩放。页面为英文，标题采用本地 Cormorant Garamond。

本轮实际检查的是**入口—弯道—信号花灯及返程**。后方地图位置与业务配置保留，未按本次新美术方向完整重做或验收。信号、音乐、礼物仍为M1入口/预览，完整M2—M5未实现。具体检查与截图见 [FLOOF_CLEARING_QA.md](docs/FLOOF_CLEARING_QA.md)。下方较早架构/素材说明属于历史背景，以该报告与当前源码为准。

## 打开预览

打开 **http://localhost:5173/#garden**。如本地服务没有运行，在本项目目录执行：

```sh
sh scripts/project.sh dev
```

保持服务终端运行。`Begin wandering` 为可选入口；移动鼠标/触摸板指针可直接进入。方向键/WASD、滚轮也能行走。网站顶部可开关环境声、减少动态；声音默认关闭。阅读面板冻结环境动作，关闭后等待新的输入。

已实际用桌面浏览器方向键完成自然行走、停留和返程，验证开花、花灯唤醒、面板冻结及精确返回、静态模式保留位置与记忆。工具不能发送纯悬停动作，**真实触摸板手感仍未验收**。未做手机、音频听感、FPS基准或部署。理论纯行走时长仍约14秒，不能将有停留的演示称作已经达成45—60秒的自然探索节奏。

## 构建和静态预览

```sh
sh scripts/project.sh check
sh scripts/project.sh build
sh scripts/project.sh preview
```

- `check`：TypeScript 检查。
- `build`：类型检查后生成 `dist/`。
- `preview`：预览已经构建的版本，默认 http://localhost:4173/。
- 有常规 Node 与 pnpm 的环境也可用 `pnpm dev`、`pnpm build`、`pnpm preview`。

不要直接双击 `dist/index.html`；请通过本地服务器查看。当前没有部署，也没有外部账号或后台服务。

## 环境和安装

本机已使用 Node.js **24.22.1** 与 pnpm **11.25.0** 安装依赖，锁文件为 `pnpm-lock.yaml`。项目采用 React 19、TypeScript、Vite、React Three Fiber 9、Three.js 与 GSAP。实际依赖版本以锁文件为准。

首次在另一台有 Node.js 22.12+ 或 24 的电脑安装：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

若没有 pnpm，可先通过 Node 的 npm 安装项目声明的版本：

```sh
npm install --global pnpm@11.25.0
```

本机没有全局 Node；`scripts/project.sh` 会自动寻找 Codex 已有的运行时，并跳过不能加载第三方原生模块的应用内置 `cua_node`，避免 macOS 签名不兼容导致启动失败。当前备用路径是：

```text
Node: /Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
pnpm: /Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm
```

在此本机重新安装依赖可运行：

```sh
PATH="/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm install --frozen-lockfile --store-dir .pnpm-store
```

依赖安装需要网络；开发与预览服务需要本地端口监听权限。`pnpm-workspace.yaml` 仅允许 `esbuild` 的必要构建脚本。

## 当前实现

- 入口保留 `quiet-garden`；探索区使用实际起伏网格、倾斜透视相机和远雾。八个区域、十二条路径、五个独立环路保留，草地、天空与暮色随世界位置混合；入口到花灯保留较长弯道，本轮以稀疏树木和开阔草坡取代密集树丛取景，根部接触阴影、较冷远雾和局部前后遮挡加强空间层次。
- `useMeadowJourney` 分开保存角色与镜头状态。鼠标、方向键 / WASD 和滚轮统一为速度与转向输入，近处慢走、远处快走；普通转弯持续行走，大幅掉头平缓减速；镜头有活动范围及方向留白。桌面指针停止后560毫秒内停止位移，阅读前后恢复完整状态。
- `RabbitCompanion.tsx` / `rabbitAnimation.ts` 合并原四向图集和新四个斜向图集，共 **八方向×三种姿态＝24个姿态**。实际行程驱动步态，收到移动意图时轻微蓄力，头部先回应方向意图，身体随后转向；连续的阻尼落地在停止引导后原地完成，镜头停止。各方向站立高度统一为166世界单位，保留自身宽高比与蹲伏比例。每方向仍只有站立、蓄力、腾空三姿态，不是完整骨骼动画。
- `TrailAwakening.tsx` / `trailState.ts` 将首花、蝴蝶弯道停点、花灯与返程串成可选的因果过程：驻足开花后显露蝴蝶，实际经过留下记忆，灯亮后已走过的点开放，真正走回花边触发返程问候。本次浏览的 `worldEvents` 支持返回入口或场景重建后恢复；阅读时暂停环境响应。`gardenWind.ts` 继续统一根部固定的树冠、草叶与花枝运动。
- `GardenAir.tsx` / `airMotion.ts` 用固定世界坐标的光尘与少量种子建立空气运动；`AtlasTerrain.tsx` 的树影和慢云光共享风时钟。`ResponsiveUnderstory.tsx` / `plantResponse.ts` 固定根部，只弯曲叶片上部，按植株冠幅和真实行程计算接触并柔和回弹；`LivingWorld.tsx` 在当前入口路线增加24簇稀疏小草，保留种子、水边和石边回应；`AtlasEncounters.tsx` / `atlasInteraction.ts` 保留六个深处地点互动。这些状态与谜题、音乐和礼物业务分离。
- `GardenMap.tsx` 随已发现区域展示地图，未知区域保留模糊延伸；快速返回仅限已发现地点。音乐快捷入口保持独立。
- `useGardenSound.ts` 提供默认关闭的本地程序环境声；只有主动点击才创建或恢复音频环境。页面隐藏后暂停，阅读时衰减，卸载时清理音源；没有下载外部音乐或虚构曲目内容。
- `StaticExploration.tsx` 共享投影、世界坐标和已有环境记忆，保留八向静止小兔与开花、沿路变化、蝴蝶停点、灯光状态。静态替代省略动画，不宣称与WebGL逐像素一致。
- 所有网站文案和无障碍标签为英文；`content.ts` 校验固定规则，`check-content.mjs` 递归检查内容树没有遗留中文。原交接文档和开发历史保持原语言。

**尚未实现 M2—M5 的完整业务。** 样片里的花朵不会抽歌，小灯不会解题，礼物门不会解锁；界面明确标记样片范围。未伪造谜题完成、抽歌结果或礼物成功状态。

## 内容与资源

唯一运行时内容来源为 `src/config/content.json`；`src/config/content.ts` 负责校验并导出。交接包中的 `content.template.json` 保留为原始模板，不同时作为第二份运行时配置。

- 待填内容：称呼/署名（可留空）、九首真实曲名、可选选择理由、真实礼物名称与介绍、可选礼物照片。
- 私人邀请语音与真实演奏音频尚未提供，相关配置保持 `null`；本轮可选程序环境声不替代这些内容，也不提供无效播放器。
- 固定谜题和抽歌规则保留在配置里，后续阶段按交接规格实现，不随意改动。
- 当前本地运行素材为 `public/assets/garden/quiet-*`、`walk-meadow-v2.webp`、`walk-tree.webp`、`living-rabbit-back.webp`、`atlas-{willow,blossom,fern,arch}.webp`、`rabbit-atlas-v2.webp` 与新增 `rabbit-diagonal-v1.webp`，实际映射以 `src/config/art.ts` 为准。世界分区与道路在 `gardenAtlas.ts`，投影和地形在 `depthWorld.ts`，场景在 `ExplorationScene.tsx` / `AtlasTerrain.tsx` / `LivingWorld.tsx` / `AtlasEncounters.tsx` / `TrailAwakening.tsx`，静态替代在 `StaticExploration.tsx`；旧 `MeadowLayers.tsx` 保留为前一版实现。
- 新地面与树木源图位于 `docs/art-source/walk-*`，完整提示记录为 `docs/art-source/walk-generation-prompts.json`。`walk-meadow.png` 是保留的初稿，当前采用简化后的 v2；原 `quiet-*` 源图与提示继续保留。
- 背面小兔由内置 ImageGen 依据本项目原兔子生成，源图为 `docs/art-source/living-rabbit-back.png`，提示及尺寸/透明范围记录分别为 `living-rabbit-back-prompt.json`、`living-rabbit-back-metadata.json`；WebP 只进行格式导出。
- 新增柳树、疏枝花树、蕨草与白铃花、旧石拱门四张原创透明水彩素材，实际均为1024×1536 RGBA。PNG源图在 `docs/art-source/atlas-*.png`，提示、来源、尺寸和落地锚点记录在 `atlas-generation-prompts.json`；WebP保留生成透明度，仅做格式转换。
- 原四向兔子图集 `rabbit-atlas-v2.webp`（约318KiB）保留；新增四个45度斜向的 `rabbit-diagonal-v1.webp`（356,510字节，约348KiB），由内置 ImageGen 依据本项目原创角色生成。源PNG与提示位于 `docs/art-source/awakening/rabbit-diagonal-v1.png` 和 `rabbit-diagonal-prompt.txt`。`rabbitAtlas.ts` / `rabbitDiagonalAtlas.ts` 通过实测alpha轮廓与UV取帧，运行时按站立高度统一尺度；源图不裁成独立文件。
- 本地字体 `public/assets/fonts/cormorant-garamond-latin.woff2` 为37,776字节（约37KiB），附SIL OFL 1.1许可；完整上游字体及来源记录在 `docs/font-source/`。这是接近参考文学气质的授权替代字体，不声称是Wayfinder的同款字体。
- 前一版画布拖动实现保存在 `docs/versions/quiet-pan-20261030/`；其他历史源图和未采用版本也保留，不作为本版通过依据。
- 用户参考图、视频和参考检查页只用于开发研究，不作为可发布素材。

## 检查与后续

- [阶段进度](docs/PROGRESS.md)
- 当前参考研究页：[quiet-rabbit/index.html](docs/reference-review/quiet-rabbit/index.html)。
- 本轮开阔草坡截图、实际检查与待复测项见 [OPEN_MEADOW_QA.md](docs/OPEN_MEADOW_QA.md)。用户确认无按键已能行走；针对断续的最终两项修正已完成，实际触摸板手感尚待复测，不能用历史结果替代。
- 前轮无按键输入与空气运动记录见 [HOVER_AIR_QA.md](docs/HOVER_AIR_QA.md)，保留当时实际浏览器检查与设备实测边界。
- 前轮路线检查见 [FIRST_TRAIL_REFINEMENT_QA.md](docs/FIRST_TRAIL_REFINEMENT_QA.md)。桌面1280×720已实际验证按住、斜向移动、松手停留，以及完整自然往返触发 `trail-returned`；阅读期间不移动，关闭后角色、镜头、朝向与缩放精确恢复，静态切换保留环境记忆。坡面指向翻转已修复，返程坡脊降低、相机抬高后已复测；最终入口、弯道、花灯截图已归档。确定性检查与最终生产构建结果以QA报告为准；没有声音听感验证、FPS基准测试、手机验收或部署。
- [前版英文界面与有记忆的小路检查](docs/AWAKENING_GARDEN_QA.md)保留为历史，不替代本轮八向动作和新首段路线的浏览器验收。
- [八区域扩展检查](docs/ATLAS_GARDEN_QA.md)保留为上一阶段记录，不替代本轮动作、英文界面和环境记忆检查。
- [此前透视地形与生态检查](docs/LIVING_GARDEN_QA.md)及[设计复核清单](docs/LIVING_GARDEN_REVIEW.md)保留；历史通过结果不覆盖此次地图、素材与互动扩展。
- [此前平面草地行走检查](docs/WALK_GARDEN_QA.md)、[水彩拖动检查](docs/QUIET_GARDEN_QA.md)、[连续探索结构](docs/CONTINUOUS_EXPLORATION.md)、[纵深版本检查](docs/DEPTH_QA.md)、[长图路线检查](docs/JOURNEY_QA.md)与[初版检查记录](docs/QA_REPORT.md)保留为历史记录，不作为当前版本通过依据。
- [美术素材清单与缺口](docs/ASSET_MANIFEST.md)
- [生成提示与透明检查](docs/ASSET_PROMPTS.md)
- 本轮截图预期保存到 `docs/qa/open-meadow/`，是否完成及操作证据以 `docs/OPEN_MEADOW_QA.md` 为准。此前 `docs/qa/wayfinder-desktop/`、`docs/qa/quiet-rabbit/` 等截图全部保留；其中 `reference-*` 是原站参考截图，不能作为本项目的新效果证据。
- 已有检查入口包括 `scripts/check-living-motion.mjs`、`scripts/check-depth-world.mjs`、`scripts/check-ecology.mjs`、`scripts/check-trail-awakening.mjs` 与 `scripts/check-content.mjs`。本轮扩展的检查命令、构建结果和体积提示以新 QA 报告实际记录为准。旧 `check-meadow-motion` 对应前一版平面跟随，不作为当前透视世界验收。没有全局 Node 时可用上面的 Node 完整路径执行。

本轮先在电脑上打磨八向小兔、延长后的入口小路与真正返程的环境反馈，暂不扩展手机适配或部署。首段探索节奏与整体精致度仍需继续改善和用户确认。背景方向获认可不代表整个视觉已验收。后续从 `birthday-site-handoff/docs/DEVELOPMENT_PLAN.md` 的 **M2** 继续：接完整信号谜题、提示和密码卡，再依次推进九首曲目、礼物与现场彩排。

当前 M1 没有业务持久化，因此无需清空浏览器存储。后续加入持久化后，只允许删除本应用专用存储键，不使用 `localStorage.clear()`。前端四位密码是礼物揭晓机关，不提供身份认证；该说明只属于开发文档。
