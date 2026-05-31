/**
 * React 容器：负责在 DOM 中挂载/销毁 Phaser 游戏实例。
 * 游戏世界的逻辑全在 Phaser 场景里，这里只管生命周期。
 */
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from './gameConfig';

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    gameRef.current = new Phaser.Game(createGameConfig(containerRef.current));
    if (import.meta.env.DEV) {
      (window as unknown as { __game?: Phaser.Game }).__game = gameRef.current;
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div className="game-canvas" ref={containerRef} />;
}
