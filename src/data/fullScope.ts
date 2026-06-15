export type FullScopePriorityTier = 'priority-anchor' | 'priority-skeleton';

export interface FullScopeMinimums {
  npcCount: number;
  activityCount: number;
  craftInteractionCount: number;
  workshopUpgradeCount: number;
  routeCount: number;
  layoutSubregionCount: number;
  loreEntryCount: number;
  orderHookCount: number;
}

export interface FullScopeRegionRequirement {
  regionId: string;
  tier: FullScopePriorityTier;
  m1Group: string;
  chapterGoal: string;
  playPillars: string[];
  targetMinimums: FullScopeMinimums;
  m1Actions: string[];
}

const DEFAULT_MINIMUMS: FullScopeMinimums = {
  npcCount: 3,
  activityCount: 3,
  craftInteractionCount: 1,
  workshopUpgradeCount: 2,
  routeCount: 1,
  layoutSubregionCount: 2,
  loreEntryCount: 2,
  orderHookCount: 1,
};

export const FULL_SCOPE_REGION_REQUIREMENTS: FullScopeRegionRequirement[] = [
  {
    regionId: 'jiangnan',
    tier: 'priority-anchor',
    m1Group: 'jiangnan-bashu',
    chapterGoal: '把百工院、龙泉、金陵灯市、临安茶伞与太湖织埠连成可回访的江南长期样板。',
    playPillars: ['百工院家园', '龙泉剑瓷工艺', '秦淮灯市与文房社交'],
    targetMinimums: { ...DEFAULT_MINIMUMS, layoutSubregionCount: 6, orderHookCount: 2 },
    m1Actions: [
      '补临安茶肆/伞铺雨季回访链',
      '补太湖织埠缂丝/云锦藏客订单差异',
      '让灯市后续单继续读取作品与 NPC 关系',
    ],
  },
  {
    regionId: 'bashu',
    tier: 'priority-anchor',
    m1Group: 'jiangnan-bashu',
    chapterGoal: '把锦里、青神竹海、临邛铁炉与茶马驿合成山路运输和蜀锦竹编章节。',
    playPillars: ['蜀锦/竹编工艺', '茶马驿路线', '山路采料与铁炉'],
    targetMinimums: { ...DEFAULT_MINIMUMS, layoutSubregionCount: 4, orderHookCount: 2 },
    m1Actions: [
      '补临邛铁炉订单回流与铁锭供应读数',
      '把茶马会后续单接到路线声望和马帮 NPC 回访',
      '补蜀锦与青神竹编的章节级订单差异',
    ],
  },
  {
    regionId: 'lingnan',
    tier: 'priority-anchor',
    m1Group: 'lingnan-qiandian',
    chapterGoal: '让珠江商港、莨绸晒场、佛山冶坊与端石坑口形成海贸和晒染章节。',
    playPillars: ['骑楼夜市', '香云纱晒染', '海贸船期与文房货'],
    targetMinimums: { ...DEFAULT_MINIMUMS, layoutSubregionCount: 4, orderHookCount: 2 },
    m1Actions: [
      '补佛山冶坊铁器修造回流到海贸订单',
      '把骑楼夜市后续单接到船期与商港 NPC 回访',
      '补端砚或石湾陶的订单读取作品缺陷',
    ],
  },
  {
    regionId: 'qiandian',
    tier: 'priority-skeleton',
    m1Group: 'lingnan-qiandian',
    chapterGoal: '把苗寨银巷、茶马驿道与东川铜矿推进为银饰、蜡染和高原商路章节。',
    playPillars: ['苗银工艺', '茶马驿道', '东川铜矿采炼'],
    targetMinimums: { ...DEFAULT_MINIMUMS, layoutSubregionCount: 3 },
    m1Actions: [
      '补东川铜矿矿口回访与铜料状态反馈',
      '补苗银礼俗订单和银娘阿岚回访',
      '把茶马驿道与巴蜀/雪域路线事件接通',
    ],
  },
  {
    regionId: 'jingchu',
    tier: 'priority-skeleton',
    m1Group: 'jingchu-ganpo-huizhou',
    chapterGoal: '把江湖渡市、楚漆坊、湘绣楼和铜铁矿场推进为水路修复和漆绣章节。',
    playPillars: ['楚漆修复', '渡口水路', '湘绣与矿冶供料'],
    targetMinimums: { ...DEFAULT_MINIMUMS, layoutSubregionCount: 4 },
    m1Actions: [
      '补大冶矿场铜铁料状态反馈与矿口回访',
      '补楚漆修复订单与水路活动后续',
      '让荆楚路线影响赣鄱/徽州材料流动',
    ],
  },
  {
    regionId: 'ganpo',
    tier: 'priority-anchor',
    m1Group: 'jingchu-ganpo-huizhou',
    chapterGoal: '把窑火瓷镇、高岭矿丘和河运柴场扩成瓷土、窑柴、开窑和瓷行章节。',
    playPillars: ['景德镇瓷', '开窑会', '河运柴场与高岭矿丘'],
    targetMinimums: { ...DEFAULT_MINIMUMS, layoutSubregionCount: 3, orderHookCount: 2 },
    m1Actions: [
      '补河运柴场长线风险与高岭瓷土读数',
      '把开窑会后续单接到瓷行藏客与窑柴风险',
      '补瓷土/釉料来源对作品诊断的读取',
    ],
  },
  {
    regionId: 'huizhou',
    tier: 'priority-skeleton',
    m1Group: 'jingchu-ganpo-huizhou',
    chapterGoal: '把青檀纸谷、墨砚深巷、歙石山坑和徽商会馆连成文房与信用章节。',
    playPillars: ['宣纸/徽墨/歙砚', '徽商信用', '文房荐藏'],
    targetMinimums: DEFAULT_MINIMUMS,
    m1Actions: [
      '把文房荐藏续单接入徽商会馆信用',
      '补宣纸、徽墨、歙砚的订单差异',
      '补商会信用风险分支',
    ],
  },
  {
    regionId: 'jingji',
    tier: 'priority-skeleton',
    m1Group: 'jingji-sanjin-xueyu-xiyu',
    chapterGoal: '把宫造大院、都门市口和官署门房推进为采办、宫造和通行凭证章节。',
    playPillars: ['景泰蓝/花丝宫造', '官署采办', '漕运路线'],
    targetMinimums: DEFAULT_MINIMUMS,
    m1Actions: [
      '补都门市口运行入口',
      '让官署门房采办许可读取地区声望和商誉',
      '补宫造订单的拒收、返修和藏客回访',
    ],
  },
  {
    regionId: 'sanjin',
    tier: 'priority-skeleton',
    m1Group: 'jingji-sanjin-xueyu-xiyu',
    chapterGoal: '把票号古街、煤铁窑塬、推光漆院和清徐醋坊推进为信用与慢工章节。',
    playPillars: ['推光漆器', '票号信用', '煤铁与老陈醋民生'],
    targetMinimums: DEFAULT_MINIMUMS,
    m1Actions: [
      '补煤铁窑塬或清徐醋坊运行入口',
      '把票号信用单接成长线商誉风险',
      '补推光漆藏客回访和失败返修差异',
    ],
  },
  {
    regionId: 'xueyu',
    tier: 'priority-skeleton',
    m1Group: 'jingji-sanjin-xueyu-xiyu',
    chapterGoal: '把唐卡画院、雪山驿口、颜料矿谷和银器帐房推进为高原补给章节。',
    playPillars: ['唐卡绘制', '雪山补给', '矿彩与银器'],
    targetMinimums: DEFAULT_MINIMUMS,
    m1Actions: [
      '补颜料矿谷/银器帐房人物回访与材料状态反馈',
      '让唐卡净室订单继续读取礼法、颜料和缺陷',
      '补雪山驿路护商结果接入供展续单后日谈',
    ],
  },
  {
    regionId: 'xiyu',
    tier: 'priority-anchor',
    m1Group: 'jingji-sanjin-xueyu-xiyu',
    chapterGoal: '把绿洲巴扎、昆仑玉场、驼队驿站和艾德莱斯织坊推进为丝路远行章节。',
    playPillars: ['玉雕', '绿洲巴扎', '驼队远行与艾德莱斯织坊'],
    targetMinimums: { ...DEFAULT_MINIMUMS, layoutSubregionCount: 4, orderHookCount: 2 },
    m1Actions: [
      '补艾德莱斯织坊章节入口',
      '把驼队远行与巴扎后续单接成长线商路风险',
      '补玉作与织坊作品的藏客和订单差异',
    ],
  },
];

export const FULL_SCOPE_REGION_IDS = FULL_SCOPE_REGION_REQUIREMENTS.map((requirement) => requirement.regionId);
