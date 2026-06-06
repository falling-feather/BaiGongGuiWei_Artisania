import type { RouteSpec } from './types';

export const ROUTE_INTEL_DISCOUNT_RATE = 0.75;

export function routeBaseCost(route: RouteSpec | undefined, fallback = 30): number {
  return route?.unlockCost ?? route?.requirements?.coin ?? fallback;
}

export function routeIntelKnown(route: RouteSpec | undefined, flags: string[]): boolean {
  return Boolean(route && flags.includes(`route-known:${route.id}`));
}

export function routeCostWithIntel(
  route: RouteSpec | undefined,
  flags: string[],
  fallback = 30,
): number {
  const base = routeBaseCost(route, fallback);
  return routeIntelKnown(route, flags)
    ? Math.max(1, Math.round(base * ROUTE_INTEL_DISCOUNT_RATE))
    : base;
}

export function routeIntelDiscount(
  route: RouteSpec | undefined,
  flags: string[],
  fallback = 30,
): number {
  return Math.max(0, routeBaseCost(route, fallback) - routeCostWithIntel(route, flags, fallback));
}
