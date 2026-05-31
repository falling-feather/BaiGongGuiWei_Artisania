/**
 * Phaser 游戏配置。像素风：关闭抗锯齿（pixelArt: true），保持锐利边缘。
 */
import Phaser from 'phaser';
import { StreetScene } from './scenes/StreetScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 480,
    height: 320,
    pixelArt: true,
    backgroundColor: '#2b2620',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [StreetScene],
  };
}
