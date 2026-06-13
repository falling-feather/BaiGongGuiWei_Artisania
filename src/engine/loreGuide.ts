import { routeCostWithIntel } from './routeCosts';
import type { GameState, LoreEntry, RegionDef, RouteSpec, SubregionDef } from './types';

export type LoreTravelGuideStatus =
  | 'arrived'
  | 'same-region'
  | 'opened-route'
  | 'frontier-route'
  | 'distant-route'
  | 'locked';

export interface LoreTravelGuide {
  entryId: string;
  targetTitle: string;
  targetRegionId: string;
  targetRegionName: string;
  targetSubregionId?: string;
  targetSubregionName?: string;
  status: LoreTravelGuideStatus;
  headline: string;
  instruction: string;
  detail: string;
  isAtTarget: boolean;
  routeId?: string;
  routeName?: string;
  nextRegionId?: string;
  nextRegionName?: string;
  routeCost?: number;
  routeUnlocked?: boolean;
}

function routeTouches(route: RouteSpec, regionId: string): boolean {
  return route.fromRegionId === regionId || route.toRegionId === regionId;
}

function otherRouteEnd(route: RouteSpec, regionId: string): string {
  return route.fromRegionId === regionId ? route.toRegionId : route.fromRegionId;
}

function findDirectRoute(routes: readonly RouteSpec[], fromRegionId: string, toRegionId: string) {
  return routes.find(
    (route) =>
      (route.fromRegionId === fromRegionId && route.toRegionId === toRegionId) ||
      (route.fromRegionId === toRegionId && route.toRegionId === fromRegionId),
  );
}

function findFirstRouteToward(routes: readonly RouteSpec[], fromRegionId: string, toRegionId: string) {
  const queue: { regionId: string; firstRoute?: RouteSpec }[] = [{ regionId: fromRegionId }];
  const seen = new Set<string>([fromRegionId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const route of routes.filter((item) => routeTouches(item, current.regionId))) {
      const nextRegionId = otherRouteEnd(route, current.regionId);
      if (seen.has(nextRegionId)) continue;
      const firstRoute = current.firstRoute ?? route;
      if (nextRegionId === toRegionId) return firstRoute;
      seen.add(nextRegionId);
      queue.push({ regionId: nextRegionId, firstRoute });
    }
  }
  return undefined;
}

function targetSubregionOf(region: RegionDef, entry: LoreEntry): SubregionDef | undefined {
  return entry.subregionId ? region.subregions.find((subregion) => subregion.id === entry.subregionId) : undefined;
}

function targetLabel(region: RegionDef, subregion: SubregionDef | undefined) {
  return subregion ? `${region.name} · ${subregion.name}` : region.name;
}

function currentTargetReached(state: GameState, entry: LoreEntry) {
  return (
    state.currentRegion === entry.regionId &&
    (!entry.subregionId || state.currentSubregion === entry.subregionId)
  );
}

export function buildLoreTravelGuide(
  state: GameState,
  entry: LoreEntry | undefined,
  regions: readonly RegionDef[],
  routes: readonly RouteSpec[],
): LoreTravelGuide | null {
  if (!entry?.regionId) return null;
  const targetRegion = regions.find((region) => region.id === entry.regionId);
  const currentRegion = regions.find((region) => region.id === state.currentRegion);
  if (!targetRegion || !currentRegion) return null;

  const targetSubregion = targetSubregionOf(targetRegion, entry);
  const target = targetLabel(targetRegion, targetSubregion);
  const base = {
    entryId: entry.id,
    targetTitle: entry.title,
    targetRegionId: targetRegion.id,
    targetRegionName: targetRegion.name,
    targetSubregionId: targetSubregion?.id,
    targetSubregionName: targetSubregion?.name,
    headline: `${entry.title} -> ${target}`,
  };

  if (currentTargetReached(state, entry)) {
    return {
      ...base,
      status: 'arrived',
      isAtTarget: true,
      instruction: `已抵达 ${target}。`,
      detail: '现在可以在当前街景寻找对应工坊、人物、活动或采料点继续推进。',
    };
  }

  if (state.currentRegion === targetRegion.id) {
    return {
      ...base,
      status: 'same-region',
      isAtTarget: false,
      nextRegionId: targetRegion.id,
      nextRegionName: targetRegion.name,
      instruction: `目标在本地区的 ${targetSubregion?.name ?? '另一处街景'}。`,
      detail: '请在当前街景寻找区内通道牌、码头、山路或市巷入口，靠近后按 E 或使用 HUD 互动前往。',
    };
  }

  const directRoute = findDirectRoute(routes, state.currentRegion, targetRegion.id);
  if (directRoute) {
    const routeUnlocked = state.unlockedRegions.includes(targetRegion.id);
    return {
      ...base,
      status: routeUnlocked ? 'opened-route' : 'frontier-route',
      isAtTarget: false,
      routeId: directRoute.id,
      routeName: directRoute.name,
      nextRegionId: targetRegion.id,
      nextRegionName: targetRegion.name,
      routeCost: routeCostWithIntel(directRoute, state.flags),
      routeUnlocked,
      instruction: routeUnlocked
        ? `可经「${directRoute.name}」前往 ${targetRegion.name}。`
        : `可在当前地区开通「${directRoute.name}」，路资 ${routeCostWithIntel(directRoute, state.flags)} 文。`,
      detail: '这只是行脚指引；正式迁移仍必须回到街景中的商路节点、城门或码头，靠近后按 E 或使用 HUD 互动。',
    };
  }

  const firstRoute = findFirstRouteToward(routes, state.currentRegion, targetRegion.id);
  if (firstRoute) {
    const nextRegionId = otherRouteEnd(firstRoute, state.currentRegion);
    const nextRegion = regions.find((region) => region.id === nextRegionId);
    const routeUnlocked = state.unlockedRegions.includes(nextRegionId);
    return {
      ...base,
      status: 'distant-route',
      isAtTarget: false,
      routeId: firstRoute.id,
      routeName: firstRoute.name,
      nextRegionId,
      nextRegionName: nextRegion?.name ?? nextRegionId,
      routeCost: routeCostWithIntel(firstRoute, state.flags),
      routeUnlocked,
      instruction: routeUnlocked
        ? `先经「${firstRoute.name}」抵达 ${nextRegion?.name ?? nextRegionId}，再继续分段前往 ${targetRegion.name}。`
        : `先在当前地区开通「${firstRoute.name}」去 ${nextRegion?.name ?? nextRegionId}，再继续分段前往 ${targetRegion.name}。`,
      detail: '跨区远行按商路逐段推进，不能从大地图或百工志直接跳转。',
    };
  }

  return {
    ...base,
    status: 'locked',
    isAtTarget: false,
    instruction: `尚未找到通往 ${targetRegion.name} 的可用商路。`,
    detail: '先与路线型 NPC 攀谈、完成地方活动或打开相邻地区的街景出入口，补齐路线情报后再追踪此目标。',
  };
}

export function uniqueRoutesFromRegions(regionContent: readonly { routes: readonly RouteSpec[] }[] | undefined) {
  const routeMap = new Map<string, RouteSpec>();
  for (const spec of regionContent ?? []) {
    for (const route of spec.routes) routeMap.set(route.id, route);
  }
  return [...routeMap.values()];
}
