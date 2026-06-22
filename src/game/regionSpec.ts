/**
 * 地区地图规格装配器 —— 把「内容数据 + 当前状态」翻译成一份场景可用的 RegionMapSpec。
 * 让 Phaser 场景与数据层解耦：场景只认 RegionMapSpec。
 */
import {
  MAX_WORKSHOP_CAPACITY,
  buildLoreTravelGuide,
  buildPriorityJourneyGuide,
  routeCostWithIntel,
  workshopCapacityForCraft,
  workshopExpansionCostForCraft,
  workshopUpgradeSpaceCost,
  workshopUsedSpaceForCraft,
  type GameState,
  type LoreTravelGuide,
  type NpcDef,
  type NpcScheduleRule,
  type ResourcePool,
  type WorkshopUpgradeDef,
} from '../engine';
import {
  INDUSTRIES,
  LORE_ENTRIES,
  LORE_ENTRY_INDEX,
  PRIORITY_JOURNEY_STEPS,
  REGION_INDEX,
  REGIONS,
  REGION_ROUTES,
  WORKSHOP_UPGRADES,
  activitiesForSubregion,
  craftsForSubregion,
  localIndustriesForSubregion,
  npcsForRegion,
  mapLayoutOverrideForSubregion,
  runtimeLayoutForSubregion,
  runtimeLayoutFromEditorSnapshot,
} from '../data';
import { industryTierFor } from '../data/regionEconomy';
import type { RegionMapSpec, IndustryTier, TerrainKind, WeatherKind, WeatherSeason } from './EventBus';

/** 由地区地貌基底关键字推断地形类型，驱动地图河流/山石/海岸生成 */
function terrainKind(base: string, obstacles: string[]): TerrainKind {
  const text = base + obstacles.join('');
  if (/海|岸|码头|港|骑楼/.test(text)) return 'coast';
  if (/山|梯田|栈道|峡谷|岭|坡/.test(text)) return 'mountain';
  if (/水|河|江|湖|渡|荡|船|桥/.test(text)) return 'water';
  return 'plain';
}

function seasonFromTurn(turn: number): WeatherSeason {
  const index = (((turn - 1) % 4) + 4) % 4;
  return (['spring', 'summer', 'autumn', 'winter'] as const)[index];
}

function weatherForSeason(season: WeatherSeason): WeatherKind {
  if (season === 'winter') return 'snow';
  return 'clear';
}

function safeSeasonOverride(value: string | null): WeatherSeason | null {
  if (value === 'spring' || value === 'summer' || value === 'autumn' || value === 'winter') return value;
  return null;
}

function safeWeatherOverride(value: string | null): WeatherKind | null {
  if (value === 'clear' || value === 'rain' || value === 'snow') return value;
  return null;
}

function devWeatherOverride() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    season: safeSeasonOverride(params.get('qaSeason')),
    weather: safeWeatherOverride(params.get('qaWeather')),
  };
}

function scheduleWeatherMatches(rule: NpcScheduleRule, weather: GameState['calendar']['weather']) {
  if (!rule.weather) return true;
  return Array.isArray(rule.weather) ? rule.weather.includes(weather) : rule.weather === weather;
}

function npcScheduleFor(npc: NpcDef, state: GameState) {
  const schedule = npc.schedule ?? [];
  const phase = state.calendar.phase;
  const weather = state.calendar.weather;
  return (
    schedule.find((rule) => rule.phase === phase && rule.weather && scheduleWeatherMatches(rule, weather)) ??
    schedule.find((rule) => rule.phase === 'any' && rule.weather && scheduleWeatherMatches(rule, weather)) ??
    schedule.find((rule) => rule.phase === phase && !rule.weather) ??
    schedule.find((rule) => rule.phase === 'any' && !rule.weather) ??
    null
  );
}

function npcIsInSubregion(npc: NpcDef, state: GameState, subregionId: string) {
  const schedule = npcScheduleFor(npc, state);
  const locatedSubregionId = schedule?.subregionId ?? npc.subregionId;
  return !locatedSubregionId || locatedSubregionId === subregionId;
}

function canPay(resources: ResourcePool, cost: ResourcePool | undefined) {
  return Object.entries(cost ?? {}).every(([resourceId, amount]) => (resources[resourceId] ?? 0) >= amount);
}

function workshopUpgradeRequirementsMet(state: GameState, upgrade: WorkshopUpgradeDef) {
  const craftState = state.crafts.find((craft) => craft.craftId === upgrade.craftId);
  if (!craftState?.unlocked) return false;
  const requirements = upgrade.requirements;
  if (!requirements) return true;
  if (requirements.produced !== undefined && craftState.produced < requirements.produced) return false;
  const purchased = new Set((state.workshopUpgrades ?? []).map((record) => record.id));
  if ((requirements.upgrades ?? []).some((upgradeId) => !purchased.has(upgradeId))) return false;
  const flags = new Set(state.flags);
  if ((requirements.flags ?? []).some((flag) => !flags.has(flag))) return false;
  if (requirements.regionReputation) {
    const { regionId, min } = requirements.regionReputation;
    if ((state.regionReputation[regionId] ?? 0) < min) return false;
  }
  for (const [attribute, min] of Object.entries(requirements.attributes ?? {})) {
    if ((state.profile.attributes[attribute as keyof typeof state.profile.attributes] ?? 0) < min) return false;
  }
  return true;
}

function workshopStatusForCraft(state: GameState, craftId: string): RegionMapSpec['crafts'][number]['workshop'] {
  const upgrades = WORKSHOP_UPGRADES.filter((upgrade) => upgrade.craftId === craftId);
  if (upgrades.length === 0) return undefined;
  const purchased = new Set((state.workshopUpgrades ?? []).map((record) => record.id));
  const usedSpace = workshopUsedSpaceForCraft(state, { workshopUpgrades: WORKSHOP_UPGRADES }, craftId);
  const capacity = workshopCapacityForCraft(state, craftId);
  const lockedBySpace = upgrades.some((upgrade) => {
    if (purchased.has(upgrade.id)) return false;
    if (!workshopUpgradeRequirementsMet(state, upgrade)) return false;
    return usedSpace + workshopUpgradeSpaceCost(upgrade) > capacity;
  });
  const availableUpgrades = upgrades.filter((upgrade) => {
    if (purchased.has(upgrade.id)) return false;
    if (!workshopUpgradeRequirementsMet(state, upgrade)) return false;
    if (!canPay(state.resources, upgrade.cost)) return false;
    return usedSpace + workshopUpgradeSpaceCost(upgrade) <= capacity;
  }).length;
  const canExpand =
    capacity < MAX_WORKSHOP_CAPACITY &&
    state.crafts.some((craft) => craft.craftId === craftId && craft.unlocked) &&
    canPay(state.resources, workshopExpansionCostForCraft(state, craftId));
  return {
    usedSpace,
    capacity,
    maxCapacity: MAX_WORKSHOP_CAPACITY,
    installedUpgrades: upgrades.filter((upgrade) => purchased.has(upgrade.id)).length,
    totalUpgrades: upgrades.length,
    availableUpgrades,
    needsExpansion: lockedBySpace,
    canExpand,
  };
}

function navigationTargetFromTravelGuide(
  guide: LoreTravelGuide | null,
  currentRegion: string,
): RegionMapSpec['navigationTarget'] {
  if (!guide || guide.isAtTarget || guide.status === 'locked') return undefined;

  if (guide.status === 'same-region' && guide.targetSubregionId) {
    return {
      kind: 'subregionGate',
      payload: guide.targetSubregionId,
      label: guide.targetSubregionName ?? guide.targetTitle,
      detail: guide.instruction,
    };
  }

  if (guide.nextRegionId && guide.nextRegionId !== currentRegion) {
    return {
      kind: 'gate',
      payload: guide.nextRegionId,
      label: guide.routeName ?? guide.nextRegionName ?? guide.targetRegionName,
      detail: guide.instruction,
    };
  }

  return undefined;
}

function navigationTargetForTrackedLore(state: GameState): RegionMapSpec['navigationTarget'] {
  const entry = state.trackedLoreEntryId ? LORE_ENTRY_INDEX[state.trackedLoreEntryId] : undefined;
  return navigationTargetFromTravelGuide(buildLoreTravelGuide(state, entry, REGIONS, REGION_ROUTES), state.currentRegion);
}

function navigationTargetForPriorityJourney(state: GameState): RegionMapSpec['navigationTarget'] {
  const guide = buildPriorityJourneyGuide(state, PRIORITY_JOURNEY_STEPS, LORE_ENTRIES, REGIONS, REGION_ROUTES);
  return navigationTargetFromTravelGuide(guide?.travelGuide ?? null, state.currentRegion);
}

function navigationTargetForState(state: GameState): RegionMapSpec['navigationTarget'] {
  return navigationTargetForTrackedLore(state) ?? navigationTargetForPriorityJourney(state);
}

/** 组装某地区在当前状态下的地图规格；地区不存在时返回 null */
export function buildRegionSpec(regionId: string, state: GameState): RegionMapSpec | null {
  const region = REGION_INDEX[regionId];
  if (!region) return null;
  const subregion =
    region.subregions.find((item) => item.id === state.currentSubregion) ?? region.subregions[0];
  const subregionId = subregion?.id ?? region.id;
  const layoutOverride = mapLayoutOverrideForSubregion(region.id, subregionId);
  const layout = layoutOverride
    ? runtimeLayoutFromEditorSnapshot(layoutOverride)
    : runtimeLayoutForSubregion(region.id, subregionId);
  const overrides = devWeatherOverride();
  const season = overrides.season ?? state.calendar.season ?? seasonFromTurn(state.turn);
  const weather = overrides.weather ?? state.calendar.weather ?? weatherForSeason(season);

  const industries = localIndustriesForSubregion(region, subregionId, INDUSTRIES)
    .map((i) => ({ id: i.id, name: i.name, tier: industryTierFor(i) as IndustryTier }));

  // 招牌手艺中已实现的（存在于 CRAFTS）
  const crafts = craftsForSubregion(region, subregionId)
    .map((c) => ({ id: c.id, name: c.name, workshop: workshopStatusForCraft(state, c.id) }));

  const activities = activitiesForSubregion(region.id, subregionId).map((activity) => ({
    id: activity.id,
    name: activity.name,
    kind: activity.kind,
  }));
  const subregionGates = region.subregions
    .filter((item) => item.id !== subregionId)
    .map((item) => ({
      subregionId: item.id,
      name: item.name,
      role: item.role,
    }));

  // 出入口由结构化路线驱动；neighbors 仅作为遗漏路线的兼容兜底。
  const routeTargets = new Set<string>();
  const gates: RegionMapSpec['gates'] = REGION_ROUTES
    .filter((route) => route.fromRegionId === region.id || route.toRegionId === region.id)
    .map((route) => {
      const targetId = route.fromRegionId === region.id ? route.toRegionId : route.fromRegionId;
      const target = REGION_INDEX[targetId];
      if (!target) return null;
      routeTargets.add(target.id);
      return {
        regionId: target.id,
        name: target.name,
        unlocked: state.unlockedRegions.includes(target.id),
        routeId: route.id,
        routeName: route.name,
        unlockCost: routeCostWithIntel(route, state.flags),
        unlockHint: route.unlockHint,
      };
    })
    .filter((gate): gate is NonNullable<typeof gate> => Boolean(gate));
  for (const id of region.neighbors) {
    if (routeTargets.has(id)) continue;
    const target = REGION_INDEX[id];
    if (!target) continue;
    gates.push({
      regionId: target.id,
      name: target.name,
      unlocked: state.unlockedRegions.includes(target.id),
    });
  }

  return {
    regionId: region.id,
    subregionId,
    name: region.name,
    subregionName: subregion?.name ?? region.name,
    palette: region.terrain.palette.slice(0, 2) as [string, string],
    terrain: terrainKind(region.terrain.base, region.terrain.obstacles),
    season,
    weather,
    industries,
    crafts,
    activities,
    subregionGates,
    gates,
    npcs: npcsForRegion(region.id)
      .filter((n) => npcIsInSubregion(n, state, subregionId))
      .map((n) => {
        const schedule = npcScheduleFor(n, state);
        const layoutNpc = layout?.objects.find((object) => object.interaction === 'npc' && object.npcId === n.id);
        return {
          id: n.id,
          name: n.name,
          role: n.role,
          anchorId: schedule?.anchorCraftId ?? n.anchorCraftId,
          tileX: layoutNpc?.x,
          tileY: layoutNpc?.y,
        };
      }),
    navigationTarget: navigationTargetForState(state),
    layout,
  };
}
