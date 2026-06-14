import { describe, expect, it } from 'vitest';
import { gameReducer, type ActivityDef, type GameContent, type GameState } from '../../engine';
import {
  ACHIEVEMENTS,
  ALL_NPCS,
  COLLAB_RECIPES,
  CRAFT_INTERACTIONS,
  CRAFTS,
  ESCORT_ENCOUNTERS,
  EVENTS,
  HOME_VISITS,
  INDUSTRIES,
  ITEM_DESCRIPTOR_RULES,
  LORE_ENTRIES,
  QUESTS,
  REGION_ACTIVITIES,
  REGION_CONTENT,
  REGIONS,
  RESOURCES,
  STARTING_APPRENTICES,
  STORY_BEATS,
  SUBREGION_CONTENT,
  WORKSHOP_UPGRADES,
} from '../../data';
import {
  PRIORITY_SMOKE_SCENARIOS,
  PRIORITY_SMOKE_SCENARIO_IDS,
  PRIORITY_SKELETON_SMOKE_SCENARIO_IDS,
  PRIORITY_STALL_SMOKE_SCENARIO_IDS,
  buildPrioritySmokeState,
  type PrioritySmokeScenario,
} from '../prioritySmokeScenarios';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  story: STORY_BEATS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
  quests: QUESTS,
  activities: REGION_ACTIVITIES,
  regionContent: REGION_CONTENT,
  subregionContent: SUBREGION_CONTENT,
  escortEncounters: ESCORT_ENCOUNTERS,
  collabRecipes: COLLAB_RECIPES,
  homeVisits: HOME_VISITS,
  craftInteractions: CRAFT_INTERACTIONS,
  workshopUpgrades: WORKSHOP_UPGRADES,
  itemDescriptorRules: ITEM_DESCRIPTOR_RULES,
  loreEntries: LORE_ENTRIES,
};

function activityDef(activityId: string): ActivityDef {
  const activity = content.activities?.find((item) => item.id === activityId);
  if (!activity) throw new Error(`Missing activity ${activityId}`);
  return activity;
}

function placeForActivity(state: GameState, activity: ActivityDef): GameState {
  return {
    ...state,
    currentRegion: activity.regionId,
    currentSubregion: activity.subregionId,
  };
}

describe('priority smoke scenarios', () => {
  it.each(PRIORITY_SMOKE_SCENARIO_IDS)('%s starts at a playable priority browser-smoke state', (scenarioId) => {
    const scenario: PrioritySmokeScenario = PRIORITY_SMOKE_SCENARIOS[scenarioId];
    const state = buildPrioritySmokeState(content, scenarioId);

    expect(state).not.toBeNull();
    expect(state?.devMode).toBe(true);
    expect(state?.currentRegion).toBe(scenario.regionId);
    expect(state?.currentSubregion).toBe(scenario.subregionId);
    expect(state?.pendingActivityStallClosing).toBeNull();
    expect(state?.unlockedRegions).toEqual(expect.arrayContaining(REGIONS.map((region) => region.id)));
    expect(state?.completedActivities).toEqual(expect.arrayContaining(scenario.priorCompletedActivityIds));
    for (const craftId of scenario.producedCraftIds) {
      expect(state?.crafts.find((craft) => craft.craftId === craftId)?.produced).toBeGreaterThan(0);
    }
  });

  it.each(PRIORITY_SKELETON_SMOKE_SCENARIO_IDS)(
    '%s can run its N2 local craft/activity/NPC chain through reducer actions',
    (scenarioId) => {
      const scenario: PrioritySmokeScenario = PRIORITY_SMOKE_SCENARIOS[scenarioId];
      const initial = buildPrioritySmokeState(content, scenarioId);
      if (!initial) throw new Error(`Missing smoke scenario ${scenarioId}`);
      expect(scenario.localCraftId).toBeTruthy();
      expect(scenario.localNpcId).toBeTruthy();
      expect(scenario.loreEntryId).toBeTruthy();
      expect(content.loreEntries?.some((entry) => entry.id === scenario.loreEntryId)).toBe(true);

      const craftId = scenario.localCraftId ?? '';
      const npcId = scenario.localNpcId ?? '';
      const producedBefore = initial.crafts.find((craft) => craft.craftId === craftId)?.produced ?? 0;
      const affinityBefore = initial.npcAffinity[npcId] ?? 0;

      let state = gameReducer(initial, { type: 'RUN_PROCESS', craftId, skipStepIds: [] }, content);
      expect(state.crafts.find((craft) => craft.craftId === craftId)?.produced).toBeGreaterThan(producedBefore);
      expect(state.currentRegion).toBe(scenario.regionId);
      expect(state.currentSubregion).toBe(scenario.subregionId);

      state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: scenario.activityId, quality: 0.9 }, content);
      expect(state.completedActivities).toContain(scenario.activityId);
      expect(state.npcAffinity[npcId]).toBeGreaterThan(affinityBefore);
      expect(state.npcStates[npcId]?.knownTopics).toContain(`activity:${scenario.activityId}`);

      if (scenario.localQuestId) {
        state = gameReducer(state, { type: 'COMPLETE_QUEST', questId: scenario.localQuestId }, content);
        expect(state.completedQuests).toContain(scenario.localQuestId);
      }
    },
  );

  it.each(PRIORITY_SKELETON_SMOKE_SCENARIO_IDS)(
    '%s can run its N2 scoped activity or route quest without a map shortcut',
    (scenarioId) => {
      const scenario: PrioritySmokeScenario = PRIORITY_SMOKE_SCENARIOS[scenarioId];
      const requiredActivityId = scenario.requiredActivityId ?? scenario.activityId;
      const activity = activityDef(requiredActivityId);
      let state = buildPrioritySmokeState(content, scenarioId);
      if (!state) throw new Error(`Missing smoke scenario ${scenarioId}`);

      state = {
        ...state,
        currentRegion: activity.regionId,
        currentSubregion: activity.subregionId,
      };
      state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: requiredActivityId, quality: 0.9 }, content);
      expect(state.completedActivities).toContain(requiredActivityId);

      for (const routeId of activity.reward.routeIds ?? []) {
        expect(state.flags).toContain(`route-known:${routeId}`);
      }

      if (scenario.requiredQuestId) {
        state = gameReducer(state, { type: 'COMPLETE_QUEST', questId: scenario.requiredQuestId }, content);
        expect(state.completedQuests).toContain(scenario.requiredQuestId);
      }
    },
  );

  it.each(PRIORITY_STALL_SMOKE_SCENARIO_IDS)('%s can finish its festival chain through reducer actions', (scenarioId) => {
    const scenario: PrioritySmokeScenario = PRIORITY_SMOKE_SCENARIOS[scenarioId];
    const activity = activityDef(scenario.activityId);
    let state = buildPrioritySmokeState(content, scenarioId);
    if (!state) throw new Error(`Missing smoke scenario ${scenarioId}`);

    for (const [index, phase] of scenario.phases.entries()) {
      state = {
        ...placeForActivity(state, activity),
        calendar: { ...state.calendar, day: index + 1, phase },
      };
      state = gameReducer(
        state,
        {
          type: 'PERFORM_ACTIVITY',
          activityId: scenario.activityId,
          quality: 0.9,
          stallStrategyId: scenario.strategies?.[index],
        },
        content,
      );
      expect(state.nightMarketStallRecords[0]?.activityId).toBe(scenario.activityId);
    }

    expect(state.flags).toContain(`stall-chain-completed:${scenario.activityId}`);
    expect(state.pendingActivityStallClosing?.activityId).toBe(scenario.activityId);
    expect(scenario.closingChoiceId).toBeTruthy();

    state = gameReducer(
      state,
      { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: scenario.closingChoiceId ?? '' },
      content,
    );
    expect(state.pendingActivityStallClosing).toBeNull();
    expect(state.flags).toContain(`stall-closing-resolved:${scenario.activityId}`);
    expect(state.activeOrders).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceActivityId: scenario.activityId })]),
    );

    if (scenario.postActivityId && scenario.postActivitySubregionId) {
      const postActivity = activityDef(scenario.postActivityId);
      state = {
        ...placeForActivity(state, postActivity),
        calendar: { ...state.calendar, phase: 'dusk' },
      };
      state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: scenario.postActivityId, quality: 0.9 }, content);
      expect(state.completedActivities).toContain(scenario.postActivityId);
      expect(state.flags).toContain(scenario.postActivityFlag);
    }
  });

  it('xiyu-caravan smoke scenario can finish the caravan-post route activity', () => {
    const state = buildPrioritySmokeState(content, 'xiyu-caravan');
    if (!state) throw new Error('Missing smoke scenario xiyu-caravan');

    const next = gameReducer(
      state,
      { type: 'PERFORM_ACTIVITY', activityId: 'xiyu-caravan-post', quality: 0.9 },
      content,
    );

    expect(next.completedActivities).toContain('xiyu-caravan-post');
    expect(next.flags).toContain('caravan-route-known');
    expect(next.flags).toContain('route-known:route-xueyu-xiyu-caravan');
  });
});
