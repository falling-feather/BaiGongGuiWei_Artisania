import { describe, expect, it } from 'vitest';
import { buildLoreTravelGuide, uniqueRoutesFromRegions } from '../loreGuide';
import { filteredLoreEntries, loreProgress, unlockedLoreEntries } from '../lore';
import { createInitialState } from '../state';
import type { GameState, NpcRuntimeState } from '../types';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { LORE_ENTRIES, SUBREGION_LORE_ENTRIES } from '../../data/loreEntries';
import { RUNTIME_MAP_LAYOUTS } from '../../data/mapLayout';
import { REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';

const npcRuntime = (knownTopics: string[]): NpcRuntimeState => ({
  affinity: 0,
  stage: 'stranger',
  talks: 0,
  lastTalkTurn: 0,
  lastGreetingIndex: 0,
  knownTopics,
});

function freshState(): GameState {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 2468, undefined, REGIONS);
}

function stateWithLoreSignals(knownTopics: string[], flags: string[] = []): GameState {
  return {
    ...freshState(),
    flags,
    npcStates: {
      'lore-test-npc': npcRuntime(knownTopics),
    },
  };
}

describe('百工志资料库', () => {
  it('词条具备可维护的规模、唯一 ID 和锁定提示', () => {
    const ids = new Set(LORE_ENTRIES.map((entry) => entry.id));
    expect(LORE_ENTRIES.length).toBeGreaterThanOrEqual(85);
    expect(ids.size).toBe(LORE_ENTRIES.length);
    expect(
      LORE_ENTRIES.filter((entry) => entry.unlock && !entry.revealHint).map((entry) => entry.id),
    ).toEqual([]);
  });

  it('每个大地区和代表街景地图都有可解锁的地区词条', () => {
    const coveredRegionIds = new Set(
      LORE_ENTRIES.filter((entry) => entry.category === 'region' && entry.regionId).map((entry) => entry.regionId),
    );

    expect(REGIONS.map((region) => region.id).filter((regionId) => !coveredRegionIds.has(regionId))).toEqual([]);
    expect(RUNTIME_MAP_LAYOUTS.map((layout) => layout.regionId).filter((regionId) => !coveredRegionIds.has(regionId))).toEqual([]);

    const allRegionsState = { ...freshState(), unlockedRegions: REGIONS.map((region) => region.id) };
    expect(filteredLoreEntries(LORE_ENTRIES, allRegionsState, { category: 'region', query: '青檀' }).map((entry) => entry.id)).toContain(
      'region-huizhou-paper-valley',
    );
    expect(filteredLoreEntries(LORE_ENTRIES, allRegionsState, { category: 'region', query: '宫造' }).map((entry) => entry.id)).toContain(
      'region-jingji-palace-yard',
    );
  });

  it('每个小地区都有可检索的行脚资料卡', () => {
    const expectedSubregionIds = REGIONS.flatMap((region) => region.subregions.map((subregion) => subregion.id));
    const coveredSubregionIds = new Set(SUBREGION_LORE_ENTRIES.map((entry) => entry.subregionId));

    expect(SUBREGION_LORE_ENTRIES.length).toBe(expectedSubregionIds.length);
    expect(expectedSubregionIds.filter((subregionId) => !coveredSubregionIds.has(subregionId))).toEqual([]);
    expect(SUBREGION_LORE_ENTRIES.filter((entry) => entry.category !== 'region').map((entry) => entry.id)).toEqual([]);

    const allRegionsState = { ...freshState(), unlockedRegions: REGIONS.map((region) => region.id) };
    expect(filteredLoreEntries(LORE_ENTRIES, allRegionsState, { query: '官署门房 宋押司' }).map((entry) => entry.id)).toContain(
      'subregion-jingji-official-gate',
    );
    expect(filteredLoreEntries(LORE_ENTRIES, allRegionsState, { query: '窑火瓷镇 景德镇瓷' }).map((entry) => entry.id)).toContain(
      'subregion-ganpo-kiln-town',
    );
  });

  it('小地区词条能生成不绕过场景的行脚指引', () => {
    const routes = uniqueRoutesFromRegions(REGION_CONTENT);
    const state = {
      ...freshState(),
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-longquan',
      unlockedRegions: ['jiangnan'],
    };
    const kilnEntry = SUBREGION_LORE_ENTRIES.find((entry) => entry.id === 'subregion-ganpo-kiln-town');
    const suhangEntry = SUBREGION_LORE_ENTRIES.find((entry) => entry.id === 'subregion-jiangnan-suhang');

    expect(buildLoreTravelGuide(state, kilnEntry, REGIONS, routes)).toMatchObject({
      status: 'frontier-route',
      routeId: 'route-jiangnan-ganpo-kiln',
      nextRegionId: 'ganpo',
      routeUnlocked: false,
      isAtTarget: false,
    });
    expect(buildLoreTravelGuide(state, kilnEntry, REGIONS, routes)?.detail).toContain('街景');
    expect(buildLoreTravelGuide(state, suhangEntry, REGIONS, routes)).toMatchObject({
      status: 'same-region',
      targetSubregionId: 'jiangnan-suhang',
      nextRegionId: 'jiangnan',
      isAtTarget: false,
    });
  });

  it('任一线索可以解锁跨系统词条', () => {
    const bazaarState = stateWithLoreSignals(['bazaar-stall']);
    expect(unlockedLoreEntries(LORE_ENTRIES, bazaarState).map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['life-night-market-stall', 'life-oasis-bazaar']),
    );

    const canalState = stateWithLoreSignals(['canal-tribute']);
    expect(unlockedLoreEntries(LORE_ENTRIES, canalState).map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['route-canal-tribute', 'route-escort-ledger']),
    );

    const jadeState = stateWithLoreSignals(['jade-ethics-ledger']);
    expect(filteredLoreEntries(LORE_ENTRIES, jadeState, { query: '顺料' }).map((entry) => entry.id)).toContain(
      'craft-jade-material-ethics',
    );
  });

  it('检索只过滤已解锁词条，并覆盖标题、正文和标签', () => {
    const state = stateWithLoreSignals(['paper-collab', 'collector-return', 'polish-credit-ledger']);

    expect(filteredLoreEntries(LORE_ENTRIES, state, { query: '文房' }).map((entry) => entry.id)).toContain(
      'craft-paper-inscription-lineage',
    );
    expect(filteredLoreEntries(LORE_ENTRIES, state, { query: '票号' }).map((entry) => entry.id)).toContain(
      'craft-polished-lacquer-slow',
    );
    expect(filteredLoreEntries(LORE_ENTRIES, state, { query: '宫造' }).map((entry) => entry.id)).not.toContain(
      'craft-cloisonne-palace-standard',
    );
  });

  it('flag 类系统词条进入同一套进度统计', () => {
    const base = freshState();
    const resolved = { ...base, flags: ['supply-crisis-resolved'] };

    expect(unlockedLoreEntries(LORE_ENTRIES, base).map((entry) => entry.id)).not.toContain('system-supply-crisis');
    expect(unlockedLoreEntries(LORE_ENTRIES, resolved).map((entry) => entry.id)).toContain('system-supply-crisis');
    expect(loreProgress(LORE_ENTRIES, resolved).unlocked).toBeGreaterThan(loreProgress(LORE_ENTRIES, base).unlocked);
  });
});
