# 生日礼物网站：技术规格（A · 走进秘密花园）

本文件面向实现者，配合 PRODUCT_SPEC.md、DESIGN_AND_ACCEPTANCE.md、ASSET_BRIEF.md、DEVELOPMENT_PLAN.md 与 content.template.json 使用。用户已选择 A：明亮、柔软、可以走近不同场景的秘密花园。先做可操作的美术样片，再接入完整业务。桌面用于第一次现场共同探索，手机用于以后回来点歌。

当前交付物是计划与模板，尚未创建可运行网站；下文验收均是未来需要执行的检查。已有项目优先沿用其技术栈、依赖和目录约定；空项目采用 React + TypeScript + Vite，Three.js 通过 React Three Fiber 承载有限的分层场景，GSAP 统一管理转场，HTML/CSS 呈现文字与控件。

## 1. 实现范围与固定规则

- 纯前端静态网站，中文；桌面现场体验优先，同时支持手机回访。
- 视图统一为 overview / puzzle / music / lock / gift；首屏邀请并入 overview，bridge 是谜题后的短过场，不另建一个世界。
- 第一关：解码片 `1001`；信号 A 为 `1010`，B 为 `1100`；输出分别为 `0011` 和 `0101`；十进制分别为 3、5；每段补足两位，拼成字符串 `0305`。
- 每张卡先完成四个输出 bit，再输入十进制答案；不能省去第二步而直接自动揭晓全部密码。
- `1001` 按二进制读为 9，作为九首曲子的转场。
- 九首曲子固定编号 1—9，每次独立、有放回、等权抽取，允许重复。
- 礼盒密码始终是字符串 `"0305"`。关于它是送礼者生日的首次解释只出现在 `gift` 页。
- 网站只生成可复制的点歌文字，不发送消息；演奏视频或现场演奏由双方后续沟通。
- v1 不做账号、后端、数据库、管理台、在线音乐播放器、历史画廊、重播或清空进度设置界面。
- 部署只提供指引，不自动发布、开通付费服务或产生费用。

前端密码锁用于礼物揭晓的仪式，不提供真正的内容保密。这一实现边界写在开发说明里即可，不加入收礼人的页面流程。

## 2. 配置与内容

以交接包根目录的 `content.template.json` 为内容模板，保留以下顶层分组：

| 分组 | 职责 |
| --- | --- |
| `site` | 网站标题、页面文案等站点内容 |
| `people` | 收礼者称呼、送礼者署名 |
| `puzzle` | 固定的密码、解码片、信号和位权 |
| `music` | 抽取规则、九首曲目及点歌文案 |
| `gift` | 礼物名称、选择理由、图片与替代文字 |
| `theme` | 视觉主题参数 |
| garden | 总览、地标和返回标签等场景文案 |
| assets | 素材引用；尚未提供时为 null |

固定配置包括 `puzzle.code="0305"`、`puzzle.key="1001"`、信号 A/B 为 `1010/1100`、`puzzle.weights=[8,4,2,1]`、`puzzle.segmentDigits=2`，以及 `music.mode="independent-with-replacement"`。

曲目使用 `id / title / reason / placeholder` 字段；礼物使用 `name / reason / imageSrc / imageAlt / placeholder` 字段。具体结构以模板为准，不另造一套冲突的内容模型。

实现时集中读取配置，避免在多个组件里重复写密码、曲目或私人文案。配置检查至少覆盖：九首曲目的 ID 完整且不重复；谜题推导出的密码与 `puzzle.code` 一致；关键字段类型正确。

没有真实素材时保留明确的占位内容；素材引用为 null，由组件选择明确的临时替代，不编造文件路径。几何占位可验证交互，但不能据此声称美术样片通过。不得编造双方经历、曲目选择理由或礼物细节。正式赠送前按 `placeholder` 标记逐项替换并检查。

## 3. 推荐代码职责

| 模块 | 职责 |
| --- | --- |
| `config/` | 读取、校验、提供统一内容配置 |
| `lib/puzzle.ts` | 逐位异或、二进制转换、两位格式化 |
| `lib/draw.ts` | 抽取曲目 ID |
| `lib/storage.ts` | 进度读取、校验、保存与失败降级 |
| `state/experience.ts` | 业务状态与事件；React reducer 即可 |
| `scene/` | 分层舞台、地标、相机与渲染降级 |
| `ui/` | 五个视图中的真实 DOM 面板与可访问入口 |
| `motion/` | 统一转场、减少动效与时间线清理 |
| `components/` | 输出 bit、提示、密码卡、音乐卡等复用组件 |
| `styles/` | 主题、响应式布局、交互及减少动效样式 |
| `public/` | 礼物图片等本地素材 |
| `README.md` | 启动、构建、内容替换、验收、静态部署指引 |

可以使用简单 hash 导航，例如 `#music`。没有必要仅为五个视图新增 Router；已有项目采用路由库时直接复用。刷新静态地址不应依赖服务端重写嵌套路由。

### 3.1 分层场景、相机与 DOM

默认以 R3F/Three.js 承载有限的 2.5D 舞台：手绘背景和透明物件可以作为不同深度的平面，少量关键物件再做立体模型。固定几个可观看的位置，点击地标后靠近，再返回；不需要自由漫游、碰撞、角色、旋转星球或完整地形。无需先掌握 Blender 才能启动。

R3F 是 React 渲染器，主版本须与 React 匹配。开始时查当前工程及官方兼容说明，选定后记录实际版本与 lockfile，不盲目全部升级“最新版”。[R3F 安装说明](https://r3f.docs.pmnd.rs/getting-started/installation)

Canvas 只承载美术场景与物件反馈。中文、数字、题目、按钮、输入、曲目卡和长文字使用 DOM。不要把可读文字和表单烘焙进图片；装饰层不吞掉表单点击。场景热点同时有等价的 DOM 键盘/触摸入口。

Canvas 提供 GL 不支持时的 fallback，图形故障也需要处理。替代应是同风格静态花园与 DOM 入口，保留全部业务，不只显示“设备不支持”。[R3F Canvas 文档](https://r3f.docs.pmnd.rs/api/canvas)

### 3.2 动画的唯一所有者

| 行为 | 负责层 | 约束 |
| --- | --- | --- |
| 镜头靠近/返回、大尺度视图变化 | 一个 GSAP 转场控制器 | 同一属性只有一个写入方 |
| 微小鼠标视差 | 相机控制器内单独偏移层 | 转场时冻结或衰减，不争抢相机基准 |
| 花草与云的持续运动 | R3F 局部节点帧更新，或独立 CSS 子层 | 与转场分别作用于不同节点/属性 |
| DOM 悬停、焦点与小提示 | CSS | 不影响业务判定 |
| 抽歌/解锁结果 | reducer/事件处理器 | 结果先成立，动画只表现 |

useFrame/useThree 必须在 Canvas 上下文内使用。逐帧变化通过 ref/场景对象，不把每帧都写成 React 业务状态。[R3F Hooks](https://r3f.docs.pmnd.rs/api/hooks)

GSAP 时间线在离开视图、快速返回、组件卸载时清理。使用官方 React 集成管理作用域，事件中创建的动画同样要清理，防止重复挂载叠加动画。[GSAP React](https://gsap.com/resources/React/)

相机过渡、花朵摆动与 DOM 反馈不能同时改写同一个 transform。过场可以取消、跳过或降级，业务成功不依赖 onComplete。减少动效时关闭持续视差与大范围推进，采用静态终点、短淡入或即时呈现。

### 3.3 本地资源、加载与现场备用

- 配置中 assets 路径为 null 表示尚未提供；不发起空路径请求。给出路径后必须有真实文件。
- 素材尺寸、分层和预算以 ASSET_BRIEF.md 为准；先加载首屏必要图层，后续近景按需加载并适度预取。
- 正式运行所需素材放入本地项目，包括图片、必要模型、可选音频与字体。运行时避免依赖临时外链、素材站和远程字体。
- 先显示稳定底景和真实加载状态；不人为延长进度条。资源失败可以进入静态替代，不无限等待。
- 图形初始化失败、关键模型缺失或上下文故障要触发可继续使用的 DOM 替代。
- 目标设备实际测量后再调整 DPR、阴影、透明图层与纹理尺寸；未测量时不声称“稳定60fps”。
- 页面隐藏时暂停不必要环境运动，回来时恢复有效状态，不等待后台动画“补播”。
- 提前安装依赖、完成构建、本地化全部素材。现场电脑用本地静态预览服务打开 localhost，断开外网后完整彩排一次。
- 不把直接双击构建 HTML 当作可靠运行方式。本地预览备用方案不等于部署后具备离线 PWA；首版不要求 Service Worker。

## 4. 业务状态

以下类型表达所需状态，命名可以随项目规范调整，但行为保持一致：

```ts
type View = "overview" | "puzzle" | "music" | "lock" | "gift";
type Bit = 0 | 1;
type BitDraft = [Bit | null, Bit | null, Bit | null, Bit | null];

type CardProgress = {
  output: BitDraft;
  stage: "bits" | "decimal" | "solved";
  decimalInput: string;
  segment: string | null;
};

type Progress = {
  version: 1;
  cards: { A: CardProgress; B: CardProgress };
  puzzleSolved: boolean;
  bridgeSeen: boolean;
  giftUnlocked: boolean;
  lastDraw: {
    songId: number;
    drawId: string;
    drawnAt: string;
  } | null;
};
```

每张卡的四个 `output` 初值均为 `null`，不能将“尚未作答”当作已选择的 `0`。当前 view、相机位置、过场 phase、动画是否播放、复制提示和提示面板开关等临时状态留在内存，不保存为业务进度。刷新不恢复半途相机和 isDrawing。已有实现中若有 lastScene，仅作为兼容旧数据忽略，不据此获得业务权限。

### 必须保持的约束

- `keyAvailable` 是派生值，严格等于 `puzzleSolved`，不单独保存。
- 两张卡都完成十进制输入验证后，才能设置 `puzzleSolved=true`。
- 新设备直接输入正确密码时，只设置 `giftUnlocked=true`，不伪造 `puzzleSolved` 或已完成卡片状态。
- 访问音乐页、抽歌、复制文字均不改变谜题或礼物解锁状态。
- 已经完成的卡片转为只读，避免修改答案导致累计进度不一致。
- `lastDraw` 只记录最近一次抽取，不建立“已兑换”“已听过”等状态。
- `giftUnlocked=true` 不代表第一关完成；不能据此显示“我的密码卡”。

## 5. 场景、导航与恢复

| 视图 | 进入与退出规则 |
| --- | --- |
| overview | 花园总览包含首次邀请或继续入口。始终有低调且可找到的“我来点歌”。获得密码后可查看“我的密码卡”；已解锁时可点歌和重看礼物。 |
| puzzle | 走近信号花圃，恢复未完成卡片；完成后收好密码卡，再主动继续 bridge 或返回总览。 |
| music | 无前置门槛，新设备可直接使用。恢复最近曲目，主动点击才抽取。可返回总览，或前往 lock；已解锁时可去 gift。 |
| lock | 任何设备可进入。正确密码只设置 giftUnlocked，再去 gift。仅 puzzleSolved 时可查看密码卡；否则可返回解谜。 |
| gift | 要求 giftUnlocked；否则去 lock。此处才解释 0305 的生日含义。 |

首次推荐旅程为总览 → 信号花圃 → bridge → 音乐花圃 → 礼物门。bridge 仅在谜题完成后展示 1001→9，是短过场而非独立空间。抽歌不是继续条件，可稍后再抽。

hash 建议采用 #garden（映射 overview）/ #puzzle / #music / #lock / #gift。明确 hash 先经守卫校验；未知 hash 回总览，未解锁 #gift 去 lock。URL、动画回调与组件挂载都不能创造解锁状态。

初始化先读取并校验业务进度，再应用合法 hash。没有 hash 时显示总览：无主线进度显示开始，部分谜题显示继续，已解锁者突出点歌和重看礼物。只有 lastDraw 不代表主线已经开始或谜题完成。

返回总览时回到稳定构图，并把焦点返回对应入口。浏览器前进/后退与快速切换统一经导航控制器处理；取消旧动画后落在新的有效视图，不把控件永远锁在“转场中”。

## 6. 谜题交互

每个输出位置给出 `0 / 1` 两个可选项，初始均未选择。输入信号和解码片只读，输出区可操作。位权 `8 / 4 / 2 / 1` 在进入该卡的 `decimal` 阶段后才展示。

每张卡按三个阶段完成：

1. **bits**：用户选择四位输出，点击验证。先检查是否全部作答，再按位置校验异或结果；错误时给温和提示，不自动填正确答案。
2. **decimal**：四位全对后，锁定当前输出，展示位权和亮灯状态，要求输入这组信号代表的十进制数字。
3. **solved**：A 接受 `3` 或 `03`，B 接受 `5` 或 `05`；验证成功后统一显示 `03`、`05`。

两张卡按 A、B 固定顺序拼接；先分别转换十进制、各补足两位，再拼成 `0305`。不要将两个二进制串拼接后统一转换，也不要将 3 和 5 相加。

提示分级展开；用户主动使用最高一级提示时，演示当前卡的正确输出与十进制求和。点击“我读懂了”后，将当前卡的输出、十进制结果和 segment 一起写入，并标为 solved；不要仅修改 puzzleSolved 而留下不一致的卡片数据。两张卡均完成后才取得密码。提示不扣分、不减少礼物、不设置失败上限。

在解谜、收好密码卡、过场、音乐和锁页中，都不提前解释 `0305` 的生日含义。

## 7. 抽歌与复制

### 抽取规则

每次点击“抽一首”时，从九个固定 ID 中等权抽取一个，允许连续出现同一首。`Math.floor(Math.random() * 9) + 1` 足以用于这一普通互动；不要用 `Math.round()`，也不要排除历史结果或偷偷重抽重复曲目。[MDN 随机数说明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random)

一次抽取的顺序是：

1. 用户主动点击，并同步设置本次抽取锁；不只依赖下一次 React 渲染才禁用按钮。
2. 立即确定一次结果，生成新的 `drawId` 和 `drawnAt`，更新 `lastDraw` 并尝试保存。
3. 播放种子/光点飘向已确定音乐花、花展开的短动画。
4. 显示已确定的结果。减少动效或过场中断后仍可呈现该结果；结果不依赖动画结束回调才成立。

动画期间阻止连点制造多个抽取。刷新、组件重渲染或切换场景不自动抽歌；刷新后恢复 `lastDraw`。连续抽中相同曲目时仍生成新的 `drawId`，以便正确呈现这次新抽取。

`drawId` 只用于区分抽取事件；`drawnAt` 保存 ISO 时间字符串。无需让日期、生日、访问次数参与决定曲目。九朵花的编号和曲目映射固定，不因抽过而消失。触碰某朵花可有视觉回应，真正随机抽取由明确的抽取动作触发。

### 复制文字

点击后调用 `navigator.clipboard.writeText()`，成功返回后才显示“已复制”。该 API 需要安全上下文，也可能被浏览器拒绝，因此失败时提供可选择的文字区域和“长按复制”提示，不让卡片变得无法使用。[MDN Clipboard 文档](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)

点歌卡始终可以截图。界面不能显示“已发送”，因为网站没有发送消息；不自动唤起聊天软件。

## 8. 本地保存与降级

使用专用键，例如 `birthday-gift:0305:v1`。访问、读取、JSON 解析、校验和写入都处理异常。

- 校验版本、字段类型、四位 bit、曲目 ID 和卡片阶段。相机、view、动画 phase 不属于持久化业务数据。
- 恢复时校验卡片阶段与答案一致：decimal/solved 阶段需要正确的四位输出，solved 还需要正确的十进制答案与 segment；puzzleSolved 根据两张有效 solved 卡重新确认。bridgeSeen 只能在谜题完成时成立。giftUnlocked 独立处理，不能反推谜题完成。
- 损坏或不兼容的数据回到安全默认状态；无效字段不能直接造成空白页面。
- 存储不可用时保留本次内存状态，允许走完整个流程；不要把持久化成功作为抽歌或开锁的条件。
- 只持久化业务进度，不持久化 `isDrawing`，避免刷新后卡在动画中。
- v1 没有重播、清空进度或历史画廊界面。
- 开发时若需要 reset，只删除本应用专用键，并在 README 记录操作；不调用 `localStorage.clear()`。

`localStorage` 通常跨会话保存，但受来源、浏览器策略和隐私模式影响；它不是跨设备同步。新设备仍能从邀请页直接点歌，也能输入已知密码打开礼物。[MDN localStorage 文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

## 9. 桌面、手机、动效与可访问性

- 桌面先验收总览构图、层次和靠近/返回；手机保留同一美术，调整裁切与面板，不直接缩小整幅桌面画面。
- 以 320px 宽度作为最窄验收尺寸，另检查实际手机；无横向滚动，主要操作无需精细拖动或 hover。
- 触控目标按至少 44×44px 设计；输入和正文保持手机可读。
- 每个输出 bit 同时呈现数字和亮灭状态，不能仅用颜色区别；控件应有能描述卡片、位置和当前选择的名称。
- 支持键盘操作、可见焦点和明确的输入标签；页面切换后管理焦点，反馈采用适当的状态提示。
- 密码使用文本输入与 `inputMode="numeric"`，验证四位字符串，不使用 `type="number"`。
- 尊重 `prefers-reduced-motion`。抽取和转场可直接显示或短淡入，业务完成不能依赖动画结束事件。
- 不自动播放音乐或音效；v1 不要求提供音乐文件。
- 优先本地美术素材与字体兜底。临时 SVG/CSS 图形可用于搭结构，美术验收仍需实际达到选定风格。

减少动效偏好由浏览器的对应媒体特性提供。[MDN 减少动效文档](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

## 10. 少量核心逻辑示例

以下仅说明计算契约，不是完整应用；实现时应从统一配置读取参数，并结合状态规则使用。

```ts
function xorBits(signal: string, key: string): string {
  if (!/^[01]{4}$/.test(signal) || !/^[01]{4}$/.test(key)) {
    throw new Error("信号必须是四位二进制字符串");
  }
  return [...signal].map((bit, i) => bit === key[i] ? "0" : "1").join("");
}

function acceptSegment(input: string, expected: number): string | null {
  const text = input.trim();
  if (!/^\d{1,2}$/.test(text) || Number(text) !== expected) return null;
  return String(expected).padStart(2, "0");
}

function pickSongId(random: () => number = Math.random): number {
  return Math.floor(random() * 9) + 1;
}

function passwordMatches(input: string, configuredCode: string): boolean {
  const text = input.trim();
  return /^\d{4}$/.test(text) && text === configuredCode;
}

// xorBits("1010", "1001") === "0011" -> 3 -> "03"
// xorBits("1100", "1001") === "0101" -> 5 -> "05"
// "03" + "05" === "0305"
```

异或的定义是同位相同输出 0、不同输出 1。[MDN 异或文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR)

## 11. 实现顺序与验收

### 建议顺序

完整分轮指令见 DEVELOPMENT_PLAN.md。

1. M0：检查现有工程、配置和素材清单。
2. M1：先做花园总览、分层环境、一朵花的回应、一次靠近/返回；用可操作样片确定美术与运动。
3. M2：接入完整 XOR、提示、密码卡与进度恢复。
4. M3：接入九首曲子、随机动画、复制与直接回访。
5. M4：接入礼物门、生日含义与真实内容。
6. M5：目标电脑/手机彩排、降级检查、生产构建与交付说明。

### 核心验收

| 检查 | 预期 |
| --- | --- |
| 初始谜题 | 每张卡四位均未选择，不误当作 0 |
| A/B 解码 | 分别得到 `0011`、`0101`；十进制输入 3/03 和 5/05 都接受 |
| 密码生成 | 只有两段完成才获得 `0305`；第一关不解释生日 |
| 密码输入 | `0305` 成功；`305` 与错误四位值失败 |
| 新设备输密码 | 礼物解锁，`puzzleSolved` 仍为 false，没有密码卡入口 |
| 独立点歌入口 | 无进度也可抽歌，不解锁礼物或谜题 |
| 随机边界与重复 | 可抽到 1 和 9，连续同一编号合法 |
| 刷新恢复 | 部分谜题、最近曲目、已解锁礼物恢复；刷新不自动重抽 |
| 复制/存储被拒绝 | 有可手动复制文字；当次体验仍可完成 |
| 减少动效与手机 | 无动画卡死，320px 宽度可操作，无横向滚动 |
| 礼物直达链接 | 未解锁时进入锁页，不能因为 URL 直接展示礼物 |
| 正式内容 | 已替换待填项，礼物图片缺失时不破版 |

对计算与状态条件使用少量确定性测试；随机数用可注入函数验证边界与允许重复，不用大量随机抽样做频率断言。浏览器中完整走一遍首次体验和新设备点歌路径，检查控制台与生产构建。无需为每个静态文案或样式建立测试。

## 12. 官方实现参考

- [Vite 入门与 React TypeScript 模板](https://vite.dev/guide/)
- [R3F 安装与 React 版本匹配](https://r3f.docs.pmnd.rs/getting-started/installation)
- [R3F Canvas、fallback 与渲染设置](https://r3f.docs.pmnd.rs/api/canvas)
- [R3F Hooks](https://r3f.docs.pmnd.rs/api/hooks)
- [GSAP React 集成与清理](https://gsap.com/resources/React/)
- [MDN：异或](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR)
- [MDN：Math.random](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random)
- [MDN：localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN：Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
- [MDN：prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
