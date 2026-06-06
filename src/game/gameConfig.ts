/**
 * Phaser 游戏配置。像素风：关闭抗锯齿（pixelArt: true），保持锐利边缘。
 */
import Phaser from 'phaser';
import { StreetScene } from './scenes/StreetScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    // 初始分辨率。实际画布使用 RESIZE 铺满舞台，避免高窗口里出现上下黑边。
    width: 800,
    height: 500,
    pixelArt: true,
    backgroundColor: '#2b2620',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [StreetScene],
  };
}
