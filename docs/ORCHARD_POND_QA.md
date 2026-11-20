# 音乐花圃至池塘 · 桌面检查记录

日期：2026-11-02。范围为现有水粉花园的音乐花圃至池塘，以及用户本轮提供的九首曲名。本轮未改变四题答案、等权有放回抽曲、0305 礼盒密码或绒团运动参数。原交接文档与参考文件保留。

## 本轮实现

音乐花圃使用局部灰暖底色、少量粉色花瓣与共享风场；经过时的回应花瓣平滑出现、下落和消失，不打断原本少量常驻飘瓣的轨迹。沿弯道地面逐渐转向池岸蓝灰，局部纹理柔化。现有岸草调整位置和尺度，池面使用贴合地形的透明水粉画层，远处水光和近处池面连续显现。池岸增加少量浮瓣和渐扩渐淡的水波。原地形高度与可行走岸线保持。

WebGL 与静态替代共享色温场、池面尺寸及世界坐标、花朵和落瓣布局。静态模式保留安静的场景，不运行花瓣飞行与水波动画。沿途回应仍为可选环境交互，不改变谜题、抽曲或礼物进度；访问记忆避免切换渲染器或重建组件时把旧回应当成新事件。

九首曲名按用户顺序接入英文页面，固定编号 1–9 保留，全部占位标记关闭。第 6 首 Secret 与第 8 首 Secret (Bu Neng Shuo De Mi Mi) 保持独立。中英文对应和来源见 [CONTENT_HANDOFF.md](CONTENT_HANDOFF.md)。未接入实际录音，也未虚构演奏版本、作者或选择理由。

## 实际桌面走查

视口 1280 × 720，本机 `http://localhost:5173/#garden`。从入口使用浏览器原生方向键持续按键与普通点击走到音乐花圃，再经过弯道抵达池岸，最后沿原路方向走回音乐花圃；没有注入角色坐标。本轮未试滚轮或纯悬停引导，浏览器日志未捕获 error／warn。下表来自 [evidence.json](qa/orchard-pond-20261102/evidence.json)，数值仅作四舍五入展示。

| 观察位置 | 实际角色坐标 | 结果 |
| --- | --- | --- |
| 音乐花圃到达 | 743.80, 1965.87 | 花朵与飘瓣可见，可主动 Stir the blossoms；当前位置看不到完整池塘。 |
| 音乐面板打开／关闭 | 743.80, 1965.87 | 已保存的编号 02 显示 Clair de lune；关闭后恢复原位置和镜头。 |
| 弯道 | -93.55, 2578.70 | 池面从画面左侧显现，岸草保持同一空间关系；此处已可见池面，并非只见水光。 |
| 池岸 | -1019.64, 2938.10 | 抵达近岸，池面和岸草完整呈现，Touch the water 可触发水波。 |
| 修复焦点后返回音乐 | 699.59, 1992.60 | 持续按键能够离岸、转向并回到 orchard 区域，松开后停止。 |

音乐面板开关前后的 `actorX`、`actorY`、`cameraX`、`cameraY`、`cameraZoom`、`headingX`、`headingY` 七项记录完全相同。池岸触水后至驻足记录的角色和镜头也保持不变；没有以漂移模拟环境运动。

整个检查保留最近曲目编号 `2` 和原 `drawId` `b34cc731-31fc-4f8c-999b-c42c87c3fef2:1`。四题仍未作答、小信封仍未收纳，既有礼物解锁状态保留；未重新抽歌或代答。这是既有状态保留检查，不是重新完成一次解谜／抽曲／开锁全流程。

## 本轮发现并修复的问题

首次点击 Touch the water 后，焦点留在临时回应按钮上，方向键不能继续引导绒团。原始证据中的 `returned-to-music` 名称来自当时计划执行的返回操作，但其坐标仍是池岸、`region` 仍为 `pond`，因此该记录是失败，不作为返回成功证据。

修复位于 `App.activateSite`：触发环境回应后，将焦点用 `preventScroll` 交回花园 surface。修复后重新实际行走，`returned-to-music-after-encounter-focus-fix` 和 `music-final` 均在 `(699.585076, 1992.599389)`、区域 `orchard`。保留失败与修复后的两份观察，未用地图传送替代这次返回检查。

## 水波与静态替代

[06-pond-ripple.png](qa/orchard-pond-20261102/06-pond-ripple.png) 是实际触水水波截图。截取时临时只读诊断记录的回应 age 为 `2.2951000000238375` 秒；当时可见的第三条水波 age 为 `2.345100000023837` 秒、opacity 为 `0.45858178982034686`。水波在池面上渐扩，随后渐淡。该临时 Canvas 诊断已从源码移除，记录保存在 `evidence.json` 的 `ripplePeak` 中。

实际在同一池岸位置切换减少动态，再切回 WebGL。`pond-still`、`pond-reduced`、`pond-motion-restored` 的七项角色／镜头值和 `worldEvents` 全部相同，没有新增访问事件。静态截图中的池面、两侧岸草和角色空间位置匹配；背景纹理更简化，因此不声称两种渲染逐像素相同。静态模式的完整后四区域仍不属于本轮精修范围。

## 实际截图

| 截图 | 内容 |
| --- | --- |
| [01 音乐花圃](qa/orchard-pond-20261102/01-music-blossoms.png) | 局部花朵、花瓣与留白 |
| [02 已保存曲目卡](qa/orchard-pond-20261102/02-song-card.png) | 原编号 02 显示 Clair de lune |
| [03 弯道](qa/orchard-pond-20261102/03-bend.png) | 池面从左侧渐入视野 |
| [04 池岸](qa/orchard-pond-20261102/04-pond-touch.png) | 水粉池面与近岸构图 |
| [05 减少动态](qa/orchard-pond-20261102/05-pond-reduced.png) | 同一位置的静态替代 |
| [06 水波](qa/orchard-pond-20261102/06-pond-ripple.png) | 触水后的实际水波 |

## 检查与素材来源

本轮已报告通过 55 项确定性检查，另加内容配置校验：

- 素材加载：10 项，`scripts/check-art-loading.mjs`。
- 可行走池岸：7 项，`scripts/check-walkable-ground.mjs`。
- 花圃至池塘显现、轨迹、水波和记忆：7 项，`scripts/check-orchard-pond.mjs`。
- 原沿途交互：8 项，`scripts/check-atlas-interactions.mjs`。
- 音乐状态保存：15 项，`scripts/check-music-progress.mjs`。
- 点歌文字复制：8 项，`scripts/check-music-copy.mjs`。
- 英文内容与固定规则：`scripts/check-content.mjs` 通过。

最终焦点修复后，`sh scripts/project.sh build`（包含 TypeScript 检查）通过，共 117 个构建模块。既有 Three 分包约 882 KB、gzip 约 237 KB 的体积提示仍存在；没有把这项提示记作已解决。内容配置在主代理端再次校验通过。

`node scripts/package-local.mjs` 已同步 `releases/desktop-preview/`，47 个文件与 `dist/` 逐字一致，`package-info` 内容 SHA-256 与当前配置匹配；包内内容状态为 `pendingSongIds: []`、`giftPlaceholder: false`。压缩归档已重建，归档内池塘 PNG 与原文件一致。原 5173 预览返回 HTTP 200，未发布公网链接。

检查结束后，为方便用户查看，预览通过 Map 定位到池塘。这个最终展示定位是地图跳转，不属于上方已经完成的自然行走／返回证据。

池面素材为内置 ImageGen 本轮新生成的透明插画，非网络下载，也未改写参考图像像素。文件 [pond-painting-v1.png](../public/art/floof/pond-painting-v1.png) 为 1536 × 1024 RGBA PNG，从生成结果原样复制。完整提示词和生成源路径见 [orchard-pond-asset.prompt.txt](research/2026-11-02/orchard-pond-asset.prompt.txt)。运行时保留图片加载失败时的程序绘制替代。

本轮前备份：`versions/before-orchard-pond-20261102.tar.gz`；曲目内容备份：`versions/before-music-titles-20261102.json`。

## 未覆盖范围

- 实体触摸板纯悬停的手感、FPS、实际声音听感、手机及现场断网没有在本轮验收；原生键盘成功不能代替这些结果。
- 九首曲名均通过配置检查，实际曲目卡截图检查的是既有编号 02；本轮没有为拍摄全部曲目而改写用户抽取结果。
- 后四区域的美术与静态场景未做完整精修。本轮结果不等同于全花园视觉定稿，也不代表用户已接受最终审美效果。
- 未接入实际曲目录音、私人音频或礼物照片，没有发布公网链接。
