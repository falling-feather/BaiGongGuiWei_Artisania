import { describe, expect, it } from 'vitest';
import {
  CRAFTS,
  LORE_ENTRY_INDEX,
  REGION_CHAPTERS,
  REGION_ROUTES,
  REGIONS,
  STARTING_APPRENTICES,
} from '../../data';
import {
  createInitialState,
  gameReducer,
  type GameContent,
  type GameState,
} from '../../engine';
import { ACHIEVEMENTS } from '../../data/achievements';
import { CRAFT_INTERACTIONS } from '../../data/craftInteractions';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { LORE_ENTRIES } from '../../data/loreEntries';
import { ALL_NPCS } from '../../data/npcs';
import { QUESTS } from '../../data/quests';
import { REGION_ACTIVITIES, REGION_CONTENT } from '../../data/regionContent';
import { RESOURCES } from '../../data/resources';
import { SUBREGION_CONTENT } from '../../data/subregionContent';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';
import { buildRegionSpec } from '../regionSpec';
import { currentStreetRegionGate, isCurrentStreetSubregionGate } from '../navigationGuards';

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

const regionById = new Map(REGIONS.map((region) => [region.id, region]));
const routeById = new Map(REGION_ROUTES.map((route) => [route.id, route]));

interface ChapterRouteNavigationCase {
  name: string;
  chapterId: string;
  sourceRegionId: string;
  targetRegionId: string;
  routeId: string;
  landingSubregionId: string;
}

const CHAPTER_ROUTE_NAVIGATION_CASES: ChapterRouteNavigationCase[] = REGION_CHAPTERS.flatMap((chapter) => {
  const routeIds = [...new Set(chapter.playPillars.flatMap((pillar) => pillar.routeIds ?? []))];
  return routeIds.map((routeId) => {
    const route = routeById.get(routeId);
    const sourceRegionId = route?.fromRegionId === chapter.regionId ? route.toRegionId : route?.fromRegionId ?? '';
    const landingSubregionId = route?.landingSubregionIds?.[chapter.regionId] ?? '';
    return {
      name: `${chapter.id}:${routeId}`,
      chapterId: chapter.id,
      sourceRegionId,
      targetRegionId: chapter.regionId,
      routeId,
      landingSubregionId,
    };
  });
});

const SMOKE_BINDING_ROUTE_NAVIGATION_CASES: ChapterRouteNavigationCase[] = REGION_CHAPTERS.flatMap((chapter) =>
  (chapter.smokeBindings ?? []).flatMap((binding) =>
    (binding.routeLandingCases ?? []).map((landingCase) => {
      const route = routeById.get(landingCase.routeId);
      const sourceRegionId = route?.fromRegionId === chapter.regionId ? route.toRegionId : route?.fromRegionId ?? '';
      return {
        name: `${binding.id}:${landingCase.routeId}`,
        chapterId: chapter.id,
        sourceRegionId,
        targetRegionId: chapter.regionId,
        routeId: landingCase.routeId,
        landingSubregionId: landingCase.landingSubregionId,
      };
    }),
  ),
);

function freshState(): GameState {
  const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);
  return {
    ...base,
    resources: { ...base.resources, coin: 9999, labor: 99 },
    flags: [...new Set([...base.flags, 'heard-snow-pass'])],
    profile: {
      ...base.profile,
      attributes: {
        ...base.profile.attributes,
        commerce: 99,
        stamina: 99,
      },
    },
  };
}

function firstSubregionId(regionId: string): string {
  const subregionId = regionById.get(regionId)?.subregions[0]?.id;
  if (!subregionId) throw new Error(`Missing first subregion for ${regionId}`);
  return subregionId;
}

function trackSubregion(state: GameState, subregionId: string): GameState {
  const loreEntryId = `subregion-${subregionId}`;
  expect(LORE_ENTRY_INDEX[loreEntryId], loreEntryId).toBeTruthy();
  return { ...state, trackedLoreEntryId: loreEntryId };
}

function followTrackedLoreTo(state: GameState, targetRegionId: string, targetSubregionId: string): GameState {
  let current = trackSubregion(state, targetSubregionId);
  const visited = new Set<string>();

  for (let step = 0; step < 30; step += 1) {
    if (current.currentRegion === targetRegionId && current.currentSubregion === targetSubregionId) return current;

    const spec = buildRegionSpec(current.currentRegion, current);
    const target = spec?.navigationTarget;
    if (!target) {
      throw new Error(`Missing navigation target at ${current.currentRegion}/${current.currentSubregion}`);
    }
    const key = `${current.currentRegion}/${current.currentSubregion}->${target.kind}:${target.payload}`;
    expect(visited.has(key), `navigation loop at ${key}`).toBe(false);
    visited.add(key);

    if (target.kind === 'subregionGate') {
      expect(isCurrentStreetSubregionGate(current, target.payload), key).toBe(true);
      current = gameReducer(current, { type: 'TRAVEL_SUBREGION', subregionId: target.payload }, content);
      continue;
    }

    const gate = currentStreetRegionGate(current, target.payload);
    expect(gate, key).toBeTruthy();
    expect(spec?.gates.some((entry) => entry.regionId === target.payload && entry.routeId === gate?.routeId)).toBe(true);
    if (!gate?.unlocked) {
      const opened = gameReducer(current, { type: 'UNLOCK_REGION', regionId: target.payload }, content);
      expect(opened.unlockedRegions, `failed to unlock ${target.payload}`).toContain(target.payload);
      current = opened;
    }

    const route = gate?.routeId ? routeById.get(gate.routeId) : undefined;
    const crossed = gameReducer(current, { type: 'TRAVEL', regionId: target.payload, routeId: gate?.routeId }, content);
    const expectedLanding = route?.landingSubregionIds?.[target.payload];
    if (expectedLanding) {
      expect(crossed.currentSubregion, `${gate?.routeId}->${target.payload}`).toBe(expectedLanding);
    }
    current = crossed;
  }

  throw new Error(`Failed to reach ${targetRegionId}/${targetSubregionId}`);
}

describe('region chapter street navigation', () => {
  it.each(CHAPTER_ROUTE_NAVIGATION_CASES)(
    'lands $name through the current street gate route',
    (testCase) => {
      let state = freshState();
      state = followTrackedLoreTo(state, testCase.sourceRegionId, firstSubregionId(testCase.sourceRegionId));
      expect(state.currentRegion).toBe(testCase.sourceRegionId);

      state = trackSubregion(state, testCase.landingSubregionId);
      const spec = buildRegionSpec(state.currentRegion, state);
      const target = spec?.navigationTarget;
      expect(target).toMatchObject({ kind: 'gate', payload: testCase.targetRegionId });

      const gate = currentStreetRegionGate(state, testCase.targetRegionId);
      expect(gate?.routeId, testCase.name).toBe(testCase.routeId);
      if (!gate?.unlocked) {
        state = gameReducer(state, { type: 'UNLOCK_REGION', regionId: testCase.targetRegionId }, content);
        expect(state.unlockedRegions, `failed to unlock ${testCase.targetRegionId}`).toContain(testCase.targetRegionId);
      }

      const reached = gameReducer(
        state,
        { type: 'TRAVEL', regionId: testCase.targetRegionId, routeId: testCase.routeId },
        content,
      );
      expect(reached.currentRegion).toBe(testCase.targetRegionId);
      expect(reached.currentSubregion).toBe(testCase.landingSubregionId);
    },
  );

  it.each(SMOKE_BINDING_ROUTE_NAVIGATION_CASES)(
    'lands smoke binding $name through the declared street gate route',
    (testCase) => {
      let state = freshState();
      state = followTrackedLoreTo(state, testCase.sourceRegionId, firstSubregionId(testCase.sourceRegionId));
      expect(state.currentRegion).toBe(testCase.sourceRegionId);

      state = trackSubregion(state, testCase.landingSubregionId);
      const gate = currentStreetRegionGate(state, testCase.targetRegionId);
      expect(gate?.routeId, testCase.name).toBe(testCase.routeId);
      if (!gate?.unlocked) {
        state = gameReducer(state, { type: 'UNLOCK_REGION', regionId: testCase.targetRegionId }, content);
        expect(state.unlockedRegions, `failed to unlock ${testCase.targetRegionId}`).toContain(testCase.targetRegionId);
      }

      const reached = gameReducer(
        state,
        { type: 'TRAVEL', regionId: testCase.targetRegionId, routeId: testCase.routeId },
        content,
      );
      expect(reached.currentRegion).toBe(testCase.targetRegionId);
      expect(reached.currentSubregion).toBe(testCase.landingSubregionId);
    },
  );
});
