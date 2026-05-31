/**
 * NPC 目录 —— 街道上的游客与各手艺店铺关联人物。
 * - tourist（游客）：在街道随机游走，可对话提升好感度；
 * - vendor（关联人物）：驻守某手艺/产业点旁，承载剧情与任务。
 * 好感度机制由 engine 持有（state.npcAffinity），任务见 quests.ts。
 *
 * 数据驱动：新增 NPC = 在此追加一条 NpcDef，场景/引擎不改。
 */
import type { NpcDef } from '../engine/types';

export const NPCS: NpcDef[] = [
  // —— 江南·关联人物 ——
  {
    id: 'jn-bamboo-master',
    name: '篾匠·周伯',
    role: 'vendor',
    regionId: 'jiangnan',
    anchorCraftId: 'bamboo-weaving',
    greetings: [
      '后生，竹丝要劈得细如发，篮子才透气。',
      '这几日游客多，竹编小物卖得俏。',
      '你若肯学，我把祖传的「六角孔」手法传你。',
    ],
  },
  {
    id: 'jn-indigo-keeper',
    name: '染坊·阿蓝',
    role: 'vendor',
    regionId: 'jiangnan',
    anchorCraftId: 'indigo-dyeing',
    greetings: [
      '靛缸要养，急不得，今日的蓝才正。',
      '布要反复入缸、晾晒，蓝才能沉下去。',
      '你手上沾了蓝，是肯下功夫的人。',
    ],
  },
  // —— 游客（通用，落在街市游走）——
  {
    id: 'tourist-scholar',
    name: '游学书生',
    role: 'tourist',
    regionId: 'jiangnan',
    greetings: ['听闻此地手艺精绝，特来一观。', '可有亲手做的物件？我想带些回去。'],
  },
  {
    id: 'tourist-merchant',
    name: '行脚货郎',
    role: 'tourist',
    regionId: 'jiangnan',
    greetings: ['哟，老板的成色不错，下次给我留货。', '走南闯北，还是这街市热闹。'],
  },
  {
    id: 'tourist-lady',
    name: '采买夫人',
    role: 'tourist',
    regionId: 'jiangnan',
    greetings: ['这蓝布颜色真正，给我裁两丈。', '小篮子精巧，拿来装针线最好。'],
  },
];

export const NPC_INDEX: Record<string, NpcDef> = Object.fromEntries(
  NPCS.map((n) => [n.id, n]),
);

/** 取某地区的 NPC（含通用游客）。当前游客均挂在 jiangnan，其余地区仅复用为游客。 */
export function npcsForRegion(regionId: string): NpcDef[] {
  const local = NPCS.filter((n) => n.regionId === regionId);
  if (local.length > 0) return local;
  // 其它地区暂复用江南游客作为路人（保证街市有人气）
  return NPCS.filter((n) => n.role === 'tourist').map((n) => ({ ...n, regionId }));
}
