import { describe, expect, it } from 'vitest';
import { ALL_NPCS, CRAFTS, CRAFT_INTERACTIONS, REGIONS, RESOURCE_INDEX, WORKSHOP_UPGRADES } from '..';

describe('工艺交互规格数据', () => {
  const craftById = new Map(CRAFTS.map((craft) => [craft.id, craft]));
  const regionById = new Map(REGIONS.map((region) => [region.id, region]));

  it('11 个大地区都有一门代表工艺交互规格', () => {
    const covered = new Set(CRAFT_INTERACTIONS.map((spec) => spec.regionId));
    const missing = REGIONS.filter((region) => !covered.has(region.id)).map((region) => region.id);

    expect(missing).toEqual([]);
  });

  it('每条工艺交互规格都能指向现有工艺、工坊小地区和真实工序', () => {
    const errors: string[] = [];

    for (const spec of CRAFT_INTERACTIONS) {
      const craft = craftById.get(spec.craftId);
      const region = regionById.get(spec.regionId);
      const subregion = region?.subregions.find((entry) => entry.id === spec.workshopSubregionId);
      const processStepIds = new Set(craft?.processChain.map((step) => step.id) ?? []);

      if (!craft) errors.push(`${spec.id} 缺少工艺 ${spec.craftId}`);
      if (!region) errors.push(`${spec.id} 缺少地区 ${spec.regionId}`);
      if (!subregion) errors.push(`${spec.id} 缺少工坊小地区 ${spec.workshopSubregionId}`);

      for (const stage of spec.stages) {
        for (const stepId of stage.processStepIds) {
          if (!processStepIds.has(stepId)) errors.push(`${spec.id}/${stage.id} 指向不存在的工序 ${stepId}`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it('西域艾德莱斯绸拥有独立织坊工艺规格', () => {
    const spec = CRAFT_INTERACTIONS.find((entry) => entry.craftId === 'atlas-silk');
    const processStepIds = new Set(craftById.get('atlas-silk')?.processChain.map((step) => step.id) ?? []);

    expect(spec).toMatchObject({
      id: 'interaction-atlas-silk',
      regionId: 'xiyu',
      workshopSubregionId: 'xiyu-atlas-loom',
      mentorNpcIds: ['xu-guli'],
    });
    expect(spec?.stages.map((stage) => stage.id)).toEqual([
      'atlas-prepare-warp',
      'atlas-tie-dye-warp',
      'atlas-weave-finish',
    ]);
    expect(spec?.stages.flatMap((stage) => stage.processStepIds).every((stepId) => processStepIds.has(stepId))).toBe(
      true,
    );
    expect(spec?.defects.map((defect) => defect.id)).toEqual([
      'atlas-muddy-dye',
      'atlas-broken-pattern',
      'atlas-loose-selvedge',
    ]);
    expect(spec?.repairOptions.map((option) => option.id)).toEqual([
      'atlas-rinse-redye',
      'atlas-retie-warp',
      'atlas-tighten-selvedge',
    ]);
    expect(spec?.orderHooks?.join('')).toContain('巴扎织物复单');
  });

  it('缺陷都能找到对应返修方案', () => {
    const errors: string[] = [];

    for (const spec of CRAFT_INTERACTIONS) {
      const repairOptionIds = new Set(spec.repairOptions.map((option) => option.id));
      for (const defect of spec.defects) {
        if (defect.repairOptionIds.length === 0) errors.push(`${spec.id}/${defect.id} 没有返修方案`);
        for (const optionId of defect.repairOptionIds) {
          if (!repairOptionIds.has(optionId)) errors.push(`${spec.id}/${defect.id} 指向不存在的返修方案 ${optionId}`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it('师承入口都能指向现有 NPC', () => {
    const npcIds = new Set(ALL_NPCS.map((npc) => npc.id));
    const errors: string[] = [];

    for (const spec of CRAFT_INTERACTIONS) {
      for (const npcId of spec.mentorNpcIds ?? []) {
        if (!npcIds.has(npcId)) errors.push(`${spec.id} 指向不存在的师傅 NPC ${npcId}`);
      }
    }

    expect(errors).toEqual([]);
  });

  it('工坊升级都能指向现有工艺并覆盖 11 个大地区代表链', () => {
    const errors: string[] = [];
    const upgradeIds = new Set<string>();
    const systemResourceIds = new Set(['coin', 'labor']);
    const interactionRegionByCraft = new Map(CRAFT_INTERACTIONS.map((spec) => [spec.craftId, spec.regionId]));
    const coveredRegions = new Set<string>();

    for (const upgrade of WORKSHOP_UPGRADES) {
      const craft = craftById.get(upgrade.craftId);
      const costTotal = Object.values(upgrade.cost).reduce((sum, amount) => sum + amount, 0);
      const hasRuntimeEffect = Boolean(
        upgrade.effects.qualityDelta ||
          upgrade.effects.laborDiscount ||
          upgrade.effects.defectSeverityReduction ||
          upgrade.effects.craftMetrics ||
          upgrade.effects.metrics,
      );

      if (upgradeIds.has(upgrade.id)) errors.push(`${upgrade.id} 重复`);
      upgradeIds.add(upgrade.id);
      if (!craft) errors.push(`${upgrade.id} 缺少工艺 ${upgrade.craftId}`);
      if (costTotal <= 0) errors.push(`${upgrade.id} 没有升级成本`);
      for (const resourceId of Object.keys(upgrade.cost)) {
        if (!RESOURCE_INDEX[resourceId] && !systemResourceIds.has(resourceId)) {
          errors.push(`${upgrade.id} 成本指向不存在的资源 ${resourceId}`);
        }
      }
      if (!hasRuntimeEffect) errors.push(`${upgrade.id} 没有可结算效果`);
      const regionId = interactionRegionByCraft.get(upgrade.craftId);
      if (regionId) coveredRegions.add(regionId);
    }

    const missingRegions = REGIONS.filter((region) => !coveredRegions.has(region.id)).map((region) => region.id);
    expect(errors).toEqual([]);
    expect(missingRegions).toEqual([]);
  });

  it('二阶工坊升级必须显式依赖同工艺的低阶升级', () => {
    const errors: string[] = [];
    const upgradeById = new Map(WORKSHOP_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
    const tierTwoByRegion = new Set<string>();
    const interactionRegionByCraft = new Map(CRAFT_INTERACTIONS.map((spec) => [spec.craftId, spec.regionId]));

    for (const upgrade of WORKSHOP_UPGRADES.filter((entry) => entry.tier > 1)) {
      const prereqIds = upgrade.requirements?.upgrades ?? [];
      if (prereqIds.length === 0) errors.push(`${upgrade.id} 缺少前置升级`);
      for (const prereqId of prereqIds) {
        const prereq = upgradeById.get(prereqId);
        if (!prereq) {
          errors.push(`${upgrade.id} 前置升级不存在 ${prereqId}`);
          continue;
        }
        if (prereq.craftId !== upgrade.craftId) errors.push(`${upgrade.id} 前置升级不属于同一工艺`);
        if (prereq.tier >= upgrade.tier) errors.push(`${upgrade.id} 前置升级层级不低于自身`);
      }
      const regionId = interactionRegionByCraft.get(upgrade.craftId);
      if (regionId) tierTwoByRegion.add(regionId);
    }

    const missingRegions = REGIONS.filter((region) => !tierTwoByRegion.has(region.id)).map((region) => region.id);
    expect(errors).toEqual([]);
    expect(missingRegions).toEqual([]);
  });
});
