# 整园路线与操作联调 · 桌面检查记录

日期：2026-11-02。沿用水粉草坡、奶白绒团和已有八区布局，本轮处理路迹层次、前半程主角比例、驻足提示及面板返回后的输入衔接。没有新增素材、树木、粒子或速度改动；题目、九首曲目和礼物规则保持。

## 改动与原因

- **内容入口返回后的行走**：音乐／礼物等顶部入口保留原来的键盘焦点，Enter、Space、Tab 仍用于按钮。只有方向键、WASD、PageUp／PageDown 转交现有行走控制器，并将焦点交回花园。普通输入、地图展开、阅读或页面隐藏时不接管行走。使用同一个 Map 按钮收起地图时，也恢复花园焦点。
- **驻足后的物件提示**：只给最近的可操作物件显示原有短标签，放在物件侧边；开始走动后撤销驻足显示。悬停与键盘聚焦仍可查看标签，不自动打开内容，不增加收集条件或进度。
- **路迹层次**：主路纹理柔化参数从 `.20` 调至 `.44`，暖灰白洗色为 `(.086,.081,.065)`，WebGL 与静态画面共用 `trailPalette`。支路保持主路强度的 `.32`，软边和原来的中心线不变。题灯附近新增 `350×280` 的柔化范围，连续淡出；原蓝色坡岸保留。
- **花灯比例与落地**：题灯改为 204×272，匹配原始 384×512 画布比例；底座脚点使用 `490/512`。WebGL、静态和点击区域沿用同一 `footInset`，发光中心对准原画布中的灯焰 `(239/384,206/512)`，地形与门前构图不变。

## 实际桌面行走与停留

检查视口为 1280×720，使用原生方向键、普通点击和浏览器前进／后退。起点为 `(0,-1800)`。行走数据来自 [browser-evidence.json](qa/whole-garden-20261102/browser-evidence.json)，没有注入角色坐标或用 Map 跳转代替路线。

| 停留点 | 实际角色坐标（四舍五入） | 观察 |
| --- | --- | --- |
| 首花 | 318.61, -1109.01 | 驻足前后七项位置数据一致，随后记录首花开放。 |
| 题桌花灯 | -709.09, 610.29 | 标签与花灯可操作，输入框阅读不带动背景。 |
| 音乐花圃 | 830.30, 1861.98 | 站定无漂移，可打开原有曲目卡再返回。 |
| 池岸 | -1062.62, 2925.95 | 经实际弯道抵达，静态切换前后位置与事件保持。 |
| 蘑菇空地 | 1227.61, 4209.43 | 沿连接路段抵达并停留。 |
| 旧石拱 | -984.10, 5206.13 | 实际停留后继续向山丘行走。 |
| 山丘 | 978.29, 6721.69 | 经石拱至山丘弯道抵达，驻足后纸鸟回应。 |
| 礼物门前 | -139.47, 8209.03 | 实际沿路到达第八区，驻足后月光回应。 |
| 返程山丘 | 832.93, 6684.27 | 礼物面板关闭后继续走，反向回到山丘。 |

`moon-arrival` 的 `visited` 已包含全部八区。首花、山丘与门前的驻足样本中七项位置保持，事件在停留后增加，符合环境回应。正程为入口至小门全路线；返程验证为小门回山丘，不扩大为全路线双向重走。

## 面板、焦点与状态证据

比较七项值：`actorX`、`actorY`、`cameraX`、`cameraY`、`cameraZoom`、`headingX`、`headingY`。以下样本均严格相等：

| 操作 | 对比样本 | 结果 |
| --- | --- | --- |
| 首花驻足 | `first-flower-stop` → `first-flower-dwell` | 角色与镜头停止，首花事件在真实停留后产生。 |
| 题目输入框内按方向键 | `puzzle-reading` → `puzzle-reading-after-arrow` | 位置与朝向不变。 |
| Escape 关闭题目 | `puzzle-ready` → `puzzle-return` | 精确回到原位置，焦点回到题桌入口。 |
| 顶部音乐入口关闭 | `music-shortcut-origin` → `music-shortcut-return` | 保留原位置和入口焦点；随后 `shortcut-direct-walk` 直接按键可继续走。 |
| 音乐浏览器后退／再关闭 | `music-rest` → `music-browser-back`／`music-world-return` | 原位恢复。 |
| 音乐浏览器前进 | `music-reading` → `music-browser-forward` | 恢复阅读取景。 |
| 地图打开时按方向键 | `map-origin` → `map-arrow-blocked` | 不带动角色。 |
| 同一个 Map 按钮收起 | `map-origin` → `map-toggle-closed` | 位置保持，焦点为花园；随后 `map-direct-walk` 直接按键离开。 |
| 池塘减少动态／恢复 | `pond-rest` → `pond-static`／`pond-motion-restored` | 七项位置与 `worldEvents` 完全一致。 |
| 礼物阅读期间滚轮与方向键 | `gift-reading` → `gift-reading-after-input` | 背景滚动和方向键均不带动角色／镜头，事件不变。 |
| 世界小门打开后关闭 | `moon-rest` → `gift-world-return` | 精确回到原位置。 |
| 顶部礼物入口后浏览器后退 | `gift-shortcut-origin` → `gift-shortcut-back` | 原位与入口焦点恢复，随后 `gift-shortcut-direct-walk` 直接按键可走。 |

另实际在花园内使用原生滚轮后退，`wheel-origin` 至 `wheel-stopped` 的 Y 坐标从7960.38移至7917.26。`wheel-return` 为仍在收势的中间样本（moving=true），后续 `wheel-stopped` 已为false；两个不同运动阶段的位置不相等，不将其误作漂移检查。

全部路线样本保留原曲目编号 `2`、`drawId` `b34cc731-31fc-4f8c-999b-c42c87c3fef2:1`、`questionsSolved=0`、`envelopeStored=false`、`giftUnlocked=true`。本轮不重新作答、不重新抽曲、不制造一次礼物解锁；已有礼物进入的是重看路径。

## 花灯静态对照与交付位置

完成自然路线与返程后，使用 Map 回到已访问题灯区域 `(-570,610)`，仅作花灯和共享路迹的 WebGL／静态对照。`lamp-map-inspection`、`lamp-static`、`lamp-motion-restored` 的七项位置及 `worldEvents` 完全一致，事件没有重播。此段 Map 返回不计入自然路线证据。

最后使用返回入口控件回到 `(0,-1800)` 留作预览；`delivery-entry` 保留八区访问、环境记忆和业务进度，没有清空存档。

静态版本保留物件位置和路迹，但地面笔触明显简化，不将其描述为与 WebGL 逐像素一致。正常预览的浏览器日志检查未捕获 error／warn。

## 检查与构建

82 项不重复的确定性检查通过：指针／挂载输入 35、转向停步 9、路迹场 7、草地运动 9、深度世界 7、八区数据 9、礼物门几何 6。路迹检查含 2,346 个几何对照采样；这些采样不另行计作测试项数。

类型检查与生产构建通过，122 个模块；既有 Three 分包 882.25 KB 的体积提示保留。构建通过不等于实体触摸板、低性能设备或帧率验收。

本轮前备份：`versions/before-whole-garden-20261102.tar.gz`。本地备用目录与压缩归档已更新，50 个构建文件与 `dist/` 逐个 SHA-256 匹配，`content.json` 与本轮前备份逐字节相同。核对结果见 [package-evidence.json](qa/whole-garden-20261102/package-evidence.json)。仍为本机预览，没有发布公网链接。

## 截图与限制

| 实际截图 | 内容 |
| --- | --- |
| [入口调整前](qa/whole-garden-20261102/01-entry-before.png) | 本轮调整前的相同美术基础 |
| [首花停留](qa/whole-garden-20261102/02-first-flower.png) | 进入后的第一处驻足点 |
| [题灯侧边提示](qa/whole-garden-20261102/03-puzzle-label.png)／[题灯驻足](qa/whole-garden-20261102/04-puzzle-rest.png) | 放大花灯与可操作提示 |
| [音乐花圃](qa/whole-garden-20261102/05-music-rest.png) | 第二个内容入口 |
| [池塘弯道](qa/whole-garden-20261102/06-pond-bend.png) | 路迹和转弯 |
| [池岸](qa/whole-garden-20261102/07-pond-rest.png)／[池岸静态](qa/whole-garden-20261102/08-pond-static.png) | 同位置两种渲染模式 |
| [蘑菇弯道](qa/whole-garden-20261102/09-hollow-bend.png)／[空地](qa/whole-garden-20261102/10-hollow-rest.png) | 中段实际路线 |
| [石拱](qa/whole-garden-20261102/11-arch-rest.png)／[山丘](qa/whole-garden-20261102/12-hill-rest.png) | 后半程停留点 |
| [月光弯道](qa/whole-garden-20261102/13-moon-bend.png)／[门前](qa/whole-garden-20261102/14-moon-rest.png) | 最后一段的接近与停留 |
| [礼物阅读](qa/whole-garden-20261102/15-gift-reading.png) | 已解锁礼物重看 |
| [实际返程](qa/whole-garden-20261102/16-hill-return.png) | 从小门返回山丘 |
| [花灯正常](qa/whole-garden-20261102/17-lamp-webgl.png)／[花灯静态](qa/whole-garden-20261102/18-lamp-static.png) | Map返回后同位置的补充静态对照 |
| [交付入口](qa/whole-garden-20261102/19-entry-delivery.png) | 保留已有进度的入口预览 |

单张截图只展示实际构图，不证明完整动画速度或鼠标手感。

- 本轮没有模拟纯悬停或实机触摸板，不将原生方向键检查等同于触摸板验收。
- 没有手机、FPS、实际录音听感、断网或 GPU 故障检查，也没有发布公网链接。
- 九首曲名已有，实际录音与礼物实物照片仍未提供。
- 全英文页面与原题／曲目／礼物内容保持；本轮未使用 ImageGen 或下载新美术。
