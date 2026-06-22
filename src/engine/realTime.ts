import type { GameRealTimeState, GameState, RealTimeCooldownKind } from './types';

export const REAL_TIME_MINUTE_MS = 60_000;

export const REAL_TIME_COOLDOWN_MS = {
  craft: 2 * REAL_TIME_MINUTE_MS,
  activity: 5 * REAL_TIME_MINUTE_MS,
  industryHarvest: 10 * REAL_TIME_MINUTE_MS,
  industryProcess: 3 * REAL_TIME_MINUTE_MS,
} as const;

export function createRealTimeState(now = Date.now()): GameRealTimeState {
  return {
    startedAt: now,
    lastSeenAt: now,
    cooldowns: {},
    npcTalkDates: {},
  };
}

export function realTimeCooldownKey(kind: RealTimeCooldownKind, id: string): string {
  return `${kind}:${id}`;
}

export function realDateKeyFromMs(now: number): string {
  const date = new Date(now);
  const month = String(date.getFullYear());
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${String(date.getMonth() + 1).padStart(2, '0')}-${day}`;
}

export function compactRealTime(realTime: GameRealTimeState | undefined, now = Date.now()): GameRealTimeState {
  const source = realTime ?? createRealTimeState(now);
  const cooldowns = Object.fromEntries(
    Object.entries(source.cooldowns ?? {}).filter(([, record]) => record.readyAt > now),
  );
  return {
    startedAt: source.startedAt || now,
    lastSeenAt: now,
    cooldowns,
    npcTalkDates: source.npcTalkDates ?? {},
  };
}

export function realTimeRemainingMs(
  state: Pick<GameState, 'realTime'>,
  key: string,
  now = Date.now(),
): number {
  return Math.max(0, (state.realTime?.cooldowns?.[key]?.readyAt ?? 0) - now);
}

export function formatRealTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}秒`;
  return `${minutes}分${String(seconds).padStart(2, '0')}秒`;
}

export function hasNpcTalkedToday(
  state: Pick<GameState, 'realTime'>,
  npcId: string,
  now = Date.now(),
): boolean {
  return state.realTime?.npcTalkDates?.[npcId] === realDateKeyFromMs(now);
}

export function withRealTimeTouch(state: GameState, now: number): GameState {
  return {
    ...state,
    realTime: compactRealTime(state.realTime, now),
  };
}

export function withRealTimeCooldown(
  state: GameState,
  input: {
    kind: RealTimeCooldownKind;
    id: string;
    label: string;
    durationMs: number;
  },
  now: number,
): GameState {
  const realTime = compactRealTime(state.realTime, now);
  const key = realTimeCooldownKey(input.kind, input.id);
  return {
    ...state,
    realTime: {
      ...realTime,
      cooldowns: {
        ...realTime.cooldowns,
        [key]: {
          key,
          kind: input.kind,
          id: input.id,
          label: input.label,
          startedAt: now,
          readyAt: now + input.durationMs,
          durationMs: input.durationMs,
        },
      },
    },
  };
}

export function withNpcTalkDate(state: GameState, npcId: string, now: number): GameState {
  const realTime = compactRealTime(state.realTime, now);
  return {
    ...state,
    realTime: {
      ...realTime,
      npcTalkDates: {
        ...realTime.npcTalkDates,
        [npcId]: realDateKeyFromMs(now),
      },
    },
  };
}
