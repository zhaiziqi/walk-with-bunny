# 本地美术素材清单

更新日期：2026-11-01。`ready` 表示该素材已导出、存在于本地且能供 M1 使用；不单独代表整页构图或设备验收通过。整页验收见 `PROGRESS.md`。

最新增量素材见本页末尾「八向兔子与首段路线精修」。此前段落保留历史用途，最新整页证据见 [FIRST_TRAIL_REFINEMENT_QA.md](FIRST_TRAIL_REFINEMENT_QA.md)。

## 历史 · 八区域花园与分岔探索（2026-11-01）

入口继续使用获认可方向的 `quiet-garden.webp`；探索区现由八区域、十二条路径与五个独立环路组成，沿位置渐入暮色。原兔子正背姿态、花灯、粉花、小门和树木继续复用，增加以下四张原创透明插画，丰富树冠、地面植被与遗迹轮廓。实际运行映射在 `src/config/art.ts`，区域和路网在 `gardenAtlas.ts`。本轮桌面浏览器检查已完成，实际范围与截图见 [ATLAS_GARDEN_QA.md](ATLAS_GARDEN_QA.md) 为准，不沿用下方历史报告的通过状态。

| ID / 运行文件 | 原始PNG | 实际尺寸 / 运行体积 | 当前用途 |
| --- | --- | --- | --- |
| `willow` · `public/assets/garden/atlas-willow.webp` | [atlas-willow.png](art-source/atlas-willow.png) | 1024×1536 RGBA / 942,598 B | 蓝绿细叶与垂枝柳树，柳塘和相关路径的遮挡层 |
| `blossom` · `public/assets/garden/atlas-blossom.webp` | [atlas-blossom.png](art-source/atlas-blossom.png) | 1024×1536 RGBA / 612,938 B | 疏枝粉白花树，果园及邻近路段 |
| `fern` · `public/assets/garden/atlas-fern.webp` | [atlas-fern.png](art-source/atlas-fern.png) | 1024×1536 RGBA / 625,220 B | 蕨叶、草叶和白铃花组成的低矮植被，沿途和蘑菇区域 |
| `arch` · `public/assets/garden/atlas-arch.webp` | [atlas-arch.png](art-source/atlas-arch.png) | 1024×1536 RGBA / 567,150 B | 有透明门洞的旧石拱门，稀疏藤叶与野花 |

四图均通过内置 ImageGen 原创生成，提示指定2:3纵向构图和真实透明背景；实际输出为上表尺寸。原图保留在本项目，WebP仅格式转换，没有裁切、改色或修改alpha；运行文件合计 **2,747,906 B**。完整提示、默认生成源路径、输出路径与alpha统计见 [atlas-generation-prompts.json](art-source/atlas-generation-prompts.json)。参考了本项目现有入口与树木的配色和水彩质地，没有下载或复制Wayfinder/Bellwoods的美术。

| ID | alpha > 200 包围盒 `(left,top,right,bottom)` | `footInsetRatio` | 全透明像素比例 |
| --- | --- | --- | --- |
| `willow` | `(25,24,1006,1499)` | `0.02408854` | 25.76% |
| `blossom` | `(14,28,1011,1503)` | `0.02148438` | 48.85% |
| `fern` | `(21,32,994,1451)` | `0.05533854` | 49.45% |
| `arch` | `(23,57,1004,1456)` | `0.05208333` | 47.23% |

根部留白比按 `(1536−bottom)/1536` 计算；少量低不透明度水彩边缘会延伸到画布边界，落地锚点采用主要轮廓。石拱门画布中心alpha为0，门洞是透明区域。以上为素材尺寸和透明度检查，不代表整页透视、接地、遮挡或性能已经验收。

`RabbitCompanion.tsx` 使用既有正背兔子素材，以网格形变实现耳朵延迟摆动，并加入小跳、身体起伏、停留呼吸、轻微耳动和渐隐足迹；没有新增多帧兔子贴图或完整骨骼。`AtlasEncounters.tsx` 使用本地几何与上述素材实现六处落花、睡莲、水纹、蘑菇、风铃萤火、纸鸟和月光回应，靠近/停留或附近E键与按钮触发；阅读时暂停。`GardenMap.tsx` 的「小兔的地图」为代码绘制的路线与地点图，支持即时到达并保留本次浏览的发现。以上均未新增音频或改变谜题、音乐和礼物规则。减少动态和图形降级仍简化场景响应，实际范围见本轮QA记录。

## 历史 · 透视地形与沿途回应（2026-10-30）

以下记录保留上一版的素材用途和检查范围；其中「当前」「本轮」指当时的透视地形与生态响应阶段，不替代上方八区域版本的验收。

入口继续保留 `quiet-garden.webp`。探索区现为实际起伏网格、倾斜透视相机与地点相关的生态响应；角色、树木及主要物件仍使用本项目原创透明水彩插画。它不是完整三维角色骨骼或实体碰撞世界，也不是无限地图。本轮只处理电脑网页，整页实际效果与验证范围见 [LIVING_GARDEN_QA.md](LIVING_GARDEN_QA.md)；下方历次素材记录与截图不替代本轮验收。

| ID / 当前运行文件 | 可追溯源图 / 记录 | 当前用途与实际尺寸 |
| --- | --- | --- |
| `environment` · `public/assets/garden/quiet-garden.webp` | [quiet-garden.png](art-source/quiet-garden.png) | 保留获认可方向的原创水彩入口；不作为新探索区的整屏平移地图 |
| `meadow` · `public/assets/garden/walk-meadow-v2.webp` | [walk-meadow-v2.png](art-source/walk-meadow-v2.png)、[walk-generation-prompts.json](art-source/walk-generation-prompts.json) | 1448×1086，复用为地形材质的细微纸感/明暗输入；路径、地形起伏、近远色彩和雾由代码独立绘制 |
| `tree` · `public/assets/garden/walk-tree.webp` | [walk-tree.png](art-source/walk-tree.png)、[透明检查](art-source/walk-tree-alpha-check.jpg) | 原创透明水彩树，1024×1536；放置于共同地形高度，作为面向镜头的插画参与前后遮挡 |
| `rabbit` · `public/assets/garden/quiet-rabbit.webp` | [quiet-rabbit.png](art-source/quiet-rabbit.png)、[原始提示](art-source/quiet-generation-prompts.json) | 保留原正面持花小兔，1024×1536；角色位移与镜头独立，步伐、转身与阴影由代码控制 |
| `rabbitBack` · `public/assets/garden/living-rabbit-back.webp` | [living-rabbit-back.png](art-source/living-rabbit-back.png)、[提示](art-source/living-rabbit-back-prompt.json)、[尺寸与透明范围](art-source/living-rabbit-back-metadata.json) | 内置 ImageGen 依据原兔子生成的同角色背面三分之四行走姿态；1024×1536 RGBA，262,782字节，59.1%像素全透明 |
| `lantern` / `flower` / `door` | 下方 quiet 水彩素材表 | 保留原三盏装饰花灯、单朵粉花和闭合小门；位置与尺度取自当前世界配置，未改变固定谜题、音乐或礼物规则 |

新增背面兔子只从生成 PNG 导出 WebP，没有裁切、改色或编辑透明度。其alpha大于200的范围为 `(105,37)–(977,1483)`；脚底透明留白比为 `(1536−1483)/1536 = 0.0345052`。较淡水彩边缘延伸到图像底部，因此锚点依据主要脚部轮廓，而非所有非零alpha像素。保留粉花、奶油色毛色、一立一垂的耳朵与柔和水彩笔触；它是单张方向姿态，不能描述成多帧骨骼动画。

实际资源映射在 `src/config/art.ts`。`depthWorld.ts` 提供地形高度和透视投影，`ExplorationScene.tsx` 绘制地面、树木、角色与主要物件；`LivingWorld.tsx` / `ecology.ts` 以本地几何和现有素材实现草叶、蝴蝶、种子、水面涟漪和石边等待回应，没有新增外站图片或音频依赖。`StaticExploration.tsx` 用同一投影绘制SVG地形与本地插画，动态生态在减少动态/图形降级时简化，不宣称像素级等同 WebGL。

`ground-contact.svg`、`root-grass.svg`、`dream-glow.svg` 等本地辅助层仍按需要复用；旧 `quiet-clearing.svg`、`dream-mist.svg`、旧地面/长图及未采用稿保留。原始交接、用户参考图片视频与原站截图只用于开发研究，未转成发布资产。M2的四输出灯、M3九朵曲目花、M4门扇分层和完整揭晓仍是后续素材/功能工作。

## 历史 · 平面草地中的桌面小兔行走场景（2026-10-30）

以下段落保留前一版 `MeadowLayers.tsx` 的素材用途；其中「当前」「本轮」指当时平面草地行走阶段，不描述上方新透视地形的运行方式。

入口继续使用用户已认可方向的 `quiet-garden.webp`；进入探索后改用连续地面 `walk-meadow-v2.webp`，配合新树木与原有水彩兔子、粉花、花灯和小门。当前是2.5D分层绘画中的小兔行走与镜头跟随，不是完整三维角色、碰撞世界或无限地形。本轮只处理桌面，整体构图和最终交互结果见 [WALK_GARDEN_QA.md](WALK_GARDEN_QA.md)，不以背景认可或历史手机截图代替验收。

| ID / 当前运行文件 | 可追溯源图 / 记录 | 用途与来源 |
| --- | --- | --- |
| `environment` · `public/assets/garden/quiet-garden.webp` | [quiet-garden.png](art-source/quiet-garden.png) | 保留的原创水彩入口远景，维持浅奶油、雾蓝和大留白 |
| `meadow` · `public/assets/garden/walk-meadow-v2.webp` | [walk-meadow-v2.png](art-source/walk-meadow-v2.png) | 内置ImageGen编辑本项目原创草地初稿后生成的连续地面，1448×1086；减少草、花和石头密度，保留柔和分岔小径与空地，用于进入探索后的地面 |
| `tree` · `public/assets/garden/walk-tree.webp` | [walk-tree.png](art-source/walk-tree.png) | 内置ImageGen原创生成的独立透明水彩树；稀疏浅灰绿树冠、细树干，供沿途景物与遮挡层使用；透明检查为 [walk-tree-alpha-check.jpg](art-source/walk-tree-alpha-check.jpg) |
| `rabbit` / `lantern` / `flower` / `door` | 下方quiet素材表中的源图与提示 | 继续复用本项目原创水彩角色与物件；兔子成为行进角色，三处物件的环境发现不代表谜题、抽歌或礼物规则已完成 |

新素材完整提示与生成记录保存在 [walk-generation-prompts.json](art-source/walk-generation-prompts.json)。第一版地面 [walk-meadow.png](art-source/walk-meadow.png) 与 `public/assets/garden/walk-meadow.webp` 保留为制作历史，当前运行映射使用v2。v2记录中区分了请求分辨率和实际输出分辨率，不将请求的3072×2304当成实际产物尺寸。

实际文件映射以 `src/config/art.ts` 为准，连续地面与环境布置在 `src/scene/meadowWorld.ts` / `MeadowLayers.tsx`。`quiet-clearing.svg`、`ground-contact.svg`、`root-grass.svg`、`dream-mist.svg`、`dream-glow.svg` 等本地辅助层继续保留。前一版画布平移实现备份为 `docs/versions/quiet-pan-20261030/`；原文档、参考文件和正常工作的美术资源均未删除。线上参考仅用于研究，不作为运行素材。

## 保留并复用 · quiet 水彩素材（2026-10-30）

以下表格记录quiet素材的来源；其中关于「背景微视差」「物件固定」等描述对应前一版画布拖动方案。当前入口保留quiet远景，探索地面与小兔行走以本页上方章节为准。

quiet系列采用浅奶油、雾蓝的稀疏水彩背景与原创兔子、花灯、粉花和小门。用户认可的是 `quiet-garden` 的背景方向；这不代表所有素材、整张页面或整站视觉已获验收。该历史画布版本的实际构图与设备检查见 `QUIET_GARDEN_QA.md` 及 `qa/quiet-rabbit/` 的截图。

| ID / 当前运行文件 | 可追溯源图 / 记录 | 用途与来源 |
| --- | --- | --- |
| `environment` · `public/assets/garden/quiet-garden.webp` | [quiet-garden.png](art-source/quiet-garden.png) | 内置 ImageGen 原创生成的浅奶油、雾蓝水彩远景，保留大面积留白；运行时使用有界微视差，不承担物件的完整位移 |
| `rabbit` · `public/assets/garden/quiet-rabbit.webp` | [quiet-rabbit.png](art-source/quiet-rabbit.png) | 内置 ImageGen 原创兔子；用户图片用于理解柔软、可爱与纸质笔触方向，重新设计角色与持花姿态，透明背景 |
| `lantern` · `public/assets/garden/quiet-lantern.webp` | [quiet-lantern.png](art-source/quiet-lantern.png) | 内置 ImageGen 依据项目原花灯概念重绘的三盏奶油花灯，采用疏朗水彩造型，透明背景；仅用于 M1 装饰与点亮演示 |
| `flower` · `public/assets/garden/quiet-flower.webp` | [quiet-flower.png](art-source/quiet-flower.png) | 内置 ImageGen 依据项目原粉花概念重绘的单朵浅粉花，细茎与少量叶片，透明背景；尚非九首曲目的完整花圃 |
| `door` · `public/assets/garden/quiet-door.webp` | [quiet-door.png](art-source/quiet-door.png) | 内置 ImageGen 依据项目原小门概念重绘的奶油色小门，稀疏藤叶与细窄暖光，透明背景；尚未实现开门分层或礼物揭晓 |
| `clearing` · `public/assets/garden/quiet-clearing.svg` | [quiet-clearing.svg](../public/assets/garden/quiet-clearing.svg) | 项目代码原生 SVG 接地层，900×220；使用淡草地渐变、纸感边缘和少量草叶，连接兔子及物件与绘画草坡，不是生成的位图 |

上述五张 PNG 是本轮生成源图，WebP 是供页面加载的导出版本。完整生成提示保存在 [quiet-generation-prompts.json](art-source/quiet-generation-prompts.json)，分别以 `environment`、`rabbit`、`lantern`、`flower`、`door` 为键；透明物件的检查图为 `docs/art-source/quiet-*-alpha-check.jpg`。参考研究页为 [quiet-rabbit/index.html](reference-review/quiet-rabbit/index.html)。生成来源、提示与实际本地图片均可据此追溯，用户参考图片与视频不作为可发布素材直接使用。

当前映射以 `src/config/art.ts` 为准，允许 `content.json` 中明确配置的素材路径覆盖默认值。花园物件在独立二维世界中固定位置，用共享透视投影呈现；接地层与可见性由 WebGL 和静态渲染共用。背景使用 `backdropFrame` 的有界微视差，明暗由位置对应的暮色层控制。

当前仍复用项目原创的 `ground-contact.svg`、`root-grass.svg`，并使用 `dream-mist.svg`、`dream-glow.svg` 作为阴影、草叶、薄雾与光晕辅助层。旧环境、长图、地面纹理及原粉花/灯/门位图均保留制作记录，已不在当前默认主美术映射中；其中的历史尺寸、坐标和路线说明不能用于描述当前页面。

## 历史记录 · 旧版运行素材

以下表格与后续旧版素材记录保留当时内容；其中「当前」「本轮」均指旧纵深或长图阶段。当前桌面小兔行走版本以本页顶部章节及 `src/config/art.ts` 为准，旧版检查通过不等于当前页面通过。

| ID / 文件 | 原尺寸 | 用途与层级 | 锚点 / 状态 | 来源 |
| --- | --- | --- | --- | --- |
| `environment` · `public/assets/garden/environment.webp` | 1536×1024，RGB，291,236 B | 当前固定天空与远丘；独立网格覆盖近处地形 | 远景跟随取景以保持稳定，不承担路线移动；ready | 原内置 ImageGen 第二版手作故事书环境 |
| `ground` · `public/assets/garden/ground-moss.webp` | 1254×1254，RGB，654,924 B | 当前起伏草坡网格的重复苔藓地面纹理 | 地形 UV；ready，整页效果待本轮检查 | 内置 ImageGen，依据原环境制作俯视正方形苔藓材质 |
| `panorama` · `public/assets/garden/journey-panorama.webp` | 2172×724，RGB，409,756 B | 历史横向长图保留；原环境缺失时可作远景备用 | retained / 备用，不再定义路线 | 内置 ImageGen，依据现有花园环境扩展，保留材质与配色 |
| `bank` · `public/assets/garden/path-bank.webp` | 1860×846，RGBA，349,436 B | 沿途独立低苔藓边坡，多处复用以形成遮挡 | 底部根部；ready | 内置 ImageGen，透明背景，与现有花园同材质 |
| `lantern` · `public/assets/garden/lantern.webp` | 1161×1355，RGBA，274,978 B | 信号空地主角，三盏奶油花形灯 | 世界 `(x,z)=(-140,-650)`，高度取地形；`footInset=11.3`；ready | 保留原内置 ImageGen 资产 |
| `flower` · `public/assets/garden/flower.webp` | 1024×1536，RGBA，209,880 B | 入口附近的可回应粉花 | 世界 `(x,z)=(-96,480)`，高度取地形；`footInset=5.5`；ready | 保留原内置 ImageGen 资产 |
| `door` · `public/assets/garden/door.webp` | 1024×1536，RGBA，305,250 B | 入口附近的小门样片 | 世界 `(x,z)=(102,400)`，高度取地形；`footInset=5.4`；ready | 保留原内置 ImageGen 资产 |
| `contact` · `public/assets/garden/ground-contact.svg` | 400×90，透明 | 花根、灯座和门底的局部柔和接触阴影 | 接地点约 `(200,46)`；ready | 项目原创 SVG，橄榄色径向渐变与不规则阴影 |
| `grass` · `public/assets/garden/root-grass.svg` | 450×120，透明 | 物件根部的低草叶遮挡 | 根部基线约 `y90`，中心 `x225`；ready | 项目原创 SVG，叶片、叶脉与渐隐苔藓 |
| `threshold` · `public/assets/garden/threshold.svg` | 260×160，透明 | 门槛前的踏石和苔藓连接 | 远端石约 `(130,30)`，近端石约 `(152,120)`；ready | 项目原创 SVG |
| `cloud` · `public/assets/garden/cloud-wisp.svg` | 600×180，透明 | 独立低对比薄云，移动频率低于植物 | 中心约 `(300,95)`；ready | 项目原创 SVG，暖白软云 |
| `foliage` · `public/assets/garden/foliage.svg` | 600×700，透明 | 原 SVG 前景保留；当前连续路线使用新增苔藓边坡 | retained / 旧前景 | 项目原创程序化 SVG |
| `favicon` · `public/assets/garden/favicon.svg` | viewBox 64×64 | 浏览器图标 | 中心；ready | 项目原创 SVG |

文件映射以 `src/config/art.ts` 为准；当前三维路线的落点、地形高度、透明留白修正和透视投影以 `src/scene/world.ts` 为准。上述地标位置是世界坐标，`footInset` 以世界单位表示，不再用视口百分比定位。WebGL、静态图层与 DOM 点击范围共享投影，手机使用同一路线及有界侧向取景。

七张本地 WebP（包括历史备用全景）合计约 2.50 MB（2,495,460 字节），另有少量 SVG。此前新增四个 SVG 合计 8,139 字节。当前小路的细砂纹理由代码在本地生成，不另依赖图片下载。页面不依赖外站图片、远程字体或音频服务。图中没有烘焙密码、曲目文字、按钮或谜题答案。

## 源图、草稿与参考

| 文件 | 状态 | 说明 |
| --- | --- | --- |
| `docs/art-source/environment.png` | draft / 未采用 | 第一版环境偏写实，保留制作记录，不参与网页运行 |
| `docs/art-source/environment-storybook.png` | ready / 源图 | 当前固定远景的生成源图，也是地面材质的风格基础 |
| `docs/art-source/ground-moss.png` | ready / 源图 | 当前地形纹理的原始生成 PNG，1254×1254 RGB，4,238,819 字节 |
| `docs/art-source/journey-panorama.png` | retained / 历史源图 | 此前横向长图路线的原始 PNG；当前只保留远景备用用途 |
| `docs/art-source/path-bank.png` | ready / 源图 | 本轮透明苔藓边坡的原始生成 PNG |
| `docs/art-source/flower.png` | ready / 源图 | 当前音乐花 WebP 的生成源图 |
| `docs/art-source/door.png` | ready / 源图 | 当前闭门 WebP 的生成源图 |
| `docs/art-source/lantern.png` | ready / 源图 | 当前灯组 WebP 的生成源图 |
| `public/assets/garden/lantern.svg` | draft / 未使用 | 初期原创 SVG 灯组，当前运行映射已改为 WebP；仅保留制作过程 |
| `reference/` 两张 JPG、两段 QT 视频 | 用户参考 | 原文件保留，只用于风格研究，不用于发布资产 |
| `docs/reference-review/` | 开发参考检查 | 浏览器本地关键帧查看页及检查截图，不进入 `dist/` |
| `docs/qa/*-qa-*.jpg` | QA | 透明素材在绿/奶油底上的检查图，不进入运行页面 |
| `docs/qa/depth/` | 本轮 QA 截图目录 | 透视纵深版本入口、途中、目的地及实际验证截图；检查结论须见 `DEPTH_QA.md` |

生成使用内置 ImageGen；本轮 Pillow 仅用于 WebP 格式导出和 alpha 范围/边界读取，旧版另有透明边缘 QA 合成。没有复制原参考作品的专有角色、名字、城市记忆、文字或主要美术。

## 历史限制与下一阶段素材记录

以下前四条继续保留旧纵深路线阶段的限制与检查范围；当前实现、地形和静态降级以上方「透视地形与沿途回应」章节为准。后续谜题、曲目花和开门素材缺口仍然有效。

- 当前天空、远丘和原背景云保留在固定环境图中；近处草坡与小路使用独立三维网格，透明图片地标固定在路线中。新增 `cloud-wisp.svg` 独立缓慢移动，不代表所有云已从背景拆出。
- 本轮增加独立地面材质，前景继续使用同材质苔藓边坡；接地阴影、根部草叶和门前踏石为 SVG。静态替代的地形为 SVG 渐变与投影多边形，不宣称与 WebGL 的纹理细节完全一致。
- 地面源图与 WebP 已读取尺寸、颜色模式及字节数；连续铺贴接缝、整页构图、遮挡与设备结果须以 `DEPTH_QA.md` 和 `docs/qa/depth/` 的本轮实测为准。此前边坡 alpha 范围 0—255 及 `JOURNEY_QA.md` 只属于历史素材/页面检查，不代表新透视版本验收通过。
- M1 使用一朵音乐花；完整九朵花及稳定曲目映射在 M3 实现，不用同一张静态图冒充抽歌结果。
- 总览灯组为三盏装饰灯；M2 的四个输出位必须另用真实 DOM 控件呈现，不能从这张图推导谜题状态。
- 小门当前是一张闭合图片；M4 需要门框/门扇分层或配套开门表现。
- 信号近景的正式解码卡、音乐卡、礼物揭晓阅读区在 M2—M4 继续接入。
- 图形失败时复用本地静态图层；关键素材失败时以代码绘制景物与 HTML 入口继续使用。故障替代不冒充最终美术。

## 待用户提供的真实内容

| 内容 | 当前状态 | 影响阶段 |
| --- | --- | --- |
| 收礼者称呼、送礼者署名 | 空字符串，可选择保持中性文案 | M4 定稿 |
| 九首固定编号曲名 | 全部 `placeholder: true` | M3 可先开发，M4 必须定稿 |
| 每首选择理由 | 空，可省略 | M4，可选 |
| 礼物名称、介绍、祝福语 | 模板/占位，未编造真实礼物 | M4 |
| 礼物照片 | `null` | M4，可选；不妨碍真实文字揭晓 |
| 邀请语音、音效 | `null`，相关控件隐藏 | 可选 |

统一填写入口是 `src/config/content.json`。未提供路径保持 `null`；生产图层由 `src/config/art.ts` 映射到本表实际存在的本地文件。


## 历史增量 · 四向兔子、英文字体与小路回应（2026-11-01）

以下为上一轮素材来源与用途记录；本轮补足斜向动作并调整首段路线，见后续新增章节。

本轮保留八区域的所有既有素材，仅增加下表兔子图集和字体。当前运行映射以 `src/config/art.ts` 与 `src/styles/garden.css` 为准。所有图片提示、源图、透明检查和旧版本继续保留，未改动原始交接包或用户参考文件。

| 运行资源 | 原始来源与记录 | 实际尺寸 / 体积 | 用途与许可 |
| --- | --- | --- | --- |
| `rabbitAtlas` · `public/assets/garden/rabbit-atlas-v2.webp` | [源PNG](art-source/awakening/rabbit-atlas-v2.png)、[生成与底色清理提示](art-source/awakening/prompts.json)、[透明范围与帧尺寸](art-source/awakening/rabbit-atlas-metrics.json)、[深浅底检查页](art-source/awakening/alpha-preview.html) | 1024×1536 RGBA，325,606 B（约318KiB）；12帧，四方向×站立/蓄力/腾空 | 内置ImageGen以本项目原创角色为参考生成，再由图像工具清理角色之外的底色；未使用外站兔子插画或参考作品角色 |
| `public/assets/fonts/cormorant-garamond-latin.woff2` | [本地来源说明](font-source/README.md)、[完整上游TTF](font-source/cormorant-garamond-variable.ttf)、[OFL许可](../public/assets/fonts/OFL-CormorantGaramond.txt) | 37,776 B（约37KiB），300—500可变字重，Latin字符集 | Cormorant项目作者；Google Fonts官方分发，SIL Open Font License 1.1。本地预加载，不产生远程字体请求 |

兔子图集alpha范围为0—254，全透明像素比例约47.63%。每帧采用测得的主要不透明轮廓加边距定义UV，统一0.46世界单位/像素，脚底留白约1.38世界单位；完整逐帧数据在上述metrics文件与 `src/scene/rabbitAtlas.ts`。运行时在原图集上取UV，没有裁切成独立位图；WebP为格式导出。四向三姿态结合实际位移驱动的步态、接地和原地收势，仍不是完整三维骨骼或逐关节动画。旧正面与背面兔子保留为既有素材和备用来源。

Cormorant Garamond由[官方Google Fonts仓库](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond)与其字体服务获取，完整上游文件及许可均保留。选用它是为了轻盈、文学性的英文排版，不声称这是Wayfinder的同款字体。系统无衬线字体用于操作控件。页面文案、无障碍标签与后续内容配置均为英文，图像没有烘焙文字、谜题答案或私人内容。

`TrailAwakening.tsx` 中的蝴蝶、花瓣、小花和小路留痕为项目代码生成的几何图形，复用原有阴影和光晕纹理，不新增外站图片。`gardenWind.ts` 提供共用风场；环境记忆通过事件记录在同次浏览中保存。`StaticExploration.tsx` 以SVG和同一投影呈现已产生的开花、花瓣、蝴蝶停点和灯光状态，省略动态过程。八区域地图与未知方向仍为本地SVG绘制，快捷返回只限已发现区域。

`useGardenSound.ts` 默认关闭，以Web Audio本地合成轻风和三种首次发现的单次轻声回应，不是外部音乐文件，也不代表九首曲目已经完成。只有主动点击才创建/恢复音频环境；阅读时衰减，页面隐藏后暂停。私人邀请语音和真实演奏文件继续为 `null`。**本轮未实际验证听感**，不将实现存在当作声音验收通过。

最新浏览器截图与检查限制见 [AWAKENING_GARDEN_QA.md](AWAKENING_GARDEN_QA.md)。本轮为桌面M1改进，未开展手机适配或部署；M2输出控件、M3九首曲目内容、M4门扇/礼物揭晓及M5彩排仍待完成。入口到花灯路径约1,223世界单位，最高速度约5秒，不以新增回应或素材数量宣称60—90秒探索节奏已达标。


## 当前增量 · 八向兔子与首段路线精修（2026-11-01）

原 `rabbit-atlas-v2.webp`、英文字体、花灯、粉花、小门与八区域环境素材均保留。本轮只新增四个斜向方向的水彩图集，配合程序动作与首段空间调整，不复制Wayfinder或Bellwoods的代码、角色或图片。

| 运行资源 | 源图与提示 | 实际数据 | 用途 |
| --- | --- | --- | --- |
| `rabbitDiagonalAtlas` · `public/assets/garden/rabbit-diagonal-v1.webp` | [原始PNG](art-source/awakening/rabbit-diagonal-v1.png)、[完整生成提示](art-source/awakening/rabbit-diagonal-prompt.txt) | 1024×1536 RGBA；源PNG 2,113,855 B；WebP 356,510 B（约348KiB） | 内置ImageGen依据本项目原创兔子生成；前右、后右、后左、前左四个45度方向，各含站立、蓄力、腾空三姿态 |

新旧两张图集合计 **八方向×三姿态＝24个姿态**。新增帧的透明连通轮廓包围盒、UV与尺寸记录于 `src/scene/rabbitDiagonalAtlas.ts`；原四向记录仍在 `rabbitAtlas.ts` 和 `rabbit-atlas-metrics.json`。基础换算为0.46世界单位/像素，`rabbitPoseDimensions` 再按各方向站立高度统一到166世界单位，保留每帧宽高比与蹲伏比例；不能再将上一轮未归一化的尺寸当成当前最终显示尺寸。运行时通过UV取帧，源图与原有图集完整保留。

`RabbitCompanion.tsx` 结合方向图集、按下预备、头部领先、身体转向、连续阻尼落地及局部网格形变呈现动作。松手冻结角色世界坐标和相机，落地收势在原地完成。每方向只有三种绘制姿态，仍不是完整骨骼或逐关节动画；新增素材不等于动作精美度已获用户验收。

首段入口改为 `(0,-1800)`，花灯为 `(-650,750)`，路中心线约3,316单位，最高速度下理论纯行走约13.8秒。首花 `(350,-1110)` 驻足开放后显露引路蝴蝶；花灯点亮后，已经实际走过的局部痕迹开花，真正返程到花边有独立回应。花、蝶、沿路花簇和根部接触层继续由本地几何、SVG与已有纹理构成。树丛取景、较冷远雾、落地阴影和前后遮挡用于组织首段层次，没有新增外站环境图片。

全英文文案、本地Cormorant Garamond及其OFL许可、默认关闭的程序环境声保持原方案；固定谜题、音乐和礼物规则不变。桌面1280×720已实际复测按住、斜向移动、松手停留、完整自然往返触发 `trail-returned`；阅读期间不移动，关闭后角色、镜头、朝向与缩放精确恢复，静态切换保留环境记忆。坡面指向翻转已修复，返程坡脊降低、相机抬高后复测完成；最终入口、弯道、花灯截图已归档，证据见 [FIRST_TRAIL_REFINEMENT_QA.md](FIRST_TRAIL_REFINEMENT_QA.md)。静态替代省略动画，八向角色每方向仍仅三姿态插值而非完整骨骼动画；首段理论13.8秒未达到60—90秒探索目标。尚无声音听感或FPS基准测试，未进行手机验收或部署，完整M2—M5仍待完成。
