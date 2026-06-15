import jiangnanBaigongyuanMap from './mapLayouts/jiangnan-baigongyuan.json';
import jiangnanLongquanMap from './mapLayouts/jiangnan-longquan.json';
import jiangnanJinlingMap from './mapLayouts/jiangnan-jinling.json';
import jiangnanLinanMap from './mapLayouts/jiangnan-linan.json';
import jiangnanSuhangMap from './mapLayouts/jiangnan-suhang.json';
import jiangnanTaihuMap from './mapLayouts/jiangnan-taihu.json';
import bashuBambooSeaMap from './mapLayouts/bashu-bamboo-sea.json';
import bashuJinliMap from './mapLayouts/bashu-jinli.json';
import bashuLinqiongIronMap from './mapLayouts/bashu-linqiong-iron.json';
import bashuTeaHorseMap from './mapLayouts/bashu-tea-horse.json';
import lingnanDuanStoneMap from './mapLayouts/lingnan-duan-stone.json';
import lingnanForgeMap from './mapLayouts/lingnan-forge.json';
import lingnanGambieredYardMap from './mapLayouts/lingnan-gambiered-yard.json';
import lingnanHarborMap from './mapLayouts/lingnan-harbor.json';
import qiandianMiaoVillageMap from './mapLayouts/qiandian-miao-village.json';
import qiandianTeaRoadMap from './mapLayouts/qiandian-tea-road.json';
import qiandianDongchuanCopperMap from './mapLayouts/qiandian-dongchuan-copper.json';
import jingchuChuLacquerMap from './mapLayouts/jingchu-chu-lacquer.json';
import jingchuLakeMarketMap from './mapLayouts/jingchu-lake-market.json';
import jingchuMineYardMap from './mapLayouts/jingchu-mine-yard.json';
import jingchuXiangEmbroideryMap from './mapLayouts/jingchu-xiang-embroidery.json';
import ganpoKaolinHillMap from './mapLayouts/ganpo-kaolin-hill.json';
import ganpoKilnTownMap from './mapLayouts/ganpo-kiln-town.json';
import ganpoRiverWoodMap from './mapLayouts/ganpo-river-wood.json';
import huizhouInkAlleyMap from './mapLayouts/huizhou-ink-alley.json';
import huizhouPaperValleyMap from './mapLayouts/huizhou-paper-valley.json';
import huizhouSheStoneMap from './mapLayouts/huizhou-she-stone.json';
import huizhouMerchantHallMap from './mapLayouts/huizhou-merchant-hall.json';
import jingjiPalaceYardMap from './mapLayouts/jingji-palace-yard.json';
import jingjiOfficialGateMap from './mapLayouts/jingji-official-gate.json';
import jingjiMarketGateMap from './mapLayouts/jingji-market-gate.json';
import sanjinCoalYardMap from './mapLayouts/sanjin-coal-yard.json';
import sanjinLacquerYardMap from './mapLayouts/sanjin-lacquer-yard.json';
import sanjinPiaohaoMap from './mapLayouts/sanjin-piaohao.json';
import sanjinVinegarYardMap from './mapLayouts/sanjin-vinegar-yard.json';
import xueyuThangkaCourtMap from './mapLayouts/xueyu-thangka-court.json';
import xueyuSnowPassMap from './mapLayouts/xueyu-snow-pass.json';
import xueyuPigmentValleyMap from './mapLayouts/xueyu-pigment-valley.json';
import xueyuSilverTentMap from './mapLayouts/xueyu-silver-tent.json';
import xiyuJadeYardMap from './mapLayouts/xiyu-jade-yard.json';
import xiyuBazaarMap from './mapLayouts/xiyu-bazaar.json';
import xiyuCaravanPostMap from './mapLayouts/xiyu-caravan-post.json';
import xiyuAtlasLoomMap from './mapLayouts/xiyu-atlas-loom.json';

/**
 * 大地图布局 —— 各地区在全国地图上的近似坐标（百分比，0–100）。
 * 与 RegionDef 解耦：只描述「画在哪」，不影响引擎结算。
 * 新增地区后在此补一条坐标即可在大地图上出现。
 */
export const REGION_MAP_POS: Record<string, { x: number; y: number }> = {
  xiyu: { x: 20, y: 26 }, // 西域（新疆）
  xueyu: { x: 22, y: 52 }, // 雪域高原（西藏）
  bashu: { x: 42, y: 50 }, // 巴蜀（四川）
  qiandian: { x: 42, y: 66 }, // 黔滇（云贵）
  sanjin: { x: 56, y: 32 }, // 三晋（山西）
  jingji: { x: 64, y: 27 }, // 京畿（华北）
  jingchu: { x: 55, y: 54 }, // 荆楚（两湖）
  ganpo: { x: 63, y: 60 }, // 赣鄱（江西）
  huizhou: { x: 64, y: 48 }, // 徽州（皖南）
  jiangnan: { x: 73, y: 49 }, // 江南（江浙）
  lingnan: { x: 59, y: 72 }, // 岭南（广东）
};

export type RuntimeMapInteraction =
  | 'industry'
  | 'craft'
  | 'activity'
  | 'gate'
  | 'subregionGate'
  | 'npc'
  | 'decoration';

export interface RuntimeMapRoadPath {
  points: Array<{ x: number; y: number }>;
}

export interface RuntimeMapObject {
  /** Editor palette object id or a stable runtime marker id. */
  itemId: string;
  name?: string;
  x: number;
  y: number;
  tileW?: number;
  tileH?: number;
  solid?: boolean;
  interaction: RuntimeMapInteraction;
  /** craftId / industryId / activityId / regionId / subregionId, depending on interaction. */
  targetId?: string;
  /** NPC id when interaction === 'npc'. */
  npcId?: string;
}

export interface RuntimeMapLayout {
  schema: 'artisania-map-editor/v2';
  regionId: string;
  subregionId: string;
  tileSize: number;
  size: { w: number; h: number };
  roads: RuntimeMapRoadPath[];
  objects: RuntimeMapObject[];
  playerStart?: { x: number; y: number };
}

export interface RuntimeMapEditorTile {
  itemId: string;
  x: number;
  y: number;
  layer?: string;
  interaction?: string;
}

export interface RuntimeMapEditorObject {
  itemId: string;
  id?: string;
  name?: string;
  x: number;
  y: number;
  tileW?: number;
  tileH?: number;
  solid?: boolean;
  layer?: string;
  interaction?: string;
  /** Optional runtime override for editor interactions such as gate/travel markers. */
  runtimeInteraction?: string;
  /** craftId / industryId / activityId / regionId / subregionId, depending on interaction. */
  targetId?: string;
  /** NPC id when interaction === 'npc'. */
  npcId?: string;
  /** Disambiguates editor gate/travel objects when runtimeInteraction is omitted. */
  gateKind?: 'region' | 'subregion';
}

export interface RuntimeMapEditorSnapshot {
  schema?: string;
  regionId: string;
  subregionId?: string;
  tileSize?: number;
  size: { w: number; h: number };
  /** Compact checked-in layout assets may provide road paths directly; raw editor exports can omit this. */
  roads?: RuntimeMapRoadPath[];
  tiles?: RuntimeMapEditorTile[];
  objects?: RuntimeMapEditorObject[];
}

export interface RuntimeMapImportOptions {
  subregionId?: string;
  playerStart?: { x: number; y: number };
}

const RUNTIME_INTERACTIONS = new Set<RuntimeMapInteraction>([
  'industry',
  'craft',
  'activity',
  'gate',
  'subregionGate',
  'npc',
  'decoration',
]);

const ACTIVITY_EDITOR_INTERACTIONS = new Set([
  'sword_practice',
  'archery_practice',
  'meditation',
  'farming',
  'watering',
  'harvesting',
  'fishing',
  'cooking',
  'tea_brewing',
  'study',
  'carpentry',
  'weaving',
  'mining',
  'trading',
  'resting',
]);

const ROAD_TILE_IDS = new Set([
  'road',
  'road_vertical',
  'road_cross',
  'bridge',
  'pebble_path',
  'caravan_track_horizontal',
  'caravan_track_vertical',
  'caravan_crossroad',
]);

function isRuntimeMapInteraction(value: string | undefined): value is RuntimeMapInteraction {
  return value !== undefined && RUNTIME_INTERACTIONS.has(value as RuntimeMapInteraction);
}

function keyOf(x: number, y: number) {
  return `${x},${y}`;
}

function normalizeRuntimeRegionId(regionId: string) {
  return regionId === 'western' ? 'xiyu' : regionId;
}

function isRoadEditorTile(tile: RuntimeMapEditorTile) {
  if (tile.layer === 'road') return true;
  if (ROAD_TILE_IDS.has(tile.itemId)) return true;
  return /(^|_)(road|bridge|track|path)(_|$)/.test(tile.itemId);
}

function roadPath(points: Array<{ x: number; y: number }>): RuntimeMapRoadPath {
  return { points };
}

function roadPathsFromTiles(tiles: RuntimeMapEditorTile[] | undefined): RuntimeMapRoadPath[] {
  const roadTiles = (tiles ?? []).filter(isRoadEditorTile);
  const tileSet = new Set(roadTiles.map((tile) => keyOf(tile.x, tile.y)));
  const rows = [...new Set(roadTiles.map((tile) => tile.y))].sort((a, b) => a - b);
  const cols = [...new Set(roadTiles.map((tile) => tile.x))].sort((a, b) => a - b);
  const paths: RuntimeMapRoadPath[] = [];

  for (const y of rows) {
    const xs = roadTiles
      .filter((tile) => tile.y === y)
      .map((tile) => tile.x)
      .sort((a, b) => a - b);
    let start = xs[0];
    let prev = xs[0];
    for (let i = 1; i <= xs.length; i++) {
      const current = xs[i];
      if (current === prev + 1) {
        prev = current;
        continue;
      }
      if (start !== undefined && prev !== undefined && prev > start) {
        paths.push(roadPath([{ x: start, y }, { x: prev, y }]));
      }
      start = current;
      prev = current;
    }
  }

  for (const x of cols) {
    const ys = roadTiles
      .filter((tile) => tile.x === x)
      .map((tile) => tile.y)
      .sort((a, b) => a - b);
    let start = ys[0];
    let prev = ys[0];
    for (let i = 1; i <= ys.length; i++) {
      const current = ys[i];
      if (current === prev + 1) {
        prev = current;
        continue;
      }
      if (start !== undefined && prev !== undefined && prev > start) {
        const hasHorizontalRun = Array.from({ length: prev - start + 1 }, (_, index) => start + index).some(
          (y) => tileSet.has(keyOf(x - 1, y)) || tileSet.has(keyOf(x + 1, y)),
        );
        if (hasHorizontalRun || prev - start >= 2) paths.push(roadPath([{ x, y: start }, { x, y: prev }]));
      }
      start = current;
      prev = current;
    }
  }

  return paths;
}

function normalizeEditorInteraction(object: RuntimeMapEditorObject): RuntimeMapInteraction | null {
  if (isRuntimeMapInteraction(object.runtimeInteraction)) return object.runtimeInteraction;
  if (object.interaction === 'subregionGate') return 'subregionGate';
  if (object.interaction === 'gate' || object.interaction === 'travel') {
    return object.gateKind === 'subregion' ? 'subregionGate' : 'gate';
  }
  if (isRuntimeMapInteraction(object.interaction)) {
    return object.interaction;
  }
  if (object.interaction && ACTIVITY_EDITOR_INTERACTIONS.has(object.interaction)) return 'activity';
  return null;
}

function toRuntimeObject(object: RuntimeMapEditorObject): RuntimeMapObject | null {
  const interaction = normalizeEditorInteraction(object);
  const base = {
    itemId: object.itemId,
    name: object.name,
    x: object.x,
    y: object.y,
    tileW: object.tileW,
    tileH: object.tileH,
    solid: object.solid,
  };
  if (!interaction) return object.solid ? { ...base, interaction: 'decoration', solid: true } : null;
  if (interaction === 'decoration') return { ...base, interaction };
  if (interaction === 'npc') {
    return { ...base, interaction, npcId: object.npcId ?? object.targetId, tileW: object.tileW ?? 1, tileH: object.tileH ?? 1 };
  }
  return { ...base, interaction, targetId: object.targetId };
}

export function runtimeLayoutFromEditorSnapshot(
  snapshot: RuntimeMapEditorSnapshot,
  options: RuntimeMapImportOptions = {},
): RuntimeMapLayout {
  let playerStart = options.playerStart;
  const objects: RuntimeMapObject[] = [];
  for (const object of snapshot.objects ?? []) {
    if (object.itemId === 'player_spawn') {
      playerStart = { x: object.x, y: object.y };
      continue;
    }
    const runtimeObject = toRuntimeObject(object);
    if (runtimeObject) objects.push(runtimeObject);
  }

  return {
    schema: 'artisania-map-editor/v2',
    regionId: normalizeRuntimeRegionId(snapshot.regionId),
    subregionId: options.subregionId ?? snapshot.subregionId ?? normalizeRuntimeRegionId(snapshot.regionId),
    tileSize: snapshot.tileSize ?? 32,
    size: snapshot.size,
    roads: snapshot.roads?.length ? snapshot.roads : roadPathsFromTiles(snapshot.tiles),
    objects,
    playerStart,
  };
}

/** Editor-compatible first batch: runtime consumes these checked-in JSON assets through runtimeLayoutFromEditorSnapshot. */
export const RUNTIME_MAP_EDITOR_SNAPSHOTS: RuntimeMapEditorSnapshot[] = [
  jiangnanSuhangMap,
  jiangnanLongquanMap,
  jiangnanJinlingMap,
  jiangnanLinanMap,
  jiangnanTaihuMap,
  jiangnanBaigongyuanMap,
  bashuBambooSeaMap,
  bashuJinliMap,
  bashuLinqiongIronMap,
  bashuTeaHorseMap,
  lingnanGambieredYardMap,
  lingnanHarborMap,
  lingnanForgeMap,
  lingnanDuanStoneMap,
  qiandianMiaoVillageMap,
  qiandianTeaRoadMap,
  qiandianDongchuanCopperMap,
  jingchuChuLacquerMap,
  jingchuLakeMarketMap,
  jingchuMineYardMap,
  jingchuXiangEmbroideryMap,
  ganpoKaolinHillMap,
  ganpoKilnTownMap,
  ganpoRiverWoodMap,
  huizhouPaperValleyMap,
  huizhouInkAlleyMap,
  huizhouSheStoneMap,
  huizhouMerchantHallMap,
  jingjiPalaceYardMap,
  jingjiOfficialGateMap,
  jingjiMarketGateMap,
  sanjinCoalYardMap,
  sanjinLacquerYardMap,
  sanjinPiaohaoMap,
  sanjinVinegarYardMap,
  xueyuThangkaCourtMap,
  xueyuSnowPassMap,
  xueyuPigmentValleyMap,
  xueyuSilverTentMap,
  xiyuJadeYardMap,
  xiyuBazaarMap,
  xiyuCaravanPostMap,
  xiyuAtlasLoomMap,
];

/** Runtime layouts consumed by StreetScene. Keep sources above editor-compatible. */
export const RUNTIME_MAP_LAYOUTS: RuntimeMapLayout[] = RUNTIME_MAP_EDITOR_SNAPSHOTS.map((snapshot) =>
  runtimeLayoutFromEditorSnapshot(snapshot),
);

export function runtimeLayoutForSubregion(regionId: string, subregionId: string | undefined): RuntimeMapLayout | undefined {
  return RUNTIME_MAP_LAYOUTS.find((layout) => layout.regionId === regionId && layout.subregionId === subregionId);
}
