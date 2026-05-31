/**
 * 初始状态构建。
 * engine 保持「内容无关」：手艺/学徒数据由调用方（store 层）注入，
 * 这样 engine 可被独立单元测试，也可未来移到后端做权威结算。
 */
import type { Craft, Apprentice, GameState, CraftState, RegionDef } from './types';
import { aggregateTownMetrics } from './metrics';

export const DEFAULT_MAX_TURNS = 12;

export const INITIAL_RESOURCES = {
  coin: 20,
  plantDye: 6,
  water: 10,
  cloth: 6,
  bamboo: 6,
  tools: 3,
  /** 每回合可用人力，回合结束时重置 */
  labor: 8,
};

/** 每回合重置的人力预算 */
export const LABOR_PER_TURN = 8;

export function createInitialState(
  crafts: Craft[],
  apprentices: Apprentice[],
  seed: number,
  maxTurns: number = DEFAULT_MAX_TURNS,
  regions: RegionDef[] = [],
): GameState {
  const craftStates: CraftState[] = crafts.map((craft) => ({
    craftId: craft.id,
    metrics: { ...craft.baseMetrics },
    unlocked: true,
    produced: 0,
  }));

  const unlockedRegions = regions.filter((r) => r.startUnlocked).map((r) => r.id);
  const currentRegion = unlockedRegions[0] ?? '';

  return {
    seed,
    turn: 1,
    maxTurns,
    metrics: aggregateTownMetrics(craftStates),
    resources: { ...INITIAL_RESOURCES },
    crafts: craftStates,
    apprentices: apprentices.map((a) => ({ ...a })),
    pendingEvent: null,
    log: ['百工镇的故事，从这一季开始。'],
    status: 'playing',
    report: null,
    unlockedRegions,
    currentRegion,
    achievements: [],
  };
}
