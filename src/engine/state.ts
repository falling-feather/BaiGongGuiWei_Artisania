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

/** 开发者模式口令；输入此名字即解锁全部内容并获得无限资源 */
export const DEV_NAME = 'fallingfeather';

/** 开发者模式的「无限」资源池 */
export const DEV_RESOURCES = {
  coin: 999999,
  plantDye: 999999,
  water: 999999,
  cloth: 999999,
  bamboo: 999999,
  tools: 999999,
  labor: 999999,
};

export function createInitialState(
  crafts: Craft[],
  apprentices: Apprentice[],
  seed: number,
  maxTurns: number = DEFAULT_MAX_TURNS,
  regions: RegionDef[] = [],
  playerName = '',
): GameState {
  const craftStates: CraftState[] = crafts.map((craft) => ({
    craftId: craft.id,
    metrics: { ...craft.baseMetrics },
    unlocked: true,
    produced: 0,
  }));

  const devMode = playerName.trim().toLowerCase() === DEV_NAME;

  // 开发者模式：解锁全部地区；否则仅开局地区
  const unlockedRegions = devMode
    ? regions.map((r) => r.id)
    : regions.filter((r) => r.startUnlocked).map((r) => r.id);
  const currentRegion =
    regions.find((r) => r.startUnlocked)?.id ?? unlockedRegions[0] ?? '';

  return {
    seed,
    turn: 1,
    maxTurns,
    metrics: aggregateTownMetrics(craftStates),
    resources: devMode ? { ...DEV_RESOURCES } : { ...INITIAL_RESOURCES },
    crafts: craftStates,
    apprentices: apprentices.map((a) => ({ ...a })),
    pendingEvent: null,
    log: [
      devMode
        ? `开发者模式已开启，${playerName.trim()}。全境通行，资源无虞。`
        : '百工镇的故事，从这一季开始。',
    ],
    status: 'playing',
    report: null,
    unlockedRegions,
    currentRegion,
    achievements: [],
    playerName: playerName.trim(),
    devMode,
  };
}
