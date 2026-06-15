import { describe, expect, it } from 'vitest';
import { gameReducer, type ActivityDef, type GameContent } from '../../engine';
import {
  ACHIEVEMENTS,
  ACTIVITY_INDEX,
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
  LORE_ENTRY_INDEX,
  QUESTS,
  REGION_ACTIVITIES,
  REGION_CHAPTERS,
  REGION_CONTENT,
  REGION_ROUTES,
  REGIONS,
  RESOURCES,
  STARTING_APPRENTICES,
  STORY_BEATS,
  SUBREGION_CONTENT,
  WORKSHOP_UPGRADES,
} from '../../data';
import { buildRegionSpec } from '../../game/regionSpec';
import { PRIORITY_SMOKE_SCENARIO_IDS } from '../prioritySmokeScenarios';
import {
  REGION_CHAPTER_SMOKE_SCENARIOS,
  REGION_CHAPTER_SMOKE_SCENARIO_IDS,
  buildRegionChapterSmokeState,
  type RegionChapterSmokeScenario,
} from '../regionChapterSmokeScenarios';

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

const chapterById = new Map(REGION_CHAPTERS.map((chapter) => [chapter.id, chapter]));
const craftIds = new Set(CRAFTS.map((craft) => craft.id));
const npcIds = new Set(ALL_NPCS.map((npc) => npc.id));
const prioritySmokeIds = new Set<string>(PRIORITY_SMOKE_SCENARIO_IDS);
const routeById = new Map(REGION_ROUTES.map((route) => [route.id, route]));

function activityDef(activityId: string): ActivityDef {
  const activity = ACTIVITY_INDEX[activityId];
  if (!activity) throw new Error(`Missing activity ${activityId}`);
  return activity;
}

function subregionForCraft(craftId: string): string | null {
  return SUBREGION_CONTENT.find((entry) => entry.craftIds.includes(craftId))?.subregionId ?? null;
}

describe('region chapter smoke scenarios', () => {
  it('exports one independent chapter smoke id for every M1 chapter', () => {
    expect(REGION_CHAPTER_SMOKE_SCENARIO_IDS).toEqual(REGION_CHAPTERS.map((chapter) => chapter.id));
    for (const scenarioId of REGION_CHAPTER_SMOKE_SCENARIO_IDS) {
      expect(prioritySmokeIds.has(scenarioId), scenarioId).toBe(false);
    }
  });

  it.each(REGION_CHAPTER_SMOKE_SCENARIO_IDS)('%s binds real chapter activity/craft/NPC/route refs', (scenarioId) => {
    const scenario: RegionChapterSmokeScenario = REGION_CHAPTER_SMOKE_SCENARIOS[scenarioId];
    const chapter = chapterById.get(scenario.chapterId);
    const chapterActivities = new Set(chapter?.playPillars.flatMap((pillar) => pillar.activityIds) ?? []);
    const chapterCrafts = new Set(chapter?.playPillars.flatMap((pillar) => pillar.craftIds ?? []) ?? []);
    const chapterRoutes = new Set(chapter?.playPillars.flatMap((pillar) => pillar.routeIds ?? []) ?? []);
    const chapterNpcs = new Set(chapter?.characterNpcIds.map((npc) => npc.npcId) ?? []);
    const activity = activityDef(scenario.activityId);
    const route = routeById.get(scenario.routeId);

    expect(chapter).toBeTruthy();
    expect(chapter?.smokeScenarioIds).toContain(scenario.id);
    expect(chapter?.regionId).toBe(scenario.regionId);
    expect(chapter?.entrySubregionIds).toContain(scenario.subregionId);
    expect(chapter?.entrySubregionIds).toContain(scenario.routeLandingSubregionId);
    expect(chapterActivities.has(scenario.activityId), scenario.id).toBe(true);
    expect(chapterCrafts.has(scenario.craftId), scenario.id).toBe(true);
    expect(chapterNpcs.has(scenario.npcId), scenario.id).toBe(true);
    expect(chapterRoutes.has(scenario.routeId), scenario.id).toBe(true);
    expect(activity.regionId).toBe(scenario.regionId);
    expect(craftIds.has(scenario.craftId)).toBe(true);
    expect(npcIds.has(scenario.npcId)).toBe(true);
    expect([route?.fromRegionId, route?.toRegionId], scenario.id).toContain(scenario.regionId);
    expect(route?.landingSubregionIds?.[scenario.regionId]).toBe(scenario.routeLandingSubregionId);
    expect(LORE_ENTRY_INDEX[scenario.loreEntryId ?? `subregion-${scenario.subregionId}`]).toBeTruthy();
  });

  it.each(REGION_CHAPTER_SMOKE_SCENARIO_IDS)('%s starts at a playable M1 chapter state', (scenarioId) => {
    const scenario: RegionChapterSmokeScenario = REGION_CHAPTER_SMOKE_SCENARIOS[scenarioId];
    const state = buildRegionChapterSmokeState(content, scenarioId);

    expect(state).not.toBeNull();
    expect(state?.devMode).toBe(true);
    expect(state?.currentRegion).toBe(scenario.regionId);
    expect(state?.currentSubregion).toBe(scenario.subregionId);
    expect(state?.trackedLoreEntryId).toBe(scenario.loreEntryId ?? `subregion-${scenario.subregionId}`);
    expect(state?.flags).toContain(`chapter-smoke:${scenario.id}`);
    expect(state?.flags).toContain(`route-known:${scenario.routeId}`);
    expect(state?.unlockedRegions).toEqual(expect.arrayContaining(REGIONS.map((region) => region.id)));
    expect(state?.resources.coin).toBeGreaterThan(100);
    expect(state?.resources.labor).toBeGreaterThan(10);
  });

  it('allows DEV chapter smoke to start at another local subregion for browser QA', () => {
    const state = buildRegionChapterSmokeState(content, 'chapter-xueyu-thangka-snowpass', {
      subregionId: 'xueyu-pigment-valley',
    });
    if (!state) throw new Error('Missing Xueyu chapter smoke state');

    const spec = buildRegionSpec(state.currentRegion, state);

    expect(state.currentRegion).toBe('xueyu');
    expect(state.currentSubregion).toBe('xueyu-pigment-valley');
    expect(state.trackedLoreEntryId).toBe('subregion-xueyu-pigment-valley');
    expect(spec?.subregionId).toBe('xueyu-pigment-valley');
    expect(spec?.activities.some((activity) => activity.id === 'xy-pigment-valley')).toBe(true);
  });

  it('allows DEV Huizhou chapter smoke to start at the M1.18 ink alley for browser QA', () => {
    const state = buildRegionChapterSmokeState(content, 'chapter-huizhou-paper-merchant', {
      subregionId: 'huizhou-ink-alley',
    });
    if (!state) throw new Error('Missing Huizhou chapter smoke state');

    const spec = buildRegionSpec(state.currentRegion, state);

    expect(state.currentRegion).toBe('huizhou');
    expect(state.currentSubregion).toBe('huizhou-ink-alley');
    expect(state.trackedLoreEntryId).toBe('subregion-huizhou-ink-alley');
    expect(spec?.subregionId).toBe('huizhou-ink-alley');
    expect(spec?.activities.some((activity) => activity.id === 'hz-ink-workshop')).toBe(true);
    expect(spec?.crafts.some((craft) => craft.id === 'hui-ink')).toBe(true);
    expect(spec?.npcs.some((npc) => npc.id === 'hz-cheng-moshou')).toBe(true);
  });

  it('ignores chapter smoke subregion overrides outside the scenario region', () => {
    const state = buildRegionChapterSmokeState(content, 'chapter-xueyu-thangka-snowpass', {
      subregionId: 'xiyu-caravan-post',
    });

    expect(state?.currentRegion).toBe('xueyu');
    expect(state?.currentSubregion).toBe('xueyu-snow-pass');
    expect(state?.trackedLoreEntryId).toBe('subregion-xueyu-snow-pass');
  });

  it.each(REGION_CHAPTER_SMOKE_SCENARIO_IDS)(
    '%s can run chapter craft/activity/NPC reducers from the smoke state',
    (scenarioId) => {
      const scenario: RegionChapterSmokeScenario = REGION_CHAPTER_SMOKE_SCENARIOS[scenarioId];
      const initial = buildRegionChapterSmokeState(content, scenarioId);
      if (!initial) throw new Error(`Missing chapter smoke scenario ${scenarioId}`);
      const producedBefore = initial.crafts.find((craft) => craft.craftId === scenario.craftId)?.produced ?? 0;
      const affinityBefore = initial.npcAffinity[scenario.npcId] ?? 0;
      const craftSubregionId = subregionForCraft(scenario.craftId);

      expect(craftSubregionId, scenario.id).toBeTruthy();
      let state = gameReducer(initial, { type: 'TRAVEL_SUBREGION', subregionId: craftSubregionId ?? '' }, content);
      state = gameReducer(state, { type: 'RUN_PROCESS', craftId: scenario.craftId, skipStepIds: [] }, content);
      expect(state.crafts.find((craft) => craft.craftId === scenario.craftId)?.produced).toBeGreaterThan(
        producedBefore,
      );

      const activity = activityDef(scenario.activityId);
      state = gameReducer(state, { type: 'TRAVEL_SUBREGION', subregionId: activity.subregionId }, content);
      state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: scenario.activityId, quality: 0.9 }, content);
      expect(state.completedActivities).toContain(scenario.activityId);
      for (const routeId of activity.reward.routeIds ?? []) {
        expect(state.flags).toContain(`route-known:${routeId}`);
      }

      state = gameReducer(state, { type: 'TALK_NPC', npcId: scenario.npcId }, content);
      expect(state.npcAffinity[scenario.npcId]).toBeGreaterThan(affinityBefore);
    },
  );

  it.each(REGION_CHAPTER_SMOKE_SCENARIO_IDS)(
    '%s exposes route gates and declared route landing from its chapter street',
    (scenarioId) => {
      const scenario: RegionChapterSmokeScenario = REGION_CHAPTER_SMOKE_SCENARIOS[scenarioId];
      const state = buildRegionChapterSmokeState(content, scenarioId);
      if (!state) throw new Error(`Missing chapter smoke scenario ${scenarioId}`);
      const route = routeById.get(scenario.routeId);
      const spec = buildRegionSpec(state.currentRegion, state);
      const targetRegionId = route?.fromRegionId === scenario.regionId ? route.toRegionId : route?.fromRegionId;

      expect(route?.landingSubregionIds?.[scenario.regionId]).toBe(scenario.routeLandingSubregionId);
      expect(spec?.gates.some((gate) => gate.regionId === targetRegionId && gate.routeId === scenario.routeId)).toBe(
        true,
      );
    },
  );
});
