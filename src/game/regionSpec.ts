/**
 * 地区地图规格装配器 —— 把「内容数据 + 当前状态」翻译成一份场景可用的 RegionMapSpec。
 * 让 Phaser 场景与数据层解耦：场景只认 RegionMapSpec。
 */
import type { GameState, IndustryDef } from '../engine';
import { INDUSTRIES, INDUSTRY_INDEX, REGION_INDEX, CRAFT_INDEX, RESOURCE_INDEX, npcsForRegion } from '../data';
import type { RegionMapSpec, IndustryTier, TerrainKind, WeatherKind, WeatherSeason } from './EventBus';

/** 按「输入是否为空 / 产出资源层级」推断产业层级 */
function industryTier(ind: IndustryDef): IndustryTier {
  if (Object.keys(ind.input).length === 0) return 'harvest';
  return RESOURCE_INDEX[ind.output]?.tier === 'product' ? 'product' : 'refine';
}

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

/** 组装某地区在当前状态下的地图规格；地区不存在时返回 null */
export function buildRegionSpec(regionId: string, state: GameState): RegionMapSpec | null {
  const region = REGION_INDEX[regionId];
  if (!region) return null;
  const subregion =
    region.subregions.find((item) => item.id === state.currentSubregion) ?? region.subregions[0];
  const overrides = devWeatherOverride();
  const season = overrides.season ?? seasonFromTurn(state.turn);
  const weather = overrides.weather ?? weatherForSeason(season);

  // 显式列入的产业
  const explicit = region.industries
    .map((id) => INDUSTRY_INDEX[id])
    .filter((i): i is IndustryDef => Boolean(i));

  // 本地特产授权的采集业（采集业 = 输入为空，且产出是本地特产）
  const harvests = INDUSTRIES.filter(
    (i) => Object.keys(i.input).length === 0 && region.localResources.includes(i.output),
  );

  // 去重合并
  const seen = new Set<string>();
  const industries = [...harvests, ...explicit]
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
    .map((i) => ({ id: i.id, name: i.name, tier: industryTier(i) }));

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
    npcs: npcsForRegion(region.id).map((n) => ({
      id: n.id,
      name: n.name,
      role: n.role,
      anchorId: n.anchorCraftId,
    })),
  };
}
