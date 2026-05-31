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
import { CRAFTS, STARTING_APPRENTICES, EVENTS, INDUSTRIES, REGIONS, ACHIEVEMENTS } from '../data';
import { localStorageAdapter } from '../storage/localStorageAdapter';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
};

interface GameStore {
  state: GameState;
  content: GameContent;
  /** 通用派发入口：所有规则变更都经此 */
  dispatch: (action: GameAction) => void;
  /** 从存档恢复；无存档则保持新局 */
  loadFromStorage: () => Promise<void>;
  /** 开新局并清档 */
  newGame: (seed?: number, playerName?: string) => void;
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

  dispatch: (action) => {
    const next = gameReducer(get().state, action, get().content);
    set({ state: next });
    void localStorageAdapter.save(next);
  },

  loadFromStorage: async () => {
    const saved = await localStorageAdapter.load();
    if (saved) set({ state: saved });
  },

  newGame: (seed, playerName) => {
    const next = gameReducer(get().state, { type: 'NEW_GAME', seed, playerName }, get().content);
    set({ state: next });
    void localStorageAdapter.save(next);
  },
}));
