# Walk with Bunny

## 当前源码快照 · 2026-11-20

这是继续讨论整体优化前保存的当前本地版本。Git 标签为 `snapshot-2026-11-20`。备份保留网站源码、美术素材、原始交接包、参考图片与视频，以及设计文档和检查记录。

现有公开网站为 [Walk with Bunny](https://walk-with-bunny.vercel.app/)。本仓库还包含后续本地实验，公开网站与此快照不应视为同一版本。本次备份不触发网站发布。

### 本地运行

使用 Node.js 22.12+（本次环境为 24.22.2）和 `pnpm@11.25.0`，在仓库根目录执行

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 [电脑端花园](http://localhost:5173/#garden)。要从空进度重新体验，打开 [新一轮散步](http://localhost:5173/?walk=new#garden)。同一轮中途刷新会保留进度。

### 最新雾镜手势实验

开发服务启动后打开 [手势擦雾预览](http://localhost:5173/?preview=fresh&run=mirror-20261120&mist=1#garden)。此入口需要摄像头权限与 HTTPS 或 localhost 环境，并在新一轮且未启用“减少动态”时展示。`run` 区分临时试玩进度，换一个值可另开一轮。

雾镜目前仅在开发模式启用。当前工作包括手部识别、即时擦痕呈现、独立笔画与进入花园的衔接。最近一轮已用模拟摄像头配合真实 MediaPipe，以及 WebKit 画布检查验证擦痕呈现；真实设备上的最新手势手感仍待用户确认。它不代表整套入口视觉方案已完成验收。

### 构建与生产预览

```sh
pnpm build
pnpm preview --port 4198
```

打开 [本地生产预览](http://localhost:4198/#garden)。生产构建不启用上述开发雾镜入口。原始交接说明见 `birthday-site-handoff/`，设计与验证记录见 `docs/`，参考素材见 `reference/`。

依赖、构建输出、机器专属部署绑定，以及重复发布压缩包由 `.gitignore` 排除；所有原文件继续留在本机。下方为此前的阶段记录，旧链接、日期和验收范围按历史背景阅读。

---

# 历史阶段记录 · 秘密花园生日网站 A 方案

工程已有 **四道计算机知识题 → 四位纸条 → 小信封、九首音乐抽取、礼物密码锁与揭晓**，并完成电脑端生产版本地检查。采用用户确认的俯视水粉草坡、独立叶片和奶白绒团；礼物为护照夹和睡眠眼罩，名称藏在可翻看的小兔纸签背面。九首曲名已按用户提供的顺序接入；音乐目前提供点歌请求，真实演奏音频属于可选补充。原始交接包、参考图片与视频、历史素材全部保留。网站工程位于当前项目根目录。

## 打开预览

**正式在线入口（2026-11-14）：[从头体验 A Secret Garden](https://a-little-secret-garden.rationalbay.chatgpt.site/?walk=new#garden)**。拿到链接即可打开，无需登录，也不需要保持本机服务运行。每次重新打开这条入口链接建立新一轮；进入后刷新保留本轮进度。发布与线上检查见 [DEPLOYMENT_A_20261114.md](docs/DEPLOYMENT_A_20261114.md)，可迁移静态包见 [A 版发布归档](releases/birthday-garden-A-20261114-static.zip)。下面的本地地址与早期说明保留作开发和历史参考。

途中眼罩礼盒已调整为融入花园的小近景，去掉大块矩形底板，兔子纸签挂在盒角；保留梦幻水粉揭晓：盒缝透光、盒盖抬起、暖色光点散出，再露出眼罩，最后安静下来。点击体验 [礼盒预览](http://127.0.0.1:4198/#rest)；实际录屏与验收见 [REST_GIFT_DREAM_QA.md](docs/REST_GIFT_DREAM_QA.md)。

**每次从头展示：[开始全新体验](http://127.0.0.1:4198/?walk=new#garden)**。每次打开这条链接，会从入口建立独立的新一轮，四题、信封、抽曲和礼物发现均为空；旧试玩存档保留。地图底部的 **Start a new walk** 也能另开新一轮，有进度时首页同样显示该选项。新一轮中途刷新会继续本轮进度；**The entrance** 只回入口，不会重置。检查与使用说明见 [NEW_WALK_QA.md](docs/NEW_WALK_QA.md)。

**最新电脑端预览：[http://127.0.0.1:4198/#garden](http://127.0.0.1:4198/#garden)**，使用当前项目根目录的 `dist`，继续原存档。若出现 `ERR_CONNECTION_REFUSED`，表示本机服务未运行；双击根目录 [START_GARDEN.command](START_GARDEN.command)，或在项目根目录执行 `sh scripts/project.sh preview --port 4198`，并保持终端窗口打开。电脑重启后需重新启动。橙汁版本检查见 [ORANGE_REST_QA.md](docs/ORANGE_REST_QA.md)。

下面的 4197 是此前打包的池塘版本，不包含最新橙汁歇脚点。

**早期电脑端本地预览： [http://127.0.0.1:4197/#garden](http://127.0.0.1:4197/#garden)**。生产版本没有开发提示，交付时停在空进度入口；同一地址刷新保留进度，与下面 5173 的原存档隔离。此地址需要本机服务保持运行，正式在线入口见上方。

服务停止后，双击 [START_GARDEN.command](releases/desktop-preview/START_GARDEN.command)，或在项目根目录执行：

```sh
sh releases/desktop-preview/START_GARDEN.command
```

备用包：[2026-11-04 池塘倒影更新归档](releases/birthday-garden-desktop-preview-pond-dream-20261104.tar.gz)。详细使用说明见 [LOCAL_PREVIEW.md](docs/LOCAL_PREVIEW.md)，整园验收见 [DESKTOP_RELEASE_QA.md](docs/DESKTOP_RELEASE_QA.md)，本次池塘实际检查见 [POND_DREAM_QA.md](docs/POND_DREAM_QA.md)。

开发预览保留：

- 花园：[http://localhost:5173/#garden](http://localhost:5173/#garden)
- 直接体验第一关：[http://localhost:5173/#puzzle](http://localhost:5173/#puzzle)
- 音乐花圃：[http://localhost:5173/#music](http://localhost:5173/#music)
- 礼物门：[http://localhost:5173/#lock](http://localhost:5173/#lock)；已解锁重看：[http://localhost:5173/#gift](http://localhost:5173/#gift)

开发预览中可点击右下角或内容面板底部的 **Start fresh**，另开空进度试玩；原标签页与原存档保留。临时试玩在同一标签页刷新可续玩，点击 **Return to saved garden** 返回原进度。这些入口仅在开发服务中显示。

本机服务未运行时，在项目目录执行：

```sh
sh scripts/project.sh dev
```

保持服务终端运行；本机重启后需重新启动。这些 localhost 地址仅供本地开发，正式在线入口见上方。

入口先点击一次 **Begin wandering**（已有进度时为 **Continue wandering**）；欢迎文字不会因鼠标经过而消失。进入后，电脑上移动鼠标／触摸板指针即可引导绒团，无须按住。指针留在某个方向时持续行走，移回绒团附近减速停下；进入实际按钮、移出画面、打开地图或阅读时暂停。方向键、WASD 和滚轮也可行走。靠近花灯、点击打开内容；关闭后恢复角色、镜头、朝向和缩放。声音默认关闭，可主动开启；减少动态使用静态画面与相同内容控件。入口修复检查见 [WELCOME_ENTRY_QA.md](docs/WELCOME_ENTRY_QA.md)。

当前运动版本为 `point-to-walk-v1`，移除了旧的 740ms 指针静止停步规则，并避免镜头跟随把持续方向误当成已经追到目标。保留同帧驱动、转向阻尼和有限停步曲线。用户已在实体触摸板确认“能持续走，也能平滑停下”。已有页面请刷新；最新验收见 [ROUTE_INPUT_QA.md](docs/ROUTE_INPUT_QA.md)。此前 [TURN_STOP_QA.md](docs/TURN_STOP_QA.md) 与 [SMOOTH_MOTION_QA.md](docs/SMOOTH_MOTION_QA.md) 保留为历史记录。

## 当前更新 · 会自己游动的池塘倒影（2026-11-04）

沿岸行走时，倒影慢半拍跟随；折返时保留惯性，停下后还会独自游一小段，显露水下星空。离岸恢复、重访可重复，不增加操作按钮。实际浏览器录制与验证见 [POND_DREAM_QA.md](docs/POND_DREAM_QA.md)。本轮80项专项/相邻检查、13项有效浏览器检查和构建通过，4198预览和4197本地包同步；行走、谜题、音乐和礼物规则未改。

## 上轮更新 · 电脑端生产预览收尾（2026-11-04）

在独立生产来源从空进度开始，用实际键盘行走完成入口 → 解题桌 → 音乐花圃 → 池岸 → 蘑菇空地 → 石拱 → 山丘 → 礼物门，全程未用传送代替行走。检查原四题、收信封、抽曲与实际剪贴板、错码拒绝、正确码揭晓、隐藏名称纸签、地图暂停、阅读原位返回和刷新保存。1280×720 主流程、1440×900 礼物／音乐／静态画面无横向溢出，浏览器错误与警告为空。

265项自动检查、20项浏览器断言及类型／构建通过。重打包52个构建文件与dist逐个哈希一致，新增macOS启动文件；npm preview与项目预览统一使用仅本机静态服务。用户4197来源保持空进度，原5173存档和临时试玩未变。详情、截图和实际边界见 [DESKTOP_RELEASE_QA.md](docs/DESKTOP_RELEASE_QA.md)。

## 上轮更新 · 后半程实际行走检查（2026-11-03）

实际走通音乐花圃、池塘、蘑菇空地、石拱、山丘和礼物门，并反向回山丘。主线默认沿小路推进，不再为抄近路突然指回后方；主动进入支路仍可自由接续。修正沿途按钮与主线文字的遮挡，首次到门前优先显示礼物入口，解锁后恢复可选月光互动。

世界小门密码锁、信封查看、错码／正确码、关闭原位返回均已联测。90项自动检查、27项浏览器断言、类型与构建通过，原存档保留。美术和运动控制器未改。实际截图和验收范围见 [ONWARD_WALK_QA.md](docs/ONWARD_WALK_QA.md)。

## 上轮更新 · 持续指向行走与主线衔接（2026-11-03）

收信封后引向音乐花圃，抽曲后引向礼物；一句短提示和小箭头按角色实际位置指向现有小路，地图标出下一站，未到访地点仍不可传送。路线避开池塘水面，不增加新关卡。顶部按钮间的空白区域不再拦截指针。

185 项自动检查（含内容校验）、20 项浏览器断言、类型和生产构建通过；实际从入口行走至解题桌和音乐花圃，并通过面板联测礼物锁、跨面板原位返回、地图与阅读暂停、减少动态。原四题／信封／礼物和曲目 02 的 drawId 保留。石拱和美术未改，详见 [ROUTE_INPUT_QA.md](docs/ROUTE_INPUT_QA.md)。

## 上轮更新 · 首次试玩与纸条回看（2026-11-03）

首次谜题仍从第一题和四个空格开始，逐题答对留下数字；收好信封后，面板标题改为 `Your note`，`Read note` 用于回看已经解出的纸条。原题、0305 密码、九首曲目和礼物规则保持。

开发预览新增 `Start fresh`，另开标签页使用独立临时进度；同一试玩刷新可续玩，`Return to saved garden` 返回原存档。预览不读取或同步正式业务进度，失败时只退到内存，生产构建不包含预览入口。

实际从入口行走至解题桌，完成四题、收信封、音乐抽取、错误码拒绝、正确码解锁；检查中途／完成后刷新、第二份空试玩、直达礼物保护、退出回到原存档。89 项自动检查、类型与构建通过，14 项浏览器断言通过。原四题／信封／礼物和曲目 02 的 drawId 均未变。证据和限制见 [FRESH_PLAYTHROUGH_QA.md](docs/FRESH_PLAYTHROUGH_QA.md)。石拱和场景未改。

## 上轮更新 · 池塘的自然回应（2026-11-03）

池塘改为由实际靠岸与沿岸移动产生局部涟漪，波纹起点跟随最近水岸，四个有限波槽避免持续堆积；停下后波纹平息，绒团的淡淡倒影逐渐清楚，原有三片花瓣轻轻让开再回落。回应限制在手绘水面内，移除池塘大文字按钮、E／Space入口与首次提示。地图跳转和原地等待不产生新波纹。

共享会话状态贯通正常与静态画面，阅读／地图冻结，减少动态保留反光、花瓣与静止波纹快照。1280×720实际从音乐花圃走到池塘，绕南／西／北岸、离开返回，继续走至蘑菇空地；原存档与业务配置保留。77项行为检查、内容校验、类型和生产构建通过。实际截图、数据和限制见 [POND_LISTENING_QA.md](docs/POND_LISTENING_QA.md)。实体触摸板手感、手机和实际FPS未在本轮验收，仍为本机预览。

## 上轮更新 · 纸鸟沿弯道引路（2026-11-03）

靠近山丘时，最近的一只纸鸟先舒展翅膀；停留后飞出一小段，随后沿现有小路的七处驻留点引向礼物门。持续前进时顺势飞过中间点；停下、后退或离开时减速落地，回来再继续。可见范围随鸟的位置移动，原大按钮、E／Space入口和首次文字提示已收起，没有增加关卡或收集要求。

阅读与地图暂停纸鸟；减少动态使用同一会话位置。1280×720实际方向键完成山丘 → 弯道 → 门前，检查停留、离开返回、面板／地图冻结与七项位置恢复、静态切换及原礼物锁入口。61项相关行为检查、内容校验、类型及生产构建通过；原题、曲目、礼物配置及已有进度保留。实际截图与限制见 [PAPER_GUIDE_QA.md](docs/PAPER_GUIDE_QA.md)。实体触摸板／纯悬停、手机与实际FPS未在本轮验收，尚未发布公网。

## 上轮更新 · 蘑菇的连续回应（2026-11-02）

已有五朵蘑菇改为随角色位置与实际速度回应：最近一朵先轻摆、暖光，驻足后按空间距离扩散；绕行平滑转移，离开消退，长时间停留恢复安静。根部与接触阴影固定，去掉伸缩弹跳。首次不再弹文字提示，一轮自然回应后出现可选的小蘑菇重播图标。地图与阅读暂停；静态模式保持静止。未改行走参数、四题、九首曲目或礼物规则。

38项相关行为检查、内容校验、类型与生产构建通过。1280×720实际方向键验证两侧靠近、绕行、离开返回、自然停留、阅读／地图冻结与原位返回、静态切换，原存档保留。修复偶发长帧取消互动的问题。实际截图、数据及限制见 [MUSHROOM_LISTENING_QA.md](docs/MUSHROOM_LISTENING_QA.md)。本轮仅蘑菇样片；纸鸟、池塘与风铃的新交互尚未实施，实体触摸板手感未代测，未发布公网。

## 上轮更新 · 礼物入口与揭晓页（2026-11-02）

后续按用户反馈将礼物名称藏在带小兔图案的折角纸签背面，不显示猜测提示文字：插画保持可见，点击揭开名称，再点盖回；键盘Enter／Space也可操作。这个可选小互动不要求猜对、不影响存档。

礼物入口统一先显示包裹页：首次需输入0305，已有记录明确标记“之前打开过”，可回看或选择 `Try the code again` 重新体验密码锁，且不清除答题／歌曲进度。揭晓改为一张原创水粉礼物静物，移除双卡片、折叠日期说明和宽大按钮。

实际验证空进度直链保护、短码／错码拒绝、正确码开礼物、刷新回看、原记录回放、信封查看、阅读暂停、原位返回和减少动态。38项相关检查、内容校验与构建通过；52个备用包文件已同步。截图与限制见 [GIFT_REDESIGN_QA.md](docs/GIFT_REDESIGN_QA.md)。

## 上轮更新 · 入口至解题桌引导（2026-11-02）

入口 → 第一朵花 → 花灯旁纸桌已接通。地图只提前显示下一处 `The puzzle desk` 线索，已走过的地点才可返回；花灯旁新增一张只有空白纸的小桌，靠近停下出现解题标签，点击纸页打开原有四题。浏览时一句提示，地图与阅读时收起。保留运动、美术基础和业务规则。

实际从入口沿弯道走到花灯，检查停留开花、蝴蝶引路、纸页点击、阅读／地图暂停、关闭原位恢复、静态画面点击与反向停留；原主预览进度保留。36项相关检查、内容校验、类型和生产构建通过。截图、证据与限制见 [FIRST_ROUTE_GUIDE_QA.md](docs/FIRST_ROUTE_GUIDE_QA.md)。实体触摸板手感未重测，尚未部署。

## 上轮更新 · 收礼流程彩排与进度保护（2026-11-02）

从独立地址的空进度实际完成四题、收信封、抽曲、0305 开锁和礼物回看；检查答错重试、填写草稿刷新、收信封／抽曲／拆封动画中刷新、复制文字、阅读中刷新后原位返回。实际双标签验证已确认的数字、信封和礼物不会被另一页抽曲覆盖；新曲目同步后清除旧卡片的复制反馈。音乐说明与操作提示已收短，题目、九首曲目、礼物规则及美术／运动参数保留。

97 项相关回归、内容校验和生产构建通过。主预览原曲目 02 与已解锁礼物保留，四题未替用户完成。实际截图、证据及限制见 [RECIPIENT_REHEARSAL_QA.md](docs/RECIPIENT_REHEARSAL_QA.md)。已有开发预览请刷新一次，加载本轮进度保护。当前仍为本机预览，尚未发布。

## 上轮更新 · 整园路线与操作联调（2026-11-02）

本轮保留水粉草坡、奶白绒团和八区布局，集中改善路迹可读性与操作衔接。主路纸纹适度减弱，暖灰白洗色与静态画面共用参数；题灯周围留出宁静的地面，花灯按原画布比例调整为204×272，灯焰与底座重新对齐。靠近并停下时，仅最近的可操作物件显示侧边短标签，继续行走后收起。

修复顶部音乐／礼物入口关闭后方向键不能继续行走的问题，同时保留入口的Enter／Space／Tab行为；使用同一Map按钮收起地图后也能直接按键继续。原生方向键已从入口走过全部八区到小门，并反向走回山丘；检查题目输入／礼物阅读冻结、Escape和音乐浏览器前进／后退、原位关闭、两个顶部入口返回后直接走、地图打开时阻止行走及池岸减少动态。实际滚轮后退并收势停住；另用Map返回题灯检查两种渲染模式的脚点与位置，未将其计作自然路线。本地备用包已同步，50个构建文件哈希匹配，页面留在入口便于重新体验。完整证据见 [WHOLE_GARDEN_QA.md](docs/WHOLE_GARDEN_QA.md)。

82项相关检查、类型与生产构建通过，Three体积提示保留。原题、九首曲目、礼物与本机已有进度未变，没有新增素材或调整运动速度。实体触摸板、纯悬停、FPS、手机和真实音频未在本轮验收。本轮前备份为 `docs/versions/before-whole-garden-20261102.tar.gz`，仍使用本机预览。

## 上轮更新 · 石拱至山丘与礼物门（2026-11-02）

本轮继续完善石拱之后的山丘与礼物门：四只纸鸟依次起飞、转弯、回落，回到各自落点；地面从山丘灰紫渐入门前冷蓝灰，局部柔化纹理，调整三个已有植物群的位置。小门换为透明水粉插画并扩大到清楚可读的比例，门槛与地形、静态画面及点击区域共享脚点。窄月光通向门前，月盘置于侧后方，六个光点轻微漂移。

1280×720 实际用原生方向键完成石拱 → 山丘 → 礼物门 → 山丘，检查纸鸟飞起落下、两区减少动态、礼物阅读暂停及关闭后七项角色／镜头数据精确恢复。已有礼物为解锁状态，世界小门直接打开礼物重看页；本轮没有重新输入密码或重置进度。80 项相关检查、类型检查和生产构建通过，Three 体积提示保留。实际截图与限制见 [HILL_MOON_QA.md](docs/HILL_MOON_QA.md)。

原美术与四题／九首曲目／礼物规则保留；本轮范围不等于全部八区重新验收。实际缺图时程序备用门与减少动态均可用，七项位置数据保持；本地备用目录与归档已同步，50 个构建文件哈希匹配。实体触摸板、FPS、真实音频和手机未在本轮验收。小门生成提示词已保存，本轮前备份为 `docs/versions/before-hill-moon-20261102.tar.gz`；仍为本机预览，页面留在门前便于查看。

## 历史更新 · 池塘至蘑菇空地与旧石拱（2026-11-02）

本轮继续完善池塘之后的蘑菇空地 `(1400, 4300)` 与旧石拱 `(-1100, 5400)`。空地采用五株大小错落的灰粉水粉蘑菇，根部固定，回应依次轻摆与舒展；地面沿弯道从灰紫渐入冷蓝灰，局部柔化纸纹。石拱两脚贴合原有坡度，保留稳定的上部拱形和悬挂点，风铃轻摆并缓慢收势，少量光点各自在附近漂移。已有植物调整位置与尺度，保留行走留白与原业务规则。

1280×720 桌面使用真实方向键从入口经过池塘走到蘑菇空地、石拱，再反向走回空地。音乐面板关闭后七项角色／镜头数据精确恢复；两区减少动态与正常素材布局对照通过，切换未新增访问事件。故意素材 404 时，WebGL 和静态路径均显示程序绘制替代。地图关闭／跳转后直接按方向键可继续移动；顶部音乐快捷入口关闭后仍将焦点返回该按钮，需先回到花园焦点才能按键行走，这项限制保留在报告中。

26 项相关检查、类型检查与最终生产构建通过；本地备用目录和归档已同步，49 个构建文件与 dist 哈希一致。实际截图、路线、故障检查和限制见 [HOLLOW_ARCH_QA.md](docs/HOLLOW_ARCH_QA.md)。两张透明水粉素材及完整生成提示词已保存；石拱回应目前为视觉摆动，没有新增风铃音效。山丘与最终小门的美术仍待继续完善，实体触摸板、声音和 FPS 未在本轮验收。本轮前备份为 `docs/versions/before-hollow-arch-20261102.tar.gz`；仍为本机预览。

## 历史更新 · 音乐花圃至池塘与九首曲名（2026-11-02）

本轮集中完善音乐花圃 `(900, 2100)` 至池塘 `(-1200, 3200)`：花圃采用局部灰暖底色与粉色花瓣，沿转弯渐入池岸蓝灰，局部减轻地面纹理。池面改为贴合地形的透明水粉画层，远处先露微弱水光，靠近后连续显现；花瓣随风飘落，池岸回应使用渐扩渐淡的水波。已有植物只作位置与尺度调整，原地形高度、可行走池岸和业务规则保持。

减少动态／静态替代共享两区的地面色温、世界坐标、池面与花瓣布局，显示安静的驻留状态。九首真实曲名保持用户顺序接入英文页面，固定编号与已抽取记录保留；`Secret` 与《不能说的秘密》为两个独立条目。完整中英文对应见 [CONTENT_HANDOFF.md](docs/CONTENT_HANDOFF.md)。未添加实际音频、作者／演奏版本或虚构的选择理由。

1280×720 桌面已使用原生方向键和普通点击从入口实际走到音乐，经弯道抵达池岸，再沿原路方向走回音乐；没有注入角色坐标。音乐卡沿用原编号 02 显示 Clair de lune，开关面板七项角色／镜头值精确恢复，原曲目、谜题与礼物进度保留。修复触水按钮留住焦点而拦截后续方向键的问题，失败与修复后的返回记录均保留。静态切换保持池面／岸草位置和访问事件；实际截图、55 项确定性检查及内容校验见 [ORCHARD_POND_QA.md](docs/ORCHARD_POND_QA.md)。类型与生产构建通过，本地备用目录已同步；Three 分包体积提示仍在。滚轮／纯悬停、实体触摸板、FPS、声音与后四区域精修不在本轮验收范围。

本轮前工程备份为 `docs/versions/before-orchard-pond-20261102.tar.gz`，曲目配置备份为 `docs/versions/before-music-titles-20261102.json`。本轮仍为本机预览，没有发布公网链接。

## 历史更新 · 自然探索路线与输入连续性（2026-11-02）

七段真实主路已融入地面浅光，沿路局部减弱纸纹对比；首花底部更宁静，驻足舒展不会在开花瞬间缩回。修复滚动经过场景物件被拦截，以及关闭面板后键盘焦点随远去物件消失的问题。原转向／停步参数与业务规则保持。

实际桌面从入口经题桌、音乐、池塘、蘑菇、风铃、山丘走到礼物小门，并反向走回山丘；停留和三个内容面板原位返回通过，已有曲目与进度保留。69项相关检查、类型检查和构建通过。实际截图、输入验证及后半程美术／静态场景等未完成项见 [NATURAL_TRAIL_QA.md](docs/NATURAL_TRAIL_QA.md)。实体触摸板手感仍待实际设备确认，不将本轮键盘／滚动检查等同于触摸板验收。

## 历史更新 · 信封与礼盒揭晓（2026-11-02）

最终密码锁旁可直接展开已完成四题的纸条／信封，开合保留输入，不自动填写密码、不消耗纸条。答对 0305 后先保存解锁，再用局部松结／抬盖反馈打开纸色礼盒；减少动态直接揭晓。护照夹与睡眠眼罩分别呈现为两张轻量物件卡，配原创中性 SVG 示意，不代表真实商品的品牌、颜色或款式。已移除见面交付和大段解释，保留 Happy birthday.；生日密码含义仅在解锁后的小署名里按需展开。

该轮 32 项相关检查、类型检查、生产构建通过；实际桌面检查锁旁信封不清空或代填输入、错误重试、拆封中刷新、揭晓刷新、键盘展开署名、减少动态与角色／镜头原位返回。原有曲目和进度保留。检查范围、截图见 [GIFT_PARCEL_QA.md](docs/GIFT_PARCEL_QA.md)。该轮曲名和实物照片尚未提供，九首曲名现已接入；该轮未重做自然行走体验验收。

## 当前第一关 · 四道计算机知识题

依次回答 Python 列表首索引、TCP 建连握手步骤数、XOR 相同输入的输出、二进制 `101` 的十进制值；每题只输入一位，按顺序得到 `0 / 3 / 0 / 5`。答对后数字留在桌上纸条，解释出现，等待主动点击 `Next question`。提示按需展开，错误保留输入，不自动填答。

四题完成后纸条显示 `0305`；点击 `Keep the note` 收进标为 `For later` 的小信封，之后可用 `Read note` 回看。密码保留到后面的礼物锁使用，第一关不解释生日。网页继续全英文，音乐仍可独立进入，不再使用 `1001 → 9` 连接音乐。

用户于 2026-11-02 明确提供的这套原题优先于保留的交接 v2。当前规格见 [FOUR_QUESTION_PUZZLE.md](docs/FOUR_QUESTION_PUZZLE.md)。新状态使用 v2 存储：从旧记录仅继承礼物解锁和有效最近曲目；旧题完成不等于新四题完成。旧 v1 原记录保留，新题从第一题开始。

新版共 73 项相关回归、类型检查与生产构建通过；桌面浏览器实际走通四题、错误重试、填写中刷新、收信封后立即刷新、取出纸条、0305 开锁和减少动态模式。关闭面板恢复七项角色／镜头数据；1280×720 第四题完成画面的底部按钮完整可见。详见 [FOUR_QUESTION_QA.md](docs/FOUR_QUESTION_QA.md)。本机预览原有曲目／已解锁礼物已保留，新四题从第一题开始。既有 M2—M5 报告为历史记录。

## 历史 M5 · 桌面技术彩排

发布包从空进度走通解谜 → 抽曲 → 开门 → 返回，刷新保留结果，跨面板精确恢复位置。补上地面／叶片加载失败替代，拆开静态画面对 Three 的依赖，实际删除图形包的构建副本仍可抽曲与返回。125 项回归、类型检查和构建通过。原美术与运动参数保持。

本地备用包在 `releases/desktop-preview/`（[压缩包](releases/birthday-garden-desktop-preview-20261102.tar.gz)），无需 node_modules，需已安装 Node；解压归档后按 START_HERE.txt 启动。目录包和压缩归档已同步至收礼流程彩排版本，50 个构建文件与 `dist/` 逐个 SHA-256 匹配，包含池塘、蘑菇、石拱与新门素材；四题、九首曲目和礼物规则与本轮前备份相同，提示文字已收短。备用包不自动随源码变化更新。使用方法见 [LOCAL_PREVIEW.md](docs/LOCAL_PREVIEW.md)，已确认内容与可选补充位置见 [CONTENT_HANDOFF.md](docs/CONTENT_HANDOFF.md)。

真实截图、采样范围与限制见 [M5_DESKTOP_QA.md](docs/M5_DESKTOP_QA.md)。真实内容、实体触摸板／声音、自然行走探索节奏与现场断网尚待验收，因此不将 M5 整体或正式赠送版本标为完成。

## 礼物功能与历史 M4 检查

- 单个文本框保留前导零，支持完整粘贴和 Enter。`0305` 开门；`305` 和错误四位不通过，错误保留输入、不限制次数。
- 正确后先保存解锁，再播放 900ms 局部开门反馈。静态／减少动态流程可用；动画中刷新仍已解锁，切页和关闭会取消旧回调。
- 未解锁访问 `#gift` 会回到锁页；生日含义仅在门内显示。直接输入密码只解锁礼物，不完成谜题、不生成密码卡或曲目。
- 揭晓页保留现场交付停顿，提供返回音乐和花园入口；关闭恢复原位置。已解锁者从顶部 `Your gift` 或音乐页直接重看。
- 礼物名称已接入 `A passport holder & a sleep mask`，名称占位标记已关闭；送礼理由、照片和称呼可后补。没有照片时保留中性礼物图示，空理由和称呼不展示。未接入私人音频。

桌面实际检查错误输入、动画中刷新、揭晓刷新、回看密码卡、跨面板返回、历史前进后退、空进度减少动态解锁及焦点循环。23 项礼物检查、49 项谜题／音乐回归、内容校验、类型与构建通过；Three 分包体积提示仍存在。截图与限制见 [M4_GIFT_QA.md](docs/M4_GIFT_QA.md)。

## 音乐功能与历史 M3 检查

- 九朵花固定编号 01–09；碰触单朵花只作回应，点击抽取按钮才会选歌。
- 每次从九首中独立等权、有放回抽取，允许连续抽到同一首。结果先保存，再播放短暂花朵反馈；刷新、切页或关闭面板不会重抽。
- 曲目卡提供复制点歌文字和手动选择文字；不会替用户发送消息。复制成功后才显示确认，失败则提供可选中的原文。
- 可直接进入音乐页，无须解谜；关闭后恢复原来的角色、镜头、朝向和缩放。音乐不改变谜题或礼物进度。
- 九首曲名现已按用户顺序接入，全部关闭占位标记；固定编号与已抽取记录不变。可选理由为空时省略，实际录音尚未提供，不虚构音频或播放器。

桌面 1280×720 已实际检查双击防重复、动画中刷新恢复、复制成功反馈、手动选择文字、切页返回、静态模式与键盘焦点。31 项音乐检查、18 项谜题回归、配置校验、类型检查和生产构建通过。证据和检查范围见 [M3_MUSIC_QA.md](docs/M3_MUSIC_QA.md)。

## 历史 M2 · 两组 XOR 题（已被四题原案替代）

- 信号 A、B 依次解码。四个输出初始为空，验证灯位后才进入数字输入；错误保留答案。
- 一组完成保存两位片段；两组都完成才出现密码卡和顶部 `My password card`。
- 提示逐层展开。完整示范需要主动选择，再明确确认才能替当前组完成，不会自动填写另一组。
- 保存填写中的灯位、数字和完成状态。刷新继续；存储不可用时可在当前页面内完成。
- 音乐过场为可选内容；谜题、音乐、礼物状态互相独立。页面文案和无障碍标签为英文。
- 原美术、地点、环境反馈及固定谜题规则保持。音乐抽取和礼物揭晓已接入；真实内容待填。

检查记录和真实截图见 [M2_SIGNAL_QA.md](docs/M2_SIGNAL_QA.md)。桌面浏览器实际走通两组谜题、提示、刷新恢复、静态替代、键盘焦点、关闭与历史导航；18 项谜题/存储检查、22 项指针回归、配置检查、类型检查和生产构建通过。Three 分包仍有体积提示。

本轮没有重新验证实体触摸板手感、音频听感、FPS、手机或部署，也没有重新宣称整段自然行走节奏达标。M1 自然行走和返程的历史证据见 [FLOOF_CLEARING_QA.md](docs/FLOOF_CLEARING_QA.md)；背景方向获认可不代表整个美术已最终验收。

## 检查、构建与安装

```sh
sh scripts/project.sh check
sh scripts/project.sh build
sh scripts/project.sh preview
```

`preview` 提供已构建版本，默认 http://127.0.0.1:4173/。不要直接双击 dist/index.html。

本机使用 Node **24.22.1**、pnpm **11.25.0**。React 19、TypeScript、Vite、React Three Fiber、Three.js、GSAP 的精确版本以 pnpm-lock.yaml 为准。另一个常规 Node 22.12+ 或 24 环境可运行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

本机没有全局 Node，project.sh 自动寻找 Codex 运行时，并跳过不能加载第三方原生模块的 cua_node。直接运行确定性检查使用本机 Node 24 路径：

```sh
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-puzzle-progress.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-music-progress.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-song-draw.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-music-copy.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-gift-progress.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-gift-unlock.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-content.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-pointer-guidance.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-art-loading.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-walkable-ground.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-orchard-pond.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-hollow-arch.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-hill-moon.mjs
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/check-gift-gate.mjs
```

需要重新安装依赖时：

```sh
PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
"$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm" install --frozen-lockfile --store-dir .pnpm-store
```

## 文件与内容

- 运行时内容与校验：src/config/content.json、content.ts；原交接模板不作为第二份运行时配置。
- 谜题界面：src/ui/SignalPuzzle.tsx、src/styles/puzzle.css。
- 音乐界面／抽取：src/ui/MusicGarden.tsx、src/styles/music.css、src/lib/draw.ts、src/motion/useSongDraw.ts。
- 礼物门／揭晓：src/ui/GiftDoor.tsx、src/styles/gift.css、src/lib/gift.ts、src/motion/useGiftUnlock.ts。
- 业务状态／计算／存储：src/state/experience.ts、useProgress.ts、src/lib/puzzle.ts、storage.ts。
- 当前美术：src/scene/FloofTerrain.tsx、FloofScenery.tsx、RabbitCompanion.tsx、FloofStatic.tsx；本地素材 public/art/floof/。
- 当前角色输入：src/motion/useMeadowJourney.ts、src/scene/pointerGuidance.ts。
- 章节导航与原位置恢复：src/App.tsx；导航历史不写入业务存储。
- 本地 Cormorant Garamond 字体附 SIL OFL 许可，是文学气质的授权替代，不声称是 Wayfinder 原字体。

当前进度写入本应用专用键 `birthday-gift:0305:v2`。首次缺少 v2 记录时，会只读旧 `birthday-gift:0305:v1`，迁移礼物解锁和有效最近曲目；旧题答案与完成状态不映射成新题完成。旧键不覆盖、不删除。重测优先使用独立端口；确需重置 v2 时见 [LOCAL_PREVIEW.md](docs/LOCAL_PREVIEW.md)，不要清空其他进度或整个 localStorage。界面没有清空进度按钮。前端密码属于揭晓机关，不是身份认证。

已接入护照夹和睡眠眼罩，以及用户按顺序提供的九首曲名。可后补：曲目理由、送礼理由与照片、称呼和署名。私人语音／演奏未提供时保持 null，不虚构内容或播放器。

## 后续与历史

本轮音乐花圃至池塘已实际检查行走、返回、静态替代并保存截图；下一步结合视觉反馈继续深处区域的美术与静态场景。称呼、礼物说明／照片按需补充，展示设备上的触摸板手感、声音和自然探索节奏仍需实际确认；手机仍按用户要求暂缓。九首曲名已确认，曲名接入不等同于录音或播放器已完成。

- [当前四题原案与存储迁移](docs/FOUR_QUESTION_PUZZLE.md)
- [音乐花圃至池塘实际检查与截图](docs/ORCHARD_POND_QA.md)
- [历史 M5 技术彩排与本地备用](docs/M5_DESKTOP_QA.md)
- [阶段进度与全部历史](docs/PROGRESS.md)
- [移动顺滑度修正与测量](docs/SMOOTH_MOTION_QA.md)
- [转向与停步修正](docs/TURN_STOP_QA.md)
- [历史 M2 检查（旧两组题）](docs/M2_SIGNAL_QA.md)
- [M3 检查与截图](docs/M3_MUSIC_QA.md)
- [M4 检查与截图](docs/M4_GIFT_QA.md)
- [当前美术方向检查](docs/FLOOF_CLEARING_QA.md)
- [本轮前 README，保留历史实现说明](docs/versions/README-before-m2-20261101.md)
- M4 前备份：docs/versions/before-m4-20261102.tar.gz；M3、M2 前备份继续保留。
- 原始计划：birthday-site-handoff/docs/DEVELOPMENT_PLAN.md；原始文档与 reference 未改。
