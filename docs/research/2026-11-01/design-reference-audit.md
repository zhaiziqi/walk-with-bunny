# Reference audit and design direction

Date: 2026-11-01

本轮目的：逐一核实五个灵感来源，区分实际看过的画面、官方说明、源码证据和设计推断，形成下一轮实现依据。本文件为研究记录，未修改网站运行代码。

## 1. Evidence and limits

- 本轮阅读了下列具体页面、创作者制作资料和 React Bits 官方组件源码；重新查看了项目保存的当前页面、Wayfinder、Bellwoods、My Little Storybook 及 Recent 参考图片。
- 本轮浏览器连接 Wayfinder 和 Recent 连续超时，未完成新的完整交互体验。保存的旧截图只能证明对应画面，不能证明当前版本的动态手感。
- Framer 案例阅读了官方介绍和网站结构，未实测滚动节奏。Recent 的原作者 X 动画链接超时或返回 403，未完整观看动画。Thrine 核实了公开功能，未进入编辑器调参。React Bits 的动态判断依据源码，非本轮实时演示。
- 笔记中的模板/组件数量不是选型依据；Thrine 的“80 多个模板”未从公开页面核实。Framer Gallery 的案例展示也不等于全部代码都可直接复制。

## 2. Five sources, specific findings

### Framer Gallery — visual and information hierarchy

Sources:
- https://www.framer.com/community/gallery/
- https://www.framer.com/community/gallery/adventure-365/
- https://adventure365.co/

Adventure 365 的官方介绍强调环境影像、克制的界面和滚动触发动效。它对本项目的用途是信息出现的时机：入口、自由探索、内容阅读三种状态有不同的信息量。环境承担主要表达，文字只承担当前需要的提示。

应用：标题让出画面后，保持小而稳定的入口标识；物件接近时出现简短提示，打开后才呈现清楚可读的内容。商业落地页结构、视频首屏和品牌配色不进入花园。

### Awwwards — My Little Storybook

Sources:
- https://www.awwwards.com/sites/my-little-storybook
- https://lusion.co/projects/my_little_story_book/
- https://v2.lusion.co/work/my-little-storybook/
- https://medium.com/@PaulineStich/case-study-my-little-storybook-6f4293db9aba
- https://www.awwwards.com/inspiration/my-little-storybook-ui-button-sound-effect

创作者复盘记录了分镜、手绘动画、模型/纹理、相机及后期的共同调整。当前保存的截图可看见前景花石、中景水面与角色、后景草坡围成一个明确的小舞台。可借鉴的是从一个事件出发组织画面与动作。

应用：将“发现—靠近—回应—余韵”作为一个完整小片段来设计，随后选择所需物件、镜头和声音。自由探索仍由玩家控制；不引入逐页 Next 导航、大片聊天气泡或强烈摄影景深。

### Recent — coherent material and silhouette

Sources:
- https://recent.design/info
- https://recent.design/i/r7lof7q-platinum-card-layer-breakdown
- https://recent.design/i/fw9lnh3-x-com

Recent 已核实为设计精选流。Platinum Card Layer Breakdown 的条目解释了拉丝、光泽、内高光、边框和刻字如何共同形成一个简单形状的材质。Rabbit Hole 条目描述同一轮廓框架中的纹理变化。

应用是设计推断：草地的大色块、顺地势的笔触、局部阴影和透光边缘要共同工作；兔子各方向的耳朵比例、头身关系和脚底锚点要保持一致。金属卡视觉与快速纹理切换不适合花园；不直接移植。

### Thrine — light, material and motion of one object

Source: https://thrine.app/

官方公开页支持模型、文字、SVG，调整材质、光照、背景和动画，输出图像、视频或实时嵌入。本轮未实操编辑器。

应用是设计推断：把灯与地面、兔子与草坡作为同一个受光系统设计，校对光色、接触阴影与动作幅度。现有 Three.js 世界已经拥有位置和状态，优先在其中实现这些关系；额外嵌入独立模板不会自动共享世界信息。

### React Bits — temporal continuity and localized response

Sources:
- https://reactbits.dev/backgrounds/liquid-ether
- https://reactbits.dev/r/LiquidEther-TS-CSS.json
- https://reactbits.dev/backgrounds/particles
- https://reactbits.dev/r/Particles-TS-CSS.json

Liquid Ether 将指针运动注入局部速度场，状态会随时间继续演化。Particles 提供空间中的漂移与明暗变化。研究重点是状态延续和空间层次，而非将整个组件的视觉铺在网站背后。

应用：沿用现有世界坐标粒子，围绕逆光区域、花丛和路径安排分布；兔子经过引起短暂局部扰动，再自然回落。雾、花粉和枝叶响应同一阵风，但响应速度、幅度与可见度各异。原组件的高亮流体、星座连线、满屏鼠标光效不进入花园。

## 3. Main references retain distinct roles

### Wayfinder: discovery changes the world

Official sources:
- https://collection.nfb.ca/interactive/wayfinder
- https://mediaspace.nfb.ca/comm/what-ageless-tale-is-the-landscape-whispering-today-it-may-never-be-whispered-again-wayfinder-an-animated-interactive-journey-across-the-poetry-of-the-land-matt-deslauriers-nfb-gen/

官方描述的核心循环是寻找标记、显露词语、周围自然复苏、片段组成诗句；美术结合手绘、二维动画和三维建模。这支持“行动改变环境，再产生下一条探索线索”的方向。并不证明 Wayfinder 的某个具体鼠标算法或粒子算法。

我们的对应：开花、蝴蝶、花灯和回程痕迹已经存在，下一轮应提升其可察觉的因果与前后关联。生日谜题、音乐和礼物规则独立保留。

### Bellwoods: continuous motion and response

Creator source: https://mattdesl.svbtle.com/bellwoods

作者解释了指针映射到虚拟平面、变量阻尼、随地势与方向变化的镜头，以及草花响应和有节奏的声音。借鉴这些机制完善现有控制器；不必复制完整旋转镜头或源码。

### beco+81: character and quiet surreal humour

Official publisher: https://publishing.parco.jp/books/detail/?id=516

官方描述强调可爱、幽默和超现实感。仅使用柔软兔子或粉色不足以表达这个参考。用户上传的图片来源各异，不应全部归属于 beco+81。

本项目的原创方向：让普通的小场景里发生一个轻微的不合常理事件，例如兔子停在一片月光旁，地上的影子比它先竖起耳朵。一次只突出一个事件，其他环境运动成为陪衬。此例是设计候选，不是已实现内容或原作情节。

## 4. Current project diagnosis

Visual evidence reviewed this round:
- `../../qa/first-slice-v2/02-bend.png`
- `../../qa/wayfinder-desktop/reference-walk.png`
- `../../reference-review/quiet-rabbit/bellwoods-explore.png`
- `storybook-reference.jpg`
- `card-layer-reference.webp`

以下是根据现有截图的设计判断：

1. **材质语言不连续。** 用户认可的入口是大色块、柔软颗粒与水彩边缘；探索画面则是平滑起伏地形加细致植物贴图。兔子、植物、地面在笔触尺度和边缘处理上没有充分统一。单独覆盖纸纹无法解决这一差别。
2. **留白缺少形状。** 大片地面处于近似明度，物件分别摆放。应通过坡面轮廓、局部投影、路径的显隐和色块方向组织空场，使视线自然落到兔子及当前事件。
3. **空间关系不够明确。** 前景遮挡、中景舞台、远景线索需要不同的清晰度、明暗与运动幅度。现在远近层次过度依赖统一的雾，主体和线索也容易被压平。
4. **已有环境机制缺少可见的主次。** 动态功能存在并不意味着用户能读懂。关键时刻应有一处清楚的回应；其余运动保持连续、低强度，避免互相争夺注意。
5. **角色性格没有充分进入事件。** 走、停、转向之外，兔子应对少量关键事件表现注意、犹豫或好奇；动作与用户控制之间要自然交接。

Read-only code evidence:
- `src/scene/AtlasTerrain.tsx` 已有纸纹采样、色带、树冠阴影和云影；不能写成“完全没有地面材质/动态”。其表现尺度与美术匹配度需要画面对照调整。
- `src/scene/gardenWind.ts` / `GardenAir.tsx` / `airMotion.ts` 已有共用风、持续漂移、局部扰动和衰减；不能把它们重新列为待从零增加的功能。
- `src/scene/TrailAwakening.tsx` / `trailState.ts` 已有开花、引导蝶、花灯与回程痕迹。
- `advanceTrail` 当前仅在 `state.guideFlying && walking && towardNext` 等条件成立时推进飞行进度。兔子停下时蝴蝶路线进度停住，这是可定位的生硬之处。下一版应允许它完成短航段或自然落栖，用户移动只决定下一段是否触发。
- `src/scene/meadowMotion.ts` 与 `src/motion/useMeadowJourney.ts` 已有速度、方向、镜头的平滑。输入断续问题需要事件时间线与实际设备复测，不能归结为“加一个缓动函数就好”。

## 5. Next implementation order

### A. Lock three still compositions

入口：大片浅暖色空气与有方向的草坡，小兔是清晰焦点。

途中：坡面和近处枝叶暂时遮住目的地，透过缺口先看到一小处暖光。转弯后空间展开，近远景相对运动能被感知。

目的地：灯与低花丛围成可停留的小场地；光色在兔子、地面和花瓣上相互呼应。暮色循序进入，不以整屏变暗代替环境变化。

先检查静态轮廓、明暗、视线与材质是否成立，再调整动态。不存在通用的“每屏几棵树”目标。

### B. Refine one living encounter

沿用当前开花—蝴蝶—花灯机制，制作一个可自由停留、往返的短片段：

1. 静止时仍能看见一阵缓慢的风经过坡面，近处偶尔出现受光花粉。
2. 兔子经过花边，枝叶响应、花粉随之散开；脚步和身体重心相互对应。
3. 兔子停下，花继续完成展开；蝴蝶完成短航段并落栖。环境有余韵，用户能够看清发生的事情。
4. 转过坡面才看见花灯的完整轮廓。接近后，局部受光变化与花灯一起发生。
5. 回程保留细小、可识别的变化。首次遇见和再次经过具有不同回应。

此时序是我们的设计，不宣称照搬了参考站的具体事件。

### C. Check movement and interaction before extending the world

- 仅移动指针即可引导；缓慢滑动、快速转向、短暂停顿、离开页面、面板关闭分别检查。
- 输入意图、速度、朝向、步态和镜头各自平滑，角色按实际行走距离推进步态。
- 不用过长惯性掩盖停走问题。持续滑动不应因单个事件间隔而反复启动；停止后应有清楚、短促的收步。
- 实际操作验证入口、途中、目的地，并记录往返视频；静态截图只验构图。
- 打开内容时控件稳定；关闭后回到相同地点，旧指针位置不会自动带走兔子。
- Desktop first；网站文案继续英文，保留轻盈文学感字体；原有谜题、音乐和礼物规则保持。

### Acceptance

同一帧能清楚识别主体、空间与下一处线索；静止画面也有统一的美术语言。停止输入后，用户有值得停下来看的自然回应。探索后的回程能认出自己的影响。实现通过构建仅代表程序可运行，视觉与手感须以实际画面和操作结果验收。
