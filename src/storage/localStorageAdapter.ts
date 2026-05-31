/**
 * localStorage 存档实现。
 * 仅依赖 StorageAdapter 接口约定，方便未来替换为后端实现。
 */
import type { GameState } from '../engine/types';
import { SAVE_VERSION, type SaveData, type StorageAdapter } from './StorageAdapter';

const STORAGE_KEY = 'artisania:save';

export class LocalStorageAdapter implements StorageAdapter {
  async save(state: GameState): Promise<void> {
    const payload: SaveData = { version: SAVE_VERSION, savedAt: Date.now(), state };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[Artisania] 存档失败：', err);
    }
  }

  async load(): Promise<GameState | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const payload = JSON.parse(raw) as SaveData;
      if (payload.version !== SAVE_VERSION) {
        // 版本不兼容时丢弃旧档（未来可在此写迁移逻辑）
        return null;
      }
      return payload.state;
    } catch (err) {
      console.warn('[Artisania] 读取存档失败：', err);
      return null;
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }

  async hasSave(): Promise<boolean> {
    return (await this.load()) !== null;
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
