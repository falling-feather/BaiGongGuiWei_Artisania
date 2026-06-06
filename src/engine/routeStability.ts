import type { GameState, RouteSpec } from './types';
import { routeIntelKnown } from './routeCosts';
import { regionReputationOf } from './regionReputation';

export const ROUTE_STABILITY_MAX = 100;
export const ROUTE_STABILITY_DEFAULT = 48;

export type RouteRiskBand = 'safe' | 'steady' | 'strained' | 'dangerous';

const MODE_BASE_RISK: Record<RouteSpec['mode'], number> = {
  water: 16,
  road: 18,
  mountain: 28,
  caravan: 32,
  official: 22,
};

export function clampRouteStability(value: number): number {
  return Math.max(0, Math.min(ROUTE_STABILITY_MAX, Math.round(value)));
}

export function routeStabilityOf(
  state: Pick<GameState, 'routeStability'>,
  routeId: string | undefined,
): number {
  if (!routeId) return 0;
  return clampRouteStability(state.routeStability?.[routeId] ?? ROUTE_STABILITY_DEFAULT);
}

export function addRouteStability(
  stability: Record<string, number> | undefined,
  routeIds: Iterable<string>,
  amount: number,
): Record<string, number> {
  const next = { ...(stability ?? {}) };
  if (amount === 0) return next;
  for (const routeId of routeIds) {
    if (!routeId) continue;
    next[routeId] = clampRouteStability((next[routeId] ?? ROUTE_STABILITY_DEFAULT) + amount);
  }
  return next;
}

export function routeEndpointReputation(
  state: Pick<GameState, 'regionReputation'>,
  route: RouteSpec,
): number {
  return Math.round(
    (regionReputationOf(state, route.fromRegionId) + regionReputationOf(state, route.toRegionId)) / 2,
  );
}

export function routeRiskScore(
  state: Pick<GameState, 'flags' | 'regionReputation' | 'routeStability'>,
  route: RouteSpec,
): number {
  const base = MODE_BASE_RISK[route.mode] ?? 20;
  const unlockPressure = Math.max(0, (route.unlockCost ?? 30) - 30) * 0.45;
  const stabilityRelief = (routeStabilityOf(state, route.id) - ROUTE_STABILITY_DEFAULT) * 0.42;
  const reputationRelief = routeEndpointReputation(state, route) * 0.22;
  const intelRelief = routeIntelKnown(route, state.flags) ? 8 : 0;
  return Math.max(0, Math.min(95, Math.round(base + unlockPressure - stabilityRelief - reputationRelief - intelRelief)));
}

export function routeRiskBand(score: number): RouteRiskBand {
  if (score >= 64) return 'dangerous';
  if (score >= 44) return 'strained';
  if (score >= 24) return 'steady';
  return 'safe';
}

export function routeRiskLabel(score: number): string {
  const labels: Record<RouteRiskBand, string> = {
    safe: '安稳',
    steady: '可行',
    strained: '吃紧',
    dangerous: '高险',
  };
  return labels[routeRiskBand(score)];
}
