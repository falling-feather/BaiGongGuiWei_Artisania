import {
  DEV_NAME,
  createCalendar,
  createInitialState,
  type GameContent,
  type GameState,
  type ResourcePool,
  type TimePhase,
} from '../engine';

export interface PrioritySmokeScenario {
  id: string;
  label: string;
  node: 'N1' | 'N2';
  regionId: string;
  subregionId: string;
  activityId: string;
  producedCraftIds: string[];
  priorCompletedActivityIds: string[];
  phases: TimePhase[];
  localCraftId?: string;
  localNpcId?: string;
  localQuestId?: string;
  loreEntryId?: string;
  requiredActivityId?: string;
  requiredQuestId?: string;
  strategies?: Array<string | undefined>;
  closingChoiceId?: string;
  postActivityId?: string;
  postActivitySubregionId?: string;
  postActivityFlag?: string;
}

export const PRIORITY_SMOKE_SCENARIOS = {
  jiangnan: {
    id: 'jiangnan',
    label: 'N1 Jiangnan Qinhuai',
    node: 'N1',
    regionId: 'jiangnan',
    subregionId: 'jiangnan-jinling',
    activityId: 'jn-qinhuai-lantern',
    producedCraftIds: ['longquan-sword'],
    priorCompletedActivityIds: [],
    phases: ['dusk', 'dusk', 'night'],
    closingChoiceId: 'archive-riddle-ledger',
  },
  bashu: {
    id: 'bashu',
    label: 'N1 Bashu Tea Horse',
    node: 'N1',
    regionId: 'bashu',
    subregionId: 'bashu-tea-horse',
    activityId: 'bs-tea-horse-post',
    producedCraftIds: ['longquan-sword', 'shu-brocade'],
    priorCompletedActivityIds: ['jn-qinhuai-lantern'],
    phases: ['morning', 'afternoon', 'dusk'],
    strategies: ['load-ledger-table', 'border-tea-contract', 'snow-pass-account'],
    closingChoiceId: 'archive-load-ledger',
  },
  lingnan: {
    id: 'lingnan',
    label: 'N1 Lingnan Qilou',
    node: 'N1',
    regionId: 'lingnan',
    subregionId: 'lingnan-harbor',
    activityId: 'ln-qilou-night-market',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk'],
    priorCompletedActivityIds: ['jn-qinhuai-lantern', 'bs-tea-horse-post'],
    phases: ['dusk', 'night', 'dusk'],
    strategies: ['ship-date-ledger-table', 'rain-awning-supper', 'wenfang-cargo-ledger'],
    closingChoiceId: 'archive-ship-date-ledger',
  },
  ganpo: {
    id: 'ganpo',
    label: 'N1 Ganpo Kiln Fair',
    node: 'N1',
    regionId: 'ganpo',
    subregionId: 'ganpo-kiln-town',
    activityId: 'gp-kiln-opening-fair',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk', 'jingdezhen-porcelain'],
    priorCompletedActivityIds: ['jn-qinhuai-lantern', 'bs-tea-horse-post', 'ln-qilou-night-market'],
    phases: ['afternoon', 'dusk', 'night'],
    strategies: ['fire-color-ranking', undefined, undefined],
    closingChoiceId: 'archive-fire-color-ledger',
  },
  xiyu: {
    id: 'xiyu',
    label: 'N1 Xiyu Bazaar',
    node: 'N1',
    regionId: 'xiyu',
    subregionId: 'xiyu-bazaar',
    activityId: 'xiyu-bazaar-trade',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk', 'jingdezhen-porcelain', 'jade-carving'],
    priorCompletedActivityIds: [
      'jn-qinhuai-lantern',
      'bs-tea-horse-post',
      'ln-qilou-night-market',
      'gp-kiln-opening-fair',
    ],
    phases: ['dusk', 'dusk', 'dusk'],
    strategies: ['connoisseur-rare-table', undefined, undefined],
    closingChoiceId: 'seal-barter-contract',
    postActivityId: 'xiyu-caravan-post',
    postActivitySubregionId: 'xiyu-caravan-post',
    postActivityFlag: 'caravan-route-known',
  },
  'xiyu-caravan': {
    id: 'xiyu-caravan',
    label: 'N1 Xiyu Caravan Post',
    node: 'N1',
    regionId: 'xiyu',
    subregionId: 'xiyu-caravan-post',
    activityId: 'xiyu-caravan-post',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk', 'jingdezhen-porcelain', 'jade-carving'],
    priorCompletedActivityIds: [
      'jn-qinhuai-lantern',
      'bs-tea-horse-post',
      'ln-qilou-night-market',
      'gp-kiln-opening-fair',
      'xiyu-bazaar-trade',
    ],
    phases: ['dusk'],
    postActivityFlag: 'caravan-route-known',
  },
  qiandian: {
    id: 'qiandian',
    label: 'N2 Qiandian Skeleton',
    node: 'N2',
    regionId: 'qiandian',
    subregionId: 'qiandian-miao-village',
    activityId: 'qd-miao-silver-shop',
    producedCraftIds: [],
    priorCompletedActivityIds: [],
    phases: ['morning'],
    localCraftId: 'miao-silver',
    localNpcId: 'qd-yinniang-alan',
    localQuestId: 'q-qiandian-silver-etiquette',
    loreEntryId: 'region-qiandian-miao-village',
    requiredActivityId: 'qd-tea-horse-road',
    requiredQuestId: 'q-qiandian-tea-road-contact',
  },
  jingchu: {
    id: 'jingchu',
    label: 'N2 Jingchu Skeleton',
    node: 'N2',
    regionId: 'jingchu',
    subregionId: 'jingchu-chu-lacquer',
    activityId: 'jc-chu-lacquer-yard',
    producedCraftIds: [],
    priorCompletedActivityIds: [],
    phases: ['morning'],
    localCraftId: 'chu-lacquer',
    localNpcId: 'jc-xiong-zhuxi',
    loreEntryId: 'region-jingchu-chu-lacquer',
    requiredActivityId: 'jc-ferry-market',
    requiredQuestId: 'q-jingchu-water-ledger',
  },
  huizhou: {
    id: 'huizhou',
    label: 'N2 Huizhou Skeleton',
    node: 'N2',
    regionId: 'huizhou',
    subregionId: 'huizhou-paper-valley',
    activityId: 'hz-paper-valley',
    producedCraftIds: [],
    priorCompletedActivityIds: [],
    phases: ['morning'],
    localCraftId: 'xuan-paper',
    localNpcId: 'hz-wang-zhiniang',
    localQuestId: 'q-huizhou-paper-ink-pledge',
    loreEntryId: 'region-huizhou-paper-valley',
    requiredActivityId: 'hz-merchant-hall',
  },
  jingji: {
    id: 'jingji',
    label: 'N2 Jingji Skeleton',
    node: 'N2',
    regionId: 'jingji',
    subregionId: 'jingji-palace-yard',
    activityId: 'jj-cloisonne-yard',
    producedCraftIds: [],
    priorCompletedActivityIds: [],
    phases: ['morning'],
    localCraftId: 'cloisonne',
    localNpcId: 'jj-lan-daqi',
    localQuestId: 'q-jingji-cloisonne-sample',
    loreEntryId: 'region-jingji-palace-yard',
    requiredActivityId: 'jj-official-gate',
    requiredQuestId: 'q-jingji-official-nameproof',
  },
  sanjin: {
    id: 'sanjin',
    label: 'N2 Sanjin Skeleton',
    node: 'N2',
    regionId: 'sanjin',
    subregionId: 'sanjin-lacquer-yard',
    activityId: 'sj-pingyao-lacquer',
    producedCraftIds: [],
    priorCompletedActivityIds: [],
    phases: ['morning'],
    localCraftId: 'pingyao-lacquer',
    localNpcId: 'sj-pingyao-qipo',
    loreEntryId: 'region-sanjin-lacquer-yard',
    requiredActivityId: 'sj-piaohao',
    requiredQuestId: 'q-sanjin-piaohao-credit',
  },
  xueyu: {
    id: 'xueyu',
    label: 'N2 Xueyu Skeleton',
    node: 'N2',
    regionId: 'xueyu',
    subregionId: 'xueyu-thangka-court',
    activityId: 'xy-thangka-court',
    producedCraftIds: [],
    priorCompletedActivityIds: [],
    phases: ['morning'],
    localCraftId: 'thangka',
    localNpcId: 'xy-losang',
    loreEntryId: 'region-xueyu-thangka-court',
    requiredActivityId: 'xy-thangka-court',
  },
} satisfies Record<string, PrioritySmokeScenario>;

export type PrioritySmokeScenarioId = keyof typeof PRIORITY_SMOKE_SCENARIOS;

export const PRIORITY_SMOKE_SCENARIO_IDS = Object.keys(
  PRIORITY_SMOKE_SCENARIOS,
) as PrioritySmokeScenarioId[];

export const PRIORITY_STALL_SMOKE_SCENARIO_IDS = PRIORITY_SMOKE_SCENARIO_IDS.filter((scenarioId) => {
  const scenario: PrioritySmokeScenario = PRIORITY_SMOKE_SCENARIOS[scenarioId];
  return Boolean(scenario.closingChoiceId);
});

export const PRIORITY_SKELETON_SMOKE_SCENARIO_IDS = PRIORITY_SMOKE_SCENARIO_IDS.filter((scenarioId) => {
  const scenario: PrioritySmokeScenario = PRIORITY_SMOKE_SCENARIOS[scenarioId];
  return scenario.node === 'N2';
});

export function prioritySmokeScenarioById(id: string): PrioritySmokeScenario | null {
  return PRIORITY_SMOKE_SCENARIOS[id as PrioritySmokeScenarioId] ?? null;
}

function activityById(content: GameContent, activityId: string) {
  return (content.activities ?? []).find((activity) => activity.id === activityId) ?? null;
}

function allRouteIds(content: GameContent): string[] {
  return [
    ...new Set((content.regionContent ?? []).flatMap((region) => region.routes.map((route) => route.id))),
  ];
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

function buildSmokeResources(content: GameContent): ResourcePool {
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
    addResource(resources, activity.reward.generatedOrder?.resourceId, 12);
  }

  return resources;
}

function priorFlags(activityIds: string[]): string[] {
  return activityIds.flatMap((activityId) => [
    `stall-chain-completed:${activityId}`,
    `stall-closing-resolved:${activityId}`,
  ]);
}

export function buildPrioritySmokeState(content: GameContent, scenarioId: string): GameState | null {
  const scenario = prioritySmokeScenarioById(scenarioId);
  if (!scenario || !activityById(content, scenario.activityId)) return null;

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
  const regionReputation = Object.fromEntries(regionIds.map((regionId) => [regionId, 30]));
  const npcAffinity = Object.fromEntries((content.npcs ?? []).map((npc) => [npc.id, 24]));
  const routeStability = Object.fromEntries(routeIds.map((routeId) => [routeId, 30]));

  return {
    ...base,
    seed: 20260614,
    currentRegion: scenario.regionId,
    currentSubregion: scenario.subregionId,
    unlockedRegions: regionIds,
    calendar: createCalendar(1, scenario.phases[0] ?? 'dusk'),
    resources: buildSmokeResources(content),
    crafts: base.crafts.map((craft) =>
      scenario.producedCraftIds.includes(craft.craftId)
        ? { ...craft, produced: Math.max(1, craft.produced) }
        : craft,
    ),
    pendingEvent: null,
    pendingEscortCrisis: null,
    pendingSupplyCrisis: null,
    pendingActivityStallClosing: null,
    completedActivities: [...scenario.priorCompletedActivityIds],
    seenStory: (content.story ?? []).map((story) => story.id),
    flags: [...new Set([...priorFlags(scenario.priorCompletedActivityIds)])],
    profile: {
      ...base.profile,
      attributes,
      attributeXp: attributes,
    },
    regionReputation: {
      ...regionReputation,
      [scenario.regionId]: 36,
    },
    routeStability,
    npcAffinity,
    log: [`N1 smoke scenario loaded: ${scenario.label}`],
    playerName: DEV_NAME,
    devMode: true,
  };
}
