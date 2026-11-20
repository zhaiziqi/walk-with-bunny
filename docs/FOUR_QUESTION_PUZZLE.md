# 第一关：四道计算机知识题

2026-11-02，用户重新提供了原始题目与纸条／信封流程。本规格是当前实现依据，优先于 `birthday-site-handoff/` 中旧的两组 XOR 设计；原始交接文件和各阶段 QA 保留为历史记录。

## 题目与答案

网页继续使用英文。配置位于 `src/config/content.json` 的 `puzzle.questions`，固定顺序如下：

| 顺序／ID | 英文题面 | 数字 | 答后说明 |
| --- | --- | --- | --- |
| 1 · `python` | In Python, what number is the first index of a list? | `0` | Python 列表索引从 0 开始。 |
| 2 · `tcp` | In TCP, how many steps make up the handshake that opens a connection? | `3` | SYN → SYN-ACK → ACK，共三步；不是三次独立的握手过程。 |
| 3 · `xor` | This gate outputs 1 only when its two inputs differ. What does it output when they are the same? | `0` | XOR 的两个输入相同时输出 0。 |
| 4 · `binary` | A binary signal reads 101. What number is that in decimal? | `5` | 1 × 4 + 0 × 2 + 1 × 1 = 5。 |

`puzzle.kind` 固定为 `computer-knowledge-v1`；密码保持字符串 `0305`，保留首位 0。提示和解释同样使用英文。

## 桌面交互

1. 每次只解当前一题，输入一位数字并选择 `Keep this digit`。错误输入留在输入框，玩家可以修改；提示按需展开，不自动填答案。
2. 答对后，该数字留在桌上纸条对应位置，并显示短解释。前三题等待玩家选择 `Next question`，不自动跳走。
3. 第四题答对后，纸条完整显示 `0305`。玩家主动选择 `Keep the note`，把纸条收进标记为 `For later` 的小信封。
4. 收存后可选择 `Read note` 回看，再用 `Close note` 收起。关闭面板后继续花园探索；刷新保留已答题目和信封状态。
5. 这个密码留到后面的礼物盒四位锁使用。第一关不解释生日含义，也不会在此消耗密码或自动打开礼物。

音乐仍可独立进入，固定九首等权、有放回抽取；删除旧 `1001 → 9` 过场。知道密码的新设备仍可直接开礼物，但不会因此获得四题完成或信封状态。生日解释只在成功解锁后的礼物页出现。

## 状态与旧进度

新状态为 `version: 2`，键为 `birthday-gift:0305:v2`，保存四题输入／正确数字、`puzzleSolved`、`envelopeStored`，以及独立的礼物解锁与最近抽曲结果。四题全对与收进信封是两个步骤。

首次缺少 v2 时，只读 `birthday-gift:0305:v1`，仅迁移礼物解锁和有效最近曲目。旧两组题的完成状态不会转换成新四题完成，新题从第一题开始。原 v1 键不覆盖、不删除。重测方式见 [LOCAL_PREVIEW.md](LOCAL_PREVIEW.md)，不要为制造空状态清空旧进度。

自动检查和实际浏览器结果见 [PROGRESS.md](PROGRESS.md) 中本轮状态及对应 QA；历史 M2／M5 的两组题截图不能作为新版四题验收证据。
