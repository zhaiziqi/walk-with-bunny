# 原创美术素材生成记录

## signal-lamp-cluster

- 运行文件：`public/assets/garden/lantern.webp`；原始 PNG：`docs/art-source/lantern.png`。
- 尺寸：1161 × 1355（约 6:7）；RGBA；WebP 274,978 字节。
- Alpha 范围 0–255，65.54% 像素完全透明。
- 来源：内置 ImageGen，原创生成，2026-10-28。读取并查看已有花朵素材，按同一手绘软雕塑风格撰写提示。
- 状态：M1 总览装饰地标已制作；三盏高低灯只承担总览轮廓，后续谜题近景的四盏可交互输出灯仍应由独立 DOM 控件实现，不把此图当作答案面板。
- 透明检查：实际 WebP 已分别合成奶油白与苔藓绿底，并以 `view_image` 检查，无矩形残底或明显光晕残留。QA 文件：`docs/qa/lantern-qa-cream.jpg`、`lantern-qa-green.jpg`。
- 完整生成提示：

```text
Use case: stylized-concept. Asset type: a transparent cutout of THREE small secret garden signal lanterns, standalone website prop. Primary request: create an original cluster of three charming little cream glass garden lights at three different heights, on slim gently curved moss-green wooden stems, planted together in a low moss-and-leaf base with two tiny blush pink flowers. Match the soft sculptural hand-painted storybook material of a blush-pink flower with velvety moss-green leaves: fine warm paint texture, natural irregularity, small rounded toy-like shapes, soft dimensional shading. Each lantern has a rounded translucent milky ivory glass bell shade, a tiny warm pale yellow inner light, cream carved wooden rim, no metal cage, no futuristic bulb. Tallest at center, medium at left, shortest at right; clearly readable three separate lights with breathing room. Lighting from upper left, mild warm glow only inside glass, no broad external halo. The complete group silhouette fits approximately 6:7 width to height, root pivot lower center, enough transparent margin around all sides, front view with gently visible depth. Genuinely transparent background. Fresh moss #6E934B, deep green #385B41, ivory #FFF8E8, small blush #E8A8BC. This should look like a carefully crafted miniature garden sculpture and delicate illustration, not a real metallic street lamp. No background scene, no floor, no sky, no rectangular shadow, no pedestal block, no numbers, no writing, no symbols, no binary digits, no UI, no watermark.
```

以下素材使用内置 ImageGen 工具生成，没有使用 CLI/API 模式，也没有裁切用户参考作品。运行素材为本地 WebP，原始 PNG 保留在 `docs/art-source/`。Pillow 仅用于 WebP 导出及 QA 底色合成，没有对生产素材抠图或改画。

## flower-prototype

- 运行文件：`public/assets/garden/flower.webp`；原始 PNG：`docs/art-source/flower.png`。
- 尺寸：1024 × 1536；RGBA；WebP 209,880 字节。
- Alpha：范围 0–254，62.42% 像素完全透明。
- 来源：内置 ImageGen，原创生成，2026-10-28。
- 状态：M1 已制作；需放入页面进行最终比例、色彩和构图检查。
- 完整生成提示：

```text
Use case: stylized-concept. Asset type: transparent isolated interactive flower for a bright secret garden birthday website. Primary request: a single original imaginative pink flower, complete silhouette on genuinely transparent background, no background scene. Premium handcrafted soft clay and painted storybook aesthetic, NOT photorealistic. A graceful organic moss-green stem with two or three thick velvety leaves, rooted exactly at bottom center, very short small rounded moss base. Five or six plump soft petals in blush pink #E8A8BC with creamy ivory gradients #FFF8E8 and a tiny warm pale yellow textured central disk. Flower face tilted very gently toward viewer, stem softly curved, charming irregularity, refined hand-painted detail, soft sculptural volume. Left upper diffuse warm sunlight, subtle shadows within the object. Clean edges, adequate transparent margin on all sides. Vertical composition filling 80 percent of height; flower head broad enough to be legible when small. No pot, no character face, no arms, no text, no numbers, no musical notes or symbols, no UI, no watermark, no white background, no gray checkerboard painted into image.
```

## gift-door-closed

- 运行文件：`public/assets/garden/door.webp`；原始 PNG：`docs/art-source/door.png`。
- 尺寸：1024 × 1536；RGBA；WebP 305,250 字节。
- Alpha：范围 0–254，36.80% 像素完全透明。
- 来源：内置 ImageGen，原创生成，2026-10-28。
- 状态：M1 闭门物件已制作；后续 M4 仍需门框/门扇分层或配套开门效果。
- 完整生成提示：

```text
Use case: stylized-concept. Asset type: standalone door prop with genuinely transparent background for a bright secret garden website. Primary request: an original small freestanding cream wooden garden door, closed, rounded arched top and slim rounded frame, whimsical handcrafted sculpted storybook quality. A compact door with 5 softly uneven vertical wooden planks painted ivory #FFF8E8, delicate warm grain and soft handmade imperfections, small simple round wooden knob. Frame leafy vines curling organically around the arch, a few blush-pink #E8A8BC flower petals and one small pale pink fabric ribbon, fresh moss-green leaves #6E934B. Slim cream threshold at bottom, a few small moss tufts where it meets ground. Left upper diffuse warm sunlight, soft dimensional shading, three-quarter view so slight depth visible along right edge but front face clearly visible. Beautiful refined toy-like soft sculpture with hand-painted fine textures, organic soft contours, neither flat clipart nor a photorealistic architectural door. Full complete silhouette centered, portrait composition with generous transparent margin, transparent cutout with clean edges. No wall, no building, no scenery, no sky, no ground plane, no shadow rectangle, no heavy stone, no ornate metal lock, no text, no lettering, no numbers, no symbols, no keyhole, no door sign, no watermark. Same visual family as a soft pink handcrafted flower in a sunny moss garden.
```

## 透明边缘检查

2026-10-28 将实际 WebP 分别以真实 alpha 合成到奶油白 `#FFF8E8` 和苔藓绿 `#6E934B` 底上，使用 `view_image` 检查四张 QA 图。花和门均未见透明区色条、矩形残底或明显白边。原始透明图被部分预览器显示出的背景颜色，不是实际合成残留。

QA 图保存在 `docs/qa/flower-qa-cream.jpg`、`flower-qa-green.jpg`、`door-qa-cream.jpg`、`door-qa-green.jpg`。它们仅用于验收，不应成为运行素材。


## environment · 环境制作记录

- 运行文件：`public/assets/garden/environment.webp`，1536×1024，RGB，291,236 字节。
- 采用源图：`docs/art-source/environment-storybook.png`。
- 未采用源图：`docs/art-source/environment.png`。第一版偏写实，保留为草稿；它不参与网页加载。
- 来源：内置 ImageGen 原创生成；第二版以第一版为编辑对象重新风格化。用户参考作品只用于理解方向，没有裁切成网站背景。
- 状态：M1 环境层已制作；当前透视纵深版将它用于固定天空与远丘，近处草坡和小路另建网格。整页视觉检查见本轮进度与 `DEPTH_QA.md`，不沿用历史通过结论。

第一版提示概要：为生日秘密花园制作横向 3:2 背景环境，浅蓝天空和中央标题留白，鲜活苔藓绿草丘、奶油弯曲小路，左侧灯组、中部音乐花、右侧小门的位置留空；左上柔光，近处花叶与远丘形成景深，无文字、数字、人物、地标物件或 UI。结果的真实乡野感过强，因此未采用。

第二版提示（实际采用）：

```text
Change the style of this environment radically into a handcrafted miniature STORYBOOK clay and felt garden diorama, keeping the sky negative space and winding path positions. This is NOT a realistic countryside. Smooth round exaggerated organic grass mounds like soft moss cushions, fluffy handmade materials, fewer details but beautiful craftsmanship. Trees become rounded topiary bush forms rather than pointed cypresses. Landscape much more intimate and small, whimsical little secret garden with fresh soft green mounds and rounded big stylized leaves. No far lake and no grand distant valley. Pale pastel blue sky, creamy puffy illustrated clouds at sides, bright diffuse upper left sunlight. Background horizon at 48% image height, blue-green stylized low rolling hills. Upper center totally uncluttered to overlay a website headline. Broad open grass patches left and center to place separate interactive objects. Foreground leafy plants along sides, winding cream dirt path, small soft pink daisies. Premium stop-motion miniature mixed with delicate hand-painted picture-book illustration. Color palette restrained moss #6E934B, forest #385B41, pastel blue #D8ECF2, cream #FFF8E8, blush #E8A8BC. Absolutely no realistic grass blades or realistic rocks or giant landscapes. No people, no letters, no numbers, no door or signal lamps or hero flower, no UI. Landscape image.
```

源图中的天空、地形和背景云仍合并在一张图片中；当前仅把它用作固定远景，近处由独立草坡与小路覆盖。花、灯、门、前景仍是独立资产。WebP 是源图的本地压缩导出，未通过 Python 改画内容。

## journey-panorama · 历史横向小路扩展（2026-10-30，保留备用）

- 输入参考：`public/assets/garden/environment.webp`，先通过 `view_image` 查看，作为现有花园美术基础。
- 来源：内置 ImageGen 编辑/扩展模式；没有切换 CLI/API，没有替换原始环境文件。
- 源文件：`docs/art-source/journey-panorama.png`；保留文件：`public/assets/garden/journey-panorama.webp`。当前仅在原环境素材缺失时可作固定远景备用，不再承担路线位移。
- 实际尺寸：2172×724，3:1，RGB；WebP 409,756 字节。提示中的 3072×1024 是期望值，工具实际输出尺寸如上。
- 内容：右侧保留入口花园方向，中部延伸小路与低草丘，左侧增加供信号花灯放置的草地空地。文字、按钮和花灯主角不烘焙在环境内。
- 历史检查：当时已查看生成图并接入横向长图页面，相关截图与操作结果见 `JOURNEY_QA.md`。该版不能呈现用户要求的向纵深行走，现已由透视相机与独立地形替换。下面保留实际生成提示作为制作记录，不表示当前方案仍是横向长图旅行。
- 完整生成提示：

```text
Use case: precise-object-edit / environment extension. Input image is the existing birthday secret garden environment, whose art direction must be preserved. Create a SEAMLESS ULTRAWIDE PANORAMA 3:1 aspect ratio, ideally 3072x1024, by extending this miniature garden to the LEFT. This is a runtime world backdrop for a side-travelling 2.5D interactive garden, not a screenshot or UI. Preserve the image's soft moss diorama, miniature hand-crafted green grassy hills, fleshy leaves, tiny pink/cream flowers, gently textured pale sandy path, warm sunlight from upper left, distant bluegreen mountains, and generous soft blue sky occupying the upper 45 percent. Rightmost third retains the existing entry garden with low rounded hill and sandy path entering from lower right. In the middle third, the continuous sandy pathway bends gently LEFT between low moss banks and small flowery shrubs, with an open accessible corridor at 70-80 percent of image height. In the leftmost third it reaches a roomy gently lit grassy clearing: a low flat mossy grassy bank near 70 percent of image height, adjacent to the sandy path in foreground at 85 percent height. This clearing is reserved for separate flower-lantern sprites; leave it clear with subtle low ground vegetation. Make the route visibly continue across the WHOLE panorama so the middle and left are real new explorable terrain, not repeated copies. Keep horizon and scale consistent across the entire image; no diptychs, seams, borders, splits or hard lighting transitions. Main visible path stays near bottom 75-90 percent so the sprites can sit on the grassy banks above it. Avoid prominent new trees at center screen; hills should stay low, don't fill upper sky. Do not add doors, lanterns, oversized hero flowers, characters, buildings, text, letters, signs, numbers, buttons, UI, or watermark. High quality soft richly detailed hand-crafted miniature environment, coherent with source. Not flat vector, not realistic forest, not overhead map.
```

## path-bank · 独立苔藓遮挡层（2026-10-30）

- 输入参考：`public/assets/garden/environment.webp`，用于匹配材质与光线。
- 来源：内置 ImageGen，`transparent_background: true`。
- 源文件：`docs/art-source/path-bank.png`；运行文件：`public/assets/garden/path-bank.webp`。
- 实际尺寸：1860×846，RGBA；WebP 349,436 字节，alpha 范围 0—255。
- 用途：沿途低苔藓、叶片、微小粉花和石头的前景层，根部固定于路线；原粉花、花灯和门保持独立。
- 检查：已查看原图并读取实际 alpha 边界；未用 Python 抠图或改画。最终页面的遮挡和接地效果以本轮实际截图为准。
- 完整生成提示：

```text
Use case: background-extraction / matching separate environment asset. The input is a style and material reference for the existing birthday garden. Make one isolated low horizontal bank of soft richly textured moss, chunky miniature rounded green leaves, a few very tiny blush pink flowers and 2 small pale stones, like the lower foreground edges of this garden. TRUE TRANSPARENT BACKGROUND. This is a layered sprite for the near edge of a garden path, not a new landscape. Width-to-height about 2.2:1. Natural asymmetrical profile, low rounded silhouette. Full bank entirely in frame with soft organic edge, no cut stems against image border, no rectangular ground platform. Moss/leaves dominate, flowers tiny, no oversized hero flower. Light from upper left, warm bright moss green and olive, hand-crafted miniature tactile texture matching reference. Slight perspective from above but mostly side-facing, roots anchored along bottom center. No sky, horizon, scenery, canvas color, backdrop, shadow outside the isolated bank, text, lantern, door or UI.
```

## 本轮原创 SVG 层（2026-10-30）

`ground-contact.svg`、`root-grass.svg`、`threshold.svg` 和 `cloud-wisp.svg` 直接以 SVG 编写，未使用外部图片。分别提供接触阴影、低草叶遮挡、门前踏石与独立薄云；包含低对比渐变、叶脉、软边与透明边缘。

这四个 SVG 已通过 XML 解析；阴影、草叶和踏石在独立临时浏览器页检查过透明边缘，薄云在白底很淡，最终天空中的可见程度以本轮整页截图为准。背景全景中的原有云仍保持静止，不因增加一张薄云就声称背景全部分层完成。

原粉花、门、花灯的透明留白没有直接裁切：`world.ts` 通过每个物件的 `footInset` 对齐可见根部、阴影和遮挡草叶，保留源图与原始 WebP。

## ground-moss · 透视地形苔藓材质（2026-10-30）

- 输入参考：`public/assets/garden/environment.webp`，匹配原花园的柔软苔藓材质与配色。
- 来源：内置 ImageGen，`transparent_background: false`；正方形俯视材质，供三维草坡重复铺贴。
- 源文件：`docs/art-source/ground-moss.png`；运行文件：`public/assets/garden/ground-moss.webp`。
- 实际尺寸：1254×1254，RGB。源 PNG 4,238,819 字节；导出 WebP 654,924 字节。实际文件的尺寸、颜色模式和字节数已读取核对。
- 当前用途：通过 `art.ground` 加载，重复铺在 `groundHeight(x, z)` 定义的草坡网格上。小路的细砂纹理由代码单独生成；本图不是背景全景，不包含路、主角或 UI。
- 检查边界：本条记录生成与导出，不宣称重复铺贴接缝、整页视觉、真机或浏览器检查已通过；本轮实际验证记录由 `DEPTH_QA.md` 提供，截图归档于 `docs/qa/depth/`。
- 完整生成提示：

```text
Use case: stylized-concept material texture. Reference image is the existing miniature moss garden art style. Produce one seamless square tileable ground texture, overhead orthographic view, of the same very short velvety sunlit moss/grass covering the soft hills. Fine varied moss-green, warm olive green, fresh yellowgreen and subtle tiny grass blades. Dense soft microtexture, a few tiny cream speckles, NO large objects, NO stones, NO flowers, NO shrubs, NO trees, NO path, NO sky or horizon. This will be repeated on a rolling 3D terrain mesh, not used as a landscape. Uniform diffuse lighting with no big directional shadows, no vignette, no center focal pattern, no seams. Full bleed to all edges, 1024x1024 or larger square. Keep the handcrafted soft miniature material of the source rather than photoreal lawn, no text or UI.
```
