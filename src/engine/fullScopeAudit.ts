import type {
  FullScopeMinimums,
  FullScopePriorityTier,
  FullScopeRegionRequirement,
} from '../data/fullScope';
import type { GameContent } from './reducer';

export type FullScopeReadiness = 'ready' | 'partial' | 'gap';

export interface FullScopeAuditCounts {
  subregions: number;
  scopedSubregions: number;
  npcs: number;
  activities: number;
  routes: number;
  signatureCrafts: number;
  craftInteractions: number;
  workshopUpgrades: number;
  layoutSubregions: number;
  loreEntries: number;
  orderHooks: number;
  collabRecipes: number;
  homeVisits: number;
  escortEncounters: number;
}

export interface FullScopeAuditRegionRow {
  regionId: string;
  regionName: string;
  tier: FullScopePriorityTier;
  m1Group: string;
  chapterGoal: string;
  playPillars: string[];
  targetMinimums: FullScopeMinimums;
  counts: FullScopeAuditCounts;
  readiness: FullScopeReadiness;
  gaps: string[];
  unknownReferences: string[];
  signatureCraftsWithoutInteraction: string[];
  m1Actions: string[];
}

export interface FullScopeAudit {
  totalRegions: number;
  readyRegions: number;
  partialRegions: number;
  gapRegions: number;
  rows: FullScopeAuditRegionRow[];
}

export interface FullScopeAuditOptions {
  layoutSubregionIds?: readonly string[];
}

function countBelow(actual: number, expected: number, label: string): string[] {
  return actual < expected ? [`${label}:${actual}/${expected}`] : [];
}

function readinessFor(gaps: readonly string[], unknownReferences: readonly string[]): FullScopeReadiness {
  if (unknownReferences.length > 0) {
    return 'gap';
  }
  if (gaps.length === 0) {
    return 'ready';
  }
  return gaps.length <= 3 ? 'partial' : 'gap';
}

export function buildFullScopeAudit(
  requirements: readonly FullScopeRegionRequirement[],
  content: GameContent,
  options: FullScopeAuditOptions = {},
): FullScopeAudit {
  const regionById = new Map((content.regions ?? []).map((region) => [region.id, region]));
  const craftIds = new Set((content.crafts ?? []).map((craft) => craft.id));
  const npcIds = new Set((content.npcs ?? []).map((npc) => npc.id));
  const activityIds = new Set((content.activities ?? []).map((activity) => activity.id));
  const layoutSubregionIds = new Set(options.layoutSubregionIds ?? []);

  const rows = requirements.map((requirement) => {
    const region = regionById.get(requirement.regionId);
    const regionSubregionIds = new Set(region?.subregions.map((subregion) => subregion.id) ?? []);
    const regionSignatureCraftIds = region?.signatureCrafts ?? [];
    const regionCraftIds = new Set(regionSignatureCraftIds.filter((craftId) => craftIds.has(craftId)));
    const regionContent = (content.regionContent ?? []).find((entry) => entry.regionId === requirement.regionId);
    const scopedSubregions = (content.subregionContent ?? []).filter((entry) => entry.regionId === requirement.regionId);
    const npcs = (content.npcs ?? []).filter((npc) => npc.regionId === requirement.regionId);
    const activities = (content.activities ?? []).filter((activity) => activity.regionId === requirement.regionId);
    const craftInteractions = (content.craftInteractions ?? []).filter(
      (interaction) => interaction.regionId === requirement.regionId,
    );
    const workshopUpgrades = (content.workshopUpgrades ?? []).filter((upgrade) =>
      regionCraftIds.has(upgrade.craftId),
    );
    const loreEntries = (content.loreEntries ?? []).filter(
      (entry) =>
        entry.regionId === requirement.regionId ||
        (entry.subregionId !== undefined && regionSubregionIds.has(entry.subregionId)) ||
        (entry.craftId !== undefined && regionCraftIds.has(entry.craftId)),
    );
    const collabRecipes = (content.collabRecipes ?? []).filter((recipe) =>
      (recipe.craftIds ?? []).some((craftId) => regionCraftIds.has(craftId)),
    );
    const homeVisits = (content.homeVisits ?? []).filter((visit) => npcIds.has(visit.npcId));
    const regionHomeVisits = homeVisits.filter((visit) => npcs.some((npc) => npc.id === visit.npcId));
    const routeIds = new Set(regionContent?.routes.map((route) => route.id) ?? []);
    const escortEncounters = (content.escortEncounters ?? []).filter((encounter) =>
      encounter.routeIds.some((routeId) => routeIds.has(routeId)),
    );
    const activityOrderHooks = activities.filter((activity) => activity.reward.generatedOrder).length;
    const craftOrderHooks = craftInteractions.reduce((sum, interaction) => sum + (interaction.orderHooks?.length ?? 0), 0);
    const signatureCraftsWithInteraction = new Set(craftInteractions.map((interaction) => interaction.craftId));
    const signatureCraftsWithoutInteraction = regionSignatureCraftIds.filter(
      (craftId) => craftIds.has(craftId) && !signatureCraftsWithInteraction.has(craftId),
    );
    const layoutCount = [...layoutSubregionIds].filter((subregionId) => regionSubregionIds.has(subregionId)).length;

    const counts: FullScopeAuditCounts = {
      subregions: region?.subregions.length ?? 0,
      scopedSubregions: scopedSubregions.length,
      npcs: npcs.length,
      activities: activities.length,
      routes: regionContent?.routes.length ?? 0,
      signatureCrafts: regionSignatureCraftIds.length,
      craftInteractions: craftInteractions.length,
      workshopUpgrades: workshopUpgrades.length,
      layoutSubregions: layoutCount,
      loreEntries: loreEntries.length,
      orderHooks: activityOrderHooks + craftOrderHooks,
      collabRecipes: collabRecipes.length,
      homeVisits: regionHomeVisits.length,
      escortEncounters: escortEncounters.length,
    };

    const unknownReferences = [
      ...(region ? [] : [`region:${requirement.regionId}`]),
      ...regionSignatureCraftIds.filter((craftId) => !craftIds.has(craftId)).map((craftId) => `craft:${craftId}`),
      ...(regionContent?.activityIds ?? [])
        .filter((activityId) => !activityIds.has(activityId))
        .map((activityId) => `activity:${activityId}`),
      ...(regionContent?.mainNpcIds ?? []).filter((npcId) => !npcIds.has(npcId)).map((npcId) => `npc:${npcId}`),
      ...scopedSubregions
        .filter((entry) => !regionSubregionIds.has(entry.subregionId))
        .map((entry) => `subregion:${entry.subregionId}`),
      ...scopedSubregions
        .flatMap((entry) => entry.craftIds)
        .filter((craftId) => !craftIds.has(craftId))
        .map((craftId) => `craft:${craftId}`),
      ...craftInteractions
        .filter((interaction) => !craftIds.has(interaction.craftId))
        .map((interaction) => `craft-interaction-craft:${interaction.craftId}`),
      ...craftInteractions
        .filter((interaction) => !regionSubregionIds.has(interaction.workshopSubregionId))
        .map((interaction) => `craft-interaction-subregion:${interaction.workshopSubregionId}`),
      ...craftInteractions
        .flatMap((interaction) => interaction.mentorNpcIds ?? [])
        .filter((npcId) => !npcIds.has(npcId))
        .map((npcId) => `craft-interaction-mentor:${npcId}`),
    ];
    const gaps = [
      ...countBelow(counts.npcs, requirement.targetMinimums.npcCount, 'npc'),
      ...countBelow(counts.activities, requirement.targetMinimums.activityCount, 'activity'),
      ...countBelow(
        counts.craftInteractions,
        requirement.targetMinimums.craftInteractionCount,
        'craft-interaction',
      ),
      ...countBelow(counts.workshopUpgrades, requirement.targetMinimums.workshopUpgradeCount, 'workshop-upgrade'),
      ...countBelow(counts.routes, requirement.targetMinimums.routeCount, 'route'),
      ...countBelow(counts.layoutSubregions, requirement.targetMinimums.layoutSubregionCount, 'layout-subregion'),
      ...countBelow(counts.loreEntries, requirement.targetMinimums.loreEntryCount, 'lore'),
      ...countBelow(counts.orderHooks, requirement.targetMinimums.orderHookCount, 'order-hook'),
      ...signatureCraftsWithoutInteraction.map((craftId) => `signature-craft-without-interaction:${craftId}`),
    ];

    return {
      regionId: requirement.regionId,
      regionName: region?.name ?? requirement.regionId,
      tier: requirement.tier,
      m1Group: requirement.m1Group,
      chapterGoal: requirement.chapterGoal,
      playPillars: requirement.playPillars,
      targetMinimums: requirement.targetMinimums,
      counts,
      readiness: readinessFor(gaps, unknownReferences),
      gaps,
      unknownReferences,
      signatureCraftsWithoutInteraction,
      m1Actions: requirement.m1Actions,
    };
  });

  return {
    totalRegions: rows.length,
    readyRegions: rows.filter((row) => row.readiness === 'ready').length,
    partialRegions: rows.filter((row) => row.readiness === 'partial').length,
    gapRegions: rows.filter((row) => row.readiness === 'gap').length,
    rows,
  };
}
