/**
 * localStorage 多存档实现。
 * 兼容旧单槽 `artisania:save`，第一次读取时迁入默认槽位。
 */
import type { GameState } from '../engine/types';
import { firstSubregionIdForRegion } from '../data/regions';
import { createRealTimeState } from '../engine/realTime';
import { createCalendar, createDefaultPlayerProfile, createInitialFarmPlots } from '../engine/state';
import {
  SAVE_VERSION,
  type SaveData,
  type SaveSlotData,
  type SaveSlotSummary,
  type StorageAdapter,
} from './StorageAdapter';

const LEGACY_STORAGE_KEY = 'artisania:save';
const INDEX_KEY = 'artisania:saves:index';
const ACTIVE_KEY = 'artisania:saves:active';
const SLOT_PREFIX = 'artisania:saves:slot:';
const DEFAULT_SLOT_ID = 'slot-1';
const MAX_SAVE_SLOTS = 5;
const COMPATIBLE_SAVE_VERSIONS = new Set([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, SAVE_VERSION]);

function slotKey(slotId: string) {
  return `${SLOT_PREFIX}${slotId}`;
}

function createSlotId() {
  return `slot-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
}

function slotNameFor(state: GameState, fallback = '无名匠人的存档') {
  const name = state.playerName.trim() || fallback;
  return state.devMode ? `${name} · 开发者` : `${name} · 第${state.turn}季`;
}

function migrateState(state: GameState): GameState {
  const currentSubregion =
    state.currentSubregion && state.currentSubregion !== state.currentRegion
      ? state.currentSubregion
      : firstSubregionIdForRegion(state.currentRegion);
  const day = state.calendar?.day ?? state.turn ?? 1;
  return {
    ...state,
    currentSubregion,
    profile: state.profile ?? createDefaultPlayerProfile(),
    calendar: state.calendar ?? createCalendar(day),
    realTime: state.realTime ?? createRealTimeState(Date.now()),
    farmPlots: state.farmPlots ?? createInitialFarmPlots(),
    itemInstances: state.itemInstances ?? [],
    pendingEscortCrisis: state.pendingEscortCrisis ?? null,
    pendingSupplyCrisis: state.pendingSupplyCrisis ?? null,
    pendingActivityStallClosing: state.pendingActivityStallClosing ?? null,
    npcStates: state.npcStates ?? {},
    completedActivities: state.completedActivities ?? [],
    regionReputation: state.regionReputation ?? (state.currentRegion ? { [state.currentRegion]: 5 } : {}),
    routeStability: state.routeStability ?? {},
    routeEscortRuns: state.routeEscortRuns ?? {},
    supplyCrisisRecords: state.supplyCrisisRecords ?? [],
    activeOrders: state.activeOrders ?? [],
    homeVisitRecords: state.homeVisitRecords ?? [],
    nightMarketStallRecords: state.nightMarketStallRecords ?? [],
    economyLedgerRecords: state.economyLedgerRecords ?? [],
    workshopUpgrades: state.workshopUpgrades ?? [],
    workshopSpaces: state.workshopSpaces ?? [],
    trackedLoreEntryId: state.trackedLoreEntryId ?? null,
  };
}

function summaryFrom(payload: SaveSlotData): SaveSlotSummary {
  const state = payload.state;
  return {
    slotId: payload.slotId,
    name: payload.name,
    savedAt: payload.savedAt,
    version: payload.version,
    turn: state.turn,
    playerName: state.playerName,
    currentRegion: state.currentRegion,
    currentSubregion: state.currentSubregion,
    devMode: state.devMode,
  };
}

export class LocalStorageAdapter implements StorageAdapter {
  private readIndex(): string[] {
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch (err) {
      console.warn('[Artisania] 读取存档索引失败：', err);
      return [];
    }
  }

  private writeIndex(ids: string[]) {
    localStorage.setItem(INDEX_KEY, JSON.stringify([...new Set(ids)].slice(0, MAX_SAVE_SLOTS)));
  }

  private readSlot(slotId: string): SaveSlotData | null {
    try {
      const raw = localStorage.getItem(slotKey(slotId));
      if (!raw) return null;
      const payload = JSON.parse(raw) as SaveSlotData;
      if (!COMPATIBLE_SAVE_VERSIONS.has(payload.version)) return null;
      return {
        ...payload,
        version: SAVE_VERSION,
        state: migrateState(payload.state),
      };
    } catch (err) {
      console.warn('[Artisania] 读取存档槽失败：', err);
      return null;
    }
  }

  private ensureLegacyMigrated() {
    if (this.readIndex().length > 0) return;
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    try {
      const legacy = JSON.parse(raw) as SaveData;
      if (!COMPATIBLE_SAVE_VERSIONS.has(legacy.version)) return;
      const state = migrateState(legacy.state);
      const payload: SaveSlotData = {
        slotId: DEFAULT_SLOT_ID,
        name: slotNameFor(state, '旧存档'),
        version: SAVE_VERSION,
        savedAt: legacy.savedAt ?? Date.now(),
        state,
      };
      localStorage.setItem(slotKey(DEFAULT_SLOT_ID), JSON.stringify(payload));
      this.writeIndex([DEFAULT_SLOT_ID]);
      localStorage.setItem(ACTIVE_KEY, DEFAULT_SLOT_ID);
    } catch (err) {
      console.warn('[Artisania] 迁移旧存档失败：', err);
    }
  }

  async save(state: GameState, slotId?: string, name?: string): Promise<string> {
    this.ensureLegacyMigrated();
    const ids = this.readIndex();
    const active = localStorage.getItem(ACTIVE_KEY);
    const targetSlotId = slotId ?? active ?? ids[0] ?? createSlotId();
    const existing = this.readSlot(targetSlotId);
    const payload: SaveSlotData = {
      slotId: targetSlotId,
      name: name?.trim() || existing?.name || slotNameFor(state),
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state: migrateState(state),
    };
    try {
      localStorage.setItem(slotKey(targetSlotId), JSON.stringify(payload));
      this.writeIndex([targetSlotId, ...ids.filter((id) => id !== targetSlotId)]);
      localStorage.setItem(ACTIVE_KEY, targetSlotId);
    } catch (err) {
      console.warn('[Artisania] 存档失败：', err);
    }
    return targetSlotId;
  }

  async load(slotId?: string): Promise<GameState | null> {
    this.ensureLegacyMigrated();
    const summaries = await this.listSaves();
    const active = slotId ?? localStorage.getItem(ACTIVE_KEY) ?? summaries[0]?.slotId;
    if (!active) return null;
    const payload = this.readSlot(active);
    if (!payload) return null;
    localStorage.setItem(ACTIVE_KEY, active);
    return payload.state;
  }

  async listSaves(): Promise<SaveSlotSummary[]> {
    this.ensureLegacyMigrated();
    const ids = this.readIndex();
    const live: SaveSlotData[] = [];
    for (const id of ids) {
      const payload = this.readSlot(id);
      if (payload) live.push(payload);
    }
    const liveIds = live.map((payload) => payload.slotId);
    if (liveIds.length !== ids.length) this.writeIndex(liveIds);
    return live
      .sort((a, b) => b.savedAt - a.savedAt)
      .map(summaryFrom);
  }

  async deleteSave(slotId: string): Promise<void> {
    localStorage.removeItem(slotKey(slotId));
    const ids = this.readIndex().filter((id) => id !== slotId);
    this.writeIndex(ids);
    if (localStorage.getItem(ACTIVE_KEY) === slotId) {
      localStorage.setItem(ACTIVE_KEY, ids[0] ?? '');
      if (ids.length === 0) localStorage.removeItem(ACTIVE_KEY);
    }
  }

  async clear(slotId?: string): Promise<void> {
    if (slotId) {
      await this.deleteSave(slotId);
      return;
    }
    for (const id of this.readIndex()) localStorage.removeItem(slotKey(id));
    localStorage.removeItem(INDEX_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  async getActiveSlotId(): Promise<string | null> {
    this.ensureLegacyMigrated();
    return localStorage.getItem(ACTIVE_KEY);
  }

  async setActiveSlotId(slotId: string | null): Promise<void> {
    if (slotId) localStorage.setItem(ACTIVE_KEY, slotId);
    else localStorage.removeItem(ACTIVE_KEY);
  }

  async hasSave(): Promise<boolean> {
    return (await this.listSaves()).length > 0;
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
