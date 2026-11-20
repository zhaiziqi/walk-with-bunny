# M0＋M1 实际检查记录

日期：2026-10-29（Asia/Shanghai）。浏览器：Codex 内置浏览器。以下是实际执行记录，不代表真实手机或全部浏览器已验证。

## 工程

- Node.js 24.22.1；pnpm 11.25.0。React/React DOM 19.3.1、R3F 9.8.2、Three.js 0.180.0、GSAP 3.15.0、TypeScript 5.9.3、Vite 7.3.7，锁文件保留。
- `sh scripts/project.sh check`：通过。
- `node scripts/check-content.mjs`：通过配置类型、固定规则、九首 ID、密码推导、hash 守卫、独立 null 初始状态检查。
- `sh scripts/project.sh build`：通过。Three.js/R3F 分包约 895KB，gzip 约 243KB，有超过 650KB 的体积提示；不是构建错误。图形层按需懒加载，静态界面先可用。
- 本机没有全局 Node、ffmpeg 或 Xcode 开发工具；用现有 Codex Node/Python 和浏览器完成。安装与监听本地端口需要环境权限，未部署网站。

## 浏览器操作

| 项目 | 实际操作与结果 |
| --- | --- |
| 1440×900 桌面 | 总览、信号近景、门前近景；图层正常，无阻断运行错误，文字为 DOM，无提前揭晓 |
| 390×844 | 总览重排、触花、信号近景点灯、返回；无横向溢出，保存实际截图 |
| 320×740 | 总览与入口检查，无横向溢出 |
| 320×568 短屏 | 舞台和 Canvas 均为 700px 高，正文正常页面滚动；触花按钮与舞台位置一致，仍可进入近景 |
| 花朵回应 | Enter 触发花朵摇动与状态反馈；音乐近景的按钮也可触发，不产生曲目或成功状态 |
| 靠近/返回 | 连续三次进入信号花圃、返回；标题得到焦点，返回后焦点为 `landmark-puzzle`；无相机时间线锁死 |
| 指针点击 | 首次邀请、点歌快捷入口、返回按钮实际点击可用；其余路径也用键盘检查 |
| 小灯 | 切换点亮与休息，按钮 `aria-pressed` 与反馈相符 |
| 历史导航 | 门前的浏览器后退回总览，前进回门前；焦点与视图对应 |
| 减少动态 | 页内开关切换至静态层，Canvas 数为 0；点歌入口、花朵反馈与返回仍可操作 |
| WebGL 失败 | `?qa=context-loss` 开发按钮调用 `WEBGL_lose_context`；由 webgl 转 static，Canvas 卸载，信号近景/点灯/返回仍可用 |
| 图形模块失败 | `?qa=chunk-error` 开发故障注入使 lazy import reject；外层错误边界保留静态花园和 HTML，仍可往返，无永久加载 |
| 图片全部失败 | `?qa=asset-error` 开发故障注入；显示本地 SVG 底景和 HTML 入口，小灯及返回可用，加载提示结束 |
| 未解锁直达 | `?static=1#gift` 自动规范到 `#lock`，未呈现礼物、密码或生日含义 |

故障注入只在开发模式生效（`import.meta.env.DEV`）；`?static=1` 是可手动检查的安静花园入口。正常流程无未捕获的阻断异常。主动 context loss 检查期间出现过 Three.js 扩展告警；故障注入可能产生预期的资源/React 错误日志，不把这些当成正常资源成功。

## 截图

- `desktop-overview.jpg`：桌面总览。
- `desktop-closeup.jpg`：信号花圃近景。
- `desktop-door.jpg`：门前样片。
- `mobile-overview.jpg`、`mobile-closeup.jpg`：390px 总览/近景。
- `mobile-320.jpg`、`mobile-short.jpg`：窄屏/短屏。
- `asset-failure.jpg`：全部图片失败后仍能操作。
- `*-qa-cream.jpg` / `*-qa-green.jpg`：透明素材边缘检查。

## 未验证与剩余工作

- 没有真实手机触屏、目标展示电脑的独立 Safari/Chrome、系统级减少动态设置切换、实际断网彩排或性能帧率测量；页内减少动态路径已测，系统偏好监听已实现。
- 没有生成操作录屏；提供实际截图与可操作本地服务。
- 1366×768 和 1920×1080 尚未单独检查。
- 天空/云/草丘合为环境层；局部前景为原创 SVG，与生成物件的材质可继续磨合。未来可以细化接地阴影、独立云层以及三关近景。
- M2 XOR、M3 随机抽歌、M4 礼物解锁和真实内容、M5 完整彩排均不在本轮完成范围。
