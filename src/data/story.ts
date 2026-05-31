/**
 * 剧情节点数据。每个节点是「条件触发、只出现一次、无选项」的叙事卡，
 * 与随机事件（带选择/后果）互补，承担「把玩家的旅程串成故事」的职责。
 *
 * `lines` 里的 `{name}` 占位符会在呈现时被玩家名号替换；新增剧情 = 在此追加一条，
 * engine 不需改动（trigger 是只读 GameState 的纯函数）。
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
