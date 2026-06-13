import { describe, expect, it } from 'vitest';
import { CRAFTS, REGIONS, STARTING_APPRENTICES } from '../../data';
import {
  gameReducer,
  createInitialState,
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

interface NavigationCase {
  name: string;
  startRegionId: string;
  startSubregionId: string;
  targetRegionId: string;
  targetSubregionId: string;
  producedCraftIds: string[];
  flags: string[];
}

const NAVIGATION_CASES: NavigationCase[] = [
  {
    name: 'initial Jiangnan craft target',
    startRegionId: 'jiangnan',
    startSubregionId: 'jiangnan-suhang',
    targetRegionId: 'jiangnan',
    targetSubregionId: 'jiangnan-longquan',
    producedCraftIds: [],
    flags: [],
  },
  {
    name: 'Jiangnan festival target after the first craft',
    startRegionId: 'jiangnan',
    startSubregionId: 'jiangnan-longquan',
    targetRegionId: 'jiangnan',
    targetSubregionId: 'jiangnan-jinling',
    producedCraftIds: ['longquan-sword'],
    flags: [],
  },
  {
    name: 'Bashu craft target after Jiangnan closes',
    startRegionId: 'jiangnan',
    startSubregionId: 'jiangnan-jinling',
    targetRegionId: 'bashu',
    targetSubregionId: 'bashu-jinli',
    producedCraftIds: ['longquan-sword'],
    flags: ['stall-chain-completed:jn-qinhuai-lantern'],
  },
  {
    name: 'Lingnan craft target after Bashu closes',
    startRegionId: 'bashu',
    startSubregionId: 'bashu-tea-horse',
    targetRegionId: 'lingnan',
    targetSubregionId: 'lingnan-gambiered-yard',
    producedCraftIds: ['longquan-sword', 'shu-brocade'],
    flags: [
      'stall-chain-completed:jn-qinhuai-lantern',
      'stall-chain-completed:bs-tea-horse-post',
      'heard-snow-pass',
    ],
  },
  {
    name: 'Ganpo craft target after Lingnan closes',
    startRegionId: 'lingnan',
    startSubregionId: 'lingnan-harbor',
    targetRegionId: 'ganpo',
    targetSubregionId: 'ganpo-kiln-town',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk'],
    flags: [
      'stall-chain-completed:jn-qinhuai-lantern',
      'stall-chain-completed:bs-tea-horse-post',
      'stall-chain-completed:ln-qilou-night-market',
      'heard-snow-pass',
    ],
  },
  {
    name: 'Xiyu craft target after Ganpo closes',
    startRegionId: 'ganpo',
    startSubregionId: 'ganpo-kiln-town',
    targetRegionId: 'xiyu',
    targetSubregionId: 'xiyu-jade-yard',
    producedCraftIds: ['longquan-sword', 'shu-brocade', 'gambiered-silk', 'jingdezhen-porcelain'],
    flags: [
      'stall-chain-completed:jn-qinhuai-lantern',
      'stall-chain-completed:bs-tea-horse-post',
      'stall-chain-completed:ln-qilou-night-market',
      'stall-chain-completed:gp-kiln-opening-fair',
      'heard-snow-pass',
    ],
  },
];

function freshState(): GameState {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);
}

function stateForNavigation(testCase: NavigationCase): GameState {
  const base = freshState();
  return {
    ...base,
    currentRegion: testCase.startRegionId,
    currentSubregion: testCase.startSubregionId,
    resources: { ...base.resources, coin: 999, labor: 99 },
    unlockedRegions: [...new Set([...base.unlockedRegions, testCase.startRegionId])],
    flags: [...new Set([...base.flags, ...testCase.flags])],
    crafts: base.crafts.map((craft) =>
      testCase.producedCraftIds.includes(craft.craftId) ? { ...craft, produced: 1 } : craft,
    ),
  };
}

function followStreetNavigation(state: GameState, targetRegionId: string, targetSubregionId: string): GameState {
  let current = state;
  const visited = new Set<string>();

  for (let step = 0; step < 10; step += 1) {
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
      expect(spec?.subregionGates.some((gate) => gate.subregionId === target.payload)).toBe(true);
      current = gameReducer(current, { type: 'TRAVEL_SUBREGION', subregionId: target.payload }, content);
      continue;
    }

    expect(spec?.gates.some((gate) => gate.regionId === target.payload)).toBe(true);
    if (!current.unlockedRegions.includes(target.payload)) {
      const opened = gameReducer(
        { ...current, resources: { ...current.resources, coin: 999 } },
        { type: 'UNLOCK_REGION', regionId: target.payload },
        content,
      );
      expect(opened.unlockedRegions, `failed to unlock ${target.payload}`).toContain(target.payload);
      current = opened;
    }
    current = gameReducer(current, { type: 'TRAVEL', regionId: target.payload }, content);
  }

  throw new Error(`Failed to reach ${targetRegionId}/${targetSubregionId}`);
}

describe('priority journey street navigation', () => {
  it.each(NAVIGATION_CASES)('reaches $name through street gates only', (testCase) => {
    const reached = followStreetNavigation(
      stateForNavigation(testCase),
      testCase.targetRegionId,
      testCase.targetSubregionId,
    );

    expect(reached.currentRegion).toBe(testCase.targetRegionId);
    expect(reached.currentSubregion).toBe(testCase.targetSubregionId);
  });
});
