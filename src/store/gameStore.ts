/**
 * Zustand 状态仓库 —— 连接「纯函数 engine」与「React UI」的唯一桥梁。
 * 职责：
 *  1. 持有当前 GameState 与内容包 content；
 *  2. 把 UI 的意图转成 GameAction，交给 gameReducer 求出新状态；
 *  3. 每次状态变更后异步持久化（存档适配器可替换为后端）。
 * UI 组件只读 state、调用动作方法，绝不直接修改规则。
 */
import { create } from 'zustand';
import {
  gameReducer,
  createInitialState,
  type GameState,
  type GameAction,
  type GameContent,
} from '../engine';
import {
  ACHIEVEMENTS,
  ALL_NPCS,
  CRAFTS,
  EVENTS,
  INDUSTRIES,
  ITEM_DESCRIPTOR_RULES,
  QUESTS,
  REGION_ACTIVITIES,
  REGION_CONTENT,
  REGIONS,
  RESOURCES,
  STARTING_APPRENTICES,
  STORY_BEATS,
  SUBREGION_CONTENT,
} from '../data';
import { localStorageAdapter } from '../storage/localStorageAdapter';
import type { SaveSlotSummary } from '../storage/StorageAdapter';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  story: STORY_BEATS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
  quests: QUESTS,
  activities: REGION_ACTIVITIES,
  regionContent: REGION_CONTENT,
  subregionContent: SUBREGION_CONTENT,
  itemDescriptorRules: ITEM_DESCRIPTOR_RULES,
};

interface GameStore {
  state: GameState;
  content: GameContent;
  saveSlots: SaveSlotSummary[];
  activeSaveSlotId: string | null;
  /** 通用派发入口：所有规则变更都经此 */
  dispatch: (action: GameAction) => void;
  /** 从存档恢复；无存档则保持新局 */
  loadFromStorage: (slotId?: string) => Promise<boolean>;
  /** 刷新可用存档槽位 */
  refreshSaveSlots: () => Promise<void>;
  /** 开新局并清档 */
  newGame: (seed?: number, playerName?: string, slotId?: string) => Promise<string>;
  /** 删除指定存档槽 */
  deleteSaveSlot: (slotId: string) => Promise<void>;
}

function bootstrapState(): GameState {
  return createInitialState(
    content.crafts,
    content.apprentices,
    Date.now() % 2147483647,
    undefined,
    content.regions,
  );
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: bootstrapState(),
  content,
  saveSlots: [],
  activeSaveSlotId: null,

  dispatch: (action) => {
    const next = gameReducer(get().state, action, get().content);
    set({ state: next });
    void localStorageAdapter.save(next, get().activeSaveSlotId ?? undefined).then((slotId) => {
      set({ activeSaveSlotId: slotId });
      void get().refreshSaveSlots();
    });
  },

  loadFromStorage: async (slotId) => {
    const saved = await localStorageAdapter.load(slotId);
    if (!saved) {
      await get().refreshSaveSlots();
      return false;
    }
    const activeSaveSlotId = await localStorageAdapter.getActiveSlotId();
    set({ state: saved, activeSaveSlotId });
    await get().refreshSaveSlots();
    return true;
  },

  refreshSaveSlots: async () => {
    const [saveSlots, activeSaveSlotId] = await Promise.all([
      localStorageAdapter.listSaves(),
      localStorageAdapter.getActiveSlotId(),
    ]);
    set({ saveSlots, activeSaveSlotId });
  },

  newGame: async (seed, playerName, slotId) => {
    const next = gameReducer(get().state, { type: 'NEW_GAME', seed, playerName }, get().content);
    set({ state: next });
    const savedSlotId = await localStorageAdapter.save(next, slotId);
    set({ activeSaveSlotId: savedSlotId });
    await get().refreshSaveSlots();
    return savedSlotId;
  },

  deleteSaveSlot: async (slotId) => {
    await localStorageAdapter.deleteSave(slotId);
    await get().refreshSaveSlots();
  },
}));
