# Walk with Bunny — Vercel 发布交付

日期：2026-11-16。

## 当前状态

**已发布**：https://walk-with-bunny.vercel.app/

Vercel 返回 `READY`，正式别名绑定成功；已通过不带账号凭据的 HTTP 请求和实际浏览器确认可公开访问。账号使用 Hobby 方案，本次没有购买域名或开通付费计划。

从头体验：https://walk-with-bunny.vercel.app/?walk=new#garden

之前的设备码失效，用户完成登录后发布工具获得授权。Vercel 连接可读取账号，但未授予项目所在工作区权限；实际发布使用已授权的官方 CLI，同一个已确认的账号/工作区，没有要求用户再次授权连接。

原 Sites 网站及 `.openai/hosting.json` 保留，没有重新部署或删除：
https://a-little-secret-garden.rationalbay.chatgpt.site/

## 本次变更

- 左上角名称、对应无障碍名称与浏览器标题改为 `Walk with Bunny`。
- 首页 `A little way into wonder.` 保留；玩法、存档格式、美术与动效参数不变。
- 实际首次打开时发现空白页，控制台为 `InvalidStateError`，发生在 `FloofStatic` 合成零宽画布时。新增尺寸检查，初始隐藏/零尺寸时等待，尺寸恢复后沿原有 resize 流程绘制。
- 该绘制问题存在于之前批准的源文件中；本次没有据此重做视觉效果。

## 发布文件

- 静态根目录：`releases/walk-with-bunny-vercel-20261116/walk-with-bunny/`。
- 便携压缩包：`releases/walk-with-bunny-vercel-20261116/walk-with-bunny-static.zip`。
- 清单和 SHA-256：同级 `release-info.json`。
- 目录只有 `index.html`、`assets/`、`art/` 和 `vercel.json`。图片、字体均自托管；无服务端/API/密钥依赖。
- Vercel 配置为静态站点，不进行云端安装或构建，根目录直接作为输出。部署该目录，勿上传整个工作区或此前 Sites 的源码归档。
- 目标仅使用免费托管及默认 `.vercel.app` 地址，未购买域名或开通付费计划。

## 已完成验证

- TypeScript 和 Vite 生产构建通过。现存 Three.js 分包体积警告保留，未声称性能指标达标。
- `node scripts/check-walk-progress.mjs`：19 项通过。
- `node scripts/check-static-viewport.mjs`：5 项通过，覆盖初始零宽高、隐藏后重开、异常/亚像素尺寸恢复及正常绘制。对原文件运行同一回归检查可复现异常（4 项失败、正常绘制项通过）。
- 62 个网站文件通过本机 HTTP 读取并逐一校验哈希，55 个原始美术/字体文件与改名前一致。
- 本机 `/docs/DEPLOYMENT_A_20261114.md`、`/src/config/content.json`、`/.openai/hosting.json` 均返回 404。
- 实际桌面浏览器确认新标题、新页眉及保留的首页文案；修复后的新标签首次加载正常，控制台无警告/错误。
- 实际输入第一题 `0` 后刷新保留数字并进入第二题；重新开始产生另一 UUID 且回到四位全空、第一题未答状态。
- 全新进度直接访问 `#gift` 仍跳到 `#lock`，不会提前揭晓礼物。
- 证据：`docs/qa/walk-with-bunny-20261116/`，首页截图 `renamed-home.png`。

本轮未重新走遍全部支路，未验证实体触摸板、听感、手机和 FPS；此前完整验收单独保留。

## 线上验证与发布记录

- 发布项目：`prj_85errINas1BmFOfxtqOjPxetGAau` / `walk-with-bunny`。
- 工作区：`team_fndi0vSypp5CWWkJy2TIV7s9`。
- 部署：`dpl_H4PxxjD57Cah1pUUBvLYLwkGYvh4`，生产状态 `READY`。
- 正式地址：`https://walk-with-bunny.vercel.app`。Vercel 自带部署随机地址保留平台默认保护；给收礼人使用正式地址即可免登录。
- 62 个公开文件在线 HTTP 200，内容 SHA-256 全部与已检查发布包一致；未使用认证 Cookie、共享绕过链接或自动保护绕过密钥进行该验证。
- `/docs/DEPLOYMENT_A_20261114.md`、`/src/config/content.json`、`/.openai/hosting.json`、`/vercel.json` 均返回 404。
- Chrome 和内置浏览器实开成功；左上角与标签为 `Walk with Bunny`，首页原句保留。交付 Chrome 标签停在未开始的入口。
- 线上实测新一轮第一题四位为空；提交 `0` 后刷新保留第一位并显示第二题；再次新建一轮生成不同 UUID，四题恢复为空。
- 全新轮次访问 `#gift` 跳转至 `#lock`，仍要求四位密码；检查中的控制台警告/错误为空。
- 实际线上截图：`docs/qa/walk-with-bunny-20261116/online-home.png`；HTTP 验证记录 `online-static-checks.json`；浏览器记录 `online-*.txt`、`online-browser-logs.json`；CLI 最终发布结果 `vercel-deployment.json`。`vercel-project.json` 是发布过程中读取的项目记录，其中 BUILDING 是当时状态，不代表最终状态。

后续发布应复用此项目和工作区，从干净静态目录运行官方 CLI `vercel deploy --prod --yes --project walk-with-bunny --scope team_fndi0vSypp5CWWkJy2TIV7s9`，不要上传整个工作区，也不要删除旧 Sites 备份。

新域名不会继承旧域名的浏览器存档；同一轮 UUID 刷新继续该轮。用于全新展示时打开 `/?walk=new#garden`，不要只刷新已经解题的 UUID 地址。
