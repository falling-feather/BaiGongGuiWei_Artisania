/**
 * 占位像素素材生成器 —— 不依赖任何外部图片，直接用 Graphics 画出
 * 纯色/简单像素纹理，方便 M0 立即可跑。
 *
 * ⚠️ 美术替换点：日后把这些 generateTexture 调用替换为 this.load.spritesheet(...)
 * 加载真正的像素美术（角色四向行走帧、地砖、建筑）。详见开发者文档「美术替换点」。
 */
import Phaser from 'phaser';

export const TILE = 32; // 单格像素尺寸

export const TEX = {
  ground: 'tex-ground',
  road: 'tex-road',
  wall: 'tex-wall',
  player: 'tex-player',
  shopIndigo: 'tex-shop-indigo',
  shopBamboo: 'tex-shop-bamboo',
  marker: 'tex-marker',
  // 产业点（按层级配色）与地区出入口
  indHarvest: 'tex-ind-harvest',
  indRefine: 'tex-ind-refine',
  indProduct: 'tex-ind-product',
  craft: 'tex-craft',
  gate: 'tex-gate',
} as const;

/** 在 BootScene 中调用，生成全部占位纹理 */
export function generatePlaceholderTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(TEX.ground)) return; // 幂等：地区切换重建时不重复生成
  drawTile(scene, TEX.ground, 0xffffff, 0xe6e6e6); // 纯白底，运行时按地区 palette 着色
  drawTile(scene, TEX.road, 0xc8b393, 0xbfa882); // 土路黄
  drawTile(scene, TEX.wall, 0x6b5847, 0x5a4a3a); // 墙棕
  drawShop(scene, TEX.shopIndigo, 0x2e4a6b, 0x46688f); // 蓝染坊·靛蓝
  drawShop(scene, TEX.shopBamboo, 0x6f8b52, 0x86a368); // 竹编坊·竹绿
  drawShop(scene, TEX.indHarvest, 0x6f8b52, 0x88a86a); // 采集·绿
  drawShop(scene, TEX.indRefine, 0xb5742f, 0xd0903f); // 精炼·橙（炉火）
  drawShop(scene, TEX.indProduct, 0x8c4a7a, 0xa9608f); // 制作·紫（精品）
  drawShop(scene, TEX.craft, 0x2e4a6b, 0x46688f); // 手艺坊·靛蓝
  drawGate(scene); // 地区出入口·牌坊
  drawPlayer(scene);
  drawMarker(scene);
}

/** 带细微噪点的地砖 */
function drawTile(scene: Phaser.Scene, key: string, base: number, accent: number) {
  const g = scene.add.graphics();
  g.fillStyle(base, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(accent, 1);
  // 简单像素点缀，制造像素质感
  g.fillRect(4, 4, 3, 3);
  g.fillRect(20, 10, 3, 3);
  g.fillRect(12, 24, 3, 3);
  g.lineStyle(1, accent, 0.4).strokeRect(0, 0, TILE, TILE);
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

/** 体验点建筑（2x2 格） */
function drawShop(scene: Phaser.Scene, key: string, roof: number, wall: number) {
  const w = TILE * 2;
  const h = TILE * 2;
  const g = scene.add.graphics();
  g.fillStyle(wall, 1).fillRect(0, h * 0.45, w, h * 0.55); // 墙体
  g.fillStyle(roof, 1).fillTriangle(0, h * 0.45, w, h * 0.45, w / 2, 4); // 屋顶
  g.fillStyle(0x2b2620, 1).fillRect(w / 2 - 8, h - 18, 16, 18); // 门
  g.fillStyle(0xf4ece0, 1).fillRect(8, h * 0.6, 10, 10); // 窗
  g.fillRect(w - 18, h * 0.6, 10, 10);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 玩家占位角色（一个简单的小人） */
function drawPlayer(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0xb5452f, 1).fillRect(8, 10, 16, 16); // 身体·朱红
  g.fillStyle(0xf4d8b0, 1).fillRect(10, 2, 12, 10); // 头
  g.fillStyle(0x2b2620, 1).fillRect(8, 26, 6, 6); // 左脚
  g.fillRect(18, 26, 6, 6); // 右脚
  g.generateTexture(TEX.player, TILE, TILE);
  g.destroy();
}

/** 地区出入口·牌坊（2x2 格） */
function drawGate(scene: Phaser.Scene) {
  const w = TILE * 2;
  const h = TILE * 2;
  const g = scene.add.graphics();
  g.fillStyle(0x8a6a3a, 1).fillRect(6, 8, 8, h - 8); // 左柱
  g.fillRect(w - 14, 8, 8, h - 8); // 右柱
  g.fillStyle(0xa6342b, 1).fillRect(0, 4, w, 12); // 横额·朱红
  g.fillStyle(0xcaa84a, 1).fillRect(w / 2 - 6, 6, 12, 8); // 匾额
  g.generateTexture(TEX.gate, w, h);
  g.destroy();
}

/** 交互提示光标 */
function drawMarker(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0xb8893b, 1);
  g.fillTriangle(8, 0, 16, 12, 0, 12); // 向下三角
  g.generateTexture(TEX.marker, 16, 12);
  g.destroy();
}
