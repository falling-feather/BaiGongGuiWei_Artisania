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

  it('attaches M1.21 Lingnan forge and Duan stone layouts to the local street specs', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const unlockedRegions = [...new Set([...base.unlockedRegions, 'lingnan', 'qiandian'])];
    const forge = buildRegionSpec('lingnan', {
      ...base,
      currentRegion: 'lingnan',
      currentSubregion: 'lingnan-forge',
      unlockedRegions,
    });
    const duanStone = buildRegionSpec('lingnan', {
      ...base,
      currentRegion: 'lingnan',
      currentSubregion: 'lingnan-duan-stone',
      unlockedRegions,
    });

    expect(forge?.layout).toMatchObject({ subregionId: 'lingnan-forge', size: { w: 56, h: 30 } });
    expect(forge?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-iron-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'smelt-iron' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'ln-foshan-forge' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'ln-liang-tiexian' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'lingnan-harbor' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'lingnan-gambiered-yard' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'lingnan-duan-stone' }),
      ]),
    );
    expect(forge?.industries.map((industry) => industry.id)).toEqual(
      expect.arrayContaining(['harvest-iron-ore', 'smelt-iron']),
    );
    expect(forge?.npcs.find((npc) => npc.id === 'ln-liang-tiexian')).toMatchObject({
      tileX: 29,
      tileY: 20,
    });
    expect(forge?.activities.some((activity) => activity.id === 'ln-foshan-forge')).toBe(true);

    expect(duanStone?.layout).toMatchObject({ subregionId: 'lingnan-duan-stone', size: { w: 56, h: 30 } });
    expect(duanStone?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'duan-inkstone' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'shiwan-pottery' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'ln-duan-inkstone-pit' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'ln-tan-yanbo' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'lingnan-harbor' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'lingnan-forge' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'lingnan-gambiered-yard' }),
      ]),
    );
    expect(duanStone?.crafts.map((craft) => craft.id)).toEqual(
      expect.arrayContaining(['duan-inkstone', 'shiwan-pottery']),
    );
    expect(duanStone?.npcs.find((npc) => npc.id === 'ln-tan-yanbo')).toMatchObject({
      tileX: 30,
      tileY: 20,
    });
    expect(duanStone?.activities.some((activity) => activity.id === 'ln-duan-inkstone-pit')).toBe(true);
  });

  it('attaches M1.22 Qiandian Dongchuan copper layout to the local street spec', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const dongchuan = buildRegionSpec('qiandian', {
      ...base,
      currentRegion: 'qiandian',
      currentSubregion: 'qiandian-dongchuan-copper',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'qiandian', 'bashu', 'lingnan', 'jingchu'])],
    });

    expect(dongchuan?.layout).toMatchObject({ subregionId: 'qiandian-dongchuan-copper', size: { w: 56, h: 30 } });
    expect(dongchuan?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-copper-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'smelt-copper' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'jianshui-pottery' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'qd-dongchuan-mine' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'qd-tongshan-ke' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'qiandian-miao-village' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'qiandian-tea-road' }),
      ]),
    );
    expect(dongchuan?.industries.map((industry) => industry.id)).toEqual(
      expect.arrayContaining(['harvest-copper-ore', 'smelt-copper']),
    );
    expect(dongchuan?.crafts.some((craft) => craft.id === 'jianshui-pottery')).toBe(true);
    expect(dongchuan?.npcs.find((npc) => npc.id === 'qd-tongshan-ke')).toMatchObject({
      tileX: 29,
      tileY: 20,
    });
    expect(dongchuan?.activities.some((activity) => activity.id === 'qd-dongchuan-mine')).toBe(true);
  });

  it('attaches M1.23 Jingchu mine yard and Xiang embroidery layouts to local street specs', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const unlockedRegions = [...new Set([...base.unlockedRegions, 'jingchu', 'bashu', 'qiandian', 'ganpo'])];
    const mineYard = buildRegionSpec('jingchu', {
      ...base,
      currentRegion: 'jingchu',
      currentSubregion: 'jingchu-mine-yard',
      unlockedRegions,
    });
    const xiangEmbroidery = buildRegionSpec('jingchu', {
      ...base,
      currentRegion: 'jingchu',
      currentSubregion: 'jingchu-xiang-embroidery',
      unlockedRegions,
    });

    expect(mineYard?.layout).toMatchObject({ subregionId: 'jingchu-mine-yard', size: { w: 56, h: 30 } });
    expect(mineYard?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-copper-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-iron-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'smelt-copper' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'smelt-iron' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'jc-daye-mine' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jc-yeshu' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jingchu-lake-market' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jingchu-chu-lacquer' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jingchu-xiang-embroidery' }),
      ]),
    );
    expect(mineYard?.industries.map((industry) => industry.id)).toEqual(
      expect.arrayContaining(['harvest-copper-ore', 'harvest-iron-ore', 'smelt-copper', 'smelt-iron']),
    );
    expect(mineYard?.npcs.find((npc) => npc.id === 'jc-yeshu')).toMatchObject({
      tileX: 29,
      tileY: 20,
    });
    expect(mineYard?.activities.some((activity) => activity.id === 'jc-daye-mine')).toBe(true);

    expect(xiangEmbroidery?.layout).toMatchObject({
      subregionId: 'jingchu-xiang-embroidery',
      size: { w: 56, h: 30 },
    });
    expect(xiangEmbroidery?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-cocoon' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'sericulture' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'xiang-embroidery' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'jc-xiang-embroidery' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jc-wen-xiuniang' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jingchu-lake-market' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jingchu-chu-lacquer' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jingchu-mine-yard' }),
      ]),
    );
    expect(xiangEmbroidery?.industries.map((industry) => industry.id)).toEqual(
      expect.arrayContaining(['harvest-cocoon', 'sericulture']),
    );
    expect(xiangEmbroidery?.crafts.some((craft) => craft.id === 'xiang-embroidery')).toBe(true);
    expect(xiangEmbroidery?.npcs.find((npc) => npc.id === 'jc-wen-xiuniang')).toMatchObject({
      tileX: 31,
      tileY: 20,
    });
    expect(xiangEmbroidery?.activities.some((activity) => activity.id === 'jc-xiang-embroidery')).toBe(true);
  });

  it('attaches M1.24 Jiangnan Linan and Taihu layouts to local street specs', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const unlockedRegions = [...new Set([...base.unlockedRegions, 'jiangnan', 'huizhou', 'ganpo', 'jingji'])];
    const linan = buildRegionSpec('jiangnan', {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-linan',
      unlockedRegions,
    });
    const taihu = buildRegionSpec('jiangnan', {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-taihu',
      unlockedRegions,
    });

    expect(linan?.layout).toMatchObject({ subregionId: 'jiangnan-linan', size: { w: 58, h: 28 } });
    expect(linan?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-tea-leaf' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'pick-tea' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-bamboo' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'split-bamboo' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'oilpaper-umbrella', x: 12, y: 16 }),
        expect.objectContaining({ interaction: 'activity', targetId: 'jn-lake-tea-house', x: 24, y: 16 }),
        expect.objectContaining({ interaction: 'activity', targetId: 'jn-paper-umbrella-shop', x: 36, y: 16 }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-su-xiaocha', x: 24, y: 20 }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-lin-yuqiao', x: 36, y: 20 }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jiangnan-jinling' }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jiangnan-taihu' }),
      ]),
    );
    expect(linan?.industries.map((industry) => industry.id)).toEqual(
      expect.arrayContaining(['harvest-tea-leaf', 'pick-tea', 'harvest-bamboo', 'split-bamboo']),
    );
    expect(linan?.crafts.some((craft) => craft.id === 'oilpaper-umbrella')).toBe(true);
    expect(linan?.activities.map((activity) => activity.id)).toEqual(
      expect.arrayContaining(['jn-lake-tea-house', 'jn-paper-umbrella-shop']),
    );
    expect(linan?.npcs.find((npc) => npc.id === 'jn-su-xiaocha')).toMatchObject({ tileX: 24, tileY: 20 });
    expect(linan?.npcs.find((npc) => npc.id === 'jn-lin-yuqiao')).toMatchObject({ tileX: 36, tileY: 20 });

    expect(taihu?.layout).toMatchObject({ subregionId: 'jiangnan-taihu', size: { w: 58, h: 28 } });
    expect(taihu?.layout?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-cocoon' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'sericulture' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'weave-brocade' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'kesi', x: 12, y: 16 }),
        expect.objectContaining({ interaction: 'craft', targetId: 'oilpaper-umbrella', x: 24, y: 16 }),
        expect.objectContaining({ interaction: 'activity', targetId: 'jn-cloud-brocade-office', x: 36, y: 16 }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-shen-yunsuo', x: 36, y: 20 }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'jiangnan-linan' }),
      ]),
    );
    expect(taihu?.industries.map((industry) => industry.id)).toEqual(
      expect.arrayContaining(['harvest-cocoon', 'sericulture', 'weave-brocade']),
    );
    expect(taihu?.crafts.map((craft) => craft.id)).toEqual(expect.arrayContaining(['kesi', 'oilpaper-umbrella']));
    expect(taihu?.activities.some((activity) => activity.id === 'jn-cloud-brocade-office')).toBe(true);
    expect(taihu?.npcs.find((npc) => npc.id === 'jn-shen-yunsuo')).toMatchObject({ tileX: 36, tileY: 20 });
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
