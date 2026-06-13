import { describe, expect, it } from 'vitest';
import {
  buildPriorityJourneyGuide,
  gameReducer,
  uniqueRoutesFromRegions,
  type GameContent,
} from '../';
import { createInitialState } from '../state';
import type { ActivityDef, Craft, GameState, ResourcePool, TimePhase } from '../types';
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
import { QUESTS } from '../../data/quests';
import { REGION_ACTIVITIES, REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { SUBREGION_CONTENT } from '../../data/subregionContent';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';

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

const routes = uniqueRoutesFromRegions(REGION_CONTENT);

interface PriorityFlowPlan {
  stepId: string;
  expectedNextStepId?: string;
  regionId: string;
  craftId: string;
  craftSubregionId: string;
  activityId: string;
  activitySubregionId: string;
  closingChoiceId: string;
  phases: TimePhase[];
  strategies?: Array<string | undefined>;
}

const FLOW_PLANS: PriorityFlowPlan[] = [
  {
    stepId: 'journey-jiangnan',
    expectedNextStepId: 'journey-bashu',
    regionId: 'jiangnan',
    craftId: 'longquan-sword',
    craftSubregionId: 'jiangnan-longquan',
    activityId: 'jn-qinhuai-lantern',
    activitySubregionId: 'jiangnan-jinling',
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
    closingChoiceId: 'seal-barter-contract',
    phases: ['dusk', 'dusk', 'dusk'],
    strategies: ['connoisseur-rare-table', undefined, undefined],
  },
];

function freshState(): GameState {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);
}

function guideFor(state: GameState) {
  return buildPriorityJourneyGuide(state, PRIORITY_JOURNEY_STEPS, LORE_ENTRIES, REGIONS, routes);
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

function stallInputs(activity: ActivityDef): ResourcePool {
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

function runCraftSample(state: GameState, plan: PriorityFlowPlan): GameState {
  const beforeProduced = state.crafts.find((craft) => craft.craftId === plan.craftId)?.produced ?? 0;
  const ready = addResources(placeAt(state, plan.regionId, plan.craftSubregionId), craftInputs(plan.craftId));
  const next = gameReducer(ready, { type: 'RUN_PROCESS', craftId: plan.craftId, skipStepIds: [] }, content);
  const afterProduced = next.crafts.find((craft) => craft.craftId === plan.craftId)?.produced ?? 0;

  expect(afterProduced).toBe(beforeProduced + 1);
  return next;
}

function runActivityChain(state: GameState, plan: PriorityFlowPlan): GameState {
  const activity = activityDef(plan.activityId);
  let next = placeAt(state, plan.regionId, plan.activitySubregionId);

  for (const [index, phase] of plan.phases.entries()) {
    next = addResources(
      {
        ...next,
        currentRegion: plan.regionId,
        currentSubregion: plan.activitySubregionId,
        calendar: { ...next.calendar, day: index + 1, phase },
      },
      stallInputs(activity),
    );
    next = gameReducer(
      next,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: plan.activityId,
        quality: 0.88,
        stallStrategyId: plan.strategies?.[index],
      },
      content,
    );
    expect(next.nightMarketStallRecords[0]?.activityId).toBe(plan.activityId);
  }

  expect(next.flags).toContain(`stall-chain-completed:${plan.activityId}`);
  expect(next.pendingActivityStallClosing?.activityId).toBe(plan.activityId);

  next = addResources(next, { coin: 999, labor: 99 });
  next = gameReducer(next, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: plan.closingChoiceId }, content);

  expect(next.pendingActivityStallClosing).toBeNull();
  expect(next.flags).toContain(`stall-closing-resolved:${plan.activityId}`);
  return next;
}

describe('priority journey reducer flow', () => {
  it('runs the scoped five-region mainline through real craft and festival actions', () => {
    let state = freshState();
    expect(guideFor(state)?.step?.id).toBe('journey-jiangnan');

    for (const plan of FLOW_PLANS) {
      expect(guideFor(state)?.step?.id).toBe(plan.stepId);
      expect(guideFor(state)?.milestone?.kind).toMatch(/CraftProduced$/);

      state = runCraftSample(state, plan);
      expect(guideFor(state)?.step?.id).toBe(plan.stepId);
      expect(guideFor(state)?.milestone?.activityId).toBe(plan.activityId);

      state = runActivityChain(state, plan);
      const guide = guideFor(state);

      if (plan.expectedNextStepId) {
        expect(guide?.status).toBe('active');
        expect(guide?.step?.id).toBe(plan.expectedNextStepId);
      } else {
        expect(guide?.status).toBe('complete');
        expect(guide?.completedStepIds).toEqual(FLOW_PLANS.map((entry) => entry.stepId));
      }
    }
  });
});
