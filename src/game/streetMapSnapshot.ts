import type { RuntimeMapEditorObject, RuntimeMapEditorSnapshot, RuntimeMapEditorTile } from '../data/mapLayout';
import type { RegionMapSpec, IndustryTier, TerrainKind } from './EventBus';
import {
  BUILDING_WEATHER_TEXTURES,
  IMAGE_TEXTURES,
  REGION_TERRAIN_TEXTURES,
  REGION_TERRAIN_THEME_ALIASES,
  TEX,
  type BuildingWeatherVariant,
  type RegionTerrainThemeId,
  type RegionTerrainTextures,
} from './textures';

type PointKind = 'industry' | 'craft' | 'activity' | 'gate' | 'subregionGate';
type ActivityPointKind = RegionMapSpec['activities'][number]['kind'];

interface PointSpec {
  kind: PointKind;
  label: string;
  payload: string;
  tex: string;
  routeId?: string;
  unlocked?: boolean;
  tileW?: number;
  tileH?: number;
}

interface PointLocation {
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
  px: number;
  py: number;
}

const MAP_W = 52;
const MAP_H = 28;
const ROAD_ROWS = [6, 13, 20] as const;
const ROAD_ROW_TOP = ROAD_ROWS[0];
const ROAD_ROW_BOTTOM = ROAD_ROWS[ROAD_ROWS.length - 1];
const BUILDING_TILE_W = 3;
const BUILDING_TILE_H = 3;
const TILE = 32;
const COL_STEP = 5;
const LEFT_PAD = 4;
const POINT_GAP_OFFSET = 3;
const INTERACT_RANGE = TILE * 1.8;

const TIER_LABEL: Record<IndustryTier, string> = {
  harvest: '采集',
  refine: '精炼',
  product: '制作',
};

const DEFAULT_TIER_TEX: Record<IndustryTier, string> = {
  harvest: TEX.indHarvest,
  refine: TEX.indRefine,
  product: TEX.indProduct,
};

const INDUSTRY_TEX_RULES: ReadonlyArray<[RegExp, string]> = [
  [/cocoon|sericulture|weave|brocade|silk|ramie|kapok/i, TEX.indLoom],
  [/iron|copper|silver|forge|smelt|cloisonne|filigree/i, TEX.indForge],
  [/ore|coal|kaolin|pigment|mine|stone|jade/i, TEX.indMine],
  [/paper|ink|qingtan|pine|kiln|porcelain|clay/i, TEX.indKiln],
  [/tea|bamboo|indigo|lacquer|harvest|tap|pick|split/i, TEX.indField],
  [/market|trade|cast/i, TEX.indMarket],
];

const CRAFT_TEX_RULES: ReadonlyArray<[RegExp, string]> = [
  [/indigo|dye|batik|gambiered/i, TEX.craftIndigo],
  [/bamboo|umbrella|qingshen/i, TEX.craftBamboo],
  [/celadon|porcelain|pottery|ceramic|jingdezhen|jianshui|shiwan|clay/i, TEX.craftCeramic],
  [/sword|silver|copper|cloisonne|filigree|metal|wutong|ware/i, TEX.craftMetal],
  [/brocade|embroidery|kesi|silk|carpet|xiabu|atlas|textile|weave/i, TEX.craftTextile],
  [/paper|ink|inkstone|thangka|painting|stationery|xuan|she|duan/i, TEX.craftPaper],
  [/lacquer|vinegar|incense|furniture|carving|wood|jade/i, TEX.craftLacquer],
];

const ACTIVITY_TEX: Record<ActivityPointKind, string> = {
  resource: TEX.indField,
  workshop: TEX.craft,
  training: TEX.craftPaper,
  trade: TEX.indMarket,
  life: TEX.indHarvest,
  festival: TEX.lanternPost,
  route: TEX.gate,
};

const TEXTURE_ASSET = new Map<string, string>(IMAGE_TEXTURES.map(([key, url]) => [key, url]));

const OBJECT_ID_BY_TEX: Record<string, string> = {
  [TEX.indHarvest]: 'industry_harvest',
  [TEX.indRefine]: 'industry_refine',
  [TEX.indProduct]: 'industry_product',
  [TEX.indField]: 'industry_field',
  [TEX.indMine]: 'industry_mine',
  [TEX.indKiln]: 'industry_kiln',
  [TEX.indForge]: 'industry_forge',
  [TEX.indLoom]: 'industry_loom',
  [TEX.indMarket]: 'industry_market',
  [TEX.craft]: 'craft_house',
  [TEX.craftIndigo]: 'craft_indigo',
  [TEX.craftBamboo]: 'craft_bamboo',
  [TEX.craftCeramic]: 'craft_ceramic',
  [TEX.craftMetal]: 'craft_metal',
  [TEX.craftTextile]: 'craft_textile',
  [TEX.craftPaper]: 'craft_paper',
  [TEX.craftLacquer]: 'craft_lacquer',
  [TEX.gate]: 'gate',
  [TEX.willow]: 'willow',
  [TEX.teaStall]: 'tea_stall',
  [TEX.lanternPost]: 'lantern_post',
  [TEX.banner]: 'banner',
  [TEX.noticeBoard]: 'notice_board',
  [TEX.dock]: 'dock',
  [TEX.boat]: 'boat',
  [TEX.marketCrates]: 'market_crates',
  [TEX.paperUmbrella]: 'paper_umbrella',
  [TEX.summerWaterGrassClump]: 'fg_water_grass',
  [TEX.summerDenseReedClump]: 'fg_reed_clump',
  [TEX.summerLushTreeCrown]: 'fg_tree_crown',
  [TEX.npcTourist]: 'npc_tourist',
  [TEX.npcVendor]: 'npc_vendor',
  [TEX.player]: 'player_spawn',
};

const TILE_ID_BY_TEX = new Map<string, string>([
  [TEX.ground, 'ground'],
  [TEX.summerLushGround, 'summer_lush_ground'],
  [TEX.groundStone, 'ground_stone'],
  [TEX.road, 'road'],
  [TEX.roadVertical, 'road_vertical'],
  [TEX.roadCross, 'road_cross'],
  [TEX.water, 'water'],
  [TEX.waterEdgeLeft, 'water_edge_left'],
  [TEX.waterEdgeRight, 'water_edge_right'],
  [TEX.pondWaterGrassCenter, 'pond_water_grass_center'],
  [TEX.bridge, 'bridge'],
]);

for (const [themeId, textures] of Object.entries(REGION_TERRAIN_TEXTURES) as Array<[RegionTerrainThemeId, RegionTerrainTextures]>) {
  TILE_ID_BY_TEX.set(textures.ground, `region_${themeId}_ground`);
  TILE_ID_BY_TEX.set(textures.groundAlt, `region_${themeId}_ground_alt`);
  TILE_ID_BY_TEX.set(textures.road, `region_${themeId}_road`);
  TILE_ID_BY_TEX.set(textures.roadVertical, `region_${themeId}_road_vertical`);
  TILE_ID_BY_TEX.set(textures.roadCross, `region_${themeId}_road_cross`);
  TILE_ID_BY_TEX.set(textures.water, `region_${themeId}_water`);
  TILE_ID_BY_TEX.set(textures.waterEdgeLeft, `region_${themeId}_water_edge_left`);
  TILE_ID_BY_TEX.set(textures.waterEdgeRight, `region_${themeId}_water_edge_right`);
  TILE_ID_BY_TEX.set(textures.vegetation, `region_${themeId}_vegetation`);
  TILE_ID_BY_TEX.set(textures.courtyard, `region_${themeId}_courtyard`);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function keyOf(x: number, y: number) {
  return `${x},${y}`;
}

function textureForIndustry(id: string, tier: IndustryTier) {
  return INDUSTRY_TEX_RULES.find(([pattern]) => pattern.test(id))?.[1] ?? DEFAULT_TIER_TEX[tier];
}

function textureForCraft(id: string) {
  return CRAFT_TEX_RULES.find(([pattern]) => pattern.test(id))?.[1] ?? TEX.craft;
}

function textureForActivity(kind: ActivityPointKind) {
  return ACTIVITY_TEX[kind] ?? TEX.indProduct;
}

function tileLayerForTexture(tex: string): RuntimeMapEditorTile['layer'] {
  if (tex.includes('water') || tex.includes('pond')) return 'water';
  if (tex.includes('road') || tex.includes('bridge')) return 'road';
  return 'terrain';
}

function interactionForPoint(kind: PointKind) {
  return kind === 'subregionGate' ? 'gate' : kind;
}

function runtimeInteractionForPoint(kind: PointKind) {
  return kind === 'subregionGate' ? 'subregionGate' : undefined;
}

function objectCategoryForLayer(layer: string) {
  if (layer === 'structure') return 'building';
  if (layer === 'actor') return 'actor';
  if (layer === 'marker') return 'marker';
  return 'prop';
}

export function buildStreetMapEditorSnapshot(spec: RegionMapSpec): RuntimeMapEditorSnapshot {
  const builder = new StreetSnapshotBuilder(spec);
  return builder.build();
}

class StreetSnapshotBuilder {
  private readonly tiles = new Map<string, RuntimeMapEditorTile>();
  private readonly objects: RuntimeMapEditorObject[] = [];
  private readonly roadTiles = new Set<string>();
  private readonly pointLocations = new Map<string, PointLocation>();
  private blocked: boolean[][];
  private primaryRoadRows: number[] = [];
  private primaryRoadCols: number[] = [];
  private mapWTiles = MAP_W;

  constructor(private readonly spec: RegionMapSpec) {
    this.blocked = Array.from({ length: MAP_H }, () => new Array<boolean>(MAP_W).fill(false));
  }

  build(): RuntimeMapEditorSnapshot {
    const all = this.pointSpecs();
    this.mapWTiles = Math.max(MAP_W, this.spec.layout?.size.w ?? 0, 52 + Math.ceil(all.length / 6) * 7);
    this.blocked = Array.from({ length: MAP_H }, () => new Array<boolean>(this.mapWTiles).fill(false));
    this.buildStreetNetwork();
    this.reserveLayoutObjectFootprints();
    this.paintBaseTiles();
    this.buildTerrain(this.spec.terrain);
    if (!this.spec.layout?.tiles?.length) this.decorateStreetProps(this.spec.terrain);
    this.applyLayoutDecor();
    this.placeInteractionPoints(all);
    this.placeNpcs();
    this.placePlayerSpawn();

    return {
      schema: 'artisania-map-editor/v2',
      regionId: this.spec.regionId,
      subregionId: this.spec.subregionId,
      tileSize: TILE,
      size: { w: this.mapWTiles, h: MAP_H },
      roads: this.spec.layout?.roads ?? [],
      tiles: [...this.tiles.values()],
      objects: this.objects.sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    };
  }

  private pointSpecs(): PointSpec[] {
    return [
      ...this.spec.industries.map((item) => ({
        kind: 'industry' as const,
        label: `${item.name}·${TIER_LABEL[item.tier]}`,
        payload: item.id,
        tex: textureForIndustry(item.id, item.tier),
      })),
      ...this.spec.crafts.map((item) => ({
        kind: 'craft' as const,
        label: item.name,
        payload: item.id,
        tex: textureForCraft(item.id),
      })),
      ...this.spec.activities.map((item) => ({
        kind: 'activity' as const,
        label: item.name,
        payload: item.id,
        tex: textureForActivity(item.kind),
      })),
      ...this.spec.subregionGates.map((item) => ({
        kind: 'subregionGate' as const,
        label: `往 ${item.name}`,
        payload: item.subregionId,
        tex: TEX.gate,
      })),
      ...this.spec.gates.map((item) => ({
        kind: 'gate' as const,
        label: item.unlocked ? `往 ${item.name}` : `${item.routeName ?? item.name}·未通`,
        payload: item.regionId,
        routeId: item.routeId,
        unlocked: item.unlocked,
        tex: TEX.gate,
      })),
    ];
  }

  private regionTerrainTheme() {
    const themeId = REGION_TERRAIN_THEME_ALIASES[this.spec.regionId];
    return themeId ? REGION_TERRAIN_TEXTURES[themeId] : null;
  }

  private usesWeatherArt() {
    return this.spec.regionId === 'jiangnan';
  }

  private buildingWeatherVariant(): BuildingWeatherVariant | null {
    if (!this.usesWeatherArt()) return null;
    if (this.spec.weather === 'rain') return 'rain';
    if (this.spec.weather === 'snow' || this.spec.season === 'winter') return 'winter';
    if (this.spec.season === 'summer') return 'summer';
    if (this.spec.season === 'autumn') return 'autumn';
    return null;
  }

  private buildingTextureFor(baseTex: string) {
    const variant = this.buildingWeatherVariant();
    return variant ? BUILDING_WEATHER_TEXTURES[baseTex]?.[variant] ?? baseTex : baseTex;
  }

  private setRoadTile(tx: number, ty: number) {
    if (tx < 0 || tx >= this.mapWTiles || ty < 0 || ty >= MAP_H) return;
    this.roadTiles.add(keyOf(tx, ty));
  }

  private isRoadTile(tx: number, ty: number) {
    return this.roadTiles.has(keyOf(tx, ty));
  }

  private addRoadPath(points: { tx: number; ty: number }[]) {
    for (let i = 1; i < points.length; i += 1) {
      const from = points[i - 1];
      const to = points[i];
      if (from.ty === to.ty) {
        const min = Math.min(from.tx, to.tx);
        const max = Math.max(from.tx, to.tx);
        for (let x = min; x <= max; x += 1) this.setRoadTile(x, from.ty);
      } else if (from.tx === to.tx) {
        const min = Math.min(from.ty, to.ty);
        const max = Math.max(from.ty, to.ty);
        for (let y = min; y <= max; y += 1) this.setRoadTile(from.tx, y);
      } else {
        this.addRoadPath([from, { tx: to.tx, ty: from.ty }, to]);
      }
    }
  }

  private buildStreetNetwork() {
    const layout = this.spec.layout;
    if (layout?.roads?.length) {
      this.primaryRoadRows = [...new Set(layout.roads.flatMap((path) => path.points.map((point) => point.y)))]
        .filter((row) => row >= 0 && row < MAP_H)
        .sort((a, b) => a - b);
      this.primaryRoadCols = [...new Set(layout.roads.flatMap((path) => path.points.map((point) => point.x)))]
        .filter((col) => col >= 0 && col < this.mapWTiles)
        .sort((a, b) => a - b);
      for (const path of layout.roads) {
        this.addRoadPath(path.points.map((point) => ({ tx: point.x, ty: point.y })));
      }
      if (!this.primaryRoadRows.length) this.primaryRoadRows = [...ROAD_ROWS];
      if (!this.primaryRoadCols.length) this.primaryRoadCols = [7, Math.round(this.mapWTiles * 0.5), this.mapWTiles - 8];
      return;
    }

    const cols = [7, Math.round(this.mapWTiles * 0.34), Math.round(this.mapWTiles * 0.62), this.mapWTiles - 8]
      .map((x) => clamp(x, 4, this.mapWTiles - 5));
    this.primaryRoadRows = [...ROAD_ROWS];
    this.primaryRoadCols = [...new Set(cols)].sort((a, b) => a - b);

    this.primaryRoadRows.forEach((row, i) => {
      const bendA = row + (i % 2 === 0 ? 1 : -1);
      const bendB = row + (i === 1 ? 1 : 0);
      this.addRoadPath([
        { tx: 2, ty: row },
        { tx: this.primaryRoadCols[1] - 2, ty: row },
        { tx: this.primaryRoadCols[1] + 2, ty: bendA },
        { tx: this.primaryRoadCols[2] - 2, ty: bendA },
        { tx: this.primaryRoadCols[2] + 2, ty: bendB },
        { tx: this.mapWTiles - 3, ty: bendB },
      ]);
    });

    this.primaryRoadCols.forEach((col, i) => {
      const jog = i % 2 === 0 ? 1 : -1;
      this.addRoadPath([
        { tx: col, ty: 2 },
        { tx: col, ty: this.primaryRoadRows[0] + 1 },
        { tx: col + jog, ty: this.primaryRoadRows[1] },
        { tx: col + jog, ty: this.primaryRoadRows[2] - 1 },
        { tx: col, ty: MAP_H - 3 },
      ]);
    });
  }

  private roadTextureAt(tx: number, ty: number) {
    const horizontal = this.isRoadTile(tx - 1, ty) || this.isRoadTile(tx + 1, ty);
    const vertical = this.isRoadTile(tx, ty - 1) || this.isRoadTile(tx, ty + 1);
    const regionTerrain = this.regionTerrainTheme();
    if (regionTerrain) {
      if (horizontal && vertical) return regionTerrain.roadCross;
      if (vertical) return regionTerrain.roadVertical;
      return regionTerrain.road;
    }
    if (horizontal && vertical) return TEX.roadCross;
    if (vertical) return TEX.roadVertical;
    return TEX.road;
  }

  private groundTextureAt(tx: number, ty: number) {
    const nearCross =
      this.primaryRoadRows.some((row) => Math.abs(row - ty) <= 2) &&
      this.primaryRoadCols.some((col) => Math.abs(col - tx) <= 2);
    const regionTerrain = this.regionTerrainTheme();
    if (regionTerrain) {
      const nearRoadBand =
        this.primaryRoadRows.some((row) => Math.abs(row - ty) <= 1) ||
        this.primaryRoadCols.some((col) => Math.abs(col - tx) <= 1);
      if (nearCross && nearRoadBand) return regionTerrain.courtyard;
      if ((tx * 5 + ty * 3) % 47 === 0) return regionTerrain.groundAlt;
      return regionTerrain.ground;
    }
    if (nearCross) return TEX.groundStone;
    return TEX.ground;
  }

  private paintBaseTiles() {
    const explicitTiles = new Map((this.spec.layout?.tiles ?? []).map((tile) => [keyOf(tile.x, tile.y), tile]));
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < this.mapWTiles; x += 1) {
        const explicit = explicitTiles.get(keyOf(x, y));
        if (explicit) {
          this.setTile({ ...explicit, x, y });
          if (explicit.solid || explicit.layer === 'water') this.markBlocked(x, y);
          continue;
        }
        const tex = this.isRoadTile(x, y) ? this.roadTextureAt(x, y) : this.groundTextureAt(x, y);
        this.setTileFromTexture(x, y, tex, false);
      }
    }
  }

  private setTile(tile: RuntimeMapEditorTile) {
    this.tiles.set(keyOf(tile.x, tile.y), tile);
  }

  private setTileFromTexture(x: number, y: number, tex: string, solid: boolean) {
    const itemId = TILE_ID_BY_TEX.get(tex);
    if (!itemId) {
      this.addObjectFromTexture({
        itemId: `runtime-tile-${tex}`,
        name: tex,
        tex,
        x,
        y,
        tileW: 1,
        tileH: 1,
        solid,
        layer: 'prop',
        category: 'prop',
        z: solid ? y + 400 : 1,
      });
      if (solid) this.markBlocked(x, y);
      return;
    }
    const layer = tileLayerForTexture(tex);
    this.setTile({
      itemId,
      name: itemId,
      x,
      y,
      layer,
      asset: TEXTURE_ASSET.get(tex),
      solid,
      interaction: 'none',
    });
    if (solid) this.markBlocked(x, y);
  }

  private markBlocked(tx: number, ty: number) {
    if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < this.mapWTiles && this.blocked[ty]) {
      this.blocked[ty][tx] = true;
    }
  }

  private bridgeAngleForRoadTile(tx: number, ty: number) {
    const horizontal = this.isRoadTile(tx - 1, ty) || this.isRoadTile(tx + 1, ty);
    const vertical = this.isRoadTile(tx, ty - 1) || this.isRoadTile(tx, ty + 1);
    return horizontal || !vertical ? 90 : 0;
  }

  private addDecorTile(tx: number, ty: number, tex: string, solid: boolean) {
    if (tx < 0 || tx >= this.mapWTiles || ty < 0 || ty >= MAP_H) return;
    if (this.blocked[ty]?.[tx]) return;
    if (!solid && this.isRoadTile(tx, ty) && tex !== TEX.bridge) return;
    this.setTileFromTexture(tx, ty, tex, solid);
  }

  private applyLayoutDecor() {
    for (const object of this.spec.layout?.objects ?? []) {
      if (object.interaction !== 'decoration') continue;
      // Generic layout decorations used to materialize as rock tiles.
      // The map editor now treats those stray stone placeholders as removable noise.
    }
  }

  private canPlaceProp(anchorTx: number, anchorTy: number, tileW = 1, tileH = 1) {
    const startX = anchorTx - Math.floor(tileW / 2);
    const startY = anchorTy - tileH + 1;
    if (startX < 1 || startY < 1 || startX + tileW - 1 >= this.mapWTiles || startY + tileH - 1 >= MAP_H) {
      return false;
    }
    for (let y = startY; y < startY + tileH; y += 1) {
      for (let x = startX; x < startX + tileW; x += 1) {
        if (this.isRoadTile(x, y) || this.blocked[y]?.[x]) return false;
      }
    }
    return true;
  }

  private addProp(anchorTx: number, anchorTy: number, tex: string, solid = false, tileW = 1, tileH = 1, layer = 'prop') {
    if (anchorTx < 0 || anchorTx >= this.mapWTiles || anchorTy < 0 || anchorTy >= MAP_H) return;
    const x = anchorTx - Math.floor(tileW / 2);
    const y = anchorTy - tileH + 1;
    this.addObjectFromTexture({
      itemId: OBJECT_ID_BY_TEX[tex] ?? `runtime-prop-${tex}`,
      name: OBJECT_ID_BY_TEX[tex] ?? tex,
      tex,
      x,
      y,
      tileW,
      tileH,
      solid,
      layer,
      category: objectCategoryForLayer(layer),
      z: (anchorTy + 1) * TILE,
    });
    if (solid) {
      for (let yy = y; yy < y + tileH; yy += 1) {
        for (let xx = x; xx < x + tileW; xx += 1) this.markBlocked(xx, yy);
      }
    }
  }

  private tryAddProp(anchorTx: number, anchorTy: number, tex: string, tileW = 1, tileH = 1, solid = true) {
    if (!this.canPlaceProp(anchorTx, anchorTy, tileW, tileH)) return;
    this.addProp(anchorTx, anchorTy, tex, solid, tileW, tileH);
  }

  private addForegroundCover(anchorTx: number, anchorTy: number, tex: string, tileW = 2, tileH = 2) {
    if (!this.canPlaceProp(anchorTx, anchorTy, tileW, tileH)) return;
    this.addProp(anchorTx, anchorTy, tex, false, tileW, tileH, 'foreground');
  }

  private decorateStreetProps(kind: TerrainKind) {
    const rows = this.primaryRoadRows.length ? this.primaryRoadRows : [...ROAD_ROWS];
    const regionTerrain = this.regionTerrainTheme();
    rows.forEach((row, index) => {
      this.tryAddProp(3 + index * 2, row - 1, TEX.lanternPost, 1, 2);
      this.tryAddProp(this.mapWTiles - 5 - index * 2, row + 2, TEX.banner, 1, 2);
      this.tryAddProp(8 + index * 9, row + 2, TEX.noticeBoard, 2, 2);
      if (regionTerrain) {
        this.addDecorTile(5 + index * 10, row + 1, regionTerrain.vegetation, false);
        this.addDecorTile(Math.floor(this.mapWTiles * 0.58) + index * 5, row - 2, regionTerrain.groundAlt, false);
      }
    });

    const stallRow = rows[1] ?? ROAD_ROWS[1];
    this.tryAddProp(Math.floor(this.mapWTiles * 0.24), stallRow - 1, TEX.teaStall, 3, 2);
    this.tryAddProp(Math.floor(this.mapWTiles * 0.74), stallRow + 2, TEX.teaStall, 3, 2);
    this.tryAddProp(Math.floor(this.mapWTiles * 0.32), stallRow + 2, TEX.marketCrates, 3, 2);
    this.tryAddProp(Math.floor(this.mapWTiles * 0.66), stallRow - 1, TEX.paperUmbrella, 2, 3);

    if (kind !== 'water') {
      this.tryAddProp(Math.floor(this.mapWTiles * 0.18), ROAD_ROW_TOP - 2, TEX.willow, 2, 3);
      this.tryAddProp(Math.floor(this.mapWTiles * 0.82), ROAD_ROW_BOTTOM + 3, TEX.willow, 2, 3);
    }

    const coverTex = kind === 'water' ? TEX.summerDenseReedClump : TEX.summerWaterGrassClump;
    rows.forEach((row, index) => {
      this.addForegroundCover(Math.floor(this.mapWTiles * (0.22 + index * 0.18)), row + 1, coverTex, 3, 2);
      this.addForegroundCover(Math.floor(this.mapWTiles * (0.72 - index * 0.12)), row - 1, coverTex, 3, 2);
    });
    if (kind === 'mountain') {
      this.addForegroundCover(Math.floor(this.mapWTiles * 0.14), ROAD_ROW_TOP - 1, TEX.summerLushTreeCrown, 3, 3);
      this.addForegroundCover(Math.floor(this.mapWTiles * 0.86), ROAD_ROW_BOTTOM + 2, TEX.summerLushTreeCrown, 3, 3);
    }
  }

  private buildTerrain(kind: TerrainKind) {
    const regionTerrain = this.regionTerrainTheme();
    if (kind === 'water') {
      const target = Math.floor(this.mapWTiles * 0.5);
      const k = Math.round((target - LEFT_PAD - POINT_GAP_OFFSET) / COL_STEP);
      let riverCol = LEFT_PAD + POINT_GAP_OFFSET + Math.max(0, k) * COL_STEP;
      riverCol = Math.min(this.mapWTiles - 4, Math.max(3, riverCol));
      if ((riverCol - LEFT_PAD + COL_STEP * 1000) % COL_STEP !== POINT_GAP_OFFSET) {
        riverCol = LEFT_PAD + POINT_GAP_OFFSET + Math.max(0, k - 1) * COL_STEP;
      }
      const riverAt = (y: number) => {
        const drift = Math.round(Math.sin(y * 0.52) * 1.35) + (y > ROAD_ROW_BOTTOM ? -1 : 0);
        return clamp(riverCol + drift, 3, this.mapWTiles - 4);
      };
      const summerWater = this.usesWeatherArt() && this.spec.season === 'summer';
      const waterCenter = regionTerrain?.water ?? TEX.water;
      const waterLeft = regionTerrain?.waterEdgeLeft ?? TEX.waterEdgeLeft;
      const waterRight = regionTerrain?.waterEdgeRight ?? TEX.waterEdgeRight;
      for (let y = 0; y < MAP_H; y += 1) {
        const col = riverAt(y);
        const tiles = [
          [col - 1, summerWater && !regionTerrain ? TEX.pondWaterGrassEdgeRight : waterRight],
          [
            col,
            summerWater && !regionTerrain && (y * 5 + col) % 7 === 0
              ? TEX.pondLotusDuckweed
              : summerWater && !regionTerrain
                ? TEX.pondWaterGrassCenter
                : waterCenter,
          ],
          [col + 1, summerWater && !regionTerrain ? TEX.pondWaterGrassEdgeLeft : waterLeft],
        ] as const;
        const onRoad = tiles.some(([x]) => this.isRoadTile(x, y));
        for (const [x, tex] of tiles) {
          this.addDecorTile(x, y, onRoad ? TEX.bridge : tex, !onRoad);
          void this.bridgeAngleForRoadTile(x, y);
        }
      }
      this.tryAddProp(riverAt(ROAD_ROW_TOP + 2) - 5, ROAD_ROW_TOP + 2, TEX.willow, 2, 3);
      this.tryAddProp(riverAt(ROAD_ROW_TOP + 3) + 5, ROAD_ROW_TOP + 3, TEX.teaStall, 3, 2);
      this.tryAddProp(riverAt(ROAD_ROW_BOTTOM + 3) - 4, ROAD_ROW_BOTTOM + 3, TEX.dock, 3, 1);
      this.tryAddProp(riverAt(ROAD_ROW_BOTTOM + 3) + 5, ROAD_ROW_BOTTOM + 3, TEX.boat, 4, 1, false);
      if (summerWater) {
        this.addForegroundCover(riverAt(ROAD_ROW_TOP + 5) - 2, ROAD_ROW_TOP + 5, TEX.summerDenseReedClump, 3, 2);
        this.tryAddProp(riverAt(ROAD_ROW_BOTTOM - 2) + 2, ROAD_ROW_BOTTOM - 2, TEX.summerLotusPatch, 3, 2, false);
      }
    } else if (kind === 'coast') {
      const coastWater = regionTerrain?.water ?? TEX.water;
      const coastBank = regionTerrain?.waterEdgeLeft ?? TEX.groundStone;
      for (let y = MAP_H - 2; y < MAP_H; y += 1) {
        for (let x = 0; x < this.mapWTiles; x += 1) this.addDecorTile(x, y, coastWater, true);
      }
      for (let x = 2; x < this.mapWTiles; x += 6) this.addDecorTile(x, MAP_H - 3, coastBank, true);
      this.tryAddProp(7, MAP_H - 3, TEX.dock, 3, 1);
      this.tryAddProp(12, MAP_H - 2, TEX.boat, 4, 1, false);
      this.tryAddProp(this.mapWTiles - 8, MAP_H - 3, TEX.dock, 3, 1);
    } else if (kind === 'mountain') {
      for (let x = 2; x < this.mapWTiles - 1; x += 4) {
        const treeY = x % 8 === 2 ? ROAD_ROW_TOP - 3 : ROAD_ROW_BOTTOM + 2;
        if (treeY >= 0 && treeY < MAP_H && (treeY < ROAD_ROW_TOP || treeY > ROAD_ROW_BOTTOM)) {
          this.addDecorTile(x, treeY, regionTerrain ? (x % 3 !== 0 ? regionTerrain.vegetation : regionTerrain.groundAlt) : TEX.groundStone, true);
        }
      }
    } else {
      for (let x = 1; x < this.mapWTiles - 1; x += 1) {
        if (x % 4 === 0) continue;
        if (regionTerrain) {
          const topEdge = x % 11 === 1 ? regionTerrain.vegetation : regionTerrain.groundAlt;
          const bottomEdge = x % 11 === 5 ? regionTerrain.vegetation : regionTerrain.groundAlt;
          this.addDecorTile(x, ROAD_ROW_TOP - 1, topEdge, true);
          this.addDecorTile(x, ROAD_ROW_BOTTOM + 1, bottomEdge, true);
        } else {
          this.addDecorTile(x, ROAD_ROW_TOP - 1, TEX.fence, true);
          this.addDecorTile(x, ROAD_ROW_BOTTOM + 1, TEX.fence, true);
        }
      }
    }
  }

  private footprintFor(tex: string, tileW?: number, tileH?: number) {
    if (tileW && tileH) return { w: tileW, h: tileH };
    if (tex === TEX.gate) return { w: 3, h: 3 };
    return { w: BUILDING_TILE_W, h: BUILDING_TILE_H };
  }

  private canPlaceBuilding(tileX: number, tileY: number, tileW = BUILDING_TILE_W, tileH = BUILDING_TILE_H) {
    if (tileX < 1 || tileY < 1 || tileX + tileW - 1 >= this.mapWTiles || tileY + tileH - 1 >= MAP_H) return false;
    for (let y = tileY; y < tileY + tileH; y += 1) {
      for (let x = tileX; x < tileX + tileW; x += 1) {
        if (this.isRoadTile(x, y) || this.blocked[y]?.[x]) return false;
      }
    }
    return true;
  }

  private fallbackPointSlot(index: number) {
    const row = this.primaryRoadRows[index % this.primaryRoadRows.length] ?? ROAD_ROWS[1];
    const x = 3 + ((index * 7) % Math.max(9, this.mapWTiles - 10));
    const y = clamp(row + (index % 2 === 0 ? -BUILDING_TILE_H : 1), 1, MAP_H - BUILDING_TILE_H - 1);
    return { tileX: x, tileY: y };
  }

  private layoutSlotForPoint(item: PointSpec) {
    const object = this.spec.layout?.objects.find(
      (entry) => entry.interaction === item.kind && entry.targetId === item.payload,
    );
    if (!object) return null;
    return {
      tileX: object.x,
      tileY: object.y,
      tileW: object.tileW,
      tileH: object.tileH,
    };
  }

  private layoutOccupiedSlots() {
    const occupied = new Set<string>();
    for (const object of this.spec.layout?.objects ?? []) {
      if (object.interaction === 'decoration' || object.interaction === 'npc') continue;
      const tileW = object.tileW ?? BUILDING_TILE_W;
      const tileH = object.tileH ?? BUILDING_TILE_H;
      for (let y = object.y; y < object.y + tileH; y += 1) {
        for (let x = object.x; x < object.x + tileW; x += 1) occupied.add(keyOf(x, y));
      }
    }
    return occupied;
  }

  private reserveLayoutObjectFootprints() {
    for (const object of this.spec.layout?.objects ?? []) {
      if (object.interaction === 'decoration' || object.interaction === 'npc') continue;
      const tileW = object.tileW ?? BUILDING_TILE_W;
      const tileH = object.tileH ?? BUILDING_TILE_H;
      for (let y = object.y; y < object.y + tileH; y += 1) {
        for (let x = object.x; x < object.x + tileW; x += 1) this.markBlocked(x, y);
      }
    }
  }

  private slotOverlapsOccupied(tileX: number, tileY: number, tileW: number, tileH: number, occupied: Set<string>) {
    for (let y = tileY; y < tileY + tileH; y += 1) {
      for (let x = tileX; x < tileX + tileW; x += 1) {
        if (occupied.has(keyOf(x, y))) return true;
      }
    }
    return false;
  }

  private buildPointSlots(count: number): Array<{ tileX: number; tileY: number; tileW?: number; tileH?: number }> {
    const slots: { tileX: number; tileY: number }[] = [];
    const occupied = this.layoutOccupiedSlots();
    for (const row of this.primaryRoadRows) {
      for (let x = 3; x < this.mapWTiles - BUILDING_TILE_W - 3; x += 7) {
        const sides = (x + row) % 2 === 0 ? [-BUILDING_TILE_H, 1] : [1, -BUILDING_TILE_H];
        for (const side of sides) {
          const tileX = x;
          const tileY = clamp(row + side, 1, MAP_H - BUILDING_TILE_H - 1);
          if (
            this.slotOverlapsOccupied(tileX, tileY, BUILDING_TILE_W, BUILDING_TILE_H, occupied) ||
            !this.canPlaceBuilding(tileX, tileY)
          ) continue;
          for (let y = tileY; y < tileY + BUILDING_TILE_H; y += 1) {
            for (let xx = tileX; xx < tileX + BUILDING_TILE_W; xx += 1) occupied.add(keyOf(xx, y));
          }
          slots.push({ tileX, tileY });
          if (slots.length >= count) return slots;
        }
      }
    }
    let i = 0;
    while (slots.length < count && i < count * 4) {
      const slot = this.fallbackPointSlot(i);
      i += 1;
      if (
        this.slotOverlapsOccupied(slot.tileX, slot.tileY, BUILDING_TILE_W, BUILDING_TILE_H, occupied) ||
        !this.canPlaceBuilding(slot.tileX, slot.tileY)
      ) continue;
      for (let y = slot.tileY; y < slot.tileY + BUILDING_TILE_H; y += 1) {
        for (let x = slot.tileX; x < slot.tileX + BUILDING_TILE_W; x += 1) occupied.add(keyOf(x, y));
      }
      slots.push(slot);
    }
    return slots;
  }

  private placeInteractionPoints(all: PointSpec[]) {
    const slots = this.buildPointSlots(all.length);
    all.forEach((item, index) => {
      const layoutSlot = this.layoutSlotForPoint(item);
      const slot = layoutSlot ?? slots[index] ?? this.fallbackPointSlot(index);
      const footprint = this.footprintFor(item.tex, slot.tileW ?? item.tileW, slot.tileH ?? item.tileH);
      const tileX = slot.tileX;
      const tileY = slot.tileY;
      const px = tileX * TILE + (footprint.w * TILE) / 2;
      const py = (tileY + footprint.h) * TILE;
      const tex = this.buildingTextureFor(item.tex);
      this.addObjectFromTexture({
        itemId: OBJECT_ID_BY_TEX[item.tex] ?? `runtime-point-${item.kind}-${item.payload}`,
        name: item.label,
        tex,
        x: tileX,
        y: tileY,
        tileW: footprint.w,
        tileH: footprint.h,
        solid: true,
        layer: 'structure',
        category: 'building',
        interaction: interactionForPoint(item.kind),
        runtimeInteraction: runtimeInteractionForPoint(item.kind),
        targetId: item.payload,
        z: py,
      });
      for (let y = tileY; y < tileY + footprint.h; y += 1) {
        for (let x = tileX; x < tileX + footprint.w; x += 1) this.markBlocked(x, y);
      }
      this.pointLocations.set(item.payload, { tileX, tileY, tileW: footprint.w, tileH: footprint.h, px, py });
    });
  }

  private roadTileList() {
    return [...this.roadTiles]
      .map((key) => {
        const [tx, ty] = key.split(',').map(Number);
        return { tx, ty };
      })
      .filter(({ tx, ty }) => !this.blocked[ty]?.[tx])
      .sort((a, b) => (a.ty === b.ty ? a.tx - b.tx : a.ty - b.ty));
  }

  private nearestRoadTileAround(tx: number, ty: number) {
    let best: { tx: number; ty: number } | null = null;
    let bestDist = Infinity;
    for (const tile of this.roadTileList()) {
      const distance = Math.abs(tile.tx - tx) + Math.abs(tile.ty - ty);
      if (distance < bestDist) {
        best = tile;
        bestDist = distance;
      }
    }
    return best;
  }

  private vendorStandTileForAnchor(anchor: PointLocation) {
    const minPointDistance = INTERACT_RANGE + TILE * 0.45;
    const targets = [
      { tx: anchor.tileX + anchor.tileW + 2, ty: anchor.tileY + anchor.tileH },
      { tx: anchor.tileX - 2, ty: anchor.tileY + anchor.tileH },
      { tx: anchor.tileX + Math.floor(anchor.tileW / 2), ty: anchor.tileY + anchor.tileH + 2 },
      { tx: anchor.tileX + Math.floor(anchor.tileW / 2), ty: anchor.tileY - 2 },
    ];
    const roads = this.roadTileList();
    for (const target of targets) {
      const sorted = [...roads].sort(
        (a, b) =>
          Math.abs(a.tx - target.tx) +
          Math.abs(a.ty - target.ty) -
          (Math.abs(b.tx - target.tx) + Math.abs(b.ty - target.ty)),
      );
      const stand = sorted.find((tile) => {
        const wx = tile.tx * TILE + TILE / 2;
        const wy = tile.ty * TILE + TILE / 2;
        return Math.hypot(wx - anchor.px, wy - anchor.py) >= minPointDistance;
      });
      if (stand) return stand;
    }
    return this.nearestRoadTileAround(anchor.tileX + Math.floor(anchor.tileW / 2), anchor.tileY + anchor.tileH);
  }

  private placeNpcs() {
    const roads = this.roadTileList();
    let touristSlot = 0;
    for (const npc of this.spec.npcs) {
      let tile: { tx: number; ty: number } | null = null;
      if (typeof npc.tileX === 'number' && typeof npc.tileY === 'number') {
        tile = { tx: npc.tileX, ty: npc.tileY };
      } else if (npc.role === 'vendor' && npc.anchorId) {
        const anchor = this.pointLocations.get(npc.anchorId);
        tile = anchor ? this.vendorStandTileForAnchor(anchor) : null;
      } else {
        tile = roads[(touristSlot * 11) % Math.max(1, roads.length)] ?? {
          tx: Math.floor(this.mapWTiles / 2),
          ty: ROAD_ROWS[1],
        };
        touristSlot += 1;
      }
      if (!tile) continue;
      const tex = npc.role === 'vendor' ? TEX.npcVendor : TEX.npcTourist;
      this.addObjectFromTexture({
        itemId: OBJECT_ID_BY_TEX[tex],
        name: npc.name,
        tex,
        x: tile.tx,
        y: tile.ty,
        tileW: 1,
        tileH: 1,
        solid: false,
        layer: 'actor',
        category: 'actor',
        interaction: 'npc',
        npcId: npc.id,
        z: tile.ty * TILE + TILE / 2,
        animated: true,
        sheetCols: 4,
        sheetRows: 4,
        direction: 'down',
      });
    }
  }

  private placePlayerSpawn() {
    const requested = this.spec.layout?.playerStart ?? { x: Math.floor(this.mapWTiles / 2), y: ROAD_ROWS[1] };
    const start = this.nearestRoadTileAround(requested.x, requested.y) ?? requested;
    const x = 'tx' in start ? start.tx : start.x;
    const y = 'ty' in start ? start.ty : start.y;
    this.addObjectFromTexture({
      itemId: 'player_spawn',
      name: '玩家起点',
      tex: TEX.player,
      x,
      y,
      tileW: 1,
      tileH: 1,
      solid: false,
      layer: 'marker',
      category: 'marker',
      interaction: 'marker',
      z: 100000,
      animated: true,
      sheetCols: 4,
      sheetRows: 4,
      direction: 'down',
    });
  }

  private addObjectFromTexture({
    itemId,
    name,
    tex,
    x,
    y,
    tileW,
    tileH,
    solid,
    layer,
    category,
    interaction = 'decoration',
    runtimeInteraction,
    targetId,
    npcId,
    z,
    animated,
    sheetCols,
    sheetRows,
    direction,
  }: {
    itemId: string;
    name: string;
    tex: string;
    x: number;
    y: number;
    tileW: number;
    tileH: number;
    solid: boolean;
    layer: string;
    category: string;
    interaction?: string;
    runtimeInteraction?: string;
    targetId?: string;
    npcId?: string;
    z: number;
    animated?: boolean;
    sheetCols?: number;
    sheetRows?: number;
    direction?: string;
  }) {
    this.objects.push({
      itemId,
      name,
      category,
      x,
      y,
      tileW,
      tileH,
      solid,
      asset: TEXTURE_ASSET.get(tex),
      layer,
      interaction,
      runtimeInteraction,
      targetId,
      npcId,
      allowSameCellStack: true,
      z,
      animated,
      sheetCols,
      sheetRows,
      direction,
    });
  }
}
