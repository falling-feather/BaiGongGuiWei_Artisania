/**
 * Phaser ↔ React 双向事件总线。
 * - GameBusEvent：Phaser 场景 → React（交互触发、提示、就绪）。
 * - GameCommand：React → Phaser（切换地区、重建地图）。
 * 二者各走一个频道，互不耦合。
 */
import Phaser from 'phaser';

/** 地图上一个产业交互点的层级（用于配色/图标） */
export type IndustryTier = 'harvest' | 'refine' | 'product';

/** React 下发给场景的「地区地图规格」——场景据此摆点，无需 import 数据层 */
export interface RegionMapSpec {
  regionId: string;
  name: string;
  /** [地面色, 点缀色] hex */
  palette: [string, string];
  industries: { id: string; name: string; tier: IndustryTier }[];
  crafts: { id: string; name: string }[];
  gates: { regionId: string; name: string; unlocked: boolean }[];
}

export type GameBusEvent =
  /** 玩家走近并触发某个手艺体验点 */
  | { type: 'interact-craft'; craftId: string }
  /** 玩家走近并触发某个基础产业点 */
  | { type: 'interact-industry'; industryId: string }
  /** 玩家走近并触发某个地区出入口 */
  | { type: 'interact-gate'; regionId: string; unlocked: boolean }
  /** 玩家进入/离开某交互点的感应范围（用于提示「按 E」） */
  | { type: 'hint'; text: string | null }
  /** 场景已就绪（可以接收第一条 enter-region 命令） */
  | { type: 'scene-ready' };

export type GameCommand =
  /** 让场景重建为指定地区的地图 */
  { type: 'enter-region'; spec: RegionMapSpec };

export const EventBus = new Phaser.Events.EventEmitter();

const BUS = 'game-bus';
const CMD = 'game-cmd';

export function emitBus(payload: GameBusEvent) {
  EventBus.emit(BUS, payload);
}

export function onBus(handler: (payload: GameBusEvent) => void) {
  EventBus.on(BUS, handler);
  return () => {
    EventBus.off(BUS, handler);
  };
}

export function emitCommand(payload: GameCommand) {
  EventBus.emit(CMD, payload);
}

export function onCommand(handler: (payload: GameCommand) => void) {
  EventBus.on(CMD, handler);
  return () => {
    EventBus.off(CMD, handler);
  };
}
