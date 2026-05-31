/**
 * 街道场景 —— 地区驱动的可游览空间（完整 demo 版）。
 *
 * 设计意图：场景只负责「空间 / 移动 / 摆点 / 触发」，不 import 数据层。
 * React 通过 EventBus 的 enter-region 命令下发一份 RegionMapSpec，
 * 场景据此重建地图（地面配色、产业点、手艺点、地区出入口）。
 * 玩家走近交互点按 E，场景 emit 对应事件，由 React 接管面板/结算/切换。
 */
import Phaser from 'phaser';
import { TILE, TEX, generatePlaceholderTextures } from '../textures';
import {
  emitBus,
  onCommand,
  type RegionMapSpec,
  type IndustryTier,
  type TerrainKind,
  type NpcRole,
} from '../EventBus';

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
type PointKind = 'industry' | 'craft' | 'gate';

interface MapPoint {
  kind: PointKind;
  label: string;
  hint: string;
  /** industry: industryId | craft: craftId | gate: regionId */
  payload: string;
  unlocked?: boolean;
  sprite: Phaser.GameObjects.Image;
}

/** 地图上的 NPC 实体（游客随机游走 / 关联人物驻守） */
interface NpcEntity {
  id: string;
  name: string;
  role: NpcRole;
  sprite: Phaser.GameObjects.Image;
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

/** 当前感应到的可交互对象（交互点或 NPC） */
type Nearby =
  | { kind: 'point'; point: MapPoint; x: number; y: number; hint: string }
  | { kind: 'npc'; npc: NpcEntity; x: number; y: number; hint: string };

const MAP_W = 30;
const MAP_H = 15;
const ROAD_ROW_TOP = 7;
const ROAD_ROW_BOTTOM = 9;
const PLAYER_SPEED = 160;
const NPC_SPEED = 46;
const INTERACT_RANGE = TILE * 1.8;
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

const TIER_TEX: Record<IndustryTier, string> = {
  harvest: TEX.indHarvest,
  refine: TEX.indRefine,
  product: TEX.indProduct,
};

const TIER_LABEL: Record<IndustryTier, string> = {
  harvest: '采集',
  refine: '精炼',
  product: '制作',
};

interface PointSpec {
  kind: PointKind;
  label: string;
  hint: string;
  payload: string;
  unlocked?: boolean;
  tex: string;
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
  /** NPC 实体列表 */
  private npcs: NpcEntity[] = [];
  /** 可行走网格 blocked[ty][tx]=true 表示不可通行（水/障碍/建筑占格） */
  private blocked: boolean[][] = [];
  /** 当前点击寻路路径（瓦片坐标队列，依次走过） */
  private path: { tx: number; ty: number }[] = [];
  /** 寻路目标光环 */
  private moveTarget!: Phaser.GameObjects.Image;
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

  create() {
    generatePlaceholderTextures(this);

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
      else if (cmd.type === 'zoom') {
        if (typeof cmd.absolute === 'number') this.applyZoom(cmd.absolute, true);
        else this.applyZoom(this.zoom + (cmd.delta ?? 0));
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);

    emitBus({ type: 'scene-ready' });
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

    this.groundLayer.clear(true, true);
    this.solids.clear(true, true);
    this.points.forEach((p) => p.sprite.destroy());
    this.points = [];
    this.labels.forEach((t) => t.destroy());
    this.labels = [];
    this.decor.forEach((d) => d.destroy());
    this.decor = [];
    this.npcs.forEach((n) => {
      n.sprite.destroy();
      n.label.destroy();
    });
    this.npcs = [];
    this.path = [];
    this.moveTarget.setVisible(false);
    this.nearby = null;

    this.titleText.setText(`${spec.name}　WASD/点击 移动 · E 交互`);

    const groundTint = hexToNum(spec.palette[0]);
    const accentTint = hexToNum(spec.palette[1]);

    const all: PointSpec[] = [
      ...spec.industries.map((i) => ({
        kind: 'industry' as const,
        label: `${i.name}·${TIER_LABEL[i.tier]}`,
        hint: `按 E ${TIER_LABEL[i.tier]}「${i.name}」`,
        payload: i.id,
        tex: TIER_TEX[i.tier],
      })),
      ...spec.crafts.map((c) => ({
        kind: 'craft' as const,
        label: c.name,
        hint: `按 E 进入「${c.name}」`,
        payload: c.id,
        tex: TEX.craft,
      })),
      ...spec.gates.map((g) => ({
        kind: 'gate' as const,
        label: g.unlocked ? `往 ${g.name}` : `${g.name}·未通`,
        hint: g.unlocked ? `按 E 前往「${g.name}」` : `按 E 开商路解锁「${g.name}」(30 文)`,
        payload: g.regionId,
        unlocked: g.unlocked,
        tex: TEX.gate,
      })),
    ];

    // 槽位布局：上下两行，列数随点数动态扩展，地图宽度据此放大（相机跟随可横向滚动），
    // 避免点位 slot 复用导致互相重叠、被覆盖的交互点无法靠近触发。列间距/左边距为模块级常量。
    const perRow = Math.max(5, Math.ceil(all.length / 2));
    this.mapWTiles = Math.max(MAP_W, LEFT_PAD * 2 + (perRow - 1) * COL_STEP);

    this.physics.world.setBounds(0, 0, this.mapWTiles * TILE, MAP_H * TILE);
    this.cameras.main.setBounds(0, 0, this.mapWTiles * TILE, MAP_H * TILE);

    // 初始化可行走网格（全部可走，随后由地形/建筑标记阻挡）
    this.blocked = Array.from({ length: MAP_H }, () => new Array<boolean>(this.mapWTiles).fill(false));

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < this.mapWTiles; x++) {
        const onRoad = y >= ROAD_ROW_TOP && y <= ROAD_ROW_BOTTOM;
        const img = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, TEX.ground);
        img.setTint(onRoad ? accentTint : groundTint).setDepth(0);
        this.groundLayer.add(img);
      }
    }

    // 地形地貌：按地区类型铺设河流/海岸/山石/街巷（替代单一横向街道）
    this.buildTerrain(spec.terrain);

    let idx = 0;
    for (const item of all) {
      const top = idx < perRow;
      const col = top ? idx : idx - perRow;
      const tileX = LEFT_PAD + col * COL_STEP;
      const tileY = top ? 4 : 11;
      const px = tileX * TILE + TILE;
      const py = tileY * TILE + TILE;

      const img = this.add.image(px, py, item.tex).setDepth(py);
      const body = this.solids.create(px, py + TILE * 0.5) as Phaser.Physics.Arcade.Sprite;
      body.setVisible(false);
      body.setSize(TILE * 2, TILE).refreshBody();
      // 建筑占格标记为不可寻路（玩家仍可走到相邻格交互）
      this.markBlocked(tileX, tileY + 1);
      this.markBlocked(tileX + 1, tileY + 1);

      const label = this.add
        .text(px, py - TILE * 1.1, item.label, {
          fontSize: '11px',
          color: '#fff',
          backgroundColor: '#00000088',
        })
        .setOrigin(0.5)
        .setDepth(py + 1)
        .setPadding(3, 1, 3, 1);
      this.labels.push(label);

      this.points.push({
        kind: item.kind,
        label: item.label,
        hint: item.hint,
        payload: item.payload,
        unlocked: item.unlocked,
        sprite: img,
      });
      idx++;
    }

    // 生成 NPC：vendor 驻守关联手艺点旁，tourist 散布于街道随机游走
    this.spawnNpcs(spec, all, LEFT_PAD, COL_STEP, perRow);

    this.player.setPosition(this.mapWTiles * TILE * 0.5, (ROAD_ROW_TOP + 1) * TILE);
    this.player.setVelocity(0, 0);
    this.lastTx = -1;
    this.lastTy = -1;

    // 下发小地图标记点（瓦片坐标）
    emitBus({
      type: 'region-points',
      points: this.points.map((p) => ({
        tx: Math.round((p.sprite.x - TILE) / TILE),
        ty: Math.round((p.sprite.y - TILE) / TILE),
        kind: p.kind,
      })),
    });
  }

  /** 标记某瓦片为不可通行（越界忽略） */
  private markBlocked(tx: number, ty: number) {
    if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < this.mapWTiles && this.blocked[ty]) {
      this.blocked[ty][tx] = true;
    }
  }

  /** 放置一块地貌装饰瓦片；solid=true 时同时加入物理阻挡并标记不可寻路 */
  private addDecorTile(tx: number, ty: number, tex: string, solid: boolean) {
    if (tx < 0 || tx >= this.mapWTiles || ty < 0 || ty >= MAP_H) return;
    const cx = tx * TILE + TILE / 2;
    const cy = ty * TILE + TILE / 2;
    const img = this.add.image(cx, cy, tex).setDepth(solid ? cy : 1);
    this.decor.push(img);
    if (solid) {
      const body = this.solids.create(cx, cy) as Phaser.Physics.Arcade.Sprite;
      body.setVisible(false);
      body.setSize(TILE, TILE).refreshBody();
      this.markBlocked(tx, ty);
    }
  }

  /** 依地区地貌类型铺设地形：河流+石桥 / 海岸 / 山石林木 / 街巷栅栏 */
  private buildTerrain(kind: TerrainKind) {
    const midRow = (ROAD_ROW_TOP + ROAD_ROW_BOTTOM) >> 1;
    if (kind === 'water') {
      // 一条纵向河道，街道行处架石桥可通行。
      // 河列必须落在点位缝隙中心（避开交互点建筑列，不再压住手艺/产业点）。
      const target = Math.floor(this.mapWTiles * 0.5);
      const k = Math.round((target - LEFT_PAD - POINT_GAP_OFFSET) / COL_STEP);
      let riverCol = LEFT_PAD + POINT_GAP_OFFSET + Math.max(0, k) * COL_STEP;
      // 限幅到地图内；若限幅破坏了缝隙对齐，向内退一个步长回到缝隙列。
      riverCol = Math.min(this.mapWTiles - 3, Math.max(3, riverCol));
      if ((riverCol - LEFT_PAD + COL_STEP * 1000) % COL_STEP !== POINT_GAP_OFFSET) {
        riverCol = LEFT_PAD + POINT_GAP_OFFSET + Math.max(0, k - 1) * COL_STEP;
      }
      for (let y = 0; y < MAP_H; y++) {
        const onRoad = y >= ROAD_ROW_TOP && y <= ROAD_ROW_BOTTOM;
        this.addDecorTile(riverCol, y, onRoad ? TEX.bridge : TEX.water, !onRoad);
      }
    } else if (kind === 'coast') {
      // 底部两行为海面（不可通行），岸边点缀礁石
      for (let y = MAP_H - 2; y < MAP_H; y++) {
        for (let x = 0; x < this.mapWTiles; x++) this.addDecorTile(x, y, TEX.water, true);
      }
      for (let x = 2; x < this.mapWTiles; x += 6) this.addDecorTile(x, MAP_H - 3, TEX.rock, true);
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
  private spawnNpcs(
    spec: RegionMapSpec,
    all: PointSpec[],
    leftPad: number,
    colStep: number,
    perRow: number,
  ) {
    let touristSlot = 0;
    for (const n of spec.npcs) {
      let wx: number;
      let wy: number;
      if (n.role === 'vendor' && n.anchorId) {
        const aIdx = all.findIndex((p) => p.payload === n.anchorId);
        if (aIdx >= 0) {
          const top = aIdx < perRow;
          const col = top ? aIdx : aIdx - perRow;
          const tileX = leftPad + col * colStep;
          const tileY = top ? 4 : 11;
          wx = (tileX + 2) * TILE; // 站在店铺右侧
          wy = (tileY + 1) * TILE + TILE;
        } else {
          continue; // 锚点不在本地图，跳过
        }
      } else {
        // 游客：沿街道散布
        const tileX = 3 + (touristSlot * 5) % Math.max(6, this.mapWTiles - 4);
        touristSlot++;
        wx = tileX * TILE + TILE / 2;
        wy = (ROAD_ROW_TOP + (touristSlot % 2 === 0 ? 0 : 2)) * TILE + TILE / 2;
      }
      const tex = n.role === 'vendor' ? TEX.npcVendor : TEX.npcTourist;
      const sprite = this.add.image(wx, wy, tex).setDepth(wy);
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
    const startY = (ROAD_ROW_TOP + 1) * TILE;
    this.player = this.physics.add.sprite(startX, startY, TEX.player);
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

    this.updateNpcs();

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

    if (this.nearby && Phaser.Input.Keyboard.JustDown(this.wasd.interact)) {
      const n = this.nearby;
      if (n.kind === 'npc') {
        emitBus({ type: 'interact-npc', npcId: n.npc.id });
      } else {
        const p = n.point;
        if (p.kind === 'craft') emitBus({ type: 'interact-craft', craftId: p.payload });
        else if (p.kind === 'industry') emitBus({ type: 'interact-industry', industryId: p.payload });
        else emitBus({ type: 'interact-gate', regionId: p.payload, unlocked: !!p.unlocked });
      }
    }
  }

  /** NPC 漫游：游客在出生点附近随机踱步，vendor 基本驻守原地 */
  private updateNpcs() {
    const now = this.time.now;
    for (const npc of this.npcs) {
      if (now >= npc.nextMove) {
        npc.nextMove = now + 1400 + Math.random() * 1800;
        if (npc.role === 'tourist') {
          const rng = TILE * 2.5;
          npc.tgtX = Phaser.Math.Clamp(
            npc.homeX + (Math.random() * 2 - 1) * rng,
            TILE,
            this.mapWTiles * TILE - TILE,
          );
          npc.tgtY = Phaser.Math.Clamp(
            npc.homeY + (Math.random() * 2 - 1) * TILE,
            (ROAD_ROW_TOP - 1) * TILE,
            (ROAD_ROW_BOTTOM + 1) * TILE,
          );
        }
      }
      const dx = npc.tgtX - npc.sprite.x;
      const dy = npc.tgtY - npc.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const step = (NPC_SPEED * this.game.loop.delta) / 1000;
        const mv = Math.min(step, dist);
        npc.sprite.x += (dx / dist) * mv;
        npc.sprite.y += (dy / dist) * mv;
        npc.sprite.setDepth(npc.sprite.y);
        npc.label.setPosition(npc.sprite.x, npc.sprite.y - TILE).setDepth(npc.sprite.y + 1);
      }
    }
  }

  private updateNearby() {
    let best: Nearby | null = null;
    let bestDist = Infinity;
    for (const p of this.points) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.sprite.x, p.sprite.y);
      if (d < INTERACT_RANGE && d < bestDist) {
        best = { kind: 'point', point: p, x: p.sprite.x, y: p.sprite.y, hint: p.hint };
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
      if (d < INTERACT_RANGE && d < bestDist) {
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
function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
