/**
 * 存档适配器接口 —— 隔离「存档逻辑」与「存档介质」。
 * 当前用 localStorage 实现单机存档；未来接入后端云存档时，
 * 只需实现一个 RemoteStorageAdapter，UI / store 层零改动。
 */
import type { GameState } from '../engine/types';

export const SAVE_VERSION = 4;

export interface SaveData {
  version: number;
  savedAt: number;
  state: GameState;
}

export interface StorageAdapter {
  save(state: GameState): Promise<void>;
  load(): Promise<GameState | null>;
  clear(): Promise<void>;
  /** 是否存在可用（版本兼容）的存档 */
  hasSave(): Promise<boolean>;
}
