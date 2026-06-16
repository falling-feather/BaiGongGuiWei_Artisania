import type { RegionChapterSpec, RegionChapterStatus } from '../data/regionChapters';
import type { GameContent } from './reducer';

export type RegionChapterReadiness = RegionChapterStatus | 'invalid';

export interface RegionChapterAuditRow {
  chapterId: string;
  regionId: string;
  title: string;
  status: RegionChapterStatus;
  readiness: RegionChapterReadiness;
  unknownReferences: string[];
  layoutGaps: string[];
  routeLandingGaps: string[];
  proposedHooks: string[];
  counts: {
    playPillars: number;
    participants: number;
    orderHooks: number;
    homeVisits: number;
    collabRecipes: number;
    escortEncounters: number;
    smokeScenarios: number;
    smokeBindings: number;
    itemStateReadingHooks: number;
    npcRelationshipReadingHooks: number;
  };
  nextActions: string[];
  gaps: string[];
}

export interface RegionChapterAudit {
  totalChapters: number;
  readyChapters: number;
  needsExpansionChapters: number;
  invalidChapters: number;
  rows: RegionChapterAuditRow[];
}

export interface RegionChapterAuditOptions {
  layoutSubregionIds?: readonly string[];
  smokeScenarioIds?: readonly string[];
}

export function buildRegionChapterAudit(
  chapters: readonly RegionChapterSpec[],
  content: GameContent,
  options: RegionChapterAuditOptions = {},
): RegionChapterAudit {
  const regionById = new Map((content.regions ?? []).map((region) => [region.id, region]));
  const activityById = new Map((content.activities ?? []).map((activity) => [activity.id, activity]));
  const craftIds = new Set((content.crafts ?? []).map((craft) => craft.id));
  const npcIds = new Set((content.npcs ?? []).map((npc) => npc.id));
  const routesById = new Map(
    (content.regionContent ?? []).flatMap((region) => region.routes.map((route) => [route.id, route] as const)),
  );
  const routeIds = new Set(routesById.keys());
  const homeVisitIds = new Set((content.homeVisits ?? []).map((visit) => visit.id));
  const collabRecipeIds = new Set((content.collabRecipes ?? []).map((recipe) => recipe.id));
  const escortEncounterIds = new Set((content.escortEncounters ?? []).map((encounter) => encounter.id));
  const layoutSubregionIds = new Set(options.layoutSubregionIds ?? []);
  const smokeScenarioIds = new Set(options.smokeScenarioIds ?? []);

  const rows = chapters.map((chapter) => {
    const region = regionById.get(chapter.regionId);
    const localSubregionIds = new Set(region?.subregions.map((subregion) => subregion.id) ?? []);
    const routeLandingGaps = chapter.playPillars.flatMap((pillar) =>
      (pillar.routeIds ?? []).flatMap((routeId) => {
        const route = routesById.get(routeId);
        if (!route) return [];
        if (route.fromRegionId !== chapter.regionId && route.toRegionId !== chapter.regionId) {
          return [`routeLandingRegion:${routeId}:${chapter.regionId}`];
        }
        const landingSubregionId = route.landingSubregionIds?.[chapter.regionId];
        if (!landingSubregionId) return [`routeLanding:${routeId}:${chapter.regionId}`];
        return localSubregionIds.has(landingSubregionId)
          ? []
          : [`routeLandingSubregion:${routeId}:${landingSubregionId}`];
      }),
    );
    const unknownReferences = [
      ...(regionById.has(chapter.regionId) ? [] : [`region:${chapter.regionId}`]),
      ...chapter.entrySubregionIds
        .filter((subregionId) => !localSubregionIds.has(subregionId))
        .map((subregionId) => `subregion:${subregionId}`),
      ...chapter.playPillars.flatMap((pillar) =>
        pillar.activityIds
          .filter((activityId) => activityById.get(activityId)?.regionId !== chapter.regionId)
          .map((activityId) => `activity:${activityId}`),
      ),
      ...chapter.playPillars.flatMap((pillar) =>
        (pillar.craftIds ?? []).filter((craftId) => !craftIds.has(craftId)).map((craftId) => `craft:${craftId}`),
      ),
      ...chapter.playPillars.flatMap((pillar) =>
        (pillar.routeIds ?? []).filter((routeId) => !routeIds.has(routeId)).map((routeId) => `route:${routeId}`),
      ),
      ...chapter.characterNpcIds
        .filter((participant) => !npcIds.has(participant.npcId))
        .map((participant) => `npc:${participant.npcId}`),
      ...chapter.homeVisitIds
        .filter((homeVisitId) => !homeVisitIds.has(homeVisitId))
        .map((homeVisitId) => `homeVisit:${homeVisitId}`),
      ...chapter.collabRecipeIds
        .filter((collabId) => !collabRecipeIds.has(collabId))
        .map((collabId) => `collab:${collabId}`),
      ...chapter.escortEncounterIds
        .filter((escortId) => !escortEncounterIds.has(escortId))
        .map((escortId) => `escort:${escortId}`),
      ...chapter.orderHooks.flatMap((hook) => {
        if (hook.source === 'activity') {
          return activityById.get(hook.id)?.regionId === chapter.regionId ? [] : [`orderHookActivity:${hook.id}`];
        }
        if (hook.source === 'homeVisit') {
          return homeVisitIds.has(hook.id) ? [] : [`orderHookHomeVisit:${hook.id}`];
        }
        if (hook.source === 'collab') {
          return collabRecipeIds.has(hook.id) ? [] : [`orderHookCollab:${hook.id}`];
        }
        if (hook.source === 'escort') {
          return escortEncounterIds.has(hook.id) ? [] : [`orderHookEscort:${hook.id}`];
        }
        return hook.id.startsWith('proposed-') && chapter.status === 'needs-expansion'
          ? []
          : [`orderHookProposed:${hook.id}`];
      }),
      ...chapter.smokeScenarioIds
        .filter((smokeScenarioId) => smokeScenarioIds.size > 0 && !smokeScenarioIds.has(smokeScenarioId))
        .map((smokeScenarioId) => `smoke:${smokeScenarioId}`),
      ...(chapter.smokeBindings ?? []).flatMap((binding) => {
        const bindingPrefix = `smokeBinding:${binding.id}`;
        return [
          ...(localSubregionIds.has(binding.entrySubregionId)
            ? []
            : [`${bindingPrefix}:entrySubregion:${binding.entrySubregionId}`]),
          ...binding.activityIds
            .filter((activityId) => activityById.get(activityId)?.regionId !== chapter.regionId)
            .map((activityId) => `${bindingPrefix}:activity:${activityId}`),
          ...binding.craftIds
            .filter((craftId) => !craftIds.has(craftId))
            .map((craftId) => `${bindingPrefix}:craft:${craftId}`),
          ...binding.npcIds
            .filter((npcId) => !npcIds.has(npcId))
            .map((npcId) => `${bindingPrefix}:npc:${npcId}`),
          ...binding.routeIds.flatMap((routeId) => {
            const route = routesById.get(routeId);
            if (!route) return [`${bindingPrefix}:route:${routeId}`];
            return route.fromRegionId === chapter.regionId || route.toRegionId === chapter.regionId
              ? []
              : [`${bindingPrefix}:routeRegion:${routeId}`];
          }),
          ...(binding.routeLandingCases ?? []).flatMap((landingCase) => {
            const route = routesById.get(landingCase.routeId);
            if (!route) return [`${bindingPrefix}:routeLandingRoute:${landingCase.routeId}`];
            const declaredLanding = route.landingSubregionIds?.[chapter.regionId];
            const landingMatches =
              declaredLanding === landingCase.landingSubregionId &&
              localSubregionIds.has(landingCase.landingSubregionId);
            return landingMatches
              ? []
              : [`${bindingPrefix}:routeLanding:${landingCase.routeId}:${landingCase.landingSubregionId}`];
          }),
        ];
      }),
      ...routeLandingGaps,
    ];
    const layoutGaps = chapter.entrySubregionIds
      .filter((subregionId) => layoutSubregionIds.size > 0 && !layoutSubregionIds.has(subregionId))
      .map((subregionId) => `layout-subregion:${subregionId}`);
    const proposedHooks = chapter.orderHooks
      .filter((hook) => hook.source === 'proposed')
      .map((hook) => hook.id);
    const readiness: RegionChapterReadiness = unknownReferences.length > 0 ? 'invalid' : chapter.status;

    return {
      chapterId: chapter.id,
      regionId: chapter.regionId,
      title: chapter.title,
      status: chapter.status,
      readiness,
      unknownReferences,
      layoutGaps,
      routeLandingGaps,
      proposedHooks,
      counts: {
        playPillars: chapter.playPillars.length,
        participants: chapter.characterNpcIds.length,
        orderHooks: chapter.orderHooks.length,
        homeVisits: chapter.homeVisitIds.length,
        collabRecipes: chapter.collabRecipeIds.length,
        escortEncounters: chapter.escortEncounterIds.length,
        smokeScenarios: chapter.smokeScenarioIds.length,
        smokeBindings: chapter.smokeBindings?.length ?? 0,
        itemStateReadingHooks: chapter.orderHooks.filter((hook) => hook.readsItemState).length,
        npcRelationshipReadingHooks: chapter.orderHooks.filter((hook) => hook.readsNpcRelationship).length,
      },
      nextActions: chapter.nextActions,
      gaps: chapter.gaps,
    };
  });

  return {
    totalChapters: rows.length,
    readyChapters: rows.filter((row) => row.readiness === 'chapter-ready').length,
    needsExpansionChapters: rows.filter((row) => row.readiness === 'needs-expansion').length,
    invalidChapters: rows.filter((row) => row.readiness === 'invalid').length,
    rows,
  };
}
