/**
 * NPC 目录 —— 街道上的游客与各手艺店铺关联人物。
 * - tourist（游客）：在街道随机游走，可对话提升好感度；
 * - vendor（关联人物）：驻守某手艺/产业点旁，承载剧情与任务。
 * 好感度机制由 engine 持有（state.npcAffinity），任务见 quests.ts。
 *
 * 数据驱动：新增 NPC = 在此追加一条 NpcDef，场景/引擎不改。
 */
import type { NpcDef } from '../engine/types';
import { PLACEHOLDER_NPCS } from './regionContent';

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
    functions: ['mentor', 'quest', 'spar', 'order'],
    anchorCraftId: 'bamboo-weaving',
    preferences: [
      { label: '细篾匀整的竹器', resourceIds: ['bambooWare', 'qingshenBamboo'], craftIds: ['bamboo-weaving', 'qingshen-bamboo'], minQuality: 0.55, affinityBonus: 6 },
      { label: '竹骨纸伞', resourceIds: ['oilpaperUmbrella'], affinityBonus: 3 },
    ],
    relationshipLines: {
      stranger: ['先别急着叫师傅，篾丝劈不直，话说得再满也无用。'],
      familiar: ['你手上开始有竹性了。竹子不欺人，急躁都写在断口上。'],
      trusted: ['若日后百工院要立竹棚，我愿去给你看第一根柱。'],
      confidant: ['这套六角孔手法，我只教肯慢下来的人。你记好，往后也要教别人。'],
    },
    intel: [
      {
        id: 'intel-zhou-bamboo-yard',
        title: '百工院竹棚',
        body: '竹棚不是装饰，它能扩出晒纸、晾伞和养缸的阴凉位。',
        unlockAffinity: 16,
        topics: ['yard-building', 'bamboo'],
        setFlags: ['zhou-bamboo-yard-advice'],
      },
    ],
    personalDilemma: '年轻人嫌竹编来钱慢，他想证明日用器也有精巧的体面。',
    endingInfluence: '若竹编线被保住，百工院会出现可供学徒练手的竹棚和日用订单。',
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
    functions: ['mentor', 'quest', 'spar', 'collab'],
    anchorCraftId: 'indigo-dyeing',
    preferences: [
      { label: '蓝得沉静的染布', resourceIds: ['indigoCloth', 'batikCloth'], craftIds: ['indigo-dyeing', 'batik'], affinityBonus: 7 },
      { label: '可养缸的靛料', resourceIds: ['indigoVat', 'indigoPlant'], affinityBonus: 4 },
    ],
    relationshipLines: {
      stranger: ['染缸认人。今天你只是路过，靛液不会把最深的蓝给你。'],
      familiar: ['你记得洗手再摸布，这就比许多人强。'],
      trusted: ['若有一日做联作，我替你守缸，你替我把花样带去外地。'],
      confidant: ['蓝不是死色，是一口活缸。你若肯守它，它就肯替你说话。'],
    },
    intel: [
      {
        id: 'intel-alan-living-vat',
        title: '活缸要看天气',
        body: '雨天湿重，靛缸发性慢；晴日反复入缸更容易沉色。',
        unlockAffinity: 16,
        topics: ['weather-crafting', 'indigo'],
        setFlags: ['alan-weather-vat-advice'],
      },
    ],
    personalDilemma: '她担心快染化料挤走植物蓝，却也知道市场不等慢工。',
    endingInfluence: '阿蓝信任玩家后，蓝染会成为江南与黔滇蜡染联动的第一条染色样板。',
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
    functions: ['mentor', 'quest', 'spar', 'appraisal', 'collab', 'homeVisit'],
    schedule: [
      { phase: 'morning', subregionId: 'jiangnan-jinling', note: '乌衣书院讲学' },
      { phase: 'afternoon', subregionId: 'jiangnan-jinling', note: '秦淮灯市题跋' },
      { phase: 'night', subregionId: 'jiangnan-baigongyuan', note: '百工院夜谈' },
    ],
    preferences: [
      { label: '可题跋的雅器', resourceIds: ['treasureSword', 'celadonWare', 'indigoCloth', 'oilpaperUmbrella'], minQuality: 0.7, affinityBonus: 8 },
      { label: '纸墨文房', resourceIds: ['paperSheet', 'inkStick', 'xuanPaper', 'huiInk', 'sheInkstone'], affinityBonus: 5 },
      { label: '已有题跋的作品', descriptorIncludes: ['题', '墨', '文'], minQuality: 0.65, affinityBonus: 4 },
    ],
    relationshipLines: {
      stranger: ['我不是嫌你手粗，是怕你把粗当成诚恳。'],
      familiar: ['你开始懂得看器物了。记住，器物入人间，才算活。'],
      trusted: ['拿来吧，若真有骨气，我替你写两行，不收润笔。'],
      confidant: ['你做器，我写名。若世道只认价格，我们偏要替它留一口气。'],
    },
    intel: [
      {
        id: 'intel-ning-stationery-route',
        title: '纸墨通徽州',
        body: '好纸好墨绕不开徽州。先听纸谷和墨坊，再谈作品题跋。',
        unlockAffinity: 8,
        topics: ['stationery', 'huizhou'],
        routeIds: ['route-jiangnan-huizhou-paper'],
        setFlags: ['ning-mentioned-huizhou-stationery'],
      },
      {
        id: 'intel-ning-masterwork',
        title: '作品要有作者',
        body: '高品质作品应题名、陈列或赠予合适的人，否则只是库存。',
        unlockAffinity: 24,
        topics: ['masterwork', 'inscription'],
        setFlags: ['ning-masterwork-author-advice'],
      },
    ],
    personalDilemma: '他厌恶把风雅当招牌的人，却又明白没有市场，许多雅物活不下去。',
    endingInfluence: '宁辞秋的承认会把玩家从做货的人推向有名有款的匠人。',
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
    functions: ['mentor', 'spar', 'order', 'collab'],
    schedule: [
      { phase: 'morning', subregionId: 'jiangnan-taihu', note: '织埠查线' },
      { phase: 'afternoon', subregionId: 'jiangnan-jinling', note: '云锦局联作' },
    ],
    preferences: [
      { label: '丝线匀净的织物', resourceIds: ['brocade', 'kesiSilk', 'rawSilkThread'], craftIds: ['kesi', 'shu-brocade'], minQuality: 0.6, affinityBonus: 7 },
      { label: '不乱花本的雅玩', descriptorIncludes: ['纹', '细', '雅'], minQuality: 0.65, affinityBonus: 4 },
    ],
    relationshipLines: {
      stranger: ['站远些，织机一乱，半日的经线都要重牵。'],
      familiar: ['你能听出梭声快慢了。下一步，要看得出线色的脾气。'],
      trusted: ['太湖的丝可接蜀锦、艾德莱斯，路若通，花本就会活起来。'],
      confidant: ['我替你守经，你替我走路。织造这件事，本来就不是一个人能完成的。'],
    },
    intel: [
      {
        id: 'intel-shen-silk-network',
        title: '丝路不止在西边',
        body: '江南、巴蜀、岭南、荆楚和西域都要丝，生丝是很多高级订单的共同底料。',
        unlockAffinity: 16,
        topics: ['silk-network', 'supply-chain'],
        setFlags: ['shen-silk-network-advice'],
      },
    ],
    personalDilemma: '她怕云锦只剩展柜里的图案，更怕年轻织手再也听不懂织机。',
    endingInfluence: '沈云梭的联作能让织造线成为跨地区供应链样板。',
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
    functions: ['mentor', 'spar', 'order', 'route', 'escort'],
    schedule: [
      { phase: 'morning', subregionId: 'jiangnan-jinling', note: '金箔作开槌' },
      { phase: 'dusk', subregionId: 'jiangnan-jinling', note: '灯市验货' },
    ],
    preferences: [
      { label: '火候稳的金属器', resourceIds: ['treasureSword', 'cloisonne', 'filigreeOrnament'], minQuality: 0.65, affinityBonus: 7 },
      { label: '宫造可用的精细物', descriptorIncludes: ['稳', '细', '正'], minQuality: 0.7, affinityBonus: 5 },
    ],
    relationshipLines: {
      stranger: ['手重的人别碰金箔。碎了不只赔钱，还赔名声。'],
      familiar: ['你知道慢一点了。金箔薄，人的脸皮有时更薄。'],
      trusted: ['宫造不是富贵梦，是规矩梦。错一分，整批退回。'],
      confidant: ['若你真要北上，我可以替你写一封采办名帖，但别拿粗货丢我的脸。'],
    },
    intel: [
      {
        id: 'intel-gu-palace-orders',
        title: '宫造先看名声',
        body: '京畿采办要商誉和保名，光有手艺不够，还要有人愿意替你担保。',
        unlockAffinity: 24,
        topics: ['palace-orders', 'commerce'],
        routeIds: ['route-jiangnan-jingji-canal'],
        setFlags: ['gu-palace-order-advice'],
      },
    ],
    personalDilemma: '他嘴上只谈规矩，心里却怕金箔手艺被廉价贴金替代。',
    endingInfluence: '顾薄金会把江南作品推向京畿宫造订单，但失败也会放大声誉风险。',
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
    functions: ['quest', 'spar', 'order', 'homeVisit'],
    schedule: [
      { phase: 'dusk', subregionId: 'jiangnan-jinling', note: '秦淮灯市布灯' },
      { phase: 'night', subregionId: 'jiangnan-jinling', note: '夜市收灯' },
    ],
    preferences: [
      { label: '能照人的日用器', resourceIds: ['bambooWare', 'oilpaperUmbrella', 'indigoCloth'], affinityBonus: 5 },
      { label: '有题名的作品', descriptorIncludes: ['名', '题', '心'], minQuality: 0.6, affinityBonus: 4 },
    ],
    relationshipLines: {
      stranger: ['白日看灯，只看骨架；黄昏以后，才看得见人心。'],
      familiar: ['你出的谜面不坏，少些卖弄，多些人情就更好。'],
      trusted: ['灯市可以替百工院招客，但灯下卖的东西要对得起光。'],
      confidant: ['哪天百工院办夜会，我来给你挂第一盏灯。'],
    },
    intel: [
      {
        id: 'intel-qiao-night-fair',
        title: '灯市只认黄昏后',
        body: '秦淮灯市活动在黄昏和夜间才完整开放，白日只能先看骨架。',
        unlockAffinity: 8,
        topics: ['festival-orders', 'time-gate'],
        setFlags: ['qiao-night-fair-advice'],
      },
    ],
    personalDilemma: '她希望灯市热闹，却不愿让灯彩只剩喧哗和一次性买卖。',
    endingInfluence: '乔照夜能让百工院拥有节令夜会和来客参观的入口。',
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
    functions: ['route', 'escort', 'order', 'appraisal'],
    schedule: [
      { phase: 'morning', subregionId: 'jiangnan-linan', note: '江平码头点货' },
      { phase: 'afternoon', subregionId: 'jiangnan-linan', note: '湖港议价' },
    ],
    preferences: [
      { label: '适合外销的成批货', resourceIds: ['indigoCloth', 'bambooWare', 'tea', 'oilpaperUmbrella'], affinityBonus: 5 },
      { label: '高品相样货', minQuality: 0.75, affinityBonus: 5 },
    ],
    relationshipLines: {
      stranger: ['货能做出来是一回事，能平安送到又是另一回事。'],
      familiar: ['你开始会算路费了。做匠人也要知道哪条水路涨价。'],
      trusted: ['徽州纸墨、赣鄱窑柴、京畿采办，江南码头都能先听到风声。'],
      confidant: ['往后你要走大路，我替你看仓单；你替我保货名。'],
    },
    intel: [
      {
        id: 'intel-fang-route-ledger',
        title: '路线要算成本',
        body: '商路不是打通就完事，水路、山路、官路会有不同路资、风险和断供可能。',
        unlockAffinity: 8,
        topics: ['route-risk', 'logistics'],
        routeIds: ['route-jiangnan-huizhou-paper', 'route-jiangnan-ganpo-kiln', 'route-jiangnan-jingji-canal'],
        setFlags: ['fang-route-ledger-advice'],
      },
    ],
    personalDilemma: '他看似只算钱，实际怕玩家重蹈许多匠人“会做不会卖”的覆辙。',
    endingInfluence: '方季衡会把代表作、订单和商路风险连成长期经济线。',
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
    functions: ['mentor', 'spar', 'homeVisit'],
    schedule: [
      { phase: 'dawn', subregionId: 'jiangnan-baigongyuan', note: '菜圃浇水' },
      { phase: 'morning', subregionId: 'jiangnan-baigongyuan', note: '教玩家认苗' },
    ],
    preferences: [
      { label: '田里长出的东西', resourceIds: ['tea', 'teaLeaf', 'indigoPlant', 'cocoonSilk'], affinityBonus: 5 },
      { label: '能在院里用的器物', resourceIds: ['bambooWare', 'oilpaperUmbrella'], affinityBonus: 3 },
    ],
    relationshipLines: {
      stranger: ['你别踩那垄，苗还小，脚印比虫害还吓人。'],
      familiar: ['你记得浇水啦？那我明日教你看茶苗发芽。'],
      trusted: ['百工院不只是工坊，也要有能吃、能晒、能歇脚的地方。'],
      confidant: ['以后你走远路，我替你看院里的苗；你回来时，记得带别处的种法。'],
    },
    intel: [
      {
        id: 'intel-xiaoman-rain-water',
        title: '雨天可省浇水',
        body: '雨天苗不缺水，但连阴会拖慢晾晒和染缸。',
        unlockAffinity: 8,
        topics: ['farming', 'weather'],
        setFlags: ['xiaoman-rain-water-advice'],
      },
    ],
    personalDilemma: '他想证明田圃不是附庸，而是百工院长期生活的底盘。',
    endingInfluence: '小满会让家园从仓库变成有人照料的院子。',
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

export const ALL_NPCS: NpcDef[] = [...NPCS, ...PLACEHOLDER_NPCS];

export const NPC_INDEX: Record<string, NpcDef> = Object.fromEntries(
  ALL_NPCS.map((n) => [n.id, n]),
);

/** 取某地区的 NPC（含通用游客）。当前游客均挂在 jiangnan，其余地区仅复用为游客。 */
export function npcsForRegion(regionId: string): NpcDef[] {
  const local = ALL_NPCS.filter((n) => n.regionId === regionId);
  if (local.length > 0) return local;
  // 其它地区暂复用江南游客作为路人（保证街市有人气）
  return NPCS.filter((n) => n.role === 'tourist').map((n) => {
    const { subregionId, schedule, ...rest } = n;
    void subregionId;
    void schedule;
    return { ...rest, regionId };
  });
}
