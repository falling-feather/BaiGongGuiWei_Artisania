import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { CRAFT_INTERACTIONS } from '../../data/craftInteractions';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { LORE_ENTRIES } from '../../data/loreEntries';
import { ALL_NPCS } from '../../data/npcs';
import { PRIORITY_JOURNEY_STEPS } from '../../data/priorityJourney';
import { PRIORITY_SCOPE_REGION_IDS, PRIORITY_SCOPE_REQUIREMENTS } from '../../data/priorityScope';
import { QUESTS } from '../../data/quests';
import { REGION_ACTIVITIES, REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { SUBREGION_CONTENT } from '../../data/subregionContent';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';
import {
  buildPriorityJourneyGuide,
  createInitialState,
  gameReducer,
  orderDeliveryIssue,
  routeStabilityOf,
  uniqueRoutesFromRegions,
  type ActiveOrder,
  type ActivityDef,
  type Craft,
  type GameContent,
  type GameState,
  type ItemInstance,
  type ResourcePool,
  type RouteSpec,
  type TimePhase,
  type WorkshopUpgradeRecord,
} from '../';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
  quests: QUESTS,
  activities: REGION_ACTIVITIES,
  regionContent: REGION_CONTENT,
  subregionContent: SUBREGION_CONTENT,
  craftInteractions: CRAFT_INTERACTIONS,
  workshopUpgrades: WORKSHOP_UPGRADES,
  itemDescriptorRules: ITEM_DESCRIPTOR_RULES,
  loreEntries: LORE_ENTRIES,
};

const quietContent: GameContent = { ...content, events: [] };
const routes = uniqueRoutesFromRegions(REGION_CONTENT);
const regionById = new Map(REGIONS.map((region) => [region.id, region]));

interface MainlineStressPlan {
  stepId: string;
  expectedNextStepId?: string;
  regionId: string;
  craftId: string;
  craftSubregionId: string;
  activityId: string;
  activitySubregionId: string;
  expectedNpcId: string;
  closingChoiceId: string;
  phases: TimePhase[];
  strategies?: Array<string | undefined>;
  postActivityId?: string;
  postActivitySubregionId?: string;
  postActivityFlag?: string;
}

const MAINLINE_STRESS_PLANS: MainlineStressPlan[] = [
  {
    stepId: 'journey-jiangnan',
    expectedNextStepId: 'journey-bashu',
    regionId: 'jiangnan',
    craftId: 'longquan-sword',
    craftSubregionId: 'jiangnan-longquan',
    activityId: 'jn-qinhuai-lantern',
    activitySubregionId: 'jiangnan-jinling',
    expectedNpcId: 'jn-qiao-zhaoye',
    closingChoiceId: 'archive-riddle-ledger',
    phases: ['dusk', 'dusk', 'night'],
  },
  {
    stepId: 'journey-bashu',
    expectedNextStepId: 'journey-lingnan',
    regionId: 'bashu',
    craftId: 'shu-brocade',
    craftSubregionId: 'bashu-jinli',
    activityId: 'bs-tea-horse-post',
    activitySubregionId: 'bashu-tea-horse',
    expectedNpcId: 'bs-mabang-ayue',
    closingChoiceId: 'archive-load-ledger',
    phases: ['morning', 'afternoon', 'dusk'],
    strategies: ['load-ledger-table', 'border-tea-contract', 'snow-pass-account'],
  },
  {
    stepId: 'journey-lingnan',
    expectedNextStepId: 'journey-ganpo',
    regionId: 'lingnan',
    craftId: 'gambiered-silk',
    craftSubregionId: 'lingnan-gambiered-yard',
    activityId: 'ln-qilou-night-market',
    activitySubregionId: 'lingnan-harbor',
    expectedNpcId: 'ln-wu-haichao',
    closingChoiceId: 'archive-ship-date-ledger',
    phases: ['dusk', 'night', 'dusk'],
    strategies: ['ship-date-ledger-table', 'rain-awning-supper', 'wenfang-cargo-ledger'],
  },
  {
    stepId: 'journey-ganpo',
    expectedNextStepId: 'journey-xiyu',
    regionId: 'ganpo',
    craftId: 'jingdezhen-porcelain',
    craftSubregionId: 'ganpo-kiln-town',
    activityId: 'gp-kiln-opening-fair',
    activitySubregionId: 'ganpo-kiln-town',
    expectedNpcId: 'gp-wen-yaotou',
    closingChoiceId: 'archive-fire-color-ledger',
    phases: ['afternoon', 'dusk', 'night'],
    strategies: ['fire-color-ranking', undefined, undefined],
  },
  {
    stepId: 'journey-xiyu',
    regionId: 'xiyu',
    craftId: 'jade-carving',
    craftSubregionId: 'xiyu-jade-yard',
    activityId: 'xiyu-bazaar-trade',
    activitySubregionId: 'xiyu-bazaar',
    expectedNpcId: 'xu-sali',
    closingChoiceId: 'seal-barter-contract',
    phases: ['dusk', 'dusk', 'dusk'],
    strategies: ['connoisseur-rare-table', undefined, undefined],
    postActivityId: 'xiyu-caravan-post',
    postActivitySubregionId: 'xiyu-caravan-post',
    postActivityFlag: 'caravan-route-known',
  },
];

const CONTINUED_ROUTE_TARGETS = [
  'ganpo',
  'huizhou',
  'jingji',
  'sanjin',
  'jingchu',
  'bashu',
  'qiandian',
  'lingnan',
  'xueyu',
  'xiyu',
];

function freshState(): GameState {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);
}

function guideFor(state: GameState) {
  return buildPriorityJourneyGuide(state, PRIORITY_JOURNEY_STEPS, LORE_ENTRIES, REGIONS, routes);
}

function firstSubregion(regionId: string): string {
  return regionById.get(regionId)?.subregions[0]?.id ?? regionId;
}

function placeAt(state: GameState, regionId: string, subregionId: string): GameState {
  return {
    ...state,
    currentRegion: regionId,
    currentSubregion: subregionId,
    unlockedRegions: [...new Set([...state.unlockedRegions, regionId])],
  };
}

function addResources(state: GameState, resources: ResourcePool): GameState {
  return {
    ...state,
    resources: Object.entries(resources).reduce(
      (next, [resourceId, amount]) => ({
        ...next,
        [resourceId]: Math.max(next[resourceId] ?? 0, amount),
      }),
      { ...state.resources },
    ),
  };
}

function craftDef(craftId: string): Craft {
  const craft = content.crafts.find((item) => item.id === craftId);
  if (!craft) throw new Error(`Missing craft ${craftId}`);
  return craft;
}

function activityDef(activityId: string): ActivityDef {
  const activity = (content.activities ?? []).find((item) => item.id === activityId);
  if (!activity) throw new Error(`Missing activity ${activityId}`);
  return activity;
}

function craftInputs(craftId: string): ResourcePool {
  const resources: ResourcePool = { coin: 999, labor: 99 };
  for (const step of craftDef(craftId).processChain) {
    for (const [resourceId, amount] of Object.entries(step.resourceCost)) {
      resources[resourceId] = Math.max(resources[resourceId] ?? 0, amount + 5);
    }
  }
  return resources;
}

function activityInputs(activity: ActivityDef): ResourcePool {
  const resources: ResourcePool = { coin: 999, labor: 99 };
  for (const [resourceId, amount] of Object.entries(activity.resourceCost ?? {})) {
    resources[resourceId] = Math.max(resources[resourceId] ?? 0, amount + 5);
  }
  for (const resourceId of activity.reward.stall?.stockResourceIds ?? []) {
    resources[resourceId] = Math.max(resources[resourceId] ?? 0, 5);
  }
  for (const combo of activity.reward.stall?.combos ?? []) {
    for (const resourceId of combo.resourceIds) {
      resources[resourceId] = Math.max(resources[resourceId] ?? 0, 5);
    }
  }
  return resources;
}

function runCraftSample(state: GameState, plan: MainlineStressPlan): GameState {
  const beforeProduced = state.crafts.find((craft) => craft.craftId === plan.craftId)?.produced ?? 0;
  const ready = addResources(placeAt(state, plan.regionId, plan.craftSubregionId), craftInputs(plan.craftId));
  const next = gameReducer(ready, { type: 'RUN_PROCESS', craftId: plan.craftId, skipStepIds: [] }, content);
  const afterProduced = next.crafts.find((craft) => craft.craftId === plan.craftId)?.produced ?? 0;

  expect(afterProduced, plan.craftId).toBe(beforeProduced + 1);
  return next;
}

function runActivityChain(state: GameState, plan: MainlineStressPlan): GameState {
  const activity = activityDef(plan.activityId);
  let next = placeAt(state, plan.regionId, plan.activitySubregionId);
  const ordersBefore = next.activeOrders.length;

  for (const [index, phase] of plan.phases.entries()) {
    next = addResources(
      {
        ...next,
        currentRegion: plan.regionId,
        currentSubregion: plan.activitySubregionId,
        calendar: { ...next.calendar, day: index + 1, phase },
      },
      activityInputs(activity),
    );
    next = gameReducer(
      next,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: plan.activityId,
        quality: 0.9,
        stallStrategyId: plan.strategies?.[index],
      },
      content,
    );
    expect(next.nightMarketStallRecords[0]?.activityId, plan.activityId).toBe(plan.activityId);
  }

  expect(next.flags, plan.activityId).toContain(`stall-chain-completed:${plan.activityId}`);
  expect(next.pendingActivityStallClosing?.activityId, plan.activityId).toBe(plan.activityId);

  next = addResources(next, { coin: 999, labor: 99 });
  next = gameReducer(next, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: plan.closingChoiceId }, content);

  expect(next.pendingActivityStallClosing, plan.activityId).toBeNull();
  expect(next.flags, plan.activityId).toContain(`stall-closing-resolved:${plan.activityId}`);
  expect(next.activeOrders.length, plan.activityId).toBeGreaterThan(ordersBefore);
  expect(next.activeOrders).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceActivityId: plan.activityId,
        npcId: plan.expectedNpcId,
        status: 'active',
      }),
    ]),
  );
  return next;
}

function runActivityOnce(
  state: GameState,
  regionId: string,
  subregionId: string,
  activityId: string,
  expectedFlag?: string,
): GameState {
  const activity = activityDef(activityId);
  const ready = addResources(placeAt(state, regionId, subregionId), activityInputs(activity));
  const next = gameReducer(ready, { type: 'PERFORM_ACTIVITY', activityId, quality: 0.9 }, content);

  expect(next.completedActivities, activityId).toContain(activityId);
  if (expectedFlag) expect(next.flags, activityId).toContain(expectedFlag);
  return next;
}

function candidateUnlockRoutes(state: GameState, targetRegionId: string): RouteSpec[] {
  return routes.filter((route) => {
    const forward = route.toRegionId === targetRegionId && state.unlockedRegions.includes(route.fromRegionId);
    const reverse = route.fromRegionId === targetRegionId && state.unlockedRegions.includes(route.toRegionId);
    return forward || reverse;
  });
}

function forgeDefectiveSword(): { state: GameState; sword: ItemInstance } {
  let state = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
  state = { ...state, resources: { ...state.resources, ironOre: 2, coal: 4, labor: 20 } };
  state = gameReducer(state, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
  state = gameReducer(state, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: ['longquan-sword-prep'] }, content);
  const sword = state.itemInstances.find((item) => item.resourceId === 'treasureSword');
  if (!sword) throw new Error('Missing defective sword sample');
  return { state, sword };
}

function reportReadyPriorityState(): GameState {
  const base = freshState();
  const allRequiredNpcIds = [...new Set(PRIORITY_SCOPE_REQUIREMENTS.flatMap((entry) => entry.requiredNpcIds))];

  return {
    ...base,
    turn: base.maxTurns,
    currentRegion: 'jiangnan',
    currentSubregion: 'jiangnan-baigongyuan',
    unlockedRegions: PRIORITY_SCOPE_REGION_IDS,
    regionReputation: Object.fromEntries(PRIORITY_SCOPE_REGION_IDS.map((regionId) => [regionId, 86])),
    npcAffinity: Object.fromEntries(allRequiredNpcIds.map((npcId) => [npcId, 72])),
    pendingEvent: null,
    pendingEscortCrisis: null,
    pendingSupplyCrisis: null,
    pendingActivityStallClosing: null,
  };
}

function stressWorkshopUpgrades(): WorkshopUpgradeRecord[] {
  return [
    {
      id: 'upgrade-longquan-quench-trough',
      craftId: 'longquan-sword',
      title: 'Longquan quench trough',
      kind: 'tool',
      tier: 1,
      day: 1,
      phase: 'morning',
    },
    {
      id: 'upgrade-longquan-trial-ledger',
      craftId: 'longquan-sword',
      title: 'Longquan trial ledger',
      kind: 'brand',
      tier: 2,
      day: 1,
      phase: 'morning',
    },
  ];
}

function resolvePressureIfNeeded(state: GameState): GameState {
  if (!state.pendingSupplyCrisis) return state;
  const crisis = state.pendingSupplyCrisis;
  const choiceId =
    (state.resources.coin ?? 0) >= crisis.coinCost
      ? 'buy-relief'
      : (state.resources.labor ?? 0) >= crisis.laborCost
        ? 'send-workers'
        : 'accept-shortage';
  let next = gameReducer(state, { type: 'RESOLVE_SUPPLY_CRISIS', choiceId }, quietContent);
  const unsettledRecord = next.supplyCrisisRecords.find((record) => record.status !== 'closed');
  if (unsettledRecord && (next.resources.labor ?? 0) >= 2) {
    next = gameReducer(next, { type: 'STABILIZE_SUPPLY_ROUTE', recordId: unsettledRecord.id }, quietContent);
  }
  return next;
}

describe('N5 pre-ship stress coverage', () => {
  it('runs a fresh save through the shortest scoped mainline and leaves no modal blockers', () => {
    let state = freshState();

    for (const plan of MAINLINE_STRESS_PLANS) {
      expect(guideFor(state)?.step?.id, plan.stepId).toBe(plan.stepId);

      state = runCraftSample(state, plan);
      expect(guideFor(state)?.milestone?.activityId, plan.activityId).toBe(plan.activityId);

      state = runActivityChain(state, plan);

      if (plan.postActivityId && plan.postActivitySubregionId) {
        expect(guideFor(state)?.milestone?.activityId, plan.postActivityId).toBe(plan.postActivityId);
        state = runActivityOnce(
          state,
          plan.regionId,
          plan.postActivitySubregionId,
          plan.postActivityId,
          plan.postActivityFlag,
        );
      } else if (plan.expectedNextStepId) {
        expect(guideFor(state)?.step?.id, plan.expectedNextStepId).toBe(plan.expectedNextStepId);
      }
    }

    expect(guideFor(state)?.status).toBe('complete');
    expect(state.pendingEvent).toBeNull();
    expect(state.pendingEscortCrisis).toBeNull();
    expect(state.pendingSupplyCrisis).toBeNull();
    expect(state.pendingActivityStallClosing).toBeNull();
    expect(state.activeOrders.some((order) => order.sourceActivityId)).toBe(true);
  });

  it('unlocks and travels a continued save across the current-priority route graph', () => {
    let state: GameState = {
      ...freshState(),
      resources: { ...freshState().resources, coin: 999, labor: 99 },
      flags: ['heard-snow-pass'],
      profile: {
        ...freshState().profile,
        attributes: { ...freshState().profile.attributes, commerce: 12 },
      },
      pendingEvent: null,
    };

    for (const targetRegionId of CONTINUED_ROUTE_TARGETS) {
      const routeCandidates = candidateUnlockRoutes(state, targetRegionId);
      expect(routeCandidates.length, targetRegionId).toBeGreaterThan(0);
      const stabilityBefore = new Map(
        routeCandidates.map((route) => [route.id, routeStabilityOf(state, route.id)]),
      );
      const coinBefore = state.resources.coin ?? 0;

      state = gameReducer(state, { type: 'UNLOCK_REGION', regionId: targetRegionId }, content);

      expect(state.unlockedRegions, targetRegionId).toContain(targetRegionId);
      expect(state.resources.coin ?? 0, targetRegionId).toBeLessThan(coinBefore);
      expect(
        routeCandidates.some((route) => routeStabilityOf(state, route.id) > (stabilityBefore.get(route.id) ?? 0)),
        targetRegionId,
      ).toBe(true);

      state = gameReducer(state, { type: 'TRAVEL', regionId: targetRegionId }, content);
      expect(state.currentRegion, targetRegionId).toBe(targetRegionId);
      expect(state.currentSubregion, targetRegionId).toBe(firstSubregion(targetRegionId));
    }

    expect(new Set(state.unlockedRegions)).toEqual(new Set(PRIORITY_SCOPE_REGION_IDS));
  });

  it('turns each mainline three-stage activity closing into a deliverable follow-up order', () => {
    for (const plan of MAINLINE_STRESS_PLANS) {
      let state = runActivityChain(freshState(), plan);
      const order = state.activeOrders.find(
        (entry) => entry.sourceActivityId === plan.activityId && entry.status === 'active',
      );
      expect(order, plan.activityId).toBeTruthy();
      if (!order) continue;

      const ready = {
        ...state,
        resources: { ...state.resources, [order.resourceId]: order.quantity },
      };
      const coinBefore = ready.resources.coin ?? 0;
      state = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: order.id }, content);

      expect(state.activeOrders.find((entry) => entry.id === order.id)?.status, plan.activityId).toBe('completed');
      expect(state.resources.coin ?? 0, plan.activityId).toBe(coinBefore + order.rewardCoin);
      expect(state.flags, plan.activityId).toContain(`activity-order-completed:${plan.activityId}`);
    }
  });

  it('keeps the defect, repair, NPC appraisal and order-delivery loop runnable', () => {
    let { state, sword } = forgeDefectiveSword();
    state = { ...state, npcAffinity: { ...state.npcAffinity, 'jn-ning-ciqiu': 20 } };
    state = gameReducer(
      state,
      { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'appraisal', itemId: sword.id },
      content,
    );
    sword = state.itemInstances.find((item) => item.id === sword.id)!;

    expect(state.flags).toContain('appraised-defective-item');
    expect(state.flags).toContain('npc-appraisal-defect:sword-brittle-core');

    const polishedButFlawed: ItemInstance = { ...sword, quality: 0.76 };
    const order: ActiveOrder = {
      id: 'n5-flawed-sword-order',
      npcId: 'jn-ning-ciqiu',
      regionId: 'jiangnan',
      title: 'N5 flawed sword acceptance',
      desc: 'Requires repair before delivery.',
      resourceId: 'treasureSword',
      quantity: 1,
      minQuality: 0.7,
      rewardCoin: 60,
      orderKind: 'credit',
      createdDay: state.calendar.day,
      status: 'active',
    };
    state = {
      ...state,
      resources: { ...state.resources, treasureSword: 1, coal: 4, labor: 20 },
      itemInstances: state.itemInstances.map((item) => (item.id === sword.id ? polishedButFlawed : item)),
      activeOrders: [order],
    };

    expect(orderDeliveryIssue(state, order, content)).toBeTruthy();
    const blocked = gameReducer(state, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((entry) => entry.id === order.id)?.status).toBe('active');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: sword.id,
        defectId: 'sword-brittle-core',
        repairOptionId: 'sword-temper-again',
      },
      content,
    );
    expect(orderDeliveryIssue(repaired, order, content)).toBeNull();

    const delivered = gameReducer(repaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((entry) => entry.id === order.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
    expect(delivered.flags).toContain('item-defect-repaired:sword-brittle-core');
  });

  it('builds one ending report that reads all five anchor and six skeleton regions', () => {
    const ended = gameReducer(reportReadyPriorityState(), { type: 'END_TURN' }, quietContent);
    const regionalOutcomes = ended.report?.regionalOutcomes ?? [];

    expect(ended.status).toBe('ended');
    expect(regionalOutcomes.length).toBe(PRIORITY_SCOPE_REGION_IDS.length);
    for (const regionId of PRIORITY_SCOPE_REGION_IDS) {
      const region = regionById.get(regionId);
      expect(region?.ending?.pillar, regionId).toBeTruthy();
      expect(regionalOutcomes.some((line) => region && line.includes(region.name)), regionId).toBe(true);
      expect(regionalOutcomes.some((line) => region?.ending && line.includes(region.ending.pillar)), regionId).toBe(true);
    }
    expect(ended.report?.relationshipOutcomes?.length ?? 0).toBeGreaterThan(0);
  });

  it('survives a long-run economy pass across inventory, coin, reputation, labor and upkeep pressure', () => {
    let state: GameState = {
      ...freshState(),
      seed: 67,
      unlockedRegions: ['jiangnan', 'ganpo', 'huizhou', 'jingchu', 'xueyu', 'xiyu'],
      regionReputation: { jiangnan: 18, ganpo: 12, huizhou: 10, jingchu: 8, xueyu: 0, xiyu: 0 },
      routeStability: {
        'route-jiangnan-ganpo-kiln': 14,
        'route-ganpo-huizhou-merchant': 16,
        'route-jingchu-ganpo-lake': 12,
        'route-xueyu-xiyu-caravan': 15,
      },
      resources: { ...freshState().resources, coin: 64, labor: 8, goldOre: 2, ironIngot: 2, coal: 2 },
      workshopUpgrades: stressWorkshopUpgrades(),
      pendingEvent: null,
      pendingSupplyCrisis: null,
    };

    for (let i = 0; i < 6; i += 1) {
      state = gameReducer(state, { type: 'END_TURN' }, quietContent);
      state = resolvePressureIfNeeded(state);
      state = { ...state, pendingEvent: null };

      expect(state.status, `turn-${i}`).toBe('playing');
      expect(state.resources.coin ?? 0, `turn-${i}:coin`).toBeGreaterThanOrEqual(0);
      expect(state.resources.labor ?? 0, `turn-${i}:labor`).toBeGreaterThanOrEqual(0);
      for (const routeId of Object.keys(state.routeStability)) {
        expect(routeStabilityOf(state, routeId), `${i}:${routeId}`).toBeGreaterThanOrEqual(0);
        expect(routeStabilityOf(state, routeId), `${i}:${routeId}`).toBeLessThanOrEqual(100);
      }
    }

    const maintenanceEvents = state.workshopUpgrades.reduce(
      (sum, upgrade) => sum + (upgrade.maintenancePaid ?? 0) + (upgrade.maintenanceMissed ?? 0),
      0,
    );
    expect(maintenanceEvents).toBeGreaterThan(0);
    expect(Object.values(state.regionReputation).some((value) => value > 0)).toBe(true);
    expect(state.supplyCrisisRecords.length).toBeGreaterThan(0);
    expect(state.resources).toHaveProperty('ironIngot');
    expect(state.resources).toHaveProperty('coal');
  });
});
