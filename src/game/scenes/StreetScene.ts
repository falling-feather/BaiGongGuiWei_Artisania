/**
 * 街道场景 —— 第一版可游览空间：一条横向街道 + 两个手艺体验点。
 * 玩家用 WASD / 方向键 8 向行走，走近体验点头顶出现提示，按 E 触发体验。
 *
 * ⚠️ 设计意图：这里只负责「空间与移动」，手艺的数值结算仍由 engine 负责。
 * 体验点被触发时，本场景只 emit 一个事件，由 React 层接管后续面板与派发。
 */
import Phaser from 'phaser';
import { TILE, TEX, generatePlaceholderTextures } from '../textures';
import { emitBus } from '../EventBus';

interface ExperiencePoint {
  craftId: string;
  name: string;
  texture: string;
  /** 建筑左上角所在的格坐标 */
  tileX: number;
  tileY: number;
  sprite?: Phaser.GameObjects.Image;
}

const MAP_W = 30; // 横向格数
const MAP_H = 15; // 纵向格数
const ROAD_ROW_TOP = 7; // 道路所在行（含）
const ROAD_ROW_BOTTOM = 9;
const PLAYER_SPEED = 160;
const INTERACT_RANGE = TILE * 1.6;

export class StreetScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right' | 'interact', Phaser.Input.Keyboard.Key>;
  private points: ExperiencePoint[] = [];
  private marker!: Phaser.GameObjects.Image;
  private nearby: ExperiencePoint | null = null;

  constructor() {
    super('StreetScene');
  }

  create() {
    generatePlaceholderTextures(this);
    this.buildGround();
    this.points = [
      { craftId: 'indigo-dyeing', name: '蓝染坊', texture: TEX.shopIndigo, tileX: 6, tileY: 4 },
      { craftId: 'bamboo-weaving', name: '竹编坊', texture: TEX.shopBamboo, tileX: 20, tileY: 4 },
    ];
    this.buildShops();
    this.buildPlayer();
    this.buildCamera();

    this.marker = this.add.image(0, 0, TEX.marker).setVisible(false).setDepth(1000);

    emitBus({ type: 'scene-ready' });
  }

  /** 铺地砖：草地为底，中间三行为土路 */
  private buildGround() {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const onRoad = y >= ROAD_ROW_TOP && y <= ROAD_ROW_BOTTOM;
        const tex = onRoad ? TEX.road : TEX.ground;
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, tex);
      }
    }
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  }

  /** 放置体验点建筑（带静态碰撞体） */
  private buildShops() {
    const solids = this.physics.add.staticGroup();
    for (const p of this.points) {
      const px = p.tileX * TILE + TILE; // 2x2 建筑，中心偏移一格
      const py = p.tileY * TILE + TILE;
      const img = this.add.image(px, py, p.texture).setDepth(py);
      p.sprite = img;
      // 建筑底部作为碰撞墙
      const body = solids.create(px, py + TILE * 0.5, undefined as unknown as string);
      body.setVisible(false);
      body.setSize(TILE * 2, TILE).refreshBody();
    }
    // 玩家与建筑碰撞将在 buildPlayer 后挂接
    this.data.set('solids', solids);
  }

  private buildPlayer() {
    const startX = MAP_W * TILE * 0.5;
    const startY = (ROAD_ROW_TOP + 1) * TILE;
    this.player = this.physics.add.sprite(startX, startY, TEX.player);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(startY);

    const solids = this.data.get('solids') as Phaser.Physics.Arcade.StaticGroup;
    this.physics.add.collider(this.player, solids);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };
  }

  private buildCamera() {
    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
  }

  update() {
    if (!this.player) return;
    const speed = PLAYER_SPEED;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
    this.player.setDepth(this.player.y);

    this.updateNearby();

    if (this.nearby && Phaser.Input.Keyboard.JustDown(this.wasd.interact)) {
      emitBus({ type: 'interact-craft', craftId: this.nearby.craftId });
    }
  }

  /** 计算最近的可交互体验点，更新头顶提示 */
  private updateNearby() {
    let best: ExperiencePoint | null = null;
    let bestDist = Infinity;
    for (const p of this.points) {
      if (!p.sprite) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.sprite.x, p.sprite.y);
      if (d < INTERACT_RANGE && d < bestDist) {
        best = p;
        bestDist = d;
      }
    }

    if (best !== this.nearby) {
      this.nearby = best;
      emitBus({ type: 'hint', text: best ? `按 E 进入「${best.name}」` : null });
    }

    if (best && best.sprite) {
      this.marker.setVisible(true).setPosition(best.sprite.x, best.sprite.y - TILE * 1.4);
    } else {
      this.marker.setVisible(false);
    }
  }
}
