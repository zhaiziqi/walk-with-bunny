青柠检查通过。

# 连续探索 · 本轮实际验证

日期：2026-10-30（Asia/Shanghai）。范围：入口—花间小路—信号花圃。浏览器为 Codex 内置浏览器；尺寸模拟与原生鼠标输入，不冒充手机真机触摸。

## 工程检查

- `sh scripts/project.sh check`：TypeScript 通过。
- `node scripts/check-journey.mjs`：双向旅行、横向边界、滚轮像素/行/页单位、键盘端点、不可变拖动原点通过。
- `node scripts/check-content.mjs`：固定谜题/密码、九首 ID、抽取模式、独立空业务状态、hash 守卫通过。业务配置未改。
- `sh scripts/project.sh build`：生产构建通过。Three/R3F 仍有 894.84 kB（gzip 242.77 kB）的分包体积提示；图形模块保持懒加载，未宣称已解决体积优化。
- 本地预览 `http://localhost:5173/` 返回 HTTP 200；保留运行中的开发服务，未部署。

## 浏览器实际操作

| 检查 | 操作与观察 |
| --- | --- |
| 入口 | 1440×900 正常加载 WebGL；原标题在进入探索或开始拖动后收起；素材实际加载，无空路径 |
| 向上拖动 | 原生拖动 `(360,730)→(360,220)` 后路程 `0.231818`；下一次读取仍为该值，没有惯性滑行 |
| 从物件开始拖 | 在粉花按钮范围内 `(620,625)→(620,265)`；路程 `0.163636`，view 仍为 overview，没有误打开面板 |
| 途中停留 | 多次原生拖动抵达 `0.550000`，后续读取仍相等；最终途中截图由键盘定位到 `0.540000` |
| 滚轮前进/退回 | 向下滚轮可抵达 1；短屏上向上滚轮从 1 回到 `0.870909` |
| 横向探看 | 横向拖动得到 `pan=0.454545`；连续反向拖动被限制在 `-1.000000`，未无限游离 |
| 普通点击 | 短点击完整可见花灯打开内容；小灯按钮状态和文字反馈实际改变 |
| 阅读暂停 | 在 `progress=0.909091, pan=0.454545` 打开花灯面板；对背景滚轮，两值不变 |
| 关闭原位 | 继续散步后两值完全相同；焦点回到 `landmark-puzzle` |
| 快捷点歌返回 | 路程 `0.550000` 时点歌，去入口花圃查看，关闭后仍回到 `0.550000` |
| 浏览器历史 | 快捷点歌关闭后，浏览器后退重新打开音乐，再关闭仍回到 `0.550000` |
| 连续往返 | 在信号终点连续打开/关闭 3 次，路程仍为 1、pan 为 0，没有累计偏移 |
| 主动回入口 | 实际点击回入口，沿同一路线的 GSAP 插值回到 0；新输入可中断插值（控制器实现，未单独量化中途打断时序） |
| 键盘 | 实际 Home、End、PageDown、ArrowDown 移动；Tab 从标题进入关闭按钮，Shift+Tab 从关闭按钮循环到继续散步；Escape 关闭 |
| 390×844 | 原生鼠标拖动三段到 `0.545455`，停留后继续到 1；花灯面板打开/关闭、无横向溢出，保存入口/途中/目的地/面板截图 |
| 320×844 | 小门完整进入取景，根部和踏石可见；未解锁 `#gift` 规范为 `#lock`，无礼物内容泄漏 |
| 320×568 | 信号面板矩形 `(14,252.41)`、大小 `292×293.59`，在视口内；无横向溢出，键盘循环可用 |
| 减少动态 | 页内开关使 renderer=static、Canvas=0；原生向下拖从终点退到 `0.863636`；End 再抵达并打开信号面板 |
| WebGL 上下文失效 | 开发 QA 按钮实际调用 `WEBGL_lose_context`，webgl→static，Canvas=0；随后原生拖动到 `0.181818`，End/打开信号面板仍有效 |
| 全部图片失败 | `?qa=asset-error` 使资源加载失败后落到 SVG 备用地形；加载状态结束，End 和信号面板仍可用 |

改动期间 React 热更新曾留下 Hook 顺序日志；完整刷新后重新验证正常启动，没有新的 error/warn。故障注入阶段产生的 WebGL 扩展告警是单独记录的预期测试输出，不当作正常加载成功的证据。

## 实际截图

这些都是运行页面截图，未使用概念图代替页面。

| 画面 | 文件 |
| --- | --- |
| 桌面入口 | [01-entry.png](qa/journey/01-entry.png) |
| 桌面途中 | [02-path.png](qa/journey/02-path.png) |
| 桌面目的地 | [03-destination.png](qa/journey/03-destination.png) |
| 信号操作面板 | [04-signal-panel.png](qa/journey/04-signal-panel.png) |
| 音乐面板构图 | [05-music-panel.png](qa/journey/05-music-panel.png) |
| 手机尺寸入口 | [06-mobile-entry.png](qa/journey/06-mobile-entry.png) |
| 手机尺寸途中 | [07-mobile-path.png](qa/journey/07-mobile-path.png) |
| 手机尺寸目的地 | [08-mobile-destination.png](qa/journey/08-mobile-destination.png) |
| 手机尺寸面板 | [09-mobile-panel.png](qa/journey/09-mobile-panel.png) |
| 安静模式 | [10-reduced-motion.png](qa/journey/10-reduced-motion.png) |
| 窄长屏 | [11-narrow-entry.png](qa/journey/11-narrow-entry.png) |
| 短屏面板 | [12-short-panel.png](qa/journey/12-short-panel.png) |
| 图形上下文失败 | [13-context-loss.png](qa/journey/13-context-loss.png) |
| 全部素材失败 | [14-asset-failure.png](qa/journey/14-asset-failure.png) |

## 尚未验证及剩余范围

- 本轮消息中没有可读取的四张新截图；依照文字问题与项目已有截图实施，没有声称逐张对照。
- 未实际使用 iPhone/Android 触摸、双指缩放、移动系统键盘、Safari/Chrome 真机、系统级减少动态开关；没有帧率、低端设备或离线演练结论。
- 本轮未重测图形模块 lazy import 拒绝路径；旧版记录只保留为历史证据。
- 新增全景、苔藓边坡已生成并本地接入；原花灯、粉花、门保留。背景中的云仍烘焙不动；只有新增薄云单独慢移。局部草叶和门前踏石是程序化 SVG，后续可继续统一微观材质。
- 当前是有限 2.5D 连续全景路线：视角沿同一场景左右弯行并轻微推进，不是完整自由 3D 地形漫游。
- 本轮没有新增完整 XOR 操作、十进制输入、曲目抽取卡或密码输入；仍为点灯/花朵回应的 M1 美术样片，不宣称这些业务控件已完成或已验证。原规则和初始空状态保持。
