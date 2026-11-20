# M5 本地素材与发行包审计

日期：2026-11-02（Asia/Shanghai）。本次仅通过源码、当前构建文件和文件大小审计；不把源码检查称为实际断网演练。工程是 `/Users/admin/Desktop/birthday-garden`，不涉及另一个版本目录。

## 当前实际使用的文件

当前场景由 `App → GardenCanvas → ExplorationScene` 或 `App → StaticGarden → FloofStatic` 绘制；绒团、地标、普通小叶、空气粒子等主要由代码生成 Canvas 纹理。`config/art.ts` 中的历史路径声明不等于全部都会发起加载：`useAssets.ts` 目前只加载 contact、glow 两项。

当前配置下，以下 8 个本地文件用于主画面或业务面板，均实际存在：

| 资源 URL（对应 public 下同一路径） | 文件字节 | 使用位置 |
| --- | ---: | --- |
| `/art/floof/painted-ground-material-v1.png` | 3,014,113 | WebGL 地面与非 WebGL 地面纹理。 |
| `/art/floof/painted-leaf-bank-v1.png` | 2,214,774 | 两种颜色的水粉叶片，WebGL／静态共享加载结果。 |
| `/assets/fonts/cormorant-garamond-latin.woff2` | 37,776 | 本地 Cormorant Garamond 字体，HTML 预加载与 CSS 字体声明。 |
| `/assets/garden/favicon.svg` | 512 | 页面图标。 |
| `/assets/garden/ground-contact.svg` | 1,172 | 共享接触阴影蒙版。 |
| `/assets/garden/dream-glow.svg` | 396 | 共享暖光蒙版。 |
| `/assets/garden/quiet-flower.webp` | 334,780 | 音乐页九朵花复用同一资源。 |
| `/assets/garden/quiet-door.webp` | 369,076 | 礼物锁页的小门与局部门叶反馈。 |
| **合计** | **5,972,599** | 文件原始字节总和，不是浏览器实际传输量或首屏加载量。 |

另需保留：

- `/assets/fonts/OFL-CormorantGaramond.txt`，4,387 字节：字体许可文本。
- `/assets/garden/quiet-garden.webp`，303,972 字节：旧天空 CSS 仍引用；当前 `.floof-garden .exploration-sky` 为 `display:none`，不把它计为当前主场景实际绘制素材。保留可避免样式调整后资源缺失。
- 用户随后提供的 `gift.imageSrc` 及未来配置素材：本次配置仍为 null，不依据现有 8 文件清单删除其他文件或限制将来可用路径。

## 文件与打包体积

审计时当前目录的实际文件统计（十进制字节）：

| 目录 | 文件数 | 字节数 |
| --- | ---: | ---: |
| `public/` | 39 | 17,445,537 |
| `dist/` | 45 | 18,810,862 |
| 其中构建新增 HTML／JS／CSS | 6 | 1,365,325 |

构建产物会随后续源码和重建变化，以上是审计时快照。`public/` 包含历史保留美术，Vite 会原样复制到 `dist/`。未用文件在发行包内占空间，不代表浏览器会在首屏把它们全部下载。

明显属于先前场景、当前主画面不加载的大文件包括：

| 历史文件 | 字节数 |
| --- | ---: |
| `assets/garden/meadow-frame-v1.png` | 1,955,132 |
| `assets/garden/atlas-willow.webp` | 942,598 |
| `assets/garden/ground-moss.webp` | 654,924 |
| `assets/garden/atlas-fern.webp` | 625,220 |
| `assets/garden/atlas-blossom.webp` | 612,938 |
| `assets/garden/dream-garden-v2.webp` | 583,832 |
| `assets/garden/atlas-arch.webp` | 567,150 |
| `assets/garden/dream-foreground-v2.webp` | 561,112 |
| `assets/garden/walk-meadow.webp` | 553,060 |
| `assets/garden/journey-panorama.webp` | 409,756 |
| `assets/garden/walk-meadow-v2.webp` | 387,290 |
| `assets/garden/rabbit-diagonal-v1.webp` | 356,510 |

这些文件及原始参考继续保留。本轮发行包采用完整 `dist/`；不通过手写白名单缩包，以免漏掉将来的礼物照片或其他配置素材。没有修改或删除原 `public/`、`docs/`、`reference/` 中的文件。

## 外网与音频

- 自有运行时代码未发现外网 `fetch`、远程字体、远程图片、CDN 脚本或第三方音频请求。模块、CSS、字体、图片均以当前本地服务为源。
- CSS 纸纹为嵌入的 `data:image/svg+xml`，不是远程图片请求。
- SVG 中的 `http://www.w3.org/2000/svg` 是命名空间标识；`url(#...)` 和 `href="#..."` 是文件内引用，不是外网请求。
- 字体许可文本中的 SIL 地址是普通文本链接，不会在网站加载时发起请求。
- 环境声由 Web Audio 在用户主动开启后生成，没有外部音频文件；私人语音和演奏尚未提供。此检查不包含实际音频听感验收。
- 开发模式使用 Vite 的本机热更新连接；现场备用优先使用生产静态预览，只需本地 HTTP 服务运行。根路径 `/assets/` 与 `/art/` 要由站点根目录提供，不能直接双击 HTML，也不能未经 base 配置就放进 URL 子目录。

## 加载失败与检查边界

审计发现的既有回退关系：

- 叶片图片失败时使用程序叶片；地面图片不可用时有程序颜料层。业务表单和卡片独立于这些图片。
- 音乐花图片失败有符号替代；锁页小门失败有轮廓替代；礼物照片 null 或加载失败有完整中性占位，正文仍保留。
- 字体失败使用 Georgia／Times New Roman 后备；不影响控件操作。
- WebGL 不可用、上下文丢失或 GardenCanvas 动态块拒绝时由非 WebGL 画面继续承载业务。

审计初始版本的 `?qa=asset-error` 只破坏 contact／glow 两个蒙版，没有覆盖真正的大地面／叶片 PNG。此缺口已在本轮故障处理实现中补足，并为这些图片提供有时限的加载处理；最终浏览器执行范围以 M5 彩排记录为准，不能仅凭此审计声称关键 PNG 失败已实际验证。

审计还发现，原静态画面复用带 Three import 的绘制函数，打包又将共享 React 吸入 Three 块，导致主入口也依赖整个图形块。本轮已修复：

1. 把叶片位置数据、地面画笔 Canvas、绒团 Canvas 分别抽到 `floofSceneryData.ts`、`floofBrushCanvas.ts`、`floofCompanionArt.ts`，静态画面改用纯 Canvas 与数据。逐字比对 M4 前备份，确认绘制命令、色彩、位置与数值完全一致；WebGL 模块保留原导出兼容。
2. Vite 将 React／CommonJS helpers 明确分离，Three／Fiber 只供动态场景依赖。
3. 最终构建静态依赖遍历通过：HTML 不再 preload Three；入口的静态依赖闭包仅为主代码 110,817 字节、React 221,904 字节、motion 70,040 字节，共 **402,761 字节 JS**。这是静态 JS 原始文件总和，不是总请求量、压缩后传输量或浏览器性能测量。
4. `check-floof-frame.mjs` 7 项通过，类型检查与生产构建通过。静态源码依赖遍历共 43 个本地模块，第三方静态依赖只有 React、React DOM 与 GSAP，没有 Three／Fiber。

该修复让图形包拒绝加载时有机会进入同源的 2D 替代。最终是否在实际浏览器走通、业务控件是否仍可操作，以本轮缺包实测为准；主入口、React 或其他基础依赖本身缺失仍不属于这种图形降级保证。

本审计没有关闭系统网络、没有改变浏览器网络状态，没有删除素材来模拟故障，也没有执行浏览器性能测量。实际彩排、失败注入和性能结果单独记录。

主线程后续实测补充：生产构建副本实际移除 Three 文件后，静态花园、抽曲卡与返回通过；WebGL／静态两条当前绘画 PNG 失败路径均已实际检查。故障副本及临时服务已清理。具体截图、日志和范围见 [M5_DESKTOP_QA.md](M5_DESKTOP_QA.md)。
