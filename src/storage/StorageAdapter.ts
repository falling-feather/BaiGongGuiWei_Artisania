/**
 * 存档适配器接口 —— 隔离「存档逻辑」与「存档介质」。
 * 当前用 localStorage 实现单机存档；未来接入后端云存档时，
 * 只需实现一个 RemoteStorageAdapter，UI / store 层零改动。
 */
import type { GameState } from '../engine/types';

export const SAVE_VERSION = 9;

export interface SaveData {
  version: number;
  savedAt: number;
  state: GameState;
}

export interface SaveSlotSummary {
  slotId: string;
  name: string;
  savedAt: number;
  version: number;
  turn: number;
  playerName: string;
  currentRegion: string;
  currentSubregion: string;
  devMode: boolean;
}

export interface SaveSlotData extends SaveData {
  slotId: string;
  name: string;
}

export interface StorageAdapter {
  save(state: GameState, slotId?: string, name?: string): Promise<string>;
  load(slotId?: string): Promise<GameState | null>;
  listSaves(): Promise<SaveSlotSummary[]>;
  deleteSave(slotId: string): Promise<void>;
  clear(slotId?: string): Promise<void>;
  getActiveSlotId(): Promise<string | null>;
  setActiveSlotId(slotId: string | null): Promise<void>;
  /** 是否存在可用（版本兼容）的存档 */
  hasSave(): Promise<boolean>;
}
