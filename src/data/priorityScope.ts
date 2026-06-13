export type PriorityScopeTier = 'anchor' | 'skeleton';

export interface PriorityRegionRequirement {
  regionId: string;
  tier: PriorityScopeTier;
  requiredCraftIds: string[];
  requiredActivityIds: string[];
  requiredNpcIds: string[];
  requiredLayoutSubregionIds: string[];
  requiredLoreEntryIds: string[];
}

export const PRIORITY_SCOPE_REQUIREMENTS: PriorityRegionRequirement[] = [
  {
    regionId: 'jiangnan',
    tier: 'anchor',
    requiredCraftIds: ['longquan-sword', 'celadon', 'oilpaper-umbrella', 'kesi'],
    requiredActivityIds: ['jn-qinhuai-lantern'],
    requiredNpcIds: ['jn-ning-ciqiu', 'jn-ye-qingzhan', 'jn-qiao-zhaoye'],
    requiredLayoutSubregionIds: ['jiangnan-longquan'],
    requiredLoreEntryIds: ['region-jiangnan-water-market', 'subregion-jiangnan-longquan', 'craft-longquan-sword-temper'],
  },
  {
    regionId: 'bashu',
    tier: 'anchor',
    requiredCraftIds: ['shu-brocade'],
    requiredActivityIds: ['bs-tea-horse-post'],
    requiredNpcIds: ['bs-zhuo-jinniang', 'bs-mabang-ayue'],
    requiredLayoutSubregionIds: ['bashu-bamboo-sea'],
    requiredLoreEntryIds: ['region-bashu-bamboo-sea', 'subregion-bashu-bamboo-sea', 'route-tea-horse-ledger'],
  },
  {
    regionId: 'lingnan',
    tier: 'anchor',
    requiredCraftIds: ['gambiered-silk'],
    requiredActivityIds: ['ln-qilou-night-market'],
    requiredNpcIds: ['ln-he-yunsha', 'ln-wu-haichao'],
    requiredLayoutSubregionIds: ['lingnan-gambiered-yard'],
    requiredLoreEntryIds: [
      'region-lingnan-gambiered-yard',
      'subregion-lingnan-gambiered-yard',
      'craft-gambiered-silk-weather',
    ],
  },
  {
    regionId: 'ganpo',
    tier: 'anchor',
    requiredCraftIds: ['jingdezhen-porcelain'],
    requiredActivityIds: ['gp-kiln-opening-fair'],
    requiredNpcIds: ['gp-wen-yaotou', 'gp-lan-yousheng'],
    requiredLayoutSubregionIds: ['ganpo-kiln-town'],
    requiredLoreEntryIds: ['region-ganpo-kiln-town', 'subregion-ganpo-kiln-town', 'craft-kiln-grading'],
  },
  {
    regionId: 'xiyu',
    tier: 'anchor',
    requiredCraftIds: ['jade-carving'],
    requiredActivityIds: ['xiyu-bazaar-trade'],
    requiredNpcIds: ['xu-a-yue', 'xu-tuoling-shu'],
    requiredLayoutSubregionIds: ['xiyu-jade-yard'],
    requiredLoreEntryIds: ['region-xiyu-jade-yard', 'subregion-xiyu-jade-yard', 'craft-jade-material-ethics'],
  },
  {
    regionId: 'qiandian',
    tier: 'skeleton',
    requiredCraftIds: ['miao-silver'],
    requiredActivityIds: ['qd-tea-horse-road'],
    requiredNpcIds: ['qd-yinniang-alan'],
    requiredLayoutSubregionIds: ['qiandian-miao-village'],
    requiredLoreEntryIds: ['region-qiandian-miao-village', 'subregion-qiandian-miao-village'],
  },
  {
    regionId: 'jingchu',
    tier: 'skeleton',
    requiredCraftIds: ['chu-lacquer'],
    requiredActivityIds: ['jc-ferry-market'],
    requiredNpcIds: ['jc-xiong-zhuxi'],
    requiredLayoutSubregionIds: ['jingchu-chu-lacquer'],
    requiredLoreEntryIds: ['region-jingchu-chu-lacquer', 'subregion-jingchu-chu-lacquer'],
  },
  {
    regionId: 'huizhou',
    tier: 'skeleton',
    requiredCraftIds: ['xuan-paper'],
    requiredActivityIds: ['hz-merchant-hall'],
    requiredNpcIds: ['hz-wang-zhiniang'],
    requiredLayoutSubregionIds: ['huizhou-paper-valley'],
    requiredLoreEntryIds: ['region-huizhou-paper-valley', 'subregion-huizhou-paper-valley'],
  },
  {
    regionId: 'jingji',
    tier: 'skeleton',
    requiredCraftIds: ['cloisonne'],
    requiredActivityIds: ['jj-official-gate'],
    requiredNpcIds: ['jj-lan-daqi'],
    requiredLayoutSubregionIds: ['jingji-palace-yard'],
    requiredLoreEntryIds: ['region-jingji-palace-yard', 'subregion-jingji-palace-yard'],
  },
  {
    regionId: 'sanjin',
    tier: 'skeleton',
    requiredCraftIds: ['pingyao-lacquer'],
    requiredActivityIds: ['sj-piaohao'],
    requiredNpcIds: ['sj-pingyao-qipo'],
    requiredLayoutSubregionIds: ['sanjin-lacquer-yard'],
    requiredLoreEntryIds: ['region-sanjin-lacquer-yard', 'subregion-sanjin-lacquer-yard'],
  },
  {
    regionId: 'xueyu',
    tier: 'skeleton',
    requiredCraftIds: ['thangka'],
    requiredActivityIds: ['xy-thangka-court'],
    requiredNpcIds: ['xy-losang'],
    requiredLayoutSubregionIds: ['xueyu-thangka-court'],
    requiredLoreEntryIds: ['region-xueyu-thangka-court', 'subregion-xueyu-thangka-court'],
  },
];

export const PRIORITY_ANCHOR_REGION_IDS = PRIORITY_SCOPE_REQUIREMENTS.filter(
  (region) => region.tier === 'anchor',
).map((region) => region.regionId);

export const PRIORITY_SKELETON_REGION_IDS = PRIORITY_SCOPE_REQUIREMENTS.filter(
  (region) => region.tier === 'skeleton',
).map((region) => region.regionId);

export const PRIORITY_SCOPE_REGION_IDS = PRIORITY_SCOPE_REQUIREMENTS.map((region) => region.regionId);
