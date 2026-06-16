import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_INDEX,
  ALL_NPCS,
  COLLAB_RECIPES,
  CRAFTS,
  ESCORT_ENCOUNTERS,
  FULL_SCOPE_REGION_IDS,
  HOME_VISITS,
  REGION_CHAPTER_IDS,
  REGION_CHAPTERS,
  REGION_ROUTES,
  REGIONS,
  RUNTIME_MAP_LAYOUTS,
  SUBREGION_CONTENT,
} from '../index';
import { REGION_CHAPTER_SMOKE_SCENARIOS } from '../../dev/regionChapterSmokeScenarios';

const regionById = new Map(REGIONS.map((region) => [region.id, region]));
const craftIds = new Set(CRAFTS.map((craft) => craft.id));
const npcIds = new Set(ALL_NPCS.map((npc) => npc.id));
const homeVisitIds = new Set(HOME_VISITS.map((visit) => visit.id));
const collabIds = new Set(COLLAB_RECIPES.map((recipe) => recipe.id));
const escortIds = new Set(ESCORT_ENCOUNTERS.map((encounter) => encounter.id));
const smokeIds = new Set(Object.keys(REGION_CHAPTER_SMOKE_SCENARIOS));
const layoutSubregionIds = new Set(RUNTIME_MAP_LAYOUTS.map((layout) => layout.subregionId));
const npcById = new Map(ALL_NPCS.map((npc) => [npc.id, npc]));
const routeById = new Map(REGION_ROUTES.map((route) => [route.id, route]));
const subregionContentById = new Map(SUBREGION_CONTENT.map((entry) => [entry.subregionId, entry]));

function subregionIdsFor(regionId: string): Set<string> {
  return new Set(regionById.get(regionId)?.subregions.map((subregion) => subregion.id) ?? []);
}

describe('region chapter specs', () => {
  it('exports one M1 chapter contract for each full-scope region', () => {
    expect(REGION_CHAPTERS.map((chapter) => chapter.regionId)).toEqual(FULL_SCOPE_REGION_IDS);
    expect(new Set(REGION_CHAPTER_IDS).size).toBe(REGION_CHAPTER_IDS.length);
  });

  it('requires craft, life and trade-route pillars for every chapter', () => {
    for (const chapter of REGION_CHAPTERS) {
      const pillarKinds = new Set(chapter.playPillars.map((pillar) => pillar.kind));

      expect(pillarKinds).toContain('craft');
      expect(pillarKinds).toContain('life');
      expect(pillarKinds).toContain('tradeRoute');
    }
  });

  it('requires artisan, trade and life/culture participants for every chapter', () => {
    for (const chapter of REGION_CHAPTERS) {
      const roles = new Set(chapter.characterNpcIds.map((npc) => npc.role));

      expect(roles).toContain('artisan');
      expect(roles).toContain('trade');
      expect(roles).toContain('lifeCulture');
    }
  });

  it('uses real region, subregion, activity, craft, route and NPC ids', () => {
    for (const chapter of REGION_CHAPTERS) {
      const localSubregionIds = subregionIdsFor(chapter.regionId);

      expect(regionById.has(chapter.regionId)).toBe(true);
      expect(chapter.entrySubregionIds.length).toBeGreaterThanOrEqual(1);
      for (const subregionId of chapter.entrySubregionIds) {
        expect(localSubregionIds.has(subregionId)).toBe(true);
      }

      for (const pillar of chapter.playPillars) {
        expect(pillar.activityIds.length).toBeGreaterThanOrEqual(1);
        for (const activityId of pillar.activityIds) {
          expect(ACTIVITY_INDEX[activityId]?.regionId).toBe(chapter.regionId);
        }
        for (const craftId of pillar.craftIds ?? []) {
          expect(craftIds.has(craftId)).toBe(true);
        }
        for (const routeId of pillar.routeIds ?? []) {
          const route = REGION_ROUTES.find((entry) => entry.id === routeId);
          expect(route).toBeTruthy();
          expect([route?.fromRegionId, route?.toRegionId]).toContain(chapter.regionId);
        }
      }

      for (const npc of chapter.characterNpcIds) {
        expect(npcIds.has(npc.npcId)).toBe(true);
      }
    }
  });

  it('declares valid bidirectional landing subregions for every formal route', () => {
    for (const route of REGION_ROUTES) {
      const fromSubregionIds = subregionIdsFor(route.fromRegionId);
      const toSubregionIds = subregionIdsFor(route.toRegionId);

      expect(route.landingSubregionIds?.[route.fromRegionId], route.id).toBeTruthy();
      expect(route.landingSubregionIds?.[route.toRegionId], route.id).toBeTruthy();
      expect(fromSubregionIds.has(route.landingSubregionIds?.[route.fromRegionId] ?? ''), route.id).toBe(true);
      expect(toSubregionIds.has(route.landingSubregionIds?.[route.toRegionId] ?? ''), route.id).toBe(true);

      for (const regionId of Object.keys(route.landingSubregionIds ?? {})) {
        expect([route.fromRegionId, route.toRegionId], `${route.id}:${regionId}`).toContain(regionId);
      }
    }
  });

  it('binds every chapter trade route to a landing inside that chapter entry set', () => {
    for (const chapter of REGION_CHAPTERS) {
      const entrySubregionIds = new Set(chapter.entrySubregionIds);
      const chapterRouteIds = chapter.playPillars.flatMap((pillar) => pillar.routeIds ?? []);

      expect(chapterRouteIds.length, chapter.id).toBeGreaterThan(0);
      for (const routeId of chapterRouteIds) {
        const route = REGION_ROUTES.find((entry) => entry.id === routeId);
        const landingSubregionId = route?.landingSubregionIds?.[chapter.regionId];

        expect(landingSubregionId, `${chapter.id}:${routeId}`).toBeTruthy();
        expect(entrySubregionIds.has(landingSubregionId ?? ''), `${chapter.id}:${routeId}`).toBe(true);
      }
    }
  });

  it('uses real order hook ids or marks proposed hooks only on chapters needing expansion', () => {
    for (const chapter of REGION_CHAPTERS) {
      expect(chapter.orderHooks.length).toBeGreaterThanOrEqual(1);

      for (const hook of chapter.orderHooks) {
        if (hook.source === 'activity') {
          expect(ACTIVITY_INDEX[hook.id]?.regionId).toBe(chapter.regionId);
        } else if (hook.source === 'homeVisit') {
          expect(homeVisitIds.has(hook.id)).toBe(true);
        } else if (hook.source === 'collab') {
          expect(collabIds.has(hook.id)).toBe(true);
        } else if (hook.source === 'escort') {
          expect(escortIds.has(hook.id)).toBe(true);
        } else {
          expect(hook.id.startsWith('proposed-')).toBe(true);
          expect(chapter.status).toBe('needs-expansion');
          expect(chapter.gaps.length).toBeGreaterThan(0);
        }
      }

      for (const homeVisitId of chapter.homeVisitIds) {
        expect(homeVisitIds.has(homeVisitId)).toBe(true);
      }
      for (const collabId of chapter.collabRecipeIds) {
        expect(collabIds.has(collabId)).toBe(true);
      }
      for (const escortId of chapter.escortEncounterIds) {
        expect(escortIds.has(escortId)).toBe(true);
      }
    }
  });

  it('binds every chapter to existing smoke scenarios in the same region', () => {
    for (const chapter of REGION_CHAPTERS) {
      expect(chapter.smokeScenarioIds.length).toBeGreaterThanOrEqual(1);

      for (const smokeScenarioId of chapter.smokeScenarioIds) {
        expect(smokeIds.has(smokeScenarioId)).toBe(true);
        const smokeScenario =
          REGION_CHAPTER_SMOKE_SCENARIOS[smokeScenarioId as keyof typeof REGION_CHAPTER_SMOKE_SCENARIOS];
        expect(smokeScenario?.regionId).toBe(chapter.regionId);
        expect(smokeScenario?.chapterId).toBe(chapter.id);
      }
    }
  });

  it('validates optional smokeBindings against local entry content and route landings', () => {
    for (const chapter of REGION_CHAPTERS) {
      const chapterActivities = new Set(chapter.playPillars.flatMap((pillar) => pillar.activityIds));
      const chapterCrafts = new Set(chapter.playPillars.flatMap((pillar) => pillar.craftIds ?? []));
      const chapterRoutes = new Set(chapter.playPillars.flatMap((pillar) => pillar.routeIds ?? []));
      const entrySubregionIds = new Set(chapter.entrySubregionIds);

      for (const binding of chapter.smokeBindings ?? []) {
        const subregionContent = subregionContentById.get(binding.entrySubregionId);

        expect(entrySubregionIds.has(binding.entrySubregionId), binding.id).toBe(true);
        if (binding.requiresRuntimeLayout) {
          expect(layoutSubregionIds.has(binding.entrySubregionId), binding.id).toBe(true);
        }
        for (const missingLayoutSubregionId of binding.missingLayoutSubregionIds ?? []) {
          expect(layoutSubregionIds.has(missingLayoutSubregionId), binding.id).toBe(false);
        }
        for (const activityId of binding.activityIds) {
          const activity = ACTIVITY_INDEX[activityId];
          expect(activity?.regionId, `${binding.id}:${activityId}`).toBe(chapter.regionId);
          expect(activity?.subregionId, `${binding.id}:${activityId}`).toBe(binding.entrySubregionId);
          expect(chapterActivities.has(activityId), `${binding.id}:${activityId}`).toBe(true);
        }
        for (const craftId of binding.craftIds) {
          expect(craftIds.has(craftId), `${binding.id}:${craftId}`).toBe(true);
          expect(chapterCrafts.has(craftId), `${binding.id}:${craftId}`).toBe(true);
          expect(subregionContent?.craftIds.includes(craftId), `${binding.id}:${craftId}`).toBe(true);
        }
        for (const npcId of binding.npcIds) {
          const npc = npcById.get(npcId);
          expect(npc?.regionId, `${binding.id}:${npcId}`).toBe(chapter.regionId);
          expect(npc?.subregionId, `${binding.id}:${npcId}`).toBe(binding.entrySubregionId);
        }
        for (const routeId of binding.routeIds) {
          const route = routeById.get(routeId);
          expect(route, `${binding.id}:${routeId}`).toBeTruthy();
          expect(chapterRoutes.has(routeId), `${binding.id}:${routeId}`).toBe(true);
          expect([route?.fromRegionId, route?.toRegionId], `${binding.id}:${routeId}`).toContain(chapter.regionId);
        }
        for (const landingCase of binding.routeLandingCases ?? []) {
          const route = routeById.get(landingCase.routeId);
          expect(binding.routeIds).toContain(landingCase.routeId);
          expect(route?.landingSubregionIds?.[chapter.regionId], `${binding.id}:${landingCase.routeId}`).toBe(
            landingCase.landingSubregionId,
          );
          expect(entrySubregionIds.has(landingCase.landingSubregionId), binding.id).toBe(true);
        }
      }
    }
  });

  it('freezes Jiangnan M1.29 smoke bindings and lantern relationship hook coverage', () => {
    const jiangnan = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-jiangnan-baigong-homecoming');
    const qinhuaiHook = jiangnan?.orderHooks.find(
      (hook) => hook.source === 'activity' && hook.id === 'jn-qinhuai-lantern',
    );

    expect(jiangnan?.smokeBindings?.map((binding) => binding.entrySubregionId)).toEqual([
      'jiangnan-suhang',
      'jiangnan-jinling',
      'jiangnan-linan',
      'jiangnan-longquan',
      'jiangnan-taihu',
      'jiangnan-baigongyuan',
    ]);
    expect(new Set(jiangnan?.smokeBindings?.map((binding) => binding.id)).size).toBe(6);
    expect(jiangnan?.nextActions).not.toContain('补江南章节多入口 smokeBindings');
    expect(jiangnan?.nextActions).not.toContain('让灯市后续单继续读取作品与 NPC 关系');
    expect(qinhuaiHook).toMatchObject({
      readsItemState: true,
      readsNpcRelationship: true,
    });
  });
});
