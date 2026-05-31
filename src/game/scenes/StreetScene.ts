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
import { emitBus, onCommand, type RegionMapSpec, type IndustryTier } from '../EventBus';

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

const MAP_W = 30;
const MAP_H = 15;
const ROAD_ROW_TOP = 7;
const ROAD_ROW_BOTTOM = 9;
const PLAYER_SPEED = 160;
const INTERACT_RANGE = TILE * 1.8;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

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
  private nearby: MapPoint | null = null;
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
    this.titleText = this.add
      .text(8, 8, '', { fontSize: '14px', color: '#fff', backgroundColor: '#00000066' })
      .setScrollFactor(0)
      .setDepth(100001)
      .setPadding(4, 2, 4, 2);

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
    this.nearby = null;

    this.titleText.setText(`${spec.name}　WASD 移动 · E 交互`);

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
    // 避免点位 slot 复用导致互相重叠、被覆盖的交互点无法靠近触发。
    const COL_STEP = 5;
    const LEFT_PAD = 4;
    const perRow = Math.max(5, Math.ceil(all.length / 2));
    this.mapWTiles = Math.max(MAP_W, LEFT_PAD * 2 + (perRow - 1) * COL_STEP);

    this.physics.world.setBounds(0, 0, this.mapWTiles * TILE, MAP_H * TILE);
    this.cameras.main.setBounds(0, 0, this.mapWTiles * TILE, MAP_H * TILE);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < this.mapWTiles; x++) {
        const onRoad = y >= ROAD_ROW_TOP && y <= ROAD_ROW_BOTTOM;
        const img = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, TEX.ground);
        img.setTint(onRoad ? accentTint : groundTint).setDepth(0);
        this.groundLayer.add(img);
      }
    }

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

    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
    this.player.setDepth(this.player.y);

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
      const p = this.nearby;
      if (p.kind === 'craft') emitBus({ type: 'interact-craft', craftId: p.payload });
      else if (p.kind === 'industry') emitBus({ type: 'interact-industry', industryId: p.payload });
      else emitBus({ type: 'interact-gate', regionId: p.payload, unlocked: !!p.unlocked });
    }
  }

  private updateNearby() {
    let best: MapPoint | null = null;
    let bestDist = Infinity;
    for (const p of this.points) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.sprite.x, p.sprite.y);
      if (d < INTERACT_RANGE && d < bestDist) {
        best = p;
        bestDist = d;
      }
    }

    if (best !== this.nearby) {
      this.nearby = best;
      emitBus({ type: 'hint', text: best ? best.hint : null });
    }

    if (best) {
      this.marker.setVisible(true).setPosition(best.sprite.x, best.sprite.y - TILE * 1.6);
    } else {
      this.marker.setVisible(false);
    }
  }
}

/** '#rrggbb' → 0xrrggbb */
function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
