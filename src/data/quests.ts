/**
 * 任务目录 —— 由关联人物（vendor）发布，达到好感门槛且满足条件即可交付领赏。
 * condition 为纯函数（只读 GameState），保证可单测、可重放。
 *
 * 数据驱动：新增任务 = 在此追加一条 QuestDef。
 */
import type { QuestDef } from '../engine/types';

export const QUESTS: QuestDef[] = [
  {
    id: 'q-bamboo-basket',
    npcId: 'jn-bamboo-master',
    title: '周伯的竹篮',
    desc: '与篾匠周伯熟络后，他想请你亲手做出一件竹器，看看你的手艺。',
    requireAffinity: 16,
    condition: (s) => (s.resources.bambooWare ?? 0) >= 1,
    reward: { coin: 30, metrics: { spirit: 4, life: 2 } },
    completeLog: '把亲手编的竹器交给周伯，他眯眼端详良久，点头收下，{name}的手艺得了认可。',
  },
  {
    id: 'q-indigo-cloth',
    npcId: 'jn-indigo-keeper',
    title: '阿蓝的一匹布',
    desc: '阿蓝信任你后，托你染出一匹真正沉得下色的蓝布。',
    requireAffinity: 16,
    condition: (s) => (s.resources.indigoCloth ?? 0) >= 1,
    reward: { coin: 30, metrics: { heritage: 4, market: 2 } },
    completeLog: '阿蓝抚过你染的蓝布，赞它「蓝得正」，把祖传的养缸口诀讲与{name}听。',
  },
];

export const QUEST_INDEX: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.map((q) => [q.id, q]),
);

/** 取某 NPC 发布的任务 */
export function questsForNpc(npcId: string): QuestDef[] {
  return QUESTS.filter((q) => q.npcId === npcId);
}
