# 纸鸟引路样片 · 2026-11-03

## 本轮范围

沿已有 `hill-moon` 小路设置七处驻留点，经过原弯道，最后停在礼物小门前。未增加树木、粒子、任务或收集条件，也未改变 `soft-turn-stop-v3` 行走控制、四题、九首曲目与礼物密码规则。

真实靠近后，由最近的一只纸鸟回应，其他鸟保留原驻留位置。首次安静停留后，领路鸟短飞一段并落下等待；之后按访客的实际移动继续引路。连续行走可以滑过中间驻留点，避免每段强制停落造成掉队。停下、退后或走远时，鸟减速落下，回来后继续尚未完成的路段。只有等待不会自动走完整条路线。

山丘原来的大按钮、E／Space 触发与旧文字提示已移除。纸鸟按自身世界位置计算可见性，离开山丘后仍能在门前看见。会话内状态共享给动态与静态渲染；静态模式只画快照，不推进引路、不产生新事件。

## 实际浏览器检查

证据为 [browser-evidence.json](qa/paper-guide-20261103/browser-evidence.json)，视口 1280 × 720，使用原生方向键、普通点击与 Escape。未注入角色坐标或修改存档。

从山丘附近 `(1266.47, 6591.69)` 实际走到门前 `(-149.28, 8278.35)`，包含途中停留、退回、返回继续与内容面板检查；这不是整园八区的重新验收。

| 检查 | 实际结果 |
| --- | --- |
| 刷新后原地不动 | `fresh-load-no-auto-start` 中领路鸟尚未选择，未自动起飞；真实短步靠近后选择最近的第 4 只鸟。 |
| 首次邀请 | 停留约 0.95 秒开始起飞，到 `(1153.75, 6970)` 落下等待；访客仍停在原处。 |
| 跟随与停下 | 第二段中停步，鸟在 `(1204.14, 7035.66)` 落下，速度归零，未自行完成路段。 |
| 离开与返回 | 退回到山丘时鸟保持同一等待位置；重新走近后继续原目标，没有重头播放。 |
| 阅读面板 | `reading-start` 与 `reading-held` 的完整引路模型数据相同；关闭音乐面板后，角色坐标、镜头坐标、缩放与朝向共七项数值精确恢复。 |
| 地图 | `map-open` 与 `map-held` 的引路模型数据相同；关闭后七项位置／朝向数据不变并继续响应。 |
| 减少动态 | 七项位置／朝向与环境事件集合保留，静态画面保留鸟已到达的路线位置；恢复动态后保留待完成路段，继续行走可以接续。 |
| 门前收尾 | 第七处落点为 `(-240.13, 8310)`，静止后高度回到 4、速度为 0，`finished=true`。 |
| 礼物入口 | 点击原有小门进入 `#lock`。本机已有解锁记录，页面明确显示 `Already opened`，不是本轮重新输入密码或跳过首次锁。关闭后七项位置／朝向精确恢复。 |

业务状态从刷新后的基线到本轮结尾保持一致：四题已完成、信封已收存、曲目编号 `2`、原 `drawId=b34cc731-31fc-4f8c-999b-c42c87c3fef2:1`、礼物已解锁。没有重置进度、代答、重新抽曲或重新提交密码。记录的浏览器 error／warn 日志为空。

交付前通过 Map 返回已访问的山丘 `(1080, 6660)`，再显式刷新，让预览从首次接近纸鸟开始。只重新开始本次页面的环境会话，上述业务进度保留。`map-revisit-after-finish` 和 `preview-ready-after-reload` 记录了这一操作；此段是地图返回，不计入自然返程。

## 截图与证据边界

- [首次起飞](qa/paper-guide-20261103/02-first-invitation.png)、[第一处落点](qa/paper-guide-20261103/03-first-landing.png)
- [停下等待](qa/paper-guide-20261103/05-waits-when-you-stop.png)、[返回继续](qa/paper-guide-20261103/06-return.png)
- [弯道跟随](qa/paper-guide-20261103/07-bend-following.png)、[弯道静态模式](qa/paper-guide-20261103/08-static-bend.png)
- [月光入口](qa/paper-guide-20261103/09-moonlight-approach.png)、[门前落点](qa/paper-guide-20261103/12-guide-at-door.png)、[已开礼物入口](qa/paper-guide-20261103/11-gift-entry.png)
- [交付预览：山丘首次接近](qa/paper-guide-20261103/13-hill-ready.png)

`hill-approach` 首条 JSON 样本是 HMR 期间的前置观察，不计入完整新版 UI 的验收；有效新版行程从 `fresh-load-no-auto-start` 开始。`01-hill-approach.png` 已在完整刷新后覆盖，不能按首条 JSON 样本的时间解释。

落地前的减速调整已在浏览器弯道行程之前生效。门前检查之后，核心模型又补充了跨越中间驻留点时保留本帧剩余位移的修正；这项最终边界由自动检查覆盖，本文件不将此前截图描述为对该微调版本重新完整走过的证据。

## 自动检查与限制

[checks.json](qa/paper-guide-20261103/checks.json) 记录下列脚本均以 0 退出：

- `scripts/check-paper-guide.mjs`：最近鸟、真实靠近、有限邀请、连续跟随、停步／离开／返回、阅读冻结、长帧、渲染器切换、地图跳转、门前终点、帧率一致性、位置连续性与落地减速。
- `scripts/check-hill-moon.mjs`、`scripts/check-mushroom-listening.mjs`、`scripts/check-turn-stop.mjs`。
- `scripts/check-gift-gate.mjs`、`scripts/check-gift-entry.mjs`、`scripts/check-content.mjs`。

最终相关行为检查共 61 项通过，另通过内容校验、TypeScript 与 Vite 生产构建（128 个模块）。Three 分包 882.25 kB 的既有体积提示仍保留。

本轮未验收实体触摸板或纯悬停手感、手机、硬件负载下的 FPS、真实音频或公网部署。静态模式是静止快照，不等同于动态引路效果。原始文档和参考素材保留；本轮前备份为 `docs/versions/before-paper-guide-20261103.tar.gz`。

交付包核对记录见 [package-evidence.json](qa/paper-guide-20261103/package-evidence.json)：52 个文件匹配，配置 SHA 相同，归档日期为 11 月 3 日。

本机预览：[http://localhost:5173/#garden](http://localhost:5173/#garden)。
