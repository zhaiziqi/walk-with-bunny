# M5 · 桌面技术彩排与本地备用

日期：2026-11-02，桌面内置浏览器 1280×720。真实曲名、礼物、称呼和署名尚未补齐；本轮完成技术彩排，不将 M5 整体或正式赠送版本标为完成。手机继续暂缓。

## 本轮修正

- 当前水粉地面和透明叶片纳入真实图片失败检查。加载错误、取消或超时会结束等待，保持程序笔触和叶片替代；迟到回调不能修改已卸载场景。WebGL 的 ground sampler 从有效备用纹理开始。
- 静态画面原先间接导入 Three。将植物布局、Canvas 笔刷和绒团绘制分离为纯模块，并修正生产分包：HTML 与主代码不再预加载／静态导入 Three。实际从独立构建副本删除 Three 文件后，仍可打开静态花园、抽曲和返回。
- 增加仅开发模式的加载报告。原水粉绘制命令、布局、颜色和 `soft-turn-stop-v3` 运动参数保持不变。
- 增加只使用 Node 标准库的本机预览服务器、内容交接说明及独立桌面备用包。只监听回环地址，不部署；缺失资源返回 404，端口占用明确失败。

## 真实浏览器检查

独立生产包运行于 `127.0.0.1:4181`，从空进度操作；原 `localhost:5173` 用户进度未重置。操作使用页面公开入口，**不是从入口自然行走到全部地点的探索节奏验收**。

1. 入口 → 音乐 → 礼物门 → 线索：信号 A 填 0011／3，信号 B 填 0101／5，得到 0305。
2. 展开可选连接进入音乐，抽到 01，保存唯一 drawId。曲名明确待填。
3. 礼物门输入 0305，Enter 开门，显示礼物占位及现场交付文字。
4. 礼物 → 音乐 → 花园：角色 x/y、镜头 x/y、zoom、heading x/y 七项与进入面板前逐项相等。
5. 再进入音乐并刷新：谜题完成、礼物解锁、歌曲编号与 drawId 全部保留；未重新抽曲。正常生产流程捕获的 error/warn 为空。
6. 开发页面模拟 WebGL context loss：从 WebGL 转静态，正在填写的谜题和既有曲目／解锁状态保留。
7. `?qa=asset-error` 实际令当前地面和叶片 URL 加载失败：WebGL 与 `?static` 均结束等待并绘制备用草坡、叶片和绒团，无白屏。该开关不在生产环境生效。
8. 独立构建副本物理删除 `three-*.js`，以 4182 服务：静态画面及 DOM 音乐抽取可用，得到 07 并返回花园。此故障测试预期出现动态模块加载错误，未将其当成正常页面无错误。

完整状态与故障日志：[browser-evidence.json](qa/2026-11-02-rehearsal/browser-evidence.json)。临时测试服务已结束，5173 开发预览保留。

## 截图

- [空进度入口](qa/2026-11-02-rehearsal/01-entry.png)
- [完成密码卡](qa/2026-11-02-rehearsal/02-password-card.png)
- [曲目卡](qa/2026-11-02-rehearsal/03-song-card.png)
- [礼物占位揭晓](qa/2026-11-02-rehearsal/09-gift-reveal.png)
- [WebGL 失效后的谜题](qa/2026-11-02-rehearsal/04-context-loss.png)
- [绘画素材失败的 WebGL 备用画面](qa/2026-11-02-rehearsal/05-art-fallback.png)
- [绘画素材失败的静态画面](qa/2026-11-02-rehearsal/08-static-art-fallback.png)
- [Three 文件缺失仍可抽曲](qa/2026-11-02-rehearsal/06-missing-three.png)
- [Three 文件缺失后的花园](qa/2026-11-02-rehearsal/07-missing-three-garden.png)
- [最终正常开发预览](qa/2026-11-02-rehearsal/10-normal-preview.png)

## 自动检查与采样范围

11 个回归脚本共 **125 项通过**：素材 10、绒团帧 7、指针 26、转向／停步 9、谜题 18、音乐状态 15、抽取 8、复制 8、礼物状态 13、解锁 10、配置 1。类型检查及最终生产构建通过；Three 分包仍约 882 KB，超过项目 650 KB 提示阈值。详见 [regression.txt](qa/2026-11-02-rehearsal/regression.txt)。预览服务器另做 12 项 HTTP／CLI 检查，包括 MIME、HEAD、404、方法限制、路径与符号链接越界、错误端口／参数、占用端口和缺少构建；脚本语法检查通过。

8 秒固定运动诊断（500 ms 预热后）：900 帧，平均帧间隔 8.33 ms，P95 9.2 ms，最长 9.8 ms；799 个运动样本中重复位置帧为 0。是当前桌面、当前浏览器和固定输入的短采样，**不能替代实体触摸板手感或整站性能基准**。采样后只进行了图片失败处理和依赖拆分，运动参数未改。原始数据：[motion.json](qa/2026-11-02-rehearsal/motion.json)。

最终开发页面缓存热加载采样：DOMContentLoaded 94.4 ms、load 384.6 ms、FCP 424 ms，83 个资源记录，未观察到外部资源来源。资源多为缓存／重验证（300 B），**不能作为冷启动或公网性能结果**。早先加载结果亦保留，不用两次缓存状态不同的采样声称优化幅度。详见 [loading.json](qa/2026-11-02-rehearsal/loading.json)、[loading-before.json](qa/2026-11-02-rehearsal/loading-before.json)。

## 备用包和内容交接

`releases/desktop-preview/` 包含完整 dist、本机服务器和说明；无需 node_modules、pnpm 或 Vite，需已安装 Node。实际以这个包启动 4181 完成上述流程。包中仍有曲目与礼物占位，不是最终赠送版。素材审计见 [M5_ASSET_AUDIT.md](M5_ASSET_AUDIT.md)，启动方法见 [LOCAL_PREVIEW.md](LOCAL_PREVIEW.md)，待填位置见 [CONTENT_HANDOFF.md](CONTENT_HANDOFF.md)。

重新生成备用包需先构建，然后运行 `node scripts/package-local.mjs`。该脚本仅替换带本工程生成标记的既有输出目录，不修改源参考和历史资料。

## 尚待完成

- 九首真实曲名、礼物资料、称呼／署名接入及内容复核。
- 展示电脑的实体触摸板转向／停步手感和声音实际听感。
- 自然行走完整路线与探索节奏、美术最终验收、深处区域精修。
- 实际断开外网后的现场彩排；本次仅验证本地资源与独立服务，不声称已断网实测。
- 手机、部署、最终赠送包均未完成；没有接入虚构私人音频。

本轮前备份：`docs/versions/before-m5-20261102.tar.gz`。原始交接包及所有参考文件保留。
