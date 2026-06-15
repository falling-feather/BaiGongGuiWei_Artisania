import {
  DEV_NAME,
  createCalendar,
  createInitialState,
  type GameContent,
  type GameState,
  type ResourcePool,
  type TimePhase,
} from '../engine';

export interface RegionChapterSmokeScenario {
  id: string;
  label: string;
  chapterId: string;
  regionId: string;
  subregionId: string;
  activityId: string;
  craftId: string;
  npcId: string;
  routeId: string;
  routeLandingSubregionId: string;
  phase: TimePhase;
  loreEntryId?: string;
  priorCompletedActivityIds?: string[];
  priorProducedCraftIds?: string[];
}

export interface RegionChapterSmokeStateOptions {
  subregionId?: string;
}

export const REGION_CHAPTER_SMOKE_SCENARIOS = {
  'chapter-jiangnan-baigong-homecoming': {
    id: 'chapter-jiangnan-baigong-homecoming',
    label: 'M1 Jiangnan chapter smoke',
    chapterId: 'chapter-jiangnan-baigong-homecoming',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-jinling',
    activityId: 'jn-qinhuai-lantern',
    craftId: 'longquan-sword',
    npcId: 'jn-fang-jiheng',
    routeId: 'route-jiangnan-huizhou-paper',
    routeLandingSubregionId: 'jiangnan-suhang',
    phase: 'dusk',
    priorProducedCraftIds: ['longquan-sword'],
  },
  'chapter-bashu-tea-horse-brocade': {
    id: 'chapter-bashu-tea-horse-brocade',
    label: 'M1 Bashu chapter smoke',
    chapterId: 'chapter-bashu-tea-horse-brocade',
    regionId: 'bashu',
    subregionId: 'bashu-tea-horse',
    activityId: 'bs-tea-horse-post',
    craftId: 'shu-brocade',
    npcId: 'bs-mabang-ayue',
    routeId: 'route-bashu-qiandian-tea-horse',
    routeLandingSubregionId: 'bashu-tea-horse',
    phase: 'morning',
    priorCompletedActivityIds: ['jn-qinhuai-lantern'],
    priorProducedCraftIds: ['longquan-sword'],
  },
  'chapter-lingnan-harbor-gambiered': {
    id: 'chapter-lingnan-harbor-gambiered',
    label: 'M1 Lingnan chapter smoke',
    chapterId: 'chapter-lingnan-harbor-gambiered',
    regionId: 'lingnan',
    subregionId: 'lingnan-harbor',
    activityId: 'ln-qilou-night-market',
    craftId: 'gambiered-silk',
    npcId: 'ln-wu-haichao',
    routeId: 'route-qiandian-lingnan-harbor',
    routeLandingSubregionId: 'lingnan-harbor',
    phase: 'dusk',
    priorCompletedActivityIds: ['jn-qinhuai-lantern', 'bs-tea-horse-post'],
    priorProducedCraftIds: ['longquan-sword', 'shu-brocade'],
  },
  'chapter-qiandian-silver-tea-road': {
    id: 'chapter-qiandian-silver-tea-road',
    label: 'M1 Qiandian chapter smoke',
    chapterId: 'chapter-qiandian-silver-tea-road',
    regionId: 'qiandian',
    subregionId: 'qiandian-tea-road',
    activityId: 'qd-tea-horse-road',
    craftId: 'miao-silver',
    npcId: 'qd-mu-luozi',
    routeId: 'route-bashu-qiandian-tea-horse',
    routeLandingSubregionId: 'qiandian-tea-road',
    phase: 'morning',
  },
  'chapter-jingchu-ferry-lacquer': {
    id: 'chapter-jingchu-ferry-lacquer',
    label: 'M1 Jingchu chapter smoke',
    chapterId: 'chapter-jingchu-ferry-lacquer',
    regionId: 'jingchu',
    subregionId: 'jingchu-lake-market',
    activityId: 'jc-ferry-market',
    craftId: 'chu-lacquer',
    npcId: 'jc-qinglu',
    routeId: 'route-jingchu-ganpo-lake',
    routeLandingSubregionId: 'jingchu-lake-market',
    phase: 'morning',
  },
  'chapter-ganpo-kiln-firewood': {
    id: 'chapter-ganpo-kiln-firewood',
    label: 'M1 Ganpo chapter smoke',
    chapterId: 'chapter-ganpo-kiln-firewood',
    regionId: 'ganpo',
    subregionId: 'ganpo-kiln-town',
    activityId: 'gp-kiln-opening-fair',
    craftId: 'jingdezhen-porcelain',
    npcId: 'gp-wen-yaotou',
    routeId: 'route-jiangnan-ganpo-kiln',
    routeLandingSubregionId: 'ganpo-kiln-town',
    phase: 'afternoon',
    priorCompletedActivityIds: ['jn-qinhuai-lantern', 'bs-tea-horse-post', 'ln-qilou-night-market'],
    priorProducedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk'],
  },
  'chapter-huizhou-paper-merchant': {
    id: 'chapter-huizhou-paper-merchant',
    label: 'M1 Huizhou chapter smoke',
    chapterId: 'chapter-huizhou-paper-merchant',
    regionId: 'huizhou',
    subregionId: 'huizhou-merchant-hall',
    activityId: 'hz-merchant-hall',
    craftId: 'xuan-paper',
    npcId: 'hz-cheng-yuanzhou',
    routeId: 'route-ganpo-huizhou-merchant',
    routeLandingSubregionId: 'huizhou-merchant-hall',
    phase: 'morning',
  },
  'chapter-jingji-palace-procurement': {
    id: 'chapter-jingji-palace-procurement',
    label: 'M1 Jingji chapter smoke',
    chapterId: 'chapter-jingji-palace-procurement',
    regionId: 'jingji',
    subregionId: 'jingji-official-gate',
    activityId: 'jj-official-gate',
    craftId: 'cloisonne',
    npcId: 'jj-song-yasi',
    routeId: 'route-jiangnan-jingji-canal',
    routeLandingSubregionId: 'jingji-official-gate',
    phase: 'morning',
  },
  'chapter-sanjin-piaohao-lacquer': {
    id: 'chapter-sanjin-piaohao-lacquer',
    label: 'M1 Sanjin chapter smoke',
    chapterId: 'chapter-sanjin-piaohao-lacquer',
    regionId: 'sanjin',
    subregionId: 'sanjin-piaohao',
    activityId: 'sj-piaohao',
    craftId: 'pingyao-lacquer',
    npcId: 'sj-lei-zhanggui',
    routeId: 'route-jingji-sanjin-official',
    routeLandingSubregionId: 'sanjin-piaohao',
    phase: 'morning',
  },
  'chapter-xueyu-thangka-snowpass': {
    id: 'chapter-xueyu-thangka-snowpass',
    label: 'M1 Xueyu chapter smoke',
    chapterId: 'chapter-xueyu-thangka-snowpass',
    regionId: 'xueyu',
    subregionId: 'xueyu-snow-pass',
    activityId: 'xy-snow-pass',
    craftId: 'thangka',
    npcId: 'xy-yak-captain',
    routeId: 'route-bashu-xueyu-snow-pass',
    routeLandingSubregionId: 'xueyu-snow-pass',
    phase: 'morning',
  },
  'chapter-xiyu-bazaar-caravan': {
    id: 'chapter-xiyu-bazaar-caravan',
    label: 'M1 Xiyu chapter smoke',
    chapterId: 'chapter-xiyu-bazaar-caravan',
    regionId: 'xiyu',
    subregionId: 'xiyu-caravan-post',
    activityId: 'xiyu-caravan-post',
    craftId: 'jade-carving',
    npcId: 'xu-sali',
    routeId: 'route-xueyu-xiyu-caravan',
    routeLandingSubregionId: 'xiyu-caravan-post',
    phase: 'dusk',
    priorCompletedActivityIds: ['xiyu-bazaar-trade'],
    priorProducedCraftIds: ['jade-carving'],
  },
} satisfies Record<string, RegionChapterSmokeScenario>;

export type RegionChapterSmokeScenarioId = keyof typeof REGION_CHAPTER_SMOKE_SCENARIOS;

export const REGION_CHAPTER_SMOKE_SCENARIO_IDS = Object.keys(
  REGION_CHAPTER_SMOKE_SCENARIOS,
) as RegionChapterSmokeScenarioId[];

export function regionChapterSmokeScenarioById(id: string): RegionChapterSmokeScenario | null {
  return REGION_CHAPTER_SMOKE_SCENARIOS[id as RegionChapterSmokeScenarioId] ?? null;
}

function allRouteIds(content: GameContent): string[] {
  return [...new Set((content.regionContent ?? []).flatMap((region) => region.routes.map((route) => route.id)))];
}

function addResource(pool: ResourcePool, resourceId: string | undefined, amount: number) {
  if (!resourceId) return;
  pool[resourceId] = Math.max(pool[resourceId] ?? 0, amount);
}

function addResourceCost(pool: ResourcePool, cost: ResourcePool | undefined, padding = 12) {
  for (const [resourceId, amount] of Object.entries(cost ?? {})) {
    addResource(pool, resourceId, Math.max(amount + padding, padding));
  }
}

function buildChapterSmokeResources(content: GameContent): ResourcePool {
  const resources: ResourcePool = {
    coin: 9999,
    labor: 99,
  };

  for (const resource of content.resources ?? []) addResource(resources, resource.id, 12);
  for (const craft of content.crafts) {
    addResource(resources, craft.outputResourceId, 12);
    for (const step of craft.processChain) addResourceCost(resources, step.resourceCost);
  }
  for (const activity of content.activities ?? []) {
    addResourceCost(resources, activity.resourceCost);
    addResourceCost(resources, activity.reward.resources);
    addResource(resources, activity.reward.generatedOrder?.resourceId, 12);
    for (const stockResourceId of activity.reward.stall?.stockResourceIds ?? []) {
      addResource(resources, stockResourceId, 12);
    }
    for (const combo of activity.reward.stall?.combos ?? []) {
      for (const resourceId of combo.resourceIds) addResource(resources, resourceId, 12);
    }
    for (const choice of activity.reward.stall?.closingChoices ?? []) {
      addResourceCost(resources, choice.resourceCost);
      addResourceCost(resources, choice.resources);
      addResource(resources, choice.followUpOrder?.resourceId, 12);
    }
  }

  return resources;
}

function priorFlags(activityIds: readonly string[]): string[] {
  return activityIds.flatMap((activityId) => [
    `stall-chain-completed:${activityId}`,
    `stall-closing-resolved:${activityId}`,
  ]);
}

function smokeStartSubregionId(
  content: GameContent,
  scenario: RegionChapterSmokeScenario,
  requestedSubregionId?: string,
): string {
  if (!requestedSubregionId) return scenario.subregionId;
  const region = (content.regions ?? []).find((entry) => entry.id === scenario.regionId);
  return region?.subregions.some((subregion) => subregion.id === requestedSubregionId)
    ? requestedSubregionId
    : scenario.subregionId;
}

export function buildRegionChapterSmokeState(
  content: GameContent,
  scenarioId: string,
  options: RegionChapterSmokeStateOptions = {},
): GameState | null {
  const scenario = regionChapterSmokeScenarioById(scenarioId);
  const activity = (content.activities ?? []).find((item) => item.id === scenario?.activityId);
  if (!scenario || !activity) return null;
  const startSubregionId = smokeStartSubregionId(content, scenario, options.subregionId);

  const base = createInitialState(
    content.crafts,
    content.apprentices,
    20260614,
    undefined,
    content.regions ?? [],
    DEV_NAME,
  );
  const regionIds = (content.regions ?? []).map((region) => region.id);
  const routeIds = allRouteIds(content);
  const attributes = Object.fromEntries(
    Object.keys(base.profile.attributes).map((key) => [key, 72]),
  ) as GameState['profile']['attributes'];
  const regionReputation = Object.fromEntries(regionIds.map((regionId) => [regionId, 32]));
  const npcAffinity = Object.fromEntries((content.npcs ?? []).map((npc) => [npc.id, 24]));
  const routeStability = Object.fromEntries(routeIds.map((routeId) => [routeId, 36]));
  const producedCraftIds = new Set([...(scenario.priorProducedCraftIds ?? [])]);
  const priorCompletedActivityIds = scenario.priorCompletedActivityIds ?? [];

  return {
    ...base,
    seed: 20260614,
    currentRegion: scenario.regionId,
    currentSubregion: startSubregionId,
    unlockedRegions: regionIds,
    calendar: createCalendar(1, scenario.phase),
    resources: buildChapterSmokeResources(content),
    crafts: base.crafts.map((craft) =>
      producedCraftIds.has(craft.craftId) ? { ...craft, produced: Math.max(1, craft.produced) } : craft,
    ),
    pendingEvent: null,
    pendingEscortCrisis: null,
    pendingSupplyCrisis: null,
    pendingActivityStallClosing: null,
    completedActivities: [...priorCompletedActivityIds],
    seenStory: (content.story ?? []).map((story) => story.id),
    flags: [
      ...new Set([
        `chapter-smoke:${scenario.id}`,
        `route-known:${scenario.routeId}`,
        ...priorFlags(priorCompletedActivityIds),
      ]),
    ],
    profile: {
      ...base.profile,
      attributes,
      attributeXp: attributes,
    },
    regionReputation: {
      ...regionReputation,
      [scenario.regionId]: 42,
    },
    routeStability: {
      ...routeStability,
      [scenario.routeId]: 68,
    },
    npcAffinity: {
      ...npcAffinity,
      [scenario.npcId]: 36,
    },
    trackedLoreEntryId: scenario.loreEntryId ?? `subregion-${startSubregionId}`,
    log: [`M1 chapter smoke scenario loaded: ${scenario.label}`],
    playerName: DEV_NAME,
    devMode: true,
  };
}
