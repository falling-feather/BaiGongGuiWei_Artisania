import { describe, expect, it } from 'vitest';
import { CRAFTS, REGIONS, RUNTIME_MAP_LAYOUTS, STARTING_APPRENTICES } from '../../data';
import { createInitialState } from '../../engine';
import { buildRegionSpec } from '../regionSpec';
import { isCurrentStreetSubregionGate } from '../navigationGuards';

function longquanWorkshopState() {
  const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
  return {
    ...base,
    currentRegion: 'jiangnan',
    currentSubregion: 'jiangnan-longquan',
    resources: { ...base.resources, coin: 100, labor: 20, ironIngot: 4, coal: 4, treasureSword: 1 },
    crafts: base.crafts.map((craft) =>
      craft.craftId === 'longquan-sword' ? { ...craft, produced: 3 } : craft,
    ),
    regionReputation: { ...base.regionReputation, jiangnan: 12 },
    profile: {
      ...base.profile,
      attributes: { ...base.profile.attributes, craft: 3 },
    },
    workshopUpgrades: [
      {
        id: 'upgrade-longquan-quench-trough',
        craftId: 'longquan-sword',
        title: '温槽校火',
        kind: 'tool' as const,
        tier: 1,
        day: base.calendar.day,
        phase: base.calendar.phase,
        maintenancePaid: 0,
        maintenanceMissed: 0,
      },
    ],
  };
}

describe('regionSpec workshop summaries', () => {
  it('marks craft points with workshop capacity and expansion readiness', () => {
    const spec = buildRegionSpec('jiangnan', longquanWorkshopState());
    const sword = spec?.crafts.find((craft) => craft.id === 'longquan-sword');

    expect(sword?.workshop).toMatchObject({
      usedSpace: 1,
      capacity: 1,
      installedUpgrades: 1,
      totalUpgrades: 2,
      availableUpgrades: 0,
      needsExpansion: true,
      canExpand: true,
    });
  });

  it('marks tier-two workshop upgrades as available after local space expansion', () => {
    const state = longquanWorkshopState();
    const spec = buildRegionSpec('jiangnan', {
      ...state,
      workshopSpaces: [
        {
          craftId: 'longquan-sword',
          capacity: 2,
          expansions: 1,
          day: state.calendar.day,
          phase: state.calendar.phase,
        },
      ],
    });
    const sword = spec?.crafts.find((craft) => craft.id === 'longquan-sword');

    expect(sword?.workshop).toMatchObject({
      usedSpace: 1,
      capacity: 2,
      installedUpgrades: 1,
      totalUpgrades: 2,
      availableUpgrades: 1,
      needsExpansion: false,
      canExpand: true,
    });
  });
});

describe('runtime map layouts', () => {
  it('attaches manual editor-compatible layout to street specs', () => {
    const state = longquanWorkshopState();
    const spec = buildRegionSpec('jiangnan', state);

    expect(spec?.layout).toMatchObject({
      schema: 'artisania-map-editor/v2',
      regionId: 'jiangnan',
      subregionId: 'jiangnan-longquan',
      size: { w: 58, h: 28 },
    });
    expect(spec?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'longquan-sword', x: 16, y: 16 }),
        expect.objectContaining({ interaction: 'craft', targetId: 'celadon', x: 35, y: 16 }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jiangnan-suhang' }),
      ]),
    );
    expect(spec?.npcs.find((npc) => npc.id === 'jn-ye-qingzhan')).toMatchObject({
      tileX: 38,
      tileY: 20,
    });
  });

  it('attaches M1.17 Suhang and Baigongyuan layouts to Jiangnan street specs', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const suhang = buildRegionSpec('jiangnan', {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-suhang',
    });
    const baigongyuan = buildRegionSpec('jiangnan', {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-baigongyuan',
    });

    expect(suhang?.layout).toMatchObject({ subregionId: 'jiangnan-suhang', size: { w: 58, h: 28 } });
    expect(suhang?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-indigo' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'bamboo-weaving' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-indigo-keeper' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jiangnan-baigongyuan' }),
      ]),
    );
    expect(baigongyuan?.layout).toMatchObject({ subregionId: 'jiangnan-baigongyuan', size: { w: 58, h: 28 } });
    expect(baigongyuan?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'indigo-dyeing' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'jn-yard-fields' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-xiaoman' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jiangnan-suhang' }),
      ]),
    );
  });

  it('attaches M1.18 Huizhou ink alley layout to the local street spec', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const inkAlley = buildRegionSpec('huizhou', {
      ...base,
      currentRegion: 'huizhou',
      currentSubregion: 'huizhou-ink-alley',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'huizhou', 'jiangnan', 'ganpo'])],
    });

    expect(inkAlley?.layout).toMatchObject({ subregionId: 'huizhou-ink-alley', size: { w: 56, h: 30 } });
    expect(inkAlley?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-pine-soot' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'make-ink' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'hui-ink' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'hz-ink-workshop' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'hz-cheng-moshou' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'huizhou-paper-valley' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'huizhou-merchant-hall' }),
      ]),
    );
    expect(inkAlley?.npcs.find((npc) => npc.id === 'hz-cheng-moshou')).toMatchObject({
      tileX: 30,
      tileY: 20,
    });
    expect(inkAlley?.activities.some((activity) => activity.id === 'hz-ink-workshop')).toBe(true);
    expect(inkAlley?.crafts.some((craft) => craft.id === 'hui-ink')).toBe(true);
  });

  it('attaches M1.19 Huizhou She stone layout to the local street spec', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const sheStone = buildRegionSpec('huizhou', {
      ...base,
      currentRegion: 'huizhou',
      currentSubregion: 'huizhou-she-stone',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'huizhou', 'jiangnan', 'ganpo'])],
    });

    expect(sheStone?.layout).toMatchObject({ subregionId: 'huizhou-she-stone', size: { w: 56, h: 30 } });
    expect(sheStone?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-she-stone' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'she-inkstone' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'hz-she-stone-pit' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'hz-xu-yanshi' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'huizhou-paper-valley' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'huizhou-ink-alley' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'huizhou-merchant-hall' }),
      ]),
    );
    expect(sheStone?.industries.some((industry) => industry.id === 'harvest-she-stone')).toBe(true);
    expect(sheStone?.npcs.find((npc) => npc.id === 'hz-xu-yanshi')).toMatchObject({
      tileX: 30,
      tileY: 20,
    });
    expect(sheStone?.activities.some((activity) => activity.id === 'hz-she-stone-pit')).toBe(true);
    expect(sheStone?.crafts.some((craft) => craft.id === 'she-inkstone')).toBe(true);
  });

  it('attaches M1.20 Bashu Linqiong iron layout to the local street spec', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const linqiong = buildRegionSpec('bashu', {
      ...base,
      currentRegion: 'bashu',
      currentSubregion: 'bashu-linqiong-iron',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'bashu', 'qiandian', 'jingchu', 'xueyu'])],
    });

    expect(linqiong?.layout).toMatchObject({ subregionId: 'bashu-linqiong-iron', size: { w: 56, h: 30 } });
    expect(linqiong?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-iron-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'smelt-iron' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'bs-linqiong-forge' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'bs-deng-lusheng' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'bashu-jinli' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'bashu-bamboo-sea' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'bashu-tea-horse' }),
      ]),
    );
    expect(linqiong?.industries.map((industry) => industry.id)).toEqual(
      expect.arrayContaining(['harvest-iron-ore', 'smelt-iron']),
    );
    expect(linqiong?.npcs.find((npc) => npc.id === 'bs-deng-lusheng')).toMatchObject({
      tileX: 30,
      tileY: 20,
    });
    expect(linqiong?.activities.some((activity) => activity.id === 'bs-linqiong-forge')).toBe(true);
  });

  it('only references live street targets from manual layouts', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const errors: string[] = [];

    for (const layout of RUNTIME_MAP_LAYOUTS) {
      const spec = buildRegionSpec(layout.regionId, {
        ...base,
        currentRegion: layout.regionId,
        currentSubregion: layout.subregionId,
      });
      if (!spec) {
        errors.push(`${layout.regionId}/${layout.subregionId}: no region spec`);
        continue;
      }
      const targets = {
        industry: new Set(spec.industries.map((item) => item.id)),
        craft: new Set(spec.crafts.map((item) => item.id)),
        activity: new Set(spec.activities.map((item) => item.id)),
        gate: new Set(spec.gates.map((item) => item.regionId)),
        subregionGate: new Set(spec.subregionGates.map((item) => item.subregionId)),
        npc: new Set(spec.npcs.map((item) => item.id)),
      };
      for (const object of layout.objects) {
        if (object.interaction === 'decoration') continue;
        if (object.interaction === 'npc') {
          if (!object.npcId || !targets.npc.has(object.npcId)) {
            errors.push(`${layout.subregionId}: npc object ${object.name ?? object.itemId} -> ${object.npcId ?? 'missing'}`);
          }
          continue;
        }
        if (!object.targetId || !targets[object.interaction].has(object.targetId)) {
          errors.push(
            `${layout.subregionId}: ${object.interaction} object ${object.name ?? object.itemId} -> ${object.targetId ?? 'missing'}`,
          );
        }
      }
    }

    expect(errors).toEqual([]);
  });
});

describe('lore travel target hints', () => {
  it('uses the priority journey target when no lore entry is tracked', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const spec = buildRegionSpec('jiangnan', {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-suhang',
      trackedLoreEntryId: null,
    });

    expect(spec?.navigationTarget).toMatchObject({
      kind: 'subregionGate',
      payload: 'jiangnan-longquan',
    });
  });

  it('keeps manual lore tracking ahead of the priority journey fallback', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const spec = buildRegionSpec('jiangnan', {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-suhang',
      trackedLoreEntryId: 'subregion-jiangnan-linan',
    });

    expect(spec?.navigationTarget).toMatchObject({
      kind: 'subregionGate',
      payload: 'jiangnan-linan',
    });
  });

  it('points the priority journey at the next street gate after an anchor step closes', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const spec = buildRegionSpec('jiangnan', {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-jinling',
      trackedLoreEntryId: null,
      crafts: base.crafts.map((craft) =>
        craft.craftId === 'longquan-sword' ? { ...craft, produced: 1 } : craft,
      ),
      flags: [...base.flags, 'stall-closing-resolved:jn-qinhuai-lantern'],
    });

    expect(spec?.navigationTarget).toMatchObject({
      kind: 'gate',
      payload: 'ganpo',
    });
  });

  it('points tracked same-region lore at the matching subregion gate', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const spec = buildRegionSpec('jiangnan', {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-longquan',
      trackedLoreEntryId: 'subregion-jiangnan-suhang',
    });

    expect(spec?.navigationTarget).toMatchObject({
      kind: 'subregionGate',
      payload: 'jiangnan-suhang',
      label: '苏杭水市',
    });
  });

  it('points tracked cross-region lore at the next street gate without travelling', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const spec = buildRegionSpec('ganpo', {
      ...base,
      currentRegion: 'ganpo',
      currentSubregion: 'ganpo-kiln-town',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'ganpo'])],
      trackedLoreEntryId: 'subregion-jiangnan-suhang',
    });

    expect(spec?.navigationTarget).toMatchObject({
      kind: 'gate',
      payload: 'jiangnan',
      label: '江南窑柴河路',
    });
  });
});

describe('subregion street coverage', () => {
  it('exposes the Bashu tea-horse fair as an in-street activity point', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const spec = buildRegionSpec('bashu', {
      ...base,
      currentRegion: 'bashu',
      currentSubregion: 'bashu-tea-horse',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'bashu'])],
    });

    expect(spec?.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'bs-tea-horse-post',
          kind: 'festival',
          name: '茶马驿',
        }),
      ]),
    );
  });

  it('exposes the Lingnan qilou night market as an in-street activity point', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const spec = buildRegionSpec('lingnan', {
      ...base,
      currentRegion: 'lingnan',
      currentSubregion: 'lingnan-harbor',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'lingnan'])],
    });

    expect(spec?.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ln-qilou-night-market',
          kind: 'festival',
          name: '骑楼夜市',
        }),
      ]),
    );
  });

  it('keeps the Xiyu Atlas loom connected to the caravan post by a street gate', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const state = {
      ...base,
      currentRegion: 'xiyu',
      currentSubregion: 'xiyu-atlas-loom',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'xiyu', 'xueyu'])],
    };
    const spec = buildRegionSpec('xiyu', state);

    expect(isCurrentStreetSubregionGate(state, 'xiyu-caravan-post')).toBe(true);
    expect(spec?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          interaction: 'subregionGate',
          targetId: 'xiyu-caravan-post',
        }),
      ]),
    );
  });

  it('builds a playable street spec for every defined subregion', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const emptySubregions: string[] = [];

    for (const region of REGIONS) {
      for (const subregion of region.subregions) {
        const spec = buildRegionSpec(region.id, {
          ...base,
          currentRegion: region.id,
          currentSubregion: subregion.id,
          unlockedRegions: REGIONS.map((item) => item.id),
        });
        if (!spec) {
          emptySubregions.push(`${region.id}/${subregion.id}: missing spec`);
          continue;
        }
        const localEntryCount =
          spec.industries.length +
          spec.crafts.length +
          spec.activities.length +
          spec.npcs.length;
        if (localEntryCount === 0) emptySubregions.push(`${region.id}/${subregion.id}: no local content`);
      }
    }

    expect(emptySubregions).toEqual([]);
  });
});
