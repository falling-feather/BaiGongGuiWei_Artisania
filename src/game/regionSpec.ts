/**
 * 地区地图规格装配器 —— 把「内容数据 + 当前状态」翻译成一份场景可用的 RegionMapSpec。
 * 让 Phaser 场景与数据层解耦：场景只认 RegionMapSpec。
 */
import type { GameState, NpcDef } from '../engine';
import { INDUSTRIES, REGION_INDEX, CRAFT_INDEX, npcsForRegion } from '../data';
import { industryTierFor, localIndustriesForRegion } from '../data/regionEconomy';
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

function npcScheduleFor(npc: NpcDef, state: GameState) {
  return (
    npc.schedule?.find((rule) => rule.phase === state.calendar.phase) ??
    npc.schedule?.find((rule) => rule.phase === 'any') ??
    null
  );
}

function npcIsInSubregion(npc: NpcDef, state: GameState, subregionId: string) {
  const schedule = npcScheduleFor(npc, state);
  const locatedSubregionId = schedule?.subregionId ?? npc.subregionId;
  return !locatedSubregionId || locatedSubregionId === subregionId;
}

/** 组装某地区在当前状态下的地图规格；地区不存在时返回 null */
export function buildRegionSpec(regionId: string, state: GameState): RegionMapSpec | null {
  const region = REGION_INDEX[regionId];
  if (!region) return null;
  const subregion =
    region.subregions.find((item) => item.id === state.currentSubregion) ?? region.subregions[0];
  const overrides = devWeatherOverride();
  const season = overrides.season ?? state.calendar.season ?? seasonFromTurn(state.turn);
  const weather = overrides.weather ?? state.calendar.weather ?? weatherForSeason(season);

  const industries = localIndustriesForRegion(region, INDUSTRIES)
    .map((i) => ({ id: i.id, name: i.name, tier: industryTierFor(i) as IndustryTier }));

  // 招牌手艺中已实现的（存在于 CRAFTS）
  const crafts = region.signatureCrafts
    .map((id) => CRAFT_INDEX[id])
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name }));

  // 相邻地区中已定义的，作为出入口
  const gates = region.neighbors
    .map((id) => REGION_INDEX[id])
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      regionId: r.id,
      name: r.name,
      unlocked: state.unlockedRegions.includes(r.id),
    }));

  return {
    regionId: region.id,
    subregionId: subregion?.id ?? region.id,
    name: region.name,
    subregionName: subregion?.name ?? region.name,
    palette: region.terrain.palette.slice(0, 2) as [string, string],
    terrain: terrainKind(region.terrain.base, region.terrain.obstacles),
    season,
    weather,
    industries,
    crafts,
    gates,
    npcs: npcsForRegion(region.id)
      .filter((n) => npcIsInSubregion(n, state, subregion?.id ?? region.id))
      .map((n) => {
        const schedule = npcScheduleFor(n, state);
        return {
          id: n.id,
          name: n.name,
          role: n.role,
          anchorId: schedule?.anchorCraftId ?? n.anchorCraftId,
        };
      }),
  };
}
