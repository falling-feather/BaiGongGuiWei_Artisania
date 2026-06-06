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
    subregionId: 'jiangnan-suhang',
    profession: '竹编师',
    personality: 'steady',
    knowledgeTags: ['bamboo', 'daily-orders'],
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
    subregionId: 'jiangnan-suhang',
    profession: '蓝染师',
    personality: 'patient',
    knowledgeTags: ['indigo', 'dyeing'],
    anchorCraftId: 'indigo-dyeing',
    greetings: [
      '靛缸要养，急不得，今日的蓝才正。',
      '布要反复入缸、晾晒，蓝才能沉下去。',
      '你手上沾了蓝，是肯下功夫的人。',
    ],
  },
  {
    id: 'jn-ning-ciqiu',
    name: '宁辞秋',
    role: 'vendor',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-jinling',
    profession: '文人书法家',
    personality: 'sharp',
    knowledgeTags: ['calligraphy', 'literati', 'stationery'],
    schedule: [
      { phase: 'morning', subregionId: 'jiangnan-jinling', note: '乌衣书院讲学' },
      { phase: 'afternoon', subregionId: 'jiangnan-jinling', note: '秦淮灯市题跋' },
      { phase: 'night', subregionId: 'jiangnan-baigongyuan', note: '百工院夜谈' },
    ],
    greetings: [
      '手上有力，心里未必有墨。你若真想做匠人，先学会看一件器物。',
      '好纸好墨，不只是文人矫情；它们也是手艺人的骨气。',
      '器物要入人间。只守旧法而不问人用，也是一种懒。',
    ],
  },
  {
    id: 'jn-shen-yunsuo',
    name: '沈云梭',
    role: 'vendor',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-taihu',
    profession: '织造师',
    personality: 'precise',
    knowledgeTags: ['silk', 'brocade', 'loom'],
    schedule: [
      { phase: 'morning', subregionId: 'jiangnan-taihu', note: '织埠查线' },
      { phase: 'afternoon', subregionId: 'jiangnan-jinling', note: '云锦局联作' },
    ],
    greetings: [
      '织机不怕慢，怕的是心乱。一寸错，满幅都要还债。',
      '生丝的来路要记清，太湖的风会留在纹样里。',
    ],
  },
  {
    id: 'jn-gu-bojin',
    name: '顾薄金',
    role: 'vendor',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-jinling',
    profession: '金箔匠',
    personality: 'demanding',
    knowledgeTags: ['gold-leaf', 'metalwork', 'palace-orders'],
    schedule: [
      { phase: 'morning', subregionId: 'jiangnan-jinling', note: '金箔作开槌' },
      { phase: 'dusk', subregionId: 'jiangnan-jinling', note: '灯市验货' },
    ],
    greetings: [
      '金薄如蝉翼，手重一分就碎，心浮一分也碎。',
      '宫造订单听着风光，错一锤就是赔本。',
    ],
  },
  {
    id: 'jn-qiao-zhaoye',
    name: '乔照夜',
    role: 'vendor',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-jinling',
    profession: '灯彩匠',
    personality: 'warm',
    knowledgeTags: ['lantern-fair', 'festival-orders'],
    schedule: [
      { phase: 'dusk', subregionId: 'jiangnan-jinling', note: '秦淮灯市布灯' },
      { phase: 'night', subregionId: 'jiangnan-jinling', note: '夜市收灯' },
    ],
    greetings: [
      '灯要照人，不是只照自己好看。',
      '黄昏以后再来，灯市才肯说真话。',
    ],
  },
  {
    id: 'jn-fang-jiheng',
    name: '方季衡',
    role: 'vendor',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-linan',
    profession: '码头商人',
    personality: 'practical',
    knowledgeTags: ['logistics', 'trade-route', 'consignment'],
    schedule: [
      { phase: 'morning', subregionId: 'jiangnan-linan', note: '江平码头点货' },
      { phase: 'afternoon', subregionId: 'jiangnan-linan', note: '湖港议价' },
    ],
    greetings: [
      '货走水路，价钱就活了。可水路也认人情和信用。',
      '你若想走方，先学会把一件货平安送到。',
    ],
  },
  {
    id: 'jn-xiaoman',
    name: '小满',
    role: 'tourist',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-baigongyuan',
    profession: '菜圃少年',
    personality: 'bright',
    knowledgeTags: ['farming', 'solar-term', 'yard'],
    schedule: [
      { phase: 'dawn', subregionId: 'jiangnan-baigongyuan', note: '菜圃浇水' },
      { phase: 'morning', subregionId: 'jiangnan-baigongyuan', note: '教玩家认苗' },
    ],
    greetings: [
      '早些浇水，苗才不蔫。靛草、桑、茶，各有脾气。',
      '田小也能养人，关键是天天记得来看看。',
    ],
  },
  // —— 游客（通用，落在街市游走）——
  {
    id: 'tourist-scholar',
    name: '游学书生',
    role: 'tourist',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-suhang',
    profession: '游学者',
    knowledgeTags: ['rumor'],
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
  return NPCS.filter((n) => n.role === 'tourist').map((n) => {
    const { subregionId, schedule, ...rest } = n;
    void subregionId;
    void schedule;
    return { ...rest, regionId };
  });
}
