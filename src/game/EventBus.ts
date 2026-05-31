/**
 * Phaser ↔ React 事件总线。
 * 游戏世界（Phaser 场景）与界面层（React HUD/弹窗）通过它单向通信，
 * 避免二者直接耦合。Phaser 发事件，React 监听；反之亦然。
 */
import Phaser from 'phaser';

export type GameBusEvent =
  /** 玩家走近并触发某个手艺体验点 */
  | { type: 'interact-craft'; craftId: string }
  /** 玩家进入/离开某体验点的感应范围（用于提示「按 E」） */
  | { type: 'hint'; text: string | null }
  /** 场景已就绪 */
  | { type: 'scene-ready' };

export const EventBus = new Phaser.Events.EventEmitter();

export const BUS = 'game-bus';

export function emitBus(payload: GameBusEvent) {
  EventBus.emit(BUS, payload);
}

export function onBus(handler: (payload: GameBusEvent) => void) {
  EventBus.on(BUS, handler);
  return () => {
    EventBus.off(BUS, handler);
  };
}
