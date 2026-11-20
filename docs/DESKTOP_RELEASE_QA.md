# 电脑端生产预览检查 · 2026-11-04

## 交付

- 用户预览：`http://127.0.0.1:4197/#garden`，实际从独立包启动，交付时四题0、无曲目、无信封、未解锁，角色尚未进入，声音关闭，无面板和开发提示。
- 测试来源：`127.0.0.1:4196`，另用 `localhost:4196` 验证全新进度的直达礼物保护。测试标签与4196服务已关闭。用户4197来源没有提交答案或抽曲。
- 刷新保留同一来源的进度，不使用每次打开即清空的实现。与5173的localStorage/sessionStorage隔离；原正式存档的四题／信封／礼物及songId=2、drawId保持，原临时试玩也未变。
- 包：`releases/desktop-preview/`，重启文件 `START_GARDEN.command`；归档 `releases/birthday-garden-desktop-preview-20261104.tar.gz`。只监听本机，不是公网地址。

## 本次收尾

本轮检查没有发现新的业务阻塞，保留已确认的美术、持续指向控制器和四题／音乐／礼物规则。将npm preview统一到现有本机静态服务器；更新过时的备用包、礼物插画和可选内容说明；新增可使用现有Node的macOS启动文件。可选的照片、理由、称呼、署名、演奏录音不作为本地预览的阻塞项，也不虚构补齐。

本轮前源文件备份：`versions/before-desktop-release-20261104.tar.gz`。业务内容SHA256仍为 `976aae6cac292789c9c350d99d1264830af0fb6e2ba93cd4cad3a49202d9a84e`。

## 浏览器实际路线与流程

1280×720内置桌面浏览器，全部路线通过原生方向键行走，不注入坐标、进度或内部控制器，也没有地图传送。可自由转向，停下后观察反馈。

| 阶段 | 实际停留坐标（约） | 检查 |
| --- | --- | --- |
| 入口 | 0, -1800 | 标题、进入提示、空进度、声音默认关闭 |
| 解题桌 | -718, 611 | 第一朵花与蝴蝶引导；纸页打开原第一题 |
| 音乐花圃 | 746, 1939 | 原题0/3/0/5收信封后继续沿路到达，抽到07 |
| 池岸 | -1565, 3031 | 水岸涟漪、停留、地图暂停，绕岸继续 |
| 蘑菇空地 | 1098, 4231 | 靠近触发，进一步停留记录mushroom-listened |
| 石拱 | -849, 5289 | 主路可接续，入口与沿途提示不重叠 |
| 山丘 | 814, 6716 | 纸鸟出现，随弯道推进 |
| 礼物门 | -41, 8365 | 门完整可见，小礼物图标进入密码锁 |

第一题错误输入1仍保持0题完成，答对才留下数字；四题后收信封，刷新保留。音乐实际复制读回 `Could you play “Lu Xiao Yu” (No. 07) for me?`，没有发送消息。阅读时按方向键不移动背景。

锁页输入0300被拒绝，打开信封后输入仍为0300；主动输入0305并Enter提交才揭晓。默认不出现礼物名称，点击小兔纸签才出现；不含Any guesses。解题、音乐、礼物关闭后actorX/Y、cameraX/Y/zoom、headingX/Y七项逐一相等。完成后刷新保留四题、信封、礼物、曲目和drawId。

1440×900额外检查礼物／音乐面板和减少动态的静态花园。界面采样无横向溢出、无坏图；实际截图留档。另一独立空来源直接访问#gift会进入#lock；生产模式忽略preview=fresh与qa=chunk-error，没有开发工具或故障模拟。

## 证据

- [浏览器记录](qa/desktop-release-20261104/browser-evidence.json)、[20项断言](qa/desktop-release-20261104/browser-assertions.json)，全部true。
- [265项自动检查／23组](qa/desktop-release-20261104/regression-summary.json)，[完整日志](qa/desktop-release-20261104/regression.txt)。覆盖状态、存档同步、复制、锁保护、持续指向、路线、沿途回应和素材加载。
- [类型与构建](qa/desktop-release-20261104/build.txt)通过。Three 882.26KB既有体积提示仍在，没有声称解决该体积提示。
- [包验证](qa/desktop-release-20261104/package-verification.json)：52个构建文件与dist逐个哈希一致，4196／4197 HTTP200。启动脚本实际启动4197，重复启动明确报端口占用，不悄悄切换。
- [正式入口截图](qa/desktop-release-20261104/32-delivery-entry.png)、[入口状态](qa/desktop-release-20261104/delivery-entry.json)。
- [空白题面](qa/desktop-release-20261104/06-puzzle-empty.png)、[信封刷新](qa/desktop-release-20261104/08-envelope-reload.png)、[曲目卡](qa/desktop-release-20261104/11-song-card.png)。
- [池岸](qa/desktop-release-20261104/13-pond-bank.png)、[石拱](qa/desktop-release-20261104/18-arch.png)、[山丘](qa/desktop-release-20261104/20-hill.png)、[礼物门](qa/desktop-release-20261104/22-door-arrival.png)。
- [错码](qa/desktop-release-20261104/23-lock-wrong.png)、[礼物名称隐藏](qa/desktop-release-20261104/24-gift-hidden-names.png)、[翻签](qa/desktop-release-20261104/25-gift-names.png)、[1440宽屏礼物](qa/desktop-release-20261104/26-gift-wide.png)。

## 实际边界

这是电脑端本地生产预览，未部署公网。自动化没有纯悬停输入能力，本轮行走使用键盘；用户先前已确认实体触摸板持续行走与平滑停下，本轮没有修改运动参数，不把键盘检查称为新的实体触摸板验收。未重测Safari/Chrome独立应用、手机、触屏、低配FPS或断网；声音实际听感未验收，真实演奏音频未接入。静态检查覆盖显示、开音乐和读取既有成果，不等于重新静态走完所有路线。功能通过也不替代用户的最终审美判断。
