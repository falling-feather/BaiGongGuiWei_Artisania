import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_CHALLENGES,
  ACTIVITY_INDEX,
  ALL_NPCS,
  CRAFTS,
  CRAFT_INTERACTIONS,
  LORE_ENTRIES,
  PRIORITY_ANCHOR_REGION_IDS,
  PRIORITY_ART_ASSET_MANIFEST,
  PRIORITY_JOURNEY_STEPS,
  PRIORITY_SCOPE_REGION_IDS,
  PRIORITY_SCOPE_REQUIREMENTS,
  PRIORITY_SKELETON_REGION_IDS,
  REGIONS,
  REGION_ROUTES,
  RUNTIME_MAP_LAYOUTS,
} from '..';

describe('current priority scope guard', () => {
  const regionIds = new Set(REGIONS.map((region) => region.id));
  const craftIds = new Set(CRAFTS.map((craft) => craft.id));
  const interactionCraftIds = new Set(CRAFT_INTERACTIONS.map((interaction) => interaction.craftId));
  const activityIds = new Set(Object.keys(ACTIVITY_INDEX));
  const challengedActivityIds = new Set(ACTIVITY_CHALLENGES.map((challenge) => challenge.activityId));
  const npcIds = new Set(ALL_NPCS.map((npc) => npc.id));
  const loreIds = new Set(LORE_ENTRIES.map((entry) => entry.id));
  const layoutSubregionIds = new Set(RUNTIME_MAP_LAYOUTS.map((layout) => layout.subregionId));
  const layoutBySubregionId = new Map(RUNTIME_MAP_LAYOUTS.map((layout) => [layout.subregionId, layout]));

  function reachableRegionsFrom(startRegionId: string): Set<string> {
    const reached = new Set([startRegionId]);
    const queue = [startRegionId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      for (const route of REGION_ROUTES) {
        const next =
          route.fromRegionId === current ? route.toRegionId : route.toRegionId === current ? route.fromRegionId : null;
        if (next && !reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    return reached;
  }

  it('partitions the 11 regions into five anchor regions and six skeleton regions', () => {
    expect(PRIORITY_ANCHOR_REGION_IDS).toEqual(['jiangnan', 'bashu', 'lingnan', 'ganpo', 'xiyu']);
    expect(PRIORITY_SKELETON_REGION_IDS).toEqual([
      'qiandian',
      'jingchu',
      'huizhou',
      'jingji',
      'sanjin',
      'xueyu',
    ]);
    expect(new Set(PRIORITY_SCOPE_REGION_IDS)).toEqual(regionIds);
  });

  it('keeps every scoped region connected to data, craft specs, NPCs, lore and a shipped layout', () => {
    const errors: string[] = [];

    for (const requirement of PRIORITY_SCOPE_REQUIREMENTS) {
      if (!regionIds.has(requirement.regionId)) errors.push(`${requirement.regionId}: missing region`);

      for (const craftId of requirement.requiredCraftIds) {
        if (!craftIds.has(craftId)) errors.push(`${requirement.regionId}: missing craft ${craftId}`);
        if (!interactionCraftIds.has(craftId)) {
          errors.push(`${requirement.regionId}: missing craft interaction ${craftId}`);
        }
      }

      for (const activityId of requirement.requiredActivityIds) {
        if (!activityIds.has(activityId)) errors.push(`${requirement.regionId}: missing activity ${activityId}`);
        if (!challengedActivityIds.has(activityId)) {
          errors.push(`${requirement.regionId}: missing activity challenge ${activityId}`);
        }
      }

      for (const npcId of requirement.requiredNpcIds) {
        const npc = ALL_NPCS.find((entry) => entry.id === npcId);
        if (!npcIds.has(npcId)) errors.push(`${requirement.regionId}: missing NPC ${npcId}`);
        if (npc && npc.regionId !== requirement.regionId) {
          errors.push(`${requirement.regionId}: NPC ${npcId} belongs to ${npc.regionId}`);
        }
        if (npc && (npc.functions?.length ?? 0) === 0 && (npc.intel?.length ?? 0) === 0) {
          errors.push(`${requirement.regionId}: NPC ${npcId} has no function or intel`);
        }
      }

      for (const subregionId of requirement.requiredLayoutSubregionIds) {
        if (!layoutSubregionIds.has(subregionId)) {
          errors.push(`${requirement.regionId}: missing runtime layout ${subregionId}`);
        }
      }

      for (const loreId of requirement.requiredLoreEntryIds) {
        if (!loreIds.has(loreId)) errors.push(`${requirement.regionId}: missing lore entry ${loreId}`);
      }
    }

    expect(errors).toEqual([]);
  });

  it('keeps first-pass art manifest keys unique and backed by scoped data ids', () => {
    const errors: string[] = [];
    const keys = new Set<string>();

    for (const entry of PRIORITY_ART_ASSET_MANIFEST) {
      if (keys.has(entry.key)) errors.push(`duplicate asset key ${entry.key}`);
      keys.add(entry.key);

      if (entry.regionId && !regionIds.has(entry.regionId)) errors.push(`${entry.key}: missing region ${entry.regionId}`);
      if (entry.npcId && !npcIds.has(entry.npcId)) errors.push(`${entry.key}: missing NPC ${entry.npcId}`);
      if (entry.craftId && !craftIds.has(entry.craftId)) errors.push(`${entry.key}: missing craft ${entry.craftId}`);
      if (entry.activityId && !activityIds.has(entry.activityId)) {
        errors.push(`${entry.key}: missing activity ${entry.activityId}`);
      }

      expect(entry.fileName).toMatch(/^[a-z0-9._/-]+\.png$/);
    }

    for (const regionId of PRIORITY_ANCHOR_REGION_IDS) {
      for (const slot of ['master', 'streetTiles', 'buildings', 'props', 'characters', 'portraits', 'craftTools']) {
        expect(keys.has(`region.${regionId}.${slot}`), `${regionId}:${slot}`).toBe(true);
      }
    }

    for (const regionId of PRIORITY_SKELETON_REGION_IDS) {
      for (const slot of ['master', 'buildings', 'portraits']) {
        expect(keys.has(`region.${regionId}.${slot}`), `${regionId}:${slot}`).toBe(true);
      }
    }

    expect(errors).toEqual([]);
  });

  it('keeps priority regions reachable through the route graph and shipped layouts with gates', () => {
    const errors: string[] = [];
    const reachable = reachableRegionsFrom('jiangnan');

    for (const regionId of PRIORITY_SCOPE_REGION_IDS) {
      if (!reachable.has(regionId)) errors.push(`${regionId}: not reachable from jiangnan route graph`);
    }

    for (const requirement of PRIORITY_SCOPE_REQUIREMENTS) {
      for (const subregionId of requirement.requiredLayoutSubregionIds) {
        const layout = layoutBySubregionId.get(subregionId);
        if (!layout) continue;
        const hasGate = layout.objects.some(
          (object) => object.interaction === 'gate' || object.interaction === 'subregionGate',
        );
        if (!hasGate) errors.push(`${subregionId}: priority layout has no gate object`);
      }
    }

    expect(errors).toEqual([]);
  });

  it('keeps anchor region festival activities as complete stall chains', () => {
    const errors: string[] = [];

    for (const requirement of PRIORITY_SCOPE_REQUIREMENTS.filter((entry) => entry.tier === 'anchor')) {
      for (const activityId of requirement.requiredActivityIds) {
        const activity = ACTIVITY_INDEX[activityId];
        const stall = activity?.reward.stall;

        if (!activity) {
          errors.push(`${requirement.regionId}: missing anchor activity ${activityId}`);
          continue;
        }
        if (!stall) {
          errors.push(`${activityId}: missing stall reward`);
          continue;
        }

        if ((stall.stages?.length ?? 0) < 3) errors.push(`${activityId}: needs at least three stall stages`);
        if ((stall.customers?.length ?? 0) < 3) errors.push(`${activityId}: needs at least three customer groups`);
        if ((stall.combos?.length ?? 0) < 3) errors.push(`${activityId}: needs at least three combos`);
        if ((stall.strategies?.length ?? 0) < 3) errors.push(`${activityId}: needs at least three strategies`);
        if ((stall.closingChoices?.length ?? 0) < 3) {
          errors.push(`${activityId}: needs at least three closing choices`);
        }
        if (!stall.closingChoices?.some((choice) => choice.followUpOrder)) {
          errors.push(`${activityId}: needs a closing follow-up order`);
        }
        if (!activity.reward.generatedOrder) errors.push(`${activityId}: needs an immediate generated order`);
      }
    }

    expect(errors).toEqual([]);
  });

  it('keeps priority journey milestones backed by scoped content ids', () => {
    const errors: string[] = [];
    const anchorRegions = new Set(PRIORITY_ANCHOR_REGION_IDS);

    expect(PRIORITY_JOURNEY_STEPS.map((step) => step.regionId)).toEqual(PRIORITY_ANCHOR_REGION_IDS);

    for (const step of PRIORITY_JOURNEY_STEPS) {
      if (!anchorRegions.has(step.regionId)) errors.push(`${step.id}: region is not an anchor`);
      if (step.milestones.length < 2) errors.push(`${step.id}: needs at least two milestones`);

      for (const milestone of step.milestones) {
        if (!loreIds.has(milestone.targetLoreEntryId)) {
          errors.push(`${milestone.id}: missing target lore ${milestone.targetLoreEntryId}`);
        }

        if (milestone.kind === 'anyCraftProduced' || milestone.kind === 'allCraftProduced') {
          for (const craftId of milestone.ids) {
            if (!craftIds.has(craftId)) errors.push(`${milestone.id}: missing craft ${craftId}`);
          }
        }

        if (milestone.kind === 'completedActivities') {
          for (const activityId of milestone.ids) {
            if (!activityIds.has(activityId)) errors.push(`${milestone.id}: missing activity ${activityId}`);
          }
        }

        if (milestone.kind === 'flags') {
          if (!milestone.activityId) errors.push(`${milestone.id}: flag milestone needs activityId`);
          if (milestone.activityId && !activityIds.has(milestone.activityId)) {
            errors.push(`${milestone.id}: missing activity ${milestone.activityId}`);
          }
          for (const flag of milestone.ids) {
            if (!flag.startsWith('stall-chain-completed:')) {
              errors.push(`${milestone.id}: non-stall completion flag ${flag}`);
            }
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });
});
