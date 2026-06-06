/**
 * 初始状态构建。
 * engine 保持「内容无关」：手艺/学徒数据由调用方（store 层）注入，
 * 这样 engine 可被独立单元测试，也可未来移到后端做权威结算。
 */
import type {
  Apprentice,
  CalendarState,
  Craft,
  CraftState,
  FarmPlot,
  GameState,
  GameWeather,
  PlayerAttributeKey,
  PlayerAttributes,
  PlayerProfile,
  RegionDef,
  Season,
} from './types';
import { aggregateTownMetrics } from './metrics';

export const DEFAULT_MAX_TURNS = 12;

export const INITIAL_RESOURCES = {
  coin: 20,
  indigoVat: 6,
  bambooSplit: 6,
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
  indigoVat: 999999,
  bambooSplit: 999999,
  labor: 999999,
};

export const PLAYER_ATTRIBUTE_KEYS: PlayerAttributeKey[] = [
  'craft',
  'knowledge',
  'people',
  'commerce',
  'stamina',
  'mind',
];

const TITLE_BY_RANK = ['粗手生人', '入门匠', '走方匠', '名匠', '宗匠', '神匠'];

export function createBaseAttributes(value = 5): PlayerAttributes {
  return Object.fromEntries(PLAYER_ATTRIBUTE_KEYS.map((key) => [key, value])) as PlayerAttributes;
}

export function titleForRank(rank: number): string {
  return TITLE_BY_RANK[Math.max(0, Math.min(TITLE_BY_RANK.length - 1, rank))] ?? TITLE_BY_RANK[0];
}

export function createDefaultPlayerProfile(): PlayerProfile {
  return {
    titleRank: 0,
    title: titleForRank(0),
    attributes: createBaseAttributes(5),
    attributeXp: createBaseAttributes(0),
  };
}

function seasonForDay(day: number): Season {
  const index = Math.floor(Math.max(0, day - 1) / 7) % 4;
  return (['spring', 'summer', 'autumn', 'winter'] as const)[index];
}

function weatherForDay(day: number, season: Season): GameWeather {
  if (season === 'winter') return 'snow';
  if (day % 5 === 0 || season === 'summer' && day % 3 === 0) return 'rain';
  return 'clear';
}

export function createCalendar(day = 1, phase: CalendarState['phase'] = 'morning'): CalendarState {
  const season = seasonForDay(day);
  return {
    day,
    season,
    phase,
    weather: weatherForDay(day, season),
  };
}

export function createInitialFarmPlots(): FarmPlot[] {
  return [
    { id: 'yard-1', cropId: null, plantedDay: null, growth: 0, wateredToday: false },
    { id: 'yard-2', cropId: null, plantedDay: null, growth: 0, wateredToday: false },
    { id: 'yard-3', cropId: null, plantedDay: null, growth: 0, wateredToday: false },
  ];
}

function firstSubregionId(regions: RegionDef[], regionId: string): string {
  const region = regions.find((r) => r.id === regionId);
  return region?.subregions[0]?.id ?? regionId;
}

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
  const currentSubregion = firstSubregionId(regions, currentRegion);

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
    profile: createDefaultPlayerProfile(),
    calendar: createCalendar(1),
    farmPlots: createInitialFarmPlots(),
    itemInstances: [],
    unlockedRegions,
    currentRegion,
    currentSubregion,
    achievements: [],
    seenStory: [],
    flags: [],
    playerName: playerName.trim(),
    devMode,
    npcAffinity: {},
    npcStates: {},
    completedQuests: [],
    completedActivities: [],
  };
}
