import { describe, expect, it } from 'vitest';
import { CRAFTS, REGIONS, STARTING_APPRENTICES } from '../../data';
import { createInitialState, type GameState } from '../../engine';
import { buildRegionSpec } from '../regionSpec';

interface PriorityActivityEntrypointCase {
  name: string;
  regionId: string;
  startSubregionId: string;
  activitySubregionId: string;
  activityId: string;
  producedCraftIds: string[];
  flags: string[];
}

const PRIORITY_ACTIVITY_ENTRYPOINTS: PriorityActivityEntrypointCase[] = [
  {
    name: 'Jiangnan Qinhuai lantern market',
    regionId: 'jiangnan',
    startSubregionId: 'jiangnan-longquan',
    activitySubregionId: 'jiangnan-jinling',
    activityId: 'jn-qinhuai-lantern',
    producedCraftIds: ['longquan-sword'],
    flags: [],
  },
  {
    name: 'Bashu tea-horse post',
    regionId: 'bashu',
    startSubregionId: 'bashu-jinli',
    activitySubregionId: 'bashu-tea-horse',
    activityId: 'bs-tea-horse-post',
    producedCraftIds: ['longquan-sword', 'shu-brocade'],
    flags: ['stall-closing-resolved:jn-qinhuai-lantern'],
  },
  {
    name: 'Lingnan qilou night market',
    regionId: 'lingnan',
    startSubregionId: 'lingnan-gambiered-yard',
    activitySubregionId: 'lingnan-harbor',
    activityId: 'ln-qilou-night-market',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk'],
    flags: [
      'stall-closing-resolved:jn-qinhuai-lantern',
      'stall-closing-resolved:bs-tea-horse-post',
    ],
  },
  {
    name: 'Ganpo kiln opening fair',
    regionId: 'ganpo',
    startSubregionId: 'ganpo-kaolin-hill',
    activitySubregionId: 'ganpo-kiln-town',
    activityId: 'gp-kiln-opening-fair',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk', 'jingdezhen-porcelain'],
    flags: [
      'stall-closing-resolved:jn-qinhuai-lantern',
      'stall-closing-resolved:bs-tea-horse-post',
      'stall-closing-resolved:ln-qilou-night-market',
    ],
  },
  {
    name: 'Xiyu oasis bazaar',
    regionId: 'xiyu',
    startSubregionId: 'xiyu-jade-yard',
    activitySubregionId: 'xiyu-bazaar',
    activityId: 'xiyu-bazaar-trade',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk', 'jingdezhen-porcelain', 'jade-carving'],
    flags: [
      'stall-closing-resolved:jn-qinhuai-lantern',
      'stall-closing-resolved:bs-tea-horse-post',
      'stall-closing-resolved:ln-qilou-night-market',
      'stall-closing-resolved:gp-kiln-opening-fair',
    ],
  },
];

function freshState(): GameState {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);
}

function stateForActivityEntrypoint(
  testCase: PriorityActivityEntrypointCase,
  currentSubregion: string,
): GameState {
  const base = freshState();
  return {
    ...base,
    currentRegion: testCase.regionId,
    currentSubregion,
    trackedLoreEntryId: null,
    unlockedRegions: [...new Set([...base.unlockedRegions, testCase.regionId])],
    flags: [...new Set([...base.flags, ...testCase.flags])],
    crafts: base.crafts.map((craft) =>
      testCase.producedCraftIds.includes(craft.craftId) ? { ...craft, produced: 1 } : craft,
    ),
  };
}

describe('priority activity street entrypoints', () => {
  it.each(PRIORITY_ACTIVITY_ENTRYPOINTS)(
    'exposes $name as an activity point in its target street spec',
    (testCase) => {
      const spec = buildRegionSpec(
        testCase.regionId,
        stateForActivityEntrypoint(testCase, testCase.activitySubregionId),
      );

      expect(spec?.subregionId).toBe(testCase.activitySubregionId);
      expect(spec?.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: testCase.activityId,
            kind: 'festival',
          }),
        ]),
      );
      expect(spec?.navigationTarget).toBeUndefined();
    },
  );

  it.each(PRIORITY_ACTIVITY_ENTRYPOINTS)(
    'points $name milestone navigation at a real same-region street gate',
    (testCase) => {
      const spec = buildRegionSpec(
        testCase.regionId,
        stateForActivityEntrypoint(testCase, testCase.startSubregionId),
      );

      expect(spec?.navigationTarget).toMatchObject({
        kind: 'subregionGate',
        payload: testCase.activitySubregionId,
      });
      expect(spec?.subregionGates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subregionId: testCase.activitySubregionId,
          }),
        ]),
      );
    },
  );
});
