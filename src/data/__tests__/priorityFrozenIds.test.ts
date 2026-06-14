import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_CHALLENGES,
  ACTIVITY_INDEX,
  ALL_NPCS,
  COLLAB_RECIPES,
  CRAFTS,
  CRAFT_INTERACTION_INDEX,
  HOME_VISITS,
  LORE_ENTRY_INDEX,
  PRIORITY_ANCHOR_REGION_IDS,
  PRIORITY_SCOPE_REGION_IDS,
  PRIORITY_SKELETON_REGION_IDS,
  REGION_ROUTES,
  REGIONS,
  RUNTIME_MAP_LAYOUTS,
} from '..';

const FROZEN_ANCHOR_REGION_IDS = ['jiangnan', 'bashu', 'lingnan', 'ganpo', 'xiyu'];
const FROZEN_SKELETON_REGION_IDS = ['qiandian', 'jingchu', 'huizhou', 'jingji', 'sanjin', 'xueyu'];

const FROZEN_SUBREGION_IDS = [
  'jiangnan-suhang',
  'jiangnan-longquan',
  'jiangnan-jinling',
  'jiangnan-baigongyuan',
  'bashu-bamboo-sea',
  'bashu-jinli',
  'bashu-tea-horse',
  'lingnan-gambiered-yard',
  'lingnan-harbor',
  'ganpo-kaolin-hill',
  'ganpo-kiln-town',
  'ganpo-river-wood',
  'xiyu-jade-yard',
  'xiyu-bazaar',
  'xiyu-caravan-post',
  'qiandian-miao-village',
  'jingchu-chu-lacquer',
  'huizhou-paper-valley',
  'jingji-palace-yard',
  'sanjin-lacquer-yard',
  'xueyu-thangka-court',
  'xueyu-snow-pass',
];

const FROZEN_CRAFT_IDS = [
  'longquan-sword',
  'celadon',
  'oilpaper-umbrella',
  'kesi',
  'shu-brocade',
  'qingshen-bamboo',
  'gambiered-silk',
  'jingdezhen-porcelain',
  'jade-carving',
  'miao-silver',
  'chu-lacquer',
  'xuan-paper',
  'cloisonne',
  'pingyao-lacquer',
  'thangka',
];

const FROZEN_ACTIVITY_IDS = [
  'jn-qinhuai-lantern',
  'bs-tea-horse-post',
  'ln-qilou-night-market',
  'gp-kiln-opening-fair',
  'xiyu-bazaar-trade',
  'xiyu-caravan-post',
  'qd-tea-horse-road',
  'jc-ferry-market',
  'hz-merchant-hall',
  'jj-official-gate',
  'sj-piaohao',
  'xy-thangka-court',
  'xy-snow-pass',
];

const FROZEN_NPC_IDS = [
  'jn-ning-ciqiu',
  'jn-ye-qingzhan',
  'jn-qiao-zhaoye',
  'bs-luo-qingmie',
  'bs-zhuo-jinniang',
  'bs-mabang-ayue',
  'ln-he-yunsha',
  'ln-wu-haichao',
  'gp-wen-yaotou',
  'gp-lan-yousheng',
  'xu-a-yue',
  'xu-sali',
  'xu-tuoling-shu',
  'qd-yinniang-alan',
  'qd-mu-luozi',
  'qd-danqing-sao',
  'jc-xiong-zhuxi',
  'hz-wang-zhiniang',
  'jj-lan-daqi',
  'sj-pingyao-qipo',
  'xy-losang',
  'xy-yak-captain',
];

const FROZEN_ROUTE_IDS = [
  'route-jiangnan-huizhou-paper',
  'route-jiangnan-ganpo-kiln',
  'route-jiangnan-jingji-canal',
  'route-bashu-qiandian-tea-horse',
  'route-bashu-jingchu-river',
  'route-bashu-xueyu-snow-pass',
  'route-qiandian-lingnan-harbor',
  'route-qiandian-jingchu-mine',
  'route-jingchu-ganpo-lake',
  'route-ganpo-huizhou-merchant',
  'route-jingji-sanjin-official',
  'route-xueyu-xiyu-caravan',
];

const FROZEN_HOME_VISIT_IDS = [
  'homevisit-alan-silver-ritual-case',
  'homevisit-alan-tea-road-client-return',
  'homevisit-losang-thangka-hall',
  'homevisit-losang-patron-return',
];

const FROZEN_COLLAB_RECIPE_IDS = ['collab-alan-silver-ritual-fit', 'collab-losang-mineral-layer'];

const FROZEN_LAYOUT_SUBREGION_IDS = [
  'jiangnan-longquan',
  'jiangnan-jinling',
  'bashu-bamboo-sea',
  'bashu-jinli',
  'bashu-tea-horse',
  'lingnan-gambiered-yard',
  'lingnan-harbor',
  'ganpo-kiln-town',
  'xiyu-jade-yard',
  'xiyu-bazaar',
  'xiyu-caravan-post',
  'qiandian-miao-village',
  'jingchu-chu-lacquer',
  'huizhou-paper-valley',
  'jingji-palace-yard',
  'sanjin-lacquer-yard',
  'xueyu-thangka-court',
];

function expectFrozenIds(
  label: string,
  frozenIds: readonly string[],
  existingIds: ReadonlySet<string>,
): void {
  const missing = frozenIds.filter((id) => !existingIds.has(id));
  expect(missing, `${label} missing frozen IDs`).toEqual([]);
}

describe('current priority frozen ids', () => {
  const regionIds = new Set(REGIONS.map((region) => region.id));
  const subregionIds = new Set(REGIONS.flatMap((region) => region.subregions.map((subregion) => subregion.id)));
  const craftIds = new Set(CRAFTS.map((craft) => craft.id));
  const activityIds = new Set(Object.keys(ACTIVITY_INDEX));
  const challengedActivityIds = new Set(ACTIVITY_CHALLENGES.map((challenge) => challenge.activityId));
  const npcIds = new Set(ALL_NPCS.map((npc) => npc.id));
  const routeIds = new Set(REGION_ROUTES.map((route) => route.id));
  const homeVisitIds = new Set(HOME_VISITS.map((visit) => visit.id));
  const collabRecipeIds = new Set(COLLAB_RECIPES.map((recipe) => recipe.id));
  const layoutSubregionIds = new Set(RUNTIME_MAP_LAYOUTS.map((layout) => layout.subregionId));

  it('keeps the current-priority region partition frozen', () => {
    expect(PRIORITY_ANCHOR_REGION_IDS).toEqual(FROZEN_ANCHOR_REGION_IDS);
    expect(PRIORITY_SKELETON_REGION_IDS).toEqual(FROZEN_SKELETON_REGION_IDS);
    expect(PRIORITY_SCOPE_REGION_IDS).toEqual([...FROZEN_ANCHOR_REGION_IDS, ...FROZEN_SKELETON_REGION_IDS]);
  });

  it('keeps frozen gameplay ids present and cross-indexed', () => {
    expectFrozenIds('regions', [...FROZEN_ANCHOR_REGION_IDS, ...FROZEN_SKELETON_REGION_IDS], regionIds);
    expectFrozenIds('subregions', FROZEN_SUBREGION_IDS, subregionIds);
    expectFrozenIds('crafts', FROZEN_CRAFT_IDS, craftIds);
    expectFrozenIds('activities', FROZEN_ACTIVITY_IDS, activityIds);
    expectFrozenIds('npcs', FROZEN_NPC_IDS, npcIds);
    expectFrozenIds('routes', FROZEN_ROUTE_IDS, routeIds);
    expectFrozenIds('home visits', FROZEN_HOME_VISIT_IDS, homeVisitIds);
    expectFrozenIds('collab recipes', FROZEN_COLLAB_RECIPE_IDS, collabRecipeIds);
    expectFrozenIds('layouts', FROZEN_LAYOUT_SUBREGION_IDS, layoutSubregionIds);

    const craftsWithoutInteractions = FROZEN_CRAFT_IDS.filter((craftId) => !CRAFT_INTERACTION_INDEX[craftId]);
    expect(craftsWithoutInteractions, 'frozen crafts without interaction design').toEqual([]);

    const activitiesWithoutChallenges = FROZEN_ACTIVITY_IDS.filter((activityId) => !challengedActivityIds.has(activityId));
    expect(activitiesWithoutChallenges, 'frozen activities without challenge definitions').toEqual([]);
  });

  it('keeps frozen subregions backed by Baigongzhi lore cards', () => {
    const missingLoreCards = FROZEN_SUBREGION_IDS.filter((subregionId) => !LORE_ENTRY_INDEX[`subregion-${subregionId}`]);

    expect(missingLoreCards).toEqual([]);
  });
});
