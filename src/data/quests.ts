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
  {
    id: 'q-ning-stationery',
    npcId: 'jn-ning-ciqiu',
    title: '辞秋的文房考校',
    desc: '宁辞秋愿意替你的作品题跋，但先要看你是否懂得纸、墨与器物相称。',
    requireAffinity: 16,
    condition: (s) =>
      s.flags.includes('met-ning-poetry') &&
      (s.resources.paperSheet ?? 0) >= 1 &&
      (s.resources.inkStick ?? 0) >= 1,
    cost: { paperSheet: 1, inkStick: 1 },
    reward: {
      coin: 12,
      metrics: { spirit: 3 },
      attributes: { knowledge: 2, mind: 1 },
      flags: ['ning-stationery-ready'],
    },
    completeLog: '宁辞秋展纸试墨，终于收起挑剔神色：文房过关，{name}可带一件真作品来。'
  },
  {
    id: 'q-ning-inscription',
    npcId: 'jn-ning-ciqiu',
    title: '辞秋题跋',
    desc: '带来一件足够成色的代表作，请宁辞秋写下题跋，让作品有名、有作者、有文气。',
    requireAffinity: 24,
    condition: (s) =>
      s.completedQuests.includes('q-ning-stationery') &&
      s.itemInstances.some(
        (item) =>
          item.status !== 'gifted' &&
          item.quality >= 0.7 &&
          ['treasureSword', 'celadonWare', 'indigoCloth', 'oilpaperUmbrella'].includes(item.resourceId),
      ),
    reward: {
      metrics: { spirit: 5, heritage: 2 },
      attributes: { knowledge: 2, people: 1 },
      flags: ['ning-inscribed-masterwork'],
      inscribe: {
        resourceIds: ['treasureSword', 'celadonWare', 'indigoCloth', 'oilpaperUmbrella'],
        minQuality: 0.7,
        collaboratorNpcId: 'jn-ning-ciqiu',
        inscription: '器成于手，名立于心；愿此作入人间而不失其骨。',
      },
    },
    completeLog: '宁辞秋替{name}的作品落款题跋，承认这已不是一件无名货。'
  },
  {
    id: 'q-qiao-lantern-night',
    npcId: 'jn-qiao-zhaoye',
    title: '秦淮一盏夜灯',
    desc: '乔照夜只在黄昏后收灯面。若你真懂灯市，就带着夜里的谜面来交差。',
    requireAffinity: 8,
    condition: (s) => s.flags.includes('seen-qinhuai-lantern'),
    reward: {
      coin: 18,
      metrics: { life: 3, market: 1 },
      attributes: { people: 1, commerce: 1 },
      flags: ['qinhuai-night-order-done'],
    },
    completeLog: '乔照夜把你定下的灯面挂上桥头，秦淮水面亮起一排新灯。'
  },
  {
    id: 'q-longquan-first-sword',
    npcId: 'jn-lu-hanquan',
    title: '陆寒泉验剑',
    desc: '陆寒泉不看空话，只看你能不能按矿、铁、火、刃的次序打出一把龙泉剑。',
    requireAffinity: 16,
    condition: (s) =>
      (s.resources.treasureSword ?? 0) >= 1 &&
      s.itemInstances.some((item) => item.resourceId === 'treasureSword' && item.sourceCraftId === 'longquan-sword'),
    reward: {
      coin: 28,
      metrics: { heritage: 3, spirit: 3 },
      attributes: { craft: 2, stamina: 1 },
      flags: ['longquan-first-sword-approved'],
    },
    completeLog: '陆寒泉听剑出鞘，低声说{name}已经懂得“铁净、火稳、刃正”的第一层。'
  },
];

export const QUEST_INDEX: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.map((q) => [q.id, q]),
);

/** 取某 NPC 发布的任务 */
export function questsForNpc(npcId: string): QuestDef[] {
  return QUESTS.filter((q) => q.npcId === npcId);
}
