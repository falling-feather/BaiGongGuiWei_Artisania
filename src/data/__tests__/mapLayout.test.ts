import { describe, expect, it } from 'vitest';
import {
  RUNTIME_MAP_EDITOR_SNAPSHOTS,
  RUNTIME_MAP_LAYOUTS,
  runtimeLayoutFromEditorSnapshot,
  type RuntimeMapEditorSnapshot,
} from '..';

describe('runtime map editor adapter', () => {
  it('converts editor snapshots into runtime street layouts', () => {
    const snapshot: RuntimeMapEditorSnapshot = {
      schema: 'artisania-map-editor/v2',
      regionId: 'western',
      subregionId: 'xiyu-jade-yard',
      tileSize: 32,
      size: { w: 12, h: 8 },
      tiles: [
        { itemId: 'road', x: 1, y: 3 },
        { itemId: 'road', x: 2, y: 3 },
        { itemId: 'road', x: 3, y: 3 },
        { itemId: 'road_vertical', x: 2, y: 1 },
        { itemId: 'road_vertical', x: 2, y: 2 },
        { itemId: 'road_vertical', x: 2, y: 4 },
        { itemId: 'road_vertical', x: 2, y: 5 },
      ],
      objects: [
        { itemId: 'player_spawn', x: 2, y: 3 },
        { itemId: 'craft_lacquer', interaction: 'craft', targetId: 'jade-carving', x: 4, y: 2, tileW: 3, tileH: 3 },
        { itemId: 'action_mining', interaction: 'mining', targetId: 'xiyu-jade-yard', x: 7, y: 2 },
        {
          itemId: 'gate',
          interaction: 'gate',
          runtimeInteraction: 'subregionGate',
          targetId: 'xiyu-bazaar',
          x: 1,
          y: 6,
        },
        { itemId: 'npc_vendor', interaction: 'npc', npcId: 'xu-a-yue', x: 5, y: 3 },
        { itemId: 'market_crates', interaction: 'decoration', x: 9, y: 4, tileW: 2, tileH: 2 },
      ],
    };

    const layout = runtimeLayoutFromEditorSnapshot(snapshot);

    expect(layout).toMatchObject({
      schema: 'artisania-map-editor/v2',
      regionId: 'xiyu',
      subregionId: 'xiyu-jade-yard',
      tileSize: 32,
      size: { w: 12, h: 8 },
      playerStart: { x: 2, y: 3 },
    });
    expect(layout.roads).toEqual(
      expect.arrayContaining([
        { points: [{ x: 1, y: 3 }, { x: 3, y: 3 }] },
        { points: [{ x: 2, y: 1 }, { x: 2, y: 5 }] },
      ]),
    );
    expect(layout.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'jade-carving', x: 4, y: 2 }),
        expect.objectContaining({ interaction: 'activity', targetId: 'xiyu-jade-yard', x: 7, y: 2 }),
        expect.objectContaining({ interaction: 'subregionGate', targetId: 'xiyu-bazaar', x: 1, y: 6 }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xu-a-yue', x: 5, y: 3 }),
        expect.objectContaining({ interaction: 'decoration', itemId: 'market_crates', x: 9, y: 4 }),
      ]),
    );
  });

  it('keeps the shipped runtime layouts generated from editor-compatible snapshots', () => {
    expect(RUNTIME_MAP_LAYOUTS).toHaveLength(RUNTIME_MAP_EDITOR_SNAPSHOTS.length);

    for (const snapshot of RUNTIME_MAP_EDITOR_SNAPSHOTS) {
      const layout = RUNTIME_MAP_LAYOUTS.find((item) => item.subregionId === snapshot.subregionId);
      expect(layout).toBeTruthy();
      expect(layout?.regionId).toBe(snapshot.regionId === 'western' ? 'xiyu' : snapshot.regionId);
      expect(layout?.roads.length).toBeGreaterThan(0);
      expect(layout?.objects.some((object) => object.interaction !== 'decoration')).toBe(true);
      expect(layout?.playerStart).toBeTruthy();
    }
  });

  it('loads the first shipped layouts from checked-in JSON map assets', () => {
    const snapshotsBySubregion = new Map(
      RUNTIME_MAP_EDITOR_SNAPSHOTS.map((snapshot) => [snapshot.subregionId, snapshot]),
    );

    expect([...snapshotsBySubregion.keys()]).toEqual([
      'jiangnan-longquan',
      'bashu-bamboo-sea',
      'lingnan-gambiered-yard',
      'qiandian-miao-village',
      'jingchu-chu-lacquer',
      'ganpo-kiln-town',
      'huizhou-paper-valley',
      'jingji-palace-yard',
      'sanjin-lacquer-yard',
      'xueyu-thangka-court',
      'xiyu-jade-yard',
    ]);
    expect(new Set(RUNTIME_MAP_EDITOR_SNAPSHOTS.map((snapshot) => snapshot.regionId))).toEqual(
      new Set(['jiangnan', 'bashu', 'lingnan', 'qiandian', 'jingchu', 'ganpo', 'huizhou', 'jingji', 'sanjin', 'xueyu', 'xiyu']),
    );

    for (const snapshot of snapshotsBySubregion.values()) {
      expect(snapshot.schema).toBe('artisania-map-editor/v2');
      expect(snapshot.tiles).toBeUndefined();
      expect(snapshot.roads?.length).toBeGreaterThan(0);
      expect(snapshot.objects?.some((object) => object.itemId === 'player_spawn')).toBe(true);
    }

    expect(snapshotsBySubregion.get('jiangnan-longquan')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'celadon' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-ye-qingzhan' }),
      ]),
    );
    expect(snapshotsBySubregion.get('xiyu-jade-yard')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'jade-carving' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'xiyu-jade-yard' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xu-a-yue' }),
      ]),
    );

    expect(RUNTIME_MAP_LAYOUTS.find((layout) => layout.subregionId === 'xiyu-jade-yard')?.objects).toEqual(
      expect.arrayContaining([expect.objectContaining({ interaction: 'activity', targetId: 'xiyu-jade-yard' })]),
    );
  });
});
