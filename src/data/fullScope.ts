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
    m1Actions: [],
  },
  {
    regionId: 'bashu',
    tier: 'priority-anchor',
    m1Group: 'jiangnan-bashu',
    chapterGoal: '把锦里、青神竹海、临邛铁炉与茶马驿合成山路运输和蜀锦竹编章节。',
    playPillars: ['蜀锦/竹编工艺', '茶马驿路线', '山路采料与铁炉'],
    targetMinimums: { ...DEFAULT_MINIMUMS, layoutSubregionCount: 4, orderHookCount: 2 },
    m1Actions: [
      'M3：扩展蜀锦、青神竹编与临邛铁料的多轮价格、天气损耗和城镇生活事件',
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
      'M3：扩展珠江海贸多轮压船期、天气改期和文房/铁器外销价格波动',
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
      'M3：扩展银染茶马会到更多港口样客、天气与多轮价格',
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
      'M3：扩展荆楚水路价格、湿气损耗和赣鄱/徽州材料联动',
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
      'M3：扩展高岭土、釉料、河运柴场的多轮价格和窑期统计',
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
      'M3：扩展徽商会馆多轮授信、违约与文房套单价格',
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
      'M3：扩展多轮漕运复验统计、拒收返修与采办价格波动',
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
      'M3：扩展多轮本金/利钱统计到长线经济',
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
      'M3：扩展雪口供给、矿彩价格与银器耐寒损耗',
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
      'M3：扩展巴扎多轮估价、驼队补给损耗和织物远行订单价格',
    ],
  },
];

export const FULL_SCOPE_REGION_IDS = FULL_SCOPE_REGION_REQUIREMENTS.map((requirement) => requirement.regionId);
