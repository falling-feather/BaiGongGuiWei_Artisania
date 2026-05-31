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

/** 小地图上的一个标记点（瓦片坐标 + 类别） */
export interface MiniMapPoint {
  tx: number;
  ty: number;
  kind: 'industry' | 'craft' | 'gate';
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
  | { type: 'scene-ready' }
  /** 玩家瓦片坐标 + 当前地图尺寸（用于小地图实时定位） */
  | { type: 'player-pos'; tx: number; ty: number; mapW: number; mapH: number }
  /** 当前地区的交互点布局（重建地图时下发一次，用于小地图标记） */
  | { type: 'region-points'; points: MiniMapPoint[] }
  /** 相机缩放变化反馈（用于 UI 显示当前倍率） */
  | { type: 'zoom-changed'; zoom: number };

export type GameCommand =
  /** 让场景重建为指定地区的地图 */
  | { type: 'enter-region'; spec: RegionMapSpec }
  /** 调整相机缩放：delta 为增量，absolute 为指定倍率（二选一） */
  | { type: 'zoom'; delta?: number; absolute?: number };

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
