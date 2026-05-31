/**
 * 剧情节点数据。每个节点是「条件触发、只出现一次」的叙事卡，
 * 与随机事件（带选择/后果）互补，承担「把玩家的旅程串成故事」的职责。
 *
 * 分支机制：
 *  - 带 `choices` 的节点让玩家拉择，选项的 `setFlags` 会写入 GameState.flags；
 *  - 后续节点的 `trigger` 读取 flags，从而走向不同的剧情分支；
 *  - 随机事件的选项（GameEffect.setFlags）同样能写入标记，反过来牽动剧情。
 *
 * `lines` / `logMessage` 里的 `{name}` 占位符会在呈现时被玩家名号替换；
 * 新增剧情 = 在此追加一条，engine 不需改动（trigger 是只读 GameState 的纯函数）。
 */
import type { StoryBeat } from '../engine/types';

export const STORY_BEATS: StoryBeat[] = [
  {
    id: 'prologue',
    title: '楔子 · 接过半边匾',
    lines: [
      '老师傅临终前，把那块褪色的「百工」匾额交到你手里。',
      '「{name}，」他说，「这镇上的手艺，散了大半了。」',
      '「能不能归位，就看你愿不愿意走出去——把它们一门门寻回来。」',
      '于是，名为「{name}」的行脚，从这一季开始。',
    ],
    trigger: (s) => s.turn === 1,
  },
  {
    id: 'oath',
    title: '楔子 · 立心',
    lines: [
      '临行前夜，你独坐灯下，问自己一句：这条路，究竟要怎么走？',
      '是守住老规矩、把每道工序做到极致；还是顺应世道、先让手艺活下去？',
    ],
    trigger: (s) => s.turn === 1 && s.seenStory.includes('prologue'),
    choices: [
      {
        id: 'tradition',
        label: '守正——宁慢勿滥，工序一道不减',
        setFlags: ['oath-tradition'],
        logMessage: '{name}立下守正之誓：手艺的根，半分不让。',
      },
      {
        id: 'market',
        label: '趋时——先活下来，再谈传承',
        setFlags: ['oath-market'],
        logMessage: '{name}择了趋时之道：先让炉火不灭，再说别的。',
      },
    ],
  },
  {
    id: 'first-craft',
    title: '第一章 · 手起第一作',
    lines: [
      '当第一批出品在你手中成形，匾额上的「工」字仿佛亮了一分。',
      '镇上的老人们交头接耳：「这个叫{name}的后生，似乎真有几分心气。」',
      '路还长，但你已经迈出了第一步。',
    ],
    trigger: (s) => s.achievements.includes('first-step'),
  },
  {
    id: 'path-tradition',
    title: '岔路 · 守正者言',
    lines: [
      '几季下来，{name}守着老规矩，慢工细活。',
      '有人笑你迂，也有人专程寻来，只为这一份不肯将就的纯正。',
      '你渐渐懂得：所谓守正，守的不是死板，而是那条不肯退让的底线。',
    ],
    // 分支 A：当初立下守正之誓，且已行至中段
    trigger: (s) => s.flags.includes('oath-tradition') && s.turn >= 4,
  },
  {
    id: 'path-market',
    title: '岔路 · 趋时者悟',
    lines: [
      '几季下来，{name}灵活应市，炉火始终未熄。',
      '账面是好看了，可夜深时你也会问：那些悄悄简掉的工序，算不算一种丢失？',
      '你开始琢磨：活下去之后，能不能再把根，一点点接回来。',
    ],
    // 分支 B：当初择了趋时之道，且已行至中段
    trigger: (s) => s.flags.includes('oath-market') && s.turn >= 4,
  },
  {
    id: 'after-trend',
    title: '回响 · 风过之后',
    lines: [
      '那阵追逐潮流的风过去了，{name}站在冷清下来的铺面前。',
      '潮水退去才看清：跟得太紧，脚下反而没了根。',
      '这一课，记下了。',
    ],
    // 由随机事件「审美风向突变」选择「顺应潮流」写入的标记触发
    trigger: (s) => s.flags.includes('chased-trend'),
  },
  {
    id: 'on-the-road',
    title: '第二章 · 行脚四方',
    lines: [
      '商路一条条打通，{name}的足迹开始遍及数地。',
      '你渐渐明白：手艺从不是孤岛，原料、市场与人情，处处相连。',
      '每到一地，你都在替「百工」二字，补回一块缺失的拼图。',
    ],
    trigger: (s) => s.unlockedRegions.length >= 3,
  },
  {
    id: 'midway-reflection',
    title: '第三章 · 半程回望',
    lines: [
      '岁月过半。{name}停下脚步，回望来路。',
      '账面或丰或薄，口碑或浓或淡——但那块匾额，确实比初时更亮了些。',
      '剩下的季节里，你要守住的，究竟是生意，还是那点不肯熄的火？',
    ],
    trigger: (s) => s.turn >= 6,
  },
  {
    id: 'dev-blessing',
    title: '隐章 · 落羽之印',
    lines: [
      '一道并不属于这个时代的微光，落在{name}的掌心。',
      '从此你脚下无远弗届，囊中取之不竭——这是造物者留给自己的后门。',
      '尽情去走、去试、去把每一种可能都看个遍吧。',
    ],
    trigger: (s) => s.devMode,
  },
];

/** 把剧情文本里的 {name} 占位符替换为玩家名号（空则用「无名匠人」） */
export function renderStoryLine(line: string, playerName: string): string {
  return line.replace(/\{name\}/g, playerName.trim() || '无名匠人');
}
