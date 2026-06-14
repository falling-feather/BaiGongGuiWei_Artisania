/**
 * 街道场景 —— 地区驱动的可游览空间（完整 demo 版）。
 *
 * 设计意图：场景只负责「空间 / 移动 / 摆点 / 触发」，不 import 数据层。
 * React 通过 EventBus 的 enter-region 命令下发一份 RegionMapSpec，
 * 场景据此重建地图（地面配色、产业点、手艺点、地区出入口）。
 * 玩家走近交互点按 E，场景 emit 对应事件，由 React 接管面板/结算/切换。
 */
import Phaser from 'phaser';
import {
  BUILDING_SNOW_TEXTURES,
  BUILDING_WEATHER_TEXTURES,
  TILE,
  TEX,
  generatePlaceholderTextures,
  preloadArtTextures,
  type BuildingWeatherVariant,
} from '../textures';
import {
  emitBus,
  onCommand,
  type RegionMapSpec,
  type RegionNavigationTarget,
  type IndustryTier,
  type TerrainKind,
  type NpcRole,
  type WeatherKind,
  type WeatherSeason,
} from '../EventBus';
import {
  interactionRectDistance,
  nearestPointOnInteractionRect,
  shouldReplaceNearbyCandidate,
  type InteractionRect,
} from '../nearbyPriority';

// Phaser 场景类无法被有意义地热替换：StreetScene.ts 的局部 HMR 会被上层
// PhaserGame.tsx 的 React Fast Refresh 边界吸收，导致运行中的 Phaser.Game 仍持有
// 旧场景实例，其挂在单例 EventBus 上的 onCommand 订阅继续被触发，而旧实例 group
// 已失效 → buildRegion 的 clear() 读 undefined.size 抛错。这里自接受并 invalidate，
// 把更新冒泡为整页刷新，确保场景与订阅干净重建。
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot!.invalidate();
  });
}
type PointKind = 'industry' | 'craft' | 'activity' | 'gate' | 'subregionGate';
type ActivityPointKind = RegionMapSpec['activities'][number]['kind'];

interface MapPoint {
  kind: PointKind;
  label: string;
  hint: string;
  /** industry: industryId | craft: craftId | activity: activityId | gate: regionId | subregionGate: subregionId */
  payload: string;
  routeId?: string;
  unlocked?: boolean;
  goal?: boolean;
  sprite: Phaser.GameObjects.Image;
  location: PointLocation;
}

/** 地图上的 NPC 实体（游客随机游走 / 关联人物驻守） */
interface NpcEntity {
  id: string;
  name: string;
  role: NpcRole;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  /** 驻守锚点世界坐标（游客以出生点为漫游中心） */
  homeX: number;
  homeY: number;
  /** 下次改变漫游目标的时间戳（ms） */
  nextMove: number;
  /** 当前漫游目标世界坐标 */
  tgtX: number;
  tgtY: number;
}

interface AmbientWalker {
  sprite: Phaser.GameObjects.Sprite;
  direction: -1 | 1;
  speed: number;
  laneY: number;
  role: Extract<NpcRole, 'tourist' | 'vendor'>;
}

interface ForegroundCover {
  image: Phaser.GameObjects.Image;
  bounds: Phaser.Geom.Rectangle;
}

/** 当前感应到的可交互对象（交互点或 NPC） */
interface PointLocation {
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
  px: number;
  py: number;
}

type Nearby =
  | { kind: 'point'; point: MapPoint; x: number; y: number; hint: string }
  | { kind: 'npc'; npc: NpcEntity; x: number; y: number; hint: string };

const MAP_W = 52;
const MAP_H = 28;
const ROAD_ROWS = [6, 13, 20] as const;
const ROAD_ROW_TOP = ROAD_ROWS[0];
const ROAD_ROW_BOTTOM = ROAD_ROWS[ROAD_ROWS.length - 1];
const BUILDING_TILE_W = 3;
const BUILDING_TILE_H = 3;
const PLAYER_SPEED = 160;
const NPC_SPEED = 46;
const CHARACTER_SCALE = 0.72;
const PLAYER_BODY_WIDTH = 18;
const PLAYER_BODY_HEIGHT = 14;
const INTERACT_RANGE = TILE * 1.8;
const FOREGROUND_COVER_DEPTH = 85000;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

// 交互点槽位布局（buildRegion 与 buildTerrain 共用，保证河流避让点位）：
// 点位列 = LEFT_PAD + col*COL_STEP，建筑占 [tileX, tileX+1]。
// 某列 x 被点位占用 ⇔ (x-LEFT_PAD) % COL_STEP ∈ {0,1}；
// 缝隙中心（最安全）⇔ (x-LEFT_PAD) % COL_STEP === POINT_GAP_OFFSET。
const COL_STEP = 5;
const LEFT_PAD = 4;
const POINT_GAP_OFFSET = 3;

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

function textureForIndustry(id: string, tier: IndustryTier) {
  return INDUSTRY_TEX_RULES.find(([pattern]) => pattern.test(id))?.[1] ?? DEFAULT_TIER_TEX[tier];
}

function textureForCraft(id: string) {
  return CRAFT_TEX_RULES.find(([pattern]) => pattern.test(id))?.[1] ?? TEX.craft;
}

const ACTIVITY_TEX: Record<ActivityPointKind, string> = {
  resource: TEX.indField,
  workshop: TEX.craft,
  training: TEX.craftPaper,
  trade: TEX.indMarket,
  life: TEX.indHarvest,
  festival: TEX.lanternPost,
  route: TEX.gate,
};

function textureForActivity(kind: ActivityPointKind) {
  return ACTIVITY_TEX[kind] ?? TEX.indProduct;
}

const TIER_LABEL: Record<IndustryTier, string> = {
  harvest: '采集',
  refine: '精炼',
  product: '制作',
};

const SEASON_LABEL: Record<WeatherSeason, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

const WEATHER_LABEL: Record<WeatherKind, string> = {
  clear: '晴',
  rain: '雨',
  snow: '雪',
};

interface PointSpec {
  kind: PointKind;
  label: string;
  hint: string;
  payload: string;
  routeId?: string;
  unlocked?: boolean;
  tex: string;
  tileW?: number;
  tileH?: number;
}

function craftWorkshopHint(craft: RegionMapSpec['crafts'][number]) {
  const base = `按 E 进入「${craft.name}」工坊`;
  const workshop = craft.workshop;
  if (!workshop) return base;
  const markers = [`空间 ${workshop.usedSpace}/${workshop.capacity}`, `整备 ${workshop.installedUpgrades}/${workshop.totalUpgrades}`];
  if (workshop.availableUpgrades > 0) markers.push('可安置整备');
  else if (workshop.needsExpansion && workshop.canExpand) markers.push('空间已满，可扩建');
  else if (workshop.needsExpansion) markers.push('空间已满');
  else if (workshop.canExpand && workshop.installedUpgrades > 0) markers.push('可扩建');
  return `${base} · ${markers.join(' · ')}`;
}

export class StreetScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right' | 'interact', Phaser.Input.Keyboard.Key>;

  private groundLayer!: Phaser.GameObjects.Group;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private points: MapPoint[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private marker!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private nearby: Nearby | null = null;
  /** 地形装饰层（河面/桥/栅栏/树石），随地区重建 */
  private decor: Phaser.GameObjects.Image[] = [];
  /** 玩家上方的前景遮挡层：草丛、树冠、芦苇等 */
  private foregroundCovers: ForegroundCover[] = [];
  /** NPC 实体列表 */
  private npcs: NpcEntity[] = [];
  /** 非交互街景行人，只负责让街道更有生活气息 */
  private walkers: AmbientWalker[] = [];
  /** 多街巷路网，决定地面贴图、桥面与 NPC 行走路线 */
  private roadTiles = new Set<string>();
  private primaryRoadRows: number[] = [];
  private primaryRoadCols: number[] = [];
  /** 交互点落位索引，供关联 NPC 寻找驻守位置 */
  private pointLocations = new Map<string, PointLocation>();
  /** 可行走网格 blocked[ty][tx]=true 表示不可通行（水/障碍/建筑占格） */
  private blocked: boolean[][] = [];
  private activeRegionId = '';
  private activeSeason: WeatherSeason = 'spring';
  private activeWeather: WeatherKind = 'clear';
  /** 当前点击寻路路径（瓦片坐标队列，依次走过） */
  private path: { tx: number; ty: number }[] = [];
  /** 寻路目标光环 */
  private moveTarget!: Phaser.GameObjects.Image;
  /** 当前行脚目标入口提示光标，仅用于视觉引导 */
  private goalMarker?: Phaser.GameObjects.Image;
  /** 当前地区的实际地图宽度（格），随交互点数量动态扩展 */
  private mapWTiles = MAP_W;
  /** 当前相机缩放倍率 */
  private zoom = 2;
  /** 上一次上报的玩家瓦片坐标（防抖，变化才 emit） */
  private lastTx = -1;
  private lastTy = -1;
  private plusKey?: Phaser.Input.Keyboard.Key;
  private minusKey?: Phaser.Input.Keyboard.Key;
  private plusKeyNum?: Phaser.Input.Keyboard.Key;
  private minusKeyNum?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('StreetScene');
  }

  preload() {
    preloadArtTextures(this);
  }

  create() {
    generatePlaceholderTextures(this);
    this.createCharacterAnimations();

    this.groundLayer = this.add.group();
    this.solids = this.physics.add.staticGroup();

    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.buildPlayer();
    this.buildCamera();

    this.marker = this.add.image(0, 0, TEX.marker).setVisible(false).setDepth(100000);
    this.moveTarget = this.add.image(0, 0, TEX.moveTarget).setVisible(false).setDepth(99999);
    this.titleText = this.add
      .text(8, 8, '', { fontSize: '14px', color: '#fff', backgroundColor: '#00000066' })
      .setScrollFactor(0)
      .setDepth(100001)
      .setPadding(4, 2, 4, 2);

    // 点击寻路：点击地图上的可到达地块，角色自动走过去
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      this.requestPathTo(pointer.worldX, pointer.worldY);
    });

    const off = onCommand((cmd) => {
      if (cmd.type === 'enter-region') this.buildRegion(cmd.spec);
      else if (cmd.type === 'set-navigation-target') this.setNavigationTarget(cmd.target);
      else if (cmd.type === 'zoom') {
        if (typeof cmd.absolute === 'number') this.applyZoom(cmd.absolute, true);
        else this.applyZoom(this.zoom + (cmd.delta ?? 0));
      } else if (cmd.type === 'interact-nearby') {
        this.updateNearby();
        this.interactNearby();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);

    emitBus({ type: 'scene-ready' });
  }

  private textureHasFrames(key: string, minFrames: number) {
    const tex = this.textures.get(key);
    return !!tex && tex.frameTotal >= minFrames;
  }

  private createCharacterAnimations() {
    const rows = ['down', 'left', 'right', 'up'] as const;
    const sheetDefs = [
      { key: TEX.player, prefix: 'player' },
      { key: TEX.npcTourist, prefix: 'npc-tourist' },
      { key: TEX.npcVendor, prefix: 'npc-vendor' },
    ];
    for (const def of sheetDefs) {
      if (!this.textureHasFrames(def.key, 16)) continue;
      rows.forEach((row, rowIndex) => {
        const animKey = `${def.prefix}-${row}`;
        if (this.anims.exists(animKey)) return;
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(def.key, {
            start: rowIndex * 4,
            end: rowIndex * 4 + 3,
          }),
          frameRate: 7,
          repeat: -1,
        });
      });
    }
  }

  /** 设置相机缩放倍率（限幅并反馈给 UI）。absolute=true 时直接赋值。 */
  private applyZoom(next: number, _absolute = false) {
    const z = Phaser.Math.Clamp(Math.round(next / ZOOM_STEP) * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX);
    if (z === this.zoom) return;
    this.zoom = z;
    this.cameras.main.setZoom(z);
    emitBus({ type: 'zoom-changed', zoom: z });
  }

  /** 根据地区规格重建整张地图 */
  private buildRegion(spec: RegionMapSpec) {
    // HMR 热替换时，旧场景实例的 onCommand 订阅可能仍被触发，但其 group 已被销毁
    // （children 置空）——此时直接跳过，避免 clear() 读取 undefined.size 抛错。
    const g = this.groundLayer as unknown as { children?: unknown } | undefined;
    if (!g || !g.children || !this.solids || !this.player) return;

    this.activeRegionId = spec.regionId;
    this.activeSeason = spec.season;
    this.activeWeather = spec.weather;

    this.groundLayer.clear(true, true);
    this.solids.clear(true, true);
    this.points.forEach((p) => p.sprite.destroy());
    this.points = [];
    this.labels.forEach((t) => t.destroy());
    this.labels = [];
    this.decor.forEach((d) => d.destroy());
    this.decor = [];
    this.foregroundCovers = [];
    this.npcs.forEach((n) => {
      n.sprite.destroy();
      n.label.destroy();
    });
    this.npcs = [];
    this.walkers.forEach((w) => w.sprite.destroy());
    this.walkers = [];
    this.path = [];
    this.moveTarget.setVisible(false);
    this.clearNavigationTarget();
    this.nearby = null;

    const titleName = spec.subregionName ? `${spec.name} · ${spec.subregionName}` : spec.name;
    this.titleText.setText(
      `${titleName} · ${SEASON_LABEL[spec.season]}${WEATHER_LABEL[spec.weather]} · WASD/点击 移动 · E 交互`,
    );

    const all: PointSpec[] = [
      ...spec.industries.map((i) => ({
        kind: 'industry' as const,
        label: `${i.name}·${TIER_LABEL[i.tier]}`,
        hint: `按 E ${TIER_LABEL[i.tier]}「${i.name}」`,
        payload: i.id,
        tex: textureForIndustry(i.id, i.tier),
      })),
      ...spec.crafts.map((c) => ({
        kind: 'craft' as const,
        label: c.name,
        hint: craftWorkshopHint(c),
        payload: c.id,
        tex: textureForCraft(c.id),
      })),
      ...spec.activities.map((a) => ({
        kind: 'activity' as const,
        label: a.name,
        hint: `按 E 体验「${a.name}」`,
        payload: a.id,
        tex: textureForActivity(a.kind),
      })),
      ...spec.subregionGates.map((g) => ({
        kind: 'subregionGate' as const,
        label: `往 ${g.name}`,
        hint: `按 E 经区内通道前往「${g.name}」`,
        payload: g.subregionId,
        tex: TEX.gate,
      })),
      ...spec.gates.map((g) => ({
        kind: 'gate' as const,
        label: g.unlocked ? `往 ${g.name}` : `${g.routeName ?? g.name}·未通`,
        hint: g.unlocked
          ? `按 E 经「${g.routeName ?? '驿路'}」前往「${g.name}」`
          : `按 E 开通「${g.routeName ?? g.name}」解锁「${g.name}」(${g.unlockCost ?? 30} 文)`,
        payload: g.regionId,
        routeId: g.routeId,
        unlocked: g.unlocked,
        tex: TEX.gate,
      })),
    ];

    // 槽位布局：上下两行，列数随点数动态扩展，地图宽度据此放大（相机跟随可横向滚动），
    // 避免点位 slot 复用导致互相重叠、被覆盖的交互点无法靠近触发。列间距/左边距为模块级常量。
    this.pointLocations.clear();
    this.roadTiles.clear();
    this.mapWTiles = Math.max(MAP_W, spec.layout?.size.w ?? 0, 52 + Math.ceil(all.length / 6) * 7);

    this.physics.world.setBounds(0, 0, this.mapWTiles * TILE, MAP_H * TILE);
    this.cameras.main.setBounds(0, 0, this.mapWTiles * TILE, MAP_H * TILE);

    // 初始化可行走网格（全部可走，随后由地形/建筑标记阻挡）
    this.blocked = Array.from({ length: MAP_H }, () => new Array<boolean>(this.mapWTiles).fill(false));
    this.buildStreetNetwork(spec.layout);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < this.mapWTiles; x++) {
        const tex = this.isRoadTile(x, y) ? this.roadTextureAt(x, y) : this.groundTextureAt(x, y);
        const img = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, tex);
        img.setDepth(0);
        this.groundLayer.add(img);
      }
    }

    // 地形地貌：按地区类型铺设河流/海岸/山石/街巷（替代单一横向街道）
    this.buildTerrain(spec.terrain);
    this.decorateStreetProps(spec.terrain);
    this.applyLayoutDecor(spec.layout);

    const slots = this.buildPointSlots(all.length, spec.layout);
    let idx = 0;
    for (const item of all) {
      const layoutSlot = this.layoutSlotForPoint(spec.layout, item);
      const slot: { tileX: number; tileY: number; tileW?: number; tileH?: number } =
        layoutSlot ?? slots[idx] ?? this.fallbackPointSlot(idx);
      const tileX = slot.tileX;
      const tileY = slot.tileY;
      const footprint = this.footprintFor(item.tex, slot.tileW ?? item.tileW, slot.tileH ?? item.tileH);
      const px = tileX * TILE + (footprint.w * TILE) / 2;
      const py = (tileY + footprint.h) * TILE;
      const buildingTex = this.buildingTextureFor(item.tex);

      const img = this.add.image(px, py, buildingTex).setOrigin(0.5, 1).setDepth(py);
      this.addBuildingWeatherOverlay(item.tex, px, py, buildingTex !== item.tex);
      const body = this.solids.create(px, py - TILE * 0.5) as Phaser.Physics.Arcade.Sprite;
      body.setVisible(false);
      body.setSize(footprint.w * TILE, TILE).refreshBody();
      // 建筑占格标记为不可寻路（玩家仍可走到相邻格交互）
      for (let y = tileY; y < tileY + footprint.h; y++) {
        for (let x = tileX; x < tileX + footprint.w; x++) this.markBlocked(x, y);
      }

      const label = this.add
        .text(px, py - footprint.h * TILE - 8, item.label, {
          fontSize: '11px',
          color: '#fff',
          backgroundColor: '#00000088',
        })
        .setOrigin(0.5)
        .setDepth(py + 1)
        .setPadding(3, 1, 3, 1);
      this.labels.push(label);

      const location = { tileX, tileY, tileW: footprint.w, tileH: footprint.h, px, py };

      this.points.push({
        kind: item.kind,
        label: item.label,
        hint: item.hint,
        payload: item.payload,
        routeId: item.routeId,
        unlocked: item.unlocked,
        sprite: img,
        location,
      });
      this.pointLocations.set(item.payload, location);
      idx++;
    }

    this.setNavigationTarget(spec.navigationTarget, false);
    this.spawnNpcs(spec);
    this.spawnAmbientWalkers();
    this.addWeatherVfx();

    const requestedStart = spec.layout?.playerStart ?? { x: Math.floor(this.mapWTiles / 2), y: ROAD_ROWS[1] };
    const start = this.nearestRoadTileAround(requestedStart.x, requestedStart.y);
    this.player.setPosition(
      (start?.tx ?? Math.floor(this.mapWTiles / 2)) * TILE + TILE / 2,
      (start?.ty ?? ROAD_ROWS[1]) * TILE + TILE / 2,
    );
    this.player.setVelocity(0, 0);
    this.lastTx = -1;
    this.lastTy = -1;

    // 下发小地图标记点（瓦片坐标）
    this.emitRegionPoints();
  }

  private emitRegionPoints() {
    emitBus({
      type: 'region-points',
      points: this.points.map((p) => ({
        tx: Math.round((p.sprite.x - TILE) / TILE),
        ty: Math.round((p.sprite.y - TILE) / TILE),
        kind: p.kind,
        label: p.label,
        goal: Boolean(p.goal),
      })),
    });
  }

  private clearNavigationTarget() {
    if (this.goalMarker) {
      this.tweens.killTweensOf(this.goalMarker);
      this.goalMarker.destroy();
      this.goalMarker = undefined;
    }
    for (const point of this.points) {
      if (!point.goal) continue;
      point.goal = false;
      point.sprite.clearTint();
    }
  }

  private setNavigationTarget(target: RegionNavigationTarget | undefined, emitPoints = true) {
    this.clearNavigationTarget();
    if (target) {
      const point = this.points.find((item) => item.kind === target.kind && item.payload === target.payload);
      if (point) {
        point.goal = true;
        point.sprite.setTint(0xffd56a);
        const markerY = point.location.py - point.location.tileH * TILE - 18;
        this.goalMarker = this.add
          .image(point.location.px, markerY, TEX.marker)
          .setDepth(100002)
          .setTint(0xffc94f)
          .setScale(1.08);
        this.tweens.add({
          targets: this.goalMarker,
          y: markerY - 8,
          duration: 760,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
    if (emitPoints) this.emitRegionPoints();
  }

  /** 标记某瓦片为不可通行（越界忽略） */
  private markBlocked(tx: number, ty: number) {
    if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < this.mapWTiles && this.blocked[ty]) {
      this.blocked[ty][tx] = true;
    }
  }

  /** 放置一块地貌装饰瓦片；solid=true 时同时加入物理阻挡并标记不可寻路 */
  private pointInteractionRect(location: PointLocation): InteractionRect {
    return {
      left: location.tileX * TILE,
      right: (location.tileX + location.tileW) * TILE,
      top: location.tileY * TILE,
      bottom: (location.tileY + location.tileH) * TILE,
    };
  }

  private tileKey(tx: number, ty: number) {
    return `${tx},${ty}`;
  }

  private setRoadTile(tx: number, ty: number) {
    if (tx < 0 || tx >= this.mapWTiles || ty < 0 || ty >= MAP_H) return;
    this.roadTiles.add(this.tileKey(tx, ty));
  }

  private isRoadTile(tx: number, ty: number) {
    return this.roadTiles.has(this.tileKey(tx, ty));
  }

  private addRoadPath(points: { tx: number; ty: number }[]) {
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      if (from.ty === to.ty) {
        const min = Math.min(from.tx, to.tx);
        const max = Math.max(from.tx, to.tx);
        for (let x = min; x <= max; x++) this.setRoadTile(x, from.ty);
      } else if (from.tx === to.tx) {
        const min = Math.min(from.ty, to.ty);
        const max = Math.max(from.ty, to.ty);
        for (let y = min; y <= max; y++) this.setRoadTile(from.tx, y);
      } else {
        this.addRoadPath([from, { tx: to.tx, ty: from.ty }, to]);
      }
    }
  }

  private buildStreetNetwork(layout?: RegionMapSpec['layout']) {
    if (layout?.roads?.length) {
      this.primaryRoadRows = [
        ...new Set(layout.roads.flatMap((path) => path.points.map((point) => point.y))),
      ].filter((row) => row >= 0 && row < MAP_H).sort((a, b) => a - b);
      this.primaryRoadCols = [
        ...new Set(layout.roads.flatMap((path) => path.points.map((point) => point.x))),
      ].filter((col) => col >= 0 && col < this.mapWTiles).sort((a, b) => a - b);
      for (const path of layout.roads) {
        this.addRoadPath(path.points.map((point) => ({ tx: point.x, ty: point.y })));
      }
      if (!this.primaryRoadRows.length) this.primaryRoadRows = [...ROAD_ROWS];
      if (!this.primaryRoadCols.length) this.primaryRoadCols = [7, Math.round(this.mapWTiles * 0.5), this.mapWTiles - 8];
      return;
    }

    const w = this.mapWTiles;
    const cols = [7, Math.round(w * 0.34), Math.round(w * 0.62), w - 8].map((x) =>
      Phaser.Math.Clamp(x, 4, w - 5),
    );
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
        { tx: w - 3, ty: bendB },
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

  private usesWeatherArt() {
    return this.activeRegionId === 'jiangnan';
  }

  private textureExists(key: string) {
    return this.textures.exists(key);
  }

  private buildingWeatherVariant(): BuildingWeatherVariant | null {
    if (!this.usesWeatherArt()) return null;
    if (this.activeWeather === 'rain') return 'rain';
    if (this.activeWeather === 'snow' || this.activeSeason === 'winter') return 'winter';
    if (this.activeSeason === 'summer') return 'summer';
    if (this.activeSeason === 'autumn') return 'autumn';
    return null;
  }

  private buildingTextureFor(baseTex: string) {
    const variant = this.buildingWeatherVariant();
    if (!variant) return baseTex;
    const weatherTex = BUILDING_WEATHER_TEXTURES[baseTex]?.[variant];
    return weatherTex && this.textureExists(weatherTex) ? weatherTex : baseTex;
  }

  private roadTextureAt(tx: number, ty: number) {
    if (this.usesWeatherArt()) {
      if (this.activeSeason === 'winter' && this.textureExists(TEX.winterSnowRoad)) return TEX.winterSnowRoad;
      if (this.activeWeather === 'rain') {
        return (tx * 7 + ty * 11) % 9 === 0 && this.textureExists(TEX.rainPuddleRoad)
          ? TEX.rainPuddleRoad
          : TEX.rainWetRoad;
      }
      if (this.activeSeason === 'autumn' && this.textureExists(TEX.autumnLeafRoad)) return TEX.autumnLeafRoad;
    }
    const horizontal = this.isRoadTile(tx - 1, ty) || this.isRoadTile(tx + 1, ty);
    const vertical = this.isRoadTile(tx, ty - 1) || this.isRoadTile(tx, ty + 1);
    if (horizontal && vertical) return TEX.roadCross;
    if (vertical) return TEX.roadVertical;
    return TEX.road;
  }

  private bridgeAngleForRoadTile(tx: number, ty: number) {
    const horizontal = this.isRoadTile(tx - 1, ty) || this.isRoadTile(tx + 1, ty);
    const vertical = this.isRoadTile(tx, ty - 1) || this.isRoadTile(tx, ty + 1);
    return horizontal || !vertical ? 90 : 0;
  }

  private groundTextureAt(tx: number, ty: number) {
    const nearCross =
      this.primaryRoadRows.some((row) => Math.abs(row - ty) <= 2) &&
      this.primaryRoadCols.some((col) => Math.abs(col - tx) <= 2);
    if (this.usesWeatherArt()) {
      if (this.activeSeason === 'winter' && this.textureExists(TEX.winterSnowGround)) return TEX.winterSnowGround;
      if (this.activeSeason === 'summer') {
        if (nearCross && this.textureExists(TEX.summerDenseMossGround)) return TEX.summerDenseMossGround;
        if ((tx * 5 + ty * 3) % 13 === 0 && this.textureExists(TEX.summerFlowerGround)) return TEX.summerFlowerGround;
        return this.textureExists(TEX.summerLushGround) ? TEX.summerLushGround : TEX.ground;
      }
      if (this.activeSeason === 'autumn' && this.textureExists(TEX.autumnLeafGround)) return TEX.autumnLeafGround;
      if (this.activeWeather === 'rain') {
        return nearCross && this.textureExists(TEX.rainWetStoneGround) ? TEX.rainWetStoneGround : TEX.rainMuddyGround;
      }
    }
    if (nearCross) return TEX.groundStone;
    if ((tx * 5 + ty * 3) % 19 === 0) return TEX.groundMoss;
    if ((tx + ty * 2) % 23 === 0) return TEX.groundSoil;
    return TEX.ground;
  }

  private footprintFor(tex: string, tileW?: number, tileH?: number) {
    if (tileW && tileH) return { w: tileW, h: tileH };
    if (tex === TEX.gate) return { w: 3, h: 3 };
    return { w: BUILDING_TILE_W, h: BUILDING_TILE_H };
  }

  private addBuildingWeatherOverlay(baseTex: string, px: number, py: number, hasFullVariant = false) {
    if (hasFullVariant) return;
    if (!this.usesWeatherArt() || this.activeSeason !== 'winter') return;
    const snowTex = BUILDING_SNOW_TEXTURES[baseTex];
    if (!snowTex || !this.textureExists(snowTex)) return;
    const overlay = this.add.image(px, py, snowTex).setOrigin(0.5, 1).setDepth(py + 0.5);
    this.decor.push(overlay);
  }

  private canPlaceBuilding(tileX: number, tileY: number, tileW = BUILDING_TILE_W, tileH = BUILDING_TILE_H) {
    const w = tileW;
    const h = tileH;
    if (tileX < 1 || tileY < 1 || tileX + w - 1 >= this.mapWTiles || tileY + h - 1 >= MAP_H) return false;
    for (let y = tileY; y < tileY + h; y++) {
      for (let x = tileX; x < tileX + w; x++) {
        if (this.isRoadTile(x, y) || this.blocked[y]?.[x]) return false;
      }
    }
    return true;
  }

  private fallbackPointSlot(index: number) {
    const row = this.primaryRoadRows[index % this.primaryRoadRows.length] ?? ROAD_ROWS[1];
    const x = 3 + ((index * 7) % Math.max(9, this.mapWTiles - 10));
    const y = Phaser.Math.Clamp(row + (index % 2 === 0 ? -BUILDING_TILE_H : 1), 1, MAP_H - BUILDING_TILE_H - 1);
    return { tileX: x, tileY: y };
  }

  private layoutSlotForPoint(layout: RegionMapSpec['layout'] | undefined, item: PointSpec) {
    const object = layout?.objects.find(
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

  private layoutOccupiedSlots(layout: RegionMapSpec['layout'] | undefined) {
    const occupied = new Set<string>();
    for (const object of layout?.objects ?? []) {
      if (object.interaction === 'decoration' || object.interaction === 'npc') continue;
      const tileW = object.tileW ?? BUILDING_TILE_W;
      const tileH = object.tileH ?? BUILDING_TILE_H;
      for (let y = object.y; y < object.y + tileH; y++) {
        for (let x = object.x; x < object.x + tileW; x++) occupied.add(this.tileKey(x, y));
      }
    }
    return occupied;
  }

  private slotOverlapsOccupied(
    tileX: number,
    tileY: number,
    tileW: number,
    tileH: number,
    occupied: Set<string>,
  ) {
    for (let y = tileY; y < tileY + tileH; y++) {
      for (let x = tileX; x < tileX + tileW; x++) {
        if (occupied.has(this.tileKey(x, y))) return true;
      }
    }
    return false;
  }

  private buildPointSlots(count: number, layout?: RegionMapSpec['layout']) {
    const slots: { tileX: number; tileY: number }[] = [];
    const occupied = this.layoutOccupiedSlots(layout);
    for (const row of this.primaryRoadRows) {
      for (let x = 3; x < this.mapWTiles - BUILDING_TILE_W - 3; x += 7) {
        const sides = (x + row) % 2 === 0 ? [-BUILDING_TILE_H, 1] : [1, -BUILDING_TILE_H];
        for (const side of sides) {
          const tileX = x;
          const tileY = Phaser.Math.Clamp(row + side, 1, MAP_H - BUILDING_TILE_H - 1);
          if (
            this.slotOverlapsOccupied(tileX, tileY, BUILDING_TILE_W, BUILDING_TILE_H, occupied) ||
            !this.canPlaceBuilding(tileX, tileY)
          ) continue;
          for (let y = tileY; y < tileY + BUILDING_TILE_H; y++) {
            for (let x = tileX; x < tileX + BUILDING_TILE_W; x++) occupied.add(this.tileKey(x, y));
          }
          slots.push({ tileX, tileY });
          if (slots.length >= count) return slots;
        }
      }
    }
    let i = 0;
    while (slots.length < count && i < count * 4) {
      const slot = this.fallbackPointSlot(i++);
      if (
        this.slotOverlapsOccupied(slot.tileX, slot.tileY, BUILDING_TILE_W, BUILDING_TILE_H, occupied) ||
        !this.canPlaceBuilding(slot.tileX, slot.tileY)
      ) continue;
      for (let y = slot.tileY; y < slot.tileY + BUILDING_TILE_H; y++) {
        for (let x = slot.tileX; x < slot.tileX + BUILDING_TILE_W; x++) occupied.add(this.tileKey(x, y));
      }
      slots.push(slot);
    }
    return slots;
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
      const d = Math.abs(tile.tx - tx) + Math.abs(tile.ty - ty);
      if (d < bestDist) {
        best = tile;
        bestDist = d;
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
        return Phaser.Math.Distance.Between(wx, wy, anchor.px, anchor.py) >= minPointDistance;
      });
      if (stand) return stand;
    }
    return this.nearestRoadTileAround(anchor.tileX + Math.floor(anchor.tileW / 2), anchor.tileY + anchor.tileH);
  }

  private addDecorTile(tx: number, ty: number, tex: string, solid: boolean, angleDeg = 0) {
    if (tx < 0 || tx >= this.mapWTiles || ty < 0 || ty >= MAP_H) return;
    const cx = tx * TILE + TILE / 2;
    const cy = ty * TILE + TILE / 2;
    const img = this.add.image(cx, cy, tex).setDepth(solid ? cy : 1);
    if (angleDeg) img.setAngle(angleDeg);
    this.decor.push(img);
    if (solid) {
      const body = this.solids.create(cx, cy) as Phaser.Physics.Arcade.Sprite;
      body.setVisible(false);
      body.setSize(TILE, TILE).refreshBody();
      this.markBlocked(tx, ty);
    }
  }

  private applyLayoutDecor(layout: RegionMapSpec['layout'] | undefined) {
    for (const object of layout?.objects ?? []) {
      if (object.interaction !== 'decoration') continue;
      const tileW = object.tileW ?? 1;
      const tileH = object.tileH ?? 1;
      for (let y = object.y; y < object.y + tileH; y++) {
        for (let x = object.x; x < object.x + tileW; x++) {
          this.addDecorTile(x, y, TEX.rock, object.solid ?? true);
        }
      }
    }
  }

  /** 依地区地貌类型铺设地形：河流+石桥 / 海岸 / 山石林木 / 街巷栅栏 */
  private canPlaceProp(anchorTx: number, anchorTy: number, tileW = 1, tileH = 1) {
    const startX = anchorTx - Math.floor(tileW / 2);
    const startY = anchorTy - tileH + 1;
    if (startX < 1 || startY < 1 || startX + tileW - 1 >= this.mapWTiles || startY + tileH - 1 >= MAP_H) {
      return false;
    }
    for (let y = startY; y < startY + tileH; y++) {
      for (let x = startX; x < startX + tileW; x++) {
        if (this.isRoadTile(x, y) || this.blocked[y]?.[x]) return false;
      }
    }
    return true;
  }

  private addProp(anchorTx: number, anchorTy: number, tex: string, solid = false, tileW = 1, tileH = 1) {
    if (anchorTx < 0 || anchorTx >= this.mapWTiles || anchorTy < 0 || anchorTy >= MAP_H) return null;
    const px = anchorTx * TILE + TILE / 2;
    const py = (anchorTy + 1) * TILE;
    const img = this.add.image(px, py, tex).setOrigin(0.5, 1).setDepth(py);
    this.decor.push(img);
    this.addSeasonalPropOverlay(img, tex);
    if (solid) {
      const startX = anchorTx - Math.floor(tileW / 2);
      const startY = anchorTy - tileH + 1;
      const body = this.solids.create(px, py - (tileH * TILE) / 2) as Phaser.Physics.Arcade.Sprite;
      body.setVisible(false);
      body.setSize(tileW * TILE, tileH * TILE).refreshBody();
      for (let y = startY; y < startY + tileH; y++) {
        for (let x = startX; x < startX + tileW; x++) this.markBlocked(x, y);
      }
    }
    return img;
  }

  private addForegroundCover(anchorTx: number, anchorTy: number, tex: string, tileW = 2, tileH = 2, scale = 1) {
    if (anchorTx < 0 || anchorTx >= this.mapWTiles || anchorTy < 0 || anchorTy >= MAP_H) return null;
    const px = anchorTx * TILE + TILE / 2;
    const py = (anchorTy + 1) * TILE;
    const image = this.add
      .image(px, py, tex)
      .setOrigin(0.5, 1)
      .setDepth(FOREGROUND_COVER_DEPTH)
      .setScale(scale);
    const bounds = new Phaser.Geom.Rectangle(
      px - (tileW * TILE) / 2,
      py - tileH * TILE,
      tileW * TILE,
      tileH * TILE,
    );
    this.decor.push(image);
    this.foregroundCovers.push({ image, bounds });
    return image;
  }

  private updateForegroundCovers() {
    if (!this.player) return;
    const playerBounds = new Phaser.Geom.Rectangle(
      this.player.x - TILE * 0.32,
      this.player.y - TILE * 0.82,
      TILE * 0.64,
      TILE * 0.9,
    );
    for (const cover of this.foregroundCovers) {
      const covered = Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, cover.bounds);
      cover.image.setAlpha(covered ? 0.42 : 1);
    }
  }

  private seasonalPropOverlayFor(tex: string) {
    if (!this.usesWeatherArt()) return null;
    if (this.activeSeason === 'summer') {
      if (tex === TEX.willow) return TEX.summerLushWillowCrown;
    }
    if (this.activeSeason === 'autumn') {
      if (tex === TEX.willow) return TEX.autumnGoldTreeCrown;
      if (tex === TEX.noticeBoard) return TEX.autumnLeafPile;
    }
    if (this.activeSeason === 'winter') {
      if (tex === TEX.willow) return TEX.winterSnowWillowCap;
      if (tex === TEX.lanternPost) return TEX.winterSnowLanternCap;
      if (tex === TEX.archBridge) return TEX.winterSnowBridgeCap;
      if (tex === TEX.dock) return TEX.winterSnowDockCap;
    }
    return null;
  }

  private addSeasonalPropOverlay(base: Phaser.GameObjects.Image, baseTex: string) {
    const overlayTex = this.seasonalPropOverlayFor(baseTex);
    if (!overlayTex || !this.textureExists(overlayTex)) return;
    const overlay = this.add
      .image(base.x, base.y, overlayTex)
      .setOrigin(0.5, 1)
      .setDepth(base.depth + 0.4)
      .setAlpha(0.96);
    this.decor.push(overlay);
  }

  private weatherVfxTexture() {
    if (!this.usesWeatherArt()) return null;
    if (this.activeWeather === 'snow') return TEX.smallSnowflakes;
    if (this.activeWeather === 'rain') return TEX.lightRainStreaks;
    if (this.activeSeason === 'autumn') return TEX.autumnFallingLeaves;
    return null;
  }

  private addWeatherVfx() {
    const tex = this.weatherVfxTexture();
    if (!tex || !this.textureExists(tex)) return;
    const worldW = this.mapWTiles * TILE;
    const worldH = MAP_H * TILE;
    const spots = [
      [0.12, 0.16],
      [0.34, 0.32],
      [0.55, 0.18],
      [0.76, 0.38],
      [0.22, 0.68],
      [0.62, 0.72],
      [0.88, 0.62],
    ] as const;
    spots.forEach(([x, y], index) => {
      const img = this.add
        .image(worldW * x, worldH * y, tex)
        .setDepth(90000 + index)
        .setAlpha(this.activeWeather === 'rain' ? 0.34 : 0.42)
        .setScale(this.activeWeather === 'rain' ? 1.35 : 1.1);
      this.decor.push(img);
    });
  }

  private tryAddProp(anchorTx: number, anchorTy: number, tex: string, tileW = 1, tileH = 1, solid = true) {
    if (!this.canPlaceProp(anchorTx, anchorTy, tileW, tileH)) return null;
    return this.addProp(anchorTx, anchorTy, tex, solid, tileW, tileH);
  }

  private decorateStreetProps(kind: TerrainKind) {
    const rows = this.primaryRoadRows.length ? this.primaryRoadRows : [...ROAD_ROWS];
    rows.forEach((row, index) => {
      this.tryAddProp(3 + index * 2, row - 1, TEX.lanternPost, 1, 2);
      this.tryAddProp(this.mapWTiles - 5 - index * 2, row + 2, TEX.banner, 1, 2);
      this.tryAddProp(8 + index * 9, row + 2, TEX.noticeBoard, 2, 2);
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
      this.addForegroundCover(Math.floor(this.mapWTiles * 0.14), ROAD_ROW_TOP - 1, TEX.summerLushTreeCrown, 3, 3, 1.08);
      this.addForegroundCover(Math.floor(this.mapWTiles * 0.86), ROAD_ROW_BOTTOM + 2, TEX.summerLushTreeCrown, 3, 3, 1.08);
    }
  }

  private buildTerrain(kind: TerrainKind) {
    const midRow = (ROAD_ROW_TOP + ROAD_ROW_BOTTOM) >> 1;
    if (kind === 'water') {
      // 一条纵向河道，街道行处架石桥可通行。
      // 河列必须落在点位缝隙中心（避开交互点建筑列，不再压住手艺/产业点）。
      const target = Math.floor(this.mapWTiles * 0.5);
      const k = Math.round((target - LEFT_PAD - POINT_GAP_OFFSET) / COL_STEP);
      let riverCol = LEFT_PAD + POINT_GAP_OFFSET + Math.max(0, k) * COL_STEP;
      // 限幅到地图内；若限幅破坏了缝隙对齐，向内退一个步长回到缝隙列。
      riverCol = Math.min(this.mapWTiles - 4, Math.max(3, riverCol));
      if ((riverCol - LEFT_PAD + COL_STEP * 1000) % COL_STEP !== POINT_GAP_OFFSET) {
        riverCol = LEFT_PAD + POINT_GAP_OFFSET + Math.max(0, k - 1) * COL_STEP;
      }
      const riverAt = (y: number) => {
        const drift = Math.round(Math.sin(y * 0.52) * 1.35) + (y > ROAD_ROW_BOTTOM ? -1 : 0);
        return Phaser.Math.Clamp(riverCol + drift, 3, this.mapWTiles - 4);
      };
      const summerWater = this.usesWeatherArt() && this.activeSeason === 'summer';
      for (let y = 0; y < MAP_H; y++) {
        const col = riverAt(y);
        const tiles = [
          [col - 1, summerWater ? TEX.pondWaterGrassEdgeRight : TEX.waterEdgeRight],
          [col, summerWater && (y * 5 + col) % 7 === 0 ? TEX.pondLotusDuckweed : summerWater ? TEX.pondWaterGrassCenter : TEX.water],
          [col + 1, summerWater ? TEX.pondWaterGrassEdgeLeft : TEX.waterEdgeLeft],
        ] as const;
        const onRoad = tiles.some(([x]) => this.isRoadTile(x, y));
        for (const [x, tex] of tiles) {
          this.addDecorTile(x, y, onRoad ? TEX.bridge : tex, !onRoad, onRoad ? this.bridgeAngleForRoadTile(x, y) : 0);
        }
      }
      for (const row of this.primaryRoadRows) {
        this.addProp(riverAt(row), row + 1, TEX.archBridge, false, 4, 2);
      }
      this.tryAddProp(riverAt(ROAD_ROW_TOP + 2) - 5, ROAD_ROW_TOP + 2, TEX.willow, 2, 3);
      this.tryAddProp(riverAt(ROAD_ROW_TOP + 3) + 5, ROAD_ROW_TOP + 3, TEX.teaStall, 3, 2);
      this.tryAddProp(riverAt(ROAD_ROW_BOTTOM + 3) - 4, ROAD_ROW_BOTTOM + 3, TEX.dock, 3, 1);
      this.addProp(riverAt(ROAD_ROW_BOTTOM + 3) + 5, ROAD_ROW_BOTTOM + 3, TEX.boat, false, 4, 1);
      if (summerWater) {
        this.addForegroundCover(riverAt(ROAD_ROW_TOP + 5) - 2, ROAD_ROW_TOP + 5, TEX.summerDenseReedClump, 3, 2);
        this.addProp(riverAt(ROAD_ROW_BOTTOM - 2) + 2, ROAD_ROW_BOTTOM - 2, TEX.summerLotusPatch, false, 3, 2);
      }
    } else if (kind === 'coast') {
      // 底部两行为海面（不可通行），岸边点缀礁石
      for (let y = MAP_H - 2; y < MAP_H; y++) {
        for (let x = 0; x < this.mapWTiles; x++) this.addDecorTile(x, y, TEX.water, true);
      }
      for (let x = 2; x < this.mapWTiles; x += 6) this.addDecorTile(x, MAP_H - 3, TEX.rock, true);
      this.tryAddProp(7, MAP_H - 3, TEX.dock, 3, 1);
      this.addProp(12, MAP_H - 2, TEX.boat, false, 4, 1);
      this.tryAddProp(this.mapWTiles - 8, MAP_H - 3, TEX.dock, 3, 1);
    } else if (kind === 'mountain') {
      // 山地：街道两侧错落林木与山石（避开街道行）
      for (let x = 2; x < this.mapWTiles - 1; x += 4) {
        const treeY = x % 8 === 2 ? ROAD_ROW_TOP - 3 : ROAD_ROW_BOTTOM + 2;
        if (treeY >= 0 && treeY < MAP_H && (treeY < ROAD_ROW_TOP || treeY > ROAD_ROW_BOTTOM)) {
          this.addDecorTile(x, treeY, x % 3 === 0 ? TEX.rock : TEX.tree, true);
        }
      }
    } else {
      // 平原街巷：街道上下沿铺栅栏作地块边界（留出缺口便于通行）
      for (let x = 1; x < this.mapWTiles - 1; x++) {
        if (x % 4 === 0) continue; // 缺口
        this.addDecorTile(x, ROAD_ROW_TOP - 1, TEX.fence, true);
        this.addDecorTile(x, ROAD_ROW_BOTTOM + 1, TEX.fence, true);
      }
    }
    // 留作未来扩展：midRow 仅用于潜在的中线地标
    void midRow;
  }

  /** 生成本地 NPC：vendor 驻守锚点、tourist 街道散布 */
  private spawnNpcs(spec: RegionMapSpec) {
    const roads = this.roadTileList();
    let touristSlot = 0;
    for (const n of spec.npcs) {
      let wx: number;
      let wy: number;
      if (typeof n.tileX === 'number' && typeof n.tileY === 'number') {
        wx = n.tileX * TILE + TILE / 2;
        wy = n.tileY * TILE + TILE / 2;
      } else if (n.role === 'vendor' && n.anchorId) {
        const anchor = this.pointLocations.get(n.anchorId);
        const stand = anchor ? this.vendorStandTileForAnchor(anchor) : null;
        if (stand) {
          wx = stand.tx * TILE + TILE / 2;
          wy = stand.ty * TILE + TILE / 2;
        } else {
          continue; // 锚点不在本地图，跳过
        }
      } else {
        // 游客：沿街道散布
        const tile = roads[(touristSlot * 11) % Math.max(1, roads.length)] ?? {
          tx: Math.floor(this.mapWTiles / 2),
          ty: ROAD_ROWS[1],
        };
        touristSlot++;
        wx = tile.tx * TILE + TILE / 2;
        wy = tile.ty * TILE + TILE / 2;
      }
      const tex = n.role === 'vendor' ? TEX.npcVendor : TEX.npcTourist;
      const sprite = this.add.sprite(wx, wy, tex, 0).setDepth(wy).setScale(CHARACTER_SCALE);
      const label = this.add
        .text(wx, wy - TILE, n.name, {
          fontSize: '10px',
          color: '#ffe9c0',
          backgroundColor: '#00000088',
        })
        .setOrigin(0.5)
        .setDepth(wy + 1)
        .setPadding(2, 1, 2, 1);
      this.npcs.push({
        id: n.id,
        name: n.name,
        role: n.role,
        sprite,
        label,
        homeX: wx,
        homeY: wy,
        nextMove: 0,
        tgtX: wx,
        tgtY: wy,
      });
    }
  }

  /** 生成非交互街景行人，沿道路横向循环行走 */
  private spawnAmbientWalkers() {
    const count = Phaser.Math.Clamp(Math.floor(this.mapWTiles / 6), 4, 8);
    const lanes = this.primaryRoadRows.length ? this.primaryRoadRows : [...ROAD_ROWS];
    for (let i = 0; i < count; i++) {
      const role: Extract<NpcRole, 'tourist' | 'vendor'> = i % 4 === 0 ? 'vendor' : 'tourist';
      const direction: -1 | 1 = i % 2 === 0 ? 1 : -1;
      const tex = role === 'vendor' ? TEX.npcVendor : TEX.npcTourist;
      const laneY = lanes[i % lanes.length] * TILE + TILE / 2 + (i % 2 === 0 ? -2 : 2);
      const x = ((i + 1) / (count + 1)) * this.mapWTiles * TILE;
      const sprite = this.add
        .sprite(x, laneY, tex, 0)
        .setDepth(laneY - 4)
        .setAlpha(0.92)
        .setScale(CHARACTER_SCALE);
      const walker: AmbientWalker = {
        sprite,
        direction,
        speed: 22 + (i % 3) * 7,
        laneY,
        role,
      };
      this.playWalkerAnimation(walker);
      this.walkers.push(walker);
    }
  }

  private playWalkerAnimation(walker: AmbientWalker) {
    const tex = walker.role === 'vendor' ? TEX.npcVendor : TEX.npcTourist;
    if (!this.textureHasFrames(tex, 16)) return;
    const prefix = walker.role === 'vendor' ? 'npc-vendor' : 'npc-tourist';
    walker.sprite.anims.play(`${prefix}-${walker.direction < 0 ? 'left' : 'right'}`, true);
  }

  private updateAmbientWalkers() {
    if (!this.walkers.length) return;
    const dt = this.game.loop.delta / 1000;
    const minX = -TILE;
    const maxX = this.mapWTiles * TILE + TILE;
    for (const walker of this.walkers) {
      walker.sprite.x += walker.direction * walker.speed * dt;
      walker.sprite.y = walker.laneY;
      if (walker.direction > 0 && walker.sprite.x > maxX) walker.sprite.x = minX;
      else if (walker.direction < 0 && walker.sprite.x < minX) walker.sprite.x = maxX;
      walker.sprite.setDepth(walker.sprite.y - 4);
      if (!walker.sprite.anims.isPlaying) this.playWalkerAnimation(walker);
    }
  }

  /** 点击寻路：把世界坐标换算为瓦片，BFS 求路并设为当前路径 */
  private requestPathTo(worldX: number, worldY: number) {
    if (!this.blocked.length) return;
    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);
    if (tx < 0 || tx >= this.mapWTiles || ty < 0 || ty >= MAP_H) return;
    const start = { tx: Math.floor(this.player.x / TILE), ty: Math.floor(this.player.y / TILE) };
    const goal = this.nearestWalkable(tx, ty);
    if (!goal) return;
    const path = this.findPath(start, goal);
    if (path.length === 0) return;
    this.path = path;
    this.moveTarget
      .setVisible(true)
      .setPosition(goal.tx * TILE + TILE / 2, goal.ty * TILE + TILE / 2);
  }

  /** 找到目标格自身或最近的可行走格（点击建筑时回退到相邻空地） */
  private nearestWalkable(tx: number, ty: number): { tx: number; ty: number } | null {
    if (!this.blocked[ty]?.[tx]) return { tx, ty };
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < this.mapWTiles && !this.blocked[ny][nx]) {
            return { tx: nx, ty: ny };
          }
        }
      }
    }
    return null;
  }

  /** 4 向 BFS 寻路，返回不含起点的瓦片队列 */
  private findPath(
    start: { tx: number; ty: number },
    goal: { tx: number; ty: number },
  ): { tx: number; ty: number }[] {
    if (start.tx === goal.tx && start.ty === goal.ty) return [];
    const key = (x: number, y: number) => y * this.mapWTiles + x;
    const prev = new Map<number, number>();
    const visited = new Set<number>([key(start.tx, start.ty)]);
    const queue: { tx: number; ty: number }[] = [start];
    const dirs = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    let found = false;
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.tx === goal.tx && cur.ty === goal.ty) {
        found = true;
        break;
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.tx + dx;
        const ny = cur.ty + dy;
        if (nx < 0 || nx >= this.mapWTiles || ny < 0 || ny >= MAP_H) continue;
        if (this.blocked[ny][nx]) continue;
        const k = key(nx, ny);
        if (visited.has(k)) continue;
        visited.add(k);
        prev.set(k, key(cur.tx, cur.ty));
        queue.push({ tx: nx, ty: ny });
      }
    }
    if (!found) return [];
    // 回溯
    const path: { tx: number; ty: number }[] = [];
    let ck = key(goal.tx, goal.ty);
    const startK = key(start.tx, start.ty);
    while (ck !== startK) {
      path.unshift({ tx: ck % this.mapWTiles, ty: Math.floor(ck / this.mapWTiles) });
      const p = prev.get(ck);
      if (p === undefined) break;
      ck = p;
    }
    return path;
  }

  private buildPlayer() {
    const startX = MAP_W * TILE * 0.5;
    const startY = ROAD_ROWS[1] * TILE;
    this.player = this.physics.add.sprite(startX, startY, TEX.player, 0);
    this.player.setScale(CHARACTER_SCALE);
    this.configurePlayerBody();
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(startY);
    this.physics.add.collider(this.player, this.solids);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };

    // 缩放键：+ / - （主键盘与小键盘）
    this.plusKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS);
    this.minusKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS);
    this.plusKeyNum = kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD);
    this.minusKeyNum = kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_SUBTRACT);

    // Shift + 鼠标滚轮 缩放
    const shiftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.input.on(
      'wheel',
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        if (!shiftKey.isDown) return;
        this.applyZoom(this.zoom + (dy < 0 ? ZOOM_STEP : -ZOOM_STEP));
      },
    );
  }

  private configurePlayerBody() {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const frameW = this.player.frame.realWidth || TILE;
    const frameH = this.player.frame.realHeight || TILE;
    const bodyW = Math.min(PLAYER_BODY_WIDTH, Math.max(8, frameW - 4));
    const bodyH = Math.min(PLAYER_BODY_HEIGHT, Math.max(8, frameH - 4));
    body.setSize(bodyW, bodyH, false);
    body.setOffset((frameW - bodyW) / 2, frameH - bodyH - Math.max(3, frameH * 0.1));
  }

  private buildCamera() {
    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
  }

  update() {
    if (!this.player) return;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    const manual = vx !== 0 || vy !== 0;
    if (manual) {
      // 手动输入即取消点击寻路
      if (this.path.length) {
        this.path = [];
        this.moveTarget.setVisible(false);
      }
      const len = Math.hypot(vx, vy) || 1;
      this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
    } else if (this.path.length) {
      // 自动沿路径走向下一个航点
      const wp = this.path[0];
      const tcx = wp.tx * TILE + TILE / 2;
      const tcy = wp.ty * TILE + TILE / 2;
      const dx = tcx - this.player.x;
      const dy = tcy - this.player.y;
      if (Math.hypot(dx, dy) < 4) {
        this.path.shift();
        if (!this.path.length) {
          this.player.setVelocity(0, 0);
          this.moveTarget.setVisible(false);
        }
      } else {
        const len = Math.hypot(dx, dy) || 1;
        this.player.setVelocity((dx / len) * PLAYER_SPEED, (dy / len) * PLAYER_SPEED);
      }
    } else {
      this.player.setVelocity(0, 0);
    }
    this.player.setDepth(this.player.y);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body | null;
    this.updatePlayerAnimation(playerBody?.velocity.x ?? 0, playerBody?.velocity.y ?? 0);
    this.updateForegroundCovers();

    this.updateNpcs();
    this.updateAmbientWalkers();

    // 缩放键
    if (
      Phaser.Input.Keyboard.JustDown(this.plusKey!) ||
      Phaser.Input.Keyboard.JustDown(this.plusKeyNum!)
    )
      this.applyZoom(this.zoom + ZOOM_STEP);
    if (
      Phaser.Input.Keyboard.JustDown(this.minusKey!) ||
      Phaser.Input.Keyboard.JustDown(this.minusKeyNum!)
    )
      this.applyZoom(this.zoom - ZOOM_STEP);

    // 上报玩家瓦片坐标（变化才 emit）
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor(this.player.y / TILE);
    if (tx !== this.lastTx || ty !== this.lastTy) {
      this.lastTx = tx;
      this.lastTy = ty;
      emitBus({ type: 'player-pos', tx, ty, mapW: this.mapWTiles, mapH: MAP_H });
    }

    this.updateNearby();

    if (Phaser.Input.Keyboard.JustDown(this.wasd.interact)) this.interactNearby();
  }

  private interactNearby() {
    const n = this.nearby;
    if (!n) return false;
    if (n.kind === 'npc') {
      emitBus({ type: 'interact-npc', npcId: n.npc.id });
      return true;
    }

    const p = n.point;
    if (p.kind === 'craft') emitBus({ type: 'interact-craft', craftId: p.payload });
    else if (p.kind === 'industry') emitBus({ type: 'interact-industry', industryId: p.payload });
    else if (p.kind === 'activity') emitBus({ type: 'interact-activity', activityId: p.payload });
    else if (p.kind === 'subregionGate') emitBus({ type: 'interact-subregion-gate', subregionId: p.payload });
    else emitBus({ type: 'interact-gate', regionId: p.payload, unlocked: !!p.unlocked, routeId: p.routeId });
    return true;
  }

  /** NPC 漫游：游客在出生点附近随机踱步，vendor 基本驻守原地 */
  private updatePlayerAnimation(vx: number, vy: number) {
    if (!this.textureHasFrames(TEX.player, 16)) return;
    const moving = Math.hypot(vx, vy) > 4;
    if (!moving) {
      this.player.anims.stop();
      return;
    }
    const direction =
      Math.abs(vx) > Math.abs(vy)
        ? vx < 0
          ? 'left'
          : 'right'
        : vy < 0
          ? 'up'
          : 'down';
    this.player.anims.play(`player-${direction}`, true);
  }

  private updateNpcAnimation(npc: NpcEntity, vx: number, vy: number) {
    const tex = npc.role === 'vendor' ? TEX.npcVendor : TEX.npcTourist;
    if (!this.textureHasFrames(tex, 16)) return;
    const prefix = npc.role === 'vendor' ? 'npc-vendor' : 'npc-tourist';
    const direction =
      Math.abs(vx) > Math.abs(vy)
        ? vx < 0
          ? 'left'
          : 'right'
        : vy < 0
          ? 'up'
          : 'down';
    npc.sprite.anims.play(`${prefix}-${direction}`, true);
  }

  private updateNpcs() {
    const now = this.time.now;
    for (const npc of this.npcs) {
      if (now >= npc.nextMove) {
        npc.nextMove = now + 1400 + Math.random() * 1800;
        if (npc.role === 'tourist') {
          const home = { tx: Math.floor(npc.homeX / TILE), ty: Math.floor(npc.homeY / TILE) };
          const roads = this.roadTileList();
          const nearby = roads.filter(
            (tile) => Math.abs(tile.tx - home.tx) + Math.abs(tile.ty - home.ty) <= 10,
          );
          const pool = nearby.length ? nearby : roads;
          const tile = pool[Math.floor(Math.random() * pool.length)];
          if (tile) {
            npc.tgtX = tile.tx * TILE + TILE / 2;
            npc.tgtY = tile.ty * TILE + TILE / 2;
          }
        }
      }
      const dx = npc.tgtX - npc.sprite.x;
      const dy = npc.tgtY - npc.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        this.updateNpcAnimation(npc, dx, dy);
        const step = (NPC_SPEED * this.game.loop.delta) / 1000;
        const mv = Math.min(step, dist);
        npc.sprite.x += (dx / dist) * mv;
        npc.sprite.y += (dy / dist) * mv;
        npc.sprite.setDepth(npc.sprite.y);
        npc.label.setPosition(npc.sprite.x, npc.sprite.y - TILE).setDepth(npc.sprite.y + 1);
      } else {
        npc.sprite.anims.stop();
      }
    }
  }

  private updateNearby() {
    let best: Nearby | null = null;
    let bestDist = Infinity;
    for (const p of this.points) {
      const rect = this.pointInteractionRect(p.location);
      const nearest = nearestPointOnInteractionRect(this.player.x, this.player.y, rect);
      const d = interactionRectDistance(this.player.x, this.player.y, rect);
      if (d < INTERACT_RANGE && shouldReplaceNearbyCandidate('point', d, best?.kind ?? null, bestDist)) {
        best = { kind: 'point', point: p, x: nearest.x, y: nearest.y, hint: p.hint };
        bestDist = d;
      }
    }
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.sprite.x,
        npc.sprite.y,
      );
      if (d < INTERACT_RANGE && shouldReplaceNearbyCandidate('npc', d, best?.kind ?? null, bestDist)) {
        best = {
          kind: 'npc',
          npc,
          x: npc.sprite.x,
          y: npc.sprite.y,
          hint: `按 E 与「${npc.name}」交谈`,
        };
        bestDist = d;
      }
    }

    const prev = this.nearby;
    const sameAsBefore =
      (best === null && prev === null) ||
      (best !== null && prev !== null && best.kind === prev.kind && best.hint === prev.hint);
    if (!sameAsBefore) {
      this.nearby = best;
      emitBus({ type: 'hint', text: best ? best.hint : null });
    }

    if (best) {
      this.marker.setVisible(true).setPosition(best.x, best.y - TILE * 1.6);
    } else {
      this.marker.setVisible(false);
    }
  }
}

/** '#rrggbb' → 0xrrggbb */
