import {
  isPriorityJourneyMilestoneComplete,
  isPriorityJourneyStepComplete,
  type PriorityJourneyMilestone,
  type PriorityJourneyStep,
} from './priorityJourney';
import type { GameContent } from './reducer';
import type { GameState } from './types';

export interface PriorityScopeRequirementLike {
  regionId: string;
  tier: 'anchor' | 'skeleton';
  requiredCraftIds: string[];
  requiredActivityIds: string[];
  requiredNpcIds: string[];
  requiredLayoutSubregionIds: string[];
  requiredLoreEntryIds: string[];
}

export interface PriorityScopeJourneyMilestoneAudit {
  id: string;
  label: string;
  kind: PriorityJourneyMilestone['kind'];
  complete: boolean;
  hint: string;
}

export interface PriorityScopeJourneyStepAudit {
  id: string;
  regionId: string;
  title: string;
  summary: string;
  complete: boolean;
  active: boolean;
  completedMilestones: number;
  totalMilestones: number;
  milestones: PriorityScopeJourneyMilestoneAudit[];
}

export interface PriorityScopeRequirementAudit {
  regionId: string;
  tier: PriorityScopeRequirementLike['tier'];
  regionName: string;
  ready: boolean;
  missing: string[];
  counts: {
    crafts: number;
    activities: number;
    npcs: number;
    subregions: number;
    loreEntries: number;
  };
}

export interface PriorityScopeAudit {
  completedSteps: number;
  totalSteps: number;
  completedMilestones: number;
  totalMilestones: number;
  readyAnchorRegions: number;
  totalAnchorRegions: number;
  readySkeletonRegions: number;
  totalSkeletonRegions: number;
  journeySteps: PriorityScopeJourneyStepAudit[];
  requirements: PriorityScopeRequirementAudit[];
}

function missingIds(required: readonly string[], existing: ReadonlySet<string>, label: string): string[] {
  return required.filter((id) => !existing.has(id)).map((id) => `${label}:${id}`);
}

export function buildPriorityScopeAudit(
  state: GameState,
  steps: readonly PriorityJourneyStep[],
  scopeRequirements: readonly PriorityScopeRequirementLike[],
  content: GameContent,
): PriorityScopeAudit {
  const regionIds = new Set((content.regions ?? []).map((region) => region.id));
  const subregionIds = new Set(
    (content.regions ?? []).flatMap((region) => region.subregions.map((subregion) => subregion.id)),
  );
  const craftIds = new Set((content.crafts ?? []).map((craft) => craft.id));
  const activityIds = new Set((content.activities ?? []).map((activity) => activity.id));
  const npcIds = new Set((content.npcs ?? []).map((npc) => npc.id));
  const loreEntryIds = new Set((content.loreEntries ?? []).map((entry) => entry.id));
  const regionNameById = new Map((content.regions ?? []).map((region) => [region.id, region.name]));

  const journeySteps = steps.map((step, index) => {
    const milestones = step.milestones.map((milestone) => ({
      id: milestone.id,
      label: milestone.label,
      kind: milestone.kind,
      complete: isPriorityJourneyMilestoneComplete(state, milestone),
      hint: milestone.hint,
    }));
    const complete = isPriorityJourneyStepComplete(state, step);
    const active = !complete && steps.slice(0, index).every((entry) => isPriorityJourneyStepComplete(state, entry));

    return {
      id: step.id,
      regionId: step.regionId,
      title: step.title,
      summary: step.summary,
      complete,
      active,
      completedMilestones: milestones.filter((milestone) => milestone.complete).length,
      totalMilestones: milestones.length,
      milestones,
    };
  });

  const requirementRows = scopeRequirements.map((requirement) => {
    const missing = [
      ...missingIds([requirement.regionId], regionIds, 'region'),
      ...missingIds(requirement.requiredCraftIds, craftIds, 'craft'),
      ...missingIds(requirement.requiredActivityIds, activityIds, 'activity'),
      ...missingIds(requirement.requiredNpcIds, npcIds, 'npc'),
      ...missingIds(requirement.requiredLayoutSubregionIds, subregionIds, 'subregion'),
      ...missingIds(requirement.requiredLoreEntryIds, loreEntryIds, 'lore'),
    ];

    return {
      regionId: requirement.regionId,
      tier: requirement.tier,
      regionName: regionNameById.get(requirement.regionId) ?? requirement.regionId,
      ready: missing.length === 0,
      missing,
      counts: {
        crafts: requirement.requiredCraftIds.length,
        activities: requirement.requiredActivityIds.length,
        npcs: requirement.requiredNpcIds.length,
        subregions: requirement.requiredLayoutSubregionIds.length,
        loreEntries: requirement.requiredLoreEntryIds.length,
      },
    };
  });

  return {
    completedSteps: journeySteps.filter((step) => step.complete).length,
    totalSteps: journeySteps.length,
    completedMilestones: journeySteps.reduce((sum, step) => sum + step.completedMilestones, 0),
    totalMilestones: journeySteps.reduce((sum, step) => sum + step.totalMilestones, 0),
    readyAnchorRegions: requirementRows.filter((row) => row.tier === 'anchor' && row.ready).length,
    totalAnchorRegions: requirementRows.filter((row) => row.tier === 'anchor').length,
    readySkeletonRegions: requirementRows.filter((row) => row.tier === 'skeleton' && row.ready).length,
    totalSkeletonRegions: requirementRows.filter((row) => row.tier === 'skeleton').length,
    journeySteps,
    requirements: requirementRows,
  };
}
