import { describe, expect, it } from 'vitest';
import {
  RUNTIME_MAP_EDITOR_SNAPSHOTS,
  RUNTIME_MAP_LAYOUTS,
  runtimeLayoutFromEditorSnapshot,
  type RuntimeMapEditorSnapshot,
  type RuntimeMapLayout,
  type RuntimeMapObject,
} from '..';

const POINT_INTERACTIONS = new Set<RuntimeMapObject['interaction']>([
  'industry',
  'craft',
  'activity',
  'gate',
  'subregionGate',
]);

function tileKey(x: number, y: number) {
  return `${x},${y}`;
}

function pointFootprint(object: RuntimeMapObject) {
  return {
    x: object.x,
    y: object.y,
    w: object.tileW ?? 3,
    h: object.tileH ?? 3,
  };
}

function blockedPointTiles(layout: RuntimeMapLayout) {
  const blocked = new Set<string>();
  for (const object of layout.objects) {
    if (!POINT_INTERACTIONS.has(object.interaction)) continue;
    const footprint = pointFootprint(object);
    for (let y = footprint.y; y < footprint.y + footprint.h; y++) {
      for (let x = footprint.x; x < footprint.x + footprint.w; x++) {
        blocked.add(tileKey(x, y));
      }
    }
  }
  return blocked;
}

function adjacentWalkableTiles(layout: RuntimeMapLayout, object: RuntimeMapObject, blocked: Set<string>) {
  const footprint = pointFootprint(object);
  const tiles: Array<{ x: number; y: number }> = [];
  for (let x = footprint.x - 1; x <= footprint.x + footprint.w; x++) {
    for (const y of [footprint.y - 1, footprint.y + footprint.h]) {
      if (x < 0 || y < 0 || x >= layout.size.w || y >= layout.size.h) continue;
      if (!blocked.has(tileKey(x, y))) tiles.push({ x, y });
    }
  }
  for (let y = footprint.y; y < footprint.y + footprint.h; y++) {
    for (const x of [footprint.x - 1, footprint.x + footprint.w]) {
      if (x < 0 || y < 0 || x >= layout.size.w || y >= layout.size.h) continue;
      if (!blocked.has(tileKey(x, y))) tiles.push({ x, y });
    }
  }
  return tiles;
}

function reachableTiles(layout: RuntimeMapLayout, blocked: Set<string>) {
  const start = layout.playerStart ?? { x: Math.floor(layout.size.w / 2), y: Math.floor(layout.size.h / 2) };
  const startKey = tileKey(start.x, start.y);
  const visited = new Set<string>();
  const queue = blocked.has(startKey) ? [] : [{ x: start.x, y: start.y }];
  if (queue.length) visited.add(startKey);
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (queue.length) {
    const current = queue.shift()!;
    for (const dir of dirs) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      const key = tileKey(next.x, next.y);
      if (next.x < 0 || next.y < 0 || next.x >= layout.size.w || next.y >= layout.size.h) continue;
      if (blocked.has(key) || visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }

  return visited;
}

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
      'jiangnan-suhang',
      'jiangnan-longquan',
      'jiangnan-jinling',
      'jiangnan-baigongyuan',
      'bashu-bamboo-sea',
      'bashu-jinli',
      'bashu-linqiong-iron',
      'bashu-tea-horse',
      'lingnan-gambiered-yard',
      'lingnan-harbor',
      'lingnan-forge',
      'lingnan-duan-stone',
      'qiandian-miao-village',
      'qiandian-tea-road',
      'jingchu-chu-lacquer',
      'jingchu-lake-market',
      'ganpo-kaolin-hill',
      'ganpo-kiln-town',
      'ganpo-river-wood',
      'huizhou-paper-valley',
      'huizhou-ink-alley',
      'huizhou-she-stone',
      'huizhou-merchant-hall',
      'jingji-palace-yard',
      'jingji-official-gate',
      'jingji-market-gate',
      'sanjin-coal-yard',
      'sanjin-lacquer-yard',
      'sanjin-piaohao',
      'sanjin-vinegar-yard',
      'xueyu-thangka-court',
      'xueyu-snow-pass',
      'xueyu-pigment-valley',
      'xueyu-silver-tent',
      'xiyu-jade-yard',
      'xiyu-bazaar',
      'xiyu-caravan-post',
      'xiyu-atlas-loom',
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
    expect(snapshotsBySubregion.get('jiangnan-suhang')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-indigo' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'split-bamboo' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'indigo-dyeing' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'bamboo-weaving' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-indigo-keeper' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-bamboo-master' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'jiangnan-baigongyuan' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'huizhou' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'ganpo' }),
      ]),
    );
    expect(snapshotsBySubregion.get('jiangnan-jinling')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'activity', targetId: 'jn-qinhuai-lantern' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-qiao-zhaoye' }),
      ]),
    );
    expect(snapshotsBySubregion.get('jiangnan-baigongyuan')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'indigo-dyeing' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'bamboo-weaving' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'jn-yard-fields' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jn-xiaoman' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'jiangnan-suhang' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'jiangnan-longquan' }),
      ]),
    );
    expect(snapshotsBySubregion.get('bashu-tea-horse')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'activity', targetId: 'bs-tea-horse-post' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'bs-mabang-ayue' }),
      ]),
    );
    expect(snapshotsBySubregion.get('bashu-linqiong-iron')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-iron-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'smelt-iron' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'bs-linqiong-forge' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'bs-deng-lusheng' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'bashu-jinli' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'bashu-bamboo-sea' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'bashu-tea-horse' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'qiandian' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'jingchu' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'xueyu' }),
      ]),
    );
    expect(snapshotsBySubregion.get('lingnan-harbor')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'activity', targetId: 'ln-qilou-night-market' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'ln-wu-haichao' }),
      ]),
    );
    expect(snapshotsBySubregion.get('lingnan-forge')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-iron-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'smelt-iron' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'ln-foshan-forge' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'ln-liang-tiexian' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'lingnan-harbor' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'lingnan-gambiered-yard' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'lingnan-duan-stone' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'qiandian' }),
      ]),
    );
    expect(snapshotsBySubregion.get('lingnan-duan-stone')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'duan-inkstone' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'shiwan-pottery' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'ln-duan-inkstone-pit' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'ln-tan-yanbo' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'lingnan-harbor' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'lingnan-forge' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'lingnan-gambiered-yard' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'qiandian' }),
      ]),
    );
    expect(snapshotsBySubregion.get('ganpo-kaolin-hill')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-kaolin' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'mine-kaolin' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'gp-kaolin-hill' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'gp-shi-bai' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'ganpo-kiln-town' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'ganpo-river-wood' }),
      ]),
    );
    expect(snapshotsBySubregion.get('ganpo-river-wood')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-coal' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'xiabu' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'gp-river-wood-yard' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'gp-chai-yazi' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'ganpo-kiln-town' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'ganpo-kaolin-hill' }),
      ]),
    );
    expect(snapshotsBySubregion.get('huizhou-ink-alley')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-pine-soot' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'make-ink' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'hui-ink' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'hz-ink-workshop' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'hz-cheng-moshou' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'huizhou-paper-valley' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'huizhou-she-stone' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'huizhou-merchant-hall' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'jiangnan' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'ganpo' }),
      ]),
    );
    expect(snapshotsBySubregion.get('huizhou-she-stone')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-she-stone' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'she-inkstone' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'hz-she-stone-pit' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'hz-xu-yanshi' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'huizhou-paper-valley' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'huizhou-ink-alley' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'huizhou-merchant-hall' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'jiangnan' }),
        expect.objectContaining({ interaction: 'gate', targetId: 'ganpo' }),
      ]),
    );
    expect(snapshotsBySubregion.get('xiyu-jade-yard')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'jade-carving' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'xiyu-jade-yard' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xu-a-yue' }),
      ]),
    );
    expect(snapshotsBySubregion.get('xiyu-bazaar')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'activity', targetId: 'xiyu-bazaar-trade' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xu-sali' }),
      ]),
    );
    expect(snapshotsBySubregion.get('xiyu-caravan-post')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'activity', targetId: 'xiyu-caravan-post' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xu-tuoling-shu' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'xiyu-atlas-loom' }),
      ]),
    );
    expect(snapshotsBySubregion.get('xiyu-atlas-loom')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-cocoon' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'sericulture' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'atlas-silk' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'xiyu-atlas-loom' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xu-guli' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'xiyu-caravan-post' }),
      ]),
    );
    expect(snapshotsBySubregion.get('sanjin-coal-yard')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-coal' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-iron-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'smelt-iron' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'sj-coal-iron-yard' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'sj-yaoyuan-han' }),
      ]),
    );
    expect(snapshotsBySubregion.get('sanjin-vinegar-yard')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'aged-vinegar' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'sj-vinegar-yard' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'sj-cu-langzhong' }),
      ]),
    );
    expect(snapshotsBySubregion.get('jingji-market-gate')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'craft', targetId: 'inner-painting' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'jj-appraisal-market' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'jj-meng-zhangyan' }),
      ]),
    );
    expect(snapshotsBySubregion.get('xueyu-snow-pass')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'activity', targetId: 'xy-snow-pass' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xy-yak-captain' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'xueyu-thangka-court' }),
      ]),
    );
    expect(snapshotsBySubregion.get('xueyu-pigment-valley')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-pigment' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'grind-pigment' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'xy-pigment-valley' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xy-shicai-tong' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'xueyu-snow-pass' }),
      ]),
    );
    expect(snapshotsBySubregion.get('xueyu-silver-tent')?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interaction: 'industry', targetId: 'harvest-silver-ore' }),
        expect.objectContaining({ interaction: 'industry', targetId: 'refine-silver' }),
        expect.objectContaining({ interaction: 'craft', targetId: 'tibetan-silver' }),
        expect.objectContaining({ interaction: 'activity', targetId: 'xy-silver-tent' }),
        expect.objectContaining({ interaction: 'npc', npcId: 'xy-baiyinshu' }),
        expect.objectContaining({ interaction: 'gate', runtimeInteraction: 'subregionGate', targetId: 'xueyu-snow-pass' }),
      ]),
    );

    expect(RUNTIME_MAP_LAYOUTS.find((layout) => layout.subregionId === 'xiyu-jade-yard')?.objects).toEqual(
      expect.arrayContaining([expect.objectContaining({ interaction: 'activity', targetId: 'xiyu-jade-yard' })]),
    );
  });

  it('keeps every shipped interaction point reachable from the player start tile', () => {
    const errors: string[] = [];

    for (const layout of RUNTIME_MAP_LAYOUTS) {
      const blocked = blockedPointTiles(layout);
      const reachable = reachableTiles(layout, blocked);
      for (const object of layout.objects) {
        if (!POINT_INTERACTIONS.has(object.interaction)) continue;
        const nearby = adjacentWalkableTiles(layout, object, blocked);
        if (!nearby.some((tile) => reachable.has(tileKey(tile.x, tile.y)))) {
          errors.push(`${layout.subregionId}: ${object.interaction} ${object.targetId ?? object.itemId} is not reachable`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it('keeps shipped NPC markers on reachable street tiles', () => {
    const errors: string[] = [];

    for (const layout of RUNTIME_MAP_LAYOUTS) {
      const blocked = blockedPointTiles(layout);
      const reachable = reachableTiles(layout, blocked);
      for (const object of layout.objects) {
        if (object.interaction !== 'npc') continue;
        const key = tileKey(object.x, object.y);
        if (object.x < 0 || object.y < 0 || object.x >= layout.size.w || object.y >= layout.size.h) {
          errors.push(`${layout.subregionId}: NPC ${object.npcId ?? object.itemId} is out of bounds`);
          continue;
        }
        if (blocked.has(key)) {
          errors.push(`${layout.subregionId}: NPC ${object.npcId ?? object.itemId} overlaps an interaction point`);
          continue;
        }
        if (!reachable.has(key)) {
          errors.push(`${layout.subregionId}: NPC ${object.npcId ?? object.itemId} is not on a reachable tile`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it('keeps the four Sanjin street layouts mutually connected by subregion gates', () => {
    const sanjinSubregions = ['sanjin-piaohao', 'sanjin-coal-yard', 'sanjin-lacquer-yard', 'sanjin-vinegar-yard'];
    const errors: string[] = [];

    for (const subregionId of sanjinSubregions) {
      const layout = RUNTIME_MAP_LAYOUTS.find((item) => item.subregionId === subregionId);
      if (!layout) {
        errors.push(`${subregionId}: missing layout`);
        continue;
      }
      const gateTargets = new Set(
        layout.objects
          .filter((object) => object.interaction === 'subregionGate')
          .map((object) => object.targetId),
      );
      for (const targetId of sanjinSubregions.filter((item) => item !== subregionId)) {
        if (!gateTargets.has(targetId)) errors.push(`${subregionId}: missing Sanjin gate to ${targetId}`);
      }
    }

    expect(errors).toEqual([]);
  });
});
