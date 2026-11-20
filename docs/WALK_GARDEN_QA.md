# 桌面小兔探索 · 检查记录

青柠检查通过（指下述功能检查；不表示用户已验收整个画面）。

日期：2026-10-30，Asia/Shanghai。用户本轮明确：先做好电脑端；选择「小兔行走、镜头跟随，更接近 Wayfinder，松手停下」。本轮没有开展手机适配或手机验收。

## 实现与来源

入口继续使用用户已认可的 `quiet-garden` 水彩背景。进入后是新的连续草地、疏落树木与可行走小兔；按住鼠标指引方向，拖动可改变方向，松手停止角色与镜头。小兔轻跳、转向、留下短暂脚印；靠近植物时有轻微避让，树木按世界前后位置遮挡。

走近花灯、粉花或小门首次触发一行短句、少量花朵和蝴蝶；花灯有轻微亮光。点击物件再打开内容，环境发现与谜题/歌曲/礼物业务进度独立。发现仅保留在当前页面会话中，刷新后重置。

本项目独立实现交互，没有使用 Wayfinder/Bellwoods 的代码或运行素材。实际体验了 [Wayfinder 原站](https://wayfinder.nfb.ca/)：1440×900 下按住右上位置3500ms，角色行走、镜头跟随、草地与树进入画面；又拖动转向。截图为本目录 `qa/wayfinder-desktop/reference-before.png`、`reference-walk.png`、`reference-turn.png`。完整收集、成诗和音效流程未核验。环境激活的设计还参考了 [NFB 官方说明](https://www.canada.ca/en/national-film-board/news/2021/06/what-ageless-tale-is-the-landscape-whispering-today-it-may-never-be-whispered-again-wayfinder-an-animated-interactive-journey-across-the-poetry-of-.html)，不把文档描述当作全部实测结果。

新增地面与树木由内置 image_gen 生成，保留源图、WebP和提示记录：[walk-generation-prompts.json](art-source/walk-generation-prompts.json)。当前采用 `walk-meadow-v2`，初稿植被偏密未采用；树的脚底依据alpha实测对齐。生成工具实际返回地面1448×1086，并未输出提示里请求的3072×2304；没有放大后冒称原生高分辨率。

## 实际浏览器结果

内置浏览器使用真实按住、拖动、滚轮与可访问控件；位置记录只读页面DOM，没有注入状态。证据：[browser-checks.json](qa/wayfinder-desktop/browser-checks.json)。

| 检查 | 结果 |
| --- | --- |
| 1440×900斜向行走 | 按住左上2200ms，镜头从 `(0,0)` 到 `(-434.392561,263.438069)`，两轴同时变化 |
| 松手停留 | 下一次观察仍为相同坐标，`moving=false`；没有滑行 |
| 反向 | 按住右下后到 `(-224.320939,140.105698)`，方向立即反转 |
| 走近触发 | 从入口实际向左下行走，再走近花灯；到 `(-803.184624,-277.843164)` 时才出现「你一靠近，小灯便醒了」和发现状态，仍在overview |
| 阅读稳定 | 花灯面板镜头 `(-670.819672,-289.672131,1.22)`，兔子世界位置 `(-803.184624,-497.843164)`；面板中按住背景和滚轮均不改变这些值 |
| 面板返回 | 关闭恢复 `(-803.184624,-277.843164,1)`，兔子锚点保持原值 |
| 1920×1080地点可达 | 小门、粉花均能导航进入发现圈；三个地点分别标记发现，未伪造业务完成 |
| 物件拖动与点击 | 从小门上拖动改变行走方向，仍为overview，没有误开面板；短点击可开面板 |
| 边界反向 | 右边界x=783.111111，反向按住后立即离开，到x=683.296470；无需拖回被截掉的距离 |
| 减少动态 | 切到static后仍能按住走动；切回WebGL继续使用；没有移动端测试 |
| 花灯/粉花 | 手动增亮有按钮状态和文案回应；碰花出现问候文案与摇摆 |
| 浏览器历史 | 粉花关闭恢复 `(580,-670,1)`；后退回面板保留兔子位置，前进恢复同一完整视角 |
| 返回入口 | 返回后水彩邀请页恢复；刷新仍保持入口与 `(0,0,1)`，修正了历史entered状态不一致 |

已检查的截图：

- [01 水彩入口](qa/wayfinder-desktop/01-entry.png)
- [02 行进中的草地](qa/wayfinder-desktop/02-walking-meadow.png)
- [03 走近花灯产生回应](qa/wayfinder-desktop/03-discovery.png)
- [04 稳定阅读面板](qa/wayfinder-desktop/04-panel.png)
- [05 宽屏小门与兔子](qa/wayfinder-desktop/05-wide-door.png)

## 检查命令

`sh scripts/project.sh check`、`sh scripts/project.sh build`、`node scripts/check-meadow-motion.mjs`、`node scripts/check-content.mjs` 均通过。

行走脚本共9组：双轴方向/对角等速、近脚点减速死区、帧率无关速度、松手停止/长帧限制、边界反向、共享脚点，以及4种桌面尺寸下的12个地点可达/导航落点检查、108种场景共432个地面角点覆盖检查。固定内容配置规则保持不变。旧 `check-free-pan` 是历史画布拖动控制器检查，不作为当前行走控制器通过依据。

生产构建仍有 Three 分包约895KB（gzip约243KB）的体积提示，构建成功。最终刷新后新增控制台警告/错误为0，见 [fresh-console.json](qa/wayfinder-desktop/fresh-console.json)。参考研究页无坏图、无横向溢出。未做跨浏览器、低性能电脑帧率或声音测试；本轮未重新执行全部资源失败/上下文丢失注入。静态降级经减少动态开关实际检查。

## 范围

这是带共享透视投影与前后排序的2.5D绘画探索，角色使用透明插画和程序动画，未实现完整三维角色骨骼、实体碰撞或无限地形。后续可以继续深化行走姿态、场景层次和声音，但不能把本轮称为完整复现 Wayfinder。

完整谜题、曲目卡、随机抽歌、密码输入与礼物揭晓仍属后续M2—M5；规则配置保留，当前面板明确标注样片范围。原始交接与参考文件未改动，前一版代码保存在 `docs/versions/quiet-pan-20261030/`。
